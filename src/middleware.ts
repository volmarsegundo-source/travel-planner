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
 * Content-Security-Policy header. The nonce is forwarded to the layout via
 * the `x-nonce` request header so that inline scripts can include it.
 */
import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import authConfig from "./lib/auth.config";

const { auth } = NextAuth(authConfig);

const intlMiddleware = createMiddleware(routing);

// Routes that require an authenticated session.
const PROTECTED_PATH_SEGMENTS = ["/trips", "/onboarding", "/account", "/dashboard", "/expedition"] as const;

const isDev = process.env.NODE_ENV === "development";

function buildCsp(nonce: string): string {
  if (isDev) {
    // Development: allow eval for HMR/Turbopack and inline styles for dev tooling
    return [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' 'unsafe-eval'`,
      `style-src 'self' 'unsafe-inline'`,
      "img-src 'self' data: https:",
      "connect-src 'self' https: ws:",
      "font-src 'self'",
    ].join("; ");
  }

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'unsafe-inline'`,
    "img-src 'self' data: https:",
    "connect-src 'self' https:",
    "font-src 'self'",
  ].join("; ");
}

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

  // Run the intl middleware — its response carries rewrites/redirects for
  // locale routing (e.g. `/account` → internal `/pt-BR/account`).
  // We MUST return this response directly; creating a new NextResponse.next()
  // would discard the rewrite and cause a white screen for the default locale.
  const response = intlMiddleware(req);

  if (!response) {
    return NextResponse.next();
  }

  // Generate a per-request CSP nonce and set security headers
  const nonce = crypto.randomUUID();

  response.headers.set("Content-Security-Policy", buildCsp(nonce));
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  if (!isDev) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }

  return response;
});

export const config = {
  // Match all paths except Next.js internals and static files.
  matcher: ["/((?!_next|.*\\..*).*)"],
};
