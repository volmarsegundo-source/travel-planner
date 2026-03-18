# Technical Specification: Meu Atlas with Leaflet/OSM

**Spec ID**: SPEC-ARCH-015
**Related Story**: Sprint 31 Planning — Interactive Map
**Author**: architect
**Status**: Draft
**Last Updated**: 2026-03-17

---

## 1. Overview

The current `AtlasHeroMap` component uses `react-simple-maps` with a hardcoded `CITY_COORDS` dictionary of ~40 cities. It cannot zoom, pan, or cluster markers, and every new destination requires a code change. This spec implements the Leaflet + OpenStreetMap decision from ADR-019 (Sprint 30, SPEC-ARCH-012): an interactive `/atlas` page with real trip coordinates, marker clustering, dark mode tiles, and a rewritten dashboard hero map that eliminates the `CITY_COORDS` dictionary entirely. The `react-simple-maps` dependency is removed.

## 2. Architecture Diagram

```
+----------------------------+                     +---------------------------+
| /expeditions (dashboard)   |   trips[] w/ coords | /atlas (dedicated page)   |
|                            | ------------------> |                           |
| AtlasHeroMap (rewritten)   |                     | InteractiveAtlasMap       |
| - Static SVG world map     |                     | - Leaflet MapContainer    |
| - CSS-positioned pins      |                     | - TileLayer (OSM/Carto)   |
| - pointer-events-none      |                     | - MarkerClusterGroup      |
| - No JS map library        |                     | - TripMarkerPopup         |
+----------------------------+                     +---------------------------+
                                                              |
                                                   +----------v-----------+
                                                   | getMapTileConfig()   |
                                                   | (MapProvider)        |
                                                   |                      |
                                                   | light: OSM standard  |
                                                   | dark: CartoDB DM     |
                                                   +----------------------+

Data Flow:
  page.tsx (server) --> db.trip.findMany({ userId, coords NOT null })
                    --> build TripGeoJSON
                    --> pass as props to InteractiveAtlasMap (client)
```

## 3. ADR-019-IMPL: Confirming Leaflet + OSM for Implementation

**Date**: 2026-03-17
**Status**: PROPOSED (confirming ADR-019 from Sprint 30)
**Deciders**: architect, tech-lead

### Context

ADR-019 was proposed in Sprint 30 (SPEC-ARCH-012) selecting Leaflet + OpenStreetMap over Mapbox GL JS and react-simple-maps. Sprint 30 deferred implementation. Sprint 31 implements it. This ADR confirms the decision with no changes to the rationale.

### Decision Reaffirmed

**Leaflet + OpenStreetMap** for the interactive atlas page. **CSS pin overlay** on static SVG for the dashboard hero map. **react-simple-maps removed**.

Key factors unchanged:
- Zero cost (OSM tiles free with attribution)
- ~48KB gzipped vs Mapbox ~230KB
- Sufficient interactivity (pins, popups, clustering -- no 3D terrain needed)
- react-leaflet v4.2.1 (stable, not RC v5)

### Implementation Adjustments from Sprint 30 Spec

| Sprint 30 Proposed | Sprint 31 Actual | Reason |
|---|---|---|
| react-leaflet v5.0.0 (RC) | react-leaflet v4.2.1 (stable) | OQ-4 resolved: avoid RC risk |
| `/api/trips/geo` API route | Server component direct query | No client-side map refresh needed in MVP |
| MapProvider via `window.__MAPBOX_TOKEN__` | MapProvider via import from `@/lib/env` | Cleaner than window global; env var checked server-side, token passed as prop |

### Consequences

Same as ADR-019. No new trade-offs.

---

## 4. Data Model

No schema changes. Coordinates exist on Trip (Sprint 29):

```prisma
model Trip {
  destinationLat Float?
  destinationLon Float?
}
```

### 4.1 TripGeoJSON (Server-Side Construction)

