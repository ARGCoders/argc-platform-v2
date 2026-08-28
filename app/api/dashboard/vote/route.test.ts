import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { ClientResponseError } from 'pocketbase'
import type PocketBase from 'pocketbase'
import { POST } from './route'
import { AUTH_COOKIE } from '@/lib/constants'
import type {
  AdvancementCycleRecord,
  NodeMemberRecord,
  UserRecord,
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
const SUBJECT_ID = 'u-subject'
const SAME_NODE_ID = 'u-same-node'

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
  votes?: VoteRecord[]
  ledger?: Identifiable[]
  stats?: (Identifiable & Record<string, unknown>)[]
  ledgerCreateError?: Error
  statsUpdateError?: Error
}

interface FakeAdminLog {
  ledgerCreates: number
  votesCreated: Record<string, unknown>[]
  voteDeletes: string[]
  ledgerReferenceIds: string[]
}

type FakeAdmin = PocketBase & {
  log: FakeAdminLog
  statsFor: (
    userId: string,
    cycleId: string,
  ) => (Identifiable & Record<string, unknown>) | null
}

function fakeAdmin(data: AdminData): FakeAdmin {
  const ledger = [...(data.ledger ?? [])]
  const stats = [...(data.stats ?? [])]
  const votes = [...(data.votes ?? [])]
  const log: FakeAdminLog = {
    ledgerCreates: 0,
    votesCreated: [],
    voteDeletes: [],
    ledgerReferenceIds: [],
  }
  let voteCounter = 0

  const pb = {
    filter: (str: string, params: Record<string, unknown>) =>
      str.replace(/\{:([a-zA-Z0-9_]+)\}/g, (_match, name: string) =>
        JSON.stringify(params[name]),
      ),
    log,
    statsFor: (userId: string, cycleId: string) =>
      stats.find((s) => s.user === userId && s.cycle === cycleId) ?? null,
    collection: (name: string) => ({
      getOne: async (id: string) => {
        if (name !== 'users') throw new Error(`unexpected getOne on ${name}`)
        const row = (data.users ?? []).find((u) => u.id === id)
        if (!row) throw new ClientResponseError({ status: 404 })
        return row
      },
      getFirstListItem: async (filter: string) => {
        const rows: Identifiable[] =
          name === 'advancement_cycles'
            ? (data.cycles ?? [])
            : name === 'node_member'
              ? (data.memberships ?? [])
              : name === 'xp_ledger'
                ? ledger
                : name === 'user_stats'
                  ? stats
                  : []
        const row = evaluateClauses(filter, rows).at(0)
        if (!row) throw new ClientResponseError({ status: 404 })
        return row
      },
      getFullList: async (opts?: { filter?: string }) => {
        if (name !== 'votes') return []
        return opts?.filter ? evaluateClauses(opts.filter, votes) : votes
      },
      create: async (payload: Record<string, unknown>) => {
        if (name === 'votes') {
          voteCounter += 1
          const record = {
            id: `vote-${voteCounter}`,
            ...payload,
            created: '2026-08-25T10:00:00.000Z',
          }
          votes.push(record as unknown as VoteRecord)
          log.votesCreated.push(record)
          return record
        }
        if (name === 'xp_ledger') {
          if (data.ledgerCreateError) throw data.ledgerCreateError
          log.ledgerCreates += 1
          log.ledgerReferenceIds.push(payload['reference_id'] as string)
          const record = { id: `ledger-${log.ledgerCreates}`, ...payload }
          ledger.push(record)
          return record
        }
        if (name === 'user_stats') {
          const record = { id: `stats-new-${stats.length}`, ...payload }
          stats.push(record)
          return record
        }
        throw new Error(`unexpected create on ${name}`)
      },
      update: async (id: string, payload: Record<string, unknown>) => {
        if (name !== 'user_stats') throw new Error(`unexpected update on ${name}`)
        if (data.statsUpdateError) throw data.statsUpdateError
        const idx = stats.findIndex((s) => s.id === id)
        if (idx === -1) throw new ClientResponseError({ status: 404 })
        stats[idx] = { ...stats[idx]!, ...payload }
        return stats[idx]
      },
      delete: async (id: string) => {
        if (name !== 'votes') throw new Error(`unexpected delete on ${name}`)
        log.voteDeletes.push(id)
        return true
      },
    }),
  }
  return pb as unknown as FakeAdmin
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
  const admin = fakeAdmin(data)
  vi.mocked(getAdminClient).mockResolvedValue(admin as unknown as PocketBase)
  return admin
}

function defaultData(): AdminData {
  return {
    users: [MEMBER, makeUser(SUBJECT_ID), makeUser(SAME_NODE_ID)],
    cycles: [CYCLE],
    memberships: [
      makeMembership('nm-member', MEMBER_ID, 'n-alpha'),
      makeMembership('nm-subject', SUBJECT_ID, 'n-beta'),
      makeMembership('nm-same', SAME_NODE_ID, 'n-alpha'),
    ],
    votes: [],
    ledger: [],
    stats: [],
  }
}

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    subject: SUBJECT_ID,
    polarity: 'positive',
    reason: 'consistent contributor all cycle',
    ...overrides,
  }
}

