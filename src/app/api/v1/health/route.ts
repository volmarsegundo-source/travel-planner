import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { redis } from "@/server/cache/redis";
import { checkRateLimit } from "@/lib/rate-limit";

/** Rate limit: 60 requests per minute per IP (generous for health checks) */
const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_WINDOW_SECONDS = 60;

export async function GET(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const rl = await checkRateLimit(
    `health:${ip}`,
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_SECONDS
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429 }
    );
  }
  const [dbStatus, redisStatus] = await Promise.allSettled([
    db.$queryRaw`SELECT 1`,
    redis.ping(),
  ]);
  const status =
    dbStatus.status === "fulfilled" && redisStatus.status === "fulfilled"
      ? "ok"
      : "degraded";
  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? "unknown",
      services: {
        database: dbStatus.status === "fulfilled" ? "ok" : "error",
        redis: redisStatus.status === "fulfilled" ? "ok" : "error",
      },
    },
    { status: status === "ok" ? 200 : 503 }
  );
}
