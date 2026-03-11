# SPEC-ARCH-002: Navigation Restructure -- Expeditions List + Atlas Map

**Version**: 1.0.0
**Status**: Draft
**Author**: architect
**Reviewers**: [tech-lead, ux-designer, qa-engineer]
**Product Spec**: TBD (Sprint 27 backlog)
**UX Spec**: TBD
**Created**: 2026-03-11
**Last Updated**: 2026-03-11

---

## 1. Overview

The current "Meu Atlas" page (`/dashboard`) combines two distinct concerns into a single view: (1) a list of expedition cards with progress tracking and actions, and (2) a decorative hero map with pins for each destination. As the number of expeditions grows, these two functions compete for screen real estate and serve different user intents.

This spec defines the architecture for splitting the dashboard into two dedicated pages:
- **/expeditions** -- A focused expedition management view (cards only, no map).
- **/atlas** -- A full-screen interactive map showing all destinations with color-coded pins reflecting expedition status.

The header navigation will be updated to expose both routes.

---

## 2. Architecture Decision Records

### ADR-014: Page Split Strategy for Dashboard Decomposition

- **Status**: Proposed
- **Context**: The current `/dashboard` page renders `AtlasDashboard`, which includes `AtlasHeroMap` (a react-simple-maps `ComposableMap`) and a list of `ExpeditionCard` components. The map is decorative (pointer-events-none, aria-hidden), uses a hardcoded coordinate lookup table (`CITY_COORDS` with ~40 entries), and does not support interaction. Users need (a) a fast expedition management view for daily use and (b) a visual map for planning and overview.
- **Decision**: Create two new routes (`/expeditions` and `/atlas`) as separate Next.js pages. `/dashboard` will redirect to `/expeditions` for backward compatibility. The map page will use a richer, interactive implementation with Mapbox GL JS (already in the tech stack per ADR-001).
- **Consequences**:
  - **Positive**: Each page has a single responsibility. The expeditions page loads faster (no map library). The map page can be optimized independently (lazy load, canvas rendering).
  - **Negative**: Two pages share trip data. Need to avoid duplicate fetches.
  - **Risk**: SEO/bookmark breakage for users who bookmarked `/dashboard`. Mitigated by redirect.
- **Alternatives Considered**:
  - Tab-based split on single page: Simpler routing but still loads both components. Rejected for performance.
  - Keep combined: Does not scale. Rejected.

### ADR-015: Map Pin Data Architecture -- Server Revalidation vs Real-Time

- **Status**: Proposed
- **Context**: The atlas map needs pin data (coordinates, status, destination name, phase) for all user expeditions. This data changes infrequently (only when a phase advances or a new expedition is created). We need to decide how the map stays in sync.
- **Decision**: Use Next.js server-side data fetching with ISR-style revalidation. The `/atlas` page is a Server Component that fetches trip data at request time. For "real-time" feel when navigating back from an expedition, use `router.refresh()` (already used in Phase 6). No SSE or WebSocket needed -- phase changes are user-initiated and infrequent.
- **Consequences**:
  - **Positive**: Zero infrastructure complexity. No WebSocket server. Consistent with existing patterns.
  - **Negative**: If user completes a phase in another tab, the map tab will show stale data until refresh.
  - **Risk**: Acceptable for MVP. Future enhancement could add `visibilitychange` listener to trigger `router.refresh()` when tab regains focus.
- **Alternatives Considered**:
  - SSE/WebSocket: Real-time but requires persistent connection infrastructure (Redis pub/sub, WebSocket server). Over-engineered for user-initiated updates. Rejected.
  - Polling (setInterval): Simple but wasteful. 30s polling for data that changes once per hour. Rejected.
  - `visibilitychange` + refresh: Good middle ground for future. Not needed for MVP.

---

## 3. System Design

### 3.1 Route Architecture

```
Current:
  /dashboard  -->  AtlasDashboard (map + cards)

Proposed:
  /dashboard  -->  301 redirect to /expeditions
  /expeditions  -->  ExpeditionsPage (cards only, fast)
  /atlas        -->  AtlasMapPage (interactive map, richer)
```