```typescript
// src/lib/map/types.ts (isomorphic)

export interface TripGeoFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number]; // [lon, lat] -- GeoJSON standard, NOT [lat, lon]
  };
  properties: {
    tripId: string;
    destination: string;
    currentPhase: number;
    status: string;         // "PLANNING" | "IN_PROGRESS" | "COMPLETED"
    startDate: string | null;
    coverEmoji: string;
  };
}

export interface TripGeoJSON {
  type: "FeatureCollection";
  features: TripGeoFeature[];
}
```

CRITICAL: GeoJSON uses `[longitude, latitude]` order. This is the single most common map bug. The type name `coordinates: [lon, lat]` is intentionally commented to prevent mistakes.

### 4.2 Pin Color Mapping

| Trip Status | Marker Color | Hex |
|---|---|---|
| PLANNING | Yellow | `#EAB308` (amber-500) |
| IN_PROGRESS (any phase active) | Blue | `#3B82F6` (blue-500) |
| COMPLETED | Green | `#22C55E` (green-500) |

Status derivation:
- `COMPLETED`: `trip.status === "COMPLETED"`
- `IN_PROGRESS`: `trip.currentPhase > 1` AND status is `PLANNING` (user is actively working)
- `PLANNING`: default (phase 1, no progress beyond creation)

Note: The `Trip.status` enum has `PLANNING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`. We only show pins for non-cancelled, non-deleted trips.

## 5. API Contract

### Server Component Direct Query (Primary)

No API route for MVP. The `/atlas/page.tsx` server component queries trips directly:

```typescript
// src/app/[locale]/(app)/atlas/page.tsx

const trips = await db.trip.findMany({
  where: {
    userId: session.user.id,
    deletedAt: null,
    status: { not: "CANCELLED" },
    destinationLat: { not: null },
    destinationLon: { not: null },
  },
  select: {
    id: true,
    destination: true,
    currentPhase: true,
    status: true,
    startDate: true,
    coverEmoji: true,
    destinationLat: true,
    destinationLon: true,
  },
  orderBy: { createdAt: "desc" },
});
```

BOLA: `userId: session.user.id` ensures user can only see their own trips.

### Future: GET /api/trips/geo (Deferred)

Reserved for client-side map refresh after trip creation. Not in Sprint 31 scope. When implemented, must include auth check + BOLA + rate limit (30 req/min).

## 6. Component Architecture

### 6.1 New Files

```
src/lib/map/
  types.ts                         -- TripGeoJSON, TripGeoFeature types (isomorphic)
  map-provider.ts                  -- getMapTileConfig() (isomorphic)
  build-geojson.ts                 -- buildTripGeoJSON(trips) helper (isomorphic)
  mercator.ts                      -- toMercatorXY() for hero map CSS pins (isomorphic)

src/components/features/atlas/
  InteractiveAtlasMap.tsx           -- Leaflet map with markers + clustering (client)
  TripMarkerPopup.tsx               -- Popup content for trip pin click (client)
  AtlasMapSkeleton.tsx              -- Loading state while Leaflet loads (client)

src/app/[locale]/(app)/atlas/
  page.tsx                          -- Server component: auth, query, build GeoJSON
  loading.tsx                       -- Suspense fallback
```

### 6.2 Modified Files

```
src/components/features/dashboard/
  AtlasHeroMap.tsx                  -- REWRITE: CSS pins on static SVG (remove react-simple-maps)
```

### 6.3 Removed Files/Deps

```
- react-simple-maps (uninstall)
- CITY_COORDS dictionary (in AtlasHeroMap.tsx -- eliminated)
```

### 6.4 InteractiveAtlasMap Component

```typescript
// src/components/features/atlas/InteractiveAtlasMap.tsx
"use client";

import dynamic from "next/dynamic";
import type { TripGeoJSON } from "@/lib/map/types";

// Leaflet requires DOM -- must use dynamic import with ssr: false
const LeafletMap = dynamic(() => import("./LeafletMapInner"), {
  ssr: false,
  loading: () => <AtlasMapSkeleton />,
});

interface InteractiveAtlasMapProps {
  geoData: TripGeoJSON;
}

export function InteractiveAtlasMap({ geoData }: InteractiveAtlasMapProps) {
  return <LeafletMap geoData={geoData} />;
}
```

