import { NextRequest, NextResponse } from 'next/server'
import { requireRole, authErrorResponse } from '@/lib/auth'
import { getAdminClient } from '@/lib/pocketbase-server'
import type { EventAttendanceRecord, EventRecord } from '@/types/pocketbase'

/**
 * GET /api/dashboard/events — events relevant to the authenticated member
 * (MEMBER-05): everything the caller has an attendance row for, plus public
 * upcoming events open for RSVP. Sorted by `starts_at` ascending, paginated
 * with the standard page/perPage envelope.
 *
 * Every returned event carries `attending` — whether the caller already RSVP'd
 * — so the events page can render the correct button state without a second
 * request. `attendance_count` is the event's stored figure: an admin fills it
 * in post-event (PLATFORM.md events), so it does NOT reflect live RSVPs —
 * RSVP appends an `event_attendance` with `confirmed: false` and never touches
 * this number. Display it as-is; do not "fix" it against attendance rows.
 * The `user` clause on the attendance read is the ACL: a supplied `?user=` is
 * ignored by design.
 *
 * Query params:
 *   page    — ≥ 1, default 1
 *   perPage — 1–100, default 20
 */
export const dynamic = 'force-dynamic'

const DEFAULT_PAGE = 1
const DEFAULT_PER_PAGE = 20
const MAX_PER_PAGE = 100

interface ProjectedEvent {
  id: string
  title: string
  type: EventRecord['type']
  status: EventRecord['status']
  starts_at: string
  ends_at: string | null
  location: string | null
  is_public: boolean
  attendance_count: number
  attending: boolean
}

function project(event: EventRecord, attending: boolean): ProjectedEvent {
  return {
    id: event.id,
    title: event.title,
    type: event.type,
    status: event.status,
    starts_at: event.starts_at,
    ends_at: event.ends_at ?? null,
    location: event.location ?? null,
    is_public: event.is_public,
    attendance_count: event.attendance_count,
    attending,
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { user } = await requireRole('node_peer')
    const admin = await getAdminClient()
    const sp = request.nextUrl.searchParams

    // ── Validate page ─────────────────────────────────────────────────────
    const pageRaw = sp.get('page')
    const page = pageRaw === null ? DEFAULT_PAGE : Number(pageRaw)
    if (!Number.isFinite(page) || page < 1 || !Number.isInteger(page)) {
      return NextResponse.json(
        { error: { code: 'invalid_input', message: 'page must be an integer ≥ 1' } },
        { status: 400 },
      )
    }

    // ── Validate perPage ──────────────────────────────────────────────────
    const perPageRaw = sp.get('perPage')
    const perPage = perPageRaw === null ? DEFAULT_PER_PAGE : Number(perPageRaw)
    if (
      !Number.isFinite(perPage) ||
      perPage < 1 ||
      perPage > MAX_PER_PAGE ||
      !Number.isInteger(perPage)
    ) {
      return NextResponse.json(
        {
          error: {
            code: 'invalid_input',
            message: 'perPage must be an integer between 1 and 100',
          },
        },
        { status: 400 },
      )
    }

    // ── Attended events: attendance rows scoped to the caller ─────────────
    // The `user` clause is the ACL — this read cannot leak another member's
    // attendance (PLATFORM §5: attendance is personal).
    const attendance = await admin
      .collection('event_attendance')
      .getFullList<EventAttendanceRecord>({
        filter: admin.filter('user = {:user}', { user: user.id }),
        expand: 'event',
      })

    const attendedByEventId = new Map<string, EventRecord>()
    for (const row of attendance) {
      const event = row.expand?.event
      if (event) attendedByEventId.set(event.id, event)
    }

    // ── Upcoming public events open for RSVP ──────────────────────────────
    const now = new Date().toISOString()
    const upcoming = await admin.collection('events').getFullList<EventRecord>({
      filter: admin.filter(
        '(status = {:approved} || status = {:scheduled}) && is_public = true && starts_at >= {:now}',
        { approved: 'approved', scheduled: 'scheduled', now },
      ),
      sort: 'starts_at',
    })

    // ── Union, dedupe (attended event that is also upcoming = one entry) ──
    const merged = new Map<string, EventRecord>(attendedByEventId)
    for (const event of upcoming) {
      if (!merged.has(event.id)) merged.set(event.id, event)
    }

    const sorted = [...merged.entries()].sort(([aId, a], [bId, b]) => {
      const byStarts = a.starts_at.localeCompare(b.starts_at)
      return byStarts !== 0 ? byStarts : aId.localeCompare(bId)
    })

    // ── Paginate the merged set ───────────────────────────────────────────
    const totalItems = sorted.length
    const totalPages = Math.ceil(totalItems / perPage)
    const start = (page - 1) * perPage
    const items = sorted.slice(start, start + perPage).map(([id, event]) => ({
      ...project(event, attendedByEventId.has(id)),
    }))

    return NextResponse.json({
      data: items,
      page,
      perPage,
      totalItems,
      totalPages,
    })
  } catch (err) {
    const { status, error } = authErrorResponse(err)
    const code =
      status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : 'internal'
    return NextResponse.json({ error: { code, message: error } }, { status })
  }
}
