import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders as renderHeader } from '@/test/render'
import { DashboardHeader } from './dashboard-header'

describe('DashboardHeader', () => {
  it('renders the title as a heading', () => {
    renderHeader(<DashboardHeader title="Overview" />)
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument()
  })

  it('omits the breadcrumb when no crumbs are passed', () => {
    renderHeader(<DashboardHeader title="Overview" />)
    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).toBeNull()
  })

  it('renders the breadcrumb when crumbs are passed', () => {
    renderHeader(
      <DashboardHeader
        title="Members"
        crumbs={[{ label: 'Admin', href: '/dashboard/admin' }, { label: 'Members' }]}
      />,
    )
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('renders the actions slot when provided', () => {
    renderHeader(<DashboardHeader title="Overview" actions={<button>Export</button>} />)
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument()
  })

  it('omits the actions slot when not provided', () => {
    const { container } = renderHeader(<DashboardHeader title="Overview" />)
    expect(container.querySelector('button')).toBeNull()
  })

  // Regression guard: `text-hero-ink` is a static brand token, not the
  // swappable --sidebar* family — the dashboard theme defaults to dark
  // (lib/dashboard-theme-context.tsx), so title/breadcrumb must use the
  // hero-ink family by default, not the ambient light-mode tokens, or they
  // render invisible on Terminal Navy.
  it('uses the dark-surface palette by default', () => {
    renderHeader(
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

  it('uses the light-surface palette when surface="light" is explicit', () => {
    renderHeader(<DashboardHeader title="Overview" surface="light" />)
    const heading = screen.getByRole('heading', { name: 'Overview' })
    expect(heading.className).toContain('text-foreground')
    expect(heading.className).not.toContain('hero-ink')
  })

  // Regression guard: the real dashboard pages that render this are Server
  // Components and can never pass an explicit surface prop, so this must
  // fall back to the live dashboard-theme context, not a hardcoded default.
  it('falls back to the live dashboard theme when no explicit surface is given', async () => {
    localStorage.setItem('argc:dashboard-theme', 'light')

    renderHeader(<DashboardHeader title="Overview" />)

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Overview' }).className).toContain(
        'text-foreground',
      ),
    )

    localStorage.clear()
  })

  it('keeps a long title from breaking the header layout', () => {
    const longTitle = 'A'.repeat(120)
    renderHeader(<DashboardHeader title={longTitle} actions={<button>Export</button>} />)
    expect(screen.getByRole('heading', { name: longTitle }).className).toContain(
      'truncate',
    )
  })
})
