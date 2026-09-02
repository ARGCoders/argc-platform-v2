import { ROLE_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { Role } from '@/types/pocketbase'

/**
 * Weight and fill escalate with rank: outline-only at Guest, through Steel
 * Blue Dark (the dashboard's own dark tonal step, for contrast on navy) and
 * Coral, to Signal Maroon reserved for the top role. Reuses accent tokens
 * already paired with these fills elsewhere in the dashboard (sidebar-accent,
 * accent, sidebar-primary) — no new colors introduced for rank. RoleBadge is
 * the only chip in this group with a solid-filled top step; TierBadge's top
 * tier stays outlined so the two never read as the same signal.
 */
const ROLE_CLASS: Record<Role, string> = {
  guest: 'border border-sidebar-border text-sidebar-foreground/50',
  node_peer:
    'border border-sidebar-border bg-sidebar-foreground/10 text-sidebar-foreground',
  node_leader:
    'border border-transparent bg-sidebar-accent text-sidebar-accent-foreground',
  super_peer: 'border border-transparent bg-accent text-accent-foreground',
  super_admin_peer:
    'border border-transparent bg-sidebar-primary text-sidebar-primary-foreground',
}

export function RoleBadge({
  role,
  className,
  ariaLabel,
}: {
  role: Role
  className?: string
  /** Overrides the accessible name. Default disambiguates from TierBadge/StatusChip for assistive tech. */
  ariaLabel?: string
}) {
  return (
    <span
      aria-label={ariaLabel ?? `Role: ${ROLE_LABELS[role]}`}
      className={cn(
        'inline-flex h-5 w-fit shrink-0 items-center justify-center px-2',
        'font-mono text-[0.6rem] font-medium tracking-[0.1em] whitespace-nowrap uppercase',
        ROLE_CLASS[role],
        className,
      )}
    >
      {ROLE_LABELS[role]}
    </span>
  )
}
