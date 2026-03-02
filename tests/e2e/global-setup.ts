/**
 * Playwright global setup — runs once before all E2E tests.
 *
 * Clears Redis rate-limit keys so that E2E test registrations and logins
 * are not blocked by rate limiting applied during previous test runs.
 */
import Redis from "ioredis";

export default async function globalSetup() {
  let redis: Redis | undefined;

  try {
    redis = new Redis({
      host: process.env.REDIS_HOST ?? "localhost",
      port: Number(process.env.REDIS_PORT ?? 6379),
      lazyConnect: true,
      connectTimeout: 3000,
    });

    await redis.connect();

    // Delete all rate-limit keys so E2E tests start fresh
    const keys = await redis.keys("ratelimit:*");
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(
        `[global-setup] Cleared ${keys.length} rate-limit key(s) from Redis`
      );
    } else {
      console.log("[global-setup] No rate-limit keys to clear");
    }
  } catch (err) {
    // Redis might be down — log but don't fail the test suite.
    // The rate-limit code has a graceful fallback when Redis is unreachable.
    console.warn(
      "[global-setup] Could not clear Redis rate-limit keys:",
      (err as Error).message
    );
  } finally {
    if (redis) {
      await redis.quit().catch(() => {});
    }
  }
}
