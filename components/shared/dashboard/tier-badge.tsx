import { TIERS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { Tier } from '@/types/pocketbase'

interface TierStyle {
  chip: string
  text: string
  tickLit: string
  tickDim: string
}

/**
 * A segmented tick-bar, not a label chip — kept structurally distinct from
 * RoleBadge so an earned tier and an assigned role can never be confused for
 * one another at a glance. Ticks fill left to right with TIERS' rank.
 *
 * Every tier stays outline-only, including the top one: RoleBadge already
 * owns "solid fill = top rank" as its signature (reserved for Signal
 * Maroon), and a super_peer is a plausible Vanguard at the same time — an
 * identically-filled Coral chip on both components made the two facts
 * indistinguishable at a glance in the same row. Vanguard keeps Coral, just
 * never as a fill.
 */
const TIER_STYLE: Record<Tier, TierStyle> = {
  Initiate: {
    chip: 'border border-sidebar-border',
    text: 'text-sidebar-foreground/70',
    tickLit: 'bg-sidebar-foreground/50',
    tickDim: 'bg-sidebar-foreground/15',
  },
  Contributor: {
    chip: 'border border-sidebar-border',
    text: 'text-steel-blue',
    tickLit: 'bg-steel-blue',
    tickDim: 'bg-sidebar-foreground/15',
  },
  Architect: {
    chip: 'border border-sidebar-border',
    text: 'text-signal-amber',
    tickLit: 'bg-signal-amber',
    tickDim: 'bg-sidebar-foreground/15',
  },
  Vanguard: {
    chip: 'border border-coral',
    text: 'text-coral',
    tickLit: 'bg-coral',
    tickDim: 'bg-coral',
  },
}

export function TierBadge({
  tier,
  className,
  ariaLabel,
}: {
  tier: Tier
  className?: string
  /** Overrides the accessible name. Default disambiguates from RoleBadge/StatusChip for assistive tech. */
  ariaLabel?: string
}) {
  const style = TIER_STYLE[tier]
  const lit = TIERS.indexOf(tier) + 1

  return (
    <span
      aria-label={ariaLabel ?? `Tier: ${tier}`}
      className={cn(
        'inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1.5 px-2',
        style.chip,
        className,
      )}
    >
      <span className="flex items-center gap-px" aria-hidden="true">
        {TIERS.map((_, i) => (
          <span
            key={i}
            className={cn('h-2.5 w-[3px]', i < lit ? style.tickLit : style.tickDim)}
          />
        ))}
      </span>
      <span
        className={cn(
          'font-mono text-[0.6rem] font-medium tracking-[0.1em] whitespace-nowrap uppercase',
          style.text,
        )}
      >
        {tier}
      </span>
    </span>
  )
}
