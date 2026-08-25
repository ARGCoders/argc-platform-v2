import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ClientResponseError } from 'pocketbase'
import type PocketBase from 'pocketbase'
import { GET } from './route'
import { AUTH_COOKIE } from '@/lib/constants'
import type {
  AdvancementCycleRecord,
  UserRecord,
  UserStatsRecord,
} from '@/types/pocketbase'

/**
 * Route handler tests exercise the real lib/auth path: the cookie store is
 * stubbed at `next/headers`, PocketBase at `@/lib/pocketbase-server` — but
 * requireRole/authenticate/authErrorResponse all run for real, so an auth
 * regression here cannot pass unnoticed.
 */
vi.mock('next/headers', () => ({ cookies: vi.fn() }))
vi.mock('@/lib/pocketbase-server', () => ({
  getAdminClient: vi.fn(),
  getPocketBaseClient: vi.fn(),
}))

import { cookies } from 'next/headers'
import { getAdminClient, getPocketBaseClient } from '@/lib/pocketbase-server'

// ─── Fixtures ───────────────────────────────────────────────────────────────

const MEMBER_ID = 'u-member'
const OTHER_ID = 'u-other'

function makeUser(id: string, role: UserRecord['role']): UserRecord {
  return {
    id,
    email: `${id}@argc.dev`,
    emailVisibility: false,
    verified: true,
    intra_id: id,
    intra_login: id,
    display_name: id,
    avatar_url: '',
    role,
    last_sync_at: '',
    created: '',
    updated: '',
  }
}

const MEMBER = makeUser(MEMBER_ID, 'node_peer')
const LEADER = makeUser('u-leader', 'node_leader')
const GUEST = makeUser('u-guest', 'guest')

const CYCLE: AdvancementCycleRecord = {
  id: 'cycle-fall',
  label: 'Fall 2026',
  slug: 'fall-2026',
  starts_at: '2026-08-16T00:00:00.000Z',
  ends_at: '2026-12-19T00:00:00.000Z',
  status: 'active',
  created_by: 'u-super',
  created: '',
  updated: '',
}

const CLOSED_CYCLE: AdvancementCycleRecord = {
  ...CYCLE,
  id: 'cycle-spring',
  label: 'Spring 2026',
  slug: 'spring-2026',
  status: 'closed',
}

function makeStats(
  userId: string,
  xpTotal: number,
  tier: UserStatsRecord['tier'],
): UserStatsRecord {
  return {
    id: `stats-${userId}`,
    user: userId,
    cycle: CYCLE.id,
    xp_total: xpTotal,
    tier,
    evaluations_completed: 0,
    evaluations_late: 0,
    events_organized: 0,
    events_attended: 0,
    knowledge_sessions: 0,
    cross_node_contributions: 0,
    endorsements_received: 0,
    votes_received_positive: 0,
    last_computed_at: '2026-08-20T10:00:00.000Z',
  }
}

const MEMBER_STATS = makeStats(MEMBER_ID, 85, 'Contributor')
const OTHER_STATS = makeStats(OTHER_ID, 240, 'Architect')

// ─── Fake PocketBase ────────────────────────────────────────────────────────

type Identifiable = { id: string }

const lastFilters: Record<string, string> = {}

/**
 * Mirrors the real SDK: filter() bakes parameter values into a single
 * self-contained string, so getFirstListItem receives one argument whose
 * `field = "value"` clauses can be matched against fixture rows.
 */
