import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TierBadge } from './tier-badge'
import { TIERS } from '@/lib/constants'

describe('TierBadge', () => {
  it.each(TIERS)('renders the tier label for %s', (tier) => {
    render(<TierBadge tier={tier} />)
    expect(screen.getByText(tier)).toBeInTheDocument()
  })

  it('lights ticks proportional to rank', () => {
    const { container } = render(<TierBadge tier="Architect" />)
    const ticks = container.querySelectorAll('span[aria-hidden="true"] > span')
    expect(ticks).toHaveLength(TIERS.length)
    // Architect is rank 3 of 4 — the first three ticks lit, the last dim.
    expect(ticks[0]?.className).toContain('bg-signal-amber')
    expect(ticks[2]?.className).toContain('bg-signal-amber')
    expect(ticks[3]?.className).not.toContain('bg-signal-amber')
  })

  // Regression guard: no tier fills its chip background, including the top
  // one — RoleBadge owns "solid fill = top rank" as its own signature, so a
  // super_peer who is also Vanguard tier never renders two identically
  // filled Coral chips in the same row.
  it('stays outline-only at every tier, including Vanguard', () => {
    for (const tier of TIERS) {
      render(<TierBadge tier={tier} />)
      expect(screen.getByText(tier).parentElement?.className).not.toMatch(
        /\bbg-(?!transparent)/,
      )
    }
  })

  it('marks the top tier in Coral, distinct from Architect below it', () => {
    render(<TierBadge tier="Vanguard" />)
    expect(screen.getByText('Vanguard').className).toContain('text-coral')
  })

  // Regression guard: TierBadge must stay structurally distinct from
  // RoleBadge (segmented ticks, not a plain label) so the two are never
  // confusable at a glance.
  it('renders a tick bar alongside the label', () => {
    const { container } = render(<TierBadge tier="Contributor" />)
    expect(container.querySelector('span[aria-hidden="true"]')).toBeTruthy()
  })

  it('carries a Tier-prefixed accessible name by default', () => {
    render(<TierBadge tier="Architect" />)
    expect(screen.getByLabelText('Tier: Architect')).toBeInTheDocument()
  })
})
