import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { ClientResponseError } from 'pocketbase'
import type PocketBase from 'pocketbase'
import { GET, POST } from './route'
import { AUTH_COOKIE } from '@/lib/constants'
import type { EventRecord, NodeMemberRecord, UserRecord } from '@/types/pocketbase'

vi.mock('next/headers', () => ({ cookies: vi.fn() }))
vi.mock('@/lib/pocketbase-server', () => ({
  getAdminClient: vi.fn(),
  getPocketBaseClient: vi.fn(),
}))

import { cookies } from 'next/headers'
import { getAdminClient, getPocketBaseClient } from '@/lib/pocketbase-server'

// ─── Fixtures ───────────────────────────────────────────────────────────────

const LEADER_ID = 'u-leader'
const OTHER_USER_ID = 'u-other'
const NODE_ID = 'node-alpha'
const OTHER_NODE_ID = 'node-beta'
const FUTURE = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
const PAST = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

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

function makeEvent(id: string, overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    id,
    title: `Event ${id}`,
    slug: `event-${id}`,
    type: 'workshop',
    proposed_by: NODE_ID,
    organized_by: LEADER_ID,
    status: 'proposed',
    starts_at: FUTURE,
    is_public: false,
    attendance_count: 0,
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
  memberships?: NodeMemberRecord[]
  events?: EventRecord[]
  /** slugs whose create must simulate a concurrent race: first attempt
   *  throws as the other writer wins the slug (and lands in `events`). */
  failOnceSlugs?: Record<string, boolean>
}

interface FakeAdminLog {
  createCalls: Array<Record<string, unknown>>
  eventListFilters: string[]
  eventProbeFilters: string[]
}

type FakeAdmin = PocketBase & { log: FakeAdminLog }

function fakeAdmin(data: AdminData): FakeAdmin {
  const log: FakeAdminLog = {
    createCalls: [],
    eventListFilters: [],
    eventProbeFilters: [],
  }

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
        if (name === 'events') {
          log.eventProbeFilters.push(filter)
          const rows = evaluateClauses(filter, data.events ?? [])
          const row = rows.at(0)
          if (!row) throw new ClientResponseError({ status: 404 })
          return row
        }
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
        opts?: { filter?: string; sort?: string },
      ) => {
        if (name !== 'events') throw new Error(`unexpected getList on ${name}`)
        log.eventListFilters.push(opts?.filter ?? '')
        const rows = opts?.filter
          ? evaluateClauses(opts.filter, data.events ?? [])
          : [...(data.events ?? [])]
        if (opts?.sort === '-created') {
          rows.sort((a, b) => (a.created < b.created ? 1 : -1))
        }
        const totalItems = rows.length
        const start = (page - 1) * perPage
        const items = rows.slice(start, start + perPage)
        return {
          items,
          page,
          perPage,
          totalItems,
          totalPages: Math.ceil(totalItems / perPage),
        }
      },
      create: async (payload: { slug: string }) => {
        if (name !== 'events') throw new Error(`unexpected create on ${name}`)
        log.createCalls.push(payload)
        if (data.failOnceSlugs?.[payload.slug]) {
          delete data.failOnceSlugs[payload.slug]
          ;(data.events ??= []).push(
            makeEvent(`ev-winner-${payload.slug}`, { slug: payload.slug }),
          )
          throw new ClientResponseError({ status: 400 })
        }
        const row = {
          ...payload,
          id: `ev-${Object.keys(log.createCalls).length}`,
          created: '2026-08-30T10:00:00.000Z',
          updated: '2026-08-30T10:00:00.000Z',
        } as EventRecord
        ;(data.events ??= []).push(row)
        return row
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

function givenAdmin(data: AdminData): FakeAdmin {
  const admin = fakeAdmin(data)
  vi.mocked(getAdminClient).mockResolvedValue(admin as unknown as PocketBase)
  return admin
}

function defaultData(overrides: Partial<AdminData> = {}): AdminData {
  return {
    users: [LEADER, makeUser(OTHER_USER_ID)],
    memberships: [
      makeMember(LEADER_ID, NODE_ID, 'leader'),
      makeMember(OTHER_USER_ID, OTHER_NODE_ID, 'leader'),
    ],
    events: [
      makeEvent('ev-1', { title: 'Stdlib Brawl' }),
      makeEvent('ev-2', { proposed_by: OTHER_NODE_ID }),
      makeEvent('ev-3', { title: 'Older one', created: '2026-08-01T10:00:00.000Z' }),
    ],
    ...overrides,
  }
}

async function callGet(
  query = '',
): Promise<{ status: number; body: unknown; admin?: FakeAdmin }> {
  const req = new NextRequest(`http://localhost/api/dashboard/node/events${query}`)
  const res = await GET(req)
  return { status: res.status, body: await res.json() }
}

async function callPost(
  payload: unknown,
): Promise<{ status: number; body: unknown; admin?: FakeAdmin }> {
  const req = new NextRequest('http://localhost/api/dashboard/node/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof payload === 'string' ? payload : JSON.stringify(payload),
  })
  const res = await POST(req)
  return { status: res.status, body: await res.json() }
}

