'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { site } from '@/lib/content'

// Nav is editable in content/site.json — no code change to add or reorder links.
const NAV_LINKS = site.nav

export function Navbar() {
  const pathname = usePathname()
  // Auth comes from the provider — V1 fetched /api/auth/me here directly, which
  // was one of several duplicate session checks per page load.
  const { user, isLoading, logout } = useAuth()

  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  // Pages whose hero is maroon need an opaque maroon bar, not a translucent one.
  const variant: 'default' | 'maroon' =
    pathname.startsWith('/events') || pathname.startsWith('/register')
      ? 'maroon'
      : 'default'

  const isGuest = !user || user.role === 'guest'
  const showRegister = isLoading || isGuest

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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
          variant === 'maroon'
            ? scrolled
              ? 'bg-argc-maroon-dk'
              : 'bg-argc-maroon'
            : scrolled
              ? 'bg-eng-navy/88 backdrop-blur-md saturate-150'
              : 'bg-black/10',
        ].join(' ')}
      >
        <Link
          href="/"
          aria-label="ARGC home"
          className="shrink-0 bg-black/20 py-[0.625rem] px-3"
        >
          <Image
            src="/logo_argc.svg"
            alt="ARGC"
            width={340}
            height={88}
            priority
            className="h-10 w-auto brightness-0 invert opacity-90 hover:opacity-100 transition-opacity"
          />
        </Link>

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

        <div className="hidden md:flex items-center gap-2 shrink-0">
          {showRegister && (
            <a
              href="/register"
              className="inline-flex items-center text-[0.8rem] font-semibold tracking-[0.06em] uppercase text-hero-ink bg-black/20 hover:bg-black/30 transition-colors px-4 py-3"
            >
              Register
            </a>
          )}

          {user && (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((o) => !o)}
                aria-label="Open profile menu"
                aria-expanded={profileOpen}
                aria-controls="profile-dropdown"
                className="shrink-0 overflow-hidden border border-white/20 hover:border-white/60 transition-all cursor-pointer bg-transparent p-0 w-10 h-10"
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
                  className="absolute right-0 top-full mt-2 w-56 bg-eng-navy border border-hero-ink/15 z-overlay"
                >
                  <div className="px-4 py-3 border-b border-hero-ink/10">
                    <p className="text-hero-ink text-sm font-semibold truncate">
                      {user.display_name || user.intra_login}
                    </p>
                    <p className="font-mono text-[0.6rem] tracking-[0.15em] uppercase text-hero-ink/40">
                      {user.role.replace(/_/g, ' ')}
                    </p>
                  </div>

                  {user.role !== 'guest' && (
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
                    className="w-full text-left px-4 py-3 text-hero-ink/75 hover:text-hero-ink hover:bg-hero-ink/5 transition-colors font-mono text-[0.7rem] tracking-[0.1em] uppercase"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

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
      </header>

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

          {showRegister && (
            <a
              href="/register"
              tabIndex={menuOpen ? undefined : -1}
              onClick={() => setMenuOpen(false)}
              className="mt-8 inline-flex w-fit items-center text-[0.9375rem] font-semibold tracking-[0.05em] uppercase text-argc-maroon bg-hero-ink px-7 py-3"
            >
              Register
            </a>
          )}
        </nav>
      </div>
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
