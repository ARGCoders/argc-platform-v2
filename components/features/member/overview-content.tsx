'use client'

import { Fragment, type ReactNode } from 'react'
import { EVAL_STAGE_LABELS } from '@/lib/constants'
import { formatEventDate } from '@/lib/format'
import { dashboardOverview as copy } from '@/lib/content'
import { cn } from '@/lib/utils'
import { useDashboardTheme, type Surface } from '@/lib/dashboard-theme-context'
import { XpBar } from '@/components/shared/dashboard/xp-bar'
import { StatusChip } from '@/components/shared/dashboard/status-chip'
import { AsciiBoot } from '@/components/shared/dashboard/ascii-boot'
import { EmptyState } from '@/components/shared/empty-state'
import type { EvalStage, EvalStatus } from '@/types/pocketbase'

// Fixed pipeline order — the same 3 stages NodeMemberRow's own dot summary
// walks in, so a stage with no evaluations row yet still gets its slot.
const STAGE_ORDER: EvalStage[] = ['standard_1', 'standard_2', 'eval_plus_node_leader']

type RuleVariant = 'top' | 'mid' | 'bottom'

const RULE_CORNERS: Record<RuleVariant, [string, string]> = {
  top: ['┌', '┐'],
  mid: ['├', '┤'],
  bottom: ['└', '┘'],
}

/**
 * Unicode box-drawing (`┌─┐└┘├┤│`), accepting a font-fallback trade-off
 * checked directly, not assumed: IBM Plex Mono is loaded via `next/font/
 * google` with `subsets: ['latin']` (app/layout.tsx), and none of the
 * generated @font-face rules' unicode-range blocks cover U+2500-257F, so
 * these specific glyphs render in the stack's `Courier New` fallback rather
 * than the page's own mono face. Accepted deliberately: these are simple
 * line/corner shapes, not text, so a different (but still monospace,
 * still terminal-compatible) font for just these characters reads as a
 * minor rendering detail rather than a voice inconsistency — unlike, say,
 * a label or a name falling back would. `AsciiBoot`'s own `█` cursor
 * (above) has always rendered in that same fallback for the same reason.
 *
 * Local to this page only — EvaluationStageRow, NodeMemberRow, and
 * XpLedgerTable keep their existing CSS-border Bordered Rows treatment (see
 * DESIGN.md, Bordered Rows: "ASCII-Divider Variant"). Decorative structure,
 * not content: aria-hidden so a screen reader never reads out individual
 * characters — verified by a test, not just this comment.
 */
function AsciiRule({ variant, surface }: { variant: RuleVariant; surface: Surface }) {
  const [left, right] = RULE_CORNERS[variant]
  const dim =
    surface === 'dark' ? 'text-sidebar-foreground/40' : 'text-muted-foreground/60'
  return (
    <div aria-hidden="true" className={cn('flex select-none', dim)}>
      <span>{left}</span>
      <span className="flex-1 overflow-hidden whitespace-pre">{'─'.repeat(300)}</span>
      <span>{right}</span>
    </div>
  )
}

function AsciiRow({ children, surface }: { children: ReactNode; surface: Surface }) {
  const dim =
    surface === 'dark' ? 'text-sidebar-foreground/40' : 'text-muted-foreground/60'
  return (
    <div className="flex h-[46px] items-center">
      <span aria-hidden="true" className={cn('select-none', dim)}>
        │
      </span>
      <div className="flex flex-1 items-center justify-between gap-3 px-3">
        {children}
      </div>
      <span aria-hidden="true" className={cn('select-none', dim)}>
        │
      </span>
    </div>
  )
}

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
  /**
   * Omit this on the real page — it can't know the client's persisted
   * dashboard-theme preference (lib/dashboard-theme-context.tsx) at render
   * time, so this reads it live instead. Pass an explicit value to pin a
   * swatch regardless of the live toggle (the dev preview's fixed-state
   * swatches do this).
   */
  surface?: Surface
}

/**
 * Pure presentational split from app/dashboard/overview/page.tsx, so the
 * dev preview (fixture data) and the real page (fetched data) render
 * identically without duplicating the layout — any change here reaches
 * both automatically.
 */
