import 'server-only'
import { env } from '../env'

const INTRA_API = 'https://api.intra.42.fr'

export interface IntraUserData {
  intraId: string
  intraLogin: string
  email: string
  displayName: string
  avatarUrl: string
}

/** Shape of the fields we read from GET /v2/me. */
interface IntraMeResponse {
  id: number
  login: string
  email: string
  displayname?: string
  image?: {
    link?: string
    versions?: { large?: string }
  }
}

interface IntraTokenResponse {
  access_token: string
}

/** Builds the 42 Intra OAuth authorization URL. */
export function getFortyTwoAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.FORTYTWO_CLIENT_ID,
    redirect_uri: env.FORTYTWO_REDIRECT_URI,
    response_type: 'code',
    scope: 'public',
    state,
  })
  return `${INTRA_API}/oauth/authorize?${params.toString()}`
}

/**
 * Exchanges an authorization code for an access token.
 * The token is used once to read the profile and is never persisted.
 */
export async function exchangeCodeForToken(code: string): Promise<string> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: env.FORTYTWO_CLIENT_ID,
    client_secret: env.FORTYTWO_CLIENT_SECRET,
    code,
    redirect_uri: env.FORTYTWO_REDIRECT_URI,
  })

  const res = await fetch(`${INTRA_API}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    cache: 'no-store',
  })

  if (!res.ok) {
    // Body may contain the client_secret echoed back — log status only.
    throw new Error(`42 token exchange failed: ${res.status}`)
  }

  const data = (await res.json()) as IntraTokenResponse
  if (!data.access_token) throw new Error('42 token exchange returned no access_token')
  return data.access_token
}

/** Fetches the authenticated user's profile from 42 Intra. */
export async function fetchIntraUser(accessToken: string): Promise<IntraUserData> {
  const res = await fetch(`${INTRA_API}/v2/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })

  if (!res.ok) throw new Error(`Failed to fetch 42 user data: ${res.status}`)

  const data = (await res.json()) as IntraMeResponse

  return {
    intraId: String(data.id),
    intraLogin: data.login,
    email: data.email,
    displayName: data.displayname ?? data.login,
    avatarUrl: data.image?.versions?.large ?? data.image?.link ?? '',
  }
}
