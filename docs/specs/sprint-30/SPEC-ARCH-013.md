# Technical Specification: Dashboard Architecture Rewrite

**Spec ID**: SPEC-ARCH-013
**Related Story**: REWRITE-3 (Sprint 30 Planning)
**Author**: architect
**Status**: Draft
**Last Updated**: 2026-03-17

---

## 1. Overview

The current dashboard (`/expeditions`) renders a flat list of `ExpeditionCard` components with no sorting, filtering, or virtual scrolling. As users accumulate trips (up to `MAX_ACTIVE_TRIPS = 20` active + unlimited archived), the page becomes unwieldy. This spec redesigns the dashboard with client-side sorting/filtering, TanStack Query for data management, and virtual scrolling as a performance safety net for users with many trips.

## 2. Architecture Diagram

```
+------------------------------+
| /expeditions (Server Page)   |
| - auth check                 |
| - fetch all user trips       |
| - serialize to ExpeditionDTO |
| - dehydrate for TanStack     |
+-------------+----------------+
              |
              v  (serialized props OR dehydrated query state)
+------------------------------------------------------------------+
| ExpeditionsDashboard (Client Component)                          |
|                                                                  |
|  +-------------------+  +-------------------+  +--------------+  |
|  | FilterBar         |  | SortControls      |  | ViewToggle   |  |
|  | - status (active  |  | - by date (asc/   |  | - cards      |  |
|  |   /completed/all) |  |   desc)           |  | - compact    |  |
|  | - search (dest)   |  | - by destination  |  |              |  |
|  |                   |  | - by phase        |  |              |  |
|  +-------------------+  +-------------------+  +--------------+  |
|                                                                  |
|  +------------------------------------------------------------+  |
|  | ExpeditionsList (renders filtered + sorted subset)          |  |
|  |                                                             |  |
|  |  [ExpeditionCard] [ExpeditionCard] [ExpeditionCard] ...     |  |
|  |                                                             |  |
|  |  (Virtual scroll if > 20 items via TanStack Virtual)        |  |
|  +------------------------------------------------------------+  |
|                                                                  |
|  +-------------------+                                           |
|  | AtlasHeroMap      |  (decorative, CSS pins)                   |
|  +-------------------+                                           |
+------------------------------------------------------------------+
```

## 3. Data Flow

### 3.1 Server-Side: Data Loading

The server component (`page.tsx`) fetches all user trips in a single query. The current implementation already does this via `TripService.getUserTripsWithExpeditionData`. No change to the server query.

The data is serialized into a plain DTO (no Date objects, no Prisma types):

```typescript
interface ExpeditionDTO {
  id: string;
  destination: string;
  currentPhase: number;
  completedPhases: number;
  totalPhases: number;
  coverEmoji: string;
  startDate: string | null;    // ISO date string
  endDate: string | null;
  status: string;              // "PLANNING" | "ACTIVE" | "COMPLETED" | "ARCHIVED"
  tripType: string;
  destinationLat: number | null;
  destinationLon: number | null;
  checklistRequired: number;
  checklistRequiredDone: number;
  checklistRecommendedPending: number;
  hasItineraryPlan: boolean;
  createdAt: string;           // NEW: for "newest first" sorting
}
```

**New field**: `createdAt` and `status` added to the DTO (already available from Prisma query, just not serialized currently).

### 3.2 Client-Side: TanStack Query Integration

TanStack Query is already installed (`@tanstack/react-query` ^5.62.0). Currently unused for trip data. This spec uses it for:

1. **Hydration**: Server-fetched data is passed as `initialData` to `useQuery`, avoiding a client-side refetch on mount
2. **Stale-while-revalidate**: After initial load, data revalidates in background when user returns to tab (`refetchOnWindowFocus`)
3. **Optimistic updates**: When a trip is created or a phase is completed elsewhere, the dashboard updates without full page reload

