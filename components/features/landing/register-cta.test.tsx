import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RegisterCta } from './register-cta'
import { landing } from '@/lib/content'

describe('RegisterCta', () => {
  it('renders the statement and detail from content/landing.json', () => {
    render(<RegisterCta />)
    for (const line of landing.registerCta.statement) {
      expect(screen.getByText(line)).toBeInTheDocument()
    }
    expect(screen.getByText(landing.registerCta.detail)).toBeInTheDocument()
  })

  it('links to /register', () => {
    render(<RegisterCta />)
    expect(screen.getByRole('link', { name: landing.registerCta.cta })).toHaveAttribute(
      'href',
      '/register',
    )
  })

  it('gives the section an accessible label', () => {
    render(<RegisterCta />)
    expect(screen.getByLabelText('Register')).toBeInTheDocument()
  })

  // Regression guard: this is the page's one primary CTA — must never
  // regress to the quiet mono-text-link treatment Events/Handbook use
  // (underline-offset-4, no fill) instead of a real filled button.
  it('uses the filled primary CTA button, not the secondary link treatment', () => {
    render(<RegisterCta />)
    const link = screen.getByRole('link', { name: landing.registerCta.cta })
    expect(link.className).not.toContain('underline-offset-4')
    expect(link.className).toContain('bg-hero-ink')
  })

  it('gives the CTA button focus-visible feedback', () => {
    render(<RegisterCta />)
    const link = screen.getByRole('link', { name: landing.registerCta.cta })
    expect(link.className).toContain('focus-visible:outline-2')
  })

  // Regression guard: copy must never promise instant/self-service
  // admission — membership is nomination-based per the handbook.
  it('does not promise guaranteed admission in the CTA label', () => {
    render(<RegisterCta />)
    expect(screen.queryByText(/^apply now$/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^register$/i)).not.toBeInTheDocument()
  })
})
