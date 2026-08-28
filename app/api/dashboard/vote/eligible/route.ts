import { NextResponse } from 'next/server'
import { ClientResponseError } from 'pocketbase'
import { requireRole, authErrorResponse } from '@/lib/auth'
import { getAdminClient } from '@/lib/pocketbase-server'
import type {
  AdvancementCycleRecord,
  NodeMemberRecord,
  UserRecord,
  UserStatsRecord,
  VoteRecord,
} from '@/types/pocketbase'

/**
 * GET /api/dashboard/vote/eligible — who the caller may vote for this cycle
 * (MEMBER-12). Candidates are active members in a different node than the
 * caller who have a `user_stats` row for the active cycle (PLATFORM §5 / §6
 * Q2), minus anyone the caller has already voted for. Returns a projected
 * member shape; this is the caller's voting surface, so no fields beyond what
 * the vote form needs leave the server.
 *
 * Deliberately unpaginated: the list is bounded by product rules (active
 * cross-node members in the current cycle), not by data growth, so it returns
 * the bare `{ data }` envelope instead of the paginated list form in
 * DASHBOARD_CONTRACT §1.
 */
export const dynamic = 'force-dynamic'

function isMissingRecord(err: unknown): boolean {
  return err instanceof ClientResponseError && err.status === 404
}

interface EligibleMember {
  id: string
  display_name: string
  avatar_url: string
  node: { id: string; name: string } | null
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
    if (!cycle) return NextResponse.json({ data: [] })

    let callerMembership: NodeMemberRecord | null = null
    try {
      callerMembership = await admin
        .collection('node_member')
        .getFirstListItem<NodeMemberRecord>(
          admin.filter('user = {:user} && left_at = ""', { user: user.id }),
        )
    } catch (err) {
      if (!isMissingRecord(err)) throw err
    }
    if (!callerMembership) return NextResponse.json({ data: [] })

    const candidates = await admin
      .collection('node_member')
      .getFullList<NodeMemberRecord>({
        filter: admin.filter('node != {:node} && left_at = ""', {
          node: callerMembership.node,
        }),
        expand: 'user,node',
      })

    const activeStats = await admin
      .collection('user_stats')
      .getFullList<UserStatsRecord>({
        filter: admin.filter('cycle = {:cycle}', { cycle: cycle.id }),
      })
    const activeIds = new Set(activeStats.map((s) => s.user))

    const votedSubjects = await admin.collection('votes').getFullList<VoteRecord>({
      filter: admin.filter('voter = {:voter} && cycle = {:cycle}', {
        voter: user.id,
        cycle: cycle.id,
      }),
      fields: 'subject',
    })
    const votedIds = new Set(votedSubjects.map((v) => v.subject))

    const members: EligibleMember[] = candidates
      .filter((m) => {
        if (m.user === user.id) return false
        if (!activeIds.has(m.user)) return false
        if (votedIds.has(m.user)) return false
        return m.expand?.user != null
      })
      .map((m) => {
        const expandedUser = m.expand?.user as UserRecord | undefined
        const node = m.expand?.node
        return {
          id: expandedUser!.id,
          display_name: expandedUser!.display_name,
          avatar_url: expandedUser!.avatar_url,
          node: node ? { id: node.id, name: node.name } : null,
        }
      })
      .sort((a, b) => a.display_name.localeCompare(b.display_name))

    return NextResponse.json({ data: members })
  } catch (err) {
    const { status, error } = authErrorResponse(err)
    const code =
      status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : 'internal'
    return NextResponse.json({ error: { code, message: error } }, { status })
  }
}
