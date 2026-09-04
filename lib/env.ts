import 'server-only'

function get(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

interface Env {
  // 42 Intra OAuth
  FORTYTWO_CLIENT_ID: string
  FORTYTWO_CLIENT_SECRET: string
  FORTYTWO_REDIRECT_URI: string

  // PocketBase
  POCKETBASE_URL: string
  POCKETBASE_ADMIN_EMAIL: string
  POCKETBASE_ADMIN_PASSWORD: string

  // App
  APP_URL: string
}

/**
 * One resolver per key, each reading only its own variable(s). Keeping these
 * separate (rather than one function building the whole object) is what
 * makes a single missing var — say, 42 OAuth not configured for a machine
 * only testing the public site — not block every unrelated key (`APP_URL`,
 * `POCKETBASE_URL`) from resolving too.
 */
const resolvers: { [K in keyof Env]: () => string } = {
  FORTYTWO_CLIENT_ID: () => get('NEXT_PUBLIC_42_CLIENT_ID'),
  FORTYTWO_CLIENT_SECRET: () => get('FORTYTWO_CLIENT_SECRET'),
  FORTYTWO_REDIRECT_URI: () => get('FORTYTWO_REDIRECT_URI'),
  POCKETBASE_URL: () => get('NEXT_PUBLIC_POCKETBASE_URL'),
  POCKETBASE_ADMIN_EMAIL: () => get('POCKETBASE_ADMIN_EMAIL'),
  POCKETBASE_ADMIN_PASSWORD: () => get('POCKETBASE_ADMIN_PASSWORD'),
  // Defaults to localhost:3000 in dev for convenience, but a production
  // deployment that never set this would otherwise have every self-fetch
  // (e.g. app/events/page.tsx -> /api/public/events) silently target an
  // unreachable localhost and fail with no indication why — fail loud
  // instead, matching every other key here.
  APP_URL: () => {
    const value = process.env.NEXT_PUBLIC_APP_URL
    if (value) return value
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Missing required environment variable: NEXT_PUBLIC_APP_URL')
    }
    return 'http://localhost:3000'
  },
}

// Lazily evaluated per key so a missing var only throws when that specific
// key is read, not whenever any key is read.
export const env = new Proxy({} as Env, {
  get(_target, prop: string) {
    return resolvers[prop as keyof Env]?.()
  },
})
