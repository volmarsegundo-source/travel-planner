import "server-only";
import { Redis } from "ioredis";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

const globalForRedis = globalThis as unknown as { redis: Redis };

export const redis =
  globalForRedis.redis ??
  new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
  });

redis.on("error", (err) => logger.error("redis.connection.error", err));

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;
