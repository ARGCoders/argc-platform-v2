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
  it('renders the title, type label, mono date, and status chip', () => {
    render(<EventRow event={event()} />)

    expect(screen.getByText('Summer Build — Node Showcase')).toBeInTheDocument()
    expect(screen.getByText('Hackathon')).toBeInTheDocument()
    expect(screen.getByText('2026-09-12')).toBeInTheDocument()
    expect(screen.getByLabelText('Status: scheduled')).toBeInTheDocument()
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
})
