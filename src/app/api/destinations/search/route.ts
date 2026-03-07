import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { redis } from "@/server/cache/redis";
import { logger } from "@/lib/logger";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const CACHE_TTL = 86400; // 24 hours in seconds
const USER_AGENT = "TravelPlannerAtlas/1.0 (https://github.com/travel-planner)";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  // Rate limit: 1 request per second per user
  const rl = await checkRateLimit(`nominatim:${session.user.id}`, 1, 1);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429 }
    );
  }

  // Check Redis cache
  const cacheKey = `dest:search:${q.toLowerCase()}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return NextResponse.json({ results: JSON.parse(cached) });
    }
  } catch {
    // Cache miss or Redis error — continue to Nominatim
  }

  try {
    const url = new URL(NOMINATIM_URL);
    url.searchParams.set("q", q);
    url.searchParams.set("format", "json");
    url.searchParams.set("featuretype", "city");
    url.searchParams.set("limit", "5");
    url.searchParams.set("addressdetails", "1");

    const response = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT },
    });

    if (!response.ok) {
      logger.error("nominatim.fetchError", new Error(`Nominatim returned ${response.status}`));
      return NextResponse.json({ results: [] });
    }

    const data = await response.json();

    const results = data.map((item: {
      display_name: string;
      lat: string;
      lon: string;
      address?: { country?: string; state?: string; city?: string };
    }) => ({
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      country: item.address?.country ?? null,
      state: item.address?.state ?? null,
      city: item.address?.city ?? null,
    }));

    // Cache in Redis
    try {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(results));
    } catch {
      // Cache write failure is non-fatal
    }

    return NextResponse.json({ results });
  } catch (error) {
    logger.error("nominatim.error", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ results: [] });
  }
}
