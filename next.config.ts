import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
  // typedRoutes disabled: incompatible with next-intl's dynamic [locale] routing.
  // Migrate to next-intl createNavigation() for full type safety (post-MVP task).
  // Security headers (CSP, X-Frame-Options, etc.) are set dynamically in
  // middleware.ts with a per-request nonce — no static headers() needed here.
};

// Workaround: next-intl 3.x sets config.experimental.turbo when Turbopack is
// detected, but Next.js 15 moved that option to config.turbopack (top-level).
// Migrate the alias map here to suppress the deprecation warning.
const config = withNextIntl(nextConfig);
if (config.experimental?.turbo) {
  config.turbopack = {
    ...config.turbopack,
    resolveAlias: {
      ...(config.turbopack as { resolveAlias?: Record<string, string> })
        ?.resolveAlias,
      ...config.experimental.turbo.resolveAlias,
    },
  };
  delete config.experimental.turbo;
}

export default config;
