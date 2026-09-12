import 'server-only'
import { cookies } from 'next/headers'
import { AUTH_COOKIE } from './constants'
import { env } from './env'

/**
 * Fetches one of this app's own `/api/dashboard/*` routes from a Server
 * Component. A server-to-server `fetch()` does not carry the browser's
 * cookies automatically — this forwards the caller's session cookie
 * explicitly, so the internal request authenticates as the same user.
 *
 * Per DASHBOARD_CONTRACT §5 ("pages consume the same /api/... routes the UI
 * calls — a page never queries PocketBase itself"), every dashboard page
 * needs this exact mechanism, so it lives here once rather than once per
 * page. Returns the raw `Response` rather than throwing or parsing JSON —
 * callers decide their own tolerance (e.g. a 404 that means "not in a node
 * yet" is a legitimate state for one caller and a real failure for another).
 */
export async function fetchDashboardApi(path: string): Promise<Response> {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_COOKIE)?.value

  return fetch(`${env.APP_URL}${path}`, {
    headers: token ? { Cookie: `${AUTH_COOKIE}=${token}` } : {},
    cache: 'no-store',
  })
}
