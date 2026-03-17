import "server-only";

import { logger } from "@/lib/logger";
import type {
  GeocodingProvider,
  GeocodingResult,
  GeocodingSearchOptions,
} from "./geocoding-provider.interface";

const MAPBOX_GEOCODING_URL = "https://api.mapbox.com/search/geocode/v6/forward";
const MAPBOX_TIMEOUT_MS = 5000;

/** Mapbox feature types to filter for cities and places */
const MAPBOX_TYPES = "place,locality";

/** Map app locales to Mapbox language codes */
const LOCALE_TO_MAPBOX_LANG: Record<string, string> = {
  "pt-BR": "pt",
  en: "en",
};

/**
 * Mapbox Geocoding v6 response types (subset we use).
 * Full spec: https://docs.mapbox.com/api/search/geocoding/v6/
 */
interface MapboxFeature {
  properties: {
    full_address?: string;
    name?: string;
    name_preferred?: string;
    place_formatted?: string;
    context?: {
      country?: { name?: string; country_code?: string };
      region?: { name?: string };
      place?: { name?: string };
      locality?: { name?: string };
    };
    coordinates?: {
      latitude?: number;
      longitude?: number;
    };
  };
  geometry?: {
    coordinates?: [number, number]; // [lon, lat]
  };
}

interface MapboxResponse {
  features?: MapboxFeature[];
}

export class MapboxGeocodingProvider implements GeocodingProvider {
  readonly name = "mapbox";
  private readonly accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async search(options: GeocodingSearchOptions): Promise<GeocodingResult[]> {
    const { query, locale, limit } = options;

    const url = new URL(MAPBOX_GEOCODING_URL);
    url.searchParams.set("q", query);
    url.searchParams.set("access_token", this.accessToken);
    url.searchParams.set("types", MAPBOX_TYPES);
    url.searchParams.set("limit", String(Math.min(limit, 10)));
    url.searchParams.set(
      "language",
      LOCALE_TO_MAPBOX_LANG[locale] ?? LOCALE_TO_MAPBOX_LANG["en"]
    );

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(MAPBOX_TIMEOUT_MS),
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      logger.error(
        "mapbox.fetchError",
        new Error(`Mapbox returned ${response.status}`)
      );
      throw new Error(`Mapbox geocoding failed with status ${response.status}`);
    }

    const data: MapboxResponse = await response.json();

    if (!data.features || data.features.length === 0) {
      return [];
    }

    return data.features.map((feature) => this.mapFeatureToResult(feature));
  }

  async isAvailable(): Promise<boolean> {
    try {
      const url = new URL(MAPBOX_GEOCODING_URL);
      url.searchParams.set("q", "test");
      url.searchParams.set("access_token", this.accessToken);
      url.searchParams.set("limit", "1");

      const response = await fetch(url.toString(), {
        signal: AbortSignal.timeout(MAPBOX_TIMEOUT_MS),
        method: "HEAD",
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private mapFeatureToResult(feature: MapboxFeature): GeocodingResult {
    const props = feature.properties;
    const context = props.context ?? {};

    const city =
      props.name_preferred ?? props.name ?? context.place?.name ?? null;
    const state = context.region?.name ?? null;
    const country = context.country?.name ?? null;
    const countryCode =
      context.country?.country_code?.toUpperCase() ?? null;

    // Coordinates: prefer properties.coordinates, fallback to geometry
    let lat = props.coordinates?.latitude ?? 0;
    let lon = props.coordinates?.longitude ?? 0;
    if (lat === 0 && lon === 0 && feature.geometry?.coordinates) {
      lon = feature.geometry.coordinates[0];
      lat = feature.geometry.coordinates[1];
    }

    const displayName =
      props.full_address ?? [city, state, country].filter(Boolean).join(", ");
    const shortName =
      [city, country].filter(Boolean).join(", ") || displayName;
    const formattedName =
      [city, state, country].filter(Boolean).join(", ") || displayName;

    return {
      displayName,
      shortName,
      formattedName,
      lat,
      lon,
      country,
      countryCode,
      state,
      city,
    };
  }
}
