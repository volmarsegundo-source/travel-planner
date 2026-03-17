# Technical Specification: Map Architecture Rewrite

**Spec ID**: SPEC-ARCH-012
**Related Story**: REWRITE-2 (Sprint 30 Planning)
**Author**: architect
**Status**: Draft
**Last Updated**: 2026-03-17

---

## 1. Overview

The current map implementation (`AtlasHeroMap.tsx`) uses `react-simple-maps` with a hardcoded `CITY_COORDS` dictionary of ~40 cities. This approach does not scale (every new destination requires a code change), renders as SVG (not interactive), and cannot support clustering, zoom, or pan. This spec replaces `react-simple-maps` with Leaflet + OpenStreetMap tiles for interactive maps, introduces a `MapProvider` abstraction for future tile source swaps, and leverages the real coordinates already stored in `Trip.destinationLat` / `Trip.destinationLon`.

## 2. Architecture Diagram

```
+-------------------+                        +---------------------+
| /expeditions      |  trips[] with lat/lon  | /atlas              |
| (dashboard page)  | ───────────────────>   | (dedicated map page)|
|                   |                        |                     |
| AtlasHeroMap      |                        | InteractiveAtlasMap |
| (decorative,      |                        | (full-screen,       |
|  non-interactive) |                        |  pan/zoom/cluster)  |
+--------+----------+                        +----------+----------+
         |                                              |
         v                                              v
+-------------------+                        +---------------------+
| CSS pin overlay   |                        | MapContainer        |
| (no JS map lib)   |                        | (Leaflet via        |
|                   |                        |  react-leaflet)     |
+-------------------+                        +---------------------+
                                                        |
                                             +----------v----------+
                                             | TileLayer           |
                                             | (OpenStreetMap)     |
                                             | OR MapboxTileLayer  |
                                             | (via MapProvider)   |
                                             +---------------------+
                                                        |
                                             +----------v----------+
                                             | GeoJSON layer       |
                                             | Marker clusters     |
                                             | (leaflet.markercluster)
                                             +---------------------+
```

## 3. ADR-019: Map Library Selection

**Date**: 2026-03-17
**Status**: PROPOSED
**Deciders**: architect, tech-lead

### Context

The project has two distinct map needs:
1. **Dashboard hero map**: Decorative, shows destination pins on a world map. Current: `react-simple-maps` (SVG).
2. **Atlas page**: Interactive, pan/zoom, clustering, click-to-navigate. Current: does not exist (planned since Sprint 27 SPEC-ARCH-002).

`react-simple-maps` was adequate for the decorative hero but cannot serve the interactive atlas. We need to select one library that serves both needs (or explicitly split the approaches).

### Options Considered

| Criteria (weight) | Leaflet + OSM (A) | Mapbox GL JS (B) | react-simple-maps (current, C) |
|---|---|---|---|
| **Interactivity** (25%) | Full: zoom, pan, markers, popups, clusters | Full: same + 3D terrain, bearing | SVG only: no zoom/pan without custom code |
| **Bundle size** (20%) | ~40KB gzipped (leaflet) + ~8KB (react-leaflet) | ~230KB gzipped (mapbox-gl) | ~15KB (react-simple-maps + d3-geo) |
| **Cost** (20%) | $0 (OSM tiles free, attribution required) | Free tier 50k loads/month, then $0.50/1k loads | $0 |
| **Tile quality** (15%) | Good (OSM standard tiles) | Excellent (vector tiles, custom styles) | N/A (SVG topology) |
| **SSR compatibility** (10%) | `ssr: false` dynamic import required (Canvas) | `ssr: false` dynamic import required (WebGL) | Works with SSR (SVG) |
| **Clustering** (10%) | `leaflet.markercluster` (mature, MIT) | Built-in `clusterProperties` | Manual SVG grouping |
| **Weighted Score** | **38/50** | **36/50** | **18/50** |

### Decision

**Option A: Leaflet + OpenStreetMap** for the interactive atlas page.

