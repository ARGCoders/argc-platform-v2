import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { ClientResponseError } from 'pocketbase'
import type PocketBase from 'pocketbase'
import { GET, type PublicEvent } from './route'
import type { EventRecord } from '@/types/pocketbase'

vi.mock('@/lib/pocketbase-server', () => ({
  getAdminClient: vi.fn(),
}))

import { getAdminClient } from '@/lib/pocketbase-server'

// ─── Fixtures ───────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    id: overrides.id ?? 'ev-1',
    title: 'Summer Build',
    slug: 'summer-build',
    description: 'Seven nodes ship in 48 hours.',
    type: 'hackathon',
    proposed_by: 'node-1',
    organized_by: 'user-1',
    status: 'scheduled',
    starts_at: '2026-09-12T00:00:00.000Z',
    is_public: true,
    attendance_count: 0,
    xp_awarded: false,
    created: '',
    updated: '',
    ...overrides,
  }
}

// ─── Fake PocketBase ────────────────────────────────────────────────────────

function applyIsPublicFilter(filter: string, rows: EventRecord[]): EventRecord[] {
  // Route always filters on `is_public = {:isPublic}` — the fake only needs
  // to honor that one clause, resolved the same way admin.filter() does.
  const wantsPublic = filter.includes('true')
  return rows.filter((row) => row.is_public === wantsPublic)
}

function fakeAdmin(events: EventRecord[]): PocketBase {
  return {
    filter: (str: string, params: Record<string, unknown>) =>
      str.replace(/\{:([a-zA-Z0-9_]+)\}/g, (_match, name: string) =>
        JSON.stringify(params[name]),
      ),
    files: {
      getURL: (record: EventRecord, filename: string) =>
        `https://pb.example.test/api/files/events/${record.id}/${filename}`,
    },
    collection: (name: string) => ({
      getList: async (
        page: number,
        perPage: number,
        opts?: { filter?: string; sort?: string },
      ) => {
        if (name !== 'events') throw new Error(`unexpected collection ${name}`)
        const filtered = opts?.filter ? applyIsPublicFilter(opts.filter, events) : events
        const totalItems = filtered.length
        const totalPages = Math.ceil(totalItems / perPage)
        const start = (page - 1) * perPage
        const items = filtered.slice(start, start + perPage)
        return { items, page, perPage, totalItems, totalPages }
      },
    }),
  } as unknown as PocketBase
}

function givenAdmin(events: EventRecord[]) {
  vi.mocked(getAdminClient).mockResolvedValue(fakeAdmin(events))
}

async function callGet(url?: string): Promise<{ status: number; body: unknown }> {
  const req = new NextRequest(`http://localhost/api/public/events${url ?? ''}`)
  const res = await GET(req)
  return { status: res.status, body: await res.json() }
}

beforeEach(() => {
  vi.mocked(getAdminClient).mockReset()
})

// ─── Payload shape ──────────────────────────────────────────────────────────

describe('payload', () => {
  it('returns only is_public events', async () => {
    givenAdmin([
      makeEvent({ id: 'pub', is_public: true }),
      makeEvent({ id: 'priv', is_public: false }),
    ])

    const { status, body } = await callGet()

    expect(status).toBe(200)
    const res = body as { data: PublicEvent[] }
    expect(res.data.map((e) => e.id)).toEqual(['pub'])
  })

  it('resolves poster_photo to an absolute URL via files.getURL', async () => {
    givenAdmin([makeEvent({ poster_photo: 'poster.jpg' })])

    const { body } = await callGet()
    const res = body as { data: PublicEvent[] }
    expect(res.data[0]!.poster_photo).toBe(
      'https://pb.example.test/api/files/events/ev-1/poster.jpg',
    )
  })

  it('returns null poster_photo when the event has none', async () => {
    givenAdmin([makeEvent()])

    const { body } = await callGet()
    const res = body as { data: PublicEvent[] }
    expect(res.data[0]!.poster_photo).toBeNull()
  })

  it('strips script tags from description via sanitizeHtml', async () => {
    givenAdmin([makeEvent({ description: '<p>Hi</p><script>evil()</script>' })])

    const { body } = await callGet()
    const res = body as { data: PublicEvent[] }
    expect(res.data[0]!.description).not.toContain('script')
    expect(res.data[0]!.description).toContain('Hi')
  })

  it('projects a plain-text excerpt alongside the sanitized HTML description', async () => {
    givenAdmin([makeEvent({ description: '<p>Seven nodes <strong>ship</strong>.</p>' })])

    const { body } = await callGet()
    const res = body as { data: PublicEvent[] }
    expect(res.data[0]!.excerpt).toBe('Seven nodes ship.')
    expect(res.data[0]!.description).toContain('<strong>')
  })

  it('returns an empty list when there are no public events', async () => {
    givenAdmin([])

    const { status, body } = await callGet()
    expect(status).toBe(200)
    expect((body as { data: PublicEvent[] }).data).toEqual([])
  })
})

// ─── Pagination envelope ────────────────────────────────────────────────────

describe('pagination', () => {
  it('defaults to page 1 / perPage 20 and returns the full envelope', async () => {
    givenAdmin([makeEvent()])

    const { body } = await callGet()
    const res = body as {
      page: number
      perPage: number
      totalItems: number
      totalPages: number
    }
    expect(res.page).toBe(1)
    expect(res.perPage).toBe(20)
    expect(res.totalItems).toBe(1)
    expect(res.totalPages).toBe(1)
  })

  it('rejects perPage > 100 with 400 invalid_input', async () => {
    givenAdmin([])
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
    vi.mocked(getAdminClient).mockRejectedValue(new ClientResponseError({ status: 500 }))

    const { status, body } = await callGet()

    expect(status).toBe(500)
    expect(body).toEqual({ error: { code: 'internal', message: 'Server error' } })
    expect(consoleSpy).toHaveBeenCalled()
  })
})
