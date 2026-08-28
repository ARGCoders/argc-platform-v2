import { NextRequest, NextResponse } from 'next/server'
import { ClientResponseError } from 'pocketbase'
import { requireRole, authErrorResponse } from '@/lib/auth'
import { getAdminClient } from '@/lib/pocketbase-server'
import { awardXp } from '@/lib/xp'
import { VOTE_BUDGET, XP_WEIGHTS } from '@/lib/constants'
import type {
  AdvancementCycleRecord,
  NodeMemberRecord,
  UserRecord,
  VoteRecord,
} from '@/types/pocketbase'

/**
 * POST /api/dashboard/vote — cast one vote for a member in another node
 * (MEMBER-12). Rules enforced server-side (never client-trusted):
 *   - one positive and one negative vote per cycle (`VOTE_BUDGET`);
 *   - the subject must exist and be a member of a different node;
 *   - the reason must be 10–500 characters after trimming;
 *   - the active cycle must be open.
 * A positive vote awards the subject XP via `awardXp`, idempotent on the vote
 * id, so a retried or racing request cannot double-pay. The vote is always the
 * budget spend: even if the award fails the response is `201` with
 * `xp_awarded: false` (see the award block). The created record is returned
 * without the `voter` field, consistent with every member-facing vote
 * endpoint.
 */
export const dynamic = 'force-dynamic'

function isMissingRecord(err: unknown): boolean {
  return err instanceof ClientResponseError && err.status === 404
}

function errorResponse(status: number, code: string, message: string): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status })
}

interface VoteInput {
  subject?: unknown
  polarity?: unknown
  reason?: unknown
}

async function readBody(request: NextRequest): Promise<VoteInput | null> {
  try {
    const parsed = (await request.json()) as unknown
    if (parsed == null || typeof parsed !== 'object') return {}
    return parsed as VoteInput
  } catch {
    return null
  }
}

async function requireNodeOf(
  admin: Awaited<ReturnType<typeof getAdminClient>>,
  userId: string,
): Promise<NodeMemberRecord | null> {
  try {
    return await admin
      .collection('node_member')
      .getFirstListItem<NodeMemberRecord>(
        admin.filter('user = {:user} && left_at = ""', { user: userId }),
      )
  } catch (err) {
    if (isMissingRecord(err)) return null
    throw err
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { user } = await requireRole('node_peer')
    const admin = await getAdminClient()

    const body = await readBody(request)
    if (body === null) {
      return errorResponse(400, 'invalid_input', 'Request body must be JSON')
    }

    const { subject, polarity, reason } = body
    if (typeof subject !== 'string' || subject.length === 0) {
      return errorResponse(400, 'invalid_input', 'subject must be a member id')
    }
    if (polarity !== 'positive' && polarity !== 'negative') {
      return errorResponse(
        400,
        'invalid_input',
        'polarity must be "positive" or "negative"',
      )
    }
    const trimmedReason = typeof reason === 'string' ? reason.trim() : ''
    if (trimmedReason.length < 10 || trimmedReason.length > 500) {
      return errorResponse(
        400,
        'invalid_input',
        'reason must be between 10 and 500 characters',
      )
    }

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
      return errorResponse(409, 'conflict', 'No active cycle is open for voting')
    }

    const callerMembership = await requireNodeOf(admin, user.id)
    if (!callerMembership) {
      return errorResponse(400, 'invalid_input', 'Not in a node')
    }

    let subjectUser: UserRecord
    try {
      subjectUser = await admin.collection('users').getOne<UserRecord>(subject)
    } catch (err) {
      if (isMissingRecord(err)) {
        return errorResponse(400, 'invalid_input', 'Unknown subject')
      }
      throw err
    }
    if (subjectUser.id === user.id) {
      return errorResponse(400, 'invalid_input', 'Cannot vote for yourself')
    }

    const subjectMembership = await requireNodeOf(admin, subject)
    if (!subjectMembership || subjectMembership.node === callerMembership.node) {
      return errorResponse(400, 'invalid_input', 'Subject must be in a different node')
    }

    const spent = await admin.collection('votes').getFullList<VoteRecord>({
      filter: admin.filter(
        'voter = {:voter} && cycle = {:cycle} && polarity = {:polarity}',
        {
          voter: user.id,
          cycle: cycle.id,
          polarity,
        },
      ),
    })
    if (spent.length >= VOTE_BUDGET[polarity]) {
      return errorResponse(
        409,
        'conflict',
        `You have already used your ${polarity} vote this cycle`,
      )
    }

    let vote: VoteRecord
    try {
      vote = await admin.collection('votes').create<VoteRecord>({
        voter: user.id,
        subject,
        cycle: cycle.id,
        polarity,
        reason: trimmedReason,
        is_cross_node: true,
      })
    } catch (err) {
      // Once the unique partial index on votes(voter, cycle, polarity) exists
      // (MEMBER-12 escalation), the loser of an interleaved race is rejected
      // with 400. That is exactly the budget-spent condition checked above, so
      // answer the identical 409 instead of a misleading 500.
      if (err instanceof ClientResponseError && err.status === 400) {
        return errorResponse(
          409,
          'conflict',
          `You have already used your ${polarity} vote this cycle`,
        )
      }
      throw err
    }

    // A positive vote rewards the subject (cross-node recognition, XP_WEIGHTS);
    // a negative vote is a flag, not a reward, so it posts no XP. The vote is
    // the budget spend either way: it stays even if the award fails. A partial
    // awardXp failure (ledger row written, stats sync failed) must not be
    // rolled back by deleting the vote — that would leave a dangling ledger
    // reference and double-pay on a retry.
    //
    // An award failure is reported, not fatal: the vote was created and the
    // budget is spent, so the HTTP response is the honest 201 with
    // `xp_awarded: false` (a retry would otherwise see "no active budget"
    // 409 after a misleading 500). The failure is logged here and its recovery
    // path is a manual award (ADMIN-02) referencing this vote id, which
    // awardXp keeps idempotent.
    let xpAwarded = false
    if (polarity === 'positive') {
      try {
        await awardXp(
          subject,
          XP_WEIGHTS.cross_node_vote_received,
          'cross_node_vote_received',
          vote.id,
          'vote',
          cycle.id,
        )
        xpAwarded = true
      } catch (err) {
        console.error(
          `[vote] XP award failed for vote ${vote.id} (subject ${subject}):`,
          err,
        )
      }
    }
    // Negative votes post no XP by design, so xpAwarded stays false for them.

    return NextResponse.json(
      {
        data: {
          id: vote.id,
          subject: vote.subject,
          cycle: vote.cycle,
          polarity: vote.polarity,
          reason: vote.reason,
          is_cross_node: vote.is_cross_node,
          xp_awarded: xpAwarded,
          created: vote.created,
        },
      },
      { status: 201 },
    )
  } catch (err) {
    const { status, error } = authErrorResponse(err)
    const code =
      status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : 'internal'
    return NextResponse.json({ error: { code, message: error } }, { status })
  }
}
