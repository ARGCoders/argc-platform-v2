import 'server-only'
import { SESSION_MAX_AGE, OAUTH_STATE_MAX_AGE } from './constants'

/**
 * Cookie options shared by every auth route, so `secure`, `sameSite` and the
 * max-age cannot drift between login, callback and refresh.
 *
 * `secure` is conditional: hard-coding it to true would silently break the
 * whole flow on http://localhost, since the browser drops the cookie.
 */
export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: SESSION_MAX_AGE,
} as const

export const oauthStateCookieOptions = {
  ...sessionCookieOptions,
  maxAge: OAUTH_STATE_MAX_AGE,
} as const
