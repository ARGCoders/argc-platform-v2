import { cn } from '@/lib/utils'
import { evaluations as evaluationsCopy } from '@/lib/content'
import { EvaluationStageRow } from '@/components/shared/dashboard/evaluation-stage-row'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { EvalStage, EvalStatus } from '@/types/pocketbase'

/** One evaluation belonging to a single member, shaped like the GET
 *  `/api/dashboard/node/evaluations` response. */
export interface PipelineEvaluation {
  id: string
  stage: EvalStage
  status: EvalStatus
  /** `{ display_name }` projection of the assigned evaluator, or null when
   *  the stage has no evaluator yet. */
  evaluator: { display_name: string } | null
  scheduled_at: string | null
  score: number | null
}

interface EvaluationPipelineCardProps {
  /** The member these evaluations belong to — identity header of the card. */
  member: { id: string; display_name: string; avatar_url: string }
  /** The evaluatee's evaluations in the current cycle. Only stages present
   *  here render; the card never invents a stage the platform hasn't created. */
  evaluations: PipelineEvaluation[]
  surface?: 'dark' | 'light'
  className?: string
}

/** Canonical rendering order for the 3-stage pipeline (PLATFORM.md §6 Q4). */
const STAGE_ORDER: Record<EvalStage, number> = {
  standard_1: 0,
  standard_2: 1,
  eval_plus_node_leader: 2,
}

/**
 * Groups a single member's evaluation stages into one card unit for the node
 * leader's pipeline (PLATFORM.md §3, MEMBER-09). A fixed identity header
 * (avatar + display name) then one `EvaluationStageRow` per stage, in the
 * canonical stage order regardless of insertion order.
 *
 * The card is presentational: it renders what the page fetched from
 * `/api/dashboard/node/evaluations` and stays read-only — scheduling,
 * completing, and scoring happen through `EvaluationScheduleForm`, never
 * through these rows (matching EvaluationStageRow's own read-only contract).
 */
export function EvaluationPipelineCard({
  member,
  evaluations,
  surface = 'dark',
  className,
}: EvaluationPipelineCardProps) {
  const bright = surface === 'dark' ? 'text-sidebar-foreground' : 'text-foreground'
  const muted =
    surface === 'dark' ? 'text-sidebar-foreground/60' : 'text-muted-foreground'

  const ordered = [...evaluations].sort(
    (a, b) => STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage],
  )

  return (
    <div
      className={cn(
        'border',
        surface === 'dark' ? 'border-sidebar-border' : 'border-border',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-center gap-3 border-b px-4 py-3',
          surface === 'dark' ? 'border-sidebar-border' : 'border-border',
        )}
      >
        <Avatar className="size-8 shrink-0">
          {member.avatar_url !== '' && <AvatarImage src={member.avatar_url} alt="" />}
          <AvatarFallback>{member.display_name.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span
          className={cn('min-w-0 flex-1 truncate font-sans text-sm font-medium', bright)}
        >
          {member.display_name}
        </span>
        <span
          className={cn(
            'shrink-0 font-mono text-[0.72rem] tracking-[0.08em] uppercase',
            muted,
          )}
        >
          {evaluationsCopy.pipeline.title}
        </span>
      </div>

      {ordered.length === 0 ? (
        <p className={cn('px-4 py-6 text-sm', muted)}>
          {evaluationsCopy.pipeline.empty.title} —{' '}
          {evaluationsCopy.pipeline.empty.description}
        </p>
      ) : (
        <div>
          {ordered.map((evaluation) => (
            <EvaluationStageRow
              key={evaluation.id}
              stage={evaluation.stage}
              status={evaluation.status}
              evaluatorName={evaluation.evaluator?.display_name ?? null}
              scheduledAt={evaluation.scheduled_at}
              score={evaluation.score}
              surface={surface}
            />
          ))}
        </div>
      )}
    </div>
  )
}
