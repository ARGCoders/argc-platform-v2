import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { exchangeCodeForToken, fetchIntraUser } from '@/lib/api/42-api'
import { getAdminClient, getPocketBaseClient } from '@/lib/pocketbase-server'
import { sessionCookieOptions } from '@/lib/cookies'
import { env } from '@/lib/env'
import {
  AUTH_COOKIE,
  ROLE_COOKIE,
  OAUTH_STATE_COOKIE,
  OAUTH_REDIRECT_COOKIE,
  isSafeRedirect,
} from '@/lib/constants'
import { DEFAULT_ROLE, type Role, type UserRecord } from '@/types/pocketbase'

function redirect(path: string, error?: string): NextResponse {
  const url = new URL(path, env.APP_URL)
  if (error) url.searchParams.set('error', error)
  return NextResponse.redirect(url.toString())
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const storedState = req.cookies.get(OAUTH_STATE_COOKIE)?.value

  // ── CSRF: the state we issued must come back unchanged ───────────────────
  if (!code || !state || !storedState || state !== storedState) {
    return redirect('/register', 'invalid_state')
  }

  try {
    const accessToken = await exchangeCodeForToken(code)
    const intraUser = await fetchIntraUser(accessToken)
    // The 42 access token has served its purpose and is discarded here.

    const admin = await getAdminClient()

    // ── Find the existing account, if any ──────────────────────────────────
    // pb.filter() parameterizes the value; interpolating it directly would let
    // a login containing a quote alter the filter expression.
    let existingUser: UserRecord | null = null
    try {
      existingUser = await admin
        .collection('users')
        .getFirstListItem<UserRecord>(
          admin.filter('intra_login = {:login}', { login: intraUser.intraLogin }),
        )
    } catch {
      // Not found — fall through to create.
    }

    // The password is rotated on every login and never shown to the user; it
    // exists only so the server can mint a PocketBase session below.
    const password = crypto.randomUUID()
    let userId: string
    let userRole: Role = DEFAULT_ROLE

    if (existingUser) {
      // Returning user — refresh the profile, but never touch `role`.
      userRole = existingUser.role ?? DEFAULT_ROLE
      await admin.collection('users').update(existingUser.id, {
        email: intraUser.email,
        password,
        passwordConfirm: password,
        display_name: intraUser.displayName,
        avatar_url: intraUser.avatarUrl,
        intra_id: intraUser.intraId,
        last_sync_at: new Date().toISOString(),
      })
      userId = existingUser.id
    } else {
      const created = await admin.collection('users').create<UserRecord>({
        email: intraUser.email,
        password,
        passwordConfirm: password,
        emailVisibility: false,
        verified: true,
        intra_id: intraUser.intraId,
        intra_login: intraUser.intraLogin,
        display_name: intraUser.displayName,
        avatar_url: intraUser.avatarUrl,
        role: DEFAULT_ROLE,
        last_sync_at: new Date().toISOString(),
      })
      userId = created.id
    }

    // ── Mint the PocketBase session ────────────────────────────────────────
    const pb = getPocketBaseClient()
    await pb.collection('users').authWithPassword(intraUser.email, password)
    if (pb.authStore.record?.id !== userId) {
      throw new Error('authenticated record does not match the resolved user')
    }

    // ── Decide where to land ───────────────────────────────────────────────
    const requested = req.cookies.get(OAUTH_REDIRECT_COOKIE)?.value
    const fallback = userRole === 'guest' ? '/' : '/dashboard'
    const destination = requested && isSafeRedirect(requested) ? requested : fallback

    const response = redirect(destination)
    response.cookies.set(AUTH_COOKIE, pb.authStore.token, sessionCookieOptions)
    // pb_role lets proxy.ts gate routes without a database round trip.
    response.cookies.set(ROLE_COOKIE, userRole, sessionCookieOptions)
    response.cookies.delete(OAUTH_STATE_COOKIE)
    response.cookies.delete(OAUTH_REDIRECT_COOKIE)

    return response
  } catch (err) {
    console.error('[auth/callback] error:', err)
    return redirect('/register', 'server_error')
  }
}
