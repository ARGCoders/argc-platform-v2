import { NextRequest, NextResponse } from 'next/server'
import { ClientResponseError } from 'pocketbase'
import { requireRole, authErrorResponse } from '@/lib/auth'
import { getAdminClient } from '@/lib/pocketbase-server'
import { awardXp } from '@/lib/xp'
import { XP_WEIGHTS } from '@/lib/constants'
import { ledNodeFor } from '../scopes'
import type { EvaluationRecord, NodeMemberRecord } from '@/types/pocketbase'

/**
 * PATCH /api/dashboard/node/evaluations/[id] — body-driven state transitions
 * on a single evaluation belonging to the caller's node (MEMBER-09). NL+ with
 * the same ownership proof as the GET route; an eval whose evaluatee is not a
 * current member of the led node answers 404, never 403 (existence
 * disclosure).
 *
 * Transitions (everything else answers 409 conflict):
 *   pending   → scheduled  requires `scheduled_at` (ISO); optional
 *                           `evaluator_id` must be a current member of the
 *                           same node (IDOR guard) → 400 otherwise
 *   scheduled → completed  requires integer `score` 0–100 → 400 otherwise;
 *                           sets `completed_at`, posts XP to the evaluatee
 *   scheduled → missed     no XP
 *   completed / missed     terminal — any further mutation → 409
 *
 * XP on completion: on-time = completed_at within the scheduled calendar day
 * (UTC) → `evaluation_on_time` (25); otherwise `evaluation_late` (10). The
 * award happens BEFORE the row is marked completed and `xp_awarded` is set
 * only after it lands: `awardXp` is idempotent per (evaluatee, eval id), so a
 * retried PATCH can never double-award, and an outage mid-award leaves the
 * eval still `scheduled` (retryable) instead of terminal-but-unpaid.
 */
export const dynamic = 'force-dynamic'

interface PatchBody {
  status?: unknown
  scheduled_at?: unknown
  evaluator_id?: unknown
  score?: unknown
}

function isMissingRecord(err: unknown): boolean {
  return err instanceof ClientResponseError && err.status === 404
}

function invalidInput(message: string): NextResponse {
  return NextResponse.json({ error: { code: 'invalid_input', message } }, { status: 400 })
}

function conflict(message: string): NextResponse {
  return NextResponse.json({ error: { code: 'conflict', message } }, { status: 409 })
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}

function isWholeScore(value: unknown): value is number {
  return (
    typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 100
  )
}

/** Same UTC calendar day. Deterministic and timezone-stable server-side. */
function sameCalendarDayUTC(a: string, b: string): boolean {
  const da = new Date(a)
  const db = new Date(b)
  return (
    da.getUTCFullYear() === db.getUTCFullYear() &&
    da.getUTCMonth() === db.getUTCMonth() &&
    da.getUTCDate() === db.getUTCDate()
  )
}

async function loadOwnedEvaluation(
  admin: Awaited<ReturnType<typeof getAdminClient>>,
  id: string,
  nodeId: string,
): Promise<EvaluationRecord> {
  let evalRecord: EvaluationRecord
  try {
    evalRecord = await admin.collection('evaluations').getOne<EvaluationRecord>(id)
  } catch (err) {
    if (isMissingRecord(err)) {
      throw new NotOwnedError('Evaluation not found')
    }
    throw err
  }

  // Existence non-disclosure: an eval belonging to another node's members is
  // indistinguishable from one that does not exist.
  await admin
    .collection('node_member')
    .getFirstListItem<NodeMemberRecord>(
      admin.filter('node = {:node} && user = {:user} && left_at = ""', {
        node: nodeId,
        user: evalRecord.evaluatee,
      }),
    )
    .catch((err) => {
      if (isMissingRecord(err)) throw new NotOwnedError('Evaluation not found')
      throw err
    })
  return evalRecord
}

class NotOwnedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotOwnedError'
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { user } = await requireRole('node_leader')
    const admin = await getAdminClient()
    const { nodeId } = await ledNodeFor(admin, user.id)
    const { id } = await params

    let body: PatchBody
    try {
      body = (await request.json()) as PatchBody
    } catch {
      return invalidInput('Malformed JSON body')
    }

    const desired = body.status
    if (desired !== 'scheduled' && desired !== 'completed' && desired !== 'missed') {
      return invalidInput('status must be scheduled, completed, or missed')
    }

    const evalRecord = await loadOwnedEvaluation(admin, id, nodeId)

    // ── Terminal states reject every mutation ─────────────────────────────
    if (evalRecord.status === 'completed' || evalRecord.status === 'missed') {
      return conflict('Evaluation is already complete')
    }

    // ── State machine ─────────────────────────────────────────────────────
    if (evalRecord.status === 'pending') {
      if (desired !== 'scheduled') {
        return conflict('A pending evaluation can only be scheduled')
      }
      if (!isIsoDate(body.scheduled_at)) {
        return invalidInput('scheduled_at must be an ISO date')
      }

      let evaluatorId: string | null = null
      if (body.evaluator_id !== undefined && body.evaluator_id !== null) {
        if (typeof body.evaluator_id !== 'string') {
          return invalidInput('evaluator_id must be a member id')
        }
        try {
          const evaluator = await admin
            .collection('node_member')
            .getFirstListItem<NodeMemberRecord>(
              admin.filter('node = {:node} && user = {:user} && left_at = ""', {
                node: nodeId,
                user: body.evaluator_id,
              }),
            )
          evaluatorId = evaluator.user
        } catch (err) {
          if (isMissingRecord(err)) {
            return invalidInput(
              'evaluator_id must belong to a current member of the node',
            )
          }
          throw err
        }
      }

      const updated = await admin.collection('evaluations').update<EvaluationRecord>(id, {
        status: 'scheduled',
        scheduled_at: body.scheduled_at,
        evaluator: evaluatorId,
      })
      return NextResponse.json({ data: updated }, { status: 200 })
    }

    // evalRecord.status === 'scheduled'
    if (desired === 'scheduled') {
      return conflict('An evaluation cannot be rescheduled once scheduled')
    }

    if (desired === 'missed') {
      const updated = await admin
        .collection('evaluations')
        .update<EvaluationRecord>(id, { status: 'missed' })
      return NextResponse.json({ data: updated }, { status: 200 })
    }

    if (!isWholeScore(body.score)) {
      return invalidInput('score must be an integer between 0 and 100')
    }

    // ── Complete: award XP to the evaluatee BEFORE marking completed ──────
    // If this throws (arguments invalid or a PB outage), the eval stays
    // `scheduled` so a retry can complete it. awardXp is idempotent per
    // (evaluatee, eval id) — the worst a retry does is re-fetch the existing
    // ledger row; it can never double-post.
    const completedAt = new Date().toISOString()
    const onTime =
      evalRecord.scheduled_at !== undefined &&
      sameCalendarDayUTC(evalRecord.scheduled_at, completedAt)
    const category = onTime ? 'evaluation_on_time' : 'evaluation_late'
    await awardXp(
      evalRecord.evaluatee,
      XP_WEIGHTS[category],
      category,
      evalRecord.id,
      'evaluation',
      evalRecord.cycle,
    )

    const updated = await admin.collection('evaluations').update<EvaluationRecord>(id, {
      status: 'completed',
      completed_at: completedAt,
      score: body.score,
      xp_awarded: true,
    })
    return NextResponse.json({ data: updated }, { status: 200 })
  } catch (err) {
    if (err instanceof NotOwnedError) {
      return NextResponse.json(
        { error: { code: 'not_found', message: err.message } },
        { status: 404 },
      )
    }
    const { status, error } = authErrorResponse(err)
    const code =
      status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : 'internal'
    return NextResponse.json({ error: { code, message: error } }, { status })
  }
}
