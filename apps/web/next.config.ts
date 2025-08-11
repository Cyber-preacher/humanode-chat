// apps/web/next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
<<<<<<< HEAD
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },
  experimental: {
    typedRoutes: true,
  },
  webpack: (config) => {
    // ensure objects exist (TS-friendly)
    if (!config.resolve) config.resolve = {};
    if (!config.resolve.alias) config.resolve.alias = {};
    // Silence optional dependency resolution from walletconnect logger → pino-pretty
    // @ts-expect-error – just aliasing to false to avoid bundling
    (config.resolve.alias as Record<string, false | string>)['pino-pretty'] = false;
    return config;
  },
=======
    experimental: {
        typedRoutes: true,
    },
    webpack: (config) => {
        // Don�t try to bundle the CLI pretty-printer into the browser
        config.resolve = config.resolve || {};
        config.resolve.alias = {
            ...(config.resolve.alias || {}),
            'pino-pretty': false,
        };
        return config;
    },
>>>>>>> 28e73a6 (Refactor: bundle all refactoring PRs (#28))
};

export default nextConfig;
