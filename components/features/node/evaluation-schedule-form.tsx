'use client'

import { useId, useState } from 'react'
import { Field, FieldWrapper } from '@/components/shared/field'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { evaluations as evaluationsCopy } from '@/lib/content'

/** Shape sent to `PATCH /api/dashboard/node/evaluations/[id]` to schedule a
 *  pending evaluation. `evaluator_id` null leaves the stage unassigned. */
export interface ScheduleEvaluationInput {
  scheduled_at: string
  evaluator_id: string | null
}

export type ScheduleEvaluationResult =
  { ok: true } | { ok: false; reason: 'conflict' | 'invalid' | 'unknown' }

interface EvaluationScheduleFormProps {
  /** The member this evaluation belongs to — self-assignment as evaluator is
   *  the one candidate the picker always excludes. */
  evaluatee: { id: string; display_name: string }
  /** The node's current members, as candidate evaluators (MEMBER-09 scope:
   *  the API only accepts an evaluator in the caller's node). */
  evaluators: Array<{ id: string; display_name: string }>
  onSchedule: (input: ScheduleEvaluationInput) => Promise<ScheduleEvaluationResult>
}

type Feedback = { kind: 'success' | 'error'; message: string }

/**
 * Node leader tool to schedule one evaluation stage (PLATFORM.md §3,
 * MEMBER-09): pick an evaluator and set a date, then `onSchedule` drives the
 * `pending → scheduled` PATCH. Purely stateful, following VoteCastForm's
 * decoupling — the page owns fetching and owns `onSchedule`.
 *
 * The date control is a local datetime; it is converted to a UTC ISO string
 * before submission. Completing the evaluation on the scheduled UTC calendar
 * day is what earns `evaluation_on_time` (see the PATCH route), so the
 * calendar-day the leader sees in their local picker is the day that counts.
 */
export function EvaluationScheduleForm({
  evaluatee,
  evaluators,
  onSchedule,
}: EvaluationScheduleFormProps) {
  const evaluatorFieldId = useId()
  const [scheduledAt, setScheduledAt] = useState('')
  const [evaluatorId, setEvaluatorId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)

  const candidates = evaluators.filter((member) => member.id !== evaluatee.id)

  function handleChange() {
    setFeedback(null)
  }

  async function handleSubmit() {
    if (scheduledAt === '') {
      setFeedback({
        kind: 'error',
        message: evaluationsCopy.schedule.date.required,
      })
      return
    }

    setSubmitting(true)
    try {
      const result = await onSchedule({
        scheduled_at: new Date(scheduledAt).toISOString(),
        evaluator_id: evaluatorId === '' ? null : evaluatorId,
      })

      if (result.ok) {
        setFeedback({ kind: 'success', message: evaluationsCopy.schedule.success })
        setScheduledAt('')
        setEvaluatorId('')
        return
      }

      setFeedback({
        kind: 'error',
        message:
          result.reason === 'conflict'
            ? evaluationsCopy.schedule.errors.conflict
            : result.reason === 'invalid'
              ? evaluationsCopy.schedule.errors.invalid
              : evaluationsCopy.schedule.errors.default,
      })
    } catch {
      // A rejected promise (failed network request) must not leave the form
      // stuck mid-submit — surface the generic error and allow a retry.
      setFeedback({ kind: 'error', message: evaluationsCopy.schedule.errors.default })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault()
        handleSubmit()
      }}
    >
      <div className="flex flex-col gap-1">
        <p className="font-mono text-[0.72rem] tracking-[0.08em] uppercase text-ink-muted">
          {evaluationsCopy.schedule.title}
        </p>
        <p className="text-sm text-ink-muted">
          {evaluationsCopy.schedule.intro.replace('{name}', evaluatee.display_name)}
        </p>
      </div>

      <Field
        label={evaluationsCopy.schedule.date.label}
        type="datetime-local"
        value={scheduledAt}
        onChange={(event) => {
          setScheduledAt(event.target.value)
          handleChange()
        }}
      />

      {candidates.length > 0 ? (
        <FieldWrapper
          label={evaluationsCopy.schedule.evaluator.label}
          id={evaluatorFieldId}
        >
          <select
            id={evaluatorFieldId}
            value={evaluatorId}
            onChange={(event) => {
              setEvaluatorId(event.target.value)
              handleChange()
            }}
            className={cn(
              'w-full bg-transparent rounded-none border border-hero-ink/55 px-4 py-3',
              'font-sans text-[0.9375rem] text-hero-ink outline-none',
              'transition-colors duration-150 focus:border-hero-ink',
            )}
          >
            <option value="">{evaluationsCopy.schedule.evaluator.unassigned}</option>
            {candidates.map((member) => (
              <option key={member.id} value={member.id}>
                {member.display_name}
              </option>
            ))}
          </select>
        </FieldWrapper>
      ) : (
        <p className="text-xs text-ink-muted">
          {evaluationsCopy.schedule.evaluator.unassigned}
        </p>
      )}

      {feedback && (
        <p
          role={feedback.kind === 'error' ? 'alert' : 'status'}
          className={cn(
            'font-mono text-[0.75rem] tracking-[0.04em]',
            feedback.kind === 'error' ? 'text-destructive' : 'text-eng-navy',
          )}
        >
          {feedback.message}
        </p>
      )}

      <div>
        <Button type="submit" disabled={submitting} aria-busy={submitting}>
          {evaluationsCopy.schedule.submit}
        </Button>
      </div>
    </form>
  )
}
