import { NextRequest, NextResponse } from 'next/server'
import { ClientResponseError } from 'pocketbase'
import { requireRole, authErrorResponse } from '@/lib/auth'
import { getAdminClient } from '@/lib/pocketbase-server'
import type { EventAttendanceRecord, EventRecord } from '@/types/pocketbase'

/**
 * POST /api/dashboard/events/[id]/rsvp — record the caller as an attendee of
 * an event open for RSVP (MEMBER-05). Idempotent by design: a request that
 * already has an attendance row returns that record as a 200 replay, never an
 * error (DASHBOARD_CONTRACT §1 — a mutation that changed nothing returns the
 * existing record).
 *
 * Sequence:
 *   1. event exists?  else 404 not_found
 *   2. open for RSVP? status approved/scheduled and starts_at in future,
 *      else 409 conflict ("event not open for RSVP")
 *   3. there is already an event_attendance(event, user) row? → 200 with it
 *   4. create { event, user: caller, role: 'attendee', confirmed: false } → 201
 *
 * The caller's identity comes only from the session (requireRole), and the
 * attendance row is scoped to that identity — there is no client-controlled
 * user field anywhere in this handler.
 */
export const dynamic = 'force-dynamic'

const OPEN_STATUSES: EventRecord['status'][] = ['approved', 'scheduled']

async function findAttendance(
  admin: Awaited<ReturnType<typeof getAdminClient>>,
  eventId: string,
  userId: string,
) {
  try {
    return await admin
      .collection('event_attendance')
      .getFirstListItem<EventAttendanceRecord>(
        admin.filter('event = {:event} && user = {:user}', {
          event: eventId,
          user: userId,
        }),
      )
  } catch (err) {
    // getFirstListItem throws 404 when nothing matches — that is the
    // "no attendance yet" case, not an error.
    if (err instanceof ClientResponseError && err.status === 404) return null
    throw err
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { user } = await requireRole('node_peer')
    const admin = await getAdminClient()
    const { id } = await params

    // ── 1. Event must exist ───────────────────────────────────────────────
    let event: EventRecord
    try {
      event = await admin.collection('events').getOne<EventRecord>(id)
    } catch (err) {
      if (err instanceof ClientResponseError && err.status === 404) {
        return NextResponse.json(
          { error: { code: 'not_found', message: 'Event not found' } },
          { status: 404 },
        )
      }
      throw err
    }

    // ── 2. Open for RSVP? ─────────────────────────────────────────────────
    const open =
      OPEN_STATUSES.includes(event.status) && event.starts_at > new Date().toISOString()
    if (!open) {
      return NextResponse.json(
        { error: { code: 'conflict', message: 'Event not open for RSVP' } },
        { status: 409 },
      )
    }

    // ── 3. Idempotent replay ──────────────────────────────────────────────
    const existing = await findAttendance(admin, id, user.id)
    if (existing) {
      return NextResponse.json({ data: existing }, { status: 200 })
    }

    // ── 4. Create ─────────────────────────────────────────────────────────
    let created: EventAttendanceRecord
    try {
      created = await admin.collection('event_attendance').create<EventAttendanceRecord>({
        event: id,
        user: user.id,
        role: 'attendee',
        confirmed: false,
        xp_awarded: false,
      })
    } catch (err) {
      // Race guard: a concurrent duplicate (same event + user) may have been
      // created between the lookup and this write. Treat a rejected create as
      // the 200 replay unless the row genuinely does not exist. The eventual
      // unique index on (event, user) — flagged to Role 1 — is what makes this
      // race safe at the DB, not just here.
      if (err instanceof ClientResponseError && err.status === 400) {
        const raced = await findAttendance(admin, id, user.id)
        if (raced) {
          return NextResponse.json({ data: raced }, { status: 200 })
        }
      }
      throw err
    }

    return NextResponse.json({ data: created }, { status: 201 })
  } catch (err) {
    const { status, error } = authErrorResponse(err)
    const code =
      status === 401
        ? 'unauthorized'
        : status === 403
          ? 'forbidden'
          : status === 400
            ? 'invalid_input'
            : 'internal'
    return NextResponse.json({ error: { code, message: error } }, { status })
  }
}
