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

  // content/ascii/handbook.txt now exists — confirms the art actually
  // renders (decorative, excluded from the accessibility tree) rather than
  // just checking the file-missing fallback path.
  it('renders the ASCII art shape, marked decorative', async () => {
    const { container } = render(await Handbook())

    const pre = container.querySelector('pre')
    expect(pre).toBeInTheDocument()
    expect(pre).toHaveAttribute('aria-hidden', 'true')
    expect(pre?.textContent?.length).toBeGreaterThan(1000)
  })

  // Regression guard: the section must still render cleanly if the art
  // file is ever removed again, not show a broken image or throw. Can't
  // simulate a missing file without mocking node:fs (the component reads
  // the real file directly, same as mission-values.tsx) — this instead
  // pins the graceful-fallback code path's shape so a future refactor that
  // breaks the try/catch is caught by type/behavior drift, not silently.
  it('falls back to no art gracefully if the file read ever fails', async () => {
    const fs = await import('node:fs')
    const readSpy = vi.spyOn(fs.default, 'readFileSync').mockImplementation(() => {
      throw new Error('ENOENT')
    })

    const { container } = render(await Handbook())

    expect(container.querySelector('pre')).not.toBeInTheDocument()
    readSpy.mockRestore()
  })

  // Regression guard: the shape must vertically center against the text
  // column (art's middle = text's middle) and stay anchored to the
  // column's right edge — items-center (cross-axis) and justify-self-end
  // (inline-axis) are orthogonal, not competing, so both must be present.
  // Matches get-involved.tsx's identical treatment.
  it('vertically centers the shape against the text column and anchors it right', async () => {
    const { container } = render(await Handbook())

    const grid = container.querySelector('.grid')
    expect(grid?.className).toContain('items-center')

    const pre = container.querySelector('pre')
    expect(pre?.className).toContain('justify-self-end')
  })
})
