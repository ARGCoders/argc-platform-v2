import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ClientResponseError } from 'pocketbase'
import type PocketBase from 'pocketbase'
import { GET } from './route'
import { AUTH_COOKIE } from '@/lib/constants'
import type {
  AdvancementCycleRecord,
  NodeMemberRecord,
  UserRecord,
  UserStatsRecord,
  VoteRecord,
} from '@/types/pocketbase'

vi.mock('next/headers', () => ({ cookies: vi.fn() }))
vi.mock('@/lib/pocketbase-server', () => ({
  getAdminClient: vi.fn(),
  getPocketBaseClient: vi.fn(),
}))

import { cookies } from 'next/headers'
import { getAdminClient, getPocketBaseClient } from '@/lib/pocketbase-server'

// ─── Fixtures ───────────────────────────────────────────────────────────────

const MEMBER_ID = 'u-member'
const SAME_NODE_ID = 'u-same-node'
const OTHER_ACTIVE = 'u-other-active' // eligible
const OTHER_NO_STATS = 'u-other-no-stats' // in another node, unreachable
const ALREADY_VOTED = 'u-already-voted' // eligible except the caller voted them
const SELF_ID = MEMBER_ID

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

function makeUser(id: string, role: UserRecord['role'] = 'node_peer'): UserRecord {
  return {
    id,
    email: `${id}@argc.dev`,
    emailVisibility: false,
    verified: true,
    intra_id: id,
    intra_login: id,
    display_name: id,
    avatar_url: `av-${id}`,
    role,
    last_sync_at: '',
    created: '',
    updated: '',
  }
}

const MEMBER = makeUser(MEMBER_ID)
const GUEST = makeUser('u-guest', 'guest')

function makeMembership(
  id: string,
  user: string,
  node: string,
  role: 'member' | 'leader' = 'member',
): NodeMemberRecord {
  return {
    id,
    role,
    user,
    node,
    joined_at: '2026-08-16T00:00:00.000Z',
    left_at: '',
  }
}

function makeStats(user: string): UserStatsRecord {
  return {
    id: `stats-${user}`,
    user,
    cycle: CYCLE.id,
    xp_total: 100,
    tier: 'Contributor',
    evaluations_completed: 0,
    evaluations_late: 0,
    events_organized: 0,
    events_attended: 0,
    knowledge_sessions: 0,
    cross_node_contributions: 0,
    endorsements_received: 0,
    votes_received_positive: 0,
  }
}

function makeVote(
  id: string,
  voter: string,
  subject: string,
  polarity: 'positive' | 'negative',
): VoteRecord {
  return {
    id,
    voter,
    subject,
    cycle: CYCLE.id,
    polarity,
    reason: 'solid work all cycle',
    is_cross_node: true,
    created: '2026-08-20T10:00:00.000Z',
  }
}

// ─── Fake PocketBase ────────────────────────────────────────────────────────

type Identifiable = { id: string }

