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
import { logger } from "./lib/logger";
import {
  buildCsp,
  applySecurityHeaders,
  propagateNonceToRequest,
} from "./lib/csp";

// BUG-C-F3 iteração 3: name of the cookie middleware should see after the
// helper rewrites it. Used only by the diagnostic log below.
const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

const { auth } = NextAuth(authConfig);

const intlMiddleware = createMiddleware(routing);

// Routes that require an authenticated session.
const PROTECTED_PATH_SEGMENTS = ["/trips", "/onboarding", "/account", "/dashboard", "/expedition", "/atlas", "/meu-atlas", "/admin"] as const;

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

  // SPEC-AUTH-AGE-002: OAuth users without DOB are routed to the DOB
  // collection page. Credentials users always set profileComplete=true at
  // signup (SPEC-AUTH-AGE-001) so this only affects Google / Apple sign-ins.
  if (req.auth) {
    const session = req.auth as {
      user?: { id?: string; profileComplete?: boolean };
    };
    const profileComplete = session?.user?.profileComplete;
    const isOnboardingRoute =
      pathname.includes("/auth/complete-profile") ||
      pathname.includes("/auth/age-rejected");

    if (isProtected && profileComplete === false && !isOnboardingRoute) {
      // BUG-C-F3 iteração 3 diagnostic: capture exactly what the middleware
      // sees in the request when it decides to redirect back to the DOB
      // collection page. Comparing this against auth.patchCookie.debug from
      // the prior commit will reveal whether (H1a) middleware caches stale
      // JWT, (H1b) jar.set() did not commit to the response, or (H1c)
      // something overwrites the cookie before the next request.
      const cookieValue = req.cookies.get(SESSION_COOKIE_NAME)?.value;
      // BUG-C-F3 iteração 4: extract the JWE IV from the cookie and read
      // the raw Cookie header to detect (a) whether this is the same
      // ciphertext the helper just wrote — IV match proves it — and (b)
      // whether duplicate `authjs.session-token*` entries exist at the
      // HTTP layer (chunk variants the Next.js cookie parser would silently
      // dedupe, hiding chunk contamination from req.cookies.get).
      const cookieIv = cookieValue ? (cookieValue.split(".")[2] ?? null) : null;
      const rawCookieHeader = req.headers.get("cookie") ?? "";
      const rawAuthjsCookies = rawCookieHeader
        .split(";")
        .map((c) => c.trim())
        .filter((c) => c.includes("authjs.session-token"))
        .map((c) => {
          const eq = c.indexOf("=");
          return eq === -1
            ? { name: c, valueLength: 0 }
            : { name: c.slice(0, eq), valueLength: c.length - eq - 1 };
        });

      logger.info("auth.middleware.redirectToCompleteProfile", {
        path: pathname,
        cookieName: SESSION_COOKIE_NAME,
        hasCookie: !!cookieValue,
        cookieLength: cookieValue?.length,
        cookieIv,
        rawAuthjsCookies,
        profileCompleteFromJwt: profileComplete,
        tokenSub: session?.user?.id,
      });

      const url = new URL("/auth/complete-profile", req.url);
      url.searchParams.set("callbackUrl", pathname);
      return Response.redirect(url);
    }
  }

  // Admin routes: require role === "admin" in JWT token.
  // Non-admin users are redirected to /expeditions.
  if (pathname.includes("/admin") && req.auth) {
    const session = req.auth as { user?: { role?: string } };
    const role = session?.user?.role ?? "user";
    if (role !== "admin") {
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
    // so `x-nonce` reaches downstream handlers.
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-nonce", nonce);

    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    applySecurityHeaders(response.headers, csp, { isDev });
    return response;
  }

  // intl returned a rewrite/redirect. NextResponse.next({ request }) is not
  // applicable here, so manually propagate `x-nonce` via the same sentinel
  // headers that Next.js uses internally.
  propagateNonceToRequest(intlResponse.headers, nonce);
  applySecurityHeaders(intlResponse.headers, csp, { isDev });
  return intlResponse;
});

export const config = {
  // Match all paths except Next.js internals and static files.
  matcher: ["/((?!_next|.*\\..*).*)"],
};
