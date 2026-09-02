'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { roleAtLeast } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { RoleBadge } from './role-badge'
import type { Role } from '@/types/pocketbase'

type NavGroup = 'Member' | 'Node' | 'Admin'

interface NavItem {
  label: string
  href: string
  minRole: Role
  group: NavGroup
}

/**
 * Additive per PLATFORM.md §2's route tables: a node leader sees the member
 * set plus their own, a super peer sees all of it. The one parameterised
 * route (`/dashboard/admin/members/[userId]`) is reached by drilling into the
 * members table, not from the rail, so it isn't listed here.
 */
const NAV_ITEMS: NavItem[] = [
  {
    label: 'Overview',
    href: '/dashboard/overview',
    minRole: 'node_peer',
    group: 'Member',
  },
  { label: 'XP', href: '/dashboard/xp', minRole: 'node_peer', group: 'Member' },
  {
    label: 'Evaluations',
    href: '/dashboard/evaluations',
    minRole: 'node_peer',
    group: 'Member',
  },
  { label: 'Events', href: '/dashboard/events', minRole: 'node_peer', group: 'Member' },
  { label: 'Vote', href: '/dashboard/vote', minRole: 'node_peer', group: 'Member' },
  { label: 'Node', href: '/dashboard/node', minRole: 'node_peer', group: 'Member' },
  {
    label: 'Node Members',
    href: '/dashboard/node/members',
    minRole: 'node_leader',
    group: 'Node',
  },
  {
    label: 'Node Evaluations',
    href: '/dashboard/node/evaluations',
    minRole: 'node_leader',
    group: 'Node',
  },
  {
    label: 'Propose Event',
    href: '/dashboard/node/events/propose',
    minRole: 'node_leader',
    group: 'Node',
  },
  {
    label: 'Flag Issue',
    href: '/dashboard/node/flag',
    minRole: 'node_leader',
    group: 'Node',
  },
  {
    label: 'Admin Overview',
    href: '/dashboard/admin',
    minRole: 'super_peer',
    group: 'Admin',
  },
  {
    label: 'Members',
    href: '/dashboard/admin/members',
    minRole: 'super_peer',
    group: 'Admin',
  },
  {
    label: 'Award XP',
    href: '/dashboard/admin/xp/award',
    minRole: 'super_peer',
    group: 'Admin',
  },
  {
    label: 'Votes',
    href: '/dashboard/admin/votes',
    minRole: 'super_peer',
    group: 'Admin',
  },
  {
    label: 'Manage Events',
    href: '/dashboard/admin/events',
    minRole: 'super_peer',
    group: 'Admin',
  },
  {
    label: 'Manage Evaluations',
    href: '/dashboard/admin/evaluations',
    minRole: 'super_peer',
    group: 'Admin',
  },
  {
    label: 'Cycles',
    href: '/dashboard/admin/cycles',
    minRole: 'super_peer',
    group: 'Admin',
  },
  {
    label: 'Endorsements',
    href: '/dashboard/admin/endorsements',
    minRole: 'super_peer',
    group: 'Admin',
  },
  {
    label: 'Nodes',
    href: '/dashboard/admin/nodes',
    minRole: 'super_peer',
    group: 'Admin',
  },
]

const GROUP_ORDER: NavGroup[] = ['Member', 'Node', 'Admin']

const NAV_LINK_CLASS =
  'px-3 py-2 font-mono text-[0.7rem] font-medium tracking-[0.1em] uppercase transition-colors'

/**
 * Groups items by their already-tiered role boundary (member/node/admin)
 * instead of rendering one flat list — a super peer sees all 19 items, and a
 * flat list forces scanning every one of them to find, say, "Award XP".
 */
function groupNavItems(items: NavItem[]): Array<{ group: NavGroup; items: NavItem[] }> {
  return GROUP_ORDER.map((group) => ({
    group,
    items: items.filter((item) => item.group === group),
  })).filter((section) => section.items.length > 0)
}

