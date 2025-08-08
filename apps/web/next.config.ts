import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    reactStrictMode: false,
    webpack: (config: any) => {
        config.resolve = config.resolve || {};
        config.resolve.alias = {
            ...(config.resolve.alias || {}),
            "pino-pretty": false,
            lokijs: false,
            encoding: false,
        };
        return config;
    },
};

export default nextConfig;