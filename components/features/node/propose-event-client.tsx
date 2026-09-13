'use client'

import {
  EventProposeForm,
  type ProposeEventInput,
  type ProposeEventResult,
} from './event-propose-form'

/**
 * Thin client bridge for the propose page (MEMBER-14): owns the same-origin
 * POST to `/api/dashboard/node/events` and maps the route's envelope onto the
 * form's discriminated result. Cookie forwarding is automatic — same origin,
 * so the HttpOnly auth cookie rides along, matching how every other client
 * action on the platform reaches its route.
 *
 * The `past` reason maps from the route's literal `starts_at must be in the
 * future` validation message: the form already pre-validates the future check,
 * but a client clock can disagree with the server by the time the submit
 * lands, and then the honest thing is to tell the member *why*.
 */
export function ProposeEventClient() {
  async function handlePropose(input: ProposeEventInput): Promise<ProposeEventResult> {
    const res = await fetch('/api/dashboard/node/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (res.ok) return { ok: true }

    let message: string | null = null
    try {
      const body = (await res.json()) as { error?: { message?: string } }
      message = body.error?.message ?? null
    } catch {
      // non-JSON failure body — falls through to `unknown`
    }

    if (res.status === 400) {
      if (message?.includes('in the future')) return { ok: false, reason: 'past' }
      return { ok: false, reason: 'invalid' }
    }
    return { ok: false, reason: 'unknown' }
  }

  return <EventProposeForm onPropose={handlePropose} />
}
