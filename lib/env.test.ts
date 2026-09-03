import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { env } from './env'

const KEYS = [
  'NEXT_PUBLIC_42_CLIENT_ID',
  'FORTYTWO_CLIENT_SECRET',
  'FORTYTWO_REDIRECT_URI',
  'NEXT_PUBLIC_POCKETBASE_URL',
  'POCKETBASE_ADMIN_EMAIL',
  'POCKETBASE_ADMIN_PASSWORD',
  'NEXT_PUBLIC_APP_URL',
] as const

let saved: Record<string, string | undefined>

beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]))
  for (const k of KEYS) delete process.env[k]
})

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k]
    else process.env[k] = saved[k]
  }
})

describe('env', () => {
  // Regression: env.ts previously built every key on any access, so reading
  // one variable required every OTHER variable to be set too — a machine
  // testing only the public site (no 42 OAuth configured) got "Missing
  // required environment variable: NEXT_PUBLIC_42_CLIENT_ID" from a page
  // that never touches OAuth at all.
  it('resolves one key without requiring unrelated keys to be set', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:4000'
    expect(env.APP_URL).toBe('http://localhost:4000')
  })

  it('throws only for the specific missing key that was read', () => {
    process.env.NEXT_PUBLIC_POCKETBASE_URL = 'http://pb.test'

    expect(() => env.FORTYTWO_CLIENT_ID).toThrow(
      'Missing required environment variable: NEXT_PUBLIC_42_CLIENT_ID',
    )
    expect(env.POCKETBASE_URL).toBe('http://pb.test')
  })

  it('defaults APP_URL to localhost:3000 when unset', () => {
    expect(env.APP_URL).toBe('http://localhost:3000')
  })
})
