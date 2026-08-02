import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'
import { makeUser } from '@/test/auth-harness'
import { Navbar } from './navbar'
import { site } from '@/lib/content'

// next/navigation has no router in jsdom.
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}))

describe('Navbar', () => {
  it('renders every link from content/site.json', async () => {
    renderWithProviders(<Navbar />)
    for (const link of site.nav) {
      expect(await screen.findAllByText(link.label)).not.toHaveLength(0)
    }
  })

  it('offers Register when signed out', async () => {
    renderWithProviders(<Navbar />)
    const register = await screen.findAllByText('Register')
    expect(register.length).toBeGreaterThan(0)
    expect(screen.queryByLabelText('Open profile menu')).toBeNull()
  })

  it('shows the profile menu instead of Register when signed in', async () => {
    renderWithProviders(<Navbar />, { user: makeUser({ role: 'node_peer' }) })
    expect(await screen.findByLabelText('Open profile menu')).toBeInTheDocument()
    expect(screen.queryByText('Register')).toBeNull()
  })

  /** A guest is authenticated but not a member, so both must appear. */
  it('still offers Register to a guest', async () => {
    renderWithProviders(<Navbar />, { user: makeUser({ role: 'guest' }) })
    expect(await screen.findByLabelText('Open profile menu')).toBeInTheDocument()
    expect(screen.getAllByText('Register').length).toBeGreaterThan(0)
  })

  it('does not offer a Dashboard link to a guest', async () => {
    renderWithProviders(<Navbar />, { user: makeUser({ role: 'guest' }) })
    await screen.findByLabelText('Open profile menu')
    expect(screen.queryByRole('menuitem', { name: /dashboard/i })).toBeNull()
  })

  it('assumes signed-out while the session is still resolving', async () => {
    renderWithProviders(<Navbar />, { isLoading: true })
    // Register is the safe default: showing nothing would hide the only CTA.
    expect(await screen.findAllByText('Register')).not.toHaveLength(0)
    expect(screen.queryByLabelText('Open profile menu')).toBeNull()
  })

  it('marks the header for the view transition so it does not slide', async () => {
    const { container } = renderWithProviders(<Navbar />)
    const header = container.querySelector('header')
    expect(header?.style.viewTransitionName).toBe('site-header')
  })
})
