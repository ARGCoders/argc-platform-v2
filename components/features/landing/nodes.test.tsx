import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Nodes } from './nodes'
import { landing } from '@/lib/content'

describe('Nodes', () => {
  it('renders the statement and detail from content/landing.json', () => {
    render(<Nodes />)
    for (const line of landing.nodes.statement) {
      expect(screen.getByText(line)).toBeInTheDocument()
    }
    expect(screen.getByText(landing.nodes.detail)).toBeInTheDocument()
  })

  it('renders the stat value and label', () => {
    render(<Nodes />)
    expect(screen.getByText(landing.nodes.stat.value)).toBeInTheDocument()
    expect(screen.getByText(landing.nodes.stat.label)).toBeInTheDocument()
  })

  it('renders every domain name and its detail', () => {
    render(<Nodes />)
    for (const domain of landing.nodes.domains) {
      expect(screen.getByText(domain.name)).toBeInTheDocument()
      expect(screen.getByText(domain.detail)).toBeInTheDocument()
    }
  })

  it('gives the section an accessible label', () => {
    render(<Nodes />)
    expect(screen.getByLabelText('Nodes')).toBeInTheDocument()
  })

  // Regression guard: DOM order must equal visual order at every width —
  // an order-1/order-2 swap once put the stat ahead of the headline on
  // mobile, showing an unexplained "4-6" before the sentence that explains
  // it. Querying textContent order (not just presence) catches a reorder
  // even though jsdom doesn't apply the responsive CSS that triggered it.
  it('renders the headline before the stat in document order', () => {
    const { container } = render(<Nodes />)
    const text = container.textContent ?? ''
    expect(text.indexOf(landing.nodes.statement[0]!)).toBeLessThan(
      text.indexOf(landing.nodes.stat.value),
    )
  })

  // Regression guard: a border-t per domain item rendered as fragmented
  // line segments once the grid wrapped past one row. The rule belongs on
  // the wrapping container, not on each item.
  it('puts the domain list divider on the wrapping container, not per item', () => {
    const { container } = render(<Nodes />)
    const grid = container.querySelector('.border-t.border-b')
    expect(grid).toBeInTheDocument()
    expect(grid?.className).not.toContain('flex-col')
  })
})
