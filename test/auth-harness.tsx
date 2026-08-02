import { vi } from 'vitest'
import type { ReactNode } from 'react'
import { AuthProvider } from '@/lib/auth-context'
import type { Role, UserRecord } from '@/types/pocketbase'

/**
 * Wraps children in the real AuthProvider with `fetch` stubbed.
 *
 * Injecting a fake context value would be simpler, but it would leave the
 * provider itself untested and let a provider regression pass unnoticed. This
 * drives the actual /api/auth/me code path instead.
 *
 * Because the provider resolves its session asynchronously, tests must use
 * `findBy*` (or `waitFor`) for anything that depends on the signed-in state.
 */
export function AuthContextTestProvider({
  children,
  user,
  isLoading = false,
}: {
  children: ReactNode
  user: UserRecord | null
  isLoading?: boolean
}) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()

      if (url.includes('/api/auth/me')) {
        // Never settles, so the component stays in its loading state.
        if (isLoading) return new Promise(() => {})

        if (!user) {
          return Promise.resolve(
            new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
          )
        }
        return Promise.resolve(
          new Response(JSON.stringify({ user, token: 'test-token' }), { status: 200 }),
        )
      }

      if (url.includes('/api/auth/logout')) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true }), { status: 200 }),
        )
      }

      return Promise.reject(new Error(`Unexpected fetch in test: ${url}`))
    }),
  )

  return <AuthProvider>{children}</AuthProvider>
}

/** Minimal valid UserRecord; override only what a test cares about. */
export function makeUser(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    id: 'u1',
    email: 'peer@student.42amman.com',
    emailVisibility: false,
    verified: true,
    intra_id: '12345',
    intra_login: 'apeer',
    display_name: 'A Peer',
    avatar_url: '',
    role: 'node_peer' as Role,
    last_sync_at: '2026-01-01T00:00:00Z',
    created: '2026-01-01T00:00:00Z',
    updated: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}
