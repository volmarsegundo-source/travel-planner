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

const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

export type PatchSessionTokenResult =
  | { ok: true }
  | { ok: false; reason: "no-secret" | "no-cookie" | "decode-failed" };

export async function patchSessionToken(
  patch: Record<string, unknown>
): Promise<PatchSessionTokenResult> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return { ok: false, reason: "no-secret" };

  const jar = await cookies();
  const current = jar.get(SESSION_COOKIE_NAME)?.value;
  if (!current) return { ok: false, reason: "no-cookie" };

  const payload = await decode<JWT>({
    token: current,
    secret,
    salt: SESSION_COOKIE_NAME,
  });
  if (!payload) return { ok: false, reason: "decode-failed" };

  const newToken = await encode<JWT>({
    token: { ...payload, ...patch } as JWT,
    secret,
    salt: SESSION_COOKIE_NAME,
    maxAge: SESSION_MAX_AGE,
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
