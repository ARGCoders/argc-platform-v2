import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { ClientResponseError } from 'pocketbase'
import type PocketBase from 'pocketbase'
import { GET } from './route'
import { AUTH_COOKIE } from '@/lib/constants'
import type {
  AdvancementCycleRecord,
  UserRecord,
  XpLedgerRecord,
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

function makeLedger(
  id: string,
  userId: string,
  amount: number,
  category: XpLedgerRecord['category'],
  cycleId: string,
  created: string,
): XpLedgerRecord {
  return {
    id,
    user: userId,
    amount,
    category,
    reference_id: `ref-${id}`,
    reference_type: 'evaluation',
    cycle: cycleId,
    created,
  }
}

const LEDGER_ITEMS: XpLedgerRecord[] = [
  makeLedger(
    'l1',
    MEMBER_ID,
    25,
    'evaluation_on_time',
    CYCLE.id,
    '2026-08-20T10:00:00.000Z',
  ),
  makeLedger(
    'l2',
    MEMBER_ID,
    40,
    'event_organized',
    CYCLE.id,
    '2026-08-18T08:00:00.000Z',
  ),
  makeLedger(
    'l3',
    MEMBER_ID,
    25,
    'knowledge_session',
    CYCLE.id,
    '2026-08-15T14:00:00.000Z',
  ),
  makeLedger('l4', OTHER_ID, 50, 'hackathon', CYCLE.id, '2026-08-19T12:00:00.000Z'),
]

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
  cycles?: AdvancementCycleRecord[]
  ledger?: XpLedgerRecord[]
}

