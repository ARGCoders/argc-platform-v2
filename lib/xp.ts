import 'server-only'
import { ClientResponseError } from 'pocketbase'
import { getAdminClient } from './pocketbase-server'
import { tierForXp, XP_CATEGORIES } from './constants'
import type {
  XpCategory,
  XpReferenceType,
  XpLedgerRecord,
  UserStatsRecord,
} from '@/types/pocketbase'

/**
 * The single ledger-write path (INFRA-06).
 *
 * Every XP award in the app — vote received, evaluation completed, event
 * organized, endorsement verified, manual adjustment — goes through
 * `awardXp`. It owns the two invariants the rest of the codebase relies on:
 *
 * 1. `xp_ledger` is append-only and idempotent per `(user, reference_id)`:
 *    calling the helper twice with the same reference never double-awards.
 * 2. `user_stats` is kept in sync inline (PLATFORM.md §5): the `xp_total` is
 *    incremented, the tier recomputed from `TIER_THRESHOLDS`, and the counter
 *    matching the category is bumped via `XP_STATS_BUMPS`.
 *
 * The frozen signature (argument order) is part of the contract — Roles 3/4
 * call this exact shape. Full reconciliation for a whole cycle is a separate
 * concern: `/api/admin/xp/recompute` (ADMIN-08) rebuilds `user_stats` from
 * the ledger and is the recovery path if these inline updates ever diverge.
 *
 * Amounts are decided by the caller — usually `XP_WEIGHTS[category]` from
 * `lib/constants.ts`; `manual_adjustment` corrections may be negative.
 */

/** Numeric `user_stats` counters that an award can increment. */
export type StatsCounterField =
  | 'evaluations_completed'
  | 'evaluations_late'
  | 'events_organized'
  | 'events_attended'
  | 'knowledge_sessions'
  | 'cross_node_contributions'
  | 'endorsements_received'
  | 'votes_received_positive'

/**
 * Which `user_stats` counters an award of each category bumps. Categories
 * without a dedicated counter (`hackathon`, `manual_adjustment`) still earn
 * XP — they just do not move a named field.
 */
export const XP_STATS_BUMPS: Record<
  XpCategory,
  Partial<Record<StatsCounterField, number>>
> = {
  evaluation_on_time: { evaluations_completed: 1 },
  evaluation_late: { evaluations_completed: 1, evaluations_late: 1 },
  event_organized: { events_organized: 1 },
  event_attended: { events_attended: 1 },
  knowledge_session: { knowledge_sessions: 1 },
  cross_node_contribution: { cross_node_contributions: 1 },
  hackathon: {},
  endorsement_received: { endorsements_received: 1 },
  cross_node_vote_received: { votes_received_positive: 1 },
  manual_adjustment: {},
}

const XP_REFERENCE_TYPES: readonly XpReferenceType[] = [
  'evaluation',
  'event',
  'knowledge_session',
  'cross_node',
  'hackathon',
  'endorsement',
  'vote',
  'manual',
]

/** XP award failure with a client-safe message. */
export class XpError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'XpError'
  }
}

/**
 * True only when PocketBase answered "no record matched". Anything else —
 * an outage, a bad filter — must propagate, never be treated as "never
 * awarded" or "no stats row yet". Swallowing those would report an award as
 * written when it was not.
 */
function isMissingRecord(err: unknown): boolean {
  return err instanceof ClientResponseError && err.status === 404
}

/**
 * True when PocketBase rejected a create for a unique-index violation. With
 * the `xp_ledger (user, reference_id)` / `user_stats (user, cycle)` indexes
 * in place, two interleaved writers hit this: one wins, the other must be
 * handled as "already exists" — the idempotent path — never as an error.
 */
function isIndexViolation(err: unknown): boolean {
  return err instanceof ClientResponseError && err.status === 400
}

export interface XpAwardResult {
  /** False when a ledger entry for this reference already existed. */
  created: boolean
  ledger: XpLedgerRecord
  stats: UserStatsRecord
}

/**
 * Award XP and keep `user_stats` in sync. Idempotent per
 * `(user, referenceId)` — see the module doc for the contract.
 *
 * @throws {XpError} when any argument is invalid (bad ids, zero/NaN amount,
 * unknown category or reference type).
 */
