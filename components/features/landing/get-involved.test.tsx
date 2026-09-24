import { describe, it, expect } from 'vitest'
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
})
