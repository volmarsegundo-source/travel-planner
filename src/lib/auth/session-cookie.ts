/**
 * Server-side helper to patch the Auth.js session JWT cookie directly.
 *
 * Background (BUG-C-F3): next-auth@5.0.0-beta.30 `unstable_update` silently
 * no-ops inside Next.js 15 Server Actions because the synthetic Request built
 * in next-auth/lib/actions.js can't reconstruct `sessionStore.value` from the
 * Cookie header → @auth/core session handler early-returns with empty cookies.
 *
 * Upstream tracking: nextauthjs/next-auth#11694, #13205, #13173, #7342.
 *
 * This helper uses the public `encode`/`decode` from `next-auth/jwt` to merge
 * patches into the existing JWT payload and rewrite the cookie in-place.
 */
import "server-only";
import { cookies } from "next/headers";
import { encode, decode } from "next-auth/jwt";
import type { JWT } from "next-auth/jwt";
import { logger } from "@/lib/logger";

const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

export type PatchSessionTokenResult =
  | { ok: true }
  | { ok: false; reason: "no-secret" | "no-cookie" | "decode-failed" };

function parseJweHeader(token: string): Record<string, unknown> | null {
  try {
    const headerB64 = token.split(".")[0];
    if (!headerB64) return null;
    return JSON.parse(Buffer.from(headerB64, "base64url").toString()) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}

export async function patchSessionToken(
  patch: Record<string, unknown>
): Promise<PatchSessionTokenResult> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return { ok: false, reason: "no-secret" };

  const jar = await cookies();
  const current = jar.get(SESSION_COOKIE_NAME)?.value;

  // BUG-C-F3 Iteration 2 diagnostic: enumerate all session-token-prefixed
  // cookies to detect chunk contamination (`.0`, `.1` variants left over
  // from a previous chunked write that our unchunked rewrite would NOT
  // clean up — SessionStore in middleware would then join the new cookie
  // with stale chunks and produce garbage on decode).
  const sessionCookieNames = jar
    .getAll()
    .map((c) => c.name)
    .filter((n) => n.startsWith(SESSION_COOKIE_NAME));

  if (!current) {
    logger.info("auth.patchCookie.debug", {
      phase: "no-cookie",
      cookieName: SESSION_COOKIE_NAME,
      sessionCookieNames,
    });
    return { ok: false, reason: "no-cookie" };
  }

  const currentHeader = parseJweHeader(current);

  const payload = await decode<JWT>({
    token: current,
    secret,
    salt: SESSION_COOKIE_NAME,
  });
  if (!payload) {
    logger.info("auth.patchCookie.debug", {
      phase: "decode-failed",
      cookieName: SESSION_COOKIE_NAME,
      sessionCookieNames,
      currentLength: current.length,
      currentHeader,
    });
    return { ok: false, reason: "decode-failed" };
  }

  const merged = { ...payload, ...patch } as JWT;
  const newToken = await encode<JWT>({
    token: merged,
    secret,
    salt: SESSION_COOKIE_NAME,
    maxAge: SESSION_MAX_AGE,
  });
  const newHeader = parseJweHeader(newToken);

  // BUG-C-F3 iteração 4: capture the JWE Initialization Vector (3rd segment
  // of the compact serialization) AND the IV of the cookie we just decoded.
  // Pairing helper IV with middleware IV on the next request answers the
  // central question: did our rewrite reach the browser, or did something
  // revert it? The IV is unique per encrypt() call so it is a perfect
  // identity fingerprint without leaking secrets.
  const currentIv = current.split(".")[2] ?? null;
  const newTokenIv = newToken.split(".")[2] ?? null;

  logger.info("auth.patchCookie.debug", {
    phase: "encoded",
    cookieName: SESSION_COOKIE_NAME,
    sessionCookieNames,
    secureFlag: process.env.NODE_ENV === "production",
    currentLength: current.length,
    currentHeader,
    currentIv,
    payloadKeys: Object.keys(payload),
    payloadProfileCompleteBefore:
      (payload as { profileComplete?: unknown }).profileComplete ?? null,
    patchKeys: Object.keys(patch),
    mergedProfileCompleteAfter:
      (merged as { profileComplete?: unknown }).profileComplete ?? null,
    newTokenLength: newToken.length,
    newHeader,
    newTokenIv,
  });

  jar.set(SESSION_COOKIE_NAME, newToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE,
  });

  return { ok: true };
}