### 3.2 Component Architecture

```
src/app/[locale]/(app)/
  dashboard/page.tsx          <-- redirect to /expeditions
  expeditions/page.tsx        <-- NEW: Server Component, fetches trips
  atlas/page.tsx              <-- NEW: Server Component, fetches trips + coords

src/components/features/
  expeditions/
    ExpeditionsList.tsx       <-- Client: card list + empty state + "new" CTA
    ExpeditionCard.tsx        <-- MOVED from dashboard/ (no changes)
  atlas/
    AtlasInteractiveMap.tsx   <-- Client: Mapbox GL JS map with pins
    AtlasMapPin.tsx           <-- Pin component with status color + tooltip
```

### 3.3 Data Flow

```
                    +-----------------+
                    |   Prisma DB     |
                    +--------+--------+
                             |
              +--------------+--------------+
              |                             |
    +---------v---------+       +-----------v-----------+
    | /expeditions      |       | /atlas                |
    | (Server Component)|       | (Server Component)    |
    |                   |       |                       |
    | Fetches: trips,   |       | Fetches: trips,       |
    |   phases,         |       |   phases,             |
    |   checklist stats |       |   coordinates (lat/lon)|
    +---------+---------+       +-----------+-----------+
              |                             |
    +---------v---------+       +-----------v-----------+
    | ExpeditionsList   |       | AtlasInteractiveMap   |
    | (Client Component)|       | (Client Component)    |
    |                   |       |                       |
    | Renders cards     |       | Renders Mapbox map    |
    | ExpeditionCard[]  |       | with colored pins     |
    +-------------------+       +-----------------------+
```

### 3.4 Shared Data Service

Both pages need trip data. To avoid code duplication, extract a shared service function:

```typescript
// src/server/services/trip.service.ts (extend existing)

interface ExpeditionListItem {
  id: string;
  destination: string;
  currentPhase: number;
  completedPhases: number;
  totalPhases: number;
  coverEmoji: string;
  checklistRequired: number;
  checklistRequiredDone: number;
  checklistRecommendedPending: number;
  hasItineraryPlan: boolean;
  startDate: string | null;
  endDate: string | null;
}

interface AtlasMapItem {
  id: string;
  destination: string;
  currentPhase: number;
  completedPhases: number;
  totalPhases: number;
  latitude: number | null;   // from Trip or DestinationGuide
  longitude: number | null;  // from Trip or DestinationGuide
  status: "planning" | "in_progress" | "completed";
}

// Existing method already provides most of ExpeditionListItem:
// TripService.getUserTripsWithExpeditionData(userId)

// New method for atlas:
static async getUserTripsForAtlas(userId: string): Promise<AtlasMapItem[]>
```

### 3.5 Coordinate Resolution

**Current state**: `AtlasHeroMap` uses a hardcoded `CITY_COORDS` lookup table (~40 cities). This is brittle and incomplete.

**Proposed**: When a trip is created via `DestinationAutocomplete`, the selected result includes `lat` and `lon`. These should be persisted on the `Trip` record.

The Trip model already has a `destination` string field. We need to add (or verify existence of) `destinationLat` and `destinationLon` fields.

**Schema change**:
```prisma
model Trip {
  // ... existing fields ...
  destinationLat  Float?
  destinationLon  Float?
}
```

**Migration**: `add_trip_coordinates`

**Backfill**: For existing trips without coordinates, the atlas page can fall back to the `CITY_COORDS` lookup or display trips without pins (with a "location unknown" indicator).

### 3.6 Pin Color Coding

| Status | Color | Condition |
|---|---|---|
| Planning | `atlas-gold/50` (semi-transparent gold) | `completedPhases === 0` |
| In Progress | `atlas-gold` (solid gold) | `completedPhases > 0 && completedPhases < totalPhases` |
| Completed | `atlas-teal` (teal/green) | `completedPhases >= totalPhases` |

Pins should pulse (CSS animation) for the "in progress" status, matching the current `DashboardPhaseProgressBar` behavior.

---

## 4. API Contract

No new API routes. Both pages use server-side data fetching (Server Components calling Prisma directly). The data service methods are internal.

