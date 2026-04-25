/**
 * Next.js Edge middleware.
 *
 * Uses NextAuth(authConfig) — NOT the full auth from auth.ts — to keep the
 * Edge bundle free of Prisma and ioredis (both Node.js-only).
 *
 * The JWT session cookie is validated here without any database access.
 * Protected routes redirect unauthenticated users to /auth/login.
 *
 * CSP nonce: a random nonce is generated per request and injected into the
 * Content-Security-Policy header AND forwarded to Server Components via the
 * `x-nonce` request header so Next.js can apply it to framework-generated
 * inline scripts. See `src/lib/csp.ts` and SPEC-SEC-CSP-NONCE-001.
 */
import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import authConfig from "./lib/auth.config";
import { decideAdminAccess } from "./lib/auth/rbac";
import {
  buildCsp,
  applySecurityHeaders,
  propagateNonceToRequest,
} from "./lib/csp";

const { auth } = NextAuth(authConfig);

const intlMiddleware = createMiddleware(routing);

// Routes that require an authenticated session.
// D-01 (Sprint 46 Day 3): "/expeditions" added explicitly. Per Iter 7 security
// audit F-01: "/expedition" matched both /expedition AND /expeditions via
// substring includes(), but the audit recommended an explicit entry to make
// intent visible and surface any future routing changes loudly.
const PROTECTED_PATH_SEGMENTS = ["/trips", "/onboarding", "/account", "/dashboard", "/expedition", "/expeditions", "/atlas", "/meu-atlas", "/admin"] as const;

const isDev = process.env.NODE_ENV === "development";
const isPreview = process.env.VERCEL_ENV === "preview";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // API routes are handled independently — skip both intl and auth redirects.
  if (pathname.startsWith("/api")) return;

  // Server Actions send POST with Next-Action header.  Applying intl rewrites
  // to these requests causes them to hang indefinitely (known Next.js issue).
  // See: https://github.com/vercel/next.js/issues/84504
  if (req.method === "POST" && req.headers.get("next-action")) return;

  // Redirect unauthenticated users away from protected paths.
  const isProtected = PROTECTED_PATH_SEGMENTS.some((segment) =>
    pathname.includes(segment)
  );

  if (isProtected && !req.auth) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(loginUrl);
  }

  // SPEC-AUTH-AGE-002 v2.0.0 (BUG-C-F3 iteração 7, B4-Node-gate):
  // age-gate enforcement moved out of Edge middleware into
  // src/app/[locale]/(app)/layout.tsx, which derives the gate from
  // UserProfile.birthDate (single source of truth in the DB). This
  // eliminates the Auth.js v5-beta cookie-rotation race that caused
  // BUG-C-F3 iterations 1-6 to fail on Staging. Diagnostic helpers from
  // iterações 3-4 are removed in this commit; the absence of the
  // auth.middleware.redirectToCompleteProfile event in Staging logs
  // is itself the success signal.

  // Admin routes RBAC — delegated to the pure `decideAdminAccess` helper
  // (`src/lib/auth/rbac.ts`). The helper is unit-testable independently of
  // the NextAuth `auth()` HOF wrapper that surrounds this middleware,
  // closing the test gap raised by the 4-agent batch-review synthesis
  // (P1, B47-MW-PURE-FN, Sprint 46). The same helper is invoked from the
  // admin layout (`src/app/[locale]/(app)/admin/layout.tsx`) so middleware
  // and layout cannot drift.
  if (pathname.includes("/admin") && req.auth) {
    const session = req.auth as { user?: { role?: string } };
    const role = session?.user?.role ?? "user";
    if (decideAdminAccess(pathname, role) === "deny") {
      const expeditionsUrl = new URL("/expeditions", req.url);
      return Response.redirect(expeditionsUrl);
    }
  }

  // Generate a per-request CSP nonce up-front so it can be (a) applied to the
  // outgoing CSP response header and (b) propagated to the downstream request
  // so Server Components can read it via `headers().get('x-nonce')` and
  // Next.js can stamp framework-generated inline scripts.
  const nonce = crypto.randomUUID();
  const csp = buildCsp(nonce, { isDev, isPreview });

  // Run next-intl's middleware — it may rewrite/redirect for locale routing.
  const intlResponse = intlMiddleware(req);

  if (!intlResponse) {
    // No rewrite/redirect: use NextResponse.next with enriched request headers
    // so `x-nonce` and `x-pathname` reach downstream handlers. The layout
    // gate at src/app/[locale]/(app)/layout.tsx reads `x-pathname` to
    // preserve the user's original path in the age-gate callbackUrl
    // (SPEC-AUTH-AGE-002 v2.0.2, Iter 8).
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("x-pathname", pathname);

    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    applySecurityHeaders(response.headers, csp, { isDev });
    return response;
  }

  // intl returned a rewrite/redirect. NextResponse.next({ request }) is not
  // applicable here, so manually propagate `x-nonce` + `x-pathname` via the
  // same sentinel headers that Next.js uses internally.
  propagateNonceToRequest(intlResponse.headers, nonce);
  intlResponse.headers.set("x-middleware-request-x-pathname", pathname);
  applySecurityHeaders(intlResponse.headers, csp, { isDev });
  return intlResponse;
});

export const config = {
  // Match all paths except Next.js internals and static files.
  matcher: ["/((?!_next|.*\\..*).*)"],
};
