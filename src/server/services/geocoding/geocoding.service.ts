import "server-only";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { redis } from "@/server/cache/redis";
import type {
  GeocodingProvider,
  GeocodingResult,
  GeocodingSearchOptions,
} from "./geocoding-provider.interface";
import { MapboxGeocodingProvider } from "./mapbox.provider";
import { NominatimGeocodingProvider } from "./nominatim.provider";

/** Cache TTL: 7 days in seconds */
const CACHE_TTL_SECONDS = 604800;

/**
 * Returns the primary geocoding provider based on environment configuration.
 * - If MAPBOX_SECRET_TOKEN is set, uses Mapbox Geocoding v6
 * - Otherwise, falls back to Nominatim (OpenStreetMap)
 */
export function getGeocodingProvider(): GeocodingProvider {
  if (env.MAPBOX_SECRET_TOKEN) {
    return new MapboxGeocodingProvider(env.MAPBOX_SECRET_TOKEN);
  }
  return new NominatimGeocodingProvider();
}

/**
 * Normalizes a search query for cache key generation.
 * Lowercases, trims, and collapses whitespace.
 */
export function normalizeQuery(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Builds a Redis cache key for geocoding results.
 * Includes provider name and locale to avoid cross-provider/cross-locale cache pollution.
 */
export function buildCacheKey(
  provider: string,
  locale: string,
  query: string
): string {
  return `geo:search:${provider}:${locale}:${normalizeQuery(query)}`;
}

/**
 * Searches for places with automatic fallback and Redis caching.
 *
 * 1. Check Redis cache for the primary provider
 * 2. If cache miss, query the primary provider
 * 3. If primary fails and is not Nominatim, fallback to Nominatim
 * 4. Cache successful results in Redis with 7-day TTL
 *
 * @returns Results array and the provider name that served them
 */
export async function searchWithFallback(
  options: GeocodingSearchOptions
): Promise<{ results: GeocodingResult[]; provider: string; cached: boolean }> {
  const primary = getGeocodingProvider();

  // Check cache for primary provider
  const cacheKey = buildCacheKey(
    primary.name,
    options.locale,
    options.query
  );
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const results: GeocodingResult[] = JSON.parse(cached);
      return { results, provider: primary.name, cached: true };
    }
  } catch {
    // Cache read failure is non-fatal — proceed to provider
  }

  // Try primary provider
  try {
    const results = await primary.search(options);
    // Cache results asynchronously (fire-and-forget)
    cacheResults(cacheKey, results).catch(() => {
      // Cache write failure is non-fatal
    });
    return { results, provider: primary.name, cached: false };
  } catch (error) {
    logger.warn("geocoding.primaryFailed", {
      provider: primary.name,
      errorMessage:
        error instanceof Error ? error.message : String(error),
    });

    // Fallback to Nominatim if primary was not already Nominatim
    if (primary.name !== "nominatim") {
      try {
        const fallback = new NominatimGeocodingProvider();
        const fallbackCacheKey = buildCacheKey(
          fallback.name,
          options.locale,
          options.query
        );

        // Check fallback cache
        try {
          const cached = await redis.get(fallbackCacheKey);
          if (cached) {
            return {
              results: JSON.parse(cached),
              provider: fallback.name,
              cached: true,
            };
          }
        } catch {
          // Cache read failure — continue to fallback provider
        }

        const results = await fallback.search(options);
        cacheResults(fallbackCacheKey, results).catch(() => {
          // Non-fatal
        });
        return { results, provider: fallback.name, cached: false };
      } catch (fallbackError) {
        logger.warn("geocoding.fallbackFailed", {
          provider: "nominatim",
          errorMessage:
            fallbackError instanceof Error
              ? fallbackError.message
              : String(fallbackError),
        });
      }
    }

    // Both providers failed
    return { results: [], provider: "none", cached: false };
  }
}

/**
 * Caches geocoding results in Redis with a 7-day TTL.
 */
async function cacheResults(
  key: string,
  results: GeocodingResult[]
): Promise<void> {
  await redis.setex(key, CACHE_TTL_SECONDS, JSON.stringify(results));
}
