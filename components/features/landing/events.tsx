import Link from 'next/link'
import { EventRow } from './event-row'
import { RevealOnScroll } from './reveal-on-scroll'
import { EmptyState } from '@/components/shared/empty-state'
import { landing } from '@/lib/content'
import { env } from '@/lib/env'
import type { PublicEvent } from '@/app/api/public/events/route'

const PREVIEW_COUNT = 3

// underline + focus-visible ring, matching the body-copy-link state pattern
// DESIGN.md documents (`underline-offset-4 hover:underline`) plus the same
// focus treatment breadcrumb.tsx/cycle-selector.tsx already use on Paper —
// caught missing entirely by /impeccable critique on the combined section
// this file was split from.
const CTA_CLASS =
  'font-mono text-[0.72rem] font-medium tracking-[0.1em] text-argc-maroon uppercase underline-offset-4 hover:underline outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

/**
 * Always fresh (`no-store`) — "soonest upcoming" is time-sensitive. A small
 * local filter, not `partitionEvents`/`EventsList`: this is a 3-item
 * teaser, not a browsable all/upcoming/past view.
 */
async function fetchUpcomingEvents(limit: number): Promise<PublicEvent[]> {
  try {
    const res = await fetch(`${env.APP_URL}/api/public/events?perPage=20`, {
      cache: 'no-store',
    })
    if (!res.ok) {
      // Logged so an API failure is distinguishable from a genuinely quiet
      // week server-side — the visitor-facing EmptyState stays identical
      // either way on purpose, this is for whoever's watching the logs.
      console.error(`[Events] events API answered ${res.status}`)
      return []
    }

    const body = (await res.json()) as { data: PublicEvent[] }
    const now = new Date()
    return body.data
      .filter(
        (event) =>
          event.status !== 'cancelled' &&
          new Date(event.ends_at ?? event.starts_at) >= now,
      )
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
      .slice(0, limit)
  } catch (err) {
    console.error('[Events] failed to fetch events:', err)
    return []
  }
}

/**
 * Fourth section below Hero, directly under Nodes — a small teaser of real
 * upcoming public events, not just landing-page copy. Doesn't build
 * `/events` itself, just links to it (already exists).
 *
 * Standalone, full-width — split out from a combined Events/Handbook
 * section that put this and `Handbook` in two grid columns of one section;
 * the two are independent proof points and read better as separate scroll
 * beats. `bg-stone`, alternating from Nodes' `bg-paper`.
 */
export async function Events() {
  const copy = landing.eventsPreview
  const upcoming = await fetchUpcomingEvents(PREVIEW_COUNT)

  return (
    <section aria-label="Events" className="bg-stone">
      <RevealOnScroll className="mx-auto max-w-6xl px-6 py-[clamp(4rem,10vw,8rem)] sm:px-8 lg:px-12">
        <div className="flex flex-col gap-6 border-t border-border pt-6">
          <div className="flex flex-col gap-2">
            <h2 className="font-sans text-[1.5rem] font-bold tracking-tight text-foreground">
              {copy.heading}
            </h2>
            <p className="max-w-[52ch] font-sans text-[0.9375rem] text-muted-foreground">
              {copy.detail}
            </p>
          </div>

          {upcoming.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <EmptyState title={copy.empty.title} description={copy.empty.description} />
          )}

          <Link href="/events" className={CTA_CLASS}>
            {copy.cta} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </RevealOnScroll>
    </section>
  )
}
