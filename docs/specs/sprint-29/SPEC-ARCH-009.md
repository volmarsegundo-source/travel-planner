---
id: SPEC-ARCH-009
title: "Map Coordinates and Destination Pin -- Schema, Capture, and Rendering"
status: draft
sprint: 29
author: architect
created: 2026-03-12
version: "1.0.0"
related_specs:
  - SPEC-ARCH-002
  - SPEC-PROD-008
---

# SPEC-ARCH-009: Map Coordinates and Destination Pin -- Schema, Capture, and Rendering

**Version**: 1.0.0
**Status**: Draft
**Author**: architect
**Reviewers**: [tech-lead, ux-designer, qa-engineer, security-specialist]
**Created**: 2026-03-12
**Last Updated**: 2026-03-12

---

## 1. Overview

Expedition cards on the `/expeditions` page and the `/atlas` map page need to display a visual pin at each trip's destination. Currently, the `DestinationAutocomplete` component receives latitude/longitude from the Nominatim API via `onSelect`, but these coordinates are not persisted to the database. As a result, the map has no data to render pins.

This spec defines: (1) the Prisma schema migration to add `destinationLat` and `destinationLon` to the Trip model, (2) how coordinates are captured from the autocomplete and persisted during expedition creation and Phase 1 edits, (3) how coordinates render as destination pins on expedition cards and the atlas map, and (4) privacy considerations for storing geographic coordinates.

---

## 2. Architecture Decision Records

### ADR-025: Coordinate Storage -- Float Fields on Trip Model

- **Status**: Proposed
- **Context**: We need to store the geographic coordinates of each trip's destination. Options include: dedicated columns on Trip, a JSONB field, a separate GeoPoint model, or PostGIS geography type.

- **Options Considered**:

| Option | Pros | Cons |
|---|---|---|
| A: Two nullable Float columns (destinationLat, destinationLon) | Simple. No new models. Direct queries. Compatible with all ORMs. | No spatial indexing. No GIS functions. |
| B: JSONB field `coordinates: {lat, lon}` | Flexible. Single column. | Harder to query/index. Type safety requires runtime validation. |
| C: PostGIS geography column | Full spatial support. Distance queries. Spatial indexing. | Requires PostGIS extension. Over-engineered for pin display. Prisma support limited. |
| D: Separate GeoPoint model | Normalized. Extensible (could add origin coords). | Join required. Over-designed for one coordinate pair. |

- **Decision**: **Option A -- Two nullable Float columns**. At MVP scale, we display pins on a map and nothing more. No distance calculations, no geofencing, no spatial queries. Two Float columns are the simplest solution. If spatial queries are needed later, a migration to PostGIS can happen independently. Prisma `Float` maps to PostgreSQL `double precision`, which provides sufficient precision for geographic coordinates (15 significant digits -- sub-millimeter accuracy).

- **Consequences**:
  - **Positive**: Zero dependencies. Simple migration. Direct query (`WHERE destinationLat IS NOT NULL`). Prisma type-safe.
  - **Negative**: No spatial indexing. Cannot do "find trips near X" efficiently. Acceptable -- not a current requirement.
  - **Risk**: If we later need proximity search, we would need PostGIS. Mitigated: adding PostGIS and creating a generated geography column from lat/lon is a non-breaking migration.

### ADR-026: Map Pin Rendering -- Static Map Image vs Client-Side Map

- **Status**: Proposed
- **Context**: Expedition cards on the `/expeditions` page need to show a visual indicator of the destination. The `/atlas` page already uses (or will use) Mapbox GL JS for an interactive map. For the expedition cards, we need to decide how to render the pin.

- **Options Considered**:

| Option | Pros | Cons |
|---|---|---|
| A: Static map image (Mapbox Static API or similar) | No JS overhead. Fast load. Cached by CDN. | External API call per card. Cost at scale. Stale if coordinates change. |
| B: Tiny inline map (Mapbox GL JS per card) | Interactive. Consistent with atlas page. | Heavy: Mapbox GL JS is ~200KB. Multiple map instances = performance disaster. |
| C: CSS/SVG pin indicator (no map) | Zero dependencies. Ultra-fast. No external calls. | Less visually informative -- no geographic context. |
| D: Single lightweight world map SVG with pin overlay | No external dependency. Visual context. One SVG reused across cards. | Custom SVG work. Limited detail. |

