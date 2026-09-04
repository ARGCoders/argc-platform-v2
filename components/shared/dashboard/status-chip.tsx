import {
  CYCLE_STATUS_TONE,
  EVAL_STATUS_TONE,
  EVENT_STATUS_TONE,
  POST_STATUS_TONE,
  SUBMISSION_STATUS_TONE,
  type StatusTone,
} from '@/lib/constants'
import { cn } from '@/lib/utils'
import type {
  CycleStatus,
  EvalStatus,
  EventStatus,
  PostStatus,
  SubmissionStatus,
} from '@/types/pocketbase'

export type StatusDomain = 'cycle' | 'eval' | 'event' | 'post' | 'submission'

interface StatusByDomain {
  cycle: CycleStatus
  eval: EvalStatus
  event: EventStatus
  post: PostStatus
  submission: SubmissionStatus
}

const TONE_MAPS: Record<StatusDomain, Record<string, StatusTone>> = {
  cycle: CYCLE_STATUS_TONE,
  eval: EVAL_STATUS_TONE,
  event: EVENT_STATUS_TONE,
  post: POST_STATUS_TONE,
  submission: SUBMISSION_STATUS_TONE,
}

/**
 * Positive/negative also differ in border style, not just hue — Signal Green
 * and Coral share the same lightness/chroma (only the hue differs), which is
 * exactly the deuteranopia/protanopia confusion axis. Solid vs. dashed reads
 * as a shape difference regardless of color vision. `scheduled` and
 * `pending` don't need that same treatment — Steel Blue/Mist and Signal
 * Amber aren't on that red-green confusion line the way Green/Coral are.
 *
 * `scheduled` is surface-split (Mist on dark, Steel Blue on light) because
 * Steel Blue itself measures only 2.26:1 against Terminal Navy — Mist is
 * Steel Blue's own pale/bright step, already documented as "used for
 * dashboard sidebar foreground text" for exactly this reason. `pending`
 * (Signal Amber) holds up on both surfaces without a split (6.40:1 navy,
 * 2.57:1 paper — in line with what Signal Green/Coral already measure on
 * Paper, 2.36:1 and 2.76:1, so this isn't a new low bar for the system).
 */
function toneClass(tone: StatusTone, surface: 'dark' | 'light'): string {
  if (tone === 'positive') return 'border-solid border-signal-green text-signal-green'
  if (tone === 'negative') return 'border-dashed border-coral text-coral'
  if (tone === 'pending') return 'border-solid border-signal-amber text-signal-amber'
  if (tone === 'scheduled') {
    return surface === 'dark'
      ? 'border-solid border-mist text-mist'
      : 'border-solid border-steel-blue text-steel-blue'
  }
  // hero-ink/55 is the codebase's existing dark-surface 3:1 boundary
  // (see components/shared/field.tsx) — sidebar-border's 12%-alpha hairline
  // measured well under that on Terminal Navy.
  return surface === 'dark'
    ? 'border-solid border-hero-ink/55 text-sidebar-foreground/75'
    : 'border-solid border-input text-muted-foreground'
}

/**
 * Reports a record's status across every domain that has one — cycles,
 * evaluations, events, posts, submissions — with one shared component
 * instead of five. Outline-only, never filled: fills are reserved for
 * RoleBadge/TierBadge's rank escalation, so a status never reads as a rank.
 */
export function StatusChip<D extends StatusDomain>({
  domain,
  status,
  surface = 'dark',
  className,
  ariaLabel,
}: {
  domain: D
  status: StatusByDomain[D]
  surface?: 'dark' | 'light'
  className?: string
  /** Overrides the accessible name. Default disambiguates from RoleBadge/TierBadge for assistive tech. */
  ariaLabel?: string
}) {
  const tone = TONE_MAPS[domain][status as string] as StatusTone

  return (
    <span
      aria-label={ariaLabel ?? `Status: ${status as string}`}
      className={cn(
        'inline-flex h-5 w-fit shrink-0 items-center justify-center border bg-transparent px-2',
        'font-mono text-[0.6rem] font-medium tracking-[0.1em] whitespace-nowrap uppercase',
        toneClass(tone, surface),
        className,
      )}
    >
      {status as string}
    </span>
  )
}
