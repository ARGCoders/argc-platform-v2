import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Breadcrumb } from './breadcrumb'

const items = [{ label: 'Admin', href: '/dashboard/admin' }, { label: 'Members' }]

describe('Breadcrumb', () => {
  it('marks the trailing crumb as the current page and renders it as text, not a link', () => {
    render(<Breadcrumb items={items} />)
    const current = screen.getByText('Members')
    expect(current).toHaveAttribute('aria-current', 'page')
    expect(current.tagName).not.toBe('A')
    expect(screen.getByRole('link', { name: 'Admin' })).toBeInTheDocument()
  })

  it('uses the light-surface palette by default', () => {
    render(<Breadcrumb items={items} />)
    expect(screen.getByRole('link', { name: 'Admin' }).className).toContain(
      'text-muted-foreground',
    )
    expect(screen.getByText('Members').className).toContain('text-foreground')
  })

  it('switches to the dark-surface palette when surface="dark"', () => {
    render(<Breadcrumb items={items} surface="dark" />)
    const link = screen.getByRole('link', { name: 'Admin' })
    expect(link.className).toContain('hero-ink')
    expect(link.className).not.toContain('muted-foreground')
    expect(screen.getByText('Members').className).toContain('text-hero-ink')
  })

  it('stays valid with zero crumbs', () => {
    const { container } = render(<Breadcrumb items={[]} />)
    expect(container.querySelector('ol')?.children.length).toBe(0)
  })

  it('shows a visible focus indicator on a crumb link', () => {
    render(<Breadcrumb items={items} />)
    const link = screen.getByRole('link', { name: 'Admin' })
    expect(link.className).toContain('focus-visible:outline-2')
  })

  // `truncate` alone does nothing on an inline element with no width bound —
  // a runaway label would just render as one long unbroken line instead of
  // ellipsizing. Guards a dead-code regression, not just presence of a class.
  it('bounds a crumb label so truncate can actually take effect', () => {
    const longLabel = 'A'.repeat(120)
    render(
      <Breadcrumb items={[{ label: longLabel, href: '/x' }, { label: 'Current' }]} />,
    )
    const link = screen.getByRole('link', { name: longLabel })
    expect(link.className).toContain('max-w-')
    expect(link.className).toContain('truncate')
  })

  it('applies the DESIGN.md Label weight (500)', () => {
    const { container } = render(<Breadcrumb items={items} />)
    expect(container.querySelector('ol')?.className).toContain('font-medium')
  })
})
