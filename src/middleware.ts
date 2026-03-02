/**
 * Next.js Edge middleware.
 *
 * Uses NextAuth(authConfig) — NOT the full auth from auth.ts — to keep the
 * Edge bundle free of Prisma and ioredis (both Node.js-only).
 *
 * The JWT session cookie is validated here without any database access.
 * Protected routes redirect unauthenticated users to /auth/login.
 */
import NextAuth from "next-auth";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import authConfig from "./lib/auth.config";

const { auth } = NextAuth(authConfig);

const intlMiddleware = createMiddleware(routing);

// Routes that require an authenticated session.
const PROTECTED_PATH_SEGMENTS = ["/trips", "/onboarding", "/account", "/dashboard"] as const;

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

  return intlMiddleware(req);
});

export const config = {
  // Match all paths except Next.js internals and static files.
  matcher: ["/((?!_next|.*\\..*).*)"],
};