---

## 5. Navigation Changes

### 5.1 Header Update

File: `src/components/layout/AuthenticatedNavbar.tsx`

**Current nav items**:
- "Meu Atlas" --> `/dashboard`
- "Meu Perfil" --> `/profile`

**Proposed nav items**:
- "Expeditions" --> `/expeditions` (i18n key: `navigation.expeditions`)
- "Meu Atlas" --> `/atlas` (i18n key: `navigation.myAtlas`)
- "Meu Perfil" --> `/profile` (i18n key: `navigation.myProfile`)

**Active state logic update**:
```typescript
// Current
const isDashboardActive = pathname === "/dashboard" || pathname.startsWith("/expedition");

// Proposed
const isExpeditionsActive = pathname === "/expeditions" || pathname.startsWith("/expedition");
const isAtlasActive = pathname === "/atlas";
const isProfileActive = pathname === "/profile";
```

### 5.2 Redirect

```typescript
// src/app/[locale]/(app)/dashboard/page.tsx
import { redirect } from "@/i18n/navigation";

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: "/expeditions", locale });
}
```

### 5.3 i18n Keys

```json
{
  "navigation": {
    "expeditions": "Expeditions",
    "myAtlas": "Meu Atlas",
    "myProfile": "Meu Perfil"
  }
}
```

Portuguese:
```json
{
  "navigation": {
    "expeditions": "Expedições",
    "myAtlas": "Meu Atlas",
    "myProfile": "Meu Perfil"
  }
}
```

---

## 6. Map Implementation

### 6.1 Technology

Use **Mapbox GL JS 3.x** (already in tech stack per ADR-001). Replace `react-simple-maps` on the atlas page.

**Current dependency**: `react-simple-maps` (used by `AtlasHeroMap`).
**Action**: `react-simple-maps` can be removed after the atlas page replaces it. If `AtlasHeroMap` is still wanted as a lightweight decorative element elsewhere, keep it. Otherwise, remove.

### 6.2 Interactive Features

- **Zoom/pan**: Standard Mapbox controls.
- **Pin click**: Opens a popup with expedition summary (destination, current phase, start/end dates).
- **Pin hover**: Shows destination name tooltip.
- **Fly-to**: When user clicks an expedition in the sidebar (if added later), the map flies to that pin.
- **Responsive**: Full viewport height below header on desktop. Stacked (map above, list below) on mobile -- deferred to UX spec.

### 6.3 Mapbox Token

- Store as `NEXT_PUBLIC_MAPBOX_TOKEN` in environment variables.
- Token must be public (client-side rendering). Use Mapbox URL restrictions to scope to the application domain.
- Add to `src/lib/env.ts` validation.

### 6.4 Bundle Impact

Mapbox GL JS is ~200KB gzipped. Must be lazy-loaded:
```tsx
const AtlasInteractiveMap = dynamic(
  () => import("@/components/features/atlas/AtlasInteractiveMap"),
  { ssr: false, loading: () => <MapSkeleton /> }
);
```

---

## 7. Security Considerations

- **BOLA**: Both pages fetch trips filtered by `session.user.id` -- consistent with existing pattern.
- **Mapbox token**: Public token with domain restrictions. Not sensitive.
- **Coordinates**: Destination lat/lon are not PII (they are public city coordinates). No encryption needed.
- **No new API surface**: Server Components only. No additional attack vectors.

---

## 8. Performance Requirements

| Metric | Target | Notes |
|---|---|---|
| `/expeditions` LCP | < 1.5s | No map library. Cards only. Should be fast. |
| `/atlas` LCP | < 3.0s | Mapbox lazy load + tile fetch. Acceptable for map view. |
| `/atlas` TTI | < 4.0s | Map interaction ready after tiles load. |
| Pin count | Up to MAX_ACTIVE_TRIPS (20) | Performance is not a concern at this scale. |

### Caching Strategy

- Trip data: No cache needed (Server Component fetches per request, data is user-specific).
- Mapbox tiles: Cached by Mapbox CDN automatically.
- Map component: Lazy loaded, cached by browser.

