'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useDashboardTheme } from '@/lib/dashboard-theme-context'
import { DashboardSidebar } from './dashboard-sidebar'

/** Read by the blocking no-flash script in app/dashboard/layout.tsx — keep in sync. */
export const DASHBOARD_SHELL_ID = 'dashboard-shell-root'

/**
 * Layout wrapper for every /dashboard route: sidebar rail + scrollable
 * content column. `pt-nav` clears the fixed public Navbar rendered by the
 * root layout above this one.
 *
 * The inner region is a column below `md` (mobile menu bar stacked above the
 * content) and a row at `md`+ (rail beside content) — it must switch
 * direction with DashboardSidebar's own `hidden md:flex` / `md:hidden`
 * breakpoints, or the mobile bar renders as a flex-row sibling of `main`
 * instead of a header above it.
 *
 * `dark` (default) is applied here, scoped to this one root node — never
 * `<html>` — so the dashboard theme toggle (lib/dashboard-theme-context.tsx)
 * can never leak onto public pages. `bg-sidebar`/`pt-nav` etc. keep working
 * unchanged either way: `--sidebar*` itself now resolves differently
 * depending on this class (see app/globals.css), not a second set of classes
 * here. The stable `id` is what the no-flash script in
 * app/dashboard/layout.tsx targets before hydration.
 */
export function DashboardShell({ children }: { children: ReactNode }) {
  const { surface } = useDashboardTheme()

  return (
    <div
      id={DASHBOARD_SHELL_ID}
      className={cn('flex h-screen flex-col overflow-hidden bg-sidebar pt-nav', {
        dark: surface === 'dark',
      })}
    >
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        <DashboardSidebar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
