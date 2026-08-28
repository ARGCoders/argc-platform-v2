import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ClientResponseError } from 'pocketbase'
import type PocketBase from 'pocketbase'
import { GET } from './route'
import { AUTH_COOKIE } from '@/lib/constants'
import type {
  AdvancementCycleRecord,
  EvaluationRecord,
  NodeMemberRecord,
  NodeRecord,
  UserRecord,
  UserStatsRecord,
} from '@/types/pocketbase'

vi.mock('next/headers', () => ({ cookies: vi.fn() }))
vi.mock('@/lib/pocketbase-server', () => ({
  getAdminClient: vi.fn(),
  getPocketBaseClient: vi.fn(),
}))

import { cookies } from 'next/headers'
import { getAdminClient, getPocketBaseClient } from '@/lib/pocketbase-server'

// ─── Fixtures ───────────────────────────────────────────────────────────────

function makeUser(id: string, role: UserRecord['role'], name: string): UserRecord {
  return {
    id,
    email: `${id}@argc.dev`,
    emailVisibility: false,
    verified: true,
    intra_id: id,
    intra_login: id,
    display_name: name,
    avatar_url: `https://cdn.example.com/${id}.jpg`,
    role,
    last_sync_at: '',
    created: '',
    updated: '',
  }
}

const GUEST = makeUser('u-guest', 'guest', 'Guest User')
const MEMBER_USER_A1 = makeUser('u-mem-a1', 'node_peer', 'Yousef Khalil')
const LEADER_USER_A = makeUser('u-lead-alpha', 'node_leader', 'Leila Haddad')

// ─── Fake PocketBase ────────────────────────────────────────────────────────

type Identifiable = { id: string }