export function OverviewContent({
  nodeName,
  xp,
  evals,
  events,
  surface,
}: OverviewContentProps) {
  const { surface: liveSurface } = useDashboardTheme()
  const resolvedSurface = surface ?? liveSurface
  const bright =
    resolvedSurface === 'dark' ? 'text-sidebar-foreground' : 'text-foreground'
  const muted =
    resolvedSurface === 'dark' ? 'text-sidebar-foreground/60' : 'text-muted-foreground'
  const dim =
    resolvedSurface === 'dark' ? 'text-sidebar-foreground/40' : 'text-muted-foreground/60'

  return (
    <div className="flex flex-col gap-8 px-6 py-8">
      <AsciiBoot nodeName={nodeName} surface={resolvedSurface} />

      {nodeName && (
        <p
          className="flex items-center gap-1.5 font-mono text-[0.68rem] tracking-[0.1em] uppercase"
          aria-label={`Node: ${nodeName}`}
        >
          <span className={dim}>{copy.labels.node}</span>
          <span className={bright}>{nodeName}</span>
        </p>
      )}

      <section className="max-w-md">
        {xp !== null ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline gap-2">
              <span
                className={cn('font-mono text-3xl font-semibold tabular-nums', bright)}
              >
                {xp}
              </span>
              <span
                className={cn(
                  'font-mono text-[0.68rem] tracking-[0.1em] uppercase',
                  muted,
                )}
              >
                XP
              </span>
            </div>
            <XpBar xp={xp} surface={resolvedSurface} />
          </div>
        ) : (
          <EmptyState
            title={copy.empty.noCycle.title}
            description={copy.empty.noCycle.description}
            surface={resolvedSurface}
          />
        )}
      </section>

      <section>
        <p
          className={cn(
            'mb-3 font-mono text-[0.68rem] font-medium tracking-[0.1em] uppercase',
            muted,
          )}
        >
          {copy.sections.evaluationStatus}
        </p>
        {evals ? (
          <div>
            <AsciiRule variant="top" surface={resolvedSurface} />
            {STAGE_ORDER.map((stage, i) => {
              const record = evals.find((e) => e.stage === stage)
              return (
                <Fragment key={stage}>
                  <AsciiRow surface={resolvedSurface}>
                    <span
                      className={cn(
                        'font-mono text-[0.72rem] font-medium tracking-[0.08em] uppercase',
                        bright,
                      )}
                      aria-label={`Stage: ${EVAL_STAGE_LABELS[stage]}`}
                    >
                      {EVAL_STAGE_LABELS[stage]}
                    </span>
                    {record ? (
                      <StatusChip
                        domain="eval"
                        status={record.status}
                        surface={resolvedSurface}
                      />
                    ) : (
                      <span className={cn('font-mono text-[0.68rem]', dim)}>
                        {copy.empty.noStageRecord}
                      </span>
                    )}
                  </AsciiRow>
                  <AsciiRule
                    variant={i === STAGE_ORDER.length - 1 ? 'bottom' : 'mid'}
                    surface={resolvedSurface}
                  />
                </Fragment>
              )
            })}
          </div>
        ) : (
          <EmptyState
            title={copy.empty.noNode.title}
            description={copy.empty.noNode.description}
            surface={resolvedSurface}
          />
        )}
      </section>

      <section>
        <p
          className={cn(
            'mb-3 font-mono text-[0.68rem] font-medium tracking-[0.1em] uppercase',
            muted,
          )}
        >
          {copy.sections.upcomingEvents}
        </p>
        {events.length > 0 ? (
          <div>
            <AsciiRule variant="top" surface={resolvedSurface} />
            {events.map((event, i) => (
              <Fragment key={event.id}>
                <AsciiRow surface={resolvedSurface}>
                  <span
                    className={cn(
                      'min-w-0 truncate font-sans text-sm font-medium',
                      bright,
                    )}
                    aria-label={`Event: ${event.title}`}
                  >
                    {event.title}
                  </span>
                  <span
                    className={cn('shrink-0 font-mono text-[0.72rem]', muted)}
                    aria-label={`Date: ${formatEventDate(event.starts_at, event.ends_at)}`}
                  >
                    {formatEventDate(event.starts_at, event.ends_at)}
                  </span>
                </AsciiRow>
                <AsciiRule
                  variant={i === events.length - 1 ? 'bottom' : 'mid'}
                  surface={resolvedSurface}
                />
              </Fragment>
            ))}
          </div>
        ) : (
          <EmptyState
            title={copy.empty.noEvents.title}
            description={copy.empty.noEvents.description}
            surface={resolvedSurface}
          />
        )}
      </section>
    </div>
  )
}