function validProposal(overrides: Record<string, unknown> = {}) {
  return { title: 'Hack Night', type: 'hackathon', starts_at: FUTURE, ...overrides }
}

beforeEach(() => {
  cookieGet.mockReset()
  vi.mocked(cookies).mockResolvedValue({
    get: cookieGet,
  } as unknown as Awaited<ReturnType<typeof cookies>>)
})

// ─── Auth gate ──────────────────────────────────────────────────────────────

describe('auth gate', () => {
  it('answers 401 unauthorized without a session cookie on GET', async () => {
    setCookie(undefined)
    const { status } = await callGet()
    expect(status).toBe(401)
  })

  it('answers 401 unauthorized without a session cookie on POST', async () => {
    setCookie(undefined)
    const { status } = await callPost(validProposal())
    expect(status).toBe(401)
  })

  it.each(['GET', 'POST'] as const)(
    'answers 403 forbidden to a guest on %s',
    async (method) => {
      givenSession(GUEST)
      givenAdmin({ users: [GUEST] })
      const { status, body } =
        method === 'GET' ? await callGet() : await callPost(validProposal())
      expect(status).toBe(403)
      expect(body).toEqual({
        error: { code: 'forbidden', message: 'Insufficient permissions' },
      })
    },
  )

  it.each(['GET', 'POST'] as const)(
    'answers 403 forbidden to a node_peer (below node_leader) on %s',
    async (method) => {
      givenSession(makeUser(OTHER_USER_ID))
      givenAdmin({ users: [makeUser(OTHER_USER_ID)] })
      const { status } =
        method === 'GET' ? await callGet() : await callPost(validProposal())
      expect(status).toBe(403)
    },
  )
})

// ─── Ownership scope ────────────────────────────────────────────────────────

describe('ownership scope', () => {
  it.each(['GET', 'POST'] as const)(
    'answers 403 for a node_leader who leads no node (%s)',
    async (method) => {
      givenSession(LEADER)
      givenAdmin({ users: [LEADER] })
      const { status, body } =
        method === 'GET' ? await callGet() : await callPost(validProposal())
      expect(status).toBe(403)
      expect(body).toEqual({ error: { code: 'forbidden', message: 'No node to lead' } })
    },
  )
})

// ─── GET — node pipeline ────────────────────────────────────────────────────

describe('GET — the node’s proposal pipeline', () => {
  it('lists this node’s proposals newest-first with the pagination envelope', async () => {
    givenSession(LEADER)
    givenAdmin(defaultData())

    const { status, body } = await callGet()

    expect(status).toBe(200)
    expect(body).toMatchObject({
      page: 1,
      perPage: 20,
      totalItems: 2,
      totalPages: 1,
    })
    const data = (body as { data: EventRecord[] }).data
    expect(data.map((e) => e.id)).toEqual(['ev-1', 'ev-3'])
    expect(data[0]).toMatchObject({ title: 'Stdlib Brawl', status: 'proposed' })
    // Never another node's proposals.
    expect(data.some((e) => (e as { id: string }).id === 'ev-2')).toBe(false)
  })

  it('scopes the DB filter to the led node’s id', async () => {
    givenSession(LEADER)
    const admin = givenAdmin(defaultData())

    await callGet()

    expect(admin.log.eventListFilters[0]).toBe(`proposed_by = "${NODE_ID}"`)
  })

  it('returns an empty page when the node has no proposals', async () => {
    givenSession(LEADER)
    givenAdmin({
      users: [LEADER],
      memberships: [makeMember(LEADER_ID, NODE_ID, 'leader')],
    })

    const { status, body } = await callGet()

    expect(status).toBe(200)
    expect(body).toEqual({ data: [], page: 1, perPage: 20, totalItems: 0, totalPages: 0 })
  })

  it('projects nullable fields as null, never a string or blank', async () => {
    givenSession(LEADER)
    givenAdmin(
      defaultData({
        events: [
          {
            ...makeEvent('ev-min'),
            description: undefined,
            location: undefined,
            ends_at: undefined,
          },
        ],
      }),
    )

    const { status, body } = await callGet()

    expect(status).toBe(200)
    const projected = (body as { data: EventRecord[] }).data[0]
    expect(projected).toMatchObject({ description: null, location: null, ends_at: null })
  })
})

// ─── POST — propose ─────────────────────────────────────────────────────────

