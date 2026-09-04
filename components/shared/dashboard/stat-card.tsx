import { cn } from '@/lib/utils'

interface StatCardDelta {
  /** Which way the number literally moved — always drives the arrow, never the color. */
  direction: 'up' | 'down' | 'flat'
  /**
   * Whether that movement is good, bad, or neither for THIS metric — drives
   * the color. Deliberately separate from `direction`: XP going up is
   * positive, but missed-evaluations going up is negative even though both
   * are "up." Collapsing the two into one field would color a falling
   * missed-evaluations count coral just because "down" happened to mean
   * "bad" for a different metric.
   */
  tone: 'positive' | 'negative' | 'neutral'
  /** Caller-formatted trailing text, e.g. "12.4% vs C-11" or "No delta" — this component doesn't compute percentages itself. */
  text: string
}

interface StatCardProps {
  label: string
  value: string | number
  /** Omit entirely for a card that never tracks a delta; pass tone: 'neutral' to assert "no change" as its own real state. */
  delta?: StatCardDelta
  surface?: 'dark' | 'light'
  className?: string
}

/**
 * Derives a delta's `direction`/`tone` from one declared metric polarity
 * instead of trusting each call site to reason about both fields by hand —
 * the raw `StatCardDelta` shape stays available as an escape hatch for
 * deltas that don't fit "this metric, compared to a prior value."
 */
export function deltaFor(
  polarity: 'higher-better' | 'lower-better',
  from: number,
  to: number,
  text: string,
): StatCardDelta {
  const direction = to === from ? 'flat' : to > from ? 'up' : 'down'
  const improved =
    to === from ? null : polarity === 'higher-better' ? to > from : to < from
  const tone = improved === null ? 'neutral' : improved ? 'positive' : 'negative'
  return { direction, tone, text }
}

// Tone carries a non-color cue too, not hue alone — Signal Green and Coral
// share lightness/chroma (the same confusion axis StatusChip solves with a
// border style and NodeMemberRow's dots solve with a ring), and this delta
// is a third use of that pair with no chip or dot shape to lean on. Bold
// weight stands in: positive/negative read heavier, neutral stays regular.
function deltaClass(tone: StatCardDelta['tone'], surface: 'dark' | 'light'): string {
  if (tone === 'positive') return 'font-semibold text-signal-green'
  if (tone === 'negative') return 'font-semibold text-coral'
  return surface === 'dark' ? 'text-sidebar-foreground/50' : 'text-muted-foreground'
}

function deltaGlyph(direction: StatCardDelta['direction']): string {
  if (direction === 'up') return '▲'
  if (direction === 'down') return '▼'
  return ''
}

function deltaAriaLabel(delta: StatCardDelta): string {
  if (delta.direction === 'up') return `Up ${delta.text}`
  if (delta.direction === 'down') return `Down ${delta.text}`
  return delta.text
}

/**
 * A generic single-metric display — not XP-specific, despite living
 * alongside XpBar. Reuses the Signal Green/Coral pair already established
 * for StatusTone; documented in DESIGN.md's Status Accents section as a
 * third sanctioned use (after StatusChip and TierBadge/NodeMemberRow's
 * dots), each still carrying its own non-color cue rather than hue alone.
 * No shadows, flat: a bordered box on navy, the ordinary ring-bordered Card
 * on light. Static only — no href, unlike NodeMemberRow; nothing in this
 * component's spec suggests a stat card drills into detail.
 */
export function StatCard({
  label,
  value,
  delta,
  surface = 'dark',
  className,
}: StatCardProps) {
  const bright = surface === 'dark' ? 'text-sidebar-foreground' : 'text-foreground'
  const muted =
    surface === 'dark' ? 'text-sidebar-foreground/60' : 'text-muted-foreground'
  const container =
    surface === 'dark'
      ? 'border border-sidebar-border bg-transparent'
      : 'ring-1 ring-foreground/10 bg-card'
  const displayValue = value === '' ? '—' : value

  return (
    <div
      className={cn('flex min-w-0 flex-col gap-1 p-4', container, className)}
      aria-label={`${label}: ${displayValue}`}
    >
      <span
        className={cn(
          'truncate font-mono text-[0.68rem] font-medium tracking-[0.1em] uppercase',
          muted,
        )}
      >
        {label}
      </span>
      <span
        className={cn('truncate font-mono text-2xl font-medium tabular-nums', bright)}
      >
        {displayValue}
      </span>
      {delta && (
        <span
          className={cn(
            'font-mono text-[0.7rem] tabular-nums',
            deltaClass(delta.tone, surface),
          )}
          aria-label={deltaAriaLabel(delta)}
        >
          {deltaGlyph(delta.direction)}
          {deltaGlyph(delta.direction) ? ' ' : ''}
          {delta.text}
        </span>
      )}
    </div>
  )
}
