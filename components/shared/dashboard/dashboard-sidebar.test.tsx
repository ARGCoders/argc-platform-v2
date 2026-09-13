import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'
import { makeUser } from '@/test/auth-harness'
import { DashboardSidebar } from './dashboard-sidebar'

// next/navigation has no router in jsdom.
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/overview',
}))

describe('DashboardSidebar', () => {
  it('shows only the member nav set for a node_peer', async () => {
    renderWithProviders(<DashboardSidebar />, { user: makeUser({ role: 'node_peer' }) })
    expect(
      (await screen.findAllByRole('link', { name: 'Overview' })).length,
    ).toBeGreaterThan(0)
    expect(screen.queryAllByRole('link', { name: 'Node Members' })).toHaveLength(0)
    expect(screen.queryAllByRole('link', { name: 'Admin Overview' })).toHaveLength(0)
  })

  it('adds the node leader set on top of the member set for a node_leader', async () => {
    renderWithProviders(<DashboardSidebar />, { user: makeUser({ role: 'node_leader' }) })
    expect(
      (await screen.findAllByRole('link', { name: 'Node Members' })).length,
    ).toBeGreaterThan(0)
    expect(screen.queryAllByRole('link', { name: 'Overview' }).length).toBeGreaterThan(0)
    expect(screen.queryAllByRole('link', { name: 'Admin Overview' })).toHaveLength(0)
  })

  it('adds the admin set on top of everything for a super_peer', async () => {
    renderWithProviders(<DashboardSidebar />, { user: makeUser({ role: 'super_peer' }) })
    expect(
      (await screen.findAllByRole('link', { name: 'Admin Overview' })).length,
    ).toBeGreaterThan(0)
    expect(
      screen.queryAllByRole('link', { name: 'Node Members' }).length,
    ).toBeGreaterThan(0)
    expect(screen.queryAllByRole('link', { name: 'Overview' }).length).toBeGreaterThan(0)
  })

  it('shows a mobile menu toggle that expands the takeover nav', async () => {
    renderWithProviders(<DashboardSidebar />, { user: makeUser({ role: 'node_peer' }) })
    const toggle = await screen.findByLabelText('Toggle dashboard menu')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
  })

  // Regression guard for the One Signal Rule: Signal Maroon is the only
  // color allowed to mean "active/this matters" — Steel Blue is reserved for
  // hover only.
  it('marks the active nav link with Signal Maroon, not Steel Blue', async () => {
    renderWithProviders(<DashboardSidebar />, { user: makeUser({ role: 'node_peer' }) })
    const activeLinks = await screen.findAllByRole('link', { name: 'Overview' })
    expect(activeLinks.length).toBeGreaterThan(0)
    for (const link of activeLinks) {
      expect(link.className).toContain('bg-sidebar-primary')
      expect(link.className).not.toContain('bg-sidebar-accent')
    }
  })

  it('shows a visible focus indicator on nav links', async () => {
    renderWithProviders(<DashboardSidebar />, { user: makeUser({ role: 'node_peer' }) })
    const links = await screen.findAllByRole('link', { name: 'Overview' })
    expect(links.length).toBeGreaterThan(0)
    expect(links[0]?.className).toContain('focus-visible:outline-2')
  })

  it('renders nothing once resolved signed out', async () => {
    const { container } = renderWithProviders(<DashboardSidebar />, { user: null })
    await waitFor(() => expect(container.querySelector('.animate-pulse')).toBeNull())
    expect(container.firstChild).toBeNull()
  })

  // Regression guard: the nav data is already tiered by role boundary — a
  // flat, ungrouped render was the exact bug the critique caught, since a
  // super_peer's 19 items become a wall with no way to scan for one item.
  it('does not label the single group a plain member sees', async () => {
    renderWithProviders(<DashboardSidebar />, { user: makeUser({ role: 'node_peer' }) })
    await screen.findAllByRole('link', { name: 'Overview' })
    expect(screen.queryAllByText('Member')).toHaveLength(0)
  })

  it('labels each section once a role sees more than one group', async () => {
    renderWithProviders(<DashboardSidebar />, { user: makeUser({ role: 'node_leader' }) })
    await screen.findAllByRole('link', { name: 'Node Members' })
    expect(screen.queryAllByText('Member').length).toBeGreaterThan(0)
    expect(screen.queryAllByText('Node').length).toBeGreaterThan(0)
    expect(screen.queryAllByText('Admin')).toHaveLength(0)
  })

  it('labels all three sections for a super_peer', async () => {
    renderWithProviders(<DashboardSidebar />, { user: makeUser({ role: 'super_peer' }) })
    await screen.findAllByRole('link', { name: 'Admin Overview' })
    expect(screen.queryAllByText('Member').length).toBeGreaterThan(0)
    expect(screen.queryAllByText('Node').length).toBeGreaterThan(0)
    expect(screen.queryAllByText('Admin').length).toBeGreaterThan(0)
  })

  // Regression guard: the skeleton used to be `hidden md:flex` in its
  // entirety, so a mobile visitor saw a blank navy screen with zero chrome
  // while auth resolved — a direct violation of "no layout shift."
  it('renders a loading skeleton for the mobile toggle bar, not just the desktop rail', () => {
    const { container } = renderWithProviders(<DashboardSidebar />, { isLoading: true })
    const mobileSkeleton = Array.from(container.querySelectorAll('div')).find((el) =>
      el.className.includes('md:hidden'),
    )
    expect(mobileSkeleton).toBeTruthy()
    expect(mobileSkeleton?.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  // Regression guard: Identity, not DashboardHeader's actions slot — that
  // slot is opt-in per-page (only /dashboard/overview renders one today),
  // while Identity renders unconditionally on every dashboard route.
  it('renders a theme toggle in Identity, switching the accessible label on click', async () => {
    renderWithProviders(<DashboardSidebar />, { user: makeUser({ role: 'node_peer' }) })
    // Identity renders twice (desktop rail + mobile takeover) — both toggles
    // share one context, so clicking either flips both.
    const toggles = await screen.findAllByLabelText('Switch to light theme')
    expect(toggles.length).toBeGreaterThan(0)
    fireEvent.click(toggles[0]!)
    expect(await screen.findAllByLabelText('Switch to dark theme')).toHaveLength(
      toggles.length,
    )
  })

  it('applies the DESIGN.md Label weight to nav links and group labels', async () => {
    renderWithProviders(<DashboardSidebar />, { user: makeUser({ role: 'super_peer' }) })
    const links = await screen.findAllByRole('link', { name: 'Overview' })
    expect(links[0]?.className).toContain('font-medium')
    const groupLabels = await screen.findAllByText('Admin')
    expect(groupLabels.length).toBeGreaterThan(0)
    expect(groupLabels[0]?.className).toContain('font-medium')
  })
})