const VALID_BODY = JSON.stringify(validPayload())

async function callPost(body: string | null): Promise<{
  status: number
  body: unknown
  admin?: ReturnType<typeof fakeAdmin>
}> {
  const req = new NextRequest('http://localhost/api/dashboard/vote', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body ?? undefined,
  })
  const res = await POST(req)
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

    const { status, body } = await callPost(VALID_BODY)

    expect(status).toBe(401)
    expect(body).toEqual({
      error: { code: 'unauthorized', message: 'Not authenticated' },
    })
  })

  it('answers 403 forbidden for a guest', async () => {
    givenSession(GUEST)
    givenAdmin({ users: [GUEST] })

    const { status, body } = await callPost(VALID_BODY)

    expect(status).toBe(403)
    expect(body).toEqual({
      error: { code: 'forbidden', message: 'Insufficient permissions' },
    })
  })
})

// ─── Body validation ────────────────────────────────────────────────────────

describe('body validation', () => {
  it('rejects a malformed JSON body with 400 invalid_input', async () => {
    givenSession(MEMBER)
    givenAdmin(defaultData())

    const { status, body } = await callPost('not-json{')

    expect(status).toBe(400)
    expect(body).toEqual({
      error: { code: 'invalid_input', message: 'Request body must be JSON' },
    })
  })

  it('rejects a missing subject', async () => {
    givenSession(MEMBER)
    givenAdmin(defaultData())

    const { status, body } = await callPost(JSON.stringify(validPayload({ subject: '' })))

    expect(status).toBe(400)
    expect(body).toEqual({
      error: { code: 'invalid_input', message: 'subject must be a member id' },
    })
  })

  it('rejects an unknown polarity', async () => {
    givenSession(MEMBER)
    givenAdmin(defaultData())

    const { status, body } = await callPost(
      JSON.stringify(validPayload({ polarity: 'neutral' })),
    )

    expect(status).toBe(400)
    expect(body).toEqual({
      error: {
        code: 'invalid_input',
        message: 'polarity must be "positive" or "negative"',
      },
    })
  })

  it('rejects a reason shorter than 10 characters', async () => {
    givenSession(MEMBER)
    givenAdmin(defaultData())

    const { status, body } = await callPost(
      JSON.stringify(validPayload({ reason: 'short' })),
    )

    expect(status).toBe(400)
    expect(body).toEqual({
      error: {
        code: 'invalid_input',
        message: 'reason must be between 10 and 500 characters',
      },
    })
  })

  it('rejects a reason longer than 500 characters', async () => {
    givenSession(MEMBER)
    givenAdmin(defaultData())

    const { status, body } = await callPost(
      JSON.stringify(validPayload({ reason: 'x'.repeat(501) })),
    )

    expect(status).toBe(400)
    expect(body).toEqual({
      error: {
        code: 'invalid_input',
        message: 'reason must be between 10 and 500 characters',
      },
    })
  })

  it('trims surrounding whitespace before validating the reason', async () => {
    givenSession(MEMBER)
    givenAdmin(defaultData())

    const { status, body } = await callPost(
      JSON.stringify(validPayload({ reason: '   short   ' })),
    )

    expect(status).toBe(400)
    expect(body).toEqual({
      error: {
        code: 'invalid_input',
        message: 'reason must be between 10 and 500 characters',
      },
    })
  })
})

// ─── Domain validation ──────────────────────────────────────────────────────

describe('domain validation', () => {
  it('answers 409 when no cycle is active', async () => {
    givenSession(MEMBER)
    givenAdmin({ ...defaultData(), cycles: [] })

    const { status, body } = await callPost(VALID_BODY)

    expect(status).toBe(409)
    expect(body).toEqual({
      error: { code: 'conflict', message: 'No active cycle is open for voting' },
    })
  })

  it('rejects a member who is not in a node', async () => {
    givenSession(MEMBER)
    givenAdmin({ ...defaultData(), memberships: [] })

    const { status, body } = await callPost(VALID_BODY)

    expect(status).toBe(400)
    expect(body).toEqual({ error: { code: 'invalid_input', message: 'Not in a node' } })
  })

  it('rejects an unknown subject', async () => {
    givenSession(MEMBER)
    givenAdmin({ ...defaultData(), users: [MEMBER, makeUser(SAME_NODE_ID)] })

    const { status, body } = await callPost(VALID_BODY)

    expect(status).toBe(400)
    expect(body).toEqual({ error: { code: 'invalid_input', message: 'Unknown subject' } })
  })

  it('rejects voting for yourself', async () => {
    givenSession(MEMBER)
    givenAdmin(defaultData())

    const { status, body } = await callPost(
      JSON.stringify(validPayload({ subject: MEMBER_ID })),
    )

    expect(status).toBe(400)
    expect(body).toEqual({
      error: { code: 'invalid_input', message: 'Cannot vote for yourself' },
    })
  })

  it('rejects a subject in the caller’s own node', async () => {
    givenSession(MEMBER)
    givenAdmin(defaultData())

    const { status, body } = await callPost(
      JSON.stringify(validPayload({ subject: SAME_NODE_ID })),
    )

    expect(status).toBe(400)
    expect(body).toEqual({
      error: { code: 'invalid_input', message: 'Subject must be in a different node' },
    })
  })

  it('rejects a subject who is not an active member of any node', async () => {
    givenSession(MEMBER)
    const data = defaultData()
    data.memberships = [makeMembership('nm-member', MEMBER_ID, 'n-alpha')]
    givenAdmin(data)

    const { status, body } = await callPost(VALID_BODY)

    expect(status).toBe(400)
    expect(body).toEqual({
      error: { code: 'invalid_input', message: 'Subject must be in a different node' },
    })
  })

  it('answers 409 after the vote budget for the polarity is spent', async () => {
    givenSession(MEMBER)
    const data = defaultData()
    data.votes = [
      {
        id: 'existing-positive',
        voter: MEMBER_ID,
        subject: SAME_NODE_ID,
        cycle: CYCLE.id,
        polarity: 'positive',
        reason: 'already spent this one',
        is_cross_node: true,
        created: '2026-08-20T10:00:00.000Z',
      },
    ]
    const admin = givenAdmin(data)

    const { status, body } = await callPost(VALID_BODY)

    expect(status).toBe(409)
    expect(body).toEqual({
      error: {
        code: 'conflict',
        message: 'You have already used your positive vote this cycle',
      },
    })
    expect(admin.log.votesCreated).toHaveLength(0)
    expect(admin.log.ledgerCreates).toBe(0)
  })
})

