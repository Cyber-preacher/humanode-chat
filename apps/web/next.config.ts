// apps/web/next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    experimental: {
        typedRoutes: true,
    },
    webpack: (config) => {
        // Don’t try to bundle the CLI pretty-printer into the browser
        config.resolve = config.resolve || {};
        config.resolve.alias = {
            ...(config.resolve.alias || {}),
            'pino-pretty': false,
        };
        return config;
    },
};

export default nextConfig;
