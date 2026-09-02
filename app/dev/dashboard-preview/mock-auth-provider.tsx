'use client'

import type { ReactNode } from 'react'
import { AuthContext } from '@/lib/auth-context'
import type { UserRecord } from '@/types/pocketbase'

/**
 * Dev-only: supplies a fake signed-in user to everything under it via the
 * same context useAuth() reads, without a real session or an /api/auth/me
 * call. No real API route trusts this — every route re-checks auth
 * server-side (DASHBOARD_CONTRACT.md §1) — so this only fakes what the
 * chrome *displays*, never real data access.
 */
export function MockAuthProvider({
  user,
  children,
}: {
  user: UserRecord
  children: ReactNode
}) {
  return (
    <AuthContext.Provider
      value={{
        user,
        token: 'mock-token',
        isLoading: false,
        isAuthenticated: true,
        error: null,
        logout: async () => {},
        refresh: async () => {},
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
