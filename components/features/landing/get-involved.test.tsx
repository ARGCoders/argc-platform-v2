import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GetInvolved } from './get-involved'
import { landing, site } from '@/lib/content'

describe('GetInvolved', () => {
  it('renders the heading and detail copy', () => {
    render(<GetInvolved />)

    expect(screen.getByText(landing.getInvolved.heading)).toBeInTheDocument()
    expect(screen.getByText(landing.getInvolved.detail)).toBeInTheDocument()
  })

  it('links to the GitHub org URL', () => {
    render(<GetInvolved />)

    expect(
      screen.getByRole('link', { name: new RegExp(landing.getInvolved.cta, 'i') }),
    ).toHaveAttribute('href', site.githubOrgUrl)
  })

  // Regression guard: this is the only real external link on the site — it
  // must open in a new tab without leaking a window.opener reference back
  // to GitHub.
  it('opens in a new tab with rel="noopener noreferrer"', () => {
    render(<GetInvolved />)

    const link = screen.getByRole('link', {
      name: new RegExp(landing.getInvolved.cta, 'i'),
    })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  // Regression guard: an external link must read differently from internal
  // nav (→) both visually and to a screen reader, not just visually.
  it('signals it leaves the site to both sighted and screen-reader users', () => {
    render(<GetInvolved />)

    const link = screen.getByRole('link', {
      name: new RegExp(landing.getInvolved.cta, 'i'),
    })
    expect(link.querySelector('[aria-hidden="true"]')).toHaveTextContent('↗')
    expect(link).toHaveTextContent('opens in a new tab')
  })

  it('gives the section an accessible label and the anchor id the navbar targets', () => {
    const { container } = render(<GetInvolved />)

    expect(screen.getByLabelText('Get involved')).toBeInTheDocument()
    expect(container.querySelector('#get-involved')).toBeInTheDocument()
  })

  it('gives the CTA link hover and focus-visible feedback classes', () => {
    render(<GetInvolved />)

    const link = screen.getByRole('link', {
      name: new RegExp(landing.getInvolved.cta, 'i'),
    })
    expect(link.className).toContain('hover:underline')
    expect(link.className).toContain('focus-visible:outline-2')
  })

  // content/ascii/githup_ascii.txt exists — confirms the art actually
  // renders (decorative, excluded from the accessibility tree), same
  // coverage handbook.test.tsx has for its own shape.
  it('renders the ASCII art shape, marked decorative', () => {
    const { container } = render(<GetInvolved />)

    const pre = container.querySelector('pre')
    expect(pre).toBeInTheDocument()
    expect(pre).toHaveAttribute('aria-hidden', 'true')
    expect(pre?.textContent?.length).toBeGreaterThan(100)
  })

  // Regression guard: the section must still render cleanly if the art
  // file is ever removed, not show a broken image or throw — pins the
  // graceful-fallback code path's shape, mirroring handbook.test.tsx.
  it('falls back to no art gracefully if the file read ever fails', async () => {
    const fs = await import('node:fs')
    const readSpy = vi.spyOn(fs.default, 'readFileSync').mockImplementation(() => {
      throw new Error('ENOENT')
    })

    const { container } = render(<GetInvolved />)

    expect(container.querySelector('pre')).not.toBeInTheDocument()
    readSpy.mockRestore()
  })

  // Regression guard: the shape must vertically center against the text
  // column (art's middle = text's middle) and stay anchored to the
  // column's right edge — items-center (cross-axis) and justify-self-end
  // (inline-axis) are orthogonal, not competing, so both must be present.
  it('vertically centers the shape against the text column and anchors it right', () => {
    const { container } = render(<GetInvolved />)

    const grid = container.querySelector('.grid')
    expect(grid?.className).toContain('items-center')

    const pre = container.querySelector('pre')
    expect(pre?.className).toContain('justify-self-end')
  })
})
