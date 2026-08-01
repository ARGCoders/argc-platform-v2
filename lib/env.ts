import 'server-only'

function get(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

function getEnv() {
  return {
    // 42 Intra OAuth
    FORTYTWO_CLIENT_ID: get('NEXT_PUBLIC_42_CLIENT_ID'),
    FORTYTWO_CLIENT_SECRET: get('FORTYTWO_CLIENT_SECRET'),
    FORTYTWO_REDIRECT_URI: get('FORTYTWO_REDIRECT_URI'),

    // PocketBase
    POCKETBASE_URL: get('NEXT_PUBLIC_POCKETBASE_URL'),
    POCKETBASE_ADMIN_EMAIL: get('POCKETBASE_ADMIN_EMAIL'),
    POCKETBASE_ADMIN_PASSWORD: get('POCKETBASE_ADMIN_PASSWORD'),

    // App
    APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  }
}

type Env = ReturnType<typeof getEnv>

// Lazily evaluated so missing vars only throw at request time, not at build time.
export const env = new Proxy({} as Env, {
  get(_target, prop: string) {
    return getEnv()[prop as keyof Env]
  },
})
