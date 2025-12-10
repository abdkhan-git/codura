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
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
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
  // Optimize package imports
  experimental: {
    optimizePackageImports: ['recharts', 'lucide-react'],
  },
  // Tell Next.js to not bundle these packages
  serverComponentsExternalPackages: ['livekit-server-sdk'],
  // Explicitly opt into Turbopack to avoid mixed webpack/turbo warnings on Next 16
  turbopack: {},
};

export default nextConfig;
