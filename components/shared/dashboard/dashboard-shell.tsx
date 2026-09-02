import type { ReactNode } from 'react'
import { DashboardSidebar } from './dashboard-sidebar'

/**
 * Navy layout wrapper for every /dashboard route: sidebar rail + scrollable
 * content column. `pt-nav` clears the fixed public Navbar rendered by the
 * root layout above this one.
 *
 * The inner region is a column below `md` (mobile menu bar stacked above the
 * content) and a row at `md`+ (rail beside content) — it must switch
 * direction with DashboardSidebar's own `hidden md:flex` / `md:hidden`
 * breakpoints, or the mobile bar renders as a flex-row sibling of `main`
 * instead of a header above it.
 */
export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-sidebar pt-nav">
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        <DashboardSidebar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
