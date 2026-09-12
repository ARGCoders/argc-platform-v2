'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

export type Surface = 'dark' | 'light'

export interface DashboardThemeValue {
  surface: Surface
  toggle: () => void
}

/** Read by the blocking script in app/dashboard/layout.tsx too — keep in sync. */
export const DASHBOARD_THEME_KEY = 'argc:dashboard-theme'

const DashboardThemeContext = createContext<DashboardThemeValue | null>(null)

/**
 * Single source of truth for the dashboard's own light/dark preference —
 * manual only, no `prefers-color-scheme` involvement, scoped to the
 * dashboard: public pages never read this and are never affected by it.
 *
 * Mounted at the root layout (not app/dashboard/layout.tsx) purely because
 * Navbar's `dashboard` variant — rendered once, shared with public pages —
 * also needs the current surface for its own background, and Navbar sits
 * outside app/dashboard/layout.tsx's tree. The provider's own state and
 * effects never touch anything public pages render; only DashboardShell,
 * DashboardSidebar, DashboardHeader, Navbar's dashboard variant, and the
 * ARGC dashboard components read from it.
 *
 * Initial state always starts 'dark' — matching the server-rendered
 * default exactly — because localStorage can't be read during SSR or
 * during the first client render without risking a hydration mismatch. A
 * `localStorage`-preferring user briefly sees the server's dark default
 * until the effect below corrects it; the blocking script in
 * app/dashboard/layout.tsx exists specifically to make that correction
 * happen before paint instead, for the one case that would otherwise flash.
 */
export function DashboardThemeProvider({ children }: { children: ReactNode }) {
  const [surface, setSurface] = useState<Surface>('dark')

  useEffect(() => {
    try {
      // Deferred a tick so setState never runs synchronously inside the
      // effect body itself (matches the same fix in ascii-boot.tsx).
      if (localStorage.getItem(DASHBOARD_THEME_KEY) === 'light') {
        Promise.resolve().then(() => setSurface('light'))
      }
    } catch {
      // Storage can throw in some privacy modes — default (dark) stands.
    }
  }, [])

  const toggle = useCallback(() => {
    setSurface((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem(DASHBOARD_THEME_KEY, next)
      } catch {
        // Non-fatal — the preference just won't survive a reload this time.
      }
      return next
    })
  }, [])

  return (
    <DashboardThemeContext.Provider value={{ surface, toggle }}>
      {children}
    </DashboardThemeContext.Provider>
  )
}

/** Throws when used outside <DashboardThemeProvider> so the mistake surfaces immediately. */
export function useDashboardTheme(): DashboardThemeValue {
  const ctx = useContext(DashboardThemeContext)
  if (!ctx) {
    throw new Error('useDashboardTheme must be used within a <DashboardThemeProvider>')
  }
  return ctx
}
