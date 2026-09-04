import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DashboardHeader } from './dashboard-header'

describe('DashboardHeader', () => {
  it('renders the title as a heading', () => {
    render(<DashboardHeader title="Overview" />)
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument()
  })

  it('omits the breadcrumb when no crumbs are passed', () => {
    render(<DashboardHeader title="Overview" />)
    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).toBeNull()
  })

  it('renders the breadcrumb when crumbs are passed', () => {
    render(
      <DashboardHeader
        title="Members"
        crumbs={[{ label: 'Admin', href: '/dashboard/admin' }, { label: 'Members' }]}
      />,
    )
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('renders the actions slot when provided', () => {
    render(<DashboardHeader title="Overview" actions={<button>Export</button>} />)
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument()
  })

  it('omits the actions slot when not provided', () => {
    const { container } = render(<DashboardHeader title="Overview" />)
    expect(container.querySelector('button')).toBeNull()
  })

  // Regression guard: `text-foreground` and the dashboard's `bg-sidebar`
  // resolve to the same oklch value in light mode (no `.dark` class is ever
  // applied), so the title and breadcrumb must use the hero-ink family, not
  // the ambient Paper-mode tokens, or they render invisible on Terminal Navy.
  it('uses the dark-surface palette, not the ambient light-mode tokens', () => {
    render(
      <DashboardHeader
        title="Overview"
        crumbs={[{ label: 'Admin', href: '/dashboard/admin' }, { label: 'Members' }]}
      />,
    )
    const heading = screen.getByRole('heading', { name: 'Overview' })
    expect(heading.className).toContain('text-hero-ink')
    expect(heading.className).not.toContain('text-foreground')

    const crumbLink = screen.getByRole('link', { name: 'Admin' })
    expect(crumbLink.className).toContain('hero-ink')
    expect(crumbLink.className).not.toContain('muted-foreground')
  })

  it('keeps a long title from breaking the header layout', () => {
    const longTitle = 'A'.repeat(120)
    render(<DashboardHeader title={longTitle} actions={<button>Export</button>} />)
    expect(screen.getByRole('heading', { name: longTitle }).className).toContain(
      'truncate',
    )
  })
})