function fakeAdmin({ users = [], cycles = [], ledger = [] }: AdminData): PocketBase {
  return {
    filter: (str: string, params: Record<string, unknown>) =>
      str.replace(/\{:([a-zA-Z0-9_]+)\}/g, (_match, name: string) =>
        JSON.stringify(params[name]),
      ),
    collection: (name: string) => ({
      getOne: async (id: string) => {
        if (name === 'users') {
          const row = users.find((r) => r.id === id)
          if (!row) throw new ClientResponseError({ status: 404 })
          return row
        }
        if (name === 'advancement_cycles') {
          const row = cycles.find((r) => r.id === id)
          if (!row) throw new ClientResponseError({ status: 404 })
          return row
        }
        throw new Error(`unexpected getOne on ${name}`)
      },
      getFirstListItem: async (filter: string) => {
        const rows: Identifiable[] = name === 'advancement_cycles' ? cycles : []
        const row = applyFilter(filter, rows).at(0)
        if (!row) throw new ClientResponseError({ status: 404 })
        return row
      },
      getList: async (
        page: number,
        perPage: number,
        opts?: { filter?: string; sort?: string },
      ) => {
        const rows: Identifiable[] = name === 'xp_ledger' ? ledger : []
        let filtered = opts?.filter
          ? applyFilter(opts.filter, rows as Identifiable[])
          : (rows as Identifiable[])

        // Simulate sort by created desc
        if (opts?.sort === '-created') {
          filtered = [...filtered].sort((a, b) =>
            (b as unknown as XpLedgerRecord).created >
            (a as unknown as XpLedgerRecord).created
              ? 1
              : -1,
          )
        }

        const totalItems = filtered.length
        const totalPages = Math.ceil(totalItems / perPage)
        const start = (page - 1) * perPage
        const items = filtered.slice(start, start + perPage)

        return { items, page, perPage, totalItems, totalPages }
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

async function callGet(url?: string): Promise<{ status: number; body: unknown }> {
  const req = new NextRequest(`http://localhost/api/dashboard/me/xp${url ?? ''}`)
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
    givenAdmin({ users: [LEADER], ledger: [] })

    const { status } = await callGet()

    expect(status).toBe(200)
  })
})

// ─── Payload shape ──────────────────────────────────────────────────────────

describe('payload', () => {
  it('returns paginated ledger items sorted by created desc', async () => {
    givenSession(MEMBER)
    givenAdmin({ users: [MEMBER], ledger: LEDGER_ITEMS })

    const { status, body } = await callGet()

    expect(status).toBe(200)
    const data = (body as { data: { items: XpLedgerRecord[]; totalItems: number } }).data
    expect(data.items).toHaveLength(3) // only MEMBER_ID's 3 rows
    expect(data.items[0]!.id).toBe('l1')
    expect(data.items[0]!.amount).toBe(25)
    expect(data.totalItems).toBe(3)
  })

  it('returns empty list for a member with no ledger entries', async () => {
    givenSession(MEMBER)
    givenAdmin({ users: [MEMBER], ledger: [] })

    const { status, body } = await callGet()

    expect(status).toBe(200)
    const data = (
      body as {
        data: { items: XpLedgerRecord[]; totalItems: number; totalPages: number }
      }
    ).data
    expect(data.items).toEqual([])
    expect(data.totalItems).toBe(0)
    expect(data.totalPages).toBe(0)
  })
})

// ─── Pagination ─────────────────────────────────────────────────────────────

describe('pagination', () => {
  it('defaults to page 1 with 20 items per page', async () => {
    givenSession(MEMBER)
    const items = Array.from({ length: 30 }, (_, i) =>
      makeLedger(
        `l${i}`,
        MEMBER_ID,
        10,
        'evaluation_on_time',
        CYCLE.id,
        `2026-08-${String(30 - i).padStart(2, '0')}T00:00:00.000Z`,
      ),
    )
    givenAdmin({ users: [MEMBER], ledger: items })

    const { body } = await callGet()
    const data = (
      body as {
        data: {
          items: unknown[]
          page: number
          perPage: number
          totalItems: number
          totalPages: number
        }
      }
    ).data

    expect(data.page).toBe(1)
    expect(data.perPage).toBe(20)
    expect(data.items).toHaveLength(20)
    expect(data.totalItems).toBe(30)
    expect(data.totalPages).toBe(2)
  })

  it('accepts custom page and perPage', async () => {
    givenSession(MEMBER)
    const items = Array.from({ length: 30 }, (_, i) =>
      makeLedger(
        `l${i}`,
        MEMBER_ID,
        10,
        'evaluation_on_time',
        CYCLE.id,
        `2026-08-${String(30 - i).padStart(2, '0')}T00:00:00.000Z`,
      ),
    )
    givenAdmin({ users: [MEMBER], ledger: items })

    const { body } = await callGet('?page=2&perPage=10')
    const data = (
      body as {
        data: { items: unknown[]; page: number; perPage: number; totalItems: number }
      }
    ).data

    expect(data.page).toBe(2)
    expect(data.perPage).toBe(10)
    expect(data.items).toHaveLength(10)
    expect(data.totalItems).toBe(30)
  })

  it('returns an empty page beyond the range', async () => {
    givenSession(MEMBER)
    givenAdmin({ users: [MEMBER], ledger: LEDGER_ITEMS })

    const { status, body } = await callGet('?page=99&perPage=20')

    expect(status).toBe(200)
    const data = (body as { data: { items: XpLedgerRecord[]; totalItems: number } }).data
    expect(data.items).toEqual([])
    expect(data.totalItems).toBe(3)
  })
})

// ─── Query param validation ─────────────────────────────────────────────────

describe('query param validation', () => {
  it('rejects page < 1 with 400 invalid_input', async () => {
    givenSession(MEMBER)

    const { status, body } = await callGet('?page=0')

    expect(status).toBe(400)
    expect(body).toEqual({
      error: { code: 'invalid_input', message: 'page must be an integer ≥ 1' },
    })
  })

  it('rejects non-integer page with 400', async () => {
    givenSession(MEMBER)

    const { status, body } = await callGet('?page=abc')

    expect(status).toBe(400)
    expect(body).toEqual({
      error: { code: 'invalid_input', message: 'page must be an integer ≥ 1' },
    })
  })

  it('rejects perPage > 100 with 400', async () => {
    givenSession(MEMBER)

    const { status, body } = await callGet('?perPage=101')

    expect(status).toBe(400)
    expect(body).toEqual({
      error: {
        code: 'invalid_input',
        message: 'perPage must be an integer between 1 and 100',
      },
    })
  })

  it('rejects perPage < 1 with 400', async () => {
    givenSession(MEMBER)

    const { status, body } = await callGet('?perPage=0')

    expect(status).toBe(400)
    expect(body).toEqual({
      error: {
        code: 'invalid_input',
        message: 'perPage must be an integer between 1 and 100',
      },
    })
  })

  it('rejects perPage = 101 with 400', async () => {
    givenSession(MEMBER)

    const { status, body } = await callGet('?perPage=101')

    expect(status).toBe(400)
    expect(body).toMatchObject({
      error: { code: 'invalid_input' },
    })
  })
})

// ─── Cycle filter ───────────────────────────────────────────────────────────

describe('cycle filter', () => {
  it('filters ledger entries by cycle id', async () => {
    givenSession(MEMBER)
    const otherCycle = { ...CYCLE, id: 'cycle-spring', label: 'Spring 2026' }
    const mixed = [
      ...LEDGER_ITEMS,
      makeLedger(
        'l5',
        MEMBER_ID,
        50,
        'hackathon',
        otherCycle.id,
        '2026-03-10T10:00:00.000Z',
      ),
    ]
    givenAdmin({ users: [MEMBER], cycles: [CYCLE, otherCycle], ledger: mixed })

    const { status, body } = await callGet(`?cycle=${otherCycle.id}`)

    expect(status).toBe(200)
    const data = (body as { data: { items: XpLedgerRecord[]; totalItems: number } }).data
    expect(data.items).toHaveLength(1)
    expect(data.items[0]!.id).toBe('l5')
    expect(data.items[0]!.cycle).toBe(otherCycle.id)
  })

  it('returns 400 for an unknown cycle id', async () => {
    givenSession(MEMBER)
    givenAdmin({ users: [MEMBER] })

    const { status, body } = await callGet('?cycle=nonexistent')

    expect(status).toBe(400)
    expect(body).toEqual({
      error: { code: 'invalid_input', message: 'Unknown cycle id' },
    })
  })
})

// ─── Ownership scoping ──────────────────────────────────────────────────────

describe('ownership scoping', () => {
  it("returns only the caller's own ledger entries", async () => {
    givenSession(MEMBER)
    givenAdmin({ users: [MEMBER], ledger: LEDGER_ITEMS })

    const { status, body } = await callGet()

    expect(status).toBe(200)
    const data = (body as { data: { items: XpLedgerRecord[] } }).data
    data.items.forEach((item) => {
      expect(item.user).toBe(MEMBER_ID)
    })
  })

  it("never returns another member's rows even with pagination", async () => {
    givenSession(MEMBER)
    const allItems = [
      ...LEDGER_ITEMS,
      makeLedger(
        'l6',
        OTHER_ID,
        10,
        'evaluation_on_time',
        CYCLE.id,
        '2026-08-01T00:00:00.000Z',
      ),
      makeLedger(
        'l7',
        OTHER_ID,
        10,
        'evaluation_late',
        CYCLE.id,
        '2026-08-02T00:00:00.000Z',
      ),
    ]
    givenAdmin({ users: [MEMBER], ledger: allItems })

    const { status, body } = await callGet('?perPage=100')

    expect(status).toBe(200)
    const data = (body as { data: { items: XpLedgerRecord[]; totalItems: number } }).data
    expect(data.items.every((i) => i.user === MEMBER_ID)).toBe(true)
    expect(data.totalItems).toBe(3)
  })
})

// ─── Failure mapping ────────────────────────────────────────────────────────

describe('failure mapping', () => {
  it('maps a PocketBase outage to an opaque 500 internal envelope', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    givenSession(MEMBER)
    const admin = fakeAdmin({ users: [MEMBER], ledger: [] })
    vi.mocked(getAdminClient).mockResolvedValue({
      ...admin,
      collection: (name: string) => {
        if (name === 'xp_ledger') {
          return {
            getList: async () => {
              throw new ClientResponseError({ status: 500 })
            },
            getOne: async () => {
              throw new ClientResponseError({ status: 500 })
            },
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
