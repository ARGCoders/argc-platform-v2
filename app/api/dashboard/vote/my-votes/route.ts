import { NextResponse } from 'next/server'
import { ClientResponseError } from 'pocketbase'
import { requireRole, authErrorResponse } from '@/lib/auth'
import { getAdminClient } from '@/lib/pocketbase-server'
import type { AdvancementCycleRecord, VoteRecord } from '@/types/pocketbase'

/**
 * GET /api/dashboard/vote/my-votes — the caller's own votes in the active
 * cycle (MEMBER-12). The query is scoped to `voter = caller`, so this can
 * never reveal another member's vote. The `voter` field is not projected —
 * the response carries only what the caller's vote history needs.
 */
export const dynamic = 'force-dynamic'

function isMissingRecord(err: unknown): boolean {
  return err instanceof ClientResponseError && err.status === 404
}

interface MyVote {
  id: string
  polarity: 'positive' | 'negative'
  reason: string
  created: string
  subject: { id: string; display_name: string; avatar_url: string }
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

    const votes = await admin.collection('votes').getFullList<VoteRecord>({
      filter: admin.filter('voter = {:voter} && cycle = {:cycle}', {
        voter: user.id,
        cycle: cycle.id,
      }),
      expand: 'subject',
    })

    const data: MyVote[] = votes
      .map((vote) => {
        const subject = vote.expand?.subject
        return {
          id: vote.id,
          polarity: vote.polarity,
          reason: vote.reason,
          created: vote.created,
          subject: subject
            ? {
                id: subject.id,
                display_name: subject.display_name,
                avatar_url: subject.avatar_url,
              }
            : { id: vote.subject, display_name: '', avatar_url: '' },
        }
      })
      .sort((a, b) => (b.created > a.created ? 1 : -1))

    return NextResponse.json({ data })
  } catch (err) {
    const { status, error } = authErrorResponse(err)
    const code =
      status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : 'internal'
    return NextResponse.json({ error: { code, message: error } }, { status })
  }
}
