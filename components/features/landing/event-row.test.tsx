import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EventRow } from './event-row'
import type { PublicEvent } from '@/app/api/public/events/route'

function event(overrides: Partial<PublicEvent> = {}): PublicEvent {
  return {
    id: 'ev-1',
    title: 'Summer Build — Node Showcase',
    slug: 'summer-build',
    poster_photo: null,
    description: '<p>Seven nodes ship in 48 hours.</p>',
    excerpt: 'Seven nodes ship in 48 hours.',
    type: 'hackathon',
    status: 'scheduled',
    starts_at: '2026-09-12T00:00:00.000Z',
    ends_at: null,
    location: null,
    ...overrides,
  }
}

describe('EventRow', () => {
  it('renders the title, type label, and Amman-timezone date', () => {
    render(<EventRow event={event()} />)

    expect(screen.getByText('Summer Build — Node Showcase')).toBeInTheDocument()
    expect(screen.getByText('Hackathon')).toBeInTheDocument()
    // 00:00 UTC on 2026-09-12 is 03:00 in Asia/Amman, same calendar day.
    expect(screen.getByText('Sat, Sep 12 · 3:00 AM')).toBeInTheDocument()
  })

  it('renders the plain-text excerpt, not the raw HTML description', () => {
    render(<EventRow event={event({ excerpt: 'Seven nodes ship.' })} />)

    expect(screen.getByText('Seven nodes ship.')).toBeInTheDocument()
    expect(document.querySelector('strong')).not.toBeInTheDocument()
  })

  it('falls back to the deterministic placeholder when there is no poster', () => {
    const { container } = render(<EventRow event={event({ poster_photo: null })} />)
    expect(container.querySelector('img')).not.toBeInTheDocument()
    expect(screen.getByText('ARGC')).toBeInTheDocument()
  })

  it('renders a real image when a poster is present', () => {
    render(
      <EventRow
        event={event({ poster_photo: 'https://pb.example.test/f/summer.jpg' })}
      />,
    )
    expect(screen.getByAltText('')).toBeInTheDocument()
  })

  it('is not a link — no detail page exists for this task', () => {
    const { container } = render(<EventRow event={event()} />)
    expect(container.querySelector('a')).not.toBeInTheDocument()
  })

  it('omits the excerpt paragraph when there is no excerpt', () => {
    const { container } = render(<EventRow event={event({ excerpt: '' })} />)
    expect(container.querySelector('p')).not.toBeInTheDocument()
  })

  // Regression guard: proposed/approved/scheduled/completed are the club's
  // internal approval pipeline, not information a public visitor needs —
  // showing them reads as leaked back-office state.
  it.each(['proposed', 'approved', 'scheduled', 'completed'] as const)(
    'shows no status chip for a %s event',
    (status) => {
      render(<EventRow event={event({ status })} />)
      expect(screen.queryByLabelText(/^Status:/)).not.toBeInTheDocument()
    },
  )

  it('shows a status chip only for a cancelled event', () => {
    render(<EventRow event={event({ status: 'cancelled' })} />)
    expect(screen.getByLabelText('Status: cancelled')).toBeInTheDocument()
  })

  it('renders the location when present', () => {
    render(<EventRow event={event({ location: '42 Amman · Cluster 2' })} />)
    expect(screen.getByText('42 Amman · Cluster 2')).toBeInTheDocument()
  })

  it('renders no location line when location is absent', () => {
    render(<EventRow event={event({ location: null })} />)
    expect(screen.queryByText(/Cluster/)).not.toBeInTheDocument()
  })

  // Regression guard: the type badge repeats on every card in the grid — a
  // maroon badge here would make Signal Maroon the page's ambient color
  // instead of its one "act here" signal (DESIGN.md's One Signal Rule).
  it('does not render the type badge in Signal Maroon', () => {
    render(<EventRow event={event()} />)
    expect(screen.getByText('Hackathon').className).not.toContain('text-primary')
  })
})
