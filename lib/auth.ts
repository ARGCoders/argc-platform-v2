import 'server-only'
import { cookies } from 'next/headers'
import { getPocketBaseClient, getAdminClient } from './pocketbase-server'
import { AUTH_COOKIE, roleAtLeast } from './constants'
import type { UserRecord, Role } from '@/types/pocketbase'

export interface AuthResult {
  user: UserRecord
  token: string
}

/**
 * Auth failure with the HTTP status it should map to.
 *
 * V1 collapsed every failure to 401 and returned the raw error message to the
 * client, so an expired session and a permission denial were indistinguishable
 * and internal PocketBase errors leaked into responses. `status` and `message`
 * here are both safe to send.
 */
export class AuthError extends Error {
  readonly status: 401 | 403

  constructor(status: 401 | 403, message: string) {
    super(message)
    this.name = 'AuthError'
    this.status = status
  }
}

/**
 * Authenticate the current request from the `pb_auth` cookie.
 *
 * The token is validated by refreshing it as the user, then the authoritative
 * record is re-read with the admin client — the user-scoped read is subject to
 * collection API rules and cannot be trusted for the `role` field.
 *
 * @throws {AuthError} 401 when there is no cookie or the session is invalid.
 */
export async function authenticate(): Promise<AuthResult> {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_COOKIE)?.value
  if (!token) throw new AuthError(401, 'Not authenticated')

  const pb = getPocketBaseClient()
  pb.authStore.save(token, null)

  try {
    await pb.collection('users').authRefresh()
  } catch {
    throw new AuthError(401, 'Session expired')
  }

  const userId = pb.authStore.record?.id
  if (!userId) throw new AuthError(401, 'Not authenticated')

  const admin = await getAdminClient()
  const user = await admin.collection('users').getOne<UserRecord>(userId)

  return { user, token }
}

/**
 * Authenticate and require at least `minRole` on the role hierarchy.
 *
 * @throws {AuthError} 401 when unauthenticated, 403 when the role is too low.
 */
export async function requireRole(minRole: Role): Promise<AuthResult> {
  const result = await authenticate()
  if (!roleAtLeast(result.user.role, minRole)) {
    throw new AuthError(403, 'Insufficient permissions')
  }
  return result
}

/** Gate for admin reads and most admin mutations. */
export function requireSuperPeer(): Promise<AuthResult> {
  return requireRole('super_peer')
}

/** Gate for destructive or irreversible operations: cycles, role changes, XP. */
export function requireSuperAdminPeer(): Promise<AuthResult> {
  return requireRole('super_admin_peer')
}

/**
 * Maps a thrown value to the status and client-safe message an API route should
 * respond with. Anything that is not an AuthError becomes an opaque 500 so
 * internal failures never reach the client.
 */
export function authErrorResponse(err: unknown): { status: number; error: string } {
  if (err instanceof AuthError) return { status: err.status, error: err.message }
  console.error('[auth] unexpected error:', err)
  return { status: 500, error: 'Server error' }
}