function applyFilter<T extends Identifiable>(filter: string, rows: T[]): T | undefined {
  const clauses = [...filter.matchAll(/([a-z_]+) = ("(?:[^"\\]|\\.)*")/g)]
  return rows.find((row) =>
    clauses.every(
      ([, field, raw]) =>
        (row as unknown as Record<string, unknown>)[field!] === JSON.parse(raw!),
    ),
  )
}

interface AdminData {
  users?: UserRecord[]
  cycles?: AdvancementCycleRecord[]
  stats?: UserStatsRecord[]
}

function fakeAdmin({ users = [], cycles = [], stats = [] }: AdminData): PocketBase {
  return {
    filter: (str: string, params: Record<string, unknown>) =>
      str.replace(/\{:([a-zA-Z0-9_]+)\}/g, (_match, name: string) =>
        JSON.stringify(params[name]),
      ),
    collection: (name: string) => ({
      getOne: async (id: string) => {
        if (name !== 'users') throw new Error(`unexpected getOne on ${name}`)
        const row = users.find((r) => r.id === id)
        if (!row) throw new ClientResponseError({ status: 404 })
        return row
      },
      getFirstListItem: async (filter: string) => {
        lastFilters[name] = filter
        const rows: Identifiable[] =
          name === 'advancement_cycles' ? cycles : name === 'user_stats' ? stats : []
        const row = applyFilter(filter, rows)
        if (!row) throw new ClientResponseError({ status: 404 })
        return row
      },
    }),
  } as unknown as PocketBase
}

function fakeUserClient(
  record: Record<string, unknown> | null,
  refreshError?: Error,
): PocketBase {
  return {
    authStore: { save: vi.fn(), record, token: 'refreshed-token' },
    collection: () => ({
      authRefresh: vi.fn(async () => {
        if (refreshError) throw refreshError
      }),
    }),
  } as unknown as PocketBase
}

// ─── Session wiring ─────────────────────────────────────────────────────────

const cookieGet = vi.fn()

function setCookie(value?: string) {
  cookieGet.mockImplementation((name: string) =>
    name === AUTH_COOKIE && value ? { name, value } : undefined,
  )
}

function givenSession(user: UserRecord, options?: { refreshError?: Error }) {
  setCookie('valid-token')
  vi.mocked(getPocketBaseClient).mockReturnValue(
    fakeUserClient({ ...user }, options?.refreshError),
  )
  return user
}

function givenAdmin(data: AdminData) {
  vi.mocked(getAdminClient).mockResolvedValue(fakeAdmin(data))
}

async function callGet(): Promise<{ status: number; body: unknown }> {
  const res = await GET()
  return { status: res.status, body: await res.json() }
}

beforeEach(() => {
  cookieGet.mockReset()
  vi.mocked(cookies).mockResolvedValue({
    get: cookieGet,
  } as unknown as Awaited<ReturnType<typeof cookies>>)
})

// ─── Auth gate ──────────────────────────────────────────────────────────────

describe('auth gate', () => {
  it('answers 401 unauthorized without a session cookie', async () => {
    setCookie(undefined)

    const { status, body } = await callGet()

    expect(status).toBe(401)
    expect(body).toEqual({
      error: { code: 'unauthorized', message: 'Not authenticated' },
    })
    expect(getAdminClient).not.toHaveBeenCalled()
  })

  it('answers 401 when the session cannot be refreshed', async () => {
    givenSession(MEMBER, { refreshError: new Error('expired') })

    const { status, body } = await callGet()

    expect(status).toBe(401)
    expect(body).toMatchObject({ error: { code: 'unauthorized' } })
  })

  it('answers 403 forbidden for a guest', async () => {
    givenSession(GUEST)
    givenAdmin({ users: [GUEST] })

    const { status, body } = await callGet()

    expect(status).toBe(403)
    expect(body).toEqual({
      error: { code: 'forbidden', message: 'Insufficient permissions' },
    })
  })

  it('lets a node leader through (route is M+)', async () => {
    givenSession(LEADER)
    givenAdmin({
      users: [LEADER],
      cycles: [CYCLE],
      stats: [makeStats(LEADER.id, 10, 'Initiate')],
    })

    const { status } = await callGet()

    expect(status).toBe(200)
  })
})

// ─── Payloads ───────────────────────────────────────────────────────────────

describe('payload', () => {
  it('returns the active cycle, own stats and pre-computed tier progress', async () => {
    givenSession(MEMBER)
    givenAdmin({ users: [MEMBER], cycles: [CYCLE], stats: [MEMBER_STATS] })

    const { status, body } = await callGet()

    expect(status).toBe(200)
    expect(body).toEqual({
      data: {
        cycle: CYCLE,
        stats: MEMBER_STATS,
        progress: { current: 'Contributor', next: 'Architect', required: 140 },
      },
    })
  })

  it('normalizes a missing stats row to zeros instead of erroring', async () => {
    givenSession(MEMBER)
    givenAdmin({ users: [MEMBER], cycles: [CYCLE], stats: [] })

    const { status, body } = await callGet()

    expect(status).toBe(200)
    expect(body).toEqual({
      data: {
        cycle: CYCLE,
        stats: {
          id: '',
          user: MEMBER_ID,
          cycle: CYCLE.id,
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
        },
        progress: { current: 'Initiate', next: 'Contributor', required: 60 },
      },
    })
  })

  it('reports no active cycle as a valid empty state', async () => {
    givenSession(MEMBER)
    givenAdmin({ users: [MEMBER], cycles: [CLOSED_CYCLE], stats: [MEMBER_STATS] })

    const { status, body } = await callGet()

    expect(status).toBe(200)
    expect(body).toEqual({
      data: {
        cycle: null,
        stats: null,
        progress: { current: 'Initiate', next: 'Contributor', required: 60 },
      },
    })
  })
})

// ─── Ownership scoping ──────────────────────────────────────────────────────

describe('ownership scoping', () => {
  it('returns only the caller’s own stats row when others exist', async () => {
    givenSession(MEMBER)
    givenAdmin({ users: [MEMBER], cycles: [CYCLE], stats: [MEMBER_STATS, OTHER_STATS] })

    const { status, body } = await callGet()

    expect(status).toBe(200)
    const { stats } = (body as { data: { stats: UserStatsRecord } }).data
    expect(stats.user).toBe(MEMBER_ID)
    expect(stats.xp_total).toBe(85)
  })

  it('selects stats strictly by the authenticated caller id (the ACL)', async () => {
    givenSession(MEMBER)
    givenAdmin({ users: [MEMBER], cycles: [CYCLE], stats: [OTHER_STATS] })

    const { status, body } = await callGet()

    expect(status).toBe(200)
    expect(lastFilters['user_stats']).toContain(`"${MEMBER_ID}"`)
    expect(lastFilters['user_stats']).not.toContain(`"${OTHER_ID}"`)
    const { stats } = (body as { data: { stats: UserStatsRecord } }).data
    expect(stats.xp_total).toBe(0)
  })
})

// ─── Failure mapping ────────────────────────────────────────────────────────

describe('failure mapping', () => {
  it('maps a PocketBase outage to an opaque 500 internal envelope', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    givenSession(MEMBER)
    const admin = fakeAdmin({ users: [MEMBER], cycles: [CYCLE] })
    vi.mocked(getAdminClient).mockResolvedValue({
      ...admin,
      collection: (name: string) => {
        if (name === 'user_stats') {
          return {
            getFirstListItem: async () => {
              throw new ClientResponseError({ status: 500 })
            },
          }
        }
        return admin.collection(name)
      },
    } as PocketBase)

    const { status, body } = await callGet()

    expect(status).toBe(500)
    expect(body).toEqual({ error: { code: 'internal', message: 'Server error' } })
    expect(consoleSpy).toHaveBeenCalled()
  })
})
