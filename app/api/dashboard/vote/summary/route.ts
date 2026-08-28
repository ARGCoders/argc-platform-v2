import { NextResponse } from 'next/server'
import { ClientResponseError } from 'pocketbase'
import { requireRole, authErrorResponse } from '@/lib/auth'
import { getAdminClient } from '@/lib/pocketbase-server'
import type { AdvancementCycleRecord, VoteRecord } from '@/types/pocketbase'

/**
 * GET /api/dashboard/vote/summary — how many positive and negative votes the
 * caller has received in the active cycle (MEMBER-12 / PLATFORM §5 vote
 * anonymization). The response is two counts. The `voter` field is never
 * projected, mapped, or logged by this handler — a member can only ever learn
 * aggregates, never who voted.
 */
export const dynamic = 'force-dynamic'

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
      return NextResponse.json({ data: { positive: 0, negative: 0 } })
    }

    const votes = await admin.collection('votes').getFullList<VoteRecord>({
      filter: admin.filter('subject = {:subject} && cycle = {:cycle}', {
        subject: user.id,
        cycle: cycle.id,
      }),
    })

    let positive = 0
    let negative = 0
    for (const vote of votes) {
      if (vote.polarity === 'positive') positive += 1
      else negative += 1
    }

    return NextResponse.json({ data: { positive, negative } })
  } catch (err) {
    const { status, error } = authErrorResponse(err)
    const code =
      status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : 'internal'
    return NextResponse.json({ error: { code, message: error } }, { status })
  }
}
