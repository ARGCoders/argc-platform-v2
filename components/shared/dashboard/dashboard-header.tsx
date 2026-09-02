import type { ReactNode } from 'react'
import { Breadcrumb, type Crumb } from '@/components/shared/breadcrumb'
import { cn } from '@/lib/utils'

interface DashboardHeaderProps {
  title: string
  /** Omit or pass an empty array on top-level pages — the breadcrumb is optional. */
  crumbs?: Crumb[]
  /** 0–2 actions, e.g. a primary button. Never a second navigation surface. */
  actions?: ReactNode
  className?: string
}

/**
 * Top bar for the content column: mono page title, optional breadcrumb above
 * it, optional actions slot. Composes the existing Breadcrumb component
 * rather than re-implementing wayfinding.
 */
export function DashboardHeader({
  title,
  crumbs = [],
  actions,
  className,
}: DashboardHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-2 border-b border-sidebar-border px-6 py-4 md:flex-row md:items-center md:justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        {crumbs.length > 0 && <Breadcrumb items={crumbs} surface="dark" />}
        <h1 className="truncate font-mono text-[0.72rem] font-medium tracking-[0.08em] text-hero-ink uppercase">
          {title}
        </h1>
      </div>

      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  )
}
