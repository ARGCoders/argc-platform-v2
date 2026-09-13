import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { ClientResponseError } from 'pocketbase'
import type PocketBase from 'pocketbase'
import { GET } from './route'
import { AUTH_COOKIE } from '@/lib/constants'
import type {
  AdvancementCycleRecord,
  EvaluationRecord,
  NodeMemberRecord,
  UserRecord,
} from '@/types/pocketbase'

vi.mock('next/headers', () => ({ cookies: vi.fn() }))
vi.mock('@/lib/pocketbase-server', () => ({
  getAdminClient: vi.fn(),
  getPocketBaseClient: vi.fn(),
}))

import { cookies } from 'next/headers'
import { getAdminClient, getPocketBaseClient } from '@/lib/pocketbase-server'

// ─── Fixtures ───────────────────────────────────────────────────────────────

const LEADER_ID = 'u-leader'
const M1_ID = 'u-m1'
const M2_ID = 'u-m2'
const FOREIGN_ID = 'u-foreign'

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
    avatar_url: '',
    role,
    last_sync_at: '',
    created: '',
    updated: '',
  }
}

const LEADER = makeUser(LEADER_ID, 'node_leader')
const GUEST = makeUser('u-guest', 'guest')

function makeMember(
  user: string,
  node: string,
  role: 'member' | 'leader' = 'member',
): NodeMemberRecord {
  return {
    id: `nm-${user}`,
    role,
    user,
    node,
    joined_at: '2026-08-16T00:00:00.000Z',
    left_at: '',
  }
}

function makeEvaluation(
  id: string,
  evaluatee: string,
  overrides: Partial<EvaluationRecord> = {},
): EvaluationRecord {
  return {
    id,
    evaluatee,
    cycle: CYCLE.id,
    stage: 'standard_1',
    status: 'pending',
    xp_awarded: false,
    created: '2026-08-20T10:00:00.000Z',
    updated: '2026-08-20T10:00:00.000Z',
    ...overrides,
  }
}

// ─── Fake PocketBase ────────────────────────────────────────────────────────

type Identifiable = { id: string }

