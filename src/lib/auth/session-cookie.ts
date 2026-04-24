/**
 * Server-side helper to patch the Auth.js session JWT cookie directly.
 *
 * ⚠️ STATUS (SPEC-AUTH-AGE-002 v2.0.0, BUG-C-F3 iteração 7):
 * This helper is now a **UX hint only**, NOT a security boundary.
 *
 *   - Authorization for the age gate is enforced in
 *     `src/app/[locale]/(app)/layout.tsx`, derived from
 *     `UserProfile.birthDate` in the database.
 *   - This helper still updates `session.user.profileComplete` for client
 *     components that want to render UI hints (e.g. "complete your
 *     profile" CTAs). Failure here is non-fatal: the next request will
 *     still pass through the layout's DB-derived gate.
 *
 * Background (BUG-C-F3 iterations 1-6): next-auth@5.0.0-beta.30
 * `unstable_update` silently no-ops inside Next.js 15 Server Actions
 * (root cause in @auth/core/lib/actions/session.js L18-20). Iteration 5
 * proved that even the direct cookie patch loses a race with Auth.js's
 * own session rotation triggered by every middleware-pass on the
 * Server Action POST request — so the cookie cannot be the source of
 * truth for security decisions. See SPEC-AUTH-AGE-002 §8.1-8.2 for the
 * full evidence chain.
 *
 * Implementation note: uses the public `encode`/`decode` from
 * `next-auth/jwt` so that any cookie this helper writes can still be
 * decoded by Auth.js on subsequent reads.
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
