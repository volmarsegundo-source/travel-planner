import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { searchWithFallback } from "@/server/services/geocoding/geocoding.service";

const DEFAULT_LOCALE = "pt-BR";
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 10;
const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 100;

/** Rate limit: 10 requests per 5 seconds per user (relaxed for Mapbox) */
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_SECONDS = 5;

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < MIN_QUERY_LENGTH || q.length > MAX_QUERY_LENGTH) {
    return NextResponse.json({ results: [] });
  }

  const locale =
    request.nextUrl.searchParams.get("locale")?.trim() || DEFAULT_LOCALE;

  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam
    ? Math.min(Math.max(1, parseInt(limitParam, 10) || DEFAULT_LIMIT), MAX_LIMIT)
    : DEFAULT_LIMIT;

  // Rate limit per user (fail-closed to protect the upstream Nominatim quota —
  // SPEC-SEC-RATE-LIMIT-FAIL-CLOSED-001 §Wave 2B). Gated by the global env flag.
  const rl = await checkRateLimit(
    `geocoding:${session.user.id}`,
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_SECONDS,
    { failClosed: true }
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429 }
    );
  }

  try {
    const { results, provider, cached } = await searchWithFallback({
      query: q,
      locale,
      limit,
    });

    return NextResponse.json({ results, provider, cached });
  } catch (error) {
    logger.error(
      "geocoding.routeError",
      error instanceof Error ? error : new Error(String(error))
    );
    // Graceful degradation — never 500 to client
    return NextResponse.json({ results: [], provider: "none", cached: false });
  }
}
