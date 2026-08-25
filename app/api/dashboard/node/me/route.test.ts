import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ClientResponseError } from 'pocketbase'
import type PocketBase from 'pocketbase'
import { GET } from './route'
import { AUTH_COOKIE } from '@/lib/constants'
import type { UserRecord } from '@/types/pocketbase'

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

interface AdminData {
  users?: UserRecord[]
}

function fakeAdmin({ users = [] }: AdminData = {}): PocketBase {
  return {
    filter: (str: string, params: Record<string, unknown>) =>
      str.replace(/\{:([a-zA-Z0-9_]+)\}/g, (_match: string, name: string) =>
        JSON.stringify(params[name]),
      ),
    collection: (name: string) => ({
      getOne: async (id: string) => {
        if (name !== 'users') throw new Error(`unexpected getOne on ${name}`)
        const row = users.find((r) => r.id === id)
        if (!row) throw new ClientResponseError({ status: 404 })
        return row
      },
      getFirstListItem: async () => {
        throw new ClientResponseError({ status: 404 })
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
    givenSession(LEADER_USER_A)
    givenAdmin({ users: [LEADER_USER_A] })

    const { status } = await callGet()

    expect(status).toBe(200)
  })
})
