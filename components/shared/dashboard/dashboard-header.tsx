'use client'

import type { ReactNode } from 'react'
import { Breadcrumb, type Crumb } from '@/components/shared/breadcrumb'
import { cn } from '@/lib/utils'
import { useDashboardTheme, type Surface } from '@/lib/dashboard-theme-context'

interface DashboardHeaderProps {
  title: string
  /** Omit or pass an empty array on top-level pages — the breadcrumb is optional. */
  crumbs?: Crumb[]
  /** 0–2 actions, e.g. a primary button. Never a second navigation surface. */
  actions?: ReactNode
  className?: string
  /**
   * Defaults to the live dashboard theme when omitted — the real page that
   * renders this (a Server Component) can't know the client's persisted
   * preference to pass it explicitly, so this reads it directly instead.
   * An explicit value is still honored (the dev-preview swatches use one).
   */
  surface?: Surface
}

/**
 * Top bar for the content column: mono page title, optional breadcrumb above
 * it, optional actions slot. Composes the existing Breadcrumb component
 * rather than re-implementing wayfinding.
 *
 * `text-hero-ink` is a static brand token (always white), not the swappable
 * --sidebar* family DashboardShell's own `.dark` scoping drives for free —
 * so unlike DashboardSidebar, this needs an explicit light branch.
 */
export function DashboardHeader({
  title,
  crumbs = [],
  actions,
  className,
  surface,
}: DashboardHeaderProps) {
  const { surface: liveSurface } = useDashboardTheme()
  const resolvedSurface = surface ?? liveSurface

  return (
    <header
      className={cn(
        'flex flex-col gap-2 border-b px-6 py-4 md:flex-row md:items-center md:justify-between',
        resolvedSurface === 'dark' ? 'border-sidebar-border' : 'border-border',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        {crumbs.length > 0 && <Breadcrumb items={crumbs} surface={resolvedSurface} />}
        <h1
          className={cn(
            'truncate font-mono text-[0.72rem] font-medium tracking-[0.08em] uppercase',
            resolvedSurface === 'dark' ? 'text-hero-ink' : 'text-foreground',
          )}
        >
          {title}
        </h1>
      </div>

      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  )
}
