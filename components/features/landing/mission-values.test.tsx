import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MissionValues } from './mission-values'
import { landing } from '@/lib/content'

describe('MissionValues', () => {
  it('renders the mission statement and detail from content/landing.json', () => {
    render(<MissionValues />)
    for (const line of landing.missionValues.statement) {
      expect(screen.getByText(line)).toBeInTheDocument()
    }
    expect(screen.getByText(landing.missionValues.detail)).toBeInTheDocument()
  })

  it('renders every value tag and its sentence', () => {
    render(<MissionValues />)
    for (const value of landing.missionValues.values) {
      expect(screen.getByText(value.tag)).toBeInTheDocument()
      expect(screen.getByText(value.text)).toBeInTheDocument()
    }
  })

  // Regression guard: the values list is a plain typographic ledger, not a
  // sequence — tags classify each value, they don't number it.
  it('does not render sequence numbers next to the values', () => {
    render(<MissionValues />)
    expect(screen.queryByText('01')).not.toBeInTheDocument()
    expect(screen.queryByText('1.')).not.toBeInTheDocument()
  })

  // Regression guard: the single ASCII shape is decorative texture in its
  // own shape column, not content — a screen reader must never encounter
  // it, and it must never be mistaken for real text content. Only one
  // <pre> — shape-1 is reserved for later and must not sneak in here too.
  it('marks the ASCII shape decorative and excludes it from the accessibility tree', () => {
    const { container } = render(<MissionValues />)
    const pres = container.querySelectorAll('pre')
    expect(pres).toHaveLength(1)
    expect(pres[0]).toHaveAttribute('aria-hidden', 'true')
    expect(pres[0]?.textContent?.length).toBeGreaterThan(1000)
  })

  // Regression guard: at `md` widths (before `lg`'s wider padding applies)
  // the shape's real rendered width can exceed its dedicated shape column —
  // this clips it at the column edge so it can never bleed into the text
  // column beside it.
  it('clips the shape so it cannot bleed into the text column', () => {
    const { container } = render(<MissionValues />)
    const shape = container.querySelector('pre')
    expect(shape?.className).toContain('overflow-hidden')
  })

  it('gives the section an accessible label', () => {
    render(<MissionValues />)
    expect(screen.getByLabelText('Mission and values')).toBeInTheDocument()
  })
})