---

## 9. Testing Strategy

### Unit Tests
- `getUserTripsForAtlas()` service method: correct data shape, coordinate resolution, status mapping.
- Pin color logic: planning/in_progress/completed thresholds.
- Navbar active state logic for new routes.

### Integration Tests
- `/dashboard` redirects to `/expeditions`.
- `/expeditions` renders expedition cards (existing ExpeditionCard tests apply).
- `/atlas` renders map container (Mapbox mocked).

### E2E Tests
- Create expedition, navigate to `/expeditions`, verify card appears.
- Navigate to `/atlas`, verify pin appears for the expedition.
- Complete a phase, navigate to `/atlas`, verify pin color changed.
- Header nav: click "Expeditions" -> correct page. Click "Meu Atlas" -> correct page.

---

## 10. Implementation Notes for Developers

1. **Start with the route split** (expeditions page + redirect) before touching the map. This is the lowest-risk change and delivers immediate value.

2. **Extract `ExpeditionsList`** from current `AtlasDashboard`. The new component should be a clean extraction -- same cards, same empty state, minus the map.

3. **Add `destinationLat`/`destinationLon` to Trip model** in a separate migration. Update `createExpeditionAction` to persist coordinates from the autocomplete selection. The `DestinationAutocomplete` already passes `lat`/`lon` in the `onSelect` callback.

4. **Mapbox integration** is a separate PR. Use `next/dynamic` with `ssr: false` to avoid SSR issues with Mapbox GL.

5. **Do NOT remove `react-simple-maps`** yet. It may still be useful as a lightweight fallback or for print views.

6. **i18n**: Add new navigation keys to both `en.json` and `pt-BR.json` message files.

---

## 11. Open Questions

- [ ] Should `/atlas` also show a sidebar list of expeditions alongside the map, or is it map-only?
- [ ] Should the map support creating new expeditions by clicking on the map (future feature)?
- [ ] UX spec needed: mobile layout for the atlas map page.
- [ ] Should we store coordinates on Trip creation, or lazily resolve them when the atlas page is first visited?
- [ ] Mapbox pricing: verify free tier limits (50,000 map loads/month). Consult finops-engineer.

---

## 12. Definition of Done

- [ ] `/expeditions` page renders expedition cards without map
- [ ] `/atlas` page renders interactive Mapbox map with color-coded pins
- [ ] `/dashboard` redirects to `/expeditions` (301)
- [ ] Header navigation shows three items: Expeditions, Meu Atlas, Meu Perfil
- [ ] Trip model stores destination coordinates
- [ ] Pin colors reflect expedition status (planning/in_progress/completed)
- [ ] Unit test coverage >= 80% for new components and services
- [ ] E2E test: full navigation flow across new routes
- [ ] i18n: all new strings translated to pt-BR and en
- [ ] Performance: `/expeditions` LCP < 1.5s, `/atlas` LCP < 3.0s
- [ ] ADR-014 and ADR-015 documented in docs/architecture.md

---

## 13. Vendor Dependencies

| Vendor | Usage | Abstraction | Exit Strategy |
|---|---|---|---|
| Mapbox GL JS | Interactive map rendering | `AtlasInteractiveMap` component encapsulates all Mapbox usage | Replace with Leaflet + OpenStreetMap tiles (free, OSS). Component interface stays the same. |
| react-simple-maps | Current decorative map | `AtlasHeroMap` (isolated) | Remove when Mapbox replaces it, or keep for lightweight use cases. |

---

## 14. Constraints

- **No WebSocket/SSE infrastructure**: Pin updates use page-level revalidation, not real-time push.
- **MAX_ACTIVE_TRIPS = 20**: Map performance is not a concern at this scale. No clustering needed.
- **Mapbox token is public**: Must be scoped to application domain via Mapbox dashboard URL restrictions.
- **Bundle budget**: Mapbox GL JS (~200KB gzip) must be lazy-loaded to avoid impacting `/expeditions` page performance.

---

> Draft -- Pending UX spec for mobile layout and PO confirmation of navigation wording. Pending finops-engineer review of Mapbox pricing.
