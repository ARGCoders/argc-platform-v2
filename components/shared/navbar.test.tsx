import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { makeUser } from '@/test/auth-harness'
import { Navbar } from './navbar'
import { site } from '@/lib/content'
import { usePathname } from 'next/navigation'

// next/navigation has no router in jsdom. A mutable mock so individual tests
// can switch to a /dashboard path without affecting the rest of the file.
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
}))

beforeEach(() => {
  vi.mocked(usePathname).mockReturnValue('/')
})

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

describe('Navbar — maroon variant', () => {
  // Regression guard: /events was removed from the maroon match (it has no
  // maroon hero — a Paper-background listing page). /register still has one
  // and must keep the opaque maroon bar.
  it('does not apply the maroon bar on /events', async () => {
    vi.mocked(usePathname).mockReturnValue('/events')
    const { container } = renderWithProviders(<Navbar />)
    const header = container.querySelector('header')
    expect(header?.className).not.toContain('bg-argc-maroon')
  })

  it('still applies the maroon bar on /register', async () => {
    vi.mocked(usePathname).mockReturnValue('/register')
    const { container } = renderWithProviders(<Navbar />)
    const header = container.querySelector('header')
    expect(header?.className).toContain('bg-argc-maroon')
  })
})

describe('Navbar — dashboard variant', () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue('/dashboard/xp')
  })

  it('drops every public NAV_LINKS entry', async () => {
    renderWithProviders(<Navbar />, { user: makeUser({ role: 'node_peer' }) })
    await screen.findByLabelText('Open profile menu')
    for (const link of site.nav) {
      expect(screen.queryByText(link.label)).toBeNull()
    }
  })

  it('renders no hamburger or mobile takeover — DashboardSidebar owns dashboard mobile nav', async () => {
    const { container } = renderWithProviders(<Navbar />, {
      user: makeUser({ role: 'node_peer' }),
    })
    await screen.findByLabelText('Open profile menu')
    expect(screen.queryByLabelText('Toggle menu')).toBeNull()
    expect(container.querySelector('#mobile-menu')).toBeNull()
  })

  it('never offers Register, even while the session is still resolving', async () => {
    renderWithProviders(<Navbar />, { isLoading: true })
    expect(screen.queryByText('Register')).toBeNull()
  })

  it('keeps the profile-menu trigger visible outside the md-only container', async () => {
    renderWithProviders(<Navbar />, { user: makeUser({ role: 'node_peer' }) })
    const trigger = await screen.findByLabelText('Open profile menu')
    // button -> .relative wrapper -> the register/profile container itself.
    expect(trigger.parentElement?.parentElement?.className).not.toContain('hidden')
  })

  it("drops the dropdown's self-referential Dashboard link but keeps Logout", async () => {
    const user = userEvent.setup()
    renderWithProviders(<Navbar />, { user: makeUser({ role: 'node_peer' }) })
    await user.click(await screen.findByLabelText('Open profile menu'))

    expect(screen.queryByRole('menuitem', { name: /dashboard/i })).toBeNull()
    expect(screen.getByRole('menuitem', { name: /logout/i })).toBeInTheDocument()
  })

  it('renders a flat sidebar-matched header instead of the scroll-driven translucent one', async () => {
    const { container } = renderWithProviders(<Navbar />, {
      user: makeUser({ role: 'node_peer' }),
    })
    await screen.findByLabelText('Open profile menu')
    const header = container.querySelector('header')
    expect(header?.className).toContain('bg-sidebar')
    expect(header?.className).not.toContain('bg-eng-navy/88')
    expect(header?.className).not.toContain('bg-black/10')
  })
})
