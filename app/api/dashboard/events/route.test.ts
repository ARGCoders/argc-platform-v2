import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { ClientResponseError } from 'pocketbase'
import type PocketBase from 'pocketbase'
import { GET } from './route'
import { AUTH_COOKIE } from '@/lib/constants'
import type { EventAttendanceRecord, EventRecord, UserRecord } from '@/types/pocketbase'

/**
 * Route handler tests exercise the real lib/auth path: the cookie store is
 * stubbed at `next/headers`, PocketBase at `@/lib/pocketbase-server`.
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

function makeEvent(id: string, overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    id,
    title: id,
    slug: id,
    type: 'workshop',
    proposed_by: 'node-a',
    organized_by: MEMBER_ID,
    status: 'scheduled',
    starts_at: '2099-01-01T00:00:00.000Z',
    is_public: true,
    attendance_count: 0,
    xp_awarded: false,
    created: '2026-08-01T00:00:00.000Z',
    updated: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}

// The fixture set: three attended events (any status/visibility) plus public
// upcoming events. ev-e/-f/-g exercise everything that must be excluded.
const EVT = {
  attendedUpcoming: makeEvent('ev-a', {
    title: 'Spring Workshop',
    status: 'scheduled',
    starts_at: '2099-03-01T10:00:00.000Z',
  }),
  attendedPast: makeEvent('ev-b', {
    title: 'Old Hackathon',
    type: 'hackathon',
    status: 'completed',
    starts_at: '2026-01-10T09:00:00.000Z',
  }),
  attendedPrivateFuture: makeEvent('ev-c', {
    title: 'Secret Meetup',
    status: 'approved',
    is_public: false,
    starts_at: '2099-05-01T18:00:00.000Z',
  }),
  upcomingPublic: makeEvent('ev-d', {
    title: 'Public Workshop II',
    status: 'approved',
    starts_at: '2099-06-01T10:00:00.000Z',
  }),
  cancelled: makeEvent('ev-e', {
    title: 'Cancelled Gala',
    status: 'cancelled',
    starts_at: '2099-07-01T19:00:00.000Z',
  }),
  pastPublic: makeEvent('ev-f', {
    title: 'Past Public Event',
    status: 'completed',
    starts_at: '2025-12-01T10:00:00.000Z',
  }),
  proposed: makeEvent('ev-g', {
    title: 'Proposed Event',
    status: 'proposed',
    starts_at: '2099-08-01T10:00:00.000Z',
  }),
}

const ALL_EVENTS = Object.values(EVT)

function attendance(
  id: string,
  event: EventRecord,
  userId: string,
): EventAttendanceRecord {
  return {
    id,
    event: event.id,
    user: userId,
    role: 'attendee',
    confirmed: false,
    xp_awarded: false,
    created: '2026-08-20T10:00:00.000Z',
    expand: { event },
  }
}

// Caller's schedule plus a *foreign* attendance on an upcoming event that must
// not flip `attending` for it (ACL scope: attendance is personal).
const ATTENDANCE: EventAttendanceRecord[] = [
  attendance('att-1', EVT.attendedUpcoming, MEMBER_ID),
  attendance('att-2', EVT.attendedPast, MEMBER_ID),
  attendance('att-3', EVT.attendedPrivateFuture, MEMBER_ID),
  attendance('att-other', EVT.upcomingPublic, OTHER_ID),
]

// ─── Mini PocketBase filter evaluator ───────────────────────────────────────
// The route builds declarative filters; our fake admin evaluates them against
// fixture rows so exclusion/isolation logic is genuinely exercised.

function matchesFilter(
  filter: string | undefined,
  row: Record<string, unknown>,
): boolean {
  if (!filter) return true
  const tokens = tokenize(filter)
  const parser = new Parser(tokens)
  return parser.parse()(row)
}

function tokenize(filter: string) {
  const tokens: Token[] = []
  let i = 0
  while (i < filter.length) {
    const c = filter[i]
    if (c === '(' || c === ')') {
      tokens.push({ type: c })
      i++
    } else if (c === ' ') {
      i++
    } else if (filter.startsWith('&&', i)) {
      tokens.push({ type: '&&' })
      i += 2
    } else if (filter.startsWith('||', i)) {
      tokens.push({ type: '||' })
      i += 2
    } else if (filter.startsWith('>=', i)) {
      tokens.push({ type: '>=' })
      i += 2
    } else if (c === '=') {
      tokens.push({ type: '=' })
      i++
    } else if (c === '"') {
      const end = filter.indexOf('"', i + 1)
      tokens.push({ type: 'str', value: filter.slice(i + 1, end) })
      i = end + 1
    } else {
      const m = /^[a-z_]+/.exec(filter.slice(i))
      if (!m) throw new Error(`unexpected token near "${filter.slice(i)}"`)
      tokens.push({ type: 'id', value: m[0] })
      i += m[0].length
    }
  }
  return tokens
}

type Token =
  { type: '(' | ')' | '&&' | '||' | '=' | '>=' } | { type: 'id' | 'str'; value: string }

class Parser {
  private pos = 0
  constructor(private tokens: Token[]) {}

  parse(): (row: Record<string, unknown>) => boolean {
    const expr = this.parseOr()
    return expr
  }

  private parseOr(): (row: Record<string, unknown>) => boolean {
    let left = this.parseAnd()
    while (this.peek('||')) {
      this.pos++
      const right = this.parseAnd()
      const l = left
      left = (row: Record<string, unknown>) => l(row) || right(row)
    }
    return left
  }

  private parseAnd(): (row: Record<string, unknown>) => boolean {
    let left = this.parsePrimary()
    while (this.peek('&&')) {
      this.pos++
      const right = this.parsePrimary()
      const l = left
      left = (row: Record<string, unknown>) => l(row) && right(row)
    }
    return left
  }

  private parsePrimary(): (row: Record<string, unknown>) => boolean {
    const t = this.tokens[this.pos]!
    if (t.type === '(') {
      this.pos++
      const inner = this.parseOr()
      if (this.tokens[this.pos]?.type !== ')') throw new Error('missing )')
      this.pos++
      return inner
    }
    if (t.type !== 'id') throw new Error(`expected id, got ${t.type}`)
    const field = t.value
    this.pos++
    const op = this.tokens[this.pos]!
    this.pos++
    const value = this.tokens[this.pos]!
    this.pos++
    if (value.type !== 'str' && value.type !== 'id') {
      throw new Error(`expected a value after ${op.type}`)
    }
    if (op.type === '>=') {
      const expected = value.value
      return (row: Record<string, unknown>) => (row[field] as string) >= expected
    }
    const expected = value.type === 'id' ? value.value === 'true' : value.value
    return (row: Record<string, unknown>) => row[field] === expected
  }

  private peek(type: Token['type']): boolean {
    return this.tokens[this.pos]?.type === type
  }
}

// ─── Fake PocketBase ────────────────────────────────────────────────────────

interface AdminData {
  users?: UserRecord[]
  events?: EventRecord[]
  attendance?: EventAttendanceRecord[]
  failCollection?: string
}

function fakeAdmin({
  users = [],
  events = [],
  attendance = [],
  failCollection,
}: AdminData): PocketBase {
  return {
    filter: (str: string, params: Record<string, unknown>) =>
      str.replace(/\{:([a-zA-Z0-9_]+)\}/g, (_match, name: string) =>
        JSON.stringify(params[name]),
      ),
    collection: (name: string) => ({
      getOne: async (id: string) => {
        if (failCollection === name) throw new ClientResponseError({ status: 500 })
        if (name === 'users') {
          const row = users.find((r) => r.id === id)
          if (!row) throw new ClientResponseError({ status: 404 })
          return row
        }
        if (name === 'events') {
          const row = events.find((r) => r.id === id)
          if (!row) throw new ClientResponseError({ status: 404 })
          return row
        }
        throw new Error(`unexpected getOne on ${name}`)
      },
      getFullList: async (opts?: { filter?: string; sort?: string; expand?: string }) => {
        if (failCollection === name) throw new ClientResponseError({ status: 500 })
        if (name === 'event_attendance') {
          return attendance.filter((r) =>
            matchesFilter(opts?.filter, r as unknown as Record<string, unknown>),
          )
        }
        if (name === 'events') {
          const rows = events.filter((r) =>
            matchesFilter(opts?.filter, r as unknown as Record<string, unknown>),
          )
          if (opts?.sort === 'starts_at') {
            rows.sort((a, b) => a.starts_at.localeCompare(b.starts_at))
          }
          return rows
        }
        throw new Error(`unexpected getFullList on ${name}`)
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
  const req = new NextRequest(`http://localhost/api/dashboard/events${url ?? ''}`)
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
    givenAdmin({ users: [LEADER], events: [], attendance: [] })

    const { status } = await callGet()

    expect(status).toBe(200)
  })
})

// ─── Union, dedupe, ordering ────────────────────────────────────────────────

describe('event list', () => {
  it('returns attended events plus public upcoming ones, sorted by starts_at asc', async () => {
    givenSession(MEMBER)
    givenAdmin({ users: [MEMBER], events: ALL_EVENTS, attendance: ATTENDANCE })

    const { status, body } = await callGet()

    expect(status).toBe(200)
    const res = body as {
      data: Array<{ id: string; attending: boolean }>
      totalItems: number
    }
    const expected = ['ev-b', 'ev-a', 'ev-c', 'ev-d'] // asc by starts_at
    expect(res.data.map((e) => e.id)).toEqual(expected)
    expect(res.totalItems).toBe(4)
  })

  it('marks attending only for events the caller RSVP’d to', async () => {
    givenSession(MEMBER)
    givenAdmin({ users: [MEMBER], events: ALL_EVENTS, attendance: ATTENDANCE })

    const { body } = await callGet()
    const res = body as { data: Array<{ id: string; attending: boolean }> }
    expect(res.data.find((e) => e.id === 'ev-d')!.attending).toBe(false)
    expect(res.data.find((e) => e.id === 'ev-a')!.attending).toBe(true)
  })

  it('excludes cancelled, past non-attended, and proposed events', async () => {
    givenSession(MEMBER)
    givenAdmin({ users: [MEMBER], events: ALL_EVENTS, attendance: ATTENDANCE })

    const { body } = await callGet()
    const res = body as { data: Array<{ id: string }> }
    const ids = res.data.map((e) => e.id)
    expect(ids).not.toContain('ev-e') // cancelled → not open
    expect(ids).not.toContain('ev-f') // past public, never attended
    expect(ids).not.toContain('ev-g') // proposed → not yet open
  })

  it('includes an attended event even when it is private or past', async () => {
    givenSession(MEMBER)
    givenAdmin({ users: [MEMBER], events: ALL_EVENTS, attendance: ATTENDANCE })

    const { body } = await callGet()
    const res = body as { data: Array<{ id: string; attending: boolean }> }
    const ids = res.data.map((e) => e.id)
    expect(ids).toContain('ev-b') // past
    expect(ids).toContain('ev-c') // private (attended, so still "yours")
    expect(res.data.find((e) => e.id === 'ev-c')!.attending).toBe(true)
  })

  it('dedupes an event that is both attended and upcoming', async () => {
    givenSession(MEMBER)
    givenAdmin({ users: [MEMBER], events: ALL_EVENTS, attendance: ATTENDANCE })

    const { body } = await callGet()
    const res = body as { data: Array<{ id: string }>; totalItems: number }
    const ids = res.data.map((e) => e.id)
    expect(ids.filter((id) => id === 'ev-a')).toHaveLength(1)
    expect(res.totalItems).toBe(4)
  })

  it("a foreign member's attendance never flips `attending`", async () => {
    givenSession(MEMBER)
    givenAdmin({ users: [MEMBER], events: ALL_EVENTS, attendance: ATTENDANCE })

    const { body } = await callGet()
    const res = body as { data: Array<{ id: string; attending: boolean }> }
    // ev-d is attended by OTHER_ID only — the caller must see attending: false.
    expect(res.data.find((e) => e.id === 'ev-d')!.attending).toBe(false)
  })

  it('projects only whitelisted fields plus attending', async () => {
    givenSession(MEMBER)
    givenAdmin({ users: [MEMBER], events: ALL_EVENTS, attendance: ATTENDANCE })

    const { body } = await callGet()
    const res = body as { data: Array<Record<string, unknown>> }
    const keys = Object.keys(res.data[0]!).sort()
    expect(keys).toEqual(
      [
        'id',
        'title',
        'type',
        'status',
        'starts_at',
        'ends_at',
        'location',
        'is_public',
        'attendance_count',
        'attending',
      ].sort(),
    )
    // No attendance records, users, or expand payloads leak out.
    expect(JSON.stringify(res.data)).not.toContain('expand')
    expect(JSON.stringify(res.data)).not.toContain('other')
  })

  it('returns an empty list when there is nothing relevant', async () => {
    givenSession(MEMBER)
    givenAdmin({ users: [MEMBER], events: [EVT.cancelled], attendance: [] })

    const { status, body } = await callGet()

    expect(status).toBe(200)
    const res = body as { data: unknown[]; totalItems: number; totalPages: number }
    expect(res.data).toEqual([])
    expect(res.totalItems).toBe(0)
    expect(res.totalPages).toBe(0)
  })
})

// ─── Pagination ─────────────────────────────────────────────────────────────

describe('pagination', () => {
  it('defaults to page 1 with 20 items per page', async () => {
    givenSession(MEMBER)
    givenAdmin({ users: [MEMBER], events: ALL_EVENTS, attendance: ATTENDANCE })

    const { body } = await callGet()
    const res = body as {
      page: number
      perPage: number
      totalItems: number
      totalPages: number
    }

    expect(res.page).toBe(1)
    expect(res.perPage).toBe(20)
    expect(res.totalItems).toBe(4)
    expect(res.totalPages).toBe(1)
  })

  it('slices the merged set by page/perPage', async () => {
    givenSession(MEMBER)
    givenAdmin({ users: [MEMBER], events: ALL_EVENTS, attendance: ATTENDANCE })

    const first = (await callGet('?page=1&perPage=2')).body as {
      data: Array<{ id: string }>
    }
    const second = (await callGet('?page=2&perPage=2')).body as {
      data: Array<{ id: string }>
    }

    expect(first.data.map((e) => e.id)).toEqual(['ev-b', 'ev-a'])
    expect(second.data.map((e) => e.id)).toEqual(['ev-c', 'ev-d'])
  })

  it('returns an empty page beyond the range but keeps totals', async () => {
    givenSession(MEMBER)
    givenAdmin({ users: [MEMBER], events: ALL_EVENTS, attendance: ATTENDANCE })

    const { status, body } = await callGet('?page=99&perPage=20')

    expect(status).toBe(200)
    const res = body as { data: unknown[]; totalItems: number }
    expect(res.data).toEqual([])
    expect(res.totalItems).toBe(4)
  })

  it('rejects page < 1 with 400 invalid_input', async () => {
    givenSession(MEMBER)

    const { status, body } = await callGet('?page=0')

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
})

// ─── Failure mapping ────────────────────────────────────────────────────────

describe('failure mapping', () => {
  it('maps a PocketBase outage to an opaque 500 internal envelope', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    givenSession(MEMBER)
    givenAdmin({
      users: [MEMBER],
      events: ALL_EVENTS,
      attendance: ATTENDANCE,
      failCollection: 'events',
    })

    const { status, body } = await callGet()

    expect(status).toBe(500)
    expect(body).toEqual({ error: { code: 'internal', message: 'Server error' } })
    expect(consoleSpy).toHaveBeenCalled()
  })
})
