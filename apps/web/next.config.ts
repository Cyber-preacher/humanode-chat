// apps/web/next.config.ts
import type { NextConfig } from "next";

const securityHeaders: Array<{ key: string; value: string }> = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  // Modern browsers ignore this old header, kept harmlessly for legacy:
  { key: "X-XSS-Protection", value: "0" },
  // Lock down powerful APIs by default. Expand as needed.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const prodHsts =
  process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : [];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [...securityHeaders, ...prodHsts],
      },
    ];
  },
};

export default nextConfig;