describe('POST — propose an event', () => {
  it('creates with server-forced ownership fields and a slug from the title', async () => {
    givenSession(LEADER)
    const admin = givenAdmin(defaultData())

    const { status, body } = await callPost(validProposal({ is_public: true }))

    expect(status).toBe(201)
    const create = admin.log.createCalls[0]
    expect(create).toMatchObject({
      title: 'Hack Night',
      slug: 'hack-night',
      type: 'hackathon',
      proposed_by: NODE_ID,
      organized_by: LEADER_ID,
      status: 'proposed',
      starts_at: FUTURE,
      is_public: true,
      attendance_count: 0,
      xp_awarded: false,
    })
    expect(create?.location).toBeUndefined()
    expect(body).toEqual({ data: expect.objectContaining({ id: expect.any(String) }) })
  })

  it('discards client-supplied forced fields instead of echoing them', async () => {
    givenSession(LEADER)
    const admin = givenAdmin(defaultData())

    const { status } = await callPost(
      validProposal({
        status: 'approved',
        proposed_by: 'node-hijack',
        organized_by: 'user-hijack',
        slug: 'crafted-slug',
        attendance_count: 999,
        xp_awarded: true,
      }),
    )

    expect(status).toBe(201)
    const create = admin.log.createCalls[0]
    expect(create).toMatchObject({
      slug: 'hack-night',
      status: 'proposed',
      proposed_by: NODE_ID,
      organized_by: LEADER_ID,
      attendance_count: 0,
      xp_awarded: false,
    })
    expect(create).not.toHaveProperty('crafted-slug')
  })

  it('defaults is_public to false and trims description', async () => {
    givenSession(LEADER)
    const admin = givenAdmin(defaultData())

    const { status } = await callPost(
      validProposal({ description: '  A night of pair coding.  ' }),
    )

    expect(status).toBe(201)
    expect(admin.log.createCalls[0]).toMatchObject({
      description: 'A night of pair coding.',
      is_public: false,
    })
    expect(admin.log.createCalls[0]?.location).toBeUndefined()
  })

  it('normalizes a submitted date to the UTC ISO the store expects', async () => {
    givenSession(LEADER)
    const admin = givenAdmin(defaultData())

    const tzUtc = new Date(FUTURE).toISOString()
    const { status } = await callPost(validProposal({ starts_at: tzUtc }))

    expect(status).toBe(201)
    expect(admin.log.createCalls[0]).toMatchObject({ starts_at: tzUtc })
  })

  it('answers 400 for a past starts_at', async () => {
    givenSession(LEADER)
    const admin = givenAdmin(defaultData())

    const { status, body } = await callPost(validProposal({ starts_at: PAST }))

    expect(status).toBe(400)
    expect(body).toEqual({
      error: { code: 'invalid_input', message: 'starts_at must be in the future' },
    })
    expect(admin.log.createCalls).toHaveLength(0)
  })

  it('answers 400 for an unknown type', async () => {
    givenSession(LEADER)
    givenAdmin(defaultData())

    const { status, body } = await callPost(validProposal({ type: 'bogus' }))

    expect(status).toBe(400)
    expect(body).toEqual({
      error: { code: 'invalid_input', message: 'Invalid event type' },
    })
  })

  it.each([
    ['missing title', { title: undefined }],
    ['blank title', { title: '   ' }],
  ] as const)('answers 400 for %s', async (_label, overrides) => {
    givenSession(LEADER)
    const admin = givenAdmin(defaultData())

    const { status, body } = await callPost(validProposal(overrides))

    expect(status).toBe(400)
    expect(body).toEqual({
      error: { code: 'invalid_input', message: 'Title is required' },
    })
    expect(admin.log.createCalls).toHaveLength(0)
  })

  it('answers 400 for a title over 120 characters', async () => {
    givenSession(LEADER)
    const admin = givenAdmin(defaultData())

    const { status } = await callPost(validProposal({ title: 'x'.repeat(121) }))

    expect(status).toBe(400)
    expect(admin.log.createCalls).toHaveLength(0)
  })

  it('answers 400 for a non-object body', async () => {
    givenSession(LEADER)
    const admin = givenAdmin(defaultData())

    const { status, body } = await callPost('not-json')

    expect(status).toBe(400)
    expect(body).toEqual({
      error: { code: 'invalid_input', message: 'Invalid request body' },
    })
    expect(admin.log.createCalls).toHaveLength(0)
  })

  // ── Slug uniqueness ──────────────────────────────────────────────────────

  it('resolves a pre-existing slug to a numbered suffix', async () => {
    givenSession(LEADER)
    const admin = givenAdmin(
      defaultData({
        events: [makeEvent('ev-taken', { title: 'Hack Night', slug: 'hack-night' })],
      }),
    )

    const { status } = await callPost(validProposal())

    expect(status).toBe(201)
    expect(admin.log.createCalls[0]).toMatchObject({ slug: 'hack-night-2' })
  })

  it('resolves a slug raced by a concurrent writer by probing again', async () => {
    givenSession(LEADER)
    const admin = givenAdmin(defaultData({ failOnceSlugs: { 'hack-night': true } }))

    const { status } = await callPost(validProposal())

    expect(status).toBe(201)
    expect(admin.log.createCalls).toHaveLength(2)
    expect(admin.log.createCalls[0]).toMatchObject({ slug: 'hack-night' })
    expect(admin.log.createCalls[1]).toMatchObject({ slug: 'hack-night-2' })
  })
})
