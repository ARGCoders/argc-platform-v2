import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  /** Short mono label, e.g. "No members found". */
  title: string
  /** One line of context. Optional — do not pad it out. */
  description?: string
  /** Small glyph or icon. Deliberately optional; ARGC tone avoids decoration. */
  icon?: ReactNode
  /** A single call to action, when there is a genuine next step. */
  action?: ReactNode
  className?: string
}

/**
 * The one empty state for the whole app. V1 hand-rolled a different variant in
 * every list, so "no records" looked different on each admin page.
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        'border border-border border-dashed',
        'px-6 py-14',
        className,
      )}
    >
      {icon && <div className="mb-4 opacity-40">{icon}</div>}

      <p className="font-mono text-[0.72rem] tracking-[0.1em] uppercase text-foreground">
        {title}
      </p>

      {description && (
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">{description}</p>
      )}

      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
