import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ClientResponseError } from 'pocketbase'
import type PocketBase from 'pocketbase'
import { awardXp, XpError, XP_STATS_BUMPS } from './xp'
import { TIER_THRESHOLDS, TIERS, XP_CATEGORIES } from './constants'
import type { XpCategory, XpReferenceType } from '@/types/pocketbase'

// ─── Fake PocketBase ────────────────────────────────────────────────────────

type Row = Record<string, unknown> & { id: string }

interface FakeCollection {
  rows: Row[]
  getFirstListItem: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
}

interface FakePb {
  collections: Record<string, FakeCollection>
  filter(str: string, params: Record<string, unknown>): string
  collection(name: string): FakeCollection
}

function missingRecordError(): Error {
  // Mirror the real SDK: getFirstListItem throws a 404 ClientResponseError
  // when nothing matches.
  return new ClientResponseError({ status: 404 })
}

function fakeClient(): FakePb {
  const collections: Record<string, FakeCollection> = {
    xp_ledger: { rows: [], getFirstListItem: vi.fn(), create: vi.fn(), update: vi.fn() },
    user_stats: { rows: [], getFirstListItem: vi.fn(), create: vi.fn(), update: vi.fn() },
  }

  for (const collection of Object.values(collections)) {
    // Parse `field = "value"` clauses out of the filter string, mirroring the
    // real SDK: filter() bakes parameter values into a self-contained string,
    // so getFirstListItem receives a single argument.
    collection.getFirstListItem.mockImplementation(async (filter: string) => {
      const clauses = [...filter.matchAll(/([a-z_]+) = ("(?:[^"\\]|\\.)*")/g)]
      const found = collection.rows.find((row) =>
        clauses.every(([, field, raw]) => row[field!] === JSON.parse(raw!)),
      )
      if (!found) throw missingRecordError()
      return found
    })
    collection.create.mockImplementation(async (data: Record<string, unknown>) => {
      const row: Row = { id: `id-${collection.rows.length + 1}`, ...data }
      collection.rows.push(row)
      return row
    })
    collection.update.mockImplementation(
      async (id: string, data: Record<string, unknown>) => {
        const row = collection.rows.find((r) => r.id === id)
        if (!row) throw new Error('not found')
        Object.assign(row, data)
        return row
      },
    )
  }

  return {
    collections,
    filter: (str: string, params: Record<string, unknown>) =>
      str.replace(/\{:([a-zA-Z0-9_]+)\}/g, (_match, name: string) =>
        JSON.stringify(params[name]),
      ),
    collection: (name: string) => collections[name]!,
  }
}

const USER = 'user-1'
const CYCLE = 'cycle-1'
const SUPER = 'super-1'

let pb: FakePb

vi.mock('@/lib/pocketbase-server', () => ({
  getAdminClient: vi.fn(),
}))

import { getAdminClient } from '@/lib/pocketbase-server'

beforeEach(() => {
  pb = fakeClient()
  vi.mocked(getAdminClient).mockResolvedValue(pb as unknown as PocketBase)
})

describe('XP_STATS_BUMPS', () => {
  it('maps every XP category to a counter bump set', () => {
    for (const category of XP_CATEGORIES) {
      expect(XP_STATS_BUMPS).toHaveProperty(category)
    }
  })

  it('bumps the completion counters for late evaluations', () => {
    expect(XP_STATS_BUMPS.evaluation_late).toEqual({
      evaluations_completed: 1,
      evaluations_late: 1,
    })
  })

  it('only touches fields that exist on user_stats', () => {
    const known = new Set([
      'evaluations_completed',
      'evaluations_late',
      'events_organized',
      'events_attended',
      'knowledge_sessions',
      'cross_node_contributions',
      'endorsements_received',
      'votes_received_positive',
    ])
    for (const bump of Object.values(XP_STATS_BUMPS)) {
      for (const field of Object.keys(bump)) {
        expect(known.has(field)).toBe(true)
      }
    }
  })

  it('has no counter for hackathon and manual adjustments', () => {
    expect(XP_STATS_BUMPS.hackathon).toEqual({})
    expect(XP_STATS_BUMPS.manual_adjustment).toEqual({})
  })
})

describe('awardXp', () => {
  it('creates a ledger entry with the frozen field shape', async () => {
    const { created, ledger } = await awardXp(
      USER,
      25,
      'evaluation_on_time',
      'ref-1',
      'evaluation',
      CYCLE,
      SUPER,
    )

    expect(created).toBe(true)
    expect(ledger).toMatchObject({
      user: USER,
      amount: 25,
      category: 'evaluation_on_time',
      reference_id: 'ref-1',
      reference_type: 'evaluation',
      awarded_by: SUPER,
      cycle: CYCLE,
    })
  })

  it('stores a null awarder when none is given', async () => {
    const { ledger } = await awardXp(
      USER,
      25,
      'evaluation_on_time',
      'ref-1',
      'evaluation',
      CYCLE,
    )
    expect(ledger.awarded_by).toBeNull()
  })

  it('creates a stats row when the member has none', async () => {
    const { stats } = await awardXp(USER, 60, 'event_organized', 'ref-1', 'event', CYCLE)
    expect(stats).toMatchObject({
      user: USER,
      cycle: CYCLE,
      xp_total: 60,
      tier: 'Contributor',
    })
    expect(stats.events_organized).toBe(1)
  })

  it('increments an existing stats row and recomputes the tier', async () => {
    const stats = pb.collections.user_stats!
    stats.rows.push({
      id: 'stats-1',
      user: USER,
      cycle: CYCLE,
      xp_total: 115,
      tier: 'Contributor',
      evaluations_completed: 3,
      evaluations_late: 0,
      events_organized: 0,
      events_attended: 0,
      knowledge_sessions: 0,
      cross_node_contributions: 0,
      endorsements_received: 0,
      votes_received_positive: 0,
    })

    const { stats: updated } = await awardXp(
      USER,
      25,
      'evaluation_on_time',
      'ref-2',
      'evaluation',
      CYCLE,
    )
    expect(updated.xp_total).toBe(140)
    expect(updated.tier).toBe('Architect')
    expect(updated.evaluations_completed).toBe(4)
  })

  it('bumps both counters for a late evaluation', async () => {
    const { stats } = await awardXp(
      USER,
      10,
      'evaluation_late',
      'ref-1',
      'evaluation',
      CYCLE,
    )
    expect(stats.evaluations_completed).toBe(1)
    expect(stats.evaluations_late).toBe(1)
  })

  it('is idempotent for the same reference: no double award, no double bump', async () => {
    const first = await awardXp(
      USER,
      25,
      'evaluation_on_time',
      'ref-1',
      'evaluation',
      CYCLE,
    )
    const second = await awardXp(
      USER,
      25,
      'evaluation_on_time',
      'ref-1',
      'evaluation',
      CYCLE,
    )

    expect(first.created).toBe(true)
    expect(second.created).toBe(false)
    expect(pb.collections.xp_ledger!.rows).toHaveLength(1)
    expect(second.ledger.id).toBe(first.ledger.id)
    expect(second.stats.xp_total).toBe(25)
    expect(pb.collections.user_stats!.rows[0]!.xp_total).toBe(25)
  })

  it('clamps the stats total at zero for a negative correction', async () => {
    await awardXp(USER, 10, 'evaluation_on_time', 'ref-1', 'evaluation', CYCLE)
    const { stats } = await awardXp(
      USER,
      -30,
      'manual_adjustment',
      'ref-2',
      'manual',
      CYCLE,
    )
    expect(stats.xp_total).toBe(0)
    expect(stats.tier).toBe('Initiate')
  })

  it('reaches every non-zero tier boundary through repeated awards', async () => {
    // Initiate (0) is the default for a new stats row, never an award amount.
    let total = 0
    for (const tier of TIERS.slice(1)) {
      const xp = TIER_THRESHOLDS[tier]
      total += xp
      const result = await awardXp(
        USER,
        xp,
        'manual_adjustment',
        `ref-${tier}`,
        'manual',
        CYCLE,
      )
      expect(result.stats.tier).toBe(tier)
      expect(result.stats.xp_total).toBe(total)
    }
  })

  describe('failure propagation', () => {
    it('propagates a ledger outage instead of treating it as "never awarded"', async () => {
      pb.collections.xp_ledger!.getFirstListItem.mockRejectedValueOnce(
        new ClientResponseError({ status: 500 }),
      )

      await expect(
        awardXp(USER, 25, 'evaluation_on_time', 'ref-1', 'evaluation', CYCLE),
      ).rejects.toBeInstanceOf(ClientResponseError)
      expect(pb.collections.xp_ledger!.rows).toHaveLength(0)
      expect(pb.collections.user_stats!.rows).toHaveLength(0)
    })

    it('propagates a stats outage after the ledger row is written', async () => {
      pb.collections.user_stats!.getFirstListItem.mockRejectedValueOnce(
        new ClientResponseError({ status: 500 }),
      )

      await expect(
        awardXp(USER, 25, 'evaluation_on_time', 'ref-1', 'evaluation', CYCLE),
      ).rejects.toBeInstanceOf(ClientResponseError)
      // The ledger row is the source of truth; the stats sync failed, so the
      // award is recoverable via ADMIN recompute — never silently "done".
      expect(pb.collections.xp_ledger!.rows).toHaveLength(1)
    })

    it('still treats a genuine 404 as "no row yet"', async () => {
      const { created } = await awardXp(
        USER,
        25,
        'evaluation_on_time',
        'ref-1',
        'evaluation',
        CYCLE,
      )
      expect(created).toBe(true)
    })
  })

  describe('validation', () => {
    it.each([
      [
        'empty user id',
        () => awardXp('', 25, 'evaluation_on_time', 'r', 'evaluation', CYCLE),
      ],
      [
        'empty reference id',
        () => awardXp(USER, 25, 'evaluation_on_time', '', 'evaluation', CYCLE),
      ],
      [
        'empty cycle id',
        () => awardXp(USER, 25, 'evaluation_on_time', 'r', 'evaluation', ''),
      ],
      [
        'zero amount',
        () => awardXp(USER, 0, 'evaluation_on_time', 'r', 'evaluation', CYCLE),
      ],
      [
        'NaN amount',
        () => awardXp(USER, Number.NaN, 'evaluation_on_time', 'r', 'evaluation', CYCLE),
      ],
      [
        'Infinity amount',
        () => awardXp(USER, Infinity, 'evaluation_on_time', 'r', 'evaluation', CYCLE),
      ],
      [
        'unknown category',
        () => awardXp(USER, 25, 'not_a_category' as XpCategory, 'r', 'evaluation', CYCLE),
      ],
      [
        'unknown reference type',
        () =>
          awardXp(
            USER,
            25,
            'evaluation_on_time',
            'r',
            'not_a_type' as XpReferenceType,
            CYCLE,
          ),
      ],
    ])('rejects %s before touching the database', async (_label, call) => {
      await expect(call()).rejects.toBeInstanceOf(XpError)
      expect(pb.collections.xp_ledger!.rows).toHaveLength(0)
      expect(pb.collections.user_stats!.rows).toHaveLength(0)
    })
  })
})
