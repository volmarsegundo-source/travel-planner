import "server-only";
import { redis } from "@/server/cache/redis";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
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
  windowSeconds: number
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
  } catch {
    // If Redis is unavailable, allow the request through rather than blocking users.
    // This ensures registration and login work even when Redis is down.
    return { allowed: true, remaining: limit, resetAt: now + windowSeconds * 1000 };
  }
}
