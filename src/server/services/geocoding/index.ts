export type {
  GeocodingProvider,
  GeocodingResult,
  GeocodingSearchOptions,
} from "./geocoding-provider.interface";
export { MapboxGeocodingProvider } from "./mapbox.provider";
export { NominatimGeocodingProvider } from "./nominatim.provider";
export {
  getGeocodingProvider,
  searchWithFallback,
  normalizeQuery,
  buildCacheKey,
} from "./geocoding.service";