For the dashboard hero map, **replace `react-simple-maps` with a lightweight CSS-only pin overlay** on a static world map SVG. This eliminates the `react-simple-maps` dependency entirely (saving ~15KB + d3-geo transitive deps) and removes the `CITY_COORDS` dictionary hack.

Primary reasons:
- **Zero cost**: OSM tiles are free with attribution. No token management for tiles.
- **Half the bundle**: Leaflet is ~48KB vs Mapbox GL JS ~230KB.
- **Sufficient for our needs**: We need pins + popups + clustering, not 3D terrain or custom vector styling.
- **Mature ecosystem**: `react-leaflet` v5 has stable React 18/19 support. `leaflet.markercluster` is battle-tested.
- **License**: Leaflet is BSD-2-Clause. OSM tiles require ODbL attribution (link in footer).

If future requirements demand custom-styled vector tiles (e.g., dark mode map matching our Atlas theme), we can swap the tile layer via `MapProvider` to Mapbox without changing component code.

### Consequences

**Positive**:
- Eliminates `react-simple-maps` dependency (-15KB + d3-geo transitive)
- No API key needed for tile rendering (OSM)
- Interactive map with zoom, pan, popups, clustering
- `CITY_COORDS` dictionary eliminated -- real coordinates from DB

**Negative / Trade-offs**:
- Leaflet uses raster tiles (OSM) -- less visually polished than Mapbox vector tiles
- Leaflet's dark-mode support requires a separate tile provider (CartoDB Dark Matter) or CSS filter
- Two new dependencies: `leaflet` + `react-leaflet`

**Risks**:
- `react-leaflet` v5 is in RC -- verify stability before implementation
- OSM tile servers may throttle heavy usage (mitigated: we load tiles only on /atlas page, not on every dashboard view)

---

## 4. Data Model

No schema changes. Coordinates already exist:

```prisma
model Trip {
  destinationLat Float?  // Added Sprint 29
  destinationLon Float?  // Added Sprint 29
}
```

### GeoJSON Construction (Server-Side)

Trips with coordinates are transformed into GeoJSON for the map layer:

```typescript
interface TripGeoJSON {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: {
      type: "Point";
      coordinates: [number, number]; // [lon, lat] -- GeoJSON standard
    };
    properties: {
      tripId: string;
      destination: string;
      currentPhase: number;
      startDate: string | null;
      coverEmoji: string;
    };
  }>;
}
```

CRITICAL: GeoJSON uses `[longitude, latitude]` order, NOT `[latitude, longitude]`. This is the single most common map bug.

## 5. Component Architecture

### 5.1 Dashboard Hero Map (Decorative)

Replace `AtlasHeroMap` with a CSS-based approach:

```
src/components/features/dashboard/
  AtlasHeroMap.tsx          -- REWRITE: static SVG world map + CSS pin overlay
```

The rewritten component:
- Uses a pre-rendered SVG world map (inline or loaded from `/public/world-map.svg`)
- Renders pins as absolutely positioned `<div>` elements using Mercator projection math
- No JavaScript map library needed
- `pointer-events-none` on the entire container (decorative only)
- Pins use the existing `destinationLat` / `destinationLon` from trip data (no more `CITY_COORDS` dictionary)

Mercator projection for pin placement:
```typescript
function toMercatorXY(lat: number, lon: number, width: number, height: number) {
  const x = ((lon + 180) / 360) * width;
  const latRad = (lat * Math.PI) / 180;
  const y = (height / 2) - (width * Math.log(Math.tan(Math.PI / 4 + latRad / 2)) / (2 * Math.PI));
  return { x, y };
}
```

### 5.2 Interactive Atlas Map (New Page)

```
src/components/features/atlas/
  InteractiveAtlasMap.tsx   -- NEW: Leaflet map with markers + clustering
  TripMarkerPopup.tsx       -- NEW: Popup content for trip pins
  MapControls.tsx           -- NEW: Dark mode toggle, fit-bounds button

src/app/[locale]/(app)/atlas/
  page.tsx                  -- NEW: server component, fetches trips with coords
```

### 5.3 MapProvider Interface

