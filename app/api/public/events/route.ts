import { NextRequest, NextResponse } from 'next/server'
import type PocketBase from 'pocketbase'
import { getAdminClient } from '@/lib/pocketbase-server'
import { parsePagination } from '@/lib/pagination'
import { sanitizeHtml, stripSanitizedHtml } from '@/lib/sanitize'
import type { EventRecord } from '@/types/pocketbase'

/**
 * GET /api/public/events — the public `/events` page's only data source
 * (UI-15). Unauthenticated by design (DASHBOARD_CONTRACT §6): every visitor
 * sees the same `is_public = true` set, there is no per-caller scoping.
 *
 * `description` is run through `sanitizeHtml()` here, at fetch time, per
 * DASHBOARD_CONTRACT §5 — safe to render with `dangerouslySetInnerHTML` if a
 * future event detail page needs the rich version. `excerpt` is the plain-
 * text projection the card actually displays, derived from that already-
 * sanitized `description` via `stripSanitizedHtml()` (a cheap regex strip,
 * not a second DOMPurify/jsdom parse — safe specifically because the input
 * is already known-safe). `lib/sanitize.ts` is `server-only` (pulls in
 * jsdom), so the card — a client component, for the filter tabs — cannot
 * call either function itself and needs the stripped text handed to it
 * already computed.
 *
 * Query params:
 *   page    — ≥ 1, default 1
 *   perPage — 1–100, default 20
 */
export const dynamic = 'force-dynamic'

export interface PublicEvent {
  id: string
  title: string
  slug: string
  poster_photo: string | null
  description: string
  excerpt: string
  type: EventRecord['type']
  status: EventRecord['status']
  starts_at: string
  ends_at: string | null
  location: string | null
}

/**
 * `poster_photo` is a PocketBase file field — the record only stores the
 * filename, so it has to be resolved through `files.getURL()` into an
 * absolute URL the browser can request directly.
 */
function project(admin: PocketBase, event: EventRecord): PublicEvent {
  const description = sanitizeHtml(event.description ?? '')
  return {
    id: event.id,
    title: event.title,
    slug: event.slug,
    poster_photo: event.poster_photo
      ? admin.files.getURL(event, event.poster_photo)
      : null,
    description,
    excerpt: stripSanitizedHtml(description),
    type: event.type,
    status: event.status,
    starts_at: event.starts_at,
    ends_at: event.ends_at ?? null,
    location: event.location ?? null,
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const admin = await getAdminClient()
    const sp = request.nextUrl.searchParams

    // ── Validate page/perPage (defaults and cap live in lib/pagination) ────
    const parsed = parsePagination(sp)
    if (!parsed.ok) {
      return NextResponse.json(
        { error: { code: 'invalid_input', message: parsed.message } },
        { status: 400 },
      )
    }
    const { page, perPage } = parsed

    const result = await admin.collection('events').getList<EventRecord>(page, perPage, {
      filter: admin.filter('is_public = {:isPublic}', { isPublic: true }),
      sort: '-starts_at',
    })

    return NextResponse.json({
      data: result.items.map((event) => project(admin, event)),
      page: result.page,
      perPage: result.perPage,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    })
  } catch (err) {
    // Unauthenticated route — no AuthError path exists here, so any failure
    // (PocketBase outage, bad filter) collapses to an opaque 500. The raw
    // error never reaches the client.
    console.error('[api/public/events] unexpected error:', err)
    return NextResponse.json(
      { error: { code: 'internal', message: 'Server error' } },
      { status: 500 },
    )
  }
}
