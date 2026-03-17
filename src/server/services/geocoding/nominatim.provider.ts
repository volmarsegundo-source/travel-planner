import "server-only";

import { logger } from "@/lib/logger";
import type {
  GeocodingProvider,
  GeocodingResult,
  GeocodingSearchOptions,
} from "./geocoding-provider.interface";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_TIMEOUT_MS = 5000;
const USER_AGENT = "TravelPlannerAtlas/1.0 (https://github.com/travel-planner)";

/** Map app locales to HTTP Accept-Language values */
const LOCALE_TO_ACCEPT_LANGUAGE: Record<string, string> = {
  "pt-BR": "pt-BR,pt;q=0.9,en;q=0.5",
  en: "en,en-US;q=0.9",
};

/** Nominatim response item shape */
interface NominatimItem {
  display_name: string;
  lat: string;
  lon: string;
  importance?: number;
  address?: {
    country?: string;
    country_code?: string;
    state?: string;
    city?: string;
  };
}

export class NominatimGeocodingProvider implements GeocodingProvider {
  readonly name = "nominatim";

  async search(options: GeocodingSearchOptions): Promise<GeocodingResult[]> {
    const { query, locale, limit } = options;

    const url = new URL(NOMINATIM_URL);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("featuretype", "city");
    url.searchParams.set("limit", String(Math.min(limit, 10)));
    url.searchParams.set("addressdetails", "1");

    const acceptLanguage =
      LOCALE_TO_ACCEPT_LANGUAGE[locale] ??
      LOCALE_TO_ACCEPT_LANGUAGE["pt-BR"];

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": acceptLanguage,
      },
      signal: AbortSignal.timeout(NOMINATIM_TIMEOUT_MS),
    });

    if (!response.ok) {
      logger.error(
        "nominatim.fetchError",
        new Error(`Nominatim returned ${response.status}`)
      );
      throw new Error(
        `Nominatim geocoding failed with status ${response.status}`
      );
    }

    const data: NominatimItem[] = await response.json();

    const rawResults = data.map((item) => this.mapItemToResult(item));

    // Deduplicate by city+state+country — keep highest importance
    return this.deduplicateResults(rawResults);
  }

  async isAvailable(): Promise<boolean> {
    try {
      const url = new URL(NOMINATIM_URL);
      url.searchParams.set("q", "test");
      url.searchParams.set("format", "json");
      url.searchParams.set("limit", "1");

      const response = await fetch(url.toString(), {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(NOMINATIM_TIMEOUT_MS),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private mapItemToResult(
    item: NominatimItem
  ): GeocodingResult & { importance: number } {
    const addressCity = item.address?.city ?? null;
    const country = item.address?.country ?? null;
    const state = item.address?.state ?? null;
    const city =
      addressCity ?? (item.display_name.split(",")[0]?.trim() || null);
    const countryCode =
      item.address?.country_code?.toUpperCase() ?? null;

    const formattedName =
      [city, state, country].filter(Boolean).join(", ") || item.display_name;
    const shortName =
      [city, country].filter(Boolean).join(", ") || item.display_name;

    return {
      displayName: item.display_name,
      shortName,
      formattedName,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      country,
      countryCode,
      state,
      city,
      importance: item.importance ?? 0,
    };
  }

  private deduplicateResults(
    results: (GeocodingResult & { importance: number })[]
  ): GeocodingResult[] {
    const seen = new Map<
      string,
      GeocodingResult & { importance: number }
    >();
    for (const result of results) {
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
    // Strip importance from final results
    return [...seen.values()].map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ importance: _importance, ...rest }) => rest
    );
  }
}
