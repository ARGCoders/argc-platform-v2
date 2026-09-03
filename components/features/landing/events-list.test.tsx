import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EventsList, partitionEvents } from './events-list'
import type { PublicEvent } from '@/app/api/public/events/route'

function event(overrides: Partial<PublicEvent> = {}): PublicEvent {
  return {
    id: overrides.id ?? 'ev',
    title: overrides.title ?? 'Event',
    slug: overrides.id ?? 'ev',
    poster_photo: null,
    description: '',
    excerpt: '',
    type: 'hackathon',
    status: 'scheduled',
    starts_at: '2026-06-01T00:00:00.000Z',
    ends_at: null,
    location: null,
    ...overrides,
  }
}

const NOW = new Date('2026-06-15T00:00:00.000Z')

describe('partitionEvents', () => {
  it('sorts upcoming events soonest-first', () => {
    const later = event({ id: 'later', starts_at: '2026-08-01T00:00:00.000Z' })
    const soonest = event({ id: 'soonest', starts_at: '2026-07-01T00:00:00.000Z' })
    const { upcoming } = partitionEvents([later, soonest], NOW)
    expect(upcoming.map((e) => e.id)).toEqual(['soonest', 'later'])
  })

  it('sorts past events most-recent-first', () => {
    const older = event({ id: 'older', starts_at: '2026-01-01T00:00:00.000Z' })
    const recent = event({ id: 'recent', starts_at: '2026-05-01T00:00:00.000Z' })
    const { past } = partitionEvents([older, recent], NOW)
    expect(past.map((e) => e.id)).toEqual(['recent', 'older'])
  })

  it('uses ends_at over starts_at when deciding upcoming vs. past', () => {
    // Started before `now` but still running (ends_at is in the future).
    const stillRunning = event({
      id: 'running',
      starts_at: '2026-06-10T00:00:00.000Z',
      ends_at: '2026-06-20T00:00:00.000Z',
    })
    const { upcoming, past } = partitionEvents([stillRunning], NOW)
    expect(upcoming.map((e) => e.id)).toEqual(['running'])
    expect(past).toEqual([])
  })

  it('treats an event ending exactly at now as upcoming, not past', () => {
    const boundary = event({ id: 'boundary', starts_at: NOW.toISOString() })
    const { upcoming, past } = partitionEvents([boundary], NOW)
    expect(upcoming.map((e) => e.id)).toEqual(['boundary'])
    expect(past).toEqual([])
  })
})

describe('EventsList', () => {
  // Relative to the real clock, not a hardcoded date — EventsList computes
  // its own `now` internally (no injectable clock prop), so a literal date
  // fixture eventually drifts into the wrong bucket as real time passes.
  const upcoming = event({
    id: 'up',
    title: 'Upcoming Event',
    starts_at: new Date(Date.now() + 30 * 86_400_000).toISOString(),
  })
  const past = event({
    id: 'past',
    title: 'Past Event',
    starts_at: new Date(Date.now() - 30 * 86_400_000).toISOString(),
  })

  it('shows every event under the All tab by default', () => {
    render(<EventsList events={[upcoming, past]} />)
    expect(screen.getByText('Upcoming Event')).toBeInTheDocument()
    expect(screen.getByText('Past Event')).toBeInTheDocument()
  })

  it('filters to only upcoming events on the Upcoming tab', async () => {
    const user = userEvent.setup()
    render(<EventsList events={[upcoming, past]} />)

    await user.click(screen.getByRole('tab', { name: 'Upcoming' }))

    expect(screen.getByText('Upcoming Event')).toBeInTheDocument()
    expect(screen.queryByText('Past Event')).not.toBeInTheDocument()
  })

  it('filters to only past events on the Past tab', async () => {
    const user = userEvent.setup()
    render(<EventsList events={[upcoming, past]} />)

    await user.click(screen.getByRole('tab', { name: 'Past' }))

    expect(screen.getByText('Past Event')).toBeInTheDocument()
    expect(screen.queryByText('Upcoming Event')).not.toBeInTheDocument()
  })

  it('shows a filter-specific empty state when a tab has nothing', async () => {
    const user = userEvent.setup()
    render(<EventsList events={[upcoming]} />)

    await user.click(screen.getByRole('tab', { name: 'Past' }))

    expect(screen.getByText('No past events')).toBeInTheDocument()
  })

  it('shows the whole-page empty state with zero events', () => {
    render(<EventsList events={[]} />)
    expect(screen.getByText('No public events yet')).toBeInTheDocument()
  })

  it('marks the active tab with aria-selected', async () => {
    const user = userEvent.setup()
    render(<EventsList events={[upcoming, past]} />)

    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    await user.click(screen.getByRole('tab', { name: 'Upcoming' }))
    expect(screen.getByRole('tab', { name: 'Upcoming' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute(
      'aria-selected',
      'false',
    )
  })
})
