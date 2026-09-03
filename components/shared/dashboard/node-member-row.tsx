import Link from 'next/link'
import { EVAL_STAGE_LABELS, EVAL_STATUS_TONE, type StatusTone } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { Avatar } from '../avatar'
import { TierBadge } from './tier-badge'
import type { EvalStage, EvalStatus, Tier } from '@/types/pocketbase'

const STAGE_ORDER: EvalStage[] = ['standard_1', 'standard_2', 'eval_plus_node_leader']

// The negative dot also gets a ring, not just a hue — Signal Green and Coral
// share lightness/chroma (the deuteranopia/protanopia confusion axis
// StatusChip solves with a dashed border), and a 6px filled circle is too
// small for a dashed outline to read cleanly, so a ring stands in as the
// non-color cue instead.
function dotClass(tone: StatusTone, surface: 'dark' | 'light'): string {
  if (tone === 'positive') return 'bg-signal-green'
  if (tone === 'negative') {
    return cn(
      'bg-coral ring-2 ring-offset-1',
      surface === 'dark'
        ? 'ring-hero-ink/70 ring-offset-sidebar'
        : 'ring-foreground/70 ring-offset-background',
    )
  }
  return surface === 'dark' ? 'bg-sidebar-foreground/30' : 'bg-muted-foreground/30'
}

function evalSummary(stages: readonly [EvalStatus, EvalStatus, EvalStatus]): string {
  return STAGE_ORDER.map((stage, i) => `${EVAL_STAGE_LABELS[stage]} ${stages[i]}`).join(
    ', ',
  )
}

function formatXp(xp: number): string {
  if (xp < 1000) return String(xp)
  const thousands = xp / 1000
  return `${thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1)}k`
}

interface NodeMemberRowProps {
  name: string
  avatarUrl: string
  tier: Tier
  xp: number
  /** One status per pipeline stage, in stage order — a real per-stage state, not a rollup count, so a missed stage is never hidden inside a completed-count. */
  evaluationStages: readonly [EvalStatus, EvalStatus, EvalStatus]
  /** When set, the row is a link and earns the Bordered Rows hover treatment; when absent, the row is fully static like EvaluationStageRow. */
  href?: string
  surface?: 'dark' | 'light'
  className?: string
}

/**
 * A node member as one row in the Bordered Rows template EvaluationStageRow
 * established: fixed h-[46px], border-b only, surface-aware, per-field
 * aria-label. Field order matches PLATFORM.md's NodeMemberRow spec exactly:
 * avatar, name, tier badge, XP, evaluation stage indicator.
 *
 * The evaluation indicator is 3 small dots, not TierBadge's tick bars —
 * TierBadge already sits in this same row, and a second bar-shaped
 * indicator next to it would read as a second, confusing tier meter. Each
 * dot is colored independently by that stage's own status (reusing
 * EVAL_STATUS_TONE, the same tone map StatusChip uses), so a missed stage
 * is visible at a glance rather than folded into a plain completed-count.
 * The negative dot also carries a ring — the color pair alone sits on the
 * same confusion axis StatusChip solves with a border style, and a plain
 * hue-only fill at 6px would drop that safeguard exactly where the row's
 * "spot a missed stage fast" job needs it most.
 *
 * When `href` is set, the row is a Link with its own concise aria-label
 * (name/tier/xp) rather than letting the per-field labels concatenate into
 * one run-on string, and a visible focus ring matching DashboardSidebar's
 * nav-link treatment. XP shortens to a compact form (e.g. "1.2k") below
 * `sm` rather than disappearing, the same degrade-don't-drop rule
 * EvaluationStageRow's date field follows.
 */
export function NodeMemberRow({
  name,
  avatarUrl,
  tier,
  xp,
  evaluationStages,
  href,
  surface = 'dark',
  className,
}: NodeMemberRowProps) {
  const bright = surface === 'dark' ? 'text-sidebar-foreground' : 'text-foreground'

  const rowClass = cn(
    'flex h-[46px] items-center gap-4 border-b px-4',
    surface === 'dark' ? 'border-sidebar-border' : 'border-border',
    href && [
      'outline-none transition-colors',
      surface === 'dark'
        ? 'hover:bg-sidebar-foreground/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring'
        : 'hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    ],
    className,
  )

  const content = (
    <>
      <div
        className="flex min-w-0 flex-1 items-center gap-3"
        aria-label={`Member: ${name}`}
      >
        <Avatar src={avatarUrl} name={name} size={32} surface={surface} />
        <span className={cn('min-w-0 truncate font-sans text-sm font-medium', bright)}>
          {name}
        </span>
      </div>

      <TierBadge tier={tier} />

      <span
        className={cn('shrink-0 font-mono text-sm tabular-nums', bright)}
        aria-label={`XP: ${xp}`}
      >
        <span className="hidden sm:inline">{xp}</span>
        <span className="sm:hidden">{formatXp(xp)}</span>
      </span>

      <span
        className="flex shrink-0 items-center gap-1"
        aria-label={`Evaluations: ${evalSummary(evaluationStages)}`}
      >
        {evaluationStages.map((status, i) => (
          <span
            key={STAGE_ORDER[i]}
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              dotClass(EVAL_STATUS_TONE[status], surface),
            )}
          />
        ))}
      </span>
    </>
  )

  if (href) {
    return (
      <Link
        href={href}
        className={rowClass}
        aria-label={`${name}, ${tier}, ${xp} XP, view member`}
      >
        {content}
      </Link>
    )
  }

  return <div className={rowClass}>{content}</div>
}
