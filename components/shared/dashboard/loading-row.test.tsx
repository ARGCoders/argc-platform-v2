import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { LoadingRow } from './loading-row'

describe('LoadingRow', () => {
  // Regression guard: this is the whole point of the component — a loading
  // XpLedgerTable must not shift layout once real rows arrive.
  it('holds the calibrated 46px row height and a bottom-only border', () => {
    const { container } = render(<LoadingRow />)
    const row = container.firstChild as HTMLElement
    expect(row.className).toContain('h-[46px]')
    const classTokens = row.className.split(/\s+/)
    expect(classTokens).toContain('border-b')
    expect(classTokens).not.toContain('border')
  })

  it('renders pulse placeholders', () => {
    const { container } = render(<LoadingRow />)
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
  })

  it('switches border tokens for the light surface', () => {
    const { container } = render(<LoadingRow surface="light" />)
    const row = container.firstChild as HTMLElement
    expect(row.className).toContain('border-border')
    expect(row.className).not.toContain('border-sidebar-border')
  })
})
