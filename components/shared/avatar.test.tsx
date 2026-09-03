import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Avatar } from './avatar'

describe('Avatar', () => {
  it('renders the image when a src is given', () => {
    render(<Avatar src="https://example.test/a.png" name="Sam Rivera" />)
    expect(screen.getByAltText('Sam Rivera')).toBeInTheDocument()
  })

  it('falls back to the first initial, uppercased, when there is no src', () => {
    render(<Avatar src="" name="sam rivera" />)
    expect(screen.getByText('S')).toBeInTheDocument()
  })

  it('falls back to "?" when there is no src and no name', () => {
    render(<Avatar src="" name="" />)
    expect(screen.getByText('?')).toBeInTheDocument()
  })

  it('defaults to 40px and accepts a smaller size', () => {
    const { container: full } = render(<Avatar src="" name="Sam" />)
    expect((full.firstChild as HTMLElement).style.width).toBe('40px')

    const { container: small } = render(<Avatar src="" name="Sam" size={32} />)
    expect((small.firstChild as HTMLElement).style.width).toBe('32px')
  })

  // Regression guard: DESIGN.md's Shapes section once claimed avatars were
  // a rounded-full exception to the square-corner rule — the shipped
  // component has never actually been rounded. This locks the real
  // behavior in so a future "fix" doesn't quietly round it to match a
  // since-corrected doc.
  it('stays square, never rounded', () => {
    const { container } = render(<Avatar src="" name="Sam" />)
    expect((container.firstChild as HTMLElement).className).not.toMatch(/rounded/)
  })

  // Regression guard: NodeMemberRow is Avatar's first non-dark-only
  // consumer — the fallback token must actually change with the prop, not
  // just accept it.
  it('switches the fallback token for the light surface', () => {
    const { container } = render(<Avatar src="" name="Sam" surface="light" />)
    expect((container.firstChild as HTMLElement).className).toContain('bg-muted')
    expect((container.firstChild as HTMLElement).className).not.toContain(
      'bg-sidebar-accent',
    )
  })
})
