import type { NextConfig } from "next";
import type { Configuration as WebpackConfig } from "webpack";

const nextConfig: NextConfig = {
    reactStrictMode: false,
    webpack: (config: WebpackConfig) => {
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