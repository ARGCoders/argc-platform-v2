import Link from 'next/link'
import { cn } from '@/lib/utils'

export interface Crumb {
  label: string
  /** Omit on the final crumb — the current page is not a link. */
  href?: string
}

interface BreadcrumbProps {
  items: Crumb[]
  className?: string
  /**
   * `light` (default) for Paper/Stone contexts — blog posts, handbook
   * topics. `dark` for Maroon/Navy contexts — the dashboard header — where
   * `muted-foreground`/`foreground` resolve from the ambient (light-mode)
   * palette and land unreadable on a navy surface.
   */
  surface?: 'dark' | 'light'
}

/**
 * Used by blog posts, handbook topics and dashboard detail pages.
 * The trailing crumb is marked aria-current and rendered as plain text.
 */
export function Breadcrumb({ items, className, surface = 'light' }: BreadcrumbProps) {
  const link =
    surface === 'dark'
      ? 'text-hero-ink-dim transition-colors hover:text-hero-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring'
      : 'text-muted-foreground transition-colors hover:text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
  const current = surface === 'dark' ? 'text-hero-ink' : 'text-foreground'
  const separator =
    surface === 'dark' ? 'text-hero-ink-dim/50' : 'text-muted-foreground/50'

  return (
    <nav aria-label="Breadcrumb" className={cn('w-full', className)}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[0.72rem] font-medium tracking-[0.1em] uppercase">
        {items.map((item, i) => {
          const isLast = i === items.length - 1
          return (
            <li key={`${item.label}-${i}`} className="flex min-w-0 items-center gap-2">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className={cn('inline-block max-w-[12rem] truncate align-bottom', link)}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={cn(
                    'inline-block max-w-[12rem] truncate align-bottom',
                    current,
                  )}
                >
                  {item.label}
                </span>
              )}

              {!isLast && (
                <span aria-hidden="true" className={separator}>
                  /
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
