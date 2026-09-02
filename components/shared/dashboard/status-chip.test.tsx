import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusChip } from './status-chip'

describe('StatusChip', () => {
  it('renders the raw status value as its label', () => {
    render(<StatusChip domain="eval" status="scheduled" />)
    expect(screen.getByText('scheduled')).toBeInTheDocument()
  })

  it('colors a positive status with signal-green, not a role/tier fill', () => {
    render(<StatusChip domain="eval" status="completed" />)
    const chip = screen.getByText('completed')
    expect(chip.className).toContain('text-signal-green')
    expect(chip.className).toContain('border-signal-green')
  })

  it('colors a negative status with coral', () => {
    render(<StatusChip domain="eval" status="missed" />)
    const chip = screen.getByText('missed')
    expect(chip.className).toContain('text-coral')
    expect(chip.className).toContain('border-coral')
  })

  // Regression guard: Signal Green and Coral share lightness/chroma (only
  // hue differs) — the deuteranopia/protanopia confusion axis — so a
  // colorblind viewer needs a non-color cue to tell positive from negative.
  it('gives positive and negative tones different border styles, not just different hues', () => {
    render(<StatusChip domain="eval" status="completed" />)
    expect(screen.getByText('completed').className).toContain('border-solid')

    render(<StatusChip domain="eval" status="missed" />)
    expect(screen.getByText('missed').className).toContain('border-dashed')
  })

  it('uses the codebase-wide 3:1 dark-surface boundary for the neutral tone', () => {
    render(<StatusChip domain="eval" status="pending" />)
    expect(screen.getByText('pending').className).toContain('border-hero-ink/55')
  })

  it('resolves tone independently per domain for the same word', () => {
    // "pending" is neutral for evaluations but the same word never appears
    // in CycleStatus — each domain owns its own tone map.
    render(<StatusChip domain="eval" status="pending" />)
    const chip = screen.getByText('pending')
    expect(chip.className).not.toContain('text-signal-green')
    expect(chip.className).not.toContain('text-coral')
  })

  it('switches neutral styling for the light surface', () => {
    render(<StatusChip domain="cycle" status="upcoming" surface="light" />)
    const chip = screen.getByText('upcoming')
    expect(chip.className).toContain('border-input')
    expect(chip.className).not.toContain('border-sidebar-border')
  })

  it('is outline-only, never filled', () => {
    render(<StatusChip domain="submission" status="approved" />)
    expect(screen.getByText('approved').className).toContain('bg-transparent')
  })

  it('carries a Status-prefixed accessible name by default', () => {
    render(<StatusChip domain="eval" status="scheduled" />)
    expect(screen.getByLabelText('Status: scheduled')).toBeInTheDocument()
  })
})
