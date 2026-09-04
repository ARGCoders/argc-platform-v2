'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { UserRecord } from '@/types/pocketbase'

export interface AuthState {
  user: UserRecord | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
}

export interface AuthContextValue extends AuthState {
  /** Clears the session server-side and resets local state. */
  logout: () => Promise<void>
  /** Re-reads /api/auth/me — call after a mutation that changes the user. */
  refresh: () => Promise<void>
}

const SIGNED_OUT: AuthState = {
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
}

const LOADING: AuthState = { ...SIGNED_OUT, isLoading: true }

/**
 * Exported only so dev-only tooling (e.g. app/dev/dashboard-preview) can
 * supply a fake AuthContextValue without a real session. No production code
 * should import this directly — use useAuth().
 */
export const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Reads the session and returns the resulting state.
 *
 * Deliberately free of setState: the React Compiler rejects an effect that
 * synchronously calls anything containing a state update, so the effect below
 * applies the result inside a promise callback instead.
 */
async function fetchSession(signal?: AbortSignal): Promise<AuthState> {
  try {
    const res = await fetch('/api/auth/me', { signal, credentials: 'same-origin' })

    if (res.status === 401) return SIGNED_OUT
    if (!res.ok) throw new Error(`Session check failed (${res.status})`)

    const data = (await res.json()) as { user: UserRecord; token: string }
    return {
      user: data.user,
      token: data.token,
      isLoading: false,
      isAuthenticated: true,
      error: null,
    }
  } catch (err) {
    if (signal?.aborted) return LOADING
    return {
      ...SIGNED_OUT,
      error: err instanceof Error ? err.message : 'Session check failed',
    }
  }
}

/**
 * Single source of auth state for the client tree.
 *
 * V1 had no provider: Navbar, the register page and the blog submit form each
 * called /api/auth/me on mount, so one page load issued several identical
 * session checks that could resolve out of order. This fetches once and shares
 * the result.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(LOADING)

  useEffect(() => {
    const controller = new AbortController()

    void fetchSession(controller.signal).then((next) => {
      // Ignore a response that arrives after unmount, or after StrictMode's
      // second mount aborted the first request.
      if (!controller.signal.aborted) setState(next)
    })

    return () => controller.abort()
  }, [])

  const refresh = useCallback(async (): Promise<void> => {
    setState((s) => ({ ...s, isLoading: true, error: null }))
    setState(await fetchSession())
  }, [])

  const logout = useCallback(async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
    } finally {
      // Clear locally even if the request failed — the user asked to be out.
      setState(SIGNED_OUT)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

/** Throws when used outside <AuthProvider> so the mistake surfaces immediately. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>')
  return ctx
}
