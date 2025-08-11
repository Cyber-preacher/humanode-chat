import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Keep useful Next 15+ goodies
  experimental: {
    typedRoutes: true,
    // Safe perf win for big libs we use
    optimizePackageImports: ['viem', 'wagmi', '@tanstack/react-query'],
  },

  // Ensure these get transpiled correctly for the app router
  transpilePackages: ['@rainbow-me/rainbowkit', 'wagmi', 'viem'],

  // If CI ever complains about lint at build time, we can toggle this:
  // eslint: { ignoreDuringBuilds: true },
  // typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
