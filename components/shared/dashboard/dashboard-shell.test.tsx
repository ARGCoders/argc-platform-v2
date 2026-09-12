import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'
import { makeUser } from '@/test/auth-harness'
import { DashboardShell } from './dashboard-shell'

// next/navigation has no router in jsdom.
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/overview',
}))

describe('DashboardShell', () => {
  it('renders its children in the content column', async () => {
    renderWithProviders(
      <DashboardShell>
        <p>Overview content</p>
      </DashboardShell>,
      { user: makeUser({ role: 'node_peer' }) },
    )
    expect(await screen.findByText('Overview content')).toBeInTheDocument()
  })

  it('collapses the sidebar rail below the md breakpoint', async () => {
    renderWithProviders(
      <DashboardShell>
        <p>Overview content</p>
      </DashboardShell>,
      { user: makeUser({ role: 'node_peer' }) },
    )
    const aside = await screen.findByRole('complementary')
    expect(aside.className).toContain('hidden')
    expect(aside.className).toContain('md:flex')
  })

  // Regression guard: the content row must stack (mobile menu bar above
  // main) below `md` and switch to a side-by-side row at `md`+, matching
  // DashboardSidebar's own `hidden md:flex` / `md:hidden` breakpoints. A row
  // that never becomes a column renders the mobile bar as a flex sibling of
  // `main` instead of a header above it.
  it('stacks the content row into a column below md and a row at md+', async () => {
    const { container } = renderWithProviders(
      <DashboardShell>
        <p>Overview content</p>
      </DashboardShell>,
      { user: makeUser({ role: 'node_peer' }) },
    )
    await screen.findByText('Overview content')
    const row = container.querySelector('main')?.parentElement
    expect(row?.className).toContain('flex-col')
    expect(row?.className).toContain('md:flex-row')
  })

  // Regression guard: the dashboard theme toggle (lib/dashboard-theme-
  // context.tsx) applies `.dark` scoped to this one root — never `<html>` —
  // so --sidebar* (and every shadcn primitive in the tree) resolves
  // correctly. Defaults dark; the stable id is what the no-flash script in
  // app/dashboard/layout.tsx targets before hydration.
  it('applies the dark class to its own root by default, carrying the stable id', async () => {
    const { container } = renderWithProviders(
      <DashboardShell>
        <p>Overview content</p>
      </DashboardShell>,
      { user: makeUser({ role: 'node_peer' }) },
    )
    await screen.findByText('Overview content')
    const root = container.firstElementChild
    expect(root?.className).toContain('dark')
    expect(root).toHaveAttribute('id', 'dashboard-shell-root')
  })

  it('drops the dark class when the theme context says light', async () => {
    localStorage.setItem('argc:dashboard-theme', 'light')

    const { container } = renderWithProviders(
      <DashboardShell>
        <p>Overview content</p>
      </DashboardShell>,
      { user: makeUser({ role: 'node_peer' }) },
    )
    await screen.findByText('Overview content')

    await waitFor(() => {
      expect(container.firstElementChild?.className).not.toContain('dark')
    })

    localStorage.clear()
  })
})
