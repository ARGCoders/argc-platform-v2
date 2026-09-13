import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { ClientResponseError } from 'pocketbase'
import type PocketBase from 'pocketbase'
import { PATCH } from './route'
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

function isoDaysFromNow(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString()
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
  memberships?: NodeMemberRecord[]
  evaluations?: EvaluationRecord[]
  ledgerCreateError?: Error
}

interface FakeAdminLog {
  evalUpdates: Array<{ id: string; payload: Record<string, unknown> }>
  ledgerCreates: Record<string, unknown>[]
  statsCreated: number
}

type FakeAdmin = PocketBase & {
  log: FakeAdminLog
  failNextEvalUpdates: { count: number }
}

function fakeAdmin(data: AdminData): FakeAdmin {
  const evaluations = [...(data.evaluations ?? [])]
  const ledger: Identifiable[] = []
  const stats: (Identifiable & Record<string, unknown>)[] = []
  const log: FakeAdminLog = {
    evalUpdates: [],
    ledgerCreates: [],
    statsCreated: 0,
  }
  const failNextEvalUpdates = { count: 0 }

  const pb = {
    filter: (str: string, params: Record<string, unknown>) =>
      str.replace(/\{:([a-zA-Z0-9_]+)\}/g, (_match, name: string) =>
        JSON.stringify(params[name]),
      ),
    log,
    collection: (name: string) => ({
      getOne: async (id: string) => {
        if (name === 'users') {
          const row = (data.users ?? []).find((u) => u.id === id)
          if (!row) throw new ClientResponseError({ status: 404 })
          return row
        }
        if (name === 'evaluations') {
          const row = evaluations.find((e) => e.id === id)
          if (!row) throw new ClientResponseError({ status: 404 })
          return row
        }
        throw new Error(`unexpected getOne on ${name}`)
      },
      getFirstListItem: async (filter: string) => {
        const rows: Identifiable[] =
          name === 'node_member'
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
      create: async (payload: Record<string, unknown>) => {
        if (name === 'xp_ledger') {
          if (data.ledgerCreateError) throw data.ledgerCreateError
          const record = { id: `ledger-${log.ledgerCreates.length + 1}`, ...payload }
          ledger.push(record)
          log.ledgerCreates.push(payload)
          return record
        }
        if (name === 'user_stats') {
          const record = { id: `stats-${log.statsCreated + 1}`, ...payload }
          stats.push(record)
          log.statsCreated += 1
          return record
        }
        throw new Error(`unexpected create on ${name}`)
      },
      update: async (id: string, payload: Record<string, unknown>) => {
        if (name === 'user_stats') {
          const idx = stats.findIndex((s) => s.id === id)
          if (idx === -1) throw new ClientResponseError({ status: 404 })
          stats[idx] = { ...stats[idx]!, ...payload }
          return stats[idx]
        }
        if (name !== 'evaluations') throw new Error(`unexpected update on ${name}`)
        if (failNextEvalUpdates.count > 0) {
          failNextEvalUpdates.count -= 1
          throw new ClientResponseError({ status: 500 })
        }
        const idx = evaluations.findIndex((e) => e.id === id)
        if (idx === -1) throw new ClientResponseError({ status: 404 })
        evaluations[idx] = { ...evaluations[idx]!, ...payload }
        log.evalUpdates.push({ id, payload })
        return evaluations[idx]
      },
    }),
  }
  return {
    ...pb,
    failNextEvalUpdates,
  } as unknown as FakeAdmin
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

function defaultData(overrides: Partial<EvaluationRecord> = {}): AdminData {
  return {
    users: [LEADER, makeUser(M1_ID), makeUser(M2_ID), makeUser(FOREIGN_ID)],
    memberships: [
      makeMember(LEADER_ID, 'n-alpha', 'leader'),
      makeMember(M1_ID, 'n-alpha'),
      makeMember(M2_ID, 'n-alpha'),
      makeMember(FOREIGN_ID, 'n-beta'),
    ],
    evaluations: [makeEvaluation('eval-1', M1_ID, overrides)],
  }
}

function scheduleBody(overrides: Record<string, unknown> = {}) {
  return { status: 'scheduled', scheduled_at: isoDaysFromNow(1), ...overrides }
}

async function callPatch(
  id: string,
  body: string | null,
): Promise<{ status: number; body: unknown; admin?: FakeAdmin }> {
  const req = new NextRequest(`http://localhost/api/dashboard/node/evaluations/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: body ?? undefined,
  })
  const res = await PATCH(req, { params: Promise.resolve({ id }) })
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

    const { status, body } = await callPatch('eval-1', JSON.stringify(scheduleBody()))

    expect(status).toBe(401)
    expect(body).toEqual({
      error: { code: 'unauthorized', message: 'Not authenticated' },
    })
  })

  it('answers 403 forbidden for a guest', async () => {
    givenSession(GUEST)
    givenAdmin({ users: [GUEST] })

    const { status, body } = await callPatch('eval-1', JSON.stringify(scheduleBody()))

    expect(status).toBe(403)
    expect(body).toEqual({
      error: { code: 'forbidden', message: 'Insufficient permissions' },
    })
  })

  it('answers 403 forbidden when the caller does not lead a node', async () => {
    givenSession(LEADER)
    givenAdmin({ ...defaultData(), memberships: [] })

    const { status, body } = await callPatch('eval-1', JSON.stringify(scheduleBody()))

    expect(status).toBe(403)
    expect(body).toEqual({
      error: { code: 'forbidden', message: 'No node to lead' },
    })
  })

  it('answers 403 forbidden when the leadership row is left_at', async () => {
    givenSession(LEADER)
    const data = defaultData()
    data.memberships = [
      {
        ...makeMember(LEADER_ID, 'n-alpha', 'leader'),
        left_at: '2026-09-01T00:00:00.000Z',
      },
    ]
    givenAdmin(data)

    const { status } = await callPatch('eval-1', JSON.stringify(scheduleBody()))

    expect(status).toBe(403)
  })
})

// ─── Body validation ────────────────────────────────────────────────────────

describe('body validation', () => {
  it('rejects a malformed JSON body with 400 invalid_input', async () => {
    givenSession(LEADER)
    givenAdmin(defaultData())

    const { status, body } = await callPatch('eval-1', '{not-json')

    expect(status).toBe(400)
    expect(body).toEqual({
      error: { code: 'invalid_input', message: 'Malformed JSON body' },
    })
  })

  it('rejects an unknown status', async () => {
    givenSession(LEADER)
    givenAdmin(defaultData())

    const { status, body } = await callPatch(
      'eval-1',
      JSON.stringify({ status: 'archived' }),
    )

    expect(status).toBe(400)
    expect(body).toEqual({
      error: {
        code: 'invalid_input',
        message: 'status must be scheduled, completed, or missed',
      },
    })
  })

  it('rejects a missing status', async () => {
    givenSession(LEADER)
    givenAdmin(defaultData())

    const { status, body } = await callPatch('eval-1', JSON.stringify({}))

    expect(status).toBe(400)
    expect(body).toEqual({
      error: {
        code: 'invalid_input',
        message: 'status must be scheduled, completed, or missed',
      },
    })
  })
})

// ─── Existence and scope ────────────────────────────────────────────────────

describe('existence and ownership of the evaluation', () => {
  it('answers 404 for an unknown id', async () => {
    givenSession(LEADER)
    givenAdmin(defaultData())

    const { status, body } = await callPatch('eval-ghost', JSON.stringify(scheduleBody()))

    expect(status).toBe(404)
    expect(body).toEqual({
      error: { code: 'not_found', message: 'Evaluation not found' },
    })
  })

  it('answers 404 for an evaluation of another node’s member (no existence leak)', async () => {
    givenSession(LEADER)
    const data = defaultData()
    data.evaluations = [makeEvaluation('eval-foreign', FOREIGN_ID)]
    givenAdmin(data)

    const { status, body } = await callPatch(
      'eval-foreign',
      JSON.stringify(scheduleBody()),
    )

    expect(status).toBe(404)
    expect(body).toEqual({
      error: { code: 'not_found', message: 'Evaluation not found' },
    })
  })
})

// ─── Transitions: pending → scheduled ──────────────────────────────────────

describe('pending → scheduled', () => {
  it('requires scheduled_at', async () => {
    givenSession(LEADER)
    givenAdmin(defaultData())

    const { status, body } = await callPatch(
      'eval-1',
      JSON.stringify(scheduleBody({ scheduled_at: undefined })),
    )

    expect(status).toBe(400)
    expect(body).toEqual({
      error: { code: 'invalid_input', message: 'scheduled_at must be an ISO date' },
    })
  })

  it('rejects a non-ISO scheduled_at', async () => {
    givenSession(LEADER)
    givenAdmin(defaultData())

    const { status, body } = await callPatch(
      'eval-1',
      JSON.stringify(scheduleBody({ scheduled_at: 'soon' })),
    )

    expect(status).toBe(400)
    expect(body).toEqual({
      error: { code: 'invalid_input', message: 'scheduled_at must be an ISO date' },
    })
  })

  it('rejects a non-string evaluator_id', async () => {
    givenSession(LEADER)
    givenAdmin(defaultData())

    const { status, body } = await callPatch(
      'eval-1',
      JSON.stringify(scheduleBody({ evaluator_id: 42 })),
    )

    expect(status).toBe(400)
    expect(body).toEqual({
      error: { code: 'invalid_input', message: 'evaluator_id must be a member id' },
    })
  })

  it('rejects an evaluator from another node (IDOR guard)', async () => {
    givenSession(LEADER)
    givenAdmin(defaultData())

    const { status, body } = await callPatch(
      'eval-1',
      JSON.stringify(scheduleBody({ evaluator_id: FOREIGN_ID })),
    )

    expect(status).toBe(400)
    expect(body).toEqual({
      error: {
        code: 'invalid_input',
        message: 'evaluator_id must belong to a current member of the node',
      },
    })
  })

  it('schedules with evaluator, writing status, date and assignee', async () => {
    givenSession(LEADER)
    const admin = givenAdmin(defaultData())

    const { status, body } = await callPatch(
      'eval-1',
      JSON.stringify(scheduleBody({ evaluator_id: M2_ID })),
    )

    expect(status).toBe(200)
    expect((body as { data: EvaluationRecord }).data.status).toBe('scheduled')
    expect(admin.log.evalUpdates).toHaveLength(1)
    expect(admin.log.evalUpdates[0]).toMatchObject({
      id: 'eval-1',
      payload: { status: 'scheduled', evaluator: M2_ID },
    })
    expect(admin.log.evalUpdates[0]!.payload).toHaveProperty('scheduled_at')
    expect(admin.log.ledgerCreates).toHaveLength(0)
  })

  it('schedules without an evaluator, leaving the assignee null', async () => {
    givenSession(LEADER)
    const admin = givenAdmin(defaultData())

    const { body } = await callPatch('eval-1', JSON.stringify(scheduleBody()))

    expect((body as { data: EvaluationRecord }).data.status).toBe('scheduled')
    expect(admin.log.evalUpdates[0]!.payload).toMatchObject({
      status: 'scheduled',
      evaluator: null,
      scheduled_at: expect.any(String),
    })
  })
})

// ─── Transitions: illegal and terminal ──────────────────────────────────────

describe('illegal and terminal transitions', () => {
  it('rejects pending → completed with 409', async () => {
    givenSession(LEADER)
    givenAdmin(defaultData())

    const { status, body } = await callPatch(
      'eval-1',
      JSON.stringify({ status: 'completed', score: 90 }),
    )

    expect(status).toBe(409)
    expect(body).toEqual({
      error: { code: 'conflict', message: 'A pending evaluation can only be scheduled' },
    })
  })

  it('rejects pending → missed with 409', async () => {
    givenSession(LEADER)
    givenAdmin(defaultData())

    const { status } = await callPatch('eval-1', JSON.stringify({ status: 'missed' }))

    expect(status).toBe(409)
  })

  it('rejects scheduled → scheduled with 409', async () => {
    givenSession(LEADER)
    givenAdmin(defaultData({ status: 'scheduled', scheduled_at: isoDaysFromNow(1) }))

    const { status } = await callPatch(
      'eval-1',
      JSON.stringify(scheduleBody({ scheduled_at: isoDaysFromNow(2) })),
    )

    expect(status).toBe(409)
  })

  it('rejects any mutation of a completed evaluation with 409', async () => {
    givenSession(LEADER)
    givenAdmin(defaultData({ status: 'completed', xp_awarded: true }))

    const { status, body } = await callPatch(
      'eval-1',
      JSON.stringify({ status: 'missed' }),
    )

    expect(status).toBe(409)
    expect(body).toEqual({
      error: { code: 'conflict', message: 'Evaluation is already complete' },
    })
  })

  it('rejects any mutation of a missed evaluation with 409', async () => {
    givenSession(LEADER)
    givenAdmin(defaultData({ status: 'missed' }))

    const { status, body } = await callPatch('eval-1', JSON.stringify(scheduleBody()))

    expect(status).toBe(409)
    expect(body).toEqual({
      error: { code: 'conflict', message: 'Evaluation is already complete' },
    })
  })
})

// ─── Transitions: scheduled → missed ────────────────────────────────────────

describe('scheduled → missed', () => {
  it('marks the evaluation missed without awarding XP', async () => {
    givenSession(LEADER)
    const admin = givenAdmin(
      defaultData({ status: 'scheduled', scheduled_at: isoDaysFromNow(1) }),
    )

    const { status, body } = await callPatch(
      'eval-1',
      JSON.stringify({ status: 'missed' }),
    )

    expect(status).toBe(200)
    expect((body as { data: EvaluationRecord }).data.status).toBe('missed')
    expect(admin.log.evalUpdates[0]).toMatchObject({
      id: 'eval-1',
      payload: { status: 'missed' },
    })
    expect(admin.log.ledgerCreates).toHaveLength(0)
  })
})

// ─── Transitions: scheduled → completed ─────────────────────────────────────

describe('scheduled → completed', () => {
  it('rejects a missing score', async () => {
    givenSession(LEADER)
    givenAdmin(defaultData({ status: 'scheduled', scheduled_at: isoDaysFromNow(1) }))

    const { status, body } = await callPatch(
      'eval-1',
      JSON.stringify({ status: 'completed' }),
    )

    expect(status).toBe(400)
    expect(body).toEqual({
      error: {
        code: 'invalid_input',
        message: 'score must be an integer between 0 and 100',
      },
    })
  })

  it('rejects a fractional score', async () => {
    givenSession(LEADER)
    givenAdmin(defaultData({ status: 'scheduled', scheduled_at: isoDaysFromNow(1) }))

    const { status, body } = await callPatch(
      'eval-1',
      JSON.stringify({ status: 'completed', score: 85.5 }),
    )

    expect(status).toBe(400)
    expect(body).toEqual({
      error: {
        code: 'invalid_input',
        message: 'score must be an integer between 0 and 100',
      },
    })
  })

  it('rejects a string score', async () => {
    givenSession(LEADER)
    givenAdmin(defaultData({ status: 'scheduled', scheduled_at: isoDaysFromNow(1) }))

    const { status } = await callPatch(
      'eval-1',
      JSON.stringify({ status: 'completed', score: '85' }),
    )

    expect(status).toBe(400)
  })

  it('rejects a score below 0 or above 100', async () => {
    givenSession(LEADER)
    givenAdmin(defaultData({ status: 'scheduled', scheduled_at: isoDaysFromNow(1) }))

    for (const score of [-1, 101]) {
      const { status } = await callPatch(
        'eval-1',
        JSON.stringify({ status: 'completed', score }),
      )
      expect(status).toBe(400)
    }
  })

  it('completes on time: awards 25 evaluation_on_time to the evaluatee once', async () => {
    givenSession(LEADER)
    const admin = givenAdmin(
      defaultData({ status: 'scheduled', scheduled_at: isoDaysFromNow(0) }),
    )

    const { status, body } = await callPatch(
      'eval-1',
      JSON.stringify({ status: 'completed', score: 88 }),
    )

    expect(status).toBe(200)
    const res = body as { data: EvaluationRecord }
    expect(res.data.status).toBe('completed')
    expect(res.data.score).toBe(88)
    expect(res.data.xp_awarded).toBe(true)
    expect(res.data.completed_at).toEqual(expect.any(String))

    expect(admin.log.evalUpdates).toHaveLength(1)
    expect(admin.log.evalUpdates[0]!.payload).toMatchObject({
      status: 'completed',
      score: 88,
      xp_awarded: true,
    })

    expect(admin.log.ledgerCreates).toHaveLength(1)
    expect(admin.log.ledgerCreates[0]).toMatchObject({
      user: M1_ID,
      amount: 25,
      category: 'evaluation_on_time',
      reference_id: 'eval-1',
      reference_type: 'evaluation',
      cycle: CYCLE.id,
    })
  })

  it('completes late: awards 10 evaluation_late', async () => {
    givenSession(LEADER)
    const admin = givenAdmin(
      defaultData({ status: 'scheduled', scheduled_at: isoDaysFromNow(-1) }),
    )

    const { status } = await callPatch(
      'eval-1',
      JSON.stringify({ status: 'completed', score: 60 }),
    )

    expect(status).toBe(200)
    expect(admin.log.ledgerCreates[0]).toMatchObject({
      amount: 10,
      category: 'evaluation_late',
      user: M1_ID,
    })
  })

  it('cannot double-pay: a retried PATCH hits the terminal gate, one ledger row', async () => {
    givenSession(LEADER)
    const admin = givenAdmin(
      defaultData({ status: 'scheduled', scheduled_at: isoDaysFromNow(0) }),
    )

    const first = await callPatch(
      'eval-1',
      JSON.stringify({ status: 'completed', score: 80 }),
    )
    expect(first.status).toBe(200)

    const second = await callPatch(
      'eval-1',
      JSON.stringify({ status: 'completed', score: 95 }),
    )
    expect(second.status).toBe(409)

    expect(admin.log.ledgerCreates).toHaveLength(1)
  })

  it('answers 500 and leaves the evaluation scheduled when the XP award fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    givenSession(LEADER)
    const admin = givenAdmin({
      ...defaultData({ status: 'scheduled', scheduled_at: isoDaysFromNow(0) }),
      ledgerCreateError: new ClientResponseError({ status: 500 }),
    })

    const { status } = await callPatch(
      'eval-1',
      JSON.stringify({ status: 'completed', score: 70 }),
    )

    // Award-before-mark-complete: no XP possible without also finalizing the
    // evaluation, so a failed award cannot strand the row as completed.
    expect(status).toBe(500)
    expect(admin.log.evalUpdates).toHaveLength(0)
    expect(admin.log.ledgerCreates).toHaveLength(0)
    consoleSpy.mockRestore()
  })

  it('keeps the award and answers 200 when a retry completes the eval', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    givenSession(LEADER)
    const admin = givenAdmin(
      defaultData({ status: 'scheduled', scheduled_at: isoDaysFromNow(0) }),
    )
    admin.failNextEvalUpdates.count = 1

    const first = await callPatch(
      'eval-1',
      JSON.stringify({ status: 'completed', score: 75 }),
    )
    expect(first.status).toBe(500)

    const second = await callPatch(
      'eval-1',
      JSON.stringify({ status: 'completed', score: 75 }),
    )
    expect(second.status).toBe(200)

    // Idempotent per reference: only one ledger row across both attempts.
    expect(admin.log.ledgerCreates).toHaveLength(1)
    expect(admin.log.evalUpdates).toHaveLength(1)
    consoleSpy.mockRestore()
  })
})
