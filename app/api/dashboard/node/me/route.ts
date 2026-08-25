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

    const memberData: MemberSummary[] = await Promise.all(
      memberRecords.map(async (m) => {
        const expandedUser = m.expand?.user
        const projectedUser = expandedUser
          ? {
              id: expandedUser.id,
              display_name: expandedUser.display_name,
              avatar_url: expandedUser.avatar_url,
            }
          : null

        let stats: UserStatsRecord | null = null
        if (cycle) {
          try {
            stats = await admin
              .collection('user_stats')
              .getFirstListItem<UserStatsRecord>(
                admin.filter('user = {:user} && cycle = {:cycle}', {
                  user: m.user,
                  cycle: cycle.id,
                }),
              )
          } catch (err) {
            if (!isMissingRecord(err)) throw err
          }
        }

        let evals: EvaluationRecord[] = []
        if (cycle) {
          try {
            evals = await admin.collection('evaluations').getFullList<EvaluationRecord>({
              filter: admin.filter('evaluatee = {:evaluatee} && cycle = {:cycle}', {
                evaluatee: m.user,
                cycle: cycle.id,
              }),
            })
          } catch (err) {
            if (!isMissingRecord(err)) throw err
          }
        }

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
      }),
    )

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
