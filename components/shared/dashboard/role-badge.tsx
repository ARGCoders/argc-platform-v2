import { ROLE_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { Role } from '@/types/pocketbase'

/**
 * Minimal role chip for the dashboard rail. A full Role/Tier badge with
 * per-role color variants ships in the next component group (UI-08 follow-up)
 * — this is just enough for DashboardSidebar to show who's signed in.
 */
export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 w-fit shrink-0 items-center justify-center border border-sidebar-border bg-sidebar-accent px-2',
        'font-mono text-[0.6rem] font-medium tracking-[0.1em] whitespace-nowrap text-sidebar-accent-foreground uppercase',
        className,
      )}
    >
      {ROLE_LABELS[role]}
    </span>
  )
}