- **Decision**: **Option C for expedition cards, interactive Mapbox GL JS for /atlas page**. Expedition cards display a small CSS pin icon with the destination name -- no map context needed on the card itself (the card already shows the destination text). The `/atlas` page provides the full map experience with interactive pins. This separation keeps card rendering fast (no map library per card) while giving users a rich map on the dedicated page.

- **Consequences**:
  - **Positive**: Zero external API calls for cards. No Mapbox cost for card rendering. Cards load instantly.
  - **Negative**: Cards have no geographic visual context. Acceptable -- the atlas page serves that purpose.
  - **Risk**: Product-owner may want a mini-map on cards. If so, revisit with Option A (static images). Decision can be changed without schema impact.

---

## 3. Data Model

### 3.1 Migration: `add_destination_coordinates`

```prisma
// Addition to Trip model in schema.prisma
model Trip {
  // ... existing fields ...

  // Sprint 29: Destination coordinates (from Nominatim autocomplete)
  destinationLat  Float?
  destinationLon  Float?

  // ... existing relations and indexes ...
}
```

**Migration SQL** (generated by `npx prisma migrate dev`):

```sql
ALTER TABLE "trips" ADD COLUMN "destinationLat" DOUBLE PRECISION;
ALTER TABLE "trips" ADD COLUMN "destinationLon" DOUBLE PRECISION;
```

### 3.2 Field Specifications

| Field | Type | Nullable | Constraints | Source |
|---|---|---|---|---|
| `destinationLat` | Float (double precision) | Yes | Range: -90.0 to 90.0 | Nominatim API via DestinationAutocomplete |
| `destinationLon` | Float (double precision) | Yes | Range: -180.0 to 180.0 | Nominatim API via DestinationAutocomplete |

**Nullable rationale**: Existing trips (created before this migration) will have `null` coordinates. New trips where the user types a destination manually (without selecting from autocomplete) will also have `null` coordinates. The UI must handle both cases gracefully.

### 3.3 Validation (Zod)

Add coordinate validation to the expedition schema:

```typescript
// src/lib/validations/expedition.schema.ts
export const Phase1Schema = z.object({
  destination: z.string().min(1).max(150),
  origin: z.string().max(150).optional(),
  // ... existing fields ...
  // NEW:
  destinationLat: z.number().min(-90).max(90).optional(),
  destinationLon: z.number().min(-180).max(180).optional(),
}).refine(
  (data) => {
    // If one coordinate is provided, both must be
    if (data.destinationLat != null && data.destinationLon == null) return false;
    if (data.destinationLon != null && data.destinationLat == null) return false;
    return true;
  },
  { message: "Both latitude and longitude must be provided together" }
);
```

### 3.4 Backfill Strategy for Existing Trips

Existing trips have destinations stored as text but no coordinates. Options:

1. **No backfill** (recommended for MVP): Existing trip cards show no pin. Users can revisit Phase 1 and re-select their destination from the autocomplete to capture coordinates.
2. **Batch geocode**: Run a one-time script that geocodes all existing destinations via Nominatim. Risk: rate limits (1 req/sec for Nominatim), ambiguous destinations.
3. **Lazy backfill**: When a user visits an existing trip, geocode the destination in the background and save coordinates. Risk: increases page load latency.

**Decision**: Option 1 (no backfill). The number of existing trips is small (development/test data). Production users will create new trips that capture coordinates from the start. If needed, a backfill script can be written later.

---

## 4. Coordinate Capture

### 4.1 DestinationAutocomplete Integration

The `DestinationAutocomplete` component already provides `lat` and `lon` in its `onSelect` callback:

```typescript
interface DestinationResult {
  displayName: string;
  lat: number;        // <-- already available
  lon: number;        // <-- already available
  country: string | null;
  countryCode: string | null;
  // ...
}
```

### 4.2 Phase1Wizard Changes

Update the `handleDestinationSelect` callback to capture coordinates:

```typescript
// Current
function handleDestinationSelect(result: DestinationResult) {
  setDestinationCountryCode(result.countryCode);
}

// Updated
const [destinationLat, setDestinationLat] = useState<number | null>(null);
const [destinationLon, setDestinationLon] = useState<number | null>(null);

function handleDestinationSelect(result: DestinationResult) {
  setDestinationCountryCode(result.countryCode);
  setDestinationLat(result.lat);
  setDestinationLon(result.lon);
}
```

Update `handleSubmit` to pass coordinates to the action:

