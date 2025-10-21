import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'prxtkrteujbptauwhnxs.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  // Turbopack handles tree-shaking automatically - don't override it!
  reactStrictMode: true,
  typescript: {
    // Temporarily ignore type errors during build (lucide-react TS cache issue)
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignore eslint during builds
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;