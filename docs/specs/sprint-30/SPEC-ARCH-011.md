# Technical Specification: Autocomplete Architecture Rewrite

**Spec ID**: SPEC-ARCH-011
**Related Story**: REWRITE-1 (Sprint 30 Planning)
**Author**: architect
**Status**: Draft
**Last Updated**: 2026-03-17

---

## 1. Overview

The destination autocomplete is currently hardcoded to Nominatim (OpenStreetMap) as its geocoding provider. Nominatim has inconsistent result quality, strict rate limits (1 req/s policy), and no SLA. This spec introduces a `GeocodingProvider` abstraction (following the established `AiProvider` pattern from ADR-001), selects a recommended default provider, adds a Redis cache layer with intelligent TTL, and defines the client-side debounce/offline strategy. The rewrite replaces only the data-fetching layer; the UI component (`cmdk` + Radix Popover from ADR-016) remains unchanged.

## 2. Architecture Diagram

```
+-------------------+      300ms debounce      +---------------------+
| DestinationAuto-  | ───────────────────────> | /api/destinations/  |
| complete.tsx      |   fetch(q, locale)       | search  (API Route) |
| (cmdk + Radix)    | <─────────────────────── |                     |
+-------------------+      DestinationResult[] +----------+----------+
                                                          |
                                          1. Check Redis cache
                                          2. If miss -> GeocodingProvider
                                          3. Cache result in Redis
                                                          |
                           +------------------------------+-----+
                           |                              |     |
                    +------v-------+  +----------v---+  +-v-----------+
                    | NominatimProv|  | MapboxGeoProv|  | GooglePlaces|
                    | (current)    |  | (recommended)|  | Provider    |
                    +--------------+  +--------------+  +-------------+
                                                          |
                                          If all providers fail:
                                          +--------------------+
                                          | Offline fallback   |
                                          | top-cities.json    |
                                          | (client-side only) |
                                          +--------------------+
```

## 3. ADR-018: Autocomplete Geocoding Provider Selection

**Date**: 2026-03-17
**Status**: PROPOSED
**Deciders**: architect, tech-lead

### Context

The current autocomplete uses Nominatim exclusively. Three issues drive the rewrite:
1. **Result quality**: Nominatim often returns administrative regions instead of cities, especially for non-Latin scripts. Searching "Toquio" (pt-BR) returns the prefecture, not the city.
2. **Rate limiting**: Nominatim's policy is max 1 req/s with a clear User-Agent. Our current 3 req/2s rate limit already pushes this boundary, risking IP bans.
3. **No SLA**: Nominatim is a volunteer-run service. Outages occur without notice.

### Options Considered

| Option | Result Quality | Free Tier | Rate Limit | i18n (pt-BR) | Cost at 10k MAU | License |
|---|---|---|---|---|---|---|
| **A. Nominatim (current)** | Medium -- misses cities, returns regions | Unlimited (with policy) | 1 req/s hard policy | Accept-Language header (inconsistent) | $0 | ODbL |
| **B. Mapbox Geocoding v6** | High -- structured city results, forward+reverse | 100,000 req/month free | 600 req/min | `language` param (reliable) | $0 (under free tier) | Proprietary (Mapbox ToS) |
| **C. Google Places Autocomplete** | Highest -- best fuzzy matching, photos | $200/month credit (~2,500 free sessions/day) | No hard limit (billing) | `language` param (excellent) | ~$50-150/month beyond credit | Google ToS |

### Decision

**Option B: Mapbox Geocoding v6** as default, with Nominatim as fallback.

Primary reasons:
- 100k free requests/month covers our foreseeable growth (10k MAU x ~5 searches/user = 50k/month)
- Mapbox is already in our ADR-001 tech stack for maps -- single vendor relationship
- Structured `city`, `country`, `region` fields in response eliminate our current deduplication hack
- `language` parameter produces consistent pt-BR results
- MIT-compatible usage within Mapbox ToS for our use case

Nominatim is retained as a fallback provider (automatic failover) and for development environments where no Mapbox token is configured.

### Consequences

**Positive**:
- Significantly better search results for Brazilian Portuguese queries
- 600 req/min rate limit eliminates the need for aggressive client-side throttling
- Structured response fields eliminate the deduplication logic in the current API route
- Single vendor (Mapbox) for both geocoding and future map tiles

**Negative / Trade-offs**:
- Requires `MAPBOX_ACCESS_TOKEN` env var -- another secret to manage
- Mapbox free tier is per-account, not per-app -- shared with map tile loads
- Vendor dependency increases (mitigated by provider interface)

**Risks**:
- If Mapbox changes pricing, we can switch to Nominatim immediately (fallback already in place)
- Mapbox ToS requires attribution ("Powered by Mapbox") -- must add to autocomplete UI

---