```typescript
const result = await createExpeditionAction({
  destination: destination.trim(),
  origin: origin.trim() || undefined,
  destinationCountryCode: destinationCountryCode ?? undefined,
  originCountryCode: originCountryCode ?? undefined,
  startDate: startDate || undefined,
  endDate: endDate || undefined,
  flexibleDates,
  profileFields: ...,
  // NEW:
  destinationLat: destinationLat ?? undefined,
  destinationLon: destinationLon ?? undefined,
});
```

### 4.3 createExpeditionAction Changes

```typescript
// In ExpeditionService.createExpedition, add to Trip creation:
const trip = await db.trip.create({
  data: {
    userId,
    title: data.destination,
    destination: data.destination,
    origin: data.origin ?? null,
    startDate: data.startDate ? new Date(data.startDate) : null,
    endDate: data.endDate ? new Date(data.endDate) : null,
    tripType: classifyTrip(...),
    // NEW:
    destinationLat: data.destinationLat ?? null,
    destinationLon: data.destinationLon ?? null,
  },
});
```

### 4.4 Coordinate Reset on Destination Change

If the user manually edits the destination text (clearing the autocomplete selection), the coordinates should be cleared:

```typescript
function handleInputChange(value: string) {
  setDestination(value);
  // Clear coordinates when user types manually (invalidates previous selection)
  setDestinationLat(null);
  setDestinationLon(null);
  setDestinationCountryCode(null);
}
```

This ensures coordinates are only saved when they come from a verified geocoding result, not from arbitrary user text.

---

## 5. Map Pin Rendering

### 5.1 Expedition Cards (CSS Pin)

On the `/expeditions` page, each expedition card can optionally show a small location indicator:

```typescript
// In ExpeditionCard component
{trip.destinationLat && trip.destinationLon && (
  <span
    className="text-xs text-muted-foreground flex items-center gap-1"
    aria-label={t("locationAvailable")}
  >
    <MapPinIcon className="h-3 w-3" />
    {t("viewOnMap")}
  </span>
)}
```

This is a text indicator, not a map. Clicking it navigates to `/atlas` with a query parameter to center the map on that destination:

```
/atlas?center={lat},{lon}&zoom=8
```

### 5.2 Atlas Map Page (Mapbox GL JS)

The `/atlas` page renders an interactive Mapbox GL JS map with pins for all user trips that have coordinates:

```typescript
// Server component: fetch trips with coordinates
const tripsWithCoords = await db.trip.findMany({
  where: {
    userId: session.user.id,
    deletedAt: null,
    destinationLat: { not: null },
    destinationLon: { not: null },
  },
  select: {
    id: true,
    destination: true,
    destinationLat: true,
    destinationLon: true,
    coverEmoji: true,
    currentPhase: true,
    status: true,
  },
});
```

Pass as GeoJSON features to the map client component:

```typescript
const features: GeoJSON.Feature[] = tripsWithCoords.map(trip => ({
  type: "Feature",
  geometry: {
    type: "Point",
    coordinates: [trip.destinationLon!, trip.destinationLat!],
  },
  properties: {
    tripId: trip.id,
    destination: trip.destination,
    emoji: trip.coverEmoji,
    phase: trip.currentPhase,
    status: trip.status,
  },
}));
```

### 5.3 Pin Interaction on Atlas

- **Hover**: Show tooltip with destination name and phase status.
- **Click**: Navigate to `/expedition/{tripId}/summary` or `/expedition/{tripId}` (the expedition hub).
- **Color coding**: Pin color reflects trip status:
  - PLANNING: blue
  - ACTIVE: green
  - COMPLETED: gold
  - ARCHIVED: gray

### 5.4 Graceful Degradation

- **No coordinates**: Trip does not appear on the atlas map. The expedition card shows no pin icon.
- **Mapbox API key missing**: Atlas page shows a placeholder message: "Map unavailable. Configure MAPBOX_ACCESS_TOKEN." No crash.
- **Mapbox load failure**: Catch error in client component, show fallback text list of destinations.

---

## 6. Security Considerations

### 6.1 Coordinate Precision and Privacy

Geographic coordinates at full `double precision` can pinpoint a location to sub-millimeter accuracy. For destinations (cities, landmarks), this precision is acceptable -- destination coordinates represent public places, not private addresses.

However:
- **Do NOT store home address coordinates**. The `origin` field is a text city name, not geocoded to coordinates. If origin geocoding is added later, it must be at city-level precision only (round to 2 decimal places = ~1.1km accuracy).
- **Coordinates are NOT PII** for trip destinations. Cities are public information. This does not require encryption.
- **API exposure**: Coordinates are passed to the client for map rendering. This is acceptable -- they represent the destination city, not the user's location.

