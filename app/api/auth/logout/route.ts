import { NextResponse } from 'next/server'
import {
  AUTH_COOKIE,
  ROLE_COOKIE,
  OAUTH_STATE_COOKIE,
  OAUTH_REDIRECT_COOKIE,
} from '@/lib/constants'

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({ success: true })
  response.cookies.delete(AUTH_COOKIE)
  response.cookies.delete(ROLE_COOKIE)
  response.cookies.delete(OAUTH_STATE_COOKIE)
  response.cookies.delete(OAUTH_REDIRECT_COOKIE)
  return response
}
