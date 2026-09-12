import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorFallback } from './error-fallback'

const ERROR = new Error('boom')

describe('ErrorFallback', () => {
  it('renders the title as a heading', () => {
    render(<ErrorFallback error={ERROR} title="Couldn't load this" />)
    expect(
      screen.getByRole('heading', { name: "Couldn't load this" }),
    ).toBeInTheDocument()
  })

  it('renders a reset button only when reset is provided', () => {
    const { rerender } = render(<ErrorFallback error={ERROR} />)
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()

    rerender(<ErrorFallback error={ERROR} reset={() => {}} />)
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('shows the error digest when present', () => {
    render(<ErrorFallback error={Object.assign(ERROR, { digest: 'abc123' })} />)
    expect(screen.getByText('Reference: abc123')).toBeInTheDocument()
  })

  // Regression guard: `text-foreground`/`text-muted-foreground` and the
  // dashboard's `bg-sidebar` resolve to the same oklch value in light mode
  // (no `.dark` class is ever applied), so a dashboard consumer must render
  // the hero-ink family, not the ambient Paper-mode tokens, or the error
  // message renders invisible on Terminal Navy — the one moment it matters
  // most. `surface` defaults to `light`, matching the public-site consumers
  // (app/error.tsx, app/events/error.tsx) that already worked correctly.
  it('defaults to the light-surface (ambient) palette', () => {
    render(<ErrorFallback error={ERROR} title="Something went wrong" />)
    const heading = screen.getByRole('heading', { name: 'Something went wrong' })
    expect(heading.className).toContain('text-foreground')
    expect(heading.className).not.toContain('hero-ink')
  })

  it('uses the dark-surface palette when surface="dark"', () => {
    render(<ErrorFallback error={ERROR} title="Something went wrong" surface="dark" />)
    const heading = screen.getByRole('heading', { name: 'Something went wrong' })
    expect(heading.className).toContain('text-hero-ink')
    expect(heading.className).not.toContain('text-foreground')

    expect(screen.getByText('Error').className).toContain('hero-ink-dim')
    expect(screen.getByText('Error').className).not.toContain('muted-foreground')
  })

  it('gives the reset button the navy-tuned maroon on a dark surface', () => {
    render(<ErrorFallback error={ERROR} reset={() => {}} surface="dark" />)
    expect(screen.getByRole('button', { name: 'Try again' }).className).toContain(
      'argc-maroon-lt',
    )
  })
})