### 6.2 Nominatim API Proxy

Coordinates come from the existing `/api/destinations/search` route, which proxies Nominatim. This route:
- Already has rate limiting (via Redis).
- Already validates input (query string sanitization).
- Returns coordinates from Nominatim's public dataset -- no PII.
- No change needed for this spec.

### 6.3 Mapbox Access Token

The Mapbox GL JS library requires a public access token. This token:
- Is restricted to specific domains (configured in Mapbox dashboard).
- Has read-only scope (cannot modify Mapbox resources).
- Is stored in `NEXT_PUBLIC_MAPBOX_TOKEN` (public env var, visible in client bundle -- this is by design per Mapbox documentation).
- Must NOT be confused with a secret key. If server-side Mapbox APIs are needed later, use a separate `MAPBOX_SECRET_TOKEN` in server-only env.

Add to `src/lib/env.ts`:

```typescript
// Client-side public env vars
export const clientEnv = createEnv({
  client: {
    // ... existing ...
    NEXT_PUBLIC_MAPBOX_TOKEN: z.string().min(1).optional(),
  },
});
```

---

## 7. Performance Requirements

| Metric | Target | Notes |
|---|---|---|
| Migration execution | < 1s | Two nullable columns, no data changes |
| Coordinate capture overhead | 0ms | Already available in autocomplete `onSelect` |
| Expedition card render (with pin indicator) | < 50ms | One extra conditional render, no external calls |
| Atlas page map load | < 3s LCP | Mapbox GL JS ~200KB (gzipped ~65KB), loaded async |
| Trip query with coordinates filter | < 5ms | Small result set (MAX_ACTIVE_TRIPS = 20) |

### Mapbox Bundle Impact

Mapbox GL JS is a large library (~200KB gzipped). It MUST be:
- Loaded only on the `/atlas` page (dynamic import via `next/dynamic` with `ssr: false`).
- NOT imported in expedition cards or any other page.
- Loaded with `loading` fallback (skeleton map).

```typescript
// src/app/[locale]/(app)/atlas/page.tsx
const AtlasMap = dynamic(
  () => import("@/components/features/atlas/AtlasMap"),
  {
    ssr: false,
    loading: () => <MapSkeleton />,
  }
);
```

---

## 8. Testing Strategy

### Unit Tests

**Schema/Validation**:
- `Phase1Schema` accepts valid coordinates (lat: -33.87, lon: 151.21).
- `Phase1Schema` rejects out-of-range lat (> 90 or < -90).
- `Phase1Schema` rejects out-of-range lon (> 180 or < -180).
- `Phase1Schema` rejects partial coordinates (lat without lon).
- `Phase1Schema` accepts missing coordinates (both undefined).

**Phase1Wizard (coordinate capture)**:
- Selecting from autocomplete sets `destinationLat` and `destinationLon` in state.
- Manually editing destination text clears coordinates.
- Submit includes coordinates in action payload.

**ExpeditionCard (pin indicator)**:
- Card with coordinates shows pin icon.
- Card without coordinates does not show pin icon.
- Pin click navigates to `/atlas?center=...`.

**AtlasMap (client component)**:
- Renders map with correct number of pins.
- Pin click navigates to expedition.
- Handles empty trips array (no pins).
- Handles missing Mapbox token gracefully (fallback UI).

### Integration Tests

