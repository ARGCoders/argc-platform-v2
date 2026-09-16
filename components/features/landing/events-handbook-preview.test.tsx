import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EventsHandbookPreview } from './events-handbook-preview'
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

const README = '# The ARGC Handbook\n\nLive intro text.\n\n---\n\n## Contents\n'

beforeEach(() => {
  fetchSpy.mockReset()
  vi.stubGlobal('fetch', fetchSpy)
})

describe('EventsHandbookPreview', () => {
  it('renders upcoming events and the live handbook intro', async () => {
    fetchSpy.mockImplementation((url: string) => {
      if (url.includes('raw.githubusercontent.com')) {
        return Promise.resolve(new Response(README, { status: 200 }))
      }
      return Promise.resolve(jsonResponse({ data: [event({ title: 'Real Event' })] }))
    })

    render(await EventsHandbookPreview())

    expect(screen.getByText('Real Event')).toBeInTheDocument()
    expect(screen.getByText('Live intro text.')).toBeInTheDocument()
  })

  it('shows the empty state when there are no upcoming events', async () => {
    fetchSpy.mockImplementation((url: string) => {
      if (url.includes('raw.githubusercontent.com')) {
        return Promise.resolve(new Response(README, { status: 200 }))
      }
      return Promise.resolve(jsonResponse({ data: [] }))
    })

    render(await EventsHandbookPreview())

    expect(
      screen.getByText(landing.eventsHandbook.events.empty.title),
    ).toBeInTheDocument()
  })

  // Regression guard: a past event must never show up in a "soonest
  // upcoming" teaser, and neither should a cancelled one even if its date
  // is in the future.
  it('excludes past and cancelled events from the preview', async () => {
    fetchSpy.mockImplementation((url: string) => {
      if (url.includes('raw.githubusercontent.com')) {
        return Promise.resolve(new Response(README, { status: 200 }))
      }
      return Promise.resolve(
        jsonResponse({
          data: [
            event({ title: 'Past Event', starts_at: '2000-01-01T00:00:00.000Z' }),
            event({ title: 'Cancelled Future Event', status: 'cancelled' }),
            event({ title: 'Real Upcoming Event' }),
          ],
        }),
      )
    })

    render(await EventsHandbookPreview())

    expect(screen.getByText('Real Upcoming Event')).toBeInTheDocument()
    expect(screen.queryByText('Past Event')).not.toBeInTheDocument()
    expect(screen.queryByText('Cancelled Future Event')).not.toBeInTheDocument()
  })

  it('falls back to static copy when the handbook fetch fails', async () => {
    fetchSpy.mockImplementation((url: string) => {
      if (url.includes('raw.githubusercontent.com')) {
        return Promise.resolve(new Response('Not Found', { status: 404 }))
      }
      return Promise.resolve(jsonResponse({ data: [] }))
    })

    render(await EventsHandbookPreview())

    expect(
      screen.getByText(landing.eventsHandbook.handbook.fallbackIntro),
    ).toBeInTheDocument()
  })

  it('falls back to an empty event list when the events fetch fails', async () => {
    fetchSpy.mockImplementation((url: string) => {
      if (url.includes('raw.githubusercontent.com')) {
        return Promise.resolve(new Response(README, { status: 200 }))
      }
      return Promise.resolve(new Response('Server error', { status: 500 }))
    })

    render(await EventsHandbookPreview())

    expect(
      screen.getByText(landing.eventsHandbook.events.empty.title),
    ).toBeInTheDocument()
  })

  it('renders every handbook category', async () => {
    fetchSpy.mockImplementation((url: string) => {
      if (url.includes('raw.githubusercontent.com')) {
        return Promise.resolve(new Response(README, { status: 200 }))
      }
      return Promise.resolve(jsonResponse({ data: [] }))
    })

    render(await EventsHandbookPreview())

    for (const category of landing.eventsHandbook.handbook.categories) {
      expect(screen.getByText(category)).toBeInTheDocument()
    }
  })

  it('links to /events and /handbook', async () => {
    fetchSpy.mockImplementation((url: string) => {
      if (url.includes('raw.githubusercontent.com')) {
        return Promise.resolve(new Response(README, { status: 200 }))
      }
      return Promise.resolve(jsonResponse({ data: [] }))
    })

    render(await EventsHandbookPreview())

    expect(screen.getByRole('link', { name: /see all events/i })).toHaveAttribute(
      'href',
      '/events',
    )
    expect(screen.getByRole('link', { name: /read the handbook/i })).toHaveAttribute(
      'href',
      '/handbook',
    )
  })

  it('gives the section an accessible label', async () => {
    fetchSpy.mockImplementation((url: string) => {
      if (url.includes('raw.githubusercontent.com')) {
        return Promise.resolve(new Response(README, { status: 200 }))
      }
      return Promise.resolve(jsonResponse({ data: [] }))
    })

    render(await EventsHandbookPreview())

    expect(screen.getByLabelText('Events and handbook')).toBeInTheDocument()
  })

  // Regression guard: CTA links had zero hover/focus feedback, caught by
  // /impeccable critique. This doesn't render CSS, just confirms the
  // classes that produce that feedback are actually applied.
  it('gives both CTA links hover and focus-visible feedback classes', async () => {
    fetchSpy.mockImplementation((url: string) => {
      if (url.includes('raw.githubusercontent.com')) {
        return Promise.resolve(new Response(README, { status: 200 }))
      }
      return Promise.resolve(jsonResponse({ data: [] }))
    })

    render(await EventsHandbookPreview())

    for (const link of [
      screen.getByRole('link', { name: /see all events/i }),
      screen.getByRole('link', { name: /read the handbook/i }),
    ]) {
      expect(link.className).toContain('hover:underline')
      expect(link.className).toContain('focus-visible:outline-2')
    }
  })

  // Regression guard: the arrow was literal text, so a screen reader
  // announced "right arrow" after the CTA label.
  it('marks the CTA arrow decorative', async () => {
    fetchSpy.mockImplementation((url: string) => {
      if (url.includes('raw.githubusercontent.com')) {
        return Promise.resolve(new Response(README, { status: 200 }))
      }
      return Promise.resolve(jsonResponse({ data: [] }))
    })

    render(await EventsHandbookPreview())

    const link = screen.getByRole('link', { name: /see all events/i })
    expect(link).toHaveAccessibleName('See all events')
    expect(link.querySelector('[aria-hidden="true"]')).toHaveTextContent('→')
  })

  // Regression guard: a live README edit adding a link or list would
  // otherwise render as unstyled default markup in the page's proof
  // section — confirms child markdown elements pick up the system's tokens.
  it('styles markdown links and emphasis inside the live intro', async () => {
    const readmeWithLink =
      '# The ARGC Handbook\n\nSee our **mission** at [argc.dev](https://argc.dev).\n\n---\n\n## Contents\n'
    fetchSpy.mockImplementation((url: string) => {
      if (url.includes('raw.githubusercontent.com')) {
        return Promise.resolve(new Response(readmeWithLink, { status: 200 }))
      }
      return Promise.resolve(jsonResponse({ data: [] }))
    })

    const { container } = render(await EventsHandbookPreview())

    // jsdom doesn't apply real CSS, so this confirms the Tailwind child
    // selectors are present on the ancestor wrapper (the only place they
    // can be, since react-markdown's <a>/<strong> get no className of
    // their own), not that they visually render — the visual check is the
    // dev-server pipeline.
    const wrapper = container.querySelector('[class*="[&_a]:underline"]')
    expect(wrapper).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'argc.dev' })).toBeInTheDocument()
    expect(screen.getByText('mission').tagName).toBe('STRONG')
  })

  it('logs when the events API answers with a non-ok status', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchSpy.mockImplementation((url: string) => {
      if (url.includes('raw.githubusercontent.com')) {
        return Promise.resolve(new Response(README, { status: 200 }))
      }
      return Promise.resolve(new Response('Server error', { status: 500 }))
    })

    render(await EventsHandbookPreview())

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('events API answered 500'),
    )
    errorSpy.mockRestore()
  })
})
