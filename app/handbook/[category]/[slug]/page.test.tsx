import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import HandbookArticlePage from './page'

const fetchSpy = vi.fn()

beforeEach(() => {
  fetchSpy.mockReset()
  vi.stubGlobal('fetch', fetchSpy)
})

describe('HandbookArticlePage', () => {
  it('renders the fetched article title and body', async () => {
    fetchSpy.mockResolvedValue(
      new Response('# Mission\n\nARGC exists to build things that last.\n', {
        status: 200,
      }),
    )

    const element = await HandbookArticlePage({
      params: Promise.resolve({ category: 'company', slug: 'mission' }),
    })
    render(element)

    expect(screen.getByRole('heading', { level: 1, name: 'Mission' })).toBeInTheDocument()
    expect(screen.getByText('ARGC exists to build things that last.')).toBeInTheDocument()
  })

  it('shows the breadcrumb with the category label and the article title', async () => {
    fetchSpy.mockResolvedValue(new Response('# Mission\n\nBody.\n', { status: 200 }))

    const element = await HandbookArticlePage({
      params: Promise.resolve({ category: 'company', slug: 'mission' }),
    })
    render(element)

    expect(screen.getByLabelText('Breadcrumb')).toHaveTextContent('Handbook')
    expect(screen.getByLabelText('Breadcrumb')).toHaveTextContent('Company')
    expect(screen.getByLabelText('Breadcrumb')).toHaveTextContent('Mission')
  })

  // Regression guard: aria-current="page" must land on the article title,
  // not the category — a screen reader must never announce "Company,
  // current page" while the visitor is reading "Mission".
  it('marks the article title, not the category, as the current breadcrumb', async () => {
    fetchSpy.mockResolvedValue(new Response('# Mission\n\nBody.\n', { status: 200 }))

    const element = await HandbookArticlePage({
      params: Promise.resolve({ category: 'company', slug: 'mission' }),
    })
    render(element)

    const current = screen
      .getByLabelText('Breadcrumb')
      .querySelector('[aria-current="page"]')
    expect(current).toHaveTextContent('Mission')
  })

  it('renders a link to the next article in the same category', async () => {
    fetchSpy.mockResolvedValue(new Response('# Mission\n\nBody.\n', { status: 200 }))

    const element = await HandbookArticlePage({
      params: Promise.resolve({ category: 'company', slug: 'mission' }),
    })
    render(element)

    expect(screen.getByRole('link', { name: /vision/i })).toHaveAttribute(
      'href',
      '/handbook/company/vision',
    )
  })

  // Regression guard: a live-fetch failure must render a distinct
  // "couldn't load" state, not a 404 — the article exists, GitHub is just
  // unreachable. Must never silently render as if the article were empty.
  it('shows a distinct "couldn\'t load" state on fetch failure, not a 404', async () => {
    fetchSpy.mockResolvedValue(new Response('Server error', { status: 500 }))

    const element = await HandbookArticlePage({
      params: Promise.resolve({ category: 'company', slug: 'mission' }),
    })
    render(element)

    expect(screen.getByText(/couldn.t load this article/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /try again/i })).toHaveAttribute(
      'href',
      '/handbook/company/mission',
    )
  })

  it('calls notFound() for a slug not in the catalog', async () => {
    await expect(
      HandbookArticlePage({
        params: Promise.resolve({ category: 'not-a-category', slug: 'not-a-slug' }),
      }),
    ).rejects.toThrow()
  })
})