```typescript
// src/lib/map/map-provider.ts (isomorphic)

export interface MapTileConfig {
  url: string;
  attribution: string;
  maxZoom: number;
  accessToken?: string;
}

export function getMapTileConfig(theme: "light" | "dark" = "light"): MapTileConfig {
  // If Mapbox token is available, use Mapbox tiles for better visual quality
  if (typeof window !== "undefined" && window.__MAPBOX_TOKEN__) {
    return {
      url: `https://api.mapbox.com/styles/v1/mapbox/${theme === "dark" ? "dark-v11" : "light-v11"}/tiles/{z}/{x}/{y}?access_token=${window.__MAPBOX_TOKEN__}`,
      attribution: '&copy; <a href="https://www.mapbox.com/">Mapbox</a>',
      maxZoom: 18,
    };
  }

  // Default: OpenStreetMap (free, no token)
  if (theme === "dark") {
    return {
      url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
    };
  }

  return {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
    maxZoom: 19,
  };
}
```

## 6. API Contract

### Endpoint: GET /api/trips/geo (NEW)

Returns GeoJSON for all user trips that have coordinates.

**Auth**: Required
**Rate Limit**: 30 req/min (map page loads)

**Response (200)**:
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [139.6503, 35.6762]
      },
      "properties": {
        "tripId": "clx...",
        "destination": "Toquio, Japao",
        "currentPhase": 4,
        "startDate": "2026-06-15",
        "coverEmoji": "🗼"
      }
    }
  ]
}
```

**Error Responses**:
- 401: `{ "error": "Unauthorized" }`

### Alternative: Server Component Direct Query

For the `/atlas` page, the GeoJSON can be constructed directly in `page.tsx` (server component) and passed as props, avoiding an extra API call. The `/api/trips/geo` endpoint is reserved for future client-side map updates (e.g., after creating a new trip) via TanStack Query.

## 7. Clustering Strategy

For users with many trips (up to `MAX_ACTIVE_TRIPS = 20`), clustering is not strictly necessary but provides a cleaner zoom-out view.

- Use `leaflet.markercluster` for automatic clustering
- Cluster radius: 50px at zoom levels < 5
- Cluster click: zoom to bounds of contained markers
- Individual marker click: show `TripMarkerPopup` with trip details + "View Expedition" link
- Cluster colors: match Atlas theme (gold for multi-pin clusters)

## 8. Dynamic Import (SSR Safety)

Leaflet requires DOM APIs (Canvas/SVG). Must use Next.js dynamic import:

```typescript
// src/components/features/atlas/InteractiveAtlasMap.tsx

import dynamic from "next/dynamic";

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
```

Loading state: Show the static world map SVG (same as hero) with a "Loading map..." overlay while Leaflet initializes.

## 9. Dark Mode Support

The Atlas app uses dark theme by default. Map tiles must match.

| Theme | Tile Provider | URL |
|---|---|---|
| Light | OpenStreetMap standard | `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` |
| Dark | CartoDB Dark Matter | `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png` |

Theme detection via `useTheme()` from `next-themes` (already installed). Tile layer swaps reactively when theme changes.

## 10. Security Considerations

- **No PII in GeoJSON**: Only tripId, destination name, phase, dates, emoji. No user data.
- **BOLA protection**: GeoJSON API route (and server component query) filter by `userId` from session.
- **Tile proxy**: Not needed. OSM/CartoDB tiles are public CDN resources. No auth tokens in URLs.
- **Mapbox token (if used)**: Only for tile rendering (client-side). Scope-restrict to `styles:tiles` + `styles:read`. The token is inherently public (sent in tile URLs) -- restrict via Mapbox dashboard URL allowlist.

## 11. Performance Requirements

| Metric | Target |
|---|---|
| Atlas page initial load (with 20 trip pins) | < 2s (including Leaflet dynamic import) |
| Tile load (first paint) | < 1s (CDN-cached tiles) |
| Marker cluster recalculation | < 50ms for 20 markers |
| Dashboard hero map (CSS pins) | < 100ms render (no JS library) |
| Bundle impact (Leaflet) | < 50KB gzipped (loaded only on /atlas page) |

## 12. Testing Strategy

