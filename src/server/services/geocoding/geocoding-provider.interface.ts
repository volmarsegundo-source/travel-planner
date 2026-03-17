import "server-only";

/**
 * Geocoding provider abstraction layer.
 *
 * Defines a provider-agnostic contract for geocoding (city/place search).
 * Implementations (Mapbox, Nominatim, etc.) handle API-specific details
 * while GeocodingService orchestrates caching, fallback, and validation.
 *
 * Pattern follows AiProvider from ADR-001.
 */

export interface GeocodingResult {
  displayName: string;
  shortName: string;
  formattedName: string;
  lat: number;
  lon: number;
  country: string | null;
  countryCode: string | null;
  state: string | null;
  city: string | null;
}

export interface GeocodingSearchOptions {
  query: string;
  locale: string;
  limit: number;
}

export interface GeocodingProvider {
  /** Provider identifier, e.g. "mapbox" or "nominatim". */
  readonly name: string;

  /**
   * Searches for places matching the query.
   * The provider handles API-specific formatting, timeouts, and error mapping.
   *
   * @param options - Search parameters including query, locale, and result limit
   * @returns Array of geocoding results, empty array on no matches
   */
  search(options: GeocodingSearchOptions): Promise<GeocodingResult[]>;

  /**
   * Health check — returns true if the provider is reachable.
   * Used for monitoring, not for fallback decisions (fallback uses try/catch).
   */
  isAvailable(): Promise<boolean>;
}
