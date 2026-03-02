import "server-only";
import { redis } from "@/server/cache/redis";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowKey = `ratelimit:${key}:${Math.floor(now / (windowSeconds * 1000))}`;
  try {
    const count = await redis.incr(windowKey);
    if (count === 1) await redis.expire(windowKey, windowSeconds);
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetAt: Math.ceil(now / (windowSeconds * 1000)) * windowSeconds * 1000,
    };
  } catch {
    // If Redis is unavailable, allow the request through rather than blocking users.
    // This ensures registration and login work even when Redis is down.
    return { allowed: true, remaining: limit, resetAt: now + windowSeconds * 1000 };
  }
}
