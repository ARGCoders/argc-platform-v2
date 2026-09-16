import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Handbook } from './handbook'
import { landing } from '@/lib/content'

const fetchSpy = vi.fn()

const README = '# The ARGC Handbook\n\nLive intro text.\n\n---\n\n## Contents\n'

beforeEach(() => {
  fetchSpy.mockReset()
  fetchSpy.mockResolvedValue(new Response(README, { status: 200 }))
  vi.stubGlobal('fetch', fetchSpy)
})

describe('Handbook', () => {
  it('renders the live handbook intro', async () => {
    render(await Handbook())

    expect(screen.getByText('Live intro text.')).toBeInTheDocument()
  })

  it('falls back to static copy when the handbook fetch fails', async () => {
    fetchSpy.mockResolvedValue(new Response('Not Found', { status: 404 }))

    render(await Handbook())

    expect(screen.getByText(landing.handbook.fallbackIntro)).toBeInTheDocument()
  })

  it('renders every current category', async () => {
    render(await Handbook())

    for (const category of landing.handbook.categories) {
      expect(screen.getByText(category)).toBeInTheDocument()
    }
  })

  // Regression guard: categories now reflect what's actually pushed
  // publicly (Company, People), not every folder in the handbook repo —
  // this must never silently grow back to the old 5-item list.
  it('does not render categories beyond what is currently pushed', async () => {
    render(await Handbook())

    expect(screen.queryByText('Protocols')).not.toBeInTheDocument()
    expect(screen.queryByText('Ecosystem')).not.toBeInTheDocument()
    expect(screen.queryByText('Operations')).not.toBeInTheDocument()
  })

  it('links to /handbook', async () => {
    render(await Handbook())

    expect(screen.getByRole('link', { name: /read the handbook/i })).toHaveAttribute(
      'href',
      '/handbook',
    )
  })

  it('gives the section an accessible label', async () => {
    render(await Handbook())

    expect(screen.getByLabelText('Handbook')).toBeInTheDocument()
  })

  it('gives the CTA link hover and focus-visible feedback classes', async () => {
    render(await Handbook())

    const link = screen.getByRole('link', { name: /read the handbook/i })
    expect(link.className).toContain('hover:underline')
    expect(link.className).toContain('focus-visible:outline-2')
  })

  it('marks the CTA arrow decorative', async () => {
    render(await Handbook())

    const link = screen.getByRole('link', { name: /read the handbook/i })
    expect(link).toHaveAccessibleName('Read the handbook')
    expect(link.querySelector('[aria-hidden="true"]')).toHaveTextContent('→')
  })

  it('styles markdown links and emphasis inside the live intro', async () => {
    const readmeWithLink =
      '# The ARGC Handbook\n\nSee our **mission** at [argc.dev](https://argc.dev).\n\n---\n\n## Contents\n'
    fetchSpy.mockResolvedValue(new Response(readmeWithLink, { status: 200 }))

    const { container } = render(await Handbook())

    // jsdom doesn't apply real CSS — this confirms the Tailwind child
    // selectors are present on the ancestor wrapper (the only place they
    // can be, since react-markdown's <a>/<strong> get no className of
    // their own).
    const wrapper = container.querySelector('[class*="[&_a]:underline"]')
    expect(wrapper).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'argc.dev' })).toBeInTheDocument()
    expect(screen.getByText('mission').tagName).toBe('STRONG')
  })

  // Regression guard: the ASCII art file doesn't exist yet (sourced
  // separately) — the section must render cleanly without it, not show a
  // broken image or throw.
  it('renders without the ASCII art when the shape file does not exist', async () => {
    const { container } = render(await Handbook())

    expect(container.querySelector('pre')).not.toBeInTheDocument()
  })
})
