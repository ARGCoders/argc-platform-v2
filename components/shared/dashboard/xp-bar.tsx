import { tierProgress } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface XpBarProps {
  xp: number
  surface?: 'dark' | 'light'
  className?: string
}

/**
 * Progress toward the next tier threshold. Fills with Signal Maroon
 * (`sidebar-primary`) regardless of surface — PLATFORM.md specs this as a
 * fixed brand fill, not a surface-conditional one, unlike the track and text.
 *
 * At the top tier there's no next threshold to progress toward
 * (`tierProgress().next === null`): the label drops the arrow for
 * "TOP TIER — {TIER}", the trailing value becomes the raw XP total instead
 * of a fraction, and the bar renders fully filled. This maps directly onto
 * `tierProgress()`'s existing `{ next: null, required: null }` shape.
 */
export function XpBar({ xp, surface = 'dark', className }: XpBarProps) {
  const { current, next, required } = tierProgress(xp)
  const bright = surface === 'dark' ? 'text-sidebar-foreground' : 'text-foreground'
  const track = surface === 'dark' ? 'bg-sidebar-foreground/10' : 'bg-muted'

  const label = next ? `XP → ${next}` : `Top Tier — ${current}`
  const trailing = next && required ? `${xp} / ${required}` : `${xp} XP`
  const fraction = next && required ? Math.min(xp / required, 1) : 1

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={cn(
            'font-mono text-[0.72rem] font-medium tracking-[0.1em] uppercase',
            bright,
          )}
        >
          {label}
        </span>
        <span className={cn('shrink-0 font-mono text-[0.72rem] tabular-nums', bright)}>
          {trailing}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={xp}
        aria-valuemin={0}
        aria-valuemax={required ?? xp}
        aria-label={`${label}, ${trailing}`}
        className={cn('h-2 w-full', track)}
      >
        <div
          className="h-full bg-sidebar-primary"
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
    </div>
  )
}
