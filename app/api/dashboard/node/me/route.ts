import { NextResponse } from 'next/server'
import { ClientResponseError } from 'pocketbase'
import { requireRole, authErrorResponse } from '@/lib/auth'
import { getAdminClient } from '@/lib/pocketbase-server'
import { tierForXp } from '@/lib/constants'
import type {
  AdvancementCycleRecord,
  EvaluationRecord,
  NodeMemberRecord,
  NodeRecord,
  UserStatsRecord,
} from '@/types/pocketbase'

export const dynamic = 'force-dynamic'

function isMissingRecord(err: unknown): boolean {
  return err instanceof ClientResponseError && err.status === 404
}

interface MemberSummary {
  user: { id: string; display_name: string; avatar_url: string } | null
  role: 'member' | 'leader'
  tier: string
  xp_total: number
  evals: { stage: string; status: string; score: number | undefined }[]
}

export async function GET(): Promise<NextResponse> {
  try {
    const { user } = await requireRole('node_peer')
    const admin = await getAdminClient()

    let callerMembership: NodeMemberRecord
    try {
      callerMembership = await admin
        .collection('node_member')
        .getFirstListItem<NodeMemberRecord>(
          admin.filter('user = {:user} && left_at = ""', { user: user.id }),
        )
    } catch (err) {
      if (isMissingRecord(err)) {
        return NextResponse.json(
          { error: { code: 'not_found', message: 'Not in a node' } },
          { status: 404 },
        )
      }
      throw err
    }

    const node = await admin.collection('node').getOne<NodeRecord>(callerMembership.node)

    const memberRecords = await admin
      .collection('node_member')
      .getFullList<NodeMemberRecord>({
        filter: admin.filter('node = {:node} && left_at = ""', {
          node: callerMembership.node,
        }),
        expand: 'user',
      })

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

    const memberIds = new Set(memberRecords.map((m) => m.user))

    // Single grouped reads for the whole node instead of two queries per
    // member (user_stats + evaluations): both are scoped to the active cycle,
    // then joined to each member's id in JS. Four queries regardless of node
    // size — constant, not linear — so this holds up as a node grows.
    const statsByUser = new Map<string, UserStatsRecord>()
    const evalsByUser = new Map<string, EvaluationRecord[]>()
    if (cycle) {
      const statsRows = await admin
        .collection('user_stats')
        .getFullList<UserStatsRecord>({
          filter: admin.filter('cycle = {:cycle}', { cycle: cycle.id }),
        })
      for (const row of statsRows) {
        if (memberIds.has(row.user)) statsByUser.set(row.user, row)
      }

      const evalRows = await admin
        .collection('evaluations')
        .getFullList<EvaluationRecord>({
          filter: admin.filter('cycle = {:cycle}', { cycle: cycle.id }),
        })
      for (const row of evalRows) {
        if (memberIds.has(row.evaluatee)) {
          const list = evalsByUser.get(row.evaluatee)
          if (list) list.push(row)
          else evalsByUser.set(row.evaluatee, [row])
        }
      }
    }

    const memberData: MemberSummary[] = memberRecords.map((m) => {
      const expandedUser = m.expand?.user
      const projectedUser = expandedUser
        ? {
            id: expandedUser.id,
            display_name: expandedUser.display_name,
            avatar_url: expandedUser.avatar_url,
          }
        : null

      const stats = statsByUser.get(m.user) ?? null
      const evals = evalsByUser.get(m.user) ?? []

      return {
        user: projectedUser,
        role: m.role,
        tier: stats?.tier ?? tierForXp(0),
        xp_total: stats?.xp_total ?? 0,
        evals: evals.map((e) => ({
          stage: e.stage,
          status: e.status,
          score: e.score,
        })),
      }
    })

    return NextResponse.json({
      data: {
        node: {
          id: node.id,
          name: node.name,
          slug: node.slug,
          cohort: node.cohort,
          status: node.status,
        },
        members: memberData,
      },
    })
  } catch (err) {
    const { status, error } = authErrorResponse(err)
    const code =
      status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : 'internal'
    return NextResponse.json({ error: { code, message: error } }, { status })
  }
}
