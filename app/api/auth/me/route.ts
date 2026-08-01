import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getPocketBaseClient, getAdminClient } from '@/lib/pocketbase-server'
import { sessionCookieOptions } from '@/lib/cookies'
import { AUTH_COOKIE, ROLE_COOKIE } from '@/lib/constants'
import type { UserRecord } from '@/types/pocketbase'

/**
 * Session check. The AuthProvider calls this once on mount, and it doubles as
 * the mechanism that keeps both auth cookies current (C6).
 *
 * Both cookies must be re-set on every call:
 *  - pb_auth, so the rolling 14-day session does not expire under an active user
 *  - pb_role, so a role changed in PocketBase reaches proxy.ts without forcing
 *    the user to log out and back in
 *
 * Never cached — it reads a cookie and issues Set-Cookie.
 */
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.cookies.get(AUTH_COOKIE)?.value
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const pb = getPocketBaseClient()
    pb.authStore.save(token, null)
    await pb.collection('users').authRefresh()

    const userId = pb.authStore.record?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Re-read as admin: the user-scoped record is subject to collection API
    // rules and is not authoritative for `role`.
    const admin = await getAdminClient()
    const user = await admin.collection('users').getOne<UserRecord>(userId)

    const freshToken = pb.authStore.token
    const response = NextResponse.json({ user, token: freshToken })

    response.cookies.set(AUTH_COOKIE, freshToken, sessionCookieOptions)
    response.cookies.set(ROLE_COOKIE, user.role, sessionCookieOptions)

    return response
  } catch {
    // Invalid or expired token — clear the cookies so the client stops retrying
    // with credentials that will never work again.
    const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    response.cookies.delete(AUTH_COOKIE)
    response.cookies.delete(ROLE_COOKIE)
    return response
  }
}
