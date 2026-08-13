import type { NextConfig } from 'next'

/**
 * PocketBase serves file fields (post banners, later event posters and
 * avatars) from `/api/files/...` on whatever host `NEXT_PUBLIC_POCKETBASE_URL`
 * points at — the production Railway instance or the local `make db` one.
 * Deriving the allow-list from the same env var keeps `next/image` working in
 * both, falling back to the production host when no env is present (CI builds
 * without a `.env`). Port, protocol and hostname come from the URL, so a local
 * `http://127.0.0.1:8090` needs no hand-written entry.
 */
function pocketBaseImagePatterns(): URL[] {
  const url = process.env.NEXT_PUBLIC_POCKETBASE_URL
  if (url) {
    try {
      return [new URL(`${url.replace(/\/+$/, '')}/api/files/**`)]
    } catch {
      // invalid env value — fall through to the production default
    }
  }
  return [new URL('https://pocketbase-production-59e1.up.railway.app/api/files/**')]
}

const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,
  },
  images: {
    remotePatterns: [
      // 42 Intra CDN — user profile photos
      new URL('https://cdn.intra.42.fr/**'),
      ...pocketBaseImagePatterns(),
    ],
  },
}

export default nextConfig
