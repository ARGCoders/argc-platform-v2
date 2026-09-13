import { NextRequest, NextResponse } from 'next/server'
import { ClientResponseError } from 'pocketbase'
import { requireRole, authErrorResponse } from '@/lib/auth'
import { getAdminClient } from '@/lib/pocketbase-server'
import { parsePagination } from '@/lib/pagination'
import { slugify } from '@/lib/slug'
import { ledNodeFor } from '../scopes'
import type { EventRecord, EventType } from '@/types/pocketbase'

/**
 * GET/POST /api/dashboard/node/events — the led node's event pipeline
 * (MEMBER-14). NL+ with the same ownership proof as MEMBER-09: without a
 * `node_member` row at `role='leader'` the caller answers 403 even though the
 * role qualifies (role qualifies, authority doesn't).
 *
 * GET — proposals `proposed_by` this node, newest first, paginated with the
 * standard page/perPage envelope.
 *
 * POST — file a new proposal. The caller's input is whitelisted (title, type,
 * description, starts_at, location, is_public); everything else the server
 * forces: `status='proposed'`, `proposed_by` = the led node, `organized_by` =
 * the caller, `slug` generated from the title and uniquified against the
 * `idx_events_slug` unique index (probe, insert, retry with `<title>-2`…
 * then a timestamp-stamped fallback under sustained racing). Client-supplied
 * `status`, `x`-fields and the like are discarded, never echoed.
 *
 * `starts_at` must be strictly in the future — this is a *proposal*, not a
 * log of the past. `description` is stored raw and sanitized at fetch time
 * downstream (the public events route already applies `sanitizeHtml`); the
 * propose pipeline leaves the editor's text intact for review.
 *
 * POST 201 → `{ data: <projected EventRecord> }`.
 */
export const dynamic = 'force-dynamic'

export const EVENT_TYPES: readonly EventType[] = [
  'knowledge_session',
  'hackathon',
  'workshop',
  'community',
  'cross_node',
]
export const TITLE_MAX = 120
const SLUG_ATTEMPTS = 5

interface ProposeEventInput {
  title: string
  type: EventType
  description: string | null
  starts_at: string
  location: string | null
  is_public: boolean
}

type ProposalValidation =
  { ok: true; input: ProposeEventInput } | { ok: false; message: string }

function project(event: EventRecord) {
  return {
    id: event.id,
    title: event.title,
    slug: event.slug,
    type: event.type,
    status: event.status,
    description: event.description ?? null,
    starts_at: event.starts_at,
    ends_at: event.ends_at ?? null,
    location: event.location ?? null,
    is_public: event.is_public,
    attendance_count: event.attendance_count,
    created: event.created,
  }
}

/** True when an event already holds the slug — the only store a proposal's
 *  slug must be unique against (`idx_events_slug`). */
async function eventSlugTaken(
  admin: Awaited<ReturnType<typeof getAdminClient>>,
  slug: string,
): Promise<boolean> {
  try {
    await admin
      .collection('events')
      .getFirstListItem<EventRecord>(admin.filter('slug = {:slug}', { slug }))
    return true
  } catch (err) {
    if (err instanceof ClientResponseError && err.status === 404) return false
    throw err
  }
}

/** Insert a proposal under a title-derived, reused-uuid-safe slug. The
 *  probe-then-insert loop resolves the normal `slug = "Title 2"` collision
 *  space (`title-2`, `title-3`, …); a concurrent insert that wins the slot
 *  between probe and insert is re-probed and skipped the same way. Lost the
 *  whole run to sustained racing — a millisecond-stamped suffix is unique by
 *  construction and is the final fallback. */
