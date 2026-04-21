import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { redis } from "@/server/cache/redis";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/http/get-client-ip";

/** Rate limit: 60 requests per minute per IP (generous for health checks) */
const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_WINDOW_SECONDS = 60;

export async function GET(request: NextRequest) {
  const ip = getClientIp(request.headers);

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

  const aiCheck = checkAiProvider();

  const status =
    dbStatus.status === "fulfilled" && redisStatus.status === "fulfilled"
      ? "ok"
      : "degraded";

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? "unknown",
      environment:
        process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
      services: {
        database: dbStatus.status === "fulfilled" ? "ok" : "error",
        redis: redisStatus.status === "fulfilled" ? "ok" : "error",
        ai: aiCheck,
      },
    },
    { status: status === "ok" ? 200 : 503 }
  );
}

type AiStatus = "ok" | "degraded" | "unconfigured";

interface AiCheck {
  status: AiStatus;
  provider: string;
  fallback: string | null;
}

function hasKeyForProvider(provider: string): boolean {
  switch (provider) {
    case "gemini":
      return !!(
        process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY
      );
    case "anthropic":
      return !!process.env.ANTHROPIC_API_KEY;
    default:
      return false;
  }
}

function checkAiProvider(): AiCheck {
  const primary = process.env.AI_PROVIDER ?? "anthropic";
  const fallback = process.env.AI_FALLBACK_PROVIDER ?? null;

  const primaryOk = hasKeyForProvider(primary);
  const fallbackOk = fallback ? hasKeyForProvider(fallback) : false;

  let status: AiStatus;
  if (primaryOk) {
    status = "ok";
  } else if (fallbackOk) {
    status = "degraded";
  } else {
    status = "unconfigured";
  }

  return {
    status,
    provider: primary,
    fallback,
  };
}
