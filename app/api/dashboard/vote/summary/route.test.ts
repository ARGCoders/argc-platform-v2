import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ClientResponseError } from 'pocketbase'
import type PocketBase from 'pocketbase'
import { GET } from './route'
import { AUTH_COOKIE } from '@/lib/constants'
import type { AdvancementCycleRecord, UserRecord, VoteRecord } from '@/types/pocketbase'

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

const MEMBER = makeUser(MEMBER_ID)
const GUEST = makeUser('u-guest', 'guest')

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
  votes?: VoteRecord[]
}

function fakeAdmin({ users = [], cycles = [], votes = [] }: AdminData): PocketBase {
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
        const rows: Identifiable[] = name === 'advancement_cycles' ? cycles : []
        const row = evaluateClauses(filter, rows).at(0)
        if (!row) throw new ClientResponseError({ status: 404 })
        return row
      },
      getFullList: async (opts?: { filter?: string }) => {
        if (name !== 'votes') return []
        return opts?.filter ? evaluateClauses(opts.filter, votes) : votes
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

// ─── Aggregation ────────────────────────────────────────────────────────────

describe('aggregation', () => {
  it('counts positive and negative votes received by the caller', async () => {
    givenSession(MEMBER)
    givenAdmin({
      users: [MEMBER],
      cycles: [CYCLE],
      votes: [
        makeVote('v1', OTHER_ID, MEMBER_ID, 'positive'),
        makeVote('v2', 'u-third', MEMBER_ID, 'positive'),
        makeVote('v3', OTHER_ID, MEMBER_ID, 'negative'),
        makeVote('v4', MEMBER_ID, OTHER_ID, 'positive'), // caller's own cast, not received
      ],
    })

    const { status, body } = await callGet()

    expect(status).toBe(200)
    expect(body).toEqual({ data: { positive: 2, negative: 1 } })
  })

  it('returns zeros when nobody has voted for the caller', async () => {
    givenSession(MEMBER)
    givenAdmin({ users: [MEMBER], cycles: [CYCLE], votes: [] })

    const { status, body } = await callGet()

    expect(status).toBe(200)
    expect(body).toEqual({ data: { positive: 0, negative: 0 } })
  })

  it('returns zeros when no cycle is active', async () => {
    givenSession(MEMBER)
    givenAdmin({ users: [MEMBER], cycles: [], votes: [] })

    const { status, body } = await callGet()

    expect(status).toBe(200)
    expect(body).toEqual({ data: { positive: 0, negative: 0 } })
  })

  it('never returns a voter field or any vote record', async () => {
    givenSession(MEMBER)
    givenAdmin({
      users: [MEMBER],
      cycles: [CYCLE],
      votes: [makeVote('v1', OTHER_ID, MEMBER_ID, 'positive')],
    })

    const { status, body } = await callGet()

    expect(status).toBe(200)
    expect(body).toEqual({ data: { positive: 1, negative: 0 } })
    expect(JSON.stringify(body)).not.toContain(OTHER_ID)
    expect(JSON.stringify(body)).not.toContain('voter')
  })
})

// ─── Failure mapping ────────────────────────────────────────────────────────

describe('failure mapping', () => {
  it('maps a PocketBase outage to an opaque 500 internal envelope', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    givenSession(MEMBER)
    const admin = fakeAdmin({ users: [MEMBER], cycles: [CYCLE], votes: [] })
    vi.mocked(getAdminClient).mockResolvedValue({
      ...admin,
      collection: (name: string) => {
        if (name === 'votes') {
          return {
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