The inner `LeafletMapInner.tsx` component uses `react-leaflet` directly:

```typescript
// src/components/features/atlas/LeafletMapInner.tsx
"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";
import L from "leaflet";
import { useTheme } from "next-themes";
import { getMapTileConfig } from "@/lib/map/map-provider";
import { TripMarkerPopup } from "./TripMarkerPopup";
import type { TripGeoJSON } from "@/lib/map/types";

import "leaflet/dist/leaflet.css";

// Fix Leaflet default icon path issue with bundlers
delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});
```

### 6.5 MapProvider

```typescript
// src/lib/map/map-provider.ts (isomorphic)

export interface MapTileConfig {
  url: string;
  attribution: string;
  maxZoom: number;
}

export function getMapTileConfig(theme: "light" | "dark" = "light"): MapTileConfig {
  if (theme === "dark") {
    return {
      url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
    };
  }

  return {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
    maxZoom: 19,
  };
}
```

No Mapbox fallback in Sprint 31. If Mapbox is needed later, extend `getMapTileConfig` with a third branch keyed on env var presence.

### 6.6 Mercator Projection (Hero Map)

```typescript
// src/lib/map/mercator.ts (isomorphic, pure math)

/**
 * Convert lat/lon to X/Y pixel coordinates using Mercator projection.
 * Used for positioning CSS pins on the static hero map SVG.
 *
 * @param lat  Latitude (-90 to 90)
 * @param lon  Longitude (-180 to 180)
 * @param width  Container width in pixels
 * @param height Container height in pixels
 * @returns { x, y } pixel coordinates
 */
export function toMercatorXY(
  lat: number,
  lon: number,
  width: number,
  height: number
): { x: number; y: number } {
  const x = ((lon + 180) / 360) * width;
  const latRad = (lat * Math.PI) / 180;
  const y =
    height / 2 -
    (width * Math.log(Math.tan(Math.PI / 4 + latRad / 2))) / (2 * Math.PI);
  return { x, y };
}
```

### 6.7 AtlasHeroMap Rewrite

The rewritten hero map:
- Uses an inline or `/public/world-map.svg` static SVG world map
- Renders pins as absolutely positioned `<div>` elements via `toMercatorXY()`
- Uses `destinationLat`/`destinationLon` from trip data (no more `CITY_COORDS`)
- `pointer-events-none` on the container (decorative only)
- `aria-hidden="true"` (no interactive content)
- Includes a "View full map" link (`pointer-events-auto`) in the bottom-right corner, linking to `/atlas`

Props change:

```typescript
// Before (broken)
interface AtlasHeroMapProps {
  destinations?: string[];
}

// After
interface AtlasHeroMapProps {
  pins: Array<{
    lat: number;
    lon: number;
    status: string;
  }>;
}
```

Callers must pass real coordinates instead of destination name strings.

## 7. Clustering Strategy

- Use `react-leaflet-markercluster` (wrapper around `leaflet.markercluster`)
- Cluster radius: 50px
- Cluster click: zoom to bounds of contained markers (`zoomToBoundsOnClick: true`)
- Individual marker click: show `TripMarkerPopup` with trip details + "View Expedition" link
- Cluster icon: circular badge with count, gold background (`#C9973A`)
- Max zoom for unclustering: 13

With `MAX_ACTIVE_TRIPS = 20`, clustering is mostly relevant at zoom-out (world view) where nearby destinations overlap.

## 8. Dark Mode Support

Theme detection via `useTheme()` from `next-themes` (already installed).

| Theme | Tile Provider | URL |
|---|---|---|
| Light | OpenStreetMap standard | `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` |
| Dark | CartoDB Dark Matter | `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png` |