// ─── Happy path ─────────────────────────────────────────────────────────────

describe('casting a vote', () => {
  it('creates the vote and awards the subject XP once, returning 201', async () => {
    givenSession(MEMBER)
    const admin = givenAdmin(defaultData())

    const { status, body } = await callPost(VALID_BODY)

    expect(status).toBe(201)
    const res = body as {
      data: {
        id: string
        subject: string
        cycle: string
        polarity: string
        reason: string
        is_cross_node: boolean
      }
    }
    expect(res.data).toEqual({
      id: 'vote-1',
      subject: SUBJECT_ID,
      cycle: CYCLE.id,
      polarity: 'positive',
      reason: 'consistent contributor all cycle',
      is_cross_node: true,
      xp_awarded: true,
      created: '2026-08-25T10:00:00.000Z',
    })
    expect(res.data).not.toHaveProperty('voter')

    expect(admin.log.votesCreated).toHaveLength(1)
    expect(admin.log.votesCreated[0]).toMatchObject({
      voter: MEMBER_ID,
      subject: SUBJECT_ID,
      cycle: CYCLE.id,
      polarity: 'positive',
      is_cross_node: true,
    })

    // awardXp: ledger row for the subject, amount 25, referenced by the vote.
    expect(admin.log.ledgerCreates).toBe(1)
    expect(admin.log.ledgerReferenceIds).toEqual(['vote-1'])

    // user_stats row for the subject now carries the award.
    const stats = admin.statsFor(SUBJECT_ID, CYCLE.id)
    expect(stats).not.toBeNull()
    expect(stats!.xp_total).toBe(25)
    expect(stats!.votes_received_positive).toBe(1)
  })

  it('awards no XP for a negative vote but still creates it', async () => {
    givenSession(MEMBER)
    const admin = givenAdmin(defaultData())

    const { status, body } = await callPost(
      JSON.stringify(
        validPayload({
          polarity: 'negative',
          reason: 'missed its commitments three times',
        }),
      ),
    )

    expect(status).toBe(201)
    expect((body as { data: { xp_awarded: boolean } }).data.xp_awarded).toBe(false)
    expect(admin.log.votesCreated[0]).toMatchObject({ polarity: 'negative' })
    expect(admin.log.ledgerCreates).toBe(0)
  })

  it('cannot double-pay: a retried submission hits the budget, one ledger row', async () => {
    givenSession(MEMBER)
    const admin = givenAdmin(defaultData())

    const first = await callPost(VALID_BODY)
    expect(first.status).toBe(201)

    const second = await callPost(VALID_BODY)
    expect(second.status).toBe(409)

    expect(admin.log.votesCreated).toHaveLength(1)
    expect(admin.log.ledgerCreates).toBe(1)
  })

  it('keeps the vote, reports xp_awarded false, and returns 201 when the award fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    givenSession(MEMBER)
    const admin = givenAdmin({
      ...defaultData(),
      ledgerCreateError: new ClientResponseError({ status: 500 }),
    })

    const { status, body } = await callPost(VALID_BODY)

    // The vote was created and the budget is spent — the HTTP response must
    // say so honestly, or a retrying client would chase a misleading 500 into
    // a "budget already used" 409. Recovery is a manual ADMIN-02 award keyed
    // to the vote id.
    expect(status).toBe(201)
    expect((body as { data: { xp_awarded: boolean } }).data.xp_awarded).toBe(false)
    expect(admin.log.votesCreated).toHaveLength(1)
    expect(admin.log.voteDeletes).toHaveLength(0)
    expect(admin.log.ledgerCreates).toBe(0)
    expect(consoleSpy).toHaveBeenCalled()
  })
})
