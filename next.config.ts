import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  output: "standalone",
  // typedRoutes disabled: incompatible with next-intl's dynamic [locale] routing.
  // Migrate to next-intl createNavigation() for full type safety (post-MVP task).
  async headers() {
    const securityHeaders = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
      {
        key: "Content-Security-Policy",
        value:
          "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; script-src 'self' 'unsafe-eval' 'unsafe-inline'; connect-src 'self' https:;",
      },
    ];

    if (process.env.NODE_ENV === "production") {
      securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains",
      });
    }

    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
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