function applyFilter<T extends Identifiable>(filter: string, rows: T[]): T[] {
  const clauses = [...filter.matchAll(/([a-z_]+) = ("(?:[^"\\]|\\.)*")/g)]
  return rows.filter((row) =>
    clauses.every(
      ([, field, raw]) =>
        (row as unknown as Record<string, unknown>)[field!] === JSON.parse(raw!),
    ),
  )
}

interface AdminData {
  users?: UserRecord[]
  nodes?: NodeRecord[]
  nodeMembers?: NodeMemberRecord[]
  cycles?: AdvancementCycleRecord[]
  stats?: UserStatsRecord[]
  evals?: EvaluationRecord[]
}

function fakeAdmin({
  users = [],
  nodes = [],
  nodeMembers = [],
  cycles = [],
  stats = [],
  evals = [],
}: AdminData = {}): PocketBase {
  return {
    filter: (str: string, params: Record<string, unknown>) =>
      str.replace(/\{:([a-zA-Z0-9_]+)\}/g, (_match: string, name: string) =>
        JSON.stringify(params[name]),
      ),
    collection: (name: string) => ({
      getOne: async (id: string) => {
        const rows: Identifiable[] =
          name === 'users' ? users : name === 'node' ? nodes : []
        const row = rows.find((r) => r.id === id)
        if (!row) throw new ClientResponseError({ status: 404 })
        return row
      },
      getFirstListItem: async (filter: string) => {
        const rows: Identifiable[] =
          name === 'node_member'
            ? nodeMembers
            : name === 'advancement_cycles'
              ? cycles
              : name === 'user_stats'
                ? stats
                : []
        const filtered = applyFilter(filter, rows)
        const row = filtered[0]
        if (!row) throw new ClientResponseError({ status: 404 })
        return row
      },
      getFullList: async (opts?: { filter?: string; expand?: string }) => {
        let rows: Identifiable[] =
          name === 'node_member'
            ? nodeMembers
            : name === 'evaluations'
              ? evals
              : name === 'user_stats'
                ? stats
                : []
        if (opts?.filter) rows = applyFilter(opts.filter, rows)
        return rows
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

const NODE_ALPHA: NodeRecord = {
  id: 'node-alpha',
  name: 'Node Alpha',
  slug: 'alpha',
  cohort: 'c25',
  status: 'active',
  created: '',
  updated: '',
}

const OTHER_NODE_ID = 'node-beta'
const MEMBER_A2 = 'u-mem-a2'
const MEMBER_USER_A2 = makeUser(MEMBER_A2, 'node_peer', 'Sara Mansour')

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

function makeEval(
  id: string,
  evaluatee: string,
  stage: EvaluationRecord['stage'],
  status: EvaluationRecord['status'],
  score?: number,
): EvaluationRecord {
  return {
    id,
    evaluatee,
    cycle: CYCLE.id,
    stage,
    status,
    score,
    xp_awarded: false,
    created: '',
    updated: '',
  }
}

function makeMembership(
  id: string,
  userId: string,
  nodeId: string,
  role: 'member' | 'leader',
  user: UserRecord,
  opts?: { left_at?: string },
): NodeMemberRecord {
  return {
    id,
    role,
    user: userId,
    node: nodeId,
    joined_at: '2026-08-01T00:00:00.000Z',
    left_at: opts?.left_at ?? '',
    expand: { user, node: undefined },
  }
}

function nodeAlphaMemberData() {
  const m1 = makeMembership(
    'nm-lead',
    LEADER_USER_A.id,
    NODE_ALPHA.id,
    'leader',
    LEADER_USER_A,
  )
  const m2 = makeMembership(
    'nm-a1',
    MEMBER_USER_A1.id,
    NODE_ALPHA.id,
    'member',
    MEMBER_USER_A1,
  )
  const m3 = makeMembership('nm-a2', MEMBER_A2, NODE_ALPHA.id, 'member', MEMBER_USER_A2)
  return { m1, m2, m3 }
}

// ─── Auth gate ──────────────────────────────────────────────────────────────

describe('auth gate', () => {
  it('answers 401 unauthorized without a session cookie', async () => {
    setCookie(undefined)

    const { status, body } = await callGet()

    expect(status).toBe(401)
    expect(body).toEqual({
      error: { code: 'unauthorized', message: 'Not authenticated' },
    })
  })

  it('answers 401 when the session cannot be refreshed', async () => {
    givenSession(MEMBER_USER_A1, { refreshError: new Error('expired') })

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
    const leaderMembership: NodeMemberRecord = {
      id: 'nm-lead',
      role: 'leader',
      user: LEADER_USER_A.id,
      node: 'node-alpha',
      joined_at: '2026-08-01T00:00:00.000Z',
      left_at: '',
      expand: { user: LEADER_USER_A, node: undefined },
    }
    givenSession(LEADER_USER_A)
    givenAdmin({
      users: [LEADER_USER_A],
      nodes: [NODE_ALPHA],
      nodeMembers: [leaderMembership],
    })

    const { status } = await callGet()

    expect(status).toBe(200)
  })
})

// ─── No-node 404 ───────────────────────────────────────────────────────────

describe('no-node 404', () => {
  it('returns 404 when the caller has no active node membership', async () => {
    givenSession(MEMBER_USER_A1)
    givenAdmin({ users: [MEMBER_USER_A1], nodeMembers: [] })

    const { status, body } = await callGet()

    expect(status).toBe(404)
    expect(body).toEqual({
      error: { code: 'not_found', message: 'Not in a node' },
    })
  })

  it('returns 404 when all memberships have left_at set', async () => {
    const leftMembership: NodeMemberRecord = {
      id: 'nm-left',
      role: 'member',
      user: MEMBER_USER_A1.id,
      node: 'node-alpha',
      joined_at: '2026-01-01T00:00:00.000Z',
      left_at: '2026-06-01T00:00:00.000Z',
      expand: { user: MEMBER_USER_A1 },
    }
    givenSession(MEMBER_USER_A1)
    givenAdmin({ users: [MEMBER_USER_A1], nodeMembers: [leftMembership] })

    const { status, body } = await callGet()

    expect(status).toBe(404)
    expect(body).toEqual({
      error: { code: 'not_found', message: 'Not in a node' },
    })
  })
})

// ─── Member view ────────────────────────────────────────────────────────────

describe('member view', () => {
  it("returns the caller's node and fellow members with projected user fields", async () => {
    const { m1, m2, m3 } = nodeAlphaMemberData()
    givenSession(MEMBER_USER_A1)
    givenAdmin({
      users: [MEMBER_USER_A1, MEMBER_USER_A2, LEADER_USER_A],
      nodes: [NODE_ALPHA],
      nodeMembers: [m1, m2, m3],
      cycles: [CYCLE],
      stats: [
        makeStats(LEADER_USER_A.id, 100, 'Architect'),
        makeStats(MEMBER_USER_A1.id, 85, 'Contributor'),
        makeStats(MEMBER_A2, 40, 'Initiate'),
      ],
      evals: [
        makeEval('e1', MEMBER_USER_A1.id, 'standard_1', 'completed', 75),
        makeEval('e2', MEMBER_USER_A1.id, 'standard_2', 'scheduled'),
        makeEval('e3', MEMBER_USER_A1.id, 'eval_plus_node_leader', 'pending'),
      ],
    })

    const { status, body } = await callGet()

    expect(status).toBe(200)
    const data = (
      body as {
        data: { node: Record<string, unknown>; members: Array<Record<string, unknown>> }
      }
    ).data

    expect(data.node).toEqual({
      id: NODE_ALPHA.id,
      name: 'Node Alpha',
      slug: 'alpha',
      cohort: 'c25',
      status: 'active',
    })

    expect(data.members).toHaveLength(3)

    const memberA1 = data.members.find(
      (m) => (m.user as Record<string, unknown> | null)?.id === MEMBER_USER_A1.id,
    )
    expect(memberA1).toBeDefined()
    expect(memberA1!.user).toEqual({
      id: MEMBER_USER_A1.id,
      display_name: 'Yousef Khalil',
      avatar_url: 'https://cdn.example.com/u-mem-a1.jpg',
    })
    expect(memberA1!.tier).toBe('Contributor')
    expect(memberA1!.xp_total).toBe(85)
    expect(memberA1!.evals).toHaveLength(3)
    const evals = memberA1!.evals as Array<{
      stage: string
      status: string
      score: number | undefined
    }>
    expect(evals[0]).toEqual({
      stage: 'standard_1',
      status: 'completed',
      score: 75,
    })
    expect(evals[1]).toEqual({
      stage: 'standard_2',
      status: 'scheduled',
      score: undefined,
    })
  })
})

// ─── Leader view ────────────────────────────────────────────────────────────

describe('leader view', () => {
  it('returns the same node data for a leader (leaders hold a leader membership)', async () => {
    const { m1, m2, m3 } = nodeAlphaMemberData()
    givenSession(LEADER_USER_A)
    givenAdmin({
      users: [LEADER_USER_A, MEMBER_USER_A1, MEMBER_USER_A2],
      nodes: [NODE_ALPHA],
      nodeMembers: [m1, m2, m3],
    })

    const { status, body } = await callGet()

    expect(status).toBe(200)
    const data = (
      body as {
        data: {
          node: { id: string }
          members: Array<{ role: string; user: { id: string } | null }>
        }
      }
    ).data

    expect(data.node.id).toBe(NODE_ALPHA.id)
    expect(data.members).toHaveLength(3)

    const leader = data.members.find((m) => m.user?.id === LEADER_USER_A.id)
    expect(leader).toBeDefined()
    expect(leader!.role).toBe('leader')
  })
})

// ─── User field projection ──────────────────────────────────────────────────

describe('user field projection', () => {
  it('returns only id, display_name, and avatar_url — no extra user fields leak', async () => {
    const { m1, m2, m3 } = nodeAlphaMemberData()
    givenSession(MEMBER_USER_A1)
    givenAdmin({
      users: [MEMBER_USER_A1, MEMBER_USER_A2, LEADER_USER_A],
      nodes: [NODE_ALPHA],
      nodeMembers: [m1, m2, m3],
    })

    const { status, body } = await callGet()

    expect(status).toBe(200)
    const members = (
      body as { data: { members: Array<{ user: Record<string, unknown> | null }> } }
    ).data.members

    for (const m of members) {
      if (m.user) {
        const keys = Object.keys(m.user)
        expect(keys).toEqual(['id', 'display_name', 'avatar_url'])
      }
    }
  })
})

// ─── Ownership scoping ──────────────────────────────────────────────────────

describe('ownership scoping', () => {
  it('does not return members from a different node', async () => {
    const betaMembership = makeMembership(
      'nm-b1',
      'u-mem-b1',
      OTHER_NODE_ID,
      'member',
      makeUser('u-mem-b1', 'node_peer', 'Adam Rahmeh'),
    )

    givenSession(MEMBER_USER_A1)
    givenAdmin({
      users: [MEMBER_USER_A1],
      nodes: [NODE_ALPHA],
      nodeMembers: [
        makeMembership(
          'nm-a1',
          MEMBER_USER_A1.id,
          NODE_ALPHA.id,
          'member',
          MEMBER_USER_A1,
        ),
        betaMembership,
      ],
    })

    const { status, body } = await callGet()

    expect(status).toBe(200)
    const members = (
      body as { data: { members: Array<{ user: { id: string } | null }> } }
    ).data.members
    expect(members.every((m) => m.user?.id !== 'u-mem-b1')).toBe(true)
  })

  it('ignores stats and evals that belong to members outside this node', async () => {
    const { m1, m2, m3 } = nodeAlphaMemberData()
    givenSession(MEMBER_USER_A1)
    givenAdmin({
      users: [MEMBER_USER_A1, MEMBER_USER_A2, LEADER_USER_A],
      nodes: [NODE_ALPHA],
      nodeMembers: [m1, m2, m3],
      cycles: [CYCLE],
      stats: [
        makeStats(LEADER_USER_A.id, 100, 'Architect'),
        makeStats('u-outsider', 999, 'Vanguard'), // not a node member
      ],
      evals: [
        makeEval('e1', MEMBER_USER_A1.id, 'standard_1', 'completed', 75),
        makeEval('e-x', 'u-outsider', 'standard_1', 'completed', 99), // not a node member
      ],
    })

    const { status, body } = await callGet()

    expect(status).toBe(200)
    const members = (
      body as {
        data: {
          members: Array<{ xp_total: number; evals: Array<{ stage: string }> }>
        }
      }
    ).data.members
    const totalEvals = members.reduce((count, m) => count + m.evals.length, 0)
    expect(members.every((m) => m.xp_total !== 999)).toBe(true)
    expect(totalEvals).toBe(1)
  })
})

// ─── Zeroed stats for members without a stats row ──────────────────────────

describe('zeroed stats', () => {
  it('defaults to tier Initiate and xp_total 0 when a member has no stats row', async () => {
    const { m1, m2 } = nodeAlphaMemberData()
    givenSession(MEMBER_USER_A1)
    givenAdmin({
      users: [MEMBER_USER_A1, LEADER_USER_A],
      nodes: [NODE_ALPHA],
      nodeMembers: [m1, m2],
      cycles: [CYCLE],
      stats: [],
    })

    const { status, body } = await callGet()

    expect(status).toBe(200)
    const members = (
      body as { data: { members: Array<{ tier: string; xp_total: number }> } }
    ).data.members

    for (const m of members) {
      expect(m.tier).toBe('Initiate')
      expect(m.xp_total).toBe(0)
    }
  })
})

// ─── No active cycle ────────────────────────────────────────────────────────

describe('no active cycle', () => {
  it('returns node and members with empty evals when no cycle is active', async () => {
    const { m1, m2 } = nodeAlphaMemberData()
    givenSession(MEMBER_USER_A1)
    givenAdmin({
      users: [MEMBER_USER_A1, LEADER_USER_A],
      nodes: [NODE_ALPHA],
      nodeMembers: [m1, m2],
      cycles: [],
    })

    const { status, body } = await callGet()

    expect(status).toBe(200)
    const members = (
      body as { data: { members: Array<{ evals: unknown[]; tier: string }> } }
    ).data.members

    for (const m of members) {
      expect(m.evals).toEqual([])
      expect(m.tier).toBe('Initiate')
    }
  })
})

// ─── Failure mapping ────────────────────────────────────────────────────────

describe('failure mapping', () => {
  it('maps a PocketBase outage to an opaque 500 internal envelope', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    givenSession(MEMBER_USER_A1)

    const brokenAdmin = {
      filter: (str: string, params: Record<string, unknown>) =>
        str.replace(/\{:([a-zA-Z0-9_]+)\}/g, (_m: string, _name: string) =>
          JSON.stringify(params[_name]),
        ),
      collection: () => ({
        getOne: async () => {
          throw new ClientResponseError({ status: 500 })
        },
        getFirstListItem: async () => {
          throw new ClientResponseError({ status: 500 })
        },
        getFullList: async () => {
          throw new ClientResponseError({ status: 500 })
        },
      }),
    } as unknown as PocketBase

    vi.mocked(getAdminClient).mockResolvedValue(brokenAdmin)

    const { status, body } = await callGet()

    expect(status).toBe(500)
    expect(body).toEqual({ error: { code: 'internal', message: 'Server error' } })
    expect(consoleSpy).toHaveBeenCalled()
  })
})