async function createProposal(
  admin: Awaited<ReturnType<typeof getAdminClient>>,
  data: Omit<EventRecord, 'id' | 'slug' | 'created' | 'updated'>,
): Promise<EventRecord> {
  const base = slugify(data.title) || 'event'
  for (let attempt = 0; attempt < SLUG_ATTEMPTS; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`
    if (await eventSlugTaken(admin, slug)) continue
    try {
      return await admin.collection('events').create<EventRecord>({ ...data, slug })
    } catch (err) {
      if (await eventSlugTaken(admin, slug)) continue
      throw err
    }
  }
  return admin.collection('events').create<EventRecord>({
    ...data,
    slug: `${base}-${Date.now().toString(36)}`,
  })
}

function invalid(message: string): ProposalValidation {
  return { ok: false, message }
}

function validateProposal(body: unknown): ProposalValidation {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return invalid('Invalid request body')
  }
  const raw = body as Record<string, unknown>

  const title = typeof raw.title === 'string' ? raw.title.trim() : ''
  if (title.length === 0) return invalid('Title is required')
  if (title.length > TITLE_MAX)
    return invalid(`Title is limited to ${TITLE_MAX} characters`)

  if (
    typeof raw.type !== 'string' ||
    !(EVENT_TYPES as readonly string[]).includes(raw.type)
  ) {
    return invalid('Invalid event type')
  }

  const description =
    raw.description === undefined || raw.description === null
      ? null
      : typeof raw.description === 'string'
        ? raw.description.trim()
        : null

  if (typeof raw.starts_at !== 'string' || raw.starts_at === '') {
    return invalid('starts_at is required')
  }
  const starts = new Date(raw.starts_at)
  if (Number.isNaN(starts.getTime())) return invalid('starts_at is not a valid date')
  if (starts.getTime() <= Date.now()) return invalid('starts_at must be in the future')

  let location: string | null = null
  if (
    raw.location !== undefined &&
    raw.location !== null &&
    typeof raw.location === 'string' &&
    raw.location.trim() !== ''
  ) {
    location = raw.location.trim()
  }

  const is_public = raw.is_public === undefined ? false : raw.is_public === true

  return {
    ok: true,
    input: {
      title,
      type: raw.type as EventType,
      description,
      starts_at: starts.toISOString(),
      location,
      is_public,
    },
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { user } = await requireRole('node_leader')
    const admin = await getAdminClient()
    const { nodeId } = await ledNodeFor(admin, user.id)

    const parsed = parsePagination(request.nextUrl.searchParams)
    if (!parsed.ok) {
      return NextResponse.json(
        { error: { code: 'invalid_input', message: parsed.message } },
        { status: 400 },
      )
    }
    const { page, perPage } = parsed

    const result = await admin.collection('events').getList<EventRecord>(page, perPage, {
      filter: admin.filter('proposed_by = {:node}', { node: nodeId }),
      sort: '-created',
    })

    return NextResponse.json({
      data: result.items.map(project),
      page: result.page,
      perPage: result.perPage,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    })
  } catch (err) {
    const { status, error } = authErrorResponse(err)
    const code =
      status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : 'internal'
    return NextResponse.json({ error: { code, message: error } }, { status })
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { user } = await requireRole('node_leader')
    const admin = await getAdminClient()
    const { nodeId } = await ledNodeFor(admin, user.id)

    let body: unknown
    try {
      body = await request.json()
    } catch {
      body = undefined
    }
    const validated = validateProposal(body)
    if (!validated.ok) {
      return NextResponse.json(
        { error: { code: 'invalid_input', message: validated.message } },
        { status: 400 },
      )
    }
    const { input } = validated

    const created = await createProposal(admin, {
      title: input.title,
      type: input.type,
      description: input.description ?? undefined,
      proposed_by: nodeId,
      organized_by: user.id,
      status: 'proposed',
      starts_at: input.starts_at,
      location: input.location ?? undefined,
      is_public: input.is_public,
      attendance_count: 0,
      xp_awarded: false,
    })

    return NextResponse.json({ data: project(created) }, { status: 201 })
  } catch (err) {
    const { status, error } = authErrorResponse(err)
    const code =
      status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : 'internal'
    return NextResponse.json({ error: { code, message: error } }, { status })
  }
}