```typescript
// src/hooks/useExpeditions.ts

import { useQuery } from "@tanstack/react-query";
import type { ExpeditionDTO } from "@/types/expedition.types";

export function useExpeditions(initialData: ExpeditionDTO[]) {
  return useQuery({
    queryKey: ["expeditions"],
    queryFn: async () => {
      const res = await fetch("/api/trips/expeditions");
      if (!res.ok) throw new Error("Failed to fetch expeditions");
      return res.json() as Promise<ExpeditionDTO[]>;
    },
    initialData,
    staleTime: 5 * 60 * 1000,  // 5 minutes
    refetchOnWindowFocus: true,
  });
}
```

### 3.3 Client-Side: Filtering and Sorting

All filtering and sorting happens client-side. With MAX_ACTIVE_TRIPS = 20 and a reasonable number of archived trips (< 100), the full dataset fits comfortably in memory.

```typescript
// src/lib/expedition-filters.ts (isomorphic, pure functions)

export type SortField = "date" | "destination" | "phase" | "created";
export type SortDirection = "asc" | "desc";
export type StatusFilter = "all" | "active" | "completed" | "archived";

export interface FilterState {
  status: StatusFilter;
  search: string;
  sort: SortField;
  direction: SortDirection;
}

export const DEFAULT_FILTER_STATE: FilterState = {
  status: "active",
  search: "",
  sort: "date",
  direction: "asc",
};

export function filterExpeditions(
  expeditions: ExpeditionDTO[],
  filters: FilterState
): ExpeditionDTO[] {
  let result = [...expeditions];

  // Status filter
  if (filters.status !== "all") {
    const statusMap: Record<StatusFilter, string[]> = {
      active: ["PLANNING", "ACTIVE"],
      completed: ["COMPLETED"],
      archived: ["ARCHIVED"],
      all: [],
    };
    const allowed = statusMap[filters.status];
    if (allowed && allowed.length > 0) {
      result = result.filter((e) => allowed.includes(e.status));
    }
  }

  // Text search (destination, case-insensitive)
  if (filters.search.trim()) {
    const query = filters.search.toLowerCase().trim();
    result = result.filter((e) =>
      e.destination.toLowerCase().includes(query)
    );
  }

  // Sort
  result.sort((a, b) => {
    const dir = filters.direction === "asc" ? 1 : -1;
    switch (filters.sort) {
      case "date":
        return dir * ((a.startDate ?? "9999") < (b.startDate ?? "9999") ? -1 : 1);
      case "destination":
        return dir * a.destination.localeCompare(b.destination);
      case "phase":
        return dir * (a.currentPhase - b.currentPhase);
      case "created":
        return dir * (a.createdAt < b.createdAt ? -1 : 1);
      default:
        return 0;
    }
  });

  return result;
}
```

### 3.4 URL State Persistence

Filter state is persisted in URL search params so that bookmarking and browser back/forward work:

```
/expeditions?status=active&sort=date&dir=asc&q=paris
```

Use `useSearchParams` from `next/navigation` + `useRouter.replace` for shallow updates (no server round-trip).

## 4. Component Tree

```
ExpeditionsPage (Server Component)
  |-- Breadcrumb
  |-- ExpeditionsDashboard (Client)
        |-- DashboardHeader
        |     |-- Title + "New Expedition" button
        |     |-- FilterBar
        |     |     |-- StatusFilter (tabs: Active | Completed | Archived | All)
        |     |     |-- SearchInput (debounced 200ms)
        |     |-- SortControls
        |     |     |-- SortSelect (date | destination | phase | created)
        |     |     |-- DirectionToggle (asc/desc)
        |     |-- ViewToggle (cards | compact)
        |
        |-- ExpeditionsList (receives filtered array)
        |     |-- ExpeditionCard[] (card view)
        |     |-- OR ExpeditionRow[] (compact view)
        |     |-- VirtualScroller (wraps list if items > 20)
        |
        |-- AtlasHeroMap (decorative, CSS pins)
        |-- EmptyState (if filtered results = 0)
              |-- Contextual message (no trips vs. no matches)
```

## 5. Virtual Scrolling

Virtual scrolling activates only when the filtered list exceeds 20 items. For most users (< 20 active trips), no virtualization is applied.

**Library**: `@tanstack/react-virtual` (already a transitive dependency of TanStack Query devtools -- verify direct dependency needed).