When theme changes, the `TileLayer` `url` prop updates reactively. Leaflet handles tile reloading automatically when the `url` key changes. Use React `key` prop on `TileLayer` to force remount on theme change (Leaflet does not detect `url` prop changes natively in react-leaflet v4).

## 9. Dynamic Import (SSR Safety)

Leaflet requires DOM APIs (`window`, `document`). Must use Next.js `dynamic()` with `ssr: false`.

Pattern: Outer wrapper (`InteractiveAtlasMap.tsx`) uses `dynamic()` to load the inner component (`LeafletMapInner.tsx`). The outer wrapper is safe to import from server components.

Loading state: `AtlasMapSkeleton` shows a gray container with a subtle pulse animation and "Loading map..." text. Same dimensions as the final map to prevent layout shift.

## 10. Security Considerations

- **No PII in GeoJSON**: Only tripId, destination name, phase, dates, emoji, status. No user data, no booking codes.
- **BOLA protection**: Server component query filters by `userId` from session. No trip data from other users.
- **Tile requests**: OSM/CartoDB tiles are public CDN resources. No auth tokens in tile URLs. No privacy concern.
- **Coordinates exposure**: Trip lat/lon are user-entered (from autocomplete) and not sensitive. They represent travel destinations, not user locations.
- **CSP**: OSM tile domains (`*.tile.openstreetmap.org`, `*.basemaps.cartocdn.com`) must be added to `img-src` in CSP headers (middleware.ts).

## 11. Performance Requirements

| Metric | Target |
|---|---|
| Atlas page initial load (20 pins) | < 2s (including Leaflet dynamic import) |
| Tile first paint | < 1s (CDN-cached tiles) |
| Marker cluster recalculation | < 50ms for 20 markers |
| Hero map CSS pins render | < 100ms (no JS library) |
| Bundle impact (Leaflet) | < 50KB gzipped, loaded only on /atlas via code splitting |
| Hero map rewrite bundle delta | -15KB (remove react-simple-maps + d3-geo transitive) |

## 12. Testing Strategy

### Unit Tests
- `toMercatorXY()`: edge cases -- equator (lat=0), poles (lat=85), antimeridian (lon=180/-180), typical cities
- `getMapTileConfig()`: returns correct URLs for light/dark themes
- `buildTripGeoJSON()`: correct [lon, lat] order, skips trips with null coordinates, maps status to pin color

### Integration Tests
- Atlas `page.tsx`: mock Prisma, verify GeoJSON construction and BOLA filtering
- Hero map: verify pin count matches trips with coordinates

### E2E Tests (Playwright)
- Navigate to `/atlas`, verify `.leaflet-container` is rendered
- Verify marker count matches number of trips with coordinates
- Click a marker, verify popup shows destination name and "View Expedition" link
- Verify popup link navigates to `/expedition/{tripId}/summary`
- Dark mode toggle: verify tile URL changes (check network requests or tile class)

### Visual Regression
- Hero map: screenshot comparison before/after rewrite (pin positions should approximately match)

## 13. Dependencies

| Package | Version | License | Bundle Size | Purpose | New? |
|---|---|---|---|---|---|
| `leaflet` | ^1.9.4 | BSD-2-Clause | ~40KB gz | Map rendering engine | YES |
| `react-leaflet` | ^4.2.1 | MIT | ~8KB gz | React bindings | YES |
| `react-leaflet-markercluster` | ^3.0.0 | MIT | ~3KB gz | Marker clustering wrapper | YES |
| `@types/leaflet` | ^1.9.12 | MIT | -- | TypeScript types | YES (devDep) |

**Removed**: `react-simple-maps` (^3.0.0, ISC). Also removes transitive `d3-geo`, `d3-selection`, `topojson-client`.

Net bundle: +51KB (Leaflet stack) - ~20KB (react-simple-maps + transitive d3) = +31KB. But Leaflet is loaded only on `/atlas` via dynamic import, not on every page. Hero map has zero JS library cost.

### Static Assets

