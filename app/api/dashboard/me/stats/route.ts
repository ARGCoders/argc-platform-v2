import { NextResponse } from 'next/server'
import { ClientResponseError } from 'pocketbase'
import { requireRole, authErrorResponse } from '@/lib/auth'
import { getAdminClient } from '@/lib/pocketbase-server'
import { tierForXp, tierProgress } from '@/lib/constants'
import type { AdvancementCycleRecord, UserStatsRecord } from '@/types/pocketbase'

/**
 * GET /api/dashboard/me/stats — the caller's current-cycle stats snapshot
 * (MEMBER-01). Reads `user_stats` only; the ledger is never queried here
 * (PLATFORM §5). The stats filter is selected by the authenticated caller's
 * id, which makes ownership scoping structural: another member's row is not
 * a 403, it is simply unreachable.
 *
 * A brand-new member has no row yet — that renders as zeroed stats, never an
 * error. "No active cycle" is also a valid state, not a failure.
 */
export const dynamic = 'force-dynamic'

/** Stats shape for a member whose first cycle has produced no rows yet. */
function zeroedStats(userId: string, cycleId: string): UserStatsRecord {
  return {
    id: '',
    user: userId,
    cycle: cycleId,
    xp_total: 0,
    tier: tierForXp(0),
    evaluations_completed: 0,
    evaluations_late: 0,
    events_organized: 0,
    events_attended: 0,
    knowledge_sessions: 0,
    cross_node_contributions: 0,
    endorsements_received: 0,
    votes_received_positive: 0,
  }
}

/**
 * True only when PocketBase answered "no record matched". Any other failure
 * (network down, bad filter) must propagate to the 500 path — swallowing it
 * here would present an outage as empty data.
 */
function isMissingRecord(err: unknown): boolean {
  return err instanceof ClientResponseError && err.status === 404
}

export async function GET(): Promise<NextResponse> {
  try {
    const { user } = await requireRole('node_peer')
    const admin = await getAdminClient()

    let cycle: AdvancementCycleRecord | null = null
    try {
      cycle = await admin
        .collection('advancement_cycles')
        .getFirstListItem<AdvancementCycleRecord>(
          admin.filter('status = {:status}', { status: 'active' }),
        )
    } catch (err) {
      if (!isMissingRecord(err)) throw err
    }

    if (!cycle) {
      return NextResponse.json({
        data: { cycle: null, stats: null, progress: tierProgress(0) },
      })
    }

    let stats: UserStatsRecord | null = null
    try {
      stats = await admin.collection('user_stats').getFirstListItem<UserStatsRecord>(
        admin.filter('user = {:user} && cycle = {:cycle}', {
          user: user.id,
          cycle: cycle.id,
        }),
      )
    } catch (err) {
      if (!isMissingRecord(err)) throw err
    }

    const resolved = stats ?? zeroedStats(user.id, cycle.id)
    return NextResponse.json({
      data: { cycle, stats: resolved, progress: tierProgress(resolved.xp_total) },
    })
  } catch (err) {
    // AuthError carries its own client-safe message and status; everything
    // else collapses to an opaque 500 so PB internals never reach the client.
    const { status, error } = authErrorResponse(err)
    const code =
      status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : 'internal'
    return NextResponse.json({ error: { code, message: error } }, { status })
  }
}