```typescript
import { useVirtualizer } from "@tanstack/react-virtual";

function VirtualExpeditionsList({ items }: { items: ExpeditionDTO[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 180,  // card height estimate in px
    overscan: 3,
  });
  // ... render virtual items
}
```

## 6. API Contract

### Endpoint: GET /api/trips/expeditions (NEW)

Used by TanStack Query for background revalidation. Returns the same DTO as the server component props.

**Auth**: Required
**Rate Limit**: 30 req/min

**Response (200)**:
```json
[
  {
    "id": "clx...",
    "destination": "Paris, Franca",
    "currentPhase": 4,
    "completedPhases": 3,
    "totalPhases": 6,
    "coverEmoji": "🗼",
    "startDate": "2026-06-15",
    "endDate": "2026-06-25",
    "status": "PLANNING",
    "tripType": "international",
    "destinationLat": 48.8566,
    "destinationLon": 2.3522,
    "checklistRequired": 5,
    "checklistRequiredDone": 3,
    "checklistRecommendedPending": 2,
    "hasItineraryPlan": false,
    "createdAt": "2026-03-01T12:00:00.000Z"
  }
]
```

**Error Responses**:
- 401: `{ "error": "Unauthorized" }`

### Shared DTO Builder

Extract the trip-to-DTO mapping (currently inline in `page.tsx`) into a shared utility:

```typescript
// src/server/services/trip-dto.service.ts
export function toExpeditionDTO(trip: TripWithExpeditionData): ExpeditionDTO {
  // ... explicit field mapping (no spread)
}
```

Used by both `page.tsx` (server) and `/api/trips/expeditions` (API route) to guarantee identical output.

## 7. Compact View

The compact view renders trips as rows instead of cards, useful for users with many trips:

```
| Emoji | Destination        | Phase  | Dates              | Status   | Actions |
|-------|--------------------|--------|--------------------|----------|---------|
| 🗼    | Paris, Franca      | 4/6    | Jun 15 - Jun 25    | Planning | View    |
| 🏔️    | Cusco, Peru        | 2/6    | Aug 01 - Aug 10    | Planning | View    |
```

View preference is stored in `localStorage` (not URL params) since it is a personal display preference, not a shareable filter state.

## 8. Security Considerations

- **BOLA**: Both server component and API route filter trips by `userId` from session. No trip from another user is ever included.
- **Data exposure**: The DTO intentionally excludes sensitive fields (passengers, bookingCodes, passportData). Only display-relevant fields are serialized.
- **Search input**: Client-side only, no server query injection risk. Sanitize for display (`textContent`, not `innerHTML`).
- **URL params**: Filter values are validated against allowed enums. Unknown values fall back to defaults.

## 9. Performance Requirements

| Metric | Target | Current |
|---|---|---|
| Dashboard page load (server) | < 500ms | ~300ms |
| Client hydration + first paint | < 100ms additional | ~50ms |
| Filter/sort response (20 items) | < 10ms | N/A |
| Filter/sort response (100 items) | < 30ms | N/A |
| Virtual scroll frame rate | 60fps | N/A |
| TanStack Query revalidation | Background, no UI jank | N/A |

## 10. Testing Strategy

### Unit Tests
- `filterExpeditions`: all filter combinations (status, search, sort, direction)
- `filterExpeditions`: edge cases (empty list, all filtered out, accented search)
- `toExpeditionDTO`: field mapping correctness, null handling
- `DEFAULT_FILTER_STATE`: verify sensible defaults

### Integration Tests
- `/api/trips/expeditions`: returns correct DTO shape, respects BOLA
- TanStack Query hydration: `useExpeditions` returns initialData on first render

### E2E Tests
- Dashboard loads with expedition cards
- Filter by "completed": only completed trips shown
- Search "paris": only matching trips shown
- Sort by date descending: verify order
- URL params reflect filter state after interaction
- Empty state shown when no matches

## 11. Dependencies

| Package | Version | License | Purpose | New? |
|---|---|---|---|---|
| `@tanstack/react-query` | ^5.62.0 | MIT | Client data management | No (existing) |
| `@tanstack/react-virtual` | ^3.11.0 | MIT | Virtual scrolling | YES |

