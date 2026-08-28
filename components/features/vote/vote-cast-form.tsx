'use client'

import { useMemo, useState } from 'react'
import { FieldArea } from '@/components/shared/field'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { vote as voteCopy } from '@/lib/content'
import type { VotePolarity } from '@/types/pocketbase'

/**
 * Cast one cross-node vote (MEMBER-12). The subject comes from the eligible
 * list, the polarity is capped at one positive + one negative per cycle, and
 * the reason is validated client-side to the same 10–500 bound the POST route
 * enforces. A confirmation step sits between drafting and submitting.
 *
 * Purely presentational + stateful: the page owns fetching (`/eligible`,
 * `/my-votes`) and calls `onCast` (the POST) so this form stays decoupled from
 * data access. After a successful cast, `myVotes` is expected to reflect the
 * new record so the spent polarity becomes unavailable.
 */

export interface VoteCastMember {
  id: string
  display_name: string
  avatar_url: string
  node: { id: string; name: string } | null
}

export interface CastVoteInput {
  subject: string
  polarity: VotePolarity
  reason: string
}

export type CastVoteResult = { ok: true } | { ok: false; reason: 'conflict' | 'unknown' }

const POLARITIES: VotePolarity[] = ['positive', 'negative']

interface VoteCastFormProps {
  eligible: VoteCastMember[]
  myVotes: { polarity: VotePolarity }[]
  onCast: (input: CastVoteInput) => Promise<CastVoteResult>
}

type Feedback = { kind: 'success' | 'error'; message: string }

export function VoteCastForm({ eligible, myVotes, onCast }: VoteCastFormProps) {
  const [subjectId, setSubjectId] = useState('')
  const [polarity, setPolarity] = useState<VotePolarity | null>(null)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)

  const spent = useMemo(() => new Set(myVotes.map((v) => v.polarity)), [myVotes])
  const trimmedReason = reason.trim()
  const reasonTooShort = trimmedReason.length < voteCopy.reason.min
  const reasonTooLong = trimmedReason.length > voteCopy.reason.max
  const canSubmit = subjectId !== '' && polarity !== null && !spent.has(polarity)

  const subject = eligible.find((m) => m.id === subjectId)

  function handleChange() {
    setReasonError(null)
    setFeedback(null)
  }

  function handlePlace() {
    if (reasonTooShort) {
      setReasonError(voteCopy.reason.tooShort)
      return
    }
    if (reasonTooLong) {
      setReasonError(voteCopy.reason.tooLong)
      return
    }
    setFeedback(null)
    setConfirming(true)
  }

  async function handleConfirm() {
    if (!subject || polarity === null) return
    setSubmitting(true)
    const result = await onCast({
      subject: subject.id,
      polarity,
      reason: trimmedReason,
    })
    setSubmitting(false)

    if (result.ok) {
      setFeedback({ kind: 'success', message: voteCopy.success })
      setConfirming(false)
      setSubjectId('')
      setPolarity(null)
      setReason('')
    } else {
      setConfirming(false)
      setFeedback({
        kind: 'error',
        message:
          result.reason === 'conflict'
            ? voteCopy.errors.conflict
            : voteCopy.errors.default,
      })
    }
  }

  if (eligible.length === 0) {
    return <p className="text-sm text-ink-muted">{voteCopy.subject.empty}</p>
  }

  return (
    <div className="flex flex-col gap-6">
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

      {/* Subject — the eligible, cross-node members. */}
      <fieldset className="flex flex-col gap-2">
        <legend className="font-mono text-[0.72rem] tracking-[0.08em] uppercase text-ink-muted">
          {voteCopy.subject.label}
        </legend>
        <ul className="flex flex-col gap-1">
          {eligible.map((member) => {
            const id = `vote-subject-${member.id}`
            return (
              <li key={member.id}>
                <input
                  type="radio"
                  id={id}
                  name="vote-subject"
                  value={member.id}
                  className="sr-only"
                  checked={subjectId === member.id}
                  onChange={(event) => {
                    if (event.target.checked) setSubjectId(member.id)
                    handleChange()
                  }}
                />
                <label
                  htmlFor={id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 border px-4 py-3 transition-colors duration-150',
                    subjectId === member.id
                      ? 'border-eng-navy bg-eng-navy/5'
                      : 'border-input hover:border-eng-navy/60',
                  )}
                >
                  <Avatar className="size-8">
                    {member.avatar_url && <AvatarImage src={member.avatar_url} alt="" />}
                    <AvatarFallback>
                      {member.display_name.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex flex-col">
                    <span className="text-sm font-medium text-eng-navy">
                      {member.display_name}
                    </span>
                    {member.node && (
                      <span className="text-xs text-ink-muted">{member.node.name}</span>
                    )}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      </fieldset>

      {/* Polarity — one positive and one negative per cycle. */}
      <div className="flex flex-col gap-2">
        <span className="font-mono text-[0.72rem] tracking-[0.08em] uppercase text-ink-muted">
          {voteCopy.polarity.label}
        </span>
        <div className="flex gap-2" role="group" aria-label={voteCopy.polarity.label}>
          {POLARITIES.map((option) => {
            const used = spent.has(option)
            return (
              <Button
                key={option}
                type="button"
                variant={polarity === option ? 'default' : 'outline'}
                disabled={used}
                aria-pressed={polarity === option}
                onClick={() => {
                  setPolarity(option)
                  handleChange()
                }}
              >
                {voteCopy.polarity[option]}
              </Button>
            )
          })}
        </div>
        {polarity && (
          <p className="text-xs text-ink-muted">
            {polarity === 'positive'
              ? voteCopy.polarity.positiveHint
              : voteCopy.polarity.negativeHint}
          </p>
        )}
      </div>

      {/* Reason — same 10–500 bound as the server. */}
      <FieldArea
        label={voteCopy.reason.label}
        placeholder={voteCopy.reason.placeholder}
        minLength={voteCopy.reason.min}
        maxLength={voteCopy.reason.max}
        value={reason}
        error={reasonError ?? undefined}
        onChange={(event) => {
          setReason(event.target.value)
          handleChange()
        }}
      />
      <p className="-mt-3 font-mono text-[0.7rem] tracking-[0.04em] text-ink-muted">
        {reason.length}/{voteCopy.reason.max} {voteCopy.reason.chars}
      </p>

      <div>
        <Button type="button" size="lg" disabled={!canSubmit} onClick={handlePlace}>
          {voteCopy.submit}
        </Button>
      </div>

      {/* Confirmation step — nothing is sent until this is confirmed. */}
      {confirming && subject && polarity && (
        <div
          role="dialog"
          aria-labelledby="vote-confirm-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-eng-navy/60 p-4"
        >
          <form
            className="flex w-full max-w-sm flex-col gap-4 border border-input bg-background p-6"
            onSubmit={(event) => {
              event.preventDefault()
              handleConfirm()
            }}
          >
            <p
              id="vote-confirm-title"
              className="font-mono text-sm tracking-[0.04em] uppercase"
            >
              {voteCopy.confirm.title}
            </p>
            <p className="text-sm text-ink-muted">
              {voteCopy.confirm.body
                .replace('{polarity}', voteCopy.polarity[polarity].toLowerCase())
                .replace('{name}', subject.display_name)}
            </p>
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting} aria-busy={submitting}>
                {voteCopy.confirm.confirm}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => setConfirming(false)}
              >
                {voteCopy.confirm.back}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