export async function awardXp(
  user: string,
  amount: number,
  category: XpCategory,
  referenceId: string,
  referenceType: XpReferenceType,
  cycle: string,
  awardedBy?: string,
): Promise<XpAwardResult> {
  assertValidAward(user, amount, category, referenceId, referenceType, cycle)

  const pb = await getAdminClient()
  const ledgerCollection = pb.collection('xp_ledger')

  let existing: XpLedgerRecord | null = null
  try {
    existing = await ledgerCollection.getFirstListItem<XpLedgerRecord>(
      pb.filter('user = {:user} && reference_id = {:reference}', {
        user,
        reference: referenceId,
      }),
    )
  } catch (err) {
    if (!isMissingRecord(err)) throw err
  }

  // Same reference twice → already awarded. Never double-bump the stats.
  if (existing) {
    return {
      created: false,
      ledger: existing,
      stats: await upsertStats(pb, user, cycle, 0, null),
    }
  }

  let ledger: XpLedgerRecord
  try {
    ledger = await ledgerCollection.create<XpLedgerRecord>({
      user,
      amount,
      category,
      reference_id: referenceId,
      reference_type: referenceType,
      awarded_by: awardedBy ?? null,
      cycle,
    })
  } catch (err) {
    // Same reference written concurrently: the unique index rejects the
    // duplicate — treat it as the pre-existing row (idempotent, no double
    // award) rather than surfacing a 500.
    if (isIndexViolation(err)) {
      const existing = await ledgerCollection.getFirstListItem<XpLedgerRecord>(
        pb.filter('user = {:user} && reference_id = {:reference}', {
          user,
          reference: referenceId,
        }),
      )
      return {
        created: false,
        ledger: existing,
        stats: await upsertStats(pb, user, cycle, 0, null),
      }
    }
    throw err
  }

  const stats = await upsertStats(pb, user, cycle, amount, XP_STATS_BUMPS[category])

  return { created: true, ledger, stats }
}

// ─── Internals ──────────────────────────────────────────────────────────────

function assertValidAward(
  user: string,
  amount: number,
  category: XpCategory,
  referenceId: string,
  referenceType: XpReferenceType,
  cycle: string,
): void {
  if (!user || !referenceId || !cycle) throw new XpError('Missing record id')
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount === 0) {
    throw new XpError('Amount must be a non-zero number')
  }
  if (!XP_CATEGORIES.includes(category)) throw new XpError('Unknown XP category')
  if (!XP_REFERENCE_TYPES.includes(referenceType)) {
    throw new XpError('Unknown XP reference type')
  }
}

/** Fetch or create the (user, cycle) stats row, then apply the delta. */
async function upsertStats(
  pb: Awaited<ReturnType<typeof getAdminClient>>,
  userId: string,
  cycleId: string,
  amountDelta: number,
  bump: Partial<Record<StatsCounterField, number>> | null,
): Promise<UserStatsRecord> {
  const statsCollection = pb.collection('user_stats')

  let existing: UserStatsRecord | null = null
  try {
    existing = await statsCollection.getFirstListItem<UserStatsRecord>(
      pb.filter('user = {:user} && cycle = {:cycle}', {
        user: userId,
        cycle: cycleId,
      }),
    )
  } catch (err) {
    if (!isMissingRecord(err)) throw err
  }

  const stats =
    existing ??
    (await createStats(pb, userId, cycleId).catch((err) => {
      // Two awards for the same first cycle raced: the unique index rejects
      // our create because another writer already made the row — re-fetch it
      // and apply the delta to theirs instead of erroring.
      if (!isIndexViolation(err)) throw err
      return statsCollection.getFirstListItem<UserStatsRecord>(
        pb.filter('user = {:user} && cycle = {:cycle}', {
          user: userId,
          cycle: cycleId,
        }),
      )
    }))

  // XP totals never go below zero; a negative manual correction bottoms out.
  const xpTotal = Math.max(0, (stats.xp_total ?? 0) + amountDelta)

  const counterUpdates: Record<string, number> = {}
  if (bump) {
    for (const [field, step] of Object.entries(bump)) {
      counterUpdates[field] = (stats[field as StatsCounterField] ?? 0) + step
    }
  }

  return statsCollection.update<UserStatsRecord>(stats.id, {
    xp_total: xpTotal,
    tier: tierForXp(xpTotal),
    ...counterUpdates,
    last_computed_at: new Date().toISOString(),
  })
}

/** Create a fresh (user, cycle) stats row with zeroed counters. */
async function createStats(
  pb: Awaited<ReturnType<typeof getAdminClient>>,
  userId: string,
  cycleId: string,
): Promise<UserStatsRecord> {
  return pb.collection('user_stats').create<UserStatsRecord>({
    user: userId,
    cycle: cycleId,
    xp_total: 0,
    tier: 'Initiate',
    evaluations_completed: 0,
    evaluations_late: 0,
    events_organized: 0,
    events_attended: 0,
    knowledge_sessions: 0,
    cross_node_contributions: 0,
    endorsements_received: 0,
    votes_received_positive: 0,
    last_computed_at: new Date().toISOString(),
  })
}
