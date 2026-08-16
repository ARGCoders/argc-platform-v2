import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  AUTHENTICATED_PREFIXES,
  NON_GUEST_PREFIXES,
  AUTH_ROUTES,
  AUTH_COOKIE,
  ROLE_COOKIE,
  ROLE_HOMES,
  DASHBOARD_GATES,
  roleAtLeast,
} from '@/lib/constants'
import type { Role } from '@/types/pocketbase'

/**
 * Route gating.
 *
 * `proxy.ts` with a named `proxy` export is the Next.js 16 convention — the
 * `middleware` filename and export were deprecated and renamed in v16.0.0.
 * The runtime is Node.js and cannot be configured; setting `runtime` in this
 * file throws.
 *
 * This is a coarse first pass only. It reads cookies, which a client controls,
 * so it can redirect but must never be the sole authorization control — every
 * API route re-checks the role server-side via `requireRole()` in lib/auth.ts.
 *
 * Note `req.cookies` is synchronous here, unlike `cookies()` from next/headers.
 */
export function proxy(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl
  const isAuthenticated = !!req.cookies.get(AUTH_COOKIE)?.value
  const role = req.cookies.get(ROLE_COOKIE)?.value as Role | undefined

  const needsAuth = AUTHENTICATED_PREFIXES.some((p) => pathname.startsWith(p))
  const needsNonGuest = NON_GUEST_PREFIXES.some((p) => pathname.startsWith(p))
  const isAuthRoute = AUTH_ROUTES.some((p) => pathname.startsWith(p))

  // Not logged in → send to the sign-in page, remembering where they wanted to go
  if ((needsAuth || needsNonGuest) && !isAuthenticated) {
    const loginUrl = new URL('/register', req.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Logged in but still a guest → no dashboard access
  if (needsNonGuest && isAuthenticated && role === 'guest') {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Role-aware dashboard routing (INFRA-03): a member is sent to their role's
  // home from the /dashboard root, and away from sections their role is too
  // low for. Coarse cookie checks — a client can forge them, so requireRole()
  // on every API route remains the real authorization boundary.
  if (isAuthenticated && role && role !== 'guest') {
    if (pathname === '/dashboard' || pathname === '/dashboard/') {
      return NextResponse.redirect(new URL(ROLE_HOMES[role], req.url))
    }

    for (const { prefix, minRole } of DASHBOARD_GATES) {
      if (pathname.startsWith(prefix) && !roleAtLeast(role, minRole)) {
        return NextResponse.redirect(new URL(ROLE_HOMES[role], req.url))
      }
    }
  }

  // Already a member → skip the registration page
  if (isAuthRoute && isAuthenticated && role && role !== 'guest') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
}

export const config = {
  // Exclude API routes, Next internals and static assets. Without a matcher
  // this runs on every request, including CSS, JS and images.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|txt)$).*)',
  ],
}