- Create expedition with destination selected from autocomplete -> coordinates saved to DB.
- Create expedition with manually typed destination -> coordinates are null.
- Atlas page renders pins for trips with coordinates, excludes trips without.
- Atlas page handles BOLA correctly (only shows current user's trips).

### Test Count Estimate

- Validation: 5 tests
- Phase1Wizard coordinate capture: 3 tests
- ExpeditionCard pin: 3 tests
- AtlasMap component: 4 tests
- Integration: 4 tests
- **Total new tests**: ~19

---

## 9. Implementation Notes for Developers

1. **Migration order**: Run `npx prisma migrate dev --name add_destination_coordinates` as the first step. All other changes depend on this.

2. **Prisma Float precision**: Prisma `Float` maps to PostgreSQL `double precision` (64-bit IEEE 754). This is more than sufficient for geographic coordinates. Do NOT use `Decimal` -- it is for financial calculations.

3. **GeoJSON coordinate order**: GeoJSON uses `[longitude, latitude]` (note: lon first, lat second). This is the opposite of common human convention (lat, lon). Be careful when constructing GeoJSON features:
   ```
   coordinates: [trip.destinationLon, trip.destinationLat]  // CORRECT
   coordinates: [trip.destinationLat, trip.destinationLon]  // WRONG
   ```

4. **Mapbox GL JS import**: Use the `mapbox-gl` npm package. CSS must also be imported:
   ```typescript
   import mapboxgl from "mapbox-gl";
   import "mapbox-gl/dist/mapbox-gl.css";
   ```
   Both must be in the dynamically imported component (not in layout or global CSS).

5. **react-simple-maps deprecation path**: The existing `AtlasHeroMap` uses `react-simple-maps`. Per ADR-014 (Sprint 27), the atlas map transitions to Mapbox GL JS. `react-simple-maps` can be removed once the atlas page is fully on Mapbox. Do not remove it in this sprint -- it may still be used elsewhere.

6. **Coordinate clearing UX**: When the user clears the destination field or types a new destination (invalidating the previous autocomplete selection), clear the stored coordinates. This prevents stale coordinates from being saved when the text no longer matches the geocoded result.

7. **Origin coordinates -- NOT in scope**: This spec only covers destination coordinates. Origin coordinates would require a separate pair of fields (`originLat`, `originLon`) and a second autocomplete integration. Defer to a future sprint if needed.

8. **Env var for Mapbox**: Add `NEXT_PUBLIC_MAPBOX_TOKEN` to `.env.local.example`. The atlas page should check for this var and show a helpful error if missing (not a runtime crash).

---

## 10. Open Questions

- [ ] Should we round coordinates to fewer decimal places for privacy? Recommendation: No -- destination coordinates point to cities/landmarks (public places). Full precision is fine. Revisit if we add home address geocoding.
- [ ] Should the atlas page show a world map or auto-fit to the user's destinations? Recommendation: Auto-fit bounds to show all pins with padding. If no pins, show world map centered on user's country (from profile).
- [ ] Should we add an index on `(destinationLat, destinationLon)` for spatial queries? Recommendation: No. At MAX_ACTIVE_TRIPS = 20, filtering in application code is faster than maintaining an index. Revisit if trip count grows significantly.
- [ ] Should expedition cards show a static map thumbnail (Mapbox Static API) in addition to the text pin? Recommendation: Defer to a future sprint. Product-owner to evaluate after atlas page is live.

---

## 11. Vendor Dependencies

| Vendor | Usage | Abstraction Layer | Exit Strategy |
|---|---|---|---|
| Mapbox GL JS | Interactive map on /atlas page | `AtlasMap` client component wrapping mapbox-gl | Replace with Leaflet + OpenStreetMap tiles. Interface is standard GeoJSON features + event handlers. |
| Nominatim (OpenStreetMap) | Geocoding (destination search) | `/api/destinations/search` proxy route | Replace with any geocoding API (Google, Mapbox Geocoding). Same response shape. |

---

## 12. Constraints (MANDATORY)

### Architectural Boundaries
- Coordinates are stored ONLY for destinations, NOT for origins or home addresses.
- Mapbox GL JS is loaded ONLY on the `/atlas` page via dynamic import. Never imported in card components or other pages.
- The Nominatim proxy route (`/api/destinations/search`) is the ONLY source of coordinates. Do not call Nominatim directly from client components.
- `NEXT_PUBLIC_MAPBOX_TOKEN` is a public token (domain-restricted). It is NOT a secret. Do not store it in server-only env.

### Performance Budgets
- Migration: < 1s execution time.
- No additional queries on expedition card rendering (coordinates come from existing trip query).
- Atlas page Mapbox bundle: loaded async, < 65KB gzipped.
- Atlas page LCP: < 3s (map library load + pin render).

### Security Requirements
- Coordinates are NOT PII for destinations (public places).
- No home address geocoding in this spec.
- Mapbox public token is domain-restricted (configure in Mapbox dashboard before production deploy).
- Coordinate validation: Zod schema enforces valid ranges.

### Scalability
- MAX_ACTIVE_TRIPS = 20. Atlas map handles up to 20 pins without clustering.
- If trip count increases significantly, add Mapbox clustering for pin density management.

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-12 | architect | Initial draft |

---

> Draft -- Ready for tech-lead review. Blocked on: `NEXT_PUBLIC_MAPBOX_TOKEN` must be provisioned in Mapbox dashboard and added to `.env.local` before development can test the atlas map. Coordinate capture and persistence can proceed without the token.