function evaluateClauses<T extends Identifiable>(filter: string, rows: T[]): T[] {
  const orGroups = filter.split(/\s*\|\|\s*/).map((g) => g.replace(/^\(|\)$/g, '').trim())
  return rows.filter((row) =>
    orGroups.some((group) => {
      const clauses = [...group.matchAll(/([a-zA-Z_]+) (!=|=) ("(?:[^"\\]|\\.)*")/g)]
      return clauses.every(([, field, op, raw]) => {
        const value = (row as unknown as Record<string, unknown>)[field!]
        const target = JSON.parse(raw!)
        return op === '!=' ? value !== target : value === target
      })
    }),
  )
}

interface AdminData {
  users?: UserRecord[]
  cycles?: AdvancementCycleRecord[]
  memberships?: NodeMemberRecord[]
  evaluations?: EvaluationRecord[]
}

interface FakeAdminLog {
  evalListFilters: string[]
  evalListOptions: Record<string, unknown>[]
}

type FakeAdmin = PocketBase & {
  log: FakeAdminLog
}

function expandEvaluation(
  evalRecord: EvaluationRecord,
  data: AdminData,
): EvaluationRecord {
  return {
    ...evalRecord,
    expand: {
      evaluatee: (data.users ?? []).find((u) => u.id === evalRecord.evaluatee),
      evaluator: evalRecord.evaluator
        ? (data.users ?? []).find((u) => u.id === evalRecord.evaluator)
        : undefined,
      cycle: (data.cycles ?? []).find((c) => c.id === evalRecord.cycle),
    },
  }
}

function fakeAdmin(data: AdminData): FakeAdmin {
  const log: FakeAdminLog = { evalListFilters: [], evalListOptions: [] }

  const pb = {
    filter: (str: string, params: Record<string, unknown>) =>
      str.replace(/\{:([a-zA-Z0-9_]+)\}/g, (_match, name: string) =>
        JSON.stringify(params[name]),
      ),
    log,
    collection: (name: string) => ({
      getOne: async (id: string) => {
        if (name !== 'users') throw new Error(`unexpected getOne on ${name}`)
        const row = (data.users ?? []).find((u) => u.id === id)
        if (!row) throw new ClientResponseError({ status: 404 })
        return row
      },
      getFirstListItem: async (filter: string) => {
        const rows: Identifiable[] =
          name === 'node_member' ? (data.memberships ?? []) : []
        const row = evaluateClauses(filter, rows).at(0)
        if (!row) throw new ClientResponseError({ status: 404 })
        return row
      },
      getFullList: async (opts?: { filter?: string }) => {
        if (name !== 'node_member') return []
        if (!opts?.filter) return []
        return evaluateClauses(opts.filter, data.memberships ?? [])
      },
      getList: async (
        page: number,
        perPage: number,
        opts?: { filter?: string; sort?: string; expand?: string },
      ) => {
        if (name !== 'evaluations') throw new Error(`unexpected getList on ${name}`)
        log.evalListFilters.push(opts?.filter ?? '')
        log.evalListOptions.push(opts ?? {})
        const rows = opts?.filter
          ? evaluateClauses(opts.filter, data.evaluations ?? [])
          : [...(data.evaluations ?? [])]
        if (opts?.sort === '-created') {
          rows.sort((a, b) => (a.created < b.created ? 1 : -1))
        }
        const totalItems = rows.length
        const start = (page - 1) * perPage
        const items = rows
          .slice(start, start + perPage)
          .map((e) => expandEvaluation(e, data))
        return {
          items,
          page,
          perPage,
          totalItems,
          totalPages: Math.ceil(totalItems / perPage),
        }
      },
    }),
  }
  return pb as unknown as FakeAdmin
}

function fakeUserClient(record: Record<string, unknown> | null): PocketBase {
  return {
    authStore: { save: vi.fn(), record, token: 'refreshed-token' },
    collection: () => ({
      authRefresh: vi.fn(async () => {}),
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

function givenSession(user: UserRecord) {
  setCookie('valid-token')
  vi.mocked(getPocketBaseClient).mockReturnValue(fakeUserClient({ ...user }))
}

function givenAdmin(data: AdminData) {
  const admin = fakeAdmin(data)
  vi.mocked(getAdminClient).mockResolvedValue(admin as unknown as PocketBase)
  return admin
}

function defaultData(): AdminData {
  return {
    users: [LEADER, makeUser(M1_ID), makeUser(M2_ID), makeUser(FOREIGN_ID)],
    cycles: [CYCLE],
    memberships: [
      makeMember(LEADER_ID, 'n-alpha', 'leader'),
      makeMember(M1_ID, 'n-alpha'),
      makeMember(M2_ID, 'n-alpha'),
      makeMember(FOREIGN_ID, 'n-beta'),
    ],
    evaluations: [
      makeEvaluation('eval-1', M1_ID, {
        status: 'scheduled',
        scheduled_at: '2026-08-20T10:00:00.000Z',
        evaluator: M2_ID,
      }),
      makeEvaluation('eval-2', M2_ID, {
        status: 'completed',
        completed_at: '2026-08-21T10:00:00.000Z',
        score: 85,
        xp_awarded: true,
      }),
      makeEvaluation('eval-foreign', FOREIGN_ID),
    ],
  }
}

async function callGet(
  query = '',
): Promise<{ status: number; body: unknown; admin?: FakeAdmin }> {
  const req = new NextRequest(`http://localhost/api/dashboard/node/evaluations${query}`)
  const res = await GET(req)
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

  it('answers 403 forbidden for a node_peer (below node_leader)', async () => {
    givenSession(makeUser(M1_ID))
    givenAdmin({ users: [makeUser(M1_ID)] })

    const { status, body } = await callGet()

    expect(status).toBe(403)
    expect(body).toEqual({
      error: { code: 'forbidden', message: 'Insufficient permissions' },
    })
  })
})

// ─── Ownership scope ────────────────────────────────────────────────────────

describe('ownership scope (role qualifies, authority doesn’t)', () => {
  it('answers 403 when the node_leader does not lead any node', async () => {
    givenSession(LEADER)
    givenAdmin({ ...defaultData(), memberships: [] })

    const { status, body } = await callGet()

    expect(status).toBe(403)
    expect(body).toEqual({
      error: { code: 'forbidden', message: 'No node to lead' },
    })
  })

  it('answers 403 when the leadership row has left_at set', async () => {
    givenSession(LEADER)
    const data = defaultData()
    data.memberships = [
      {
        ...makeMember(LEADER_ID, 'n-alpha', 'leader'),
        left_at: '2026-09-01T00:00:00.000Z',
      },
    ]
    givenAdmin(data)

    const { status } = await callGet()

    expect(status).toBe(403)
  })
})

// ─── Pagination contract ────────────────────────────────────────────────────

describe('pagination', () => {
  it('answers 400 invalid_input for page below 1', async () => {
    givenSession(LEADER)
    givenAdmin(defaultData())

    const { status, body } = await callGet('?page=0')

    expect(status).toBe(400)
    expect(body).toEqual({
      error: { code: 'invalid_input', message: 'page must be an integer ≥ 1' },
    })
  })

  it('answers 400 invalid_input for perPage above the 100 cap', async () => {
    givenSession(LEADER)
    givenAdmin(defaultData())

    const { status, body } = await callGet('?perPage=101')

    expect(status).toBe(400)
    expect(body).toEqual({
      error: {
        code: 'invalid_input',
        message: 'perPage must be an integer between 1 and 100',
      },
    })
  })
})

// ─── Happy path ─────────────────────────────────────────────────────────────

describe('listing node evaluations', () => {
  it('returns only evaluations for current members of the led node', async () => {
    givenSession(LEADER)
    givenAdmin(defaultData())

    const { status, body } = await callGet()

    expect(status).toBe(200)
    const res = body as {
      data: Array<{ id: string; evaluatee: { id: string } }>
      page: number
      perPage: number
      totalItems: number
      totalPages: number
    }
    expect(res.page).toBe(1)
    expect(res.perPage).toBe(20)
    expect(res.totalItems).toBe(2)
    expect(res.totalPages).toBe(1)
    expect(res.data.map((e) => e.id)).toEqual(['eval-2', 'eval-1'])
    expect(res.data.map((e) => e.evaluatee.id)).toEqual([M2_ID, M1_ID])
  })

  it('scopes the DB filter to current members of the led node', async () => {
    givenSession(LEADER)
    const admin = givenAdmin(defaultData())

    await callGet()

    const filter = admin.log.evalListFilters[0]
    expect(filter).toContain('evaluatee = "u-m1"')
    expect(filter).toContain('evaluatee = "u-m2"')
    expect(filter).not.toContain(FOREIGN_ID)
  })

  it('projects user and cycle expansions without leaking sensitive fields', async () => {
    givenSession(LEADER)
    givenAdmin(defaultData())

    const { body } = await callGet()
    const item = (body as { data: Array<Record<string, unknown>> }).data[1]

    expect(item).toEqual({
      id: 'eval-1',
      evaluatee: { id: M1_ID, display_name: M1_ID, avatar_url: '' },
      evaluator: { id: M2_ID, display_name: M2_ID, avatar_url: '' },
      cycle: {
        id: CYCLE.id,
        label: CYCLE.label,
        slug: CYCLE.slug,
        starts_at: CYCLE.starts_at,
        ends_at: CYCLE.ends_at,
        status: CYCLE.status,
      },
      stage: 'standard_1',
      status: 'scheduled',
      scheduled_at: '2026-08-20T10:00:00.000Z',
      completed_at: null,
      score: null,
      notes: null,
      xp_awarded: false,
      created: '2026-08-20T10:00:00.000Z',
      updated: '2026-08-20T10:00:00.000Z',
    })
    // Expanded user rows must not leak into the response.
    expect(JSON.stringify(body)).not.toContain('email')
    expect(JSON.stringify(body)).not.toContain('intra_login')
  })

  it('passes the request through to getList with pagination, sort and expand', async () => {
    givenSession(LEADER)
    const admin = givenAdmin(defaultData())

    await callGet('?page=1&perPage=5')

    expect(admin.log.evalListOptions[0]).toMatchObject({
      sort: '-created',
      expand: 'evaluatee,evaluator,cycle',
    })
    expect(admin.log.evalListFilters[0]).not.toBe('')
  })

  it('returns an empty result when the led node has no current members', async () => {
    givenSession(LEADER)
    const data = defaultData()
    data.memberships = [makeMember(LEADER_ID, 'n-alpha', 'leader')]
    givenAdmin(data)

    const { status, body } = await callGet()

    expect(status).toBe(200)
    expect(body).toEqual({ data: [], page: 1, perPage: 20, totalItems: 0, totalPages: 0 })
  })
})
