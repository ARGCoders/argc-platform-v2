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
  /**
   * `light` (default) renders on Paper/Stone via the ambient `foreground`/
   * `muted-foreground`/`border` tokens — correct as-is for the public site,
   * which never applies `.dark`. `dark` is for a Terminal Navy host: those
   * ambient tokens resolve to the same near-navy value as the background
   * there, so this surface swaps to the `sidebar-foreground`/`sidebar-border`
   * family instead, matching the rest of the Bordered Rows family
   * (EvaluationStageRow, NodeMemberRow, XpLedgerTable) it sits alongside.
   */
  surface?: 'dark' | 'light'
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
  surface = 'light',
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        'border border-dashed',
        surface === 'dark' ? 'border-sidebar-border' : 'border-border',
        'px-6 py-14',
        className,
      )}
    >
      {icon && <div className="mb-4 opacity-40">{icon}</div>}

      <p
        className={cn(
          'font-mono text-[0.72rem] tracking-[0.1em] uppercase',
          surface === 'dark' ? 'text-sidebar-foreground' : 'text-foreground',
        )}
      >
        {title}
      </p>

      {description && (
        <p
          className={cn(
            'mt-2 max-w-prose text-sm',
            surface === 'dark' ? 'text-sidebar-foreground/60' : 'text-muted-foreground',
          )}
        >
          {description}
        </p>
      )}

      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
