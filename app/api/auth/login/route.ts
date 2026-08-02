import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getFortyTwoAuthUrl } from '@/lib/api/42-api'
import { oauthStateCookieOptions } from '@/lib/cookies'
import {
  OAUTH_STATE_COOKIE,
  OAUTH_REDIRECT_COOKIE,
  isSafeRedirect,
} from '@/lib/constants'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const state = crypto.randomUUID()
  const response = NextResponse.redirect(getFortyTwoAuthUrl(state))

  // Short-lived CSRF token, compared against the `state` 42 sends back.
  response.cookies.set(OAUTH_STATE_COOKIE, state, oauthStateCookieOptions)

  // Carry ?next across the OAuth round trip so the callback can return the
  // user where they started. Only relative paths — an absolute URL here would
  // turn the callback into an open redirect.
  const next = req.nextUrl.searchParams.get('next')
  if (next && isSafeRedirect(next)) {
    response.cookies.set(OAUTH_REDIRECT_COOKIE, next, oauthStateCookieOptions)
  }

  return response
}