Copy Leaflet default marker icons to `/public/leaflet/`:
- `marker-icon.png` (25x41)
- `marker-icon-2x.png` (50x82)
- `marker-shadow.png` (41x41)

These are needed because bundlers break Leaflet's default icon path resolution.

## 14. Migration Path

### Phase 1: Infrastructure (Non-breaking)
1. Install `leaflet`, `react-leaflet`, `react-leaflet-markercluster`, `@types/leaflet`
2. Create `src/lib/map/` directory with types, map-provider, build-geojson, mercator
3. Copy Leaflet marker icons to `/public/leaflet/`
4. Add OSM/CartoDB domains to CSP `img-src` in `src/middleware.ts`

### Phase 2: Atlas Page (Additive, non-breaking)
1. Create `src/components/features/atlas/` components
2. Create `/atlas/page.tsx` server component
3. Add "Meu Atlas" nav link to `AuthenticatedNavbar`

### Phase 3: Hero Map Rewrite (Breaking for AtlasHeroMap callers)
1. Rewrite `AtlasHeroMap.tsx` to CSS pins + static SVG
2. Update all callers to pass `pins` prop (lat/lon/status) instead of `destinations` (string[])
3. Add "View full map" link to hero map
4. Uninstall `react-simple-maps`
5. Remove any `overrides` for react-simple-maps in `package.json`

## 15. i18n

New translation keys:

```json
{
  "atlas": {
    "title": "Meu Atlas",
    "pageDescription": "Veja todos os seus destinos no mapa",
    "noTrips": "Nenhuma expedicao com coordenadas ainda. Crie uma expedicao para ver seus pins no mapa.",
    "viewExpedition": "Ver expedicao",
    "loading": "Carregando mapa...",
    "viewFullMap": "Ver mapa completo",
    "pinStatus": {
      "planning": "Planejando",
      "in_progress": "Em andamento",
      "completed": "Concluida"
    }
  }
}
```

## 16. Open Questions

- [x] **OQ-1** (from SPEC-ARCH-012): Atlas as top-level nav item. **Resolved**: Yes, `/atlas` as top-level. Added to `AuthenticatedNavbar`.
- [x] **OQ-3** (from SPEC-ARCH-012): Hero map "View full map" link. **Resolved**: Yes, bottom-right corner.
- [x] **OQ-4** (from SPEC-ARCH-012): react-leaflet version. **Resolved**: v4.2.1 (stable).
- [ ] **OQ-5**: Should the atlas page show a legend for pin colors? Recommendation: yes, small inline legend below map.
- [ ] **OQ-6**: Should pins for trips without coordinates show a warning badge on the expeditions list? Recommendation: defer, low priority.

## 17. Definition of Done

- [ ] Leaflet-based interactive map on `/atlas` page with trip pins
- [ ] 3 pin colors: yellow (planning), blue (in-progress), green (completed)
- [ ] Marker clustering via react-leaflet-markercluster
- [ ] Trip marker popup with destination, dates, emoji, phase, "View Expedition" link
- [ ] Dark mode tile support (CartoDB Dark Matter) with reactive theme switching
- [ ] CSS-based hero map replacing react-simple-maps
- [ ] `CITY_COORDS` dictionary eliminated
- [ ] `react-simple-maps` dependency removed
- [ ] `MapProvider` abstraction (`getMapTileConfig`) for tile source swapping
- [ ] Dynamic import with `ssr: false` and loading skeleton
- [ ] GeoJSON uses correct `[lon, lat]` coordinate order (verified by unit test)
- [ ] BOLA protection on trip query (userId filter)
- [ ] CSP updated with OSM/CartoDB tile domains
- [ ] Unit tests: mercator projection, GeoJSON builder, map-provider
- [ ] E2E test: atlas page rendering, marker click, popup navigation
- [ ] ADR-019-IMPL accepted by tech-lead
- [ ] Unit test coverage >= 80% for new code

> PROPOSED -- Awaiting tech-lead review before implementation begins
