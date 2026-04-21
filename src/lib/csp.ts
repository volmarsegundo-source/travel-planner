/**
 * Content-Security-Policy helpers.
 *
 * Extracted from middleware.ts (Sprint 45 Wave 3 fix) to make the policy
 * testable in isolation and to fix the nonce-propagation bug where the
 * middleware generated a nonce but never forwarded it to downstream Server
 * Components, causing Next.js inline scripts to be blocked.
 *
 * See SPEC-SEC-CSP-NONCE-001 and docs/qa/google-oauth-dob-bug-2026-04-20.md §12.
 */

export interface CspContext {
  isDev: boolean;
  isPreview: boolean;
}

export function buildCsp(nonce: string, ctx: CspContext): string {
  if (ctx.isDev) {
    return [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' 'unsafe-eval'`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self' https: ws:",
      "font-src 'self'",
    ].join("; ");
  }

  // Vercel Live feedback widget — injected by Vercel's edge on preview
  // deployments. Listed as a host allowlist for legacy browsers that
  // don't support 'strict-dynamic' (CSP Level 2 fallback).
  const vercelLiveScript = ctx.isPreview ? " https://vercel.live" : "";
  const vercelLiveConnect = ctx.isPreview
    ? " https://vercel.live wss://ws-us3.pusher.com"
    : "";
  const vercelLiveFrame = ctx.isPreview ? " https://vercel.live" : "";

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${vercelLiveScript}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    `connect-src 'self' https:${vercelLiveConnect}`,
    "font-src 'self'",
    `frame-src 'self'${vercelLiveFrame}`,
  ].join("; ");
}

export function applySecurityHeaders(
  headers: Headers,
  csp: string,
  ctx: { isDev: boolean },
): void {
  headers.set("Content-Security-Policy", csp);
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  if (!ctx.isDev) {
    headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }
}

/**
 * Propagate `x-nonce` to the downstream request via Next.js's internal
 * `x-middleware-override-headers` convention — equivalent to calling
 * `NextResponse.next({ request: { headers } })` but works even when the
 * response was produced by another middleware (e.g. next-intl rewrite).
 *
 * See `packages/next/src/server/web/spec-extension/response.ts` in the
 * Next.js source for the spec of these sentinel headers.
 */
export function propagateNonceToRequest(headers: Headers, nonce: string): void {
  headers.set("x-middleware-request-x-nonce", nonce);
  const existing = headers.get("x-middleware-override-headers");
  const overrides = existing ? `${existing},x-nonce` : "x-nonce";
  headers.set("x-middleware-override-headers", overrides);
}
