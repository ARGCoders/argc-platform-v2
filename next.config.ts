import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,
  },
  images: {
    remotePatterns: [
      // 42 Intra CDN — user profile photos
      {
        protocol: "https",
        hostname: "cdn.intra.42.fr",
        pathname: "/**",
      },
      // PocketBase Railway instance — banner images, avatars stored in PB
      {
        protocol: "https",
        hostname: "pocketbase-production-59e1.up.railway.app",
        pathname: "/api/files/**",
      },
    ],
  },
};

export default nextConfig;
