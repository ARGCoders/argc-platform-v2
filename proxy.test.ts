import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy } from '@/proxy'
import { AUTH_COOKIE, ROLE_COOKIE, ROLE_HOMES } from '@/lib/constants'
import type { Role } from '@/types/pocketbase'

const BASE = 'http://localhost:3000'

/** Build a request with the given cookies, like a browser would send them. */
function request(pathname: string, cookies: Record<string, string> = {}) {
  const cookieHeader = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ')
  return new NextRequest(`${BASE}${pathname}`, { headers: { cookie: cookieHeader } })
}

/** A logged-in request with a role cookie set. */
function member(pathname: string, role: Role) {
  return request(pathname, { [AUTH_COOKIE]: 'abc', [ROLE_COOKIE]: role })
}

function location(res: Response): string {
  return new URL(res.headers.get('location') ?? '').pathname
}

describe('proxy /dashboard root redirects by role', () => {
  it.each([
    ['node_peer', '/dashboard/overview'],
    ['node_leader', '/dashboard/node'],
    ['super_peer', '/dashboard/admin'],
    ['super_admin_peer', '/dashboard/admin'],
  ] as const)('sends a %s to %s', (role, home) => {
    const res = proxy(member('/dashboard', role))
    expect(res.status).toBe(307)
    expect(location(res)).toBe(home)
  })

  it.each(['/dashboard/', '/dashboard?tab=overview'])(
    'treats %s like the dashboard root',
    (pathname) => {
      const res = proxy(member(pathname, 'node_peer'))
      expect(location(res)).toBe('/dashboard/overview')
    },
  )
})

describe('proxy keeps roles out of sections above them', () => {
  it.each([
    ['node_peer', '/dashboard/node'],
    ['node_peer', '/dashboard/node/members'],
    ['node_peer', '/dashboard/admin'],
    ['node_peer', '/dashboard/admin/cycles'],
    ['node_leader', '/dashboard/admin'],
    ['node_leader', '/dashboard/admin/members'],
  ] as const)('redirects a %s away from %s', (role, pathname) => {
    const res = proxy(member(pathname, role))
    expect(res.status).toBe(307)
    expect(location(res)).toBe(ROLE_HOMES[role])
  })
})

describe('proxy allows roles into sections they outrank or own', () => {
  it.each([
    ['node_leader', '/dashboard/node'],
    ['node_leader', '/dashboard/node/evaluations'],
    ['super_peer', '/dashboard/node'],
    ['super_peer', '/dashboard/admin'],
    ['super_peer', '/dashboard/admin/cycles'],
    ['super_admin_peer', '/dashboard/admin/members'],
    ['node_peer', '/dashboard/overview'],
  ] as const)('lets a %s through to %s', (role, pathname) => {
    const res = proxy(member(pathname, role))
    expect(res.status).toBe(200)
  })
})

describe('proxy keeps the existing auth behavior intact', () => {
  it('sends anonymous visitors to the sign-in page', () => {
    const res = proxy(request('/dashboard'))
    expect(res.status).toBe(307)
    expect(location(res)).toBe('/register')
  })

  it('keeps the ?next= target on the sign-in redirect', () => {
    const res = proxy(request('/dashboard/node'))
    expect(new URL(res.headers.get('location') ?? '').searchParams.get('next')).toBe(
      '/dashboard/node',
    )
  })

  it('sends authenticated guests home', () => {
    const res = proxy(
      request('/dashboard', { [AUTH_COOKIE]: 'abc', [ROLE_COOKIE]: 'guest' }),
    )
    expect(location(res)).toBe('/')
  })

  it('sends members away from /register', () => {
    const res = proxy(member('/register', 'node_peer'))
    expect(location(res)).toBe('/dashboard')
  })

  it('lets a role-less request through untouched', () => {
    expect(proxy(request('/')).status).toBe(200)
  })
})
