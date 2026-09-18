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

  /** The public site is a login-free showcase — no Register CTA, anywhere. */
  it('offers no Register CTA when signed out', async () => {
    renderWithProviders(<Navbar />)
    expect(screen.queryByText('Register')).toBeNull()
    expect(screen.queryByLabelText('Open profile menu')).toBeNull()
  })

  it('shows the profile menu when signed in', async () => {
    renderWithProviders(<Navbar />, { user: makeUser({ role: 'node_peer' }) })
    expect(await screen.findByLabelText('Open profile menu')).toBeInTheDocument()
  })

  it('keeps the profile menu for a guest with no Register CTA', async () => {
    renderWithProviders(<Navbar />, { user: makeUser({ role: 'guest' }) })
    expect(await screen.findByLabelText('Open profile menu')).toBeInTheDocument()
    expect(screen.queryByText('Register')).toBeNull()
  })

  it('does not offer a Dashboard link to a guest', async () => {
    renderWithProviders(<Navbar />, { user: makeUser({ role: 'guest' }) })
    await screen.findByLabelText('Open profile menu')
    expect(screen.queryByRole('menuitem', { name: /dashboard/i })).toBeNull()
  })

  it('shows no profile menu or Register while the session is still resolving', async () => {
    renderWithProviders(<Navbar />, { isLoading: true })
    expect(screen.queryByText('Register')).toBeNull()
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

  // /blog is a Paper-background listing page like /events — no maroon hero.
  it('does not apply the maroon bar on /blog', async () => {
    vi.mocked(usePathname).mockReturnValue('/blog')
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

  // Regression guard: 'default''s unscrolled state (bg-black/10 + white text)
  // assumes a dark hero sits behind the fixed bar. /events has no hero, just
  // the light Paper background — without this, the header is nearly
  // unreadable until the visitor scrolls past 60px.
  it('renders the opaque bar on /events even before scrolling', async () => {
    vi.mocked(usePathname).mockReturnValue('/events')
    const { container } = renderWithProviders(<Navbar />)
    const header = container.querySelector('header')
    expect(header?.className).toContain('bg-eng-navy/88')
    expect(header?.className).not.toContain('bg-black/10')
  })

  it('renders the opaque bar on /blog even before scrolling', async () => {
    vi.mocked(usePathname).mockReturnValue('/blog')
    const { container } = renderWithProviders(<Navbar />)
    const header = container.querySelector('header')
    expect(header?.className).toContain('bg-eng-navy/88')
    expect(header?.className).not.toContain('bg-black/10')
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
    // Flat bg-eng-navy (the default/dark dashboard theme), not the
    // translucent scroll-driven treatment 'default' uses.
    expect(header?.className).toContain('bg-eng-navy')
    expect(header?.className).not.toContain('bg-eng-navy/88')
    expect(header?.className).not.toContain('bg-black/10')
  })

  // Regression guard: Navbar sits outside DashboardShell's own `.dark`-scoped
  // subtree, so it can't rely on the swappable --sidebar* CSS variable the
  // way the shell itself does — it needs its own explicit light branch, read
  // live from the same dashboard-theme context every other surface-aware
  // dashboard component reads.
  it('switches to the light dashboard palette when the theme context says light', async () => {
    localStorage.setItem('argc:dashboard-theme', 'light')

    const { container } = renderWithProviders(<Navbar />, {
      user: makeUser({ role: 'node_peer' }),
    })
    await screen.findByLabelText('Open profile menu')

    const header = container.querySelector('header')
    expect(header?.className).toContain('bg-paper')

    localStorage.clear()
  })

  // Regression guard: /dev/dashboard-preview renders the real DashboardShell
  // outside /dashboard (proxy.ts's auth gate must not touch it), but still
  // needs the dashboard variant — otherwise the public Navbar's own
  // hamburger/mobile takeover stacks on top of DashboardSidebar's, the exact
  // double-navbar bug this variant exists to prevent.
  it('also applies to /dev/dashboard-preview, which renders DashboardShell outside /dashboard', async () => {
    vi.mocked(usePathname).mockReturnValue('/dev/dashboard-preview')
    renderWithProviders(<Navbar />, { user: makeUser({ role: 'node_peer' }) })
    await screen.findByLabelText('Open profile menu')
    expect(screen.queryByLabelText('Toggle menu')).toBeNull()
  })
})