### Unit Tests
- `toMercatorXY`: edge cases (poles, antimeridian, equator)
- `getMapTileConfig`: returns correct URLs for light/dark/Mapbox
- GeoJSON construction: correct [lon, lat] order, handles null coordinates

### Integration Tests
- `/api/trips/geo`: returns only trips with coordinates, respects BOLA
- Atlas page server component: fetches and passes GeoJSON correctly

### E2E Tests (Playwright)
- Navigate to /atlas, see map container rendered
- Verify trip markers appear at expected screen positions
- Click marker, verify popup shows trip destination and "View" link
- Dark mode toggle: tile layer changes

## 13. Dependencies

| Package | Version | License | Purpose | New? |
|---|---|---|---|---|
| `leaflet` | ^1.9.4 | BSD-2-Clause | Map rendering engine | YES |
| `react-leaflet` | ^5.0.0 | MIT | React bindings for Leaflet | YES |
| `leaflet.markercluster` | ^1.5.3 | MIT | Marker clustering | YES |
| `@types/leaflet` | ^1.9.12 | MIT | TypeScript types | YES (devDep) |

**Removed**: `react-simple-maps` (^3.0.0, ISC license). Also removes transitive d3-geo dependencies.

Net bundle impact: +48KB (Leaflet) - 15KB (react-simple-maps) = +33KB, but Leaflet is loaded only on /atlas page via dynamic import, not on every page.

## 14. Migration Path

### Phase 1: Create Atlas Page (Non-breaking)
1. Install `leaflet`, `react-leaflet`, `leaflet.markercluster`, `@types/leaflet`
2. Create `src/lib/map/map-provider.ts`
3. Create `InteractiveAtlasMap.tsx`, `TripMarkerPopup.tsx`, `MapControls.tsx`
4. Create `/atlas/page.tsx` server component
5. Add navigation link to atlas page from dashboard

### Phase 2: Replace Hero Map (Breaking for AtlasHeroMap)
1. Rewrite `AtlasHeroMap.tsx` to use CSS pins + static SVG
2. Remove `CITY_COORDS` dictionary
3. Update `ExpeditionsList` / `ExpeditionCard` to pass coordinates to hero map
4. Uninstall `react-simple-maps`
5. Remove overrides from `package.json`

### Phase 3: Optional API Route
1. Create `/api/trips/geo` for client-side map refresh
2. Add TanStack Query integration for real-time pin updates

## 15. Open Questions

- [ ] **OQ-1**: Should the atlas page be a top-level nav item or nested under expeditions? SPEC-ARCH-002 (Sprint 27) proposed `/atlas` as a top-level route. Recommendation: keep `/atlas` as proposed.
- [ ] **OQ-2**: Should we support pin-to-select-destination (reverse geocoding from map click)? Nice-to-have for Sprint 31+, not MVP.
- [ ] **OQ-3**: Should the hero map show a "View full map" link to /atlas? Recommendation: yes, bottom-right corner.
- [ ] **OQ-4**: `react-leaflet` v5 is RC. Should we pin to v4 (stable) instead? Recommendation: use v4.2.1 (latest stable) to avoid RC risk. Upgrade to v5 when stable.

## 16. Definition of Done

- [ ] Leaflet-based interactive map on `/atlas` page with trip pins
- [ ] Marker clustering for zoom-out views
- [ ] Trip marker popup with destination, dates, emoji, phase, "View" link
- [ ] Dark mode tile support (CartoDB Dark Matter)
- [ ] CSS-based hero map replacing react-simple-maps
- [ ] `CITY_COORDS` dictionary eliminated
- [ ] `react-simple-maps` dependency removed
- [ ] `MapProvider` abstraction for tile source swapping
- [ ] Dynamic import with SSR-safe loading state
- [ ] GeoJSON uses correct [lon, lat] coordinate order
- [ ] BOLA protection on all trip queries
- [ ] Unit tests for projection math and GeoJSON construction
- [ ] E2E test for atlas page rendering
- [ ] ADR-019 accepted by tech-lead

> PROPOSED -- Awaiting tech-lead review before implementation begins
