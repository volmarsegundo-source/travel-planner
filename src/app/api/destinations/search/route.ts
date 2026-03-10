import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { redis } from "@/server/cache/redis";
import { logger } from "@/lib/logger";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const CACHE_TTL = 86400; // 24 hours in seconds
const USER_AGENT = "TravelPlannerAtlas/1.0 (https://github.com/travel-planner)";
const NOMINATIM_TIMEOUT_MS = 5000;
const DEFAULT_LOCALE = "pt-BR";

// Map app locales to HTTP Accept-Language values
const LOCALE_TO_ACCEPT_LANGUAGE: Record<string, string> = {
  "pt-BR": "pt-BR,pt;q=0.9,en;q=0.5",
  "en": "en,en-US;q=0.9",
};

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const locale = request.nextUrl.searchParams.get("locale")?.trim() || DEFAULT_LOCALE;

  // Rate limit: 3 requests per 2 seconds per user (relaxed for autocomplete UX)
  const rl = await checkRateLimit(`nominatim:${session.user.id}`, 3, 2);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429 }
    );
  }

  // Include locale in cache key for language-specific results
  const cacheKey = `dest:search:${locale}:${q.toLowerCase()}`;
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

    const acceptLanguage = LOCALE_TO_ACCEPT_LANGUAGE[locale] ?? LOCALE_TO_ACCEPT_LANGUAGE[DEFAULT_LOCALE];

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": acceptLanguage,
      },
      signal: AbortSignal.timeout(NOMINATIM_TIMEOUT_MS),
    });

    if (!response.ok) {
      logger.error("nominatim.fetchError", new Error(`Nominatim returned ${response.status}`));
      return NextResponse.json({ results: [] });
    }

    const data = await response.json();

    const rawResults = data.map((item: {
      display_name: string;
      lat: string;
      lon: string;
      importance?: number;
      address?: { country?: string; state?: string; city?: string };
    }) => ({
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      country: item.address?.country ?? null,
      state: item.address?.state ?? null,
      city: item.address?.city ?? null,
      importance: item.importance ?? 0,
    }));

    // Deduplicate by city+state+country — keep the entry with higher importance
    const seen = new Map<string, typeof rawResults[number]>();
    for (const result of rawResults) {
      const key = [
        result.city?.toLowerCase() ?? "",
        result.state?.toLowerCase() ?? "",
        result.country?.toLowerCase() ?? "",
      ].join("|");
      const existing = seen.get(key);
      if (!existing || result.importance > existing.importance) {
        seen.set(key, result);
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const results = [...seen.values()].map(({ importance, ...rest }) => ({
      ...rest,
      shortName: [rest.city, rest.state, rest.country].filter(Boolean).join(", ") || rest.displayName,
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
