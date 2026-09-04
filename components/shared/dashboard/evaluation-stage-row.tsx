import { EVAL_STAGE_LABELS } from '@/lib/constants'
import { formatDate, formatDateShort } from '@/lib/format'
import { cn } from '@/lib/utils'
import { StatusChip } from './status-chip'
import type { EvalStage, EvalStatus } from '@/types/pocketbase'

interface EvaluationStageRowProps {
  stage: EvalStage
  status: EvalStatus
  /** Null when the stage has no evaluator assigned yet — a real state, not an edge case. */
  evaluatorName: string | null
  /** ISO date string, or null when the stage hasn't been scheduled yet. */
  scheduledAt: string | null
  /** 0–100, or null before the stage is completed. */
  score: number | null
  surface?: 'dark' | 'light'
  className?: string
}

/**
 * The reusable bordered-row template — NodeMemberRow, EventRow, and
 * XpLedgerTable's rows are expected to match its height, border, and
 * typography split rather than each inventing their own.
 *
 * Fixed 46px height, calibrated against the reference component sheet's data
 * ledger row, so a future LoadingRow skeleton can match it exactly. A
 * bottom-only divider, not a full box — the outer edges belong to whatever
 * wraps a list of these (EvaluationPipelineCard, a table), not the row
 * itself, matching how the reference ledger's rows divide inside one shared
 * container rather than each drawing its own box.
 *
 * Typography splits by what the field IS, not by where its value comes
 * from or where it sits in the row. Stage classifies which of 3 fixed
 * pipeline stages this is — Mono-Reports territory, the same job
 * RoleBadge/TierBadge/StatusChip do. Evaluator name is a person's
 * identity — Sans-Speaks territory, matching DashboardSidebar's Identity
 * name. Being enum-sourced doesn't put a field on the mono side by itself
 * (an XP ledger's category column, e.g. "Evaluation (on time)", is also
 * enum-sourced but reads as a narrated description, not a category tag, so
 * it stays sans) — what matters is whether the text classifies or narrates.
 * Timestamp and score stay mono as plain data.
 *
 * Every field but StatusChip (which already labels itself) carries its own
 * `aria-label` — "Stage: …", "Evaluator: …", "Scheduled: …" / "Not yet
 * scheduled", "Score: …" / "Not yet scored" — so a screen reader can tell
 * fields apart and tell the two different null states ("—" for no date,
 * "—" for no score) apart, matching how RoleBadge/TierBadge/StatusChip
 * disambiguate themselves. Below `sm` the date shortens to MM-DD rather
 * than disappearing — it's the one field a node leader needs on their
 * phone, so it degrades instead of dropping out of the accessibility tree.
 *
 * Read-only: no hover, no click affordance. Scheduling, completing, and
 * scoring happen in a separate form, never through this row.
 */
export function EvaluationStageRow({
  stage,
  status,
  evaluatorName,
  scheduledAt,
  score,
  surface = 'dark',
  className,
}: EvaluationStageRowProps) {
  const bright = surface === 'dark' ? 'text-sidebar-foreground' : 'text-foreground'
  const muted =
    surface === 'dark' ? 'text-sidebar-foreground/60' : 'text-muted-foreground'
  const dash =
    surface === 'dark' ? 'text-sidebar-foreground/40' : 'text-muted-foreground/60'

  return (
    <div
      className={cn(
        'flex h-[46px] items-center gap-4 border-b px-4',
        surface === 'dark' ? 'border-sidebar-border' : 'border-border',
        className,
      )}
    >
      <span
        className={cn(
          'shrink-0 font-mono text-[0.72rem] font-medium tracking-[0.1em] whitespace-nowrap uppercase',
          bright,
        )}
        aria-label={`Stage: ${EVAL_STAGE_LABELS[stage]}`}
      >
        {EVAL_STAGE_LABELS[stage]}
      </span>

      <span
        className={cn(
          'min-w-0 flex-1 truncate font-sans text-sm font-medium',
          evaluatorName ? bright : muted,
        )}
        aria-label={`Evaluator: ${evaluatorName ?? 'unassigned'}`}
      >
        {evaluatorName ?? 'Unassigned'}
      </span>

      <span
        className={cn(
          'shrink-0 font-mono text-sm tabular-nums',
          scheduledAt ? muted : dash,
        )}
        aria-label={
          scheduledAt ? `Scheduled: ${formatDate(scheduledAt)}` : 'Not yet scheduled'
        }
      >
        <span className="hidden sm:inline">
          {scheduledAt ? formatDate(scheduledAt) : '—'}
        </span>
        <span className="sm:hidden">
          {scheduledAt ? formatDateShort(scheduledAt) : '—'}
        </span>
      </span>

      <span
        className={cn(
          'w-8 shrink-0 text-right font-mono text-sm tabular-nums',
          score !== null ? bright : dash,
        )}
        aria-label={score !== null ? `Score: ${score}` : 'Not yet scored'}
      >
        {score !== null ? score : '—'}
      </span>

      <StatusChip domain="eval" status={status} surface={surface} className="shrink-0" />
    </div>
  )
}