function evaluateClauses<T extends Identifiable>(filter: string, rows: T[]): T[] {
  const clauses = [...filter.matchAll(/([a-zA-Z_]+) (!=|=) ("(?:[^"\\]|\\.)*")/g)]
  return rows.filter((row) =>
    clauses.every(([, field, op, raw]) => {
      const value = (row as unknown as Record<string, unknown>)[field!]
      const target = JSON.parse(raw!)
      return op === '!=' ? value !== target : value === target
    }),
  )
}

interface AdminData {
  users?: UserRecord[]
  cycles?: AdvancementCycleRecord[]
  memberships?: NodeMemberRecord[]
  stats?: UserStatsRecord[]
  votes?: VoteRecord[]
}

function fakeAdmin({
  users = [],
  cycles = [],
  memberships = [],
  stats = [],
  votes = [],
}: AdminData): PocketBase {
  return {
    filter: (str: string, params: Record<string, unknown>) =>
      str.replace(/\{:([a-zA-Z0-9_]+)\}/g, (_match, name: string) =>
        JSON.stringify(params[name]),
      ),
    collection: (name: string) => ({
      getOne: async (id: string) => {
        if (name !== 'users') throw new Error(`unexpected getOne on ${name}`)
        const row = users.find((u) => u.id === id)
        if (!row) throw new ClientResponseError({ status: 404 })
        return row
      },
      getFirstListItem: async (filter: string) => {
        const rows: Identifiable[] =
          name === 'advancement_cycles'
            ? cycles
            : name === 'node_member'
              ? memberships
              : []
        const row = evaluateClauses(filter, rows).at(0)
        if (!row) throw new ClientResponseError({ status: 404 })
        return row
      },
      getFullList: async (opts?: { filter?: string; expand?: string }) => {
        const rows: Identifiable[] =
          name === 'node_member'
            ? memberships
            : name === 'user_stats'
              ? stats
              : name === 'votes'
                ? votes
                : []
        let filtered = opts?.filter ? evaluateClauses(opts.filter, rows) : rows
        if (name === 'node_member' && opts?.expand) {
          filtered = filtered.map((m) => {
            const mem = m as NodeMemberRecord
            return {
              ...mem,
              expand: {
                user: users.find((u) => u.id === mem.user),
                node: {
                  id: mem.node,
                  name: mem.node,
                  slug: mem.node,
                  cohort: 'c25',
                  status: 'active',
                  created: '',
                  updated: '',
                },
              },
            }
          })
        }
        return filtered
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

function defaultData() {
  return {
    users: [
      MEMBER,
      makeUser(SAME_NODE_ID),
      makeUser(OTHER_ACTIVE),
      makeUser(OTHER_NO_STATS),
      makeUser(ALREADY_VOTED),
    ],
    cycles: [CYCLE],
    memberships: [
      makeMembership('nm-member', MEMBER_ID, 'n-alpha'),
      makeMembership('nm-same', SAME_NODE_ID, 'n-alpha'),
      makeMembership('nm-active', OTHER_ACTIVE, 'n-beta'),
      makeMembership('nm-no-stats', OTHER_NO_STATS, 'n-beta'),
      makeMembership('nm-voted', ALREADY_VOTED, 'n-beta'),
    ],
    stats: [
      makeStats(MEMBER_ID),
      makeStats(SAME_NODE_ID),
      makeStats(OTHER_ACTIVE),
      makeStats(ALREADY_VOTED),
    ],
    votes: [makeVote('v1', MEMBER_ID, ALREADY_VOTED, 'positive')],
  }
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
})

// ─── Eligibility filtering ──────────────────────────────────────────────────

describe('eligibility filtering', () => {
  it('returns only active members from other nodes', async () => {
    givenSession(MEMBER)
    givenAdmin(defaultData())

    const { status, body } = await callGet()

    expect(status).toBe(200)
    const data = (body as { data: unknown[] }).data
    const ids = data.map((m) => (m as { id: string }).id)
    expect(ids).toEqual([OTHER_ACTIVE]) // one candidate after exclusions
  })

  it('excludes members of the caller’s own node', async () => {
    givenSession(MEMBER)
    const data = defaultData()
    // Only the node filter is under test here: both other-node members get
    // stats rows and nothing has been voted yet, so the only exclusion is
    // SAME_NODE_ID.
    data.stats = [makeStats(OTHER_ACTIVE), makeStats(OTHER_NO_STATS)]
    data.votes = []
    givenAdmin(data)

    const { status, body } = await callGet()

    expect(status).toBe(200)
    const ids = (body as { data: { id: string }[] }).data.map((m) => m.id)
    expect(ids).not.toContain(SAME_NODE_ID)
    expect(ids).toContain(OTHER_ACTIVE)
    expect(ids).toContain(OTHER_NO_STATS)
  })

  it('excludes members the caller already voted for this cycle', async () => {
    givenSession(MEMBER)
    givenAdmin(defaultData())

    const { status, body } = await callGet()

    expect(status).toBe(200)
    const ids = (body as { data: { id: string }[] }).data.map((m) => m.id)
    expect(ids).not.toContain(ALREADY_VOTED)
  })

  it('excludes members without a stats row for the active cycle', async () => {
    givenSession(MEMBER)
    const data = defaultData()
    data.votes = []
    data.stats = [makeStats(MEMBER_ID), makeStats(SAME_NODE_ID), makeStats(OTHER_ACTIVE)]
    givenAdmin(data)

    const { status, body } = await callGet()

    expect(status).toBe(200)
    const ids = (body as { data: { id: string }[] }).data.map((m) => m.id)
    expect(ids).toContain(OTHER_ACTIVE)
    expect(ids).not.toContain(OTHER_NO_STATS)
  })

  it('never returns the caller as a candidate', async () => {
    givenSession(MEMBER)
    givenAdmin(defaultData())

    const { status, body } = await callGet()

    expect(status).toBe(200)
    const ids = (body as { data: { id: string }[] }).data.map((m) => m.id)
    expect(ids).not.toContain(SELF_ID)
  })

  it('sorts candidates by display name', async () => {
    givenSession(MEMBER)
    const data = defaultData()
    data.votes = []
    givenAdmin(data)

    const { status, body } = await callGet()

    expect(status).toBe(200)
    const names = (body as { data: { display_name: string }[] }).data.map(
      (m) => m.display_name,
    )
    expect(names).toEqual([...names].sort())
  })

  it('projects exactly the member shape the vote form needs', async () => {
    givenSession(MEMBER)
    // Default data: ALREADY_VOTED is excluded by the existing vote, and
    // OTHER_NO_STATS has no stats row — so the list is exactly OTHER_ACTIVE.
    givenAdmin(defaultData())

    const { status, body } = await callGet()

    expect(status).toBe(200)
    const res = body as { data: unknown }
    expect(res.data).toEqual([
      expect.objectContaining({
        id: OTHER_ACTIVE,
        display_name: OTHER_ACTIVE,
        avatar_url: `av-${OTHER_ACTIVE}`,
        node: { id: 'n-beta', name: 'n-beta' },
      }),
    ])
    const first = (res.data as unknown[])[0] as Record<string, unknown>
    expect(Object.keys(first).sort()).toEqual([
      'avatar_url',
      'display_name',
      'id',
      'node',
    ])
    expect(first).not.toHaveProperty('voter')
  })
})

// ─── No-cycle / no-node states ──────────────────────────────────────────────

describe('no-cycle and no-node states', () => {
  it('returns an empty list when no cycle is active', async () => {
    givenSession(MEMBER)
    givenAdmin({ users: [MEMBER], cycles: [], memberships: [], stats: [], votes: [] })

    const { status, body } = await callGet()

    expect(status).toBe(200)
    expect(body).toEqual({ data: [] })
  })

  it('returns an empty list when the caller is not in a node', async () => {
    givenSession(MEMBER)
    givenAdmin({
      users: [MEMBER],
      cycles: [CYCLE],
      memberships: [],
      stats: [],
      votes: [],
    })

    const { status, body } = await callGet()

    expect(status).toBe(200)
    expect(body).toEqual({ data: [] })
  })
})

// ─── Failure mapping ────────────────────────────────────────────────────────

describe('failure mapping', () => {
  it('maps a PocketBase outage to an opaque 500 internal envelope', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    givenSession(MEMBER)
    const admin = fakeAdmin(defaultData())
    vi.mocked(getAdminClient).mockResolvedValue({
      ...admin,
      collection: (name: string) => {
        if (name === 'node_member') {
          return {
            getFirstListItem: async () => {
              throw new ClientResponseError({ status: 500 })
            },
            getFullList: async () => {
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