## 4. Data Model

No schema changes required. The `DestinationResult` interface remains the same:

```typescript
interface DestinationResult {
  displayName: string;
  shortName?: string;
  formattedName?: string;
  lat: number;
  lon: number;
  country: string | null;
  countryCode: string | null;
  state: string | null;
  city: string | null;
}
```

Coordinates are already persisted as `Trip.destinationLat` / `Trip.destinationLon` (Float?, added Sprint 29).

## 5. API Contract

### Endpoint: GET /api/destinations/search

**Auth**: Required (session cookie)
**Rate Limit**: 10 req/5s per user (relaxed from 3/2s due to Mapbox's generous limits)

**Request**:
| Param | Type | Required | Validation |
|---|---|---|---|
| `q` | string (query) | Yes | min 2 chars, max 100 chars, trimmed |
| `locale` | string (query) | No | "pt-BR" or "en", default "pt-BR" |
| `limit` | number (query) | No | 1-10, default 5 |

**Response (200)**:
```json
{
  "results": [
    {
      "displayName": "Toquio, Japao",
      "shortName": "Toquio, Japao",
      "formattedName": "Toquio, Japao",
      "lat": 35.6762,
      "lon": 139.6503,
      "country": "Japao",
      "countryCode": "JP",
      "state": "Kanto",
      "city": "Toquio"
    }
  ],
  "provider": "mapbox",
  "cached": true
}
```

**Error Responses**:
- 401: `{ "error": "Unauthorized" }`
- 429: `{ "error": "Rate limit exceeded" }`
- 500: `{ "results": [] }` (graceful degradation, never 500 to client)

## 6. GeocodingProvider Interface

```typescript
// src/server/services/geocoding/geocoding-provider.interface.ts

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
  readonly name: string;
  search(options: GeocodingSearchOptions): Promise<GeocodingResult[]>;
  /** Health check -- returns true if the provider is reachable */
  isAvailable(): Promise<boolean>;
}
```

### Provider Implementations

```
src/server/services/geocoding/
  geocoding-provider.interface.ts   -- interface
  mapbox.provider.ts                -- MapboxGeocodingProvider (default)
  nominatim.provider.ts             -- NominatimGeocodingProvider (fallback)
  geocoding.service.ts              -- factory + failover orchestration
```

### Factory Logic

```typescript
// src/server/services/geocoding/geocoding.service.ts

export function getGeocodingProvider(): GeocodingProvider {
  if (env.MAPBOX_ACCESS_TOKEN) {
    return new MapboxGeocodingProvider(env.MAPBOX_ACCESS_TOKEN);
  }
  return new NominatimGeocodingProvider();
}

export async function searchWithFallback(
  options: GeocodingSearchOptions
): Promise<{ results: GeocodingResult[]; provider: string }> {
  const primary = getGeocodingProvider();
  try {
    const results = await primary.search(options);
    return { results, provider: primary.name };
  } catch (error) {
    logger.warn("geocoding.primaryFailed", { provider: primary.name, error });
    if (primary.name !== "nominatim") {
      const fallback = new NominatimGeocodingProvider();
      const results = await fallback.search(options);
      return { results, provider: fallback.name };
    }
    return { results: [], provider: "none" };
  }
}
```

## 7. Cache Strategy

**Layer**: Redis (existing `src/server/cache/redis.ts` singleton)
**Key pattern**: `geo:search:{provider}:{locale}:{normalizedQuery}`
**TTL**: 7 days (city names rarely change)
**Serialization**: JSON string of `GeocodingResult[]`

Normalization: `query.toLowerCase().trim().replace(/\s+/g, " ")`

Cache key includes `provider` to avoid serving Nominatim results when Mapbox is primary (result format differs in quality).

**Cache invalidation**: None needed -- TTL-based expiry only. Cities do not change.

## 8. Client-Side Changes

### 8.1 Debounce

Reduce from 400ms to 300ms. Mapbox's higher rate limit allows more responsive UX.

```typescript
// DestinationAutocomplete.tsx -- only change is debounce value
debounceRef.current = setTimeout(() => fetchResults(newValue), 300);
```

### 8.2 Offline Fallback: Top Cities JSON

A static JSON file with the top 100 global travel destinations, pre-translated to pt-BR and en.

```typescript
// src/data/top-cities.json (static, bundled at build time)
// Only used when API returns empty results AND network appears unavailable
[
  { "city": "Toquio", "country": "Japao", "countryCode": "JP", "lat": 35.6762, "lon": 139.6503 },
  { "city": "Paris", "country": "Franca", "countryCode": "FR", "lat": 48.8566, "lon": 2.3522 },
  ...
]
```

Client-side filtering uses `String.includes()` on city name -- no API call needed.

**When to use offline fallback**:
1. API returns `{ results: [] }` AND query length >= 3
2. `navigator.onLine === false`

The fallback results are visually distinguished with a "(offline)" suffix.

### 8.3 Attribution

Mapbox ToS requires attribution. Add to autocomplete dropdown footer:

```html
<div class="px-3 py-1 text-[10px] text-muted-foreground/50">
  Powered by Mapbox
</div>
```

Only shown when provider is Mapbox (response includes `provider` field).

## 9. Environment Variables

```
# .env.local -- new variable
MAPBOX_ACCESS_TOKEN={{MAPBOX_ACCESS_TOKEN}}  # optional -- falls back to Nominatim if absent
```

Add to `src/lib/env.ts`:
```typescript
MAPBOX_ACCESS_TOKEN: z.string().optional(),
```

## 10. Security Considerations

- **Mapbox token exposure**: The token is used SERVER-SIDE only (in the API route). It is never sent to the client. The token should have `geocoding:read` scope only -- no write permissions.
- **Input sanitization**: Query string is already trimmed and length-limited. Add explicit encoding: `encodeURIComponent(query)` before passing to provider.
- **PII**: Search queries are NOT logged (they could reveal travel plans). Only cache keys (hashed) are logged.
- **Rate limiting**: Maintained at API route level. Per-user, not per-IP, to prevent shared-IP false positives.

## 11. Performance Requirements

| Metric | Target | Current |
|---|---|---|
| Autocomplete response (cache hit) | < 50ms | ~30ms (Redis) |
| Autocomplete response (cache miss, Mapbox) | < 300ms | ~400-800ms (Nominatim) |
| Autocomplete response (fallback to Nominatim) | < 800ms | N/A |
| Client-side debounce | 300ms | 400ms |
| Offline fallback filter | < 5ms | N/A |

## 12. Testing Strategy

### Unit Tests
- `MapboxGeocodingProvider`: mock fetch, test response mapping, error handling, timeout
- `NominatimGeocodingProvider`: verify existing behavior preserved
- `searchWithFallback`: test primary success, primary failure + fallback success, both fail
- `getGeocodingProvider`: test factory with/without MAPBOX_ACCESS_TOKEN
- Cache key normalization: edge cases (accents, case, whitespace)

### Integration Tests
- API route with Redis mock: cache hit, cache miss, rate limit enforcement
- Provider failover: Mapbox timeout triggers Nominatim fallback

### E2E Tests
- Type destination, see results appear within 600ms
- Select result, verify lat/lon are populated
- Offline mode (mock network): fallback results appear

## 13. Migration Path

1. Create `GeocodingProvider` interface + implementations (non-breaking, new files)
2. Refactor `/api/destinations/search` to use `searchWithFallback` (transparent to client)
3. Add `MAPBOX_ACCESS_TOKEN` to env validation (optional)
4. Reduce client debounce from 400ms to 300ms
5. Add top-cities.json + offline fallback logic
6. Add Mapbox attribution to dropdown

No database migration required. No breaking API changes. Client component changes are minimal (debounce + attribution).

## 14. Dependencies

| Package | Version | License | Purpose | New? |
|---|---|---|---|---|
| `cmdk` | ^1.1.1 | MIT | Autocomplete UI | No (existing) |
| `@radix-ui/react-popover` | via radix-ui | MIT | Portal dropdown | No (existing) |

No new npm dependencies. Mapbox Geocoding v6 is a REST API called via `fetch`.

## 15. Open Questions

- [ ] **OQ-1**: Should the Mapbox token be shared with the map library (SPEC-ARCH-012) or should we use separate tokens with different scopes? Recommendation: single token with `geocoding:read` + `styles:tiles` scopes.
- [ ] **OQ-2**: Should we add a `/api/destinations/reverse` endpoint for reverse geocoding (lat/lon -> city name)? Not needed for MVP but useful if we add "pin on map to select destination" later.
- [ ] **OQ-3**: Top-cities list -- should it include 100 or 200 cities? 100 covers all major destinations; 200 adds regional capitals. Recommendation: 100 for bundle size.

## 16. Definition of Done

- [ ] `GeocodingProvider` interface created with Mapbox + Nominatim implementations
- [ ] `searchWithFallback` factory with automatic failover
- [ ] Redis cache with 7-day TTL on geocoding results
- [ ] API route refactored to use provider abstraction
- [ ] Client debounce reduced to 300ms
- [ ] Top-100 cities offline fallback JSON created (pt-BR + en)
- [ ] Mapbox attribution added to dropdown
- [ ] MAPBOX_ACCESS_TOKEN added to env.ts as optional
- [ ] Unit tests for both providers + failover logic
- [ ] E2E test for autocomplete flow
- [ ] ADR-018 accepted by tech-lead

> PROPOSED -- Awaiting tech-lead review before implementation begins
