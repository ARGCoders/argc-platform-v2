import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { ClientResponseError } from 'pocketbase'
import type PocketBase from 'pocketbase'
import { POST } from './route'
import { AUTH_COOKIE } from '@/lib/constants'
import type { EventAttendanceRecord, EventRecord, UserRecord } from '@/types/pocketbase'

vi.mock('next/headers', () => ({ cookies: vi.fn() }))
vi.mock('@/lib/pocketbase-server', () => ({
  getAdminClient: vi.fn(),
  getPocketBaseClient: vi.fn(),
}))

import { cookies } from 'next/headers'
import { getAdminClient, getPocketBaseClient } from '@/lib/pocketbase-server'

// ─── Fixtures ───────────────────────────────────────────────────────────────

const MEMBER_ID = 'u-member'

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
    organized_by: 'u-organizer',
    status: 'approved',
    starts_at: '2099-12-31T18:00:00.000Z',
    is_public: true,
    attendance_count: 0,
    xp_awarded: false,
    created: '2026-08-01T00:00:00.000Z',
    updated: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}

const OPEN = makeEvent('ev-open')
const CANCELLED = makeEvent('ev-cancelled', { status: 'cancelled' })
const PROPOSED = makeEvent('ev-proposed', { status: 'proposed' })
const PAST = makeEvent('ev-past', { starts_at: '2020-01-01T10:00:00.000Z' })

function attendanceRow(id: string, eventId: string): EventAttendanceRecord {
  return {
    id,
    event: eventId,
    user: MEMBER_ID,
    role: 'attendee',
    confirmed: false,
    xp_awarded: false,
    created: '2026-08-20T10:00:00.000Z',
  }
}

// ─── Fake PocketBase ────────────────────────────────────────────────────────

interface AdminData {
  users?: UserRecord[]
  events?: EventRecord[]
  attendance?: EventAttendanceRecord[]
  createError?: (err: Error) => boolean
}

function fakeAdmin({
  users = [],
  events = [],
  attendance = [],
  createError,
}: AdminData): PocketBase {
  const findAttendance = (filter: string) => {
    const rows = attendance.filter((row) => {
      const match = (field: string) => {
        const re = new RegExp(`${field} = ("(?:[^"\\\\]|\\\\.)*")`)
        const m = filter.match(re)
        return m
          ? JSON.parse(m[1]!) === (row[field as keyof EventAttendanceRecord] as string)
          : false
      }
      return match('event') && match('user')
    })
    return rows.at(0) ?? null
  }

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
        if (name === 'events') {
          const row = events.find((r) => r.id === id)
          if (!row) throw new ClientResponseError({ status: 404 })
          return row
        }
        throw new Error(`unexpected getOne on ${name}`)
      },
      getFirstListItem: async (filter: string) => {
        const row = findAttendance(filter)
        if (!row) throw new ClientResponseError({ status: 404 })
        return row
      },
      create: async (data: Record<string, unknown>) => {
        if (createError?.(new Error(data.event as string))) {
          throw new ClientResponseError({ status: 400 })
        }
        const record: EventAttendanceRecord = {
          id: `att-new-${attendance.length + 1}`,
          event: data.event as string,
          user: data.user as string,
          role: data.role as EventAttendanceRecord['role'],
          confirmed: data.confirmed as boolean,
          xp_awarded: data.xp_awarded as boolean,
          created: '2026-08-20T10:00:00.000Z',
        }
        attendance.push(record)
        return record
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

async function callPost(eventId: string): Promise<{ status: number; body: unknown }> {
  const req = new NextRequest(`http://localhost/api/dashboard/events/${eventId}/rsvp`, {
    method: 'POST',
  })
  const res = await POST(req, { params: Promise.resolve({ id: eventId }) })
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

    const { status, body } = await callPost('ev-open')

    expect(status).toBe(401)
    expect(body).toEqual({
      error: { code: 'unauthorized', message: 'Not authenticated' },
    })
  })

  it('answers 403 forbidden for a guest', async () => {
    givenSession(GUEST)
    givenAdmin({ users: [GUEST] })

    const { status, body } = await callPost('ev-open')

    expect(status).toBe(403)
    expect(body).toEqual({
      error: { code: 'forbidden', message: 'Insufficient permissions' },
    })
  })

  it('lets a node leader through (route is M+)', async () => {
    givenSession(LEADER)
    givenAdmin({ users: [LEADER], events: [OPEN] })

    const { status } = await callPost('ev-open')

    expect(status).toBe(201)
  })
})

