import "server-only";

import { logger } from "@/lib/logger";
import { redis } from "@/server/cache/redis";

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const API_TIMEOUT_MS = 10_000;
const MIN_LANDSCAPE_WIDTH = 1200;
const SEARCH_PER_PAGE = 5;
const IMAGE_OUTPUT_WIDTH = 1200;
const IMAGE_QUALITY = 80;
const UTM_PARAMS = "utm_source=atlas_travel_planner&utm_medium=referral";

interface UnsplashPhoto {
  urls: { regular: string; small: string; raw: string };
  user: { name: string; links: { html: string } };
  links: { html: string };
  width: number;
  height: number;
  likes: number;
}

interface UnsplashSearchResponse {
  results: UnsplashPhoto[];
  total: number;
  total_pages: number;
}

export interface DestinationImageResult {
  url: string;
  photographerName: string;
  photographerUrl: string;
  unsplashUrl: string;
}

/**
 * Normalize a destination string into a cache key segment.
 * Lowercases, trims, and replaces whitespace runs with underscores.
 */
function toCacheKeySegment(destination: string): string {
  return destination.toLowerCase().trim().replace(/\s+/g, "_");
}

export class UnsplashService {
  /**
   * Get a destination image from Unsplash. Checks Redis cache first, then
   * calls the Unsplash Search API. Returns null if both cache and API fail
   * or if no API key is configured.
   */
  static async getDestinationImage(
    destination: string
  ): Promise<DestinationImageResult | null> {
    if (!UNSPLASH_ACCESS_KEY) {
      logger.warn("unsplash.no-api-key");
      return null;
    }

    const cacheKey = `img:dest:${toCacheKeySegment(destination)}`;

    // 1. Check Redis cache
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as DestinationImageResult;
      }
    } catch (error) {
      logger.warn("unsplash.cache-read.error", {
        destination,
        error: String(error),
      });
      // Continue — cache miss is non-fatal
    }

    // 2. Call Unsplash Search API
    try {
      // Extract city and country from destination (e.g., "Lima, Peru" -> "Lima Peru")
      const cleanDest = destination.replace(/,/g, " ").trim();
      const query = encodeURIComponent(`${cleanDest} landmark skyline`);
      const url =
        `https://api.unsplash.com/search/photos` +
        `?query=${query}` +
        `&per_page=${SEARCH_PER_PAGE}` +
        `&orientation=landscape` +
        `&order_by=relevant` +
        `&content_filter=high`;

      const response = await fetch(url, {
        headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
      });

      if (!response.ok) {
        logger.warn("unsplash.api.error", {
          status: String(response.status),
          destination,
        });
        return null;
      }

      const data = (await response.json()) as UnsplashSearchResponse;
      const photos: UnsplashPhoto[] = data.results ?? [];

      if (photos.length === 0) {
        return null;
      }

      // Prefer landscape photos with sufficient resolution, sorted by likes
      const suitable = photos
        .filter((p) => p.width >= MIN_LANDSCAPE_WIDTH && p.width > p.height)
        .sort((a, b) => b.likes - a.likes);

      const best = suitable[0] ?? photos[0];

      const result: DestinationImageResult = {
        url: `${best.urls.raw}&w=${IMAGE_OUTPUT_WIDTH}&q=${IMAGE_QUALITY}&fit=crop&auto=format&fm=webp`,
        photographerName: best.user.name,
        photographerUrl: `${best.user.links.html}?${UTM_PARAMS}`,
        unsplashUrl: `${best.links.html}?${UTM_PARAMS}`,
      };

      // 3. Cache the result
      try {
        await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL_SECONDS);
      } catch (cacheError) {
        logger.warn("unsplash.cache-write.error", {
          destination,
          error: String(cacheError),
        });
        // Non-blocking — still return the result
      }

      return result;
    } catch (error) {
      logger.warn("unsplash.fetch.error", {
        destination,
        error: String(error),
      });
      return null;
    }
  }
}
