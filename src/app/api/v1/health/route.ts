import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { redis } from "@/server/cache/redis";

export async function GET() {
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
