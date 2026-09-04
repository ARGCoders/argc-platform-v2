import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { XpBar } from './xp-bar'

describe('XpBar', () => {
  it('renders progress toward the next tier as a fraction', () => {
    render(<XpBar xp={100} />)
    expect(screen.getByText('XP → Architect')).toBeInTheDocument()
    expect(screen.getByText('100 / 140')).toBeInTheDocument()
  })

  it('fills the bar proportional to progress toward the next tier', () => {
    const { container } = render(<XpBar xp={100} />)
    const fill = container.querySelector('[role="progressbar"] > div') as HTMLElement
    expect(fill.style.width).toBe(`${(100 / 140) * 100}%`)
  })

  it('exposes progress to assistive tech via the progressbar role', () => {
    render(<XpBar xp={100} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '100')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '140')
  })

  // Regression guard: the top tier has no next threshold — tierProgress()
  // returns { next: null, required: null } — so the fraction label and
  // arrow both disappear rather than dividing by a threshold that doesn't
  // exist.
  it('switches to the top-tier label and a full bar once maxed', () => {
    render(<XpBar xp={300} />)
    expect(screen.getByText('Top Tier — Vanguard')).toBeInTheDocument()
    expect(screen.getByText('300 XP')).toBeInTheDocument()
    expect(screen.queryByText(/→/)).not.toBeInTheDocument()
  })

  it('renders the bar fully filled at the top tier', () => {
    const { container } = render(<XpBar xp={300} />)
    const fill = container.querySelector('[role="progressbar"] > div') as HTMLElement
    expect(fill.style.width).toBe('100%')
  })

  it('fills with Signal Maroon regardless of surface', () => {
    const { container: dark } = render(<XpBar xp={100} surface="dark" />)
    const { container: light } = render(<XpBar xp={100} surface="light" />)
    expect(
      (dark.querySelector('[role="progressbar"] > div') as HTMLElement).className,
    ).toContain('bg-sidebar-primary')
    expect(
      (light.querySelector('[role="progressbar"] > div') as HTMLElement).className,
    ).toContain('bg-sidebar-primary')
  })

  it('switches the track and text tokens for the light surface', () => {
    const { container } = render(<XpBar xp={100} surface="light" />)
    const track = container.querySelector('[role="progressbar"]') as HTMLElement
    expect(track.className).toContain('bg-muted')
    expect(track.className).not.toContain('bg-sidebar-foreground/10')
  })
})
