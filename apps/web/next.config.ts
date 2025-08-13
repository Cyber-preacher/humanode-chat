// apps/web/next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },
  experimental: { typedRoutes: true },
  webpack: (config) => {
    // silence optional dependency resolution for walletconnect's pino-pretty
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'pino-pretty': false,
    } as Record<string, false | string>;
    return config;
  },
};

export default nextConfig;
