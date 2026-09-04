'use client'

import { useMemo, useRef, useState } from 'react'
import { EventRow } from './event-row'
import { EmptyState } from '@/components/shared/empty-state'
import { events as copy } from '@/lib/content'
import { cn } from '@/lib/utils'
import type { PublicEvent } from '@/app/api/public/events/route'

type Filter = 'all' | 'upcoming' | 'past'

const FILTERS: Filter[] = ['all', 'upcoming', 'past']

/**
 * Splits events on `now` and orders each half the way a visitor scans it:
 * upcoming soonest-first, past most-recent-first. Pure and exported so the
 * boundary logic is unit-testable without simulating a tab click.
 *
 * A `cancelled` event always routes to `past`, regardless of its date — a
 * cancelled future event under an "Upcoming" tab contradicts the tab's own
 * label. A malformed date (fails to parse) routes to `upcoming` rather than
 * silently vanishing into `past`: a real future event with a bad timestamp
 * stays visible and gets noticed, instead of being buried where nobody
 * looks for it.
 */
export function partitionEvents(
  events: PublicEvent[],
  now: Date,
): { upcoming: PublicEvent[]; past: PublicEvent[] } {
  const upcoming: PublicEvent[] = []
  const past: PublicEvent[] = []

  for (const event of events) {
    if (event.status === 'cancelled') {
      past.push(event)
      continue
    }

    const end = new Date(event.ends_at ?? event.starts_at)
    if (Number.isNaN(end.getTime())) {
      console.error(
        `[EventsList] invalid date on event ${event.id}: starts_at=${event.starts_at} ends_at=${event.ends_at}`,
      )
      upcoming.push(event)
      continue
    }

    if (end >= now) upcoming.push(event)
    else past.push(event)
  }

  upcoming.sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  // Genuinely-occurred events sort before cancelled ones, most-recent-first
  // within each group — a cancelled event routed here purely by status can
  // carry a future starts_at, which would otherwise sort it above events
  // that actually happened.
  past.sort((a, b) => {
    const aCancelled = a.status === 'cancelled' ? 1 : 0
    const bCancelled = b.status === 'cancelled' ? 1 : 0
    if (aCancelled !== bCancelled) return aCancelled - bCancelled
    return b.starts_at.localeCompare(a.starts_at)
  })

  return { upcoming, past }
}

export function EventsList({
  events,
  truncated = false,
}: {
  events: PublicEvent[]
  /** True when the API returned fewer events than actually exist (the fetch
   *  is capped at one page) — surfaces that as a visible note instead of a
   *  silent, undiscoverable truncation. */
  truncated?: boolean
}) {
  const [filter, setFilter] = useState<Filter>('all')
  // Computed once at mount, not refreshed — this is an unauthenticated,
  // single-visit marketing page. A tab left open across the day boundary
  // may show an event in the wrong bucket for a while; a fresh visit or
  // reload (which re-renders this from scratch) resolves it. Not worth a
  // background timer running regardless of tab visibility to close a gap
  // this narrow.
  const now = useMemo(() => new Date(), [])
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  const { upcoming, past } = useMemo(() => partitionEvents(events, now), [events, now])

  const visible =
    filter === 'upcoming' ? upcoming : filter === 'past' ? past : [...upcoming, ...past]

  const counts: Record<Filter, number> = {
    all: upcoming.length + past.length,
    upcoming: upcoming.length,
    past: past.length,
  }

  function selectFilter(next: Filter) {
    setFilter(next)
    tabRefs.current[FILTERS.indexOf(next)]?.focus()
  }

  function handleTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    const currentIndex = FILTERS.indexOf(filter)
    let nextIndex: number | null = null

    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % FILTERS.length
    else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + FILTERS.length) % FILTERS.length
    } else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = FILTERS.length - 1

    if (nextIndex === null) return
    event.preventDefault()
    const next = FILTERS[nextIndex]
    if (next !== undefined) selectFilter(next)
  }

  return (
    <div className="flex flex-col gap-8">
      <div role="tablist" aria-label="Filter events" className="flex gap-2">
        {FILTERS.map((f, i) => (
          <button
            key={f}
            ref={(el) => {
              tabRefs.current[i] = el
            }}
            id={`events-tab-${f}`}
            type="button"
            role="tab"
            aria-selected={filter === f}
            aria-controls="events-panel"
            tabIndex={filter === f ? 0 : -1}
            onClick={() => selectFilter(f)}
            onKeyDown={handleTabKeyDown}
            className={cn(
              'min-h-11 px-3 py-2 font-mono text-[0.65rem] font-semibold tracking-[0.09em] uppercase transition-colors',
              filter === f
                ? 'bg-primary text-primary-foreground'
                : 'border border-input text-foreground hover:bg-muted',
            )}
          >
            {copy.filters[f]}
            {/* aria-hidden: the count is a visual scan aid, not part of the
                tab's accessible name — the aria-live region below already
                announces the visible count after a selection changes it. */}
            <span aria-hidden="true" className="opacity-70">
              {' '}
              · {counts[f]}
            </span>
          </button>
        ))}
      </div>

      <p aria-live="polite" className="sr-only">
        {visible.length} {visible.length === 1 ? 'event' : 'events'} shown
      </p>

      {truncated && (
        <p className="-mt-4 font-mono text-xs text-muted-foreground">
          Showing the 100 most recent public events.
        </p>
      )}

      <div id="events-panel" role="tabpanel" aria-labelledby={`events-tab-${filter}`}>
        {visible.length === 0 ? (
          <EmptyState
            title={copy.empty[filter].title}
            description={copy.empty[filter].description}
            icon={
              <span
                aria-hidden="true"
                className="block h-5 w-5 rotate-45 border border-muted-foreground"
              />
            }
          />
        ) : filter === 'all' ? (
          // Upcoming and past are never rendered as one flat, undifferentiated
          // grid — the boundary a visitor actually needs ("is this active
          // now?") is already computed by partitionEvents; concatenating it
          // back into one list would throw that answer away.
          <div className="flex flex-col gap-10">
            {upcoming.length > 0 && (
              <EventSection title={copy.filters.upcoming} events={upcoming} />
            )}
            {past.length > 0 && <EventSection title={copy.filters.past} events={past} />}
          </div>
        ) : (
          <EventGrid events={visible} />
        )}
      </div>
    </div>
  )
}

function EventSection({ title, events }: { title: string; events: PublicEvent[] }) {
  return (
    <section>
      <h2 className="mb-4 font-mono text-[0.68rem] font-medium tracking-[0.1em] text-muted-foreground uppercase">
        {title} · {events.length}
      </h2>
      <EventGrid events={events} />
    </section>
  )
}

function EventGrid({ events }: { events: PublicEvent[] }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <EventRow key={event.id} event={event} />
      ))}
    </div>
  )
}