`@tanstack/react-virtual` is lightweight (~5KB) and tree-shakes well. Only imported by the `VirtualExpeditionsList` component.

## 12. Data Model Changes

No Prisma schema changes. The only change is adding `createdAt` and `status` to the serialized DTO, which are already available from the existing Prisma query.

Verify that `TripService.getUserTripsWithExpeditionData` selects `createdAt` and `status`. If not, add to the `select` clause.

## 13. Migration Path

### Phase 1: Server-Side DTO Extraction (Non-breaking)
1. Create `src/server/services/trip-dto.service.ts` with `toExpeditionDTO`
2. Refactor `page.tsx` to use `toExpeditionDTO` (identical behavior)
3. Add `createdAt` and `status` to the DTO

### Phase 2: Client Dashboard Component (Non-breaking, additive)
1. Create `ExpeditionsDashboard`, `FilterBar`, `SortControls`, `ViewToggle`
2. Create `src/lib/expedition-filters.ts` (pure functions)
3. Create `useExpeditions` hook with TanStack Query
4. Wire up URL search params for filter persistence

### Phase 3: API Route + Revalidation (Non-breaking, additive)
1. Create `/api/trips/expeditions` route
2. Connect TanStack Query `queryFn` to the API route
3. Add `refetchOnWindowFocus` for stale-while-revalidate

### Phase 4: Virtual Scroll + Compact View (Non-breaking, additive)
1. Install `@tanstack/react-virtual`
2. Create `VirtualExpeditionsList` wrapper
3. Create `ExpeditionRow` for compact view
4. Add `ViewToggle` with localStorage persistence

## 14. i18n Considerations

New translation keys required:

```json
{
  "dashboard": {
    "filter": {
      "all": "Todas",
      "active": "Ativas",
      "completed": "Concluidas",
      "archived": "Arquivadas",
      "searchPlaceholder": "Buscar destino..."
    },
    "sort": {
      "date": "Data da viagem",
      "destination": "Destino",
      "phase": "Fase atual",
      "created": "Data de criacao",
      "ascending": "Crescente",
      "descending": "Decrescente"
    },
    "view": {
      "cards": "Cartoes",
      "compact": "Compacta"
    },
    "emptyFiltered": "Nenhuma expedicao encontrada com esses filtros.",
    "clearFilters": "Limpar filtros"
  }
}
```

## 15. Open Questions

- [ ] **OQ-1**: Should archived trips be visible by default or only when the user explicitly selects the "Archived" filter? Recommendation: hidden by default (status filter defaults to "active").
- [ ] **OQ-2**: Should the compact view show the progress bar? It would make rows taller. Recommendation: no -- show only the phase number "4/6" as text.
- [ ] **OQ-3**: Should we add a "grid" view (2-column cards) in addition to list and compact? Recommendation: defer to Sprint 31 based on UX feedback.
- [ ] **OQ-4**: `@tanstack/react-virtual` is ~5KB. Should we defer virtual scrolling to Sprint 31 if no user has > 20 trips? Recommendation: implement now -- the effort is minimal and prevents future regressions.

## 16. Definition of Done

- [ ] `FilterBar` with status tabs (Active/Completed/Archived/All) and text search
- [ ] `SortControls` with 4 sort fields + direction toggle
- [ ] `ViewToggle` (cards/compact) with localStorage persistence
- [ ] Client-side filtering and sorting via `filterExpeditions` pure functions
- [ ] URL search params reflect filter state
- [ ] TanStack Query integration with `initialData` hydration
- [ ] `/api/trips/expeditions` API route with BOLA protection
- [ ] Virtual scrolling for lists > 20 items
- [ ] Compact row view with phase number, dates, destination
- [ ] Contextual empty state ("no trips" vs "no matches")
- [ ] `createdAt` + `status` added to expedition DTO
- [ ] Unit tests for filter/sort logic (100% branch coverage)
- [ ] E2E tests for filter, sort, search, empty state
- [ ] i18n keys added for pt-BR and en

> PROPOSED -- Awaiting tech-lead review before implementation begins
