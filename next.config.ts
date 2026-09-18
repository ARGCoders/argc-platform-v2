import type { NextConfig } from 'next'

function pocketBaseFileImagePattern(): {
  protocol: 'http' | 'https'
  hostname: string
  pathname: string
} {
  // PocketBase serves file fields (post banners, event posters, avatars)
  // from `/api/files/...` on whatever host NEXT_PUBLIC_POCKETBASE_URL points
  // at — the production Railway instance, a `make db` local instance
  // (127.0.0.1), or a preview. Deriving protocol and hostname from the same
  // env var keeps `next/image` working in all three, falling back to the
  // production Railway host when no env is present (e.g. an env-free build).
  const url = process.env.NEXT_PUBLIC_POCKETBASE_URL
  if (url) {
    try {
      const parsed = new URL(url)
      return {
        protocol: parsed.protocol.replace(/:$/, '') as 'http' | 'https',
        hostname: parsed.hostname,
        pathname: '/api/files/**',
      }
    } catch {
      // Invalid env value — fall through to the production default.
    }
  }
  return {
    protocol: 'https',
    hostname: 'pocketbase-production-59e1.up.railway.app',
    pathname: '/api/files/**',
  }
}

const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,
  },
  images: {
    remotePatterns: [
      // 42 Intra CDN — user profile photos
      {
        protocol: 'https',
        hostname: 'cdn.intra.42.fr',
        pathname: '/**',
      },
      // PocketBase — banner images, event posters, avatars stored in PB
      pocketBaseFileImagePattern(),
    ],
  },
}

export default nextConfig
