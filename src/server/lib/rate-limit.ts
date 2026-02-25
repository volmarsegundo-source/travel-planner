import "server-only";
import { redis } from "@/server/cache/client";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Sliding window counter using Redis INCR + EXPIRE.
 *
 * On the first call within a window (INCR returns 1) the key TTL is set to
 * `windowSeconds`.  Subsequent calls within the same window increment the
 * counter without touching the TTL, so the window does NOT reset on each
 * request — only on the first one.
 *
 * @param key           Redis key (should be namespaced, e.g. CacheKeys.rateAuth(ip))
 * @param maxRequests   Maximum number of requests allowed per window
 * @param windowSeconds Duration of the rate-limit window in seconds
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const count = await redis.incr(key);

  // Set TTL only on the first increment so the window is not extended on every call.
  if (count === 1) {
    await redis.expire(key, windowSeconds);
  }

  const ttl = await redis.ttl(key);
  // ttl may be -1 (no expiry, edge-case) or -2 (key missing); treat both as 0.
  const resetInSeconds = ttl > 0 ? ttl : 0;

  return {
    allowed: count <= maxRequests,
    remaining: Math.max(0, maxRequests - count),
    resetInSeconds,
  };
}
