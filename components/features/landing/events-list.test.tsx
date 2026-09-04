import { describe, it, expect, vi } from 'vitest'
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

  // Regression guard: a cancelled event landing under "Upcoming" contradicts
  // the tab's own label, regardless of what its date says.
  it('routes a cancelled event to past regardless of its date', () => {
    const cancelledFuture = event({
      id: 'cancelled-future',
      status: 'cancelled',
      starts_at: '2026-08-01T00:00:00.000Z',
    })
    const { upcoming, past } = partitionEvents([cancelledFuture], NOW)
    expect(upcoming).toEqual([])
    expect(past.map((e) => e.id)).toEqual(['cancelled-future'])
  })

  // Regression guard: a malformed date must not silently bury a real future
  // event under "Past" where nobody would look for it.
  it('treats an unparseable date as upcoming, and logs it', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const broken = event({ id: 'broken', starts_at: 'not-a-date', ends_at: null })

    const { upcoming, past } = partitionEvents([broken], NOW)

    expect(upcoming.map((e) => e.id)).toEqual(['broken'])
    expect(past).toEqual([])
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})

describe('EventsList', () => {
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

  it('keeps only the active tab in the natural tab order', () => {
    render(<EventsList events={[]} />)
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('tabIndex', '0')
    expect(screen.getByRole('tab', { name: 'Upcoming' })).toHaveAttribute(
      'tabIndex',
      '-1',
    )
    expect(screen.getByRole('tab', { name: 'Past' })).toHaveAttribute('tabIndex', '-1')
  })

  it('moves selection and focus with ArrowRight/ArrowLeft, wrapping at the ends', async () => {
    const user = userEvent.setup()
    render(<EventsList events={[]} />)

    screen.getByRole('tab', { name: 'All' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Upcoming' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tab', { name: 'Upcoming' })).toHaveFocus()

    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    // Wraps from the first tab back to the last on ArrowLeft.
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Past' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('jumps to the first/last tab with Home/End', async () => {
    const user = userEvent.setup()
    render(<EventsList events={[]} />)

    screen.getByRole('tab', { name: 'All' }).focus()
    await user.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Past' })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    await user.keyboard('{Home}')
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('gives each filter tab a 44px minimum touch target', () => {
    render(<EventsList events={[]} />)
    expect(screen.getByRole('tab', { name: 'All' }).className).toContain('min-h-11')
  })

  it('announces the visible count via an aria-live region', async () => {
    const user = userEvent.setup()
    render(<EventsList events={[upcoming, past]} />)

    expect(screen.getByText('2 events shown')).toHaveAttribute('aria-live', 'polite')

    await user.click(screen.getByRole('tab', { name: 'Upcoming' }))
    expect(screen.getByText('1 event shown')).toBeInTheDocument()
  })

  it('pairs each tab with the shared panel, and the panel tracks the active tab', async () => {
    const user = userEvent.setup()
    render(<EventsList events={[upcoming, past]} />)

    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute(
      'aria-controls',
      'events-panel',
    )
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'events-panel')
    expect(screen.getByRole('tabpanel')).toHaveAttribute(
      'aria-labelledby',
      'events-tab-all',
    )

    await user.click(screen.getByRole('tab', { name: 'Upcoming' }))
    expect(screen.getByRole('tabpanel')).toHaveAttribute(
      'aria-labelledby',
      'events-tab-upcoming',
    )
  })

  it('shows a truncation note only when passed truncated', () => {
    const { rerender } = render(<EventsList events={[upcoming]} />)
    expect(screen.queryByText(/Showing the 100 most recent/)).not.toBeInTheDocument()

    rerender(<EventsList events={[upcoming]} truncated />)
    expect(screen.getByText(/Showing the 100 most recent/)).toBeInTheDocument()
  })

  it('shows a count on each tab without changing its accessible name', () => {
    render(<EventsList events={[upcoming, past]} />)

    const allTab = screen.getByRole('tab', { name: 'All' })
    expect(allTab.textContent).toContain('· 2')
    expect(screen.getByRole('tab', { name: 'Upcoming' }).textContent).toContain('· 1')
    expect(screen.getByRole('tab', { name: 'Past' }).textContent).toContain('· 1')
  })

  it('shows a zero count on a tab with nothing in it, before any click', () => {
    render(<EventsList events={[upcoming]} />)
    expect(screen.getByRole('tab', { name: 'Past' }).textContent).toContain('· 0')
  })

  describe('future/past sections in the All tab', () => {
    it('renders Upcoming and Past as two labeled sections, not one flat grid', () => {
      render(<EventsList events={[upcoming, past]} />)

      expect(screen.getByRole('heading', { name: 'Upcoming · 1' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Past · 1' })).toBeInTheDocument()
    })

    it('omits the Past section entirely when there are no past events', () => {
      render(<EventsList events={[upcoming]} />)

      expect(screen.getByRole('heading', { name: 'Upcoming · 1' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: /^Past/ })).not.toBeInTheDocument()
    })

    it('does not render section headings on the Upcoming or Past tabs — the tab already says which', async () => {
      const user = userEvent.setup()
      render(<EventsList events={[upcoming, past]} />)

      await user.click(screen.getByRole('tab', { name: 'Upcoming' }))

      // Section headers are h2 (level 2); EventRow's own title is an h3, so
      // querying by level distinguishes "no section header" from "no cards".
      expect(screen.queryAllByRole('heading', { level: 2 })).toHaveLength(0)
      expect(screen.getByText('Upcoming Event')).toBeInTheDocument()
    })
  })
})
