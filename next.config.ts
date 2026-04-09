import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from 'next-intl/plugin';
import withBundleAnalyzer from '@next/bundle-analyzer';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const withAnalyze = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false,
});

const nextConfig: NextConfig = {
  output: "standalone",
  eslint: {
    // Skip ESLint during Next.js build — it runs separately in CI.
    // The atlas-design/no-raw-tailwind-colors rule warns on V1 files
    // that will be migrated in Sprint 40+.
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
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

export default withSentryConfig(withAnalyze(config), {
  org: "atlas-travel",
  project: "atlas-web",
  silent: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  widenClientFileUpload: true,
  disableLogger: true,
  automaticVercelMonitors: true,
});
