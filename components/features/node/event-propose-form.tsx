'use client'

import { useState } from 'react'
import { Field, FieldArea, FieldWrapper } from '@/components/shared/field'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { nodeEvents as nodeEventsCopy } from '@/lib/content'

/**
 * Payload for the MEMBER-14 propose POST. `starts_at` is a UTC ISO string
 * (converted from the local `datetime-local` picker); description/location are
 * null when left blank, never empty strings; fields outside this shape are
 * never sent.
 */
export interface ProposeEventInput {
  title: string
  type: string
  description: string | null
  starts_at: string
  location: string | null
  is_public: boolean
}

export type ProposeEventResult =
  { ok: true } | { ok: false; reason: 'past' | 'invalid' | 'unknown' }

interface EventProposeFormProps {
  onPropose: (input: ProposeEventInput) => Promise<ProposeEventResult>
}

type FieldErrors = Partial<Record<'title' | 'type' | 'starts_at', string>>
type Feedback = { kind: 'success' | 'error'; message: string }

/**
 * Node leader's proposal file form (PLATFORM.md §3 MEMBER-14). Stateful and
 * decoupled like VoteCastForm / EvaluationScheduleForm: the page owns fetching
 * the submit route and owns `onPropose`, which reports one of the three
 * discriminated result kinds — `past` (start time not in the future), `invalid`
 * (server-side validation rejected the payload), `unknown` (any failure,
 * including a thrown network error) — each mapped to its user-safe copy.
 *
 * Bound client-side to the server's own authoritative limits where cheap: the
 * title field caps at 120; the start time must be strictly in the future
 * (mirrors the route). All fields are JS-validated with an inline alert — the
 * shared Field components set a native `required` only if asked, and a native
 * constraint would swallow the tailored message the form works hard for.
 */
export function EventProposeForm({ onPropose }: EventProposeFormProps) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState('')
  const [description, setDescription] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [location, setLocation] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [feedback, setFeedback] = useState<Feedback | null>(null)

  function clearFieldError(field: keyof FieldErrors) {
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev))
  }

  function validate(): ProposeEventInput | null {
    const next: FieldErrors = {}
    if (title.trim() === '') next.title = nodeEventsCopy.propose.errors.titleRequired
    if (type === '') next.type = nodeEventsCopy.propose.errors.typeRequired
    if (startsAt === '') {
      next.starts_at = nodeEventsCopy.propose.errors.startsAtRequired
    } else if (new Date(startsAt).getTime() <= Date.now()) {
      next.starts_at = nodeEventsCopy.propose.errors.inPast
    }
    setFieldErrors(next)
    if (Object.keys(next).length > 0) return null

    return {
      title: title.trim(),
      type,
      description: description.trim() === '' ? null : description.trim(),
      starts_at: new Date(startsAt).toISOString(),
      location: location.trim() === '' ? null : location.trim(),
      is_public: isPublic,
    }
  }

  async function handleSubmit() {
    const input = validate()
    if (!input) return

    setSubmitting(true)
    try {
      const result = await onPropose(input)
      if (result.ok) {
        setFeedback({ kind: 'success', message: nodeEventsCopy.propose.success })
        setTitle('')
        setType('')
        setDescription('')
        setStartsAt('')
        setLocation('')
        setIsPublic(false)
        return
      }
      setFeedback({
        kind: 'error',
        message:
          result.reason === 'past'
            ? nodeEventsCopy.propose.errors.inPast
            : result.reason === 'invalid'
              ? nodeEventsCopy.propose.errors.invalid
              : nodeEventsCopy.propose.errors.default,
      })
    } catch {
      setFeedback({ kind: 'error', message: nodeEventsCopy.propose.errors.default })
    } finally {
      setSubmitting(false)
    }
  }

  const typeOptions = nodeEventsCopy.propose.fields.type.options

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
          {nodeEventsCopy.propose.title}
        </p>
        <p className="text-sm text-ink-muted">{nodeEventsCopy.propose.intro}</p>
      </div>

      <Field
        label={nodeEventsCopy.propose.fields.title.label}
        placeholder={nodeEventsCopy.propose.fields.title.placeholder}
        maxLength={120}
        value={title}
        error={fieldErrors.title}
        onChange={(event) => {
          setTitle(event.target.value)
          clearFieldError('title')
          setFeedback(null)
        }}
      />

      <FieldWrapper
        label={nodeEventsCopy.propose.fields.type.label}
        id="propose-type"
        error={fieldErrors.type}
      >
        <select
          id="propose-type"
          value={type}
          aria-invalid={fieldErrors.type ? true : undefined}
          aria-describedby={fieldErrors.type ? 'propose-type-error' : undefined}
          onChange={(event) => {
            setType(event.target.value)
            clearFieldError('type')
            setFeedback(null)
          }}
          className={cn(
            'w-full bg-transparent rounded-none border border-hero-ink/55 px-4 py-3',
            'font-sans text-[0.9375rem] text-hero-ink outline-none',
            'transition-colors duration-150 focus:border-hero-ink',
            'aria-[invalid=true]:border-destructive',
          )}
        >
          <option value="">{nodeEventsCopy.propose.fields.type.placeholder}</option>
          {Object.entries(typeOptions).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </FieldWrapper>

      <FieldArea
        label={nodeEventsCopy.propose.fields.description.label}
        placeholder={nodeEventsCopy.propose.fields.description.placeholder}
        value={description}
        onChange={(event) => {
          setDescription(event.target.value)
          setFeedback(null)
        }}
      />

      <Field
        label={nodeEventsCopy.propose.fields.starts_at.label}
        type="datetime-local"
        error={fieldErrors.starts_at}
        value={startsAt}
        onChange={(event) => {
          setStartsAt(event.target.value)
          clearFieldError('starts_at')
          setFeedback(null)
        }}
      />
      <p className="-mt-4 font-mono text-[0.7rem] tracking-[0.04em] text-ink-muted">
        {nodeEventsCopy.propose.fields.starts_at.hint}
      </p>

      <Field
        label={nodeEventsCopy.propose.fields.location.label}
        placeholder={nodeEventsCopy.propose.fields.location.placeholder}
        value={location}
        onChange={(event) => {
          setLocation(event.target.value)
          setFeedback(null)
        }}
      />

      <FieldWrapper
        label={nodeEventsCopy.propose.fields.is_public.label}
        id="propose-public"
      >
        <div className="flex items-center gap-3">
          <input
            id="propose-public"
            type="checkbox"
            checked={isPublic}
            onChange={(event) => {
              setIsPublic(event.target.checked)
              setFeedback(null)
            }}
            className="size-4 accent-argc-maroon"
          />
          <span className="text-sm text-ink-muted">
            {nodeEventsCopy.propose.fields.is_public.hint}
          </span>
        </div>
      </FieldWrapper>

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
          {nodeEventsCopy.propose.submit}
        </Button>
      </div>
    </form>
  )
}
