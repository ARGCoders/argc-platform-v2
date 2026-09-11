import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/headers', () => ({ cookies: vi.fn() }))

import { cookies } from 'next/headers'
import { fetchDashboardApi } from './dashboard-fetch'
import { AUTH_COOKIE } from './constants'

function givenCookie(value?: string) {
  vi.mocked(cookies).mockResolvedValue({
    get: (name: string) => (name === AUTH_COOKIE && value ? { name, value } : undefined),
  } as unknown as Awaited<ReturnType<typeof cookies>>)
}

const fetchSpy = vi.fn()

beforeEach(() => {
  fetchSpy.mockReset()
  fetchSpy.mockResolvedValue(new Response('{}', { status: 200 }))
  vi.stubGlobal('fetch', fetchSpy)
})

describe('fetchDashboardApi', () => {
  it('forwards the session cookie as a Cookie header', async () => {
    givenCookie('session-token')

    await fetchDashboardApi('/api/dashboard/me/stats')

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/dashboard/me/stats'),
      expect.objectContaining({
        headers: { Cookie: `${AUTH_COOKIE}=session-token` },
      }),
    )
  })

  it('sends no Cookie header when there is no session', async () => {
    givenCookie(undefined)

    await fetchDashboardApi('/api/dashboard/me/stats')

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ headers: {} }),
    )
  })

  it('never caches — session-dependent data must always be fresh', async () => {
    givenCookie('session-token')

    await fetchDashboardApi('/api/dashboard/me/stats')

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ cache: 'no-store' }),
    )
  })

  it('returns the raw Response without throwing or parsing it', async () => {
    givenCookie('session-token')
    fetchSpy.mockResolvedValue(new Response('{}', { status: 404 }))

    const res = await fetchDashboardApi('/api/dashboard/node/me')

    expect(res.status).toBe(404)
  })
})