function NavLinks({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[]
  pathname: string
  onNavigate?: () => void
}) {
  const sections = groupNavItems(items)
  // A single group (a plain member's own 6 links) has nothing to distinguish
  // itself from — the label would just repeat what the nav landmark already
  // says. Only label sections once there's more than one to tell apart.
  const showLabels = sections.length > 1

  return (
    <nav aria-label="Dashboard" className="flex flex-col gap-4">
      {sections.map(({ group, items: groupItems }) => (
        <div key={group} className="flex flex-col gap-1">
          {showLabels && (
            <p className="px-3 pb-1 font-mono text-[0.6rem] font-medium tracking-[0.15em] text-sidebar-foreground/40 uppercase">
              {group}
            </p>
          )}
          {groupItems.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  NAV_LINK_CLASS,
                  'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring',
                  active
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

function Identity({
  name,
  role,
  avatarUrl,
}: {
  name: string
  role: Role
  avatarUrl: string
}) {
  return (
    <div className="flex items-center gap-3 border-b border-sidebar-border px-3 py-4">
      <SidebarAvatar src={avatarUrl} name={name} />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="truncate text-sm font-medium text-sidebar-foreground">{name}</p>
        <RoleBadge role={role} />
      </div>
    </div>
  )
}

function SidebarAvatar({ src, name }: { src: string; name: string }) {
  if (!src) {
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-sidebar-accent text-xs font-bold text-sidebar-accent-foreground">
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
      className="h-10 w-10 shrink-0 object-cover"
    />
  )
}

/**
 * Sized to match the real desktop rail and mobile toggle bar exactly (same
 * container classes as the real markup below) so auth resolving never causes
 * layout shift — at either breakpoint, not just `md`+.
 */
function SidebarSkeleton() {
  return (
    <>
      <div className="hidden md:flex md:h-full md:w-60 md:shrink-0 md:flex-col md:border-r md:border-sidebar-border md:bg-sidebar">
        <div className="flex items-center gap-3 border-b border-sidebar-border px-3 py-4">
          <div className="h-10 w-10 shrink-0 animate-pulse bg-sidebar-foreground/10" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-3.5 w-24 animate-pulse bg-sidebar-foreground/10" />
            <div className="h-4 w-16 animate-pulse bg-sidebar-foreground/10" />
          </div>
        </div>
        <div className="flex flex-col gap-2 px-3 py-4">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-6 w-full animate-pulse bg-sidebar-foreground/10" />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-sidebar-border bg-sidebar px-4 py-3 md:hidden">
        <div className="h-4 w-16 animate-pulse bg-sidebar-foreground/10" />
        <div className="h-4 w-6 animate-pulse bg-sidebar-foreground/10" />
      </div>
    </>
  )
}

export function DashboardSidebar() {
  const pathname = usePathname()
  const { user, isLoading } = useAuth()
  const [open, setOpen] = useState(false)

  // Mirrors the public Navbar's full-screen mobile menu: body scroll is
  // locked while the takeover is open.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  // Close the mobile takeover on navigation, including browser back/forward.
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) {
    setLastPath(pathname)
    setOpen(false)
  }

  if (isLoading) return <SidebarSkeleton />
  if (!user) return null

  const items = NAV_ITEMS.filter((item) => roleAtLeast(user.role, item.minRole))
  const name = user.display_name || user.intra_login

  return (
    <>
      <aside className="hidden md:flex md:h-full md:w-60 md:shrink-0 md:flex-col md:border-r md:border-sidebar-border md:bg-sidebar">
        <Identity name={name} role={user.role} avatarUrl={user.avatar_url} />
        <div className="flex-1 overflow-y-auto px-2 py-4">
          <NavLinks items={items} pathname={pathname} />
        </div>
      </aside>

      <div className="flex items-center justify-between border-b border-sidebar-border bg-sidebar px-4 py-3 md:hidden">
        <span className="font-mono text-[0.7rem] font-medium tracking-[0.1em] text-sidebar-foreground uppercase">
          Menu
        </span>
        <button
          type="button"
          aria-label="Toggle dashboard menu"
          aria-expanded={open}
          aria-controls="dashboard-mobile-nav"
          onClick={() => setOpen((o) => !o)}
          className="flex cursor-pointer flex-col justify-center gap-[5px] border-0 bg-transparent p-1"
        >
          <span
            className={cn(
              'block h-px w-[22px] bg-sidebar-foreground transition-transform duration-300',
              open ? 'translate-y-[3.25px] rotate-45' : '',
            )}
          />
          <span
            className={cn(
              'block h-px w-[22px] bg-sidebar-foreground transition-transform duration-300',
              open ? '-translate-y-[3.25px] -rotate-45' : '',
            )}
          />
        </button>
      </div>

      <div
        id="dashboard-mobile-nav"
        aria-hidden={!open}
        className={cn(
          'fixed inset-0 z-overlay flex flex-col overflow-y-auto bg-sidebar px-6 py-8 md:hidden',
          'transition-[opacity,transform,visibility] duration-350',
          open
            ? 'visible translate-y-0 opacity-100'
            : 'invisible -translate-y-2 opacity-0',
        )}
      >
        <Identity name={name} role={user.role} avatarUrl={user.avatar_url} />
        <div className="mt-6">
          <NavLinks items={items} pathname={pathname} onNavigate={() => setOpen(false)} />
        </div>
      </div>
    </>
  )
}
