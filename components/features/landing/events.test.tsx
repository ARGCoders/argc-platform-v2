import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Events } from './events'
import { landing } from '@/lib/content'
import type { PublicEvent } from '@/app/api/public/events/route'

const fetchSpy = vi.fn()

function event(overrides: Partial<PublicEvent> = {}): PublicEvent {
  return {
    id: 'evt-1',
    title: 'Knowledge Session',
    slug: 'knowledge-session',
    poster_photo: null,
    description: '',
    excerpt: '',
    type: 'knowledge_session',
    status: 'scheduled',
    starts_at: '2099-01-01T10:00:00.000Z',
    ends_at: null,
    location: null,
    ...overrides,
  }
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 })
}

beforeEach(() => {
  fetchSpy.mockReset()
  vi.stubGlobal('fetch', fetchSpy)
})

describe('Events', () => {
  it('renders upcoming events', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ data: [event({ title: 'Real Event' })] }))

    render(await Events())

    expect(screen.getByText('Real Event')).toBeInTheDocument()
  })

  it('shows the empty state when there are no upcoming events', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ data: [] }))

    render(await Events())

    expect(screen.getByText(landing.eventsPreview.empty.title)).toBeInTheDocument()
  })

  // Regression guard: a past event must never show up in a "soonest
  // upcoming" teaser, and neither should a cancelled one even if its date
  // is in the future.
  it('excludes past and cancelled events from the preview', async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse({
        data: [
          event({ title: 'Past Event', starts_at: '2000-01-01T00:00:00.000Z' }),
          event({ title: 'Cancelled Future Event', status: 'cancelled' }),
          event({ title: 'Real Upcoming Event' }),
        ],
      }),
    )

    render(await Events())

    expect(screen.getByText('Real Upcoming Event')).toBeInTheDocument()
    expect(screen.queryByText('Past Event')).not.toBeInTheDocument()
    expect(screen.queryByText('Cancelled Future Event')).not.toBeInTheDocument()
  })

  it('falls back to an empty event list when the events fetch fails', async () => {
    fetchSpy.mockResolvedValue(new Response('Server error', { status: 500 }))

    render(await Events())

    expect(screen.getByText(landing.eventsPreview.empty.title)).toBeInTheDocument()
  })

  it('logs when the events API answers with a non-ok status', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchSpy.mockResolvedValue(new Response('Server error', { status: 500 }))

    render(await Events())

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('events API answered 500'),
    )
    errorSpy.mockRestore()
  })

  it('links to /events', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ data: [] }))

    render(await Events())

    expect(screen.getByRole('link', { name: /see all events/i })).toHaveAttribute(
      'href',
      '/events',
    )
  })

  it('gives the section an accessible label', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ data: [] }))

    render(await Events())

    expect(screen.getByLabelText('Events')).toBeInTheDocument()
  })

  // Regression guard: the CTA link had zero hover/focus feedback, caught
  // by /impeccable critique on the combined section this file was split
  // from.
  it('gives the CTA link hover and focus-visible feedback classes', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ data: [] }))

    render(await Events())

    const link = screen.getByRole('link', { name: /see all events/i })
    expect(link.className).toContain('hover:underline')
    expect(link.className).toContain('focus-visible:outline-2')
  })

  // Regression guard: the arrow was literal text, so a screen reader
  // announced "right arrow" after the CTA label.
  it('marks the CTA arrow decorative', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ data: [] }))

    render(await Events())

    const link = screen.getByRole('link', { name: /see all events/i })
    expect(link).toHaveAccessibleName('See all events')
    expect(link.querySelector('[aria-hidden="true"]')).toHaveTextContent('→')
  })
})
