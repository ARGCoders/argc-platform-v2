import { EVAL_STAGE_LABELS } from '@/lib/constants'
import { formatEventDate } from '@/lib/format'
import { dashboardOverview as copy } from '@/lib/content'
import { cn } from '@/lib/utils'
import { XpBar } from '@/components/shared/dashboard/xp-bar'
import { StatusChip } from '@/components/shared/dashboard/status-chip'
import { EmptyState } from '@/components/shared/empty-state'
import type { EvalStage, EvalStatus } from '@/types/pocketbase'

// Fixed pipeline order — the same 3 stages NodeMemberRow's own dot summary
// walks in, so a stage with no evaluations row yet still gets its slot.
const STAGE_ORDER: EvalStage[] = ['standard_1', 'standard_2', 'eval_plus_node_leader']

export interface OverviewEvent {
  id: string
  title: string
  starts_at: string
  ends_at: string | null
}

export interface OverviewContentProps {
  nodeName: string | null
  /** null = no active cycle / no XP logged yet — the same shape per me/stats' own contract. */
  xp: number | null
  /** null = not in a node yet. A present-but-sparse array is normal: a stage with no row yet just has no matching entry. */
  evals: { stage: EvalStage; status: EvalStatus }[] | null
  events: OverviewEvent[]
}

/**
 * Pure presentational split from app/dashboard/overview/page.tsx, so the
 * dev preview (fixture data) and the real page (fetched data) render
 * identically without duplicating the layout — any change here reaches
 * both automatically.
 */
export function OverviewContent({ nodeName, xp, evals, events }: OverviewContentProps) {
  return (
    <div className="flex flex-col gap-8 px-6 py-8">
      {nodeName && (
        <p
          className="flex items-center gap-1.5 font-mono text-[0.68rem] tracking-[0.1em] uppercase"
          aria-label={`Node: ${nodeName}`}
        >
          <span className="text-sidebar-foreground/40">{copy.labels.node}</span>
          <span className="text-sidebar-foreground/60">{nodeName}</span>
        </p>
      )}

      <section className="max-w-md">
        {xp !== null ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-semibold tabular-nums text-sidebar-foreground">
                {xp}
              </span>
              <span className="font-mono text-[0.68rem] tracking-[0.1em] text-sidebar-foreground/60 uppercase">
                XP
              </span>
            </div>
            <XpBar xp={xp} />
          </div>
        ) : (
          <EmptyState
            title={copy.empty.noCycle.title}
            description={copy.empty.noCycle.description}
            surface="dark"
          />
        )}
      </section>

      <section>
        <p className="mb-3 font-mono text-[0.68rem] font-medium tracking-[0.1em] text-sidebar-foreground/60 uppercase">
          {copy.sections.evaluationStatus}
        </p>
        {evals ? (
          <div className="border border-sidebar-border">
            {STAGE_ORDER.map((stage, i) => {
              const record = evals.find((e) => e.stage === stage)
              return (
                <div
                  key={stage}
                  className={cn(
                    'flex h-[46px] items-center justify-between gap-3 border-b border-sidebar-border px-4',
                    i === STAGE_ORDER.length - 1 && 'border-b-0',
                  )}
                >
                  <span
                    className="font-mono text-[0.72rem] font-medium tracking-[0.08em] text-sidebar-foreground uppercase"
                    aria-label={`Stage: ${EVAL_STAGE_LABELS[stage]}`}
                  >
                    {EVAL_STAGE_LABELS[stage]}
                  </span>
                  {record ? (
                    <StatusChip domain="eval" status={record.status} />
                  ) : (
                    <span className="font-mono text-[0.68rem] text-sidebar-foreground/40">
                      {copy.empty.noStageRecord}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyState
            title={copy.empty.noNode.title}
            description={copy.empty.noNode.description}
            surface="dark"
          />
        )}
      </section>

      <section>
        <p className="mb-3 font-mono text-[0.68rem] font-medium tracking-[0.1em] text-sidebar-foreground/60 uppercase">
          {copy.sections.upcomingEvents}
        </p>
        {events.length > 0 ? (
          <div className="border border-sidebar-border">
            {events.map((event, i) => (
              <div
                key={event.id}
                className={cn(
                  'flex h-[46px] items-center justify-between gap-3 border-b border-sidebar-border px-4',
                  i === events.length - 1 && 'border-b-0',
                )}
              >
                <span
                  className="min-w-0 truncate font-sans text-sm font-medium text-sidebar-foreground"
                  aria-label={`Event: ${event.title}`}
                >
                  {event.title}
                </span>
                <span
                  className="shrink-0 font-mono text-[0.72rem] text-sidebar-foreground/60"
                  aria-label={`Date: ${formatEventDate(event.starts_at, event.ends_at)}`}
                >
                  {formatEventDate(event.starts_at, event.ends_at)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title={copy.empty.noEvents.title}
            description={copy.empty.noEvents.description}
            surface="dark"
          />
        )}
      </section>
    </div>
  )
}
