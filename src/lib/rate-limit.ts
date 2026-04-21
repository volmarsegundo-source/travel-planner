import "server-only";
import { redis } from "@/server/cache/redis";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Options for checkRateLimit.
 *
 * `failClosed: true` — when Redis is unavailable, deny the request (defensive).
 *   Use for security-sensitive routes: auth (login/register/password-reset),
 *   payment, admin-export, governance policies. Gated behind the
 *   RATE_LIMIT_FAIL_CLOSED_ENABLED env flag so the team can roll out
 *   gradually; while the flag is off, requests fall back to fail-open.
 *
 * Unset / `failClosed: false` — Redis failures allow the request through
 *   (permissive). Default for all non-sensitive routes.
 *
 * See SPEC-SEC-RATE-LIMIT-FAIL-CLOSED-001.
 */
export interface CheckRateLimitOptions {
  failClosed?: boolean;
}

// Atomic Lua script: INCR + conditional EXPIRE in a single round-trip.
// Eliminates the race condition where INCR succeeds but EXPIRE fails,
// which would leave a key without a TTL (memory leak + permanent block).
const RATE_LIMIT_LUA = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return count
`;

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
  options?: CheckRateLimitOptions
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowKey = `ratelimit:${key}:${Math.floor(now / (windowSeconds * 1000))}`;
  try {
    const count = (await redis.eval(
      RATE_LIMIT_LUA,
      1,
      windowKey,
      windowSeconds
    )) as number;
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetAt: Math.ceil(now / (windowSeconds * 1000)) * windowSeconds * 1000,
    };
  } catch (err) {
    // SPEC-SEC-RATE-LIMIT-FAIL-CLOSED-001: sensitive routes opt-in to deny
    // requests when Redis is unreachable. Gated by env flag for gradual rollout.
    if (options?.failClosed && env.RATE_LIMIT_FAIL_CLOSED_ENABLED) {
      logger.error("rate-limit.redis.unavailable.failClosed", err, { key });
      return {
        allowed: false,
        remaining: 0,
        resetAt: now + windowSeconds * 1000,
      };
    }
    // If Redis is unavailable, allow the request through rather than blocking
    // users. This preserves UX for non-sensitive routes and remains the
    // default for sensitive routes until the env flag is flipped.
    logger.warn("rate-limit.redis.unavailable.failOpen", { key });
    return { allowed: true, remaining: limit, resetAt: now + windowSeconds * 1000 };
  }
}
