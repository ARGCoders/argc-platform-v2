'use client'

import { useMemo, useState } from 'react'
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
 * boundary logic (an event ending exactly at `now`, no `ends_at`) is
 * unit-testable without simulating a tab click.
 */
export function partitionEvents(
  events: PublicEvent[],
  now: Date,
): { upcoming: PublicEvent[]; past: PublicEvent[] } {
  const upcoming: PublicEvent[] = []
  const past: PublicEvent[] = []

  for (const event of events) {
    const end = new Date(event.ends_at ?? event.starts_at)
    if (end >= now) upcoming.push(event)
    else past.push(event)
  }

  upcoming.sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  past.sort((a, b) => b.starts_at.localeCompare(a.starts_at))

  return { upcoming, past }
}

export function EventsList({ events }: { events: PublicEvent[] }) {
  const [filter, setFilter] = useState<Filter>('all')
  const now = useMemo(() => new Date(), [])
  const { upcoming, past } = useMemo(() => partitionEvents(events, now), [events, now])

  const visible =
    filter === 'upcoming' ? upcoming : filter === 'past' ? past : [...upcoming, ...past]

  return (
    <div className="flex flex-col gap-8">
      <div role="tablist" aria-label="Filter events" className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-2 font-mono text-[0.65rem] font-semibold tracking-[0.09em] uppercase transition-colors',
              filter === f
                ? 'bg-primary text-primary-foreground'
                : 'border border-input text-foreground hover:bg-muted',
            )}
          >
            {copy.filters[f]}
          </button>
        ))}
      </div>

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
      ) : (
        <div
          role="tabpanel"
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {visible.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}