// ─── Guardian checks ────────────────────────────────────────────────────────

describe('event must be open for RSVP', () => {
  it('answers 404 for an unknown event', async () => {
    givenSession(MEMBER)
    givenAdmin({ users: [MEMBER], events: [OPEN] })

    const { status, body } = await callPost('ev-nope')

    expect(status).toBe(404)
    expect(body).toEqual({ error: { code: 'not_found', message: 'Event not found' } })
  })

  it('answers 409 for a cancelled event', async () => {
    givenSession(MEMBER)
    givenAdmin({ users: [MEMBER], events: [CANCELLED] })

    const { status, body } = await callPost('ev-cancelled')

    expect(status).toBe(409)
    expect(body).toEqual({
      error: { code: 'conflict', message: 'Event not open for RSVP' },
    })
  })

  it('answers 409 for a proposed event (not yet approved)', async () => {
    givenSession(MEMBER)
    givenAdmin({ users: [MEMBER], events: [PROPOSED] })

    const { status, body } = await callPost('ev-proposed')

    expect(status).toBe(409)
    expect(body).toEqual({
      error: { code: 'conflict', message: 'Event not open for RSVP' },
    })
  })

  it('answers 409 for an approved event whose start has passed', async () => {
    givenSession(MEMBER)
    givenAdmin({ users: [MEMBER], events: [PAST] })

    const { status, body } = await callPost('ev-past')

    expect(status).toBe(409)
    expect(body).toEqual({
      error: { code: 'conflict', message: 'Event not open for RSVP' },
    })
  })
})

// ─── Happy path ─────────────────────────────────────────────────────────────

describe('casting an RSVP', () => {
  it('creates an attendee row and returns it as 201', async () => {
    givenSession(MEMBER)
    givenAdmin({ users: [MEMBER], events: [OPEN] })

    const { status, body } = await callPost('ev-open')

    expect(status).toBe(201)
    const res = body as { data: EventAttendanceRecord }
    expect(res.data).toMatchObject({
      event: 'ev-open',
      user: MEMBER_ID,
      role: 'attendee',
      confirmed: false,
      xp_awarded: false,
    })
  })

  it('returns the existing row as a 200 replay on a second click', async () => {
    givenSession(MEMBER)
    const existing = attendanceRow('att-1', 'ev-open')
    givenAdmin({ users: [MEMBER], events: [OPEN], attendance: [existing] })

    const { status, body } = await callPost('ev-open')

    expect(status).toBe(200)
    expect(body).toEqual({ data: existing })
  })

  it('treats a duplicate created by a race as a 200 replay, never an error', async () => {
    givenSession(MEMBER)
    const raced = attendanceRow('att-2', 'ev-open')
    givenAdmin({
      users: [MEMBER],
      events: [OPEN],
      attendance: [raced],
      createError: () => true, // simulate the row landing between check and write
    })

    const { status, body } = await callPost('ev-open')

    expect(status).toBe(200)
    expect(body).toEqual({ data: raced })
  })

  it('returns 200 with the same id across repeated submissions', async () => {
    givenSession(MEMBER)
    givenAdmin({ users: [MEMBER], events: [OPEN] })

    const first = await callPost('ev-open')
    const second = await callPost('ev-open')

    expect(first.status).toBe(201)
    expect(second.status).toBe(200)
    const a = (first.body as { data: EventAttendanceRecord }).data
    const b = (second.body as { data: EventAttendanceRecord }).data
    expect(a.id).toBe(b.id)
  })
})

// ─── Failure mapping ────────────────────────────────────────────────────────

describe('failure mapping', () => {
  it('maps a PocketBase outage to an opaque 500 internal envelope', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    givenSession(MEMBER)
    const admin = fakeAdmin({ users: [MEMBER], events: [OPEN] })
    vi.mocked(getAdminClient).mockResolvedValue({
      ...admin,
      collection: (name: string) => {
        if (name === 'events') {
          return {
            getOne: async () => {
              throw new ClientResponseError({ status: 500 })
            },
          }
        }
        return admin.collection(name)
      },
    } as PocketBase)

    const { status, body } = await callPost('ev-open')

    expect(status).toBe(500)
    expect(body).toEqual({ error: { code: 'internal', message: 'Server error' } })
    expect(consoleSpy).toHaveBeenCalled()
  })
})
