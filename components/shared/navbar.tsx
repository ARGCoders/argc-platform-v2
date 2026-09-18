'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useDashboardTheme } from '@/lib/dashboard-theme-context'
import { site } from '@/lib/content'
import { cn } from '@/lib/utils'

// Nav is editable in content/site.json — no code change to add or reorder links.
const NAV_LINKS = site.nav

export function Navbar() {
  const pathname = usePathname()
  // Auth comes from the provider — V1 fetched /api/auth/me here directly, which
  // was one of several duplicate session checks per page load.
  const { user, logout } = useAuth()

  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  // Dashboard pages get their own slim variant — checked first since it's the
  // most specific match. Pages whose hero is maroon need an opaque maroon
  // bar, not a translucent one. /events used to be listed here too, but it
  // has no maroon hero (it's a Paper-background listing page) — the bar was
  // wearing a hero-mode crown with no hero underneath it.
  //
  // /dev/dashboard-preview renders the real DashboardShell (via
  // MockAuthProvider) but lives outside /dashboard so proxy.ts's auth gate
  // never touches it — it needs the same dashboard variant for the same
  // reason a real /dashboard/* page does: DashboardShell/DashboardSidebar
  // already own the nav there, and the public Navbar's own hamburger and
  // full-screen mobile takeover stacking on top of DashboardSidebar's is
  // exactly the double-navbar bug this variant exists to prevent.
  const variant: 'default' | 'maroon' | 'dashboard' =
    pathname.startsWith('/dashboard') || pathname.startsWith('/dev/dashboard-preview')
      ? 'dashboard'
      : pathname.startsWith('/register')
        ? 'maroon'
        : 'default'
  const isDashboard = variant === 'dashboard'
  // Navbar sits in the root layout, outside DashboardShell's scoped `.dark`
  // subtree — it can't rely on --sidebar*'s CSS-variable swap the way the
  // shell itself does, so the dashboard variant needs its own explicit
  // light branch, same as every other ARGC component's surface prop.
  const { surface } = useDashboardTheme()
  const dashboardLight = isDashboard && surface === 'light'

  // 'default''s unscrolled state (bg-black/10, white text) is a translucent
  // tint meant to blend into a dark hero sitting directly behind the fixed
  // bar — that's true on '/', not on a hero-less light page like /events or
  // /blog. Those pages skip straight to the same opaque, always-legible
  // treatment 'default' only reaches after scrolling.
  const noHero = pathname.startsWith('/events') || pathname.startsWith('/blog')

  // Scroll-driven translucency exists for a bar sitting over a page hero.
  // DashboardShell's content scrolls inside main's own container, so
  // window.scrollY never changes on /dashboard pages anyway — skip the
  // listener entirely rather than subscribe to an event that can't fire.
  useEffect(() => {
    if (isDashboard) return
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isDashboard])

  // Prevent the page scrolling behind the full-screen mobile menu.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  // Close both menus on navigation, including browser back/forward. Adjusting
  // state during render is React's documented pattern for reacting to a
  // changed value; an effect here would cause a second render pass.
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) {
    setLastPath(pathname)
    setMenuOpen(false)
    setProfileOpen(false)
  }

  // Dismiss the profile dropdown on outside click or Escape.
  useEffect(() => {
    if (!profileOpen) return
    const handler = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent && e.key !== 'Escape') return
      if (e instanceof MouseEvent && profileRef.current?.contains(e.target as Node))
        return
      setProfileOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', handler)
    }
  }, [profileOpen])

  async function handleLogout() {
    await logout()
    setProfileOpen(false)
    setMenuOpen(false)
    window.location.href = '/'
  }

  return (
    <>
      <header
        style={{ viewTransitionName: 'site-header' }}
        className={[
          'fixed top-0 left-0 right-0 z-sticky',
          'flex items-center gap-8',
          'px-[clamp(1.5rem,4vw,3rem)]',
          'transition-[background,backdrop-filter] duration-400',
          variant === 'dashboard'
            ? dashboardLight
              ? 'bg-paper border-b border-border'
              : 'bg-eng-navy border-b border-white/12'
            : variant === 'maroon'
              ? scrolled
                ? 'bg-argc-maroon-dk'
                : 'bg-argc-maroon'
              : scrolled || noHero
                ? 'bg-eng-navy/88 backdrop-blur-md saturate-150'
                : 'bg-black/10',
        ].join(' ')}
      >
        <Link
          href="/"
          aria-label="ARGC home"
          className={cn('shrink-0 py-[0.625rem] px-3', !dashboardLight && 'bg-black/20')}
        >
          <Image
            src="/logo_argc.svg"
            alt="ARGC"
            width={340}
            height={88}
            priority
            className={cn(
              'h-10 w-auto opacity-90 hover:opacity-100 transition-opacity',
              !dashboardLight && 'brightness-0 invert',
            )}
          />
        </Link>

        {!isDashboard && (
          <nav
            aria-label="Primary"
            className="hidden md:flex items-center gap-[clamp(1.25rem,2.5vw,2rem)] ml-auto"
          >
            {NAV_LINKS.map(({ label, href }) => (
              <a
                key={href}
                href={href}
                className="text-sm font-medium tracking-wide text-hero-ink/75 hover:text-hero-ink transition-colors whitespace-nowrap"
              >
                {label}
              </a>
            ))}
          </nav>
        )}

        <div
          className={
            isDashboard
              ? 'flex items-center gap-2 shrink-0 ml-auto'
              : 'hidden md:flex items-center gap-2 shrink-0'
          }
        >
          {user && (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((o) => !o)}
                aria-label="Open profile menu"
                aria-expanded={profileOpen}
                aria-controls="profile-dropdown"
                className={cn(
                  'shrink-0 overflow-hidden transition-all cursor-pointer bg-transparent p-0 w-10 h-10 border',
                  dashboardLight
                    ? 'border-foreground/20 hover:border-foreground/60'
                    : 'border-white/20 hover:border-white/60',
                )}
              >
                <Avatar
                  src={user.avatar_url}
                  name={user.display_name || user.intra_login}
                />
              </button>

              {profileOpen && (
                <div
                  id="profile-dropdown"
                  role="menu"
                  className={cn(
                    'absolute right-0 top-full mt-2 w-56 z-overlay border',
                    dashboardLight
                      ? 'bg-card border-border shadow-lg ring-1 ring-foreground/10'
                      : 'bg-eng-navy border-hero-ink/15',
                  )}
                >
                  <div
                    className={cn(
                      'px-4 py-3 border-b',
                      dashboardLight ? 'border-border' : 'border-hero-ink/10',
                    )}
                  >
                    <p
                      className={cn(
                        'text-sm font-semibold truncate',
                        dashboardLight ? 'text-foreground' : 'text-hero-ink',
                      )}
                    >
                      {user.display_name || user.intra_login}
                    </p>
                    <p
                      className={cn(
                        'font-mono text-[0.6rem] tracking-[0.15em] uppercase',
                        dashboardLight ? 'text-muted-foreground' : 'text-hero-ink/40',
                      )}
                    >
                      {user.role.replace(/_/g, ' ')}
                    </p>
                  </div>

                  {/* Self-referential once already inside /dashboard, where this variant renders. */}
                  {user.role !== 'guest' && !isDashboard && (
                    <Link
                      href="/dashboard"
                      role="menuitem"
                      onClick={() => setProfileOpen(false)}
                      className="block px-4 py-3 text-hero-ink/75 hover:text-hero-ink hover:bg-hero-ink/5 transition-colors font-mono text-[0.7rem] tracking-[0.1em] uppercase"
                    >
                      Dashboard
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={handleLogout}
                    role="menuitem"
                    className={cn(
                      'w-full text-left px-4 py-3 transition-colors font-mono text-[0.7rem] tracking-[0.1em] uppercase',
                      dashboardLight
                        ? 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        : 'text-hero-ink/75 hover:text-hero-ink hover:bg-hero-ink/5',
                    )}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {!isDashboard && (
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((o) => !o)}
            className="md:hidden ml-auto flex flex-col justify-center gap-[5px] p-1 bg-transparent border-0 cursor-pointer"
          >
            <span
              className={[
                'block w-[22px] h-px bg-hero-ink transition-transform duration-300',
                menuOpen ? 'translate-y-[3.25px] rotate-45' : '',
              ].join(' ')}
            />
            <span
              className={[
                'block w-[22px] h-px bg-hero-ink transition-transform duration-300',
                menuOpen ? '-translate-y-[3.25px] -rotate-45' : '',
              ].join(' ')}
            />
          </button>
        )}
      </header>

      {/* DashboardSidebar owns dashboard mobile nav — this variant has no
          hamburger to open it, so the takeover never renders at all. */}
      {!isDashboard && (
        <div
          id="mobile-menu"
          aria-hidden={!menuOpen}
          className={[
            'fixed inset-0 z-overlay bg-eng-navy',
            'flex flex-col justify-center px-[clamp(2rem,8vw,4rem)]',
            'transition-[opacity,transform,visibility] duration-350',
            menuOpen
              ? 'opacity-100 visible translate-y-0'
              : 'opacity-0 invisible -translate-y-2',
          ].join(' ')}
        >
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {NAV_LINKS.map(({ label, href }) => (
              <a
                key={href}
                href={href}
                tabIndex={menuOpen ? undefined : -1}
                onClick={() => setMenuOpen(false)}
                className="text-[clamp(2rem,8vw,3.5rem)] font-bold leading-[1.25] text-hero-ink/50 hover:text-hero-ink transition-colors"
              >
                {label}
              </a>
            ))}

            {user && user.role !== 'guest' && (
              <a
                href="/dashboard"
                tabIndex={menuOpen ? undefined : -1}
                onClick={() => setMenuOpen(false)}
                className="mt-8 inline-flex w-fit items-center text-[0.9375rem] font-semibold tracking-[0.05em] uppercase text-argc-maroon bg-hero-ink px-7 py-3"
              >
                Dashboard
              </a>
            )}

            {user && (
              <button
                type="button"
                tabIndex={menuOpen ? undefined : -1}
                onClick={handleLogout}
                className="mt-4 inline-flex w-fit items-center text-[0.8rem] font-semibold tracking-[0.06em] uppercase text-hero-ink/60 hover:text-hero-ink bg-transparent border border-hero-ink/20 hover:border-hero-ink/40 px-7 py-3 transition-colors"
              >
                Logout
              </button>
            )}
          </nav>
        </div>
      )}
    </>
  )
}

/** 42 avatars come from cdn.intra.42.fr, which is allow-listed in next.config. */
function Avatar({ src, name }: { src: string; name: string }) {
  if (!src) {
    return (
      <span className="w-full h-full flex items-center justify-center bg-white/10 text-hero-ink text-xs font-bold">
        {(name || '?').charAt(0).toUpperCase()}
      </span>
    )
  }
  return (
    <Image
      src={src}
      alt={name}
      width={40}
      height={40}
      className="w-full h-full object-cover"
    />
  )
}
