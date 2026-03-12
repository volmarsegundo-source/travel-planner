---
spec_id: SPEC-ARCH-005
title: "Journey Summary Data Aggregation"
type: architecture
status: Draft
version: "1.0.0"
author: architect
sprint: 28
priority: P1
created: "2026-03-11"
updated: "2026-03-11"
related_specs:
  - SPEC-ARCH-004
  - SPEC-ARCH-001
  - SPEC-ARCH-002
---

# SPEC-ARCH-005: Journey Summary Data Aggregation

**Version**: 1.0.0
**Status**: Draft
**Author**: architect
**Reviewers**: [tech-lead, ux-designer, qa-engineer, security-specialist, finops-engineer]
**Product Spec**: TBD (Sprint 28 backlog)
**UX Spec**: TBD
**Created**: 2026-03-11
**Last Updated**: 2026-03-11

---

## 1. Overview

The Journey Summary is a read-only overview page that aggregates data from all 8 expedition phases into a single consolidated view for a given trip. It answers the traveler's question: "What have I planned so far, and what is left?" This page is the expedition equivalent of a "trip at a glance" -- it pulls together destination info, dates, passengers, transport segments, accommodations, checklist progress, itinerary plan, budget overview, and destination guide highlights.

This spec defines the data aggregation architecture: which models are queried, how data is assembled into a single response shape, the caching strategy, and the navigation flow for editing individual sections.

---

## 2. Architecture Decision Records

### ADR-019: Journey Summary Data Assembly -- Single Service Method vs Parallel Queries

- **Status**: Proposed
- **Context**: The journey summary requires data from 7 Prisma models related to a single trip: `Trip` (core fields + passengers + origin + localMobility), `ExpeditionPhase[]` (phase statuses), `TransportSegment[]`, `Accommodation[]`, `ChecklistItem[]` + `PhaseChecklistItem[]`, `ItineraryPlan` + `ItineraryDay[]` + `Activity[]`, and `DestinationGuide` (content JSON). We need to decide how to fetch and assemble this data.

- **Options Considered**:

| Option | Pros | Cons |
|---|---|---|
| A: Single Prisma query with deep includes | One DB round-trip. Simple. | Massive include tree. Returns more data than needed (full Activity text, full guide content). No selective loading. |
| B: Dedicated service method with parallel `Promise.all` | Fetch only needed fields per model. Can optimize each query independently. Easy to add caching per-section later. | Multiple DB round-trips (6-7 queries). Slightly more code. |
| C: Materialized view / denormalized summary table | Ultra-fast reads. Single query. | Write complexity: must update on every phase change. Schema migration. Maintenance burden disproportionate to benefit. |

- **Decision**: **Option B -- Dedicated service method with parallel queries**. A new `JourneySummaryService.getSummary(userId, tripId)` method executes 6 queries in parallel using `Promise.all`. Each query uses `select` to fetch only the fields needed for the summary view. The total latency is bounded by the slowest query (not the sum), which is acceptable for a user-facing page.

- **Consequences**:
  - **Positive**: Each query is optimized independently. Easy to add Redis caching for individual sections later. No schema changes needed.
  - **Negative**: 6 parallel DB connections per page load. At current scale (single-user reads), this is not a concern. At scale, connection pooling (PgBouncer) would handle it.
  - **Risk**: None at current user volume. Monitor connection pool usage if traffic grows significantly.

### ADR-020: Caching Strategy -- No Cache for MVP, Redis-Ready Interface

- **Status**: Proposed
- **Context**: The journey summary page is user-specific and changes whenever any phase data is modified. Aggressive caching risks showing stale data. However, the summary is read-heavy and write-infrequent (data changes only during active editing sessions).

- **Decision**: **No cache for MVP**. Fetch fresh data on every page load. The service method interface is designed to be cache-friendly (returns a single serializable `JourneySummaryDTO`), so Redis caching can be added later with a `CacheKeys.journeySummary(tripId)` key and invalidation on phase completion / data save.

- **Consequences**:
  - **Positive**: No cache invalidation complexity. Data is always fresh. Zero infrastructure changes.
  - **Negative**: Each page load triggers 6 parallel queries. Acceptable for MVP.
  - **Risk**: If the page becomes a hot path (e.g., user refreshes frequently during editing), DB load increases. Mitigated by adding Redis cache with 60s TTL later.

---

## 3. System Design

### 3.1 Route

```
/expedition/[tripId]/summary
```

This route sits alongside existing expedition phase routes:
```
/(app)/expedition/[tripId]/           --> ExpeditionHub (existing)
/(app)/expedition/[tripId]/phase-1    --> Phase1Wizard
/(app)/expedition/[tripId]/phase-2    --> Phase2Wizard
...
/(app)/expedition/[tripId]/phase-6    --> Phase6Wizard
/(app)/expedition/[tripId]/summary    --> NEW: JourneySummaryPage
```

### 3.2 Component Architecture

```
src/app/[locale]/(app)/expedition/[tripId]/
  summary/page.tsx              <-- NEW: Server Component

src/components/features/expedition/
  JourneySummary.tsx            <-- NEW: Client Component (main layout)
  summary/
    SummaryOverviewCard.tsx     <-- Trip basics: destination, dates, passengers
    SummaryTransportCard.tsx    <-- Transport segments list
    SummaryAccommodationCard.tsx <-- Accommodation list
    SummaryChecklistCard.tsx    <-- Checklist progress (required + recommended)
    SummaryItineraryCard.tsx    <-- Day count + activity count + "view itinerary" link
    SummaryGuideCard.tsx        <-- Destination guide highlights (key sections)
    SummaryMobilityCard.tsx     <-- Local mobility selections
    SummaryPhaseProgress.tsx    <-- Phase completion overview (8 phases)
    SummaryEditButton.tsx       <-- "Edit" button that links to the relevant phase wizard

src/server/services/
  journey-summary.service.ts    <-- NEW: data aggregation service
```

### 3.3 Data Flow

```
JourneySummaryPage (Server Component)
  |
  |-- auth() --> session.user.id
  |-- JourneySummaryService.getSummary(userId, tripId)
  |     |
  |     |-- Promise.all([
  |     |     db.trip.findFirst(...)           // core trip data
  |     |     db.expeditionPhase.findMany(...) // phase statuses
  |     |     db.transportSegment.findMany(...)// transport
  |     |     db.accommodation.findMany(...)   // accommodation
  |     |     db.phaseChecklistItem.findMany(...)// checklist progress
  |     |     db.destinationGuide.findFirst(...)// guide content
  |     |     db.itineraryPlan.findFirst(...)  // itinerary metadata
  |     |   ])
  |     |
  |     |-- assemble into JourneySummaryDTO
  |
  |-- <JourneySummary dto={summary} />
        |-- SummaryOverviewCard
        |-- SummaryPhaseProgress
        |-- SummaryTransportCard (+ SummaryEditButton -> /phase-4)
        |-- SummaryAccommodationCard (+ SummaryEditButton -> /phase-4)
        |-- SummaryMobilityCard (+ SummaryEditButton -> /phase-4)
        |-- SummaryChecklistCard (+ SummaryEditButton -> /phase-3)
        |-- SummaryItineraryCard (+ SummaryEditButton -> /phase-6)
        |-- SummaryGuideCard (+ SummaryEditButton -> /phase-5)
```

---

## 4. Data Model

### 4.1 JourneySummaryDTO

No new database tables. The DTO is an in-memory aggregation of existing models:

```typescript
// src/types/journey-summary.types.ts

export interface JourneySummaryDTO {
  trip: {
    id: string;
    destination: string;
    origin: string | null;
    startDate: string | null;  // ISO string
    endDate: string | null;    // ISO string
    coverEmoji: string;
    coverGradient: string;
    tripType: string;
    currentPhase: number;
    passengers: {
      adults: number;
      children: number;
      infants: number;
      childrenAges: number[];
    } | null;
    localMobility: string[];
  };

  phases: {
    phaseNumber: number;
    status: string;            // "locked" | "active" | "completed"
    completedAt: string | null;
    pointsEarned: number;
  }[];

  transport: {
    id: string;
    transportType: string;
    departurePlace: string | null;
    arrivalPlace: string | null;
    departureAt: string | null;
    arrivalAt: string | null;
    provider: string | null;
    isReturn: boolean;
    estimatedCost: number | null;
    currency: string | null;
  }[];

  accommodations: {
    id: string;
    accommodationType: string;
    name: string | null;
    checkIn: string | null;
    checkOut: string | null;
    estimatedCost: number | null;
    currency: string | null;
  }[];

  checklist: {
    requiredTotal: number;
    requiredDone: number;
    recommendedTotal: number;
    recommendedDone: number;
  };

  itinerary: {
    hasItinerary: boolean;
    dayCount: number;
    activityCount: number;
  };

  guide: {
    hasGuide: boolean;
    destination: string | null;
    sectionCount: number;
    generatedAt: string | null;
  };
}
```

### 4.2 Sensitive Data Handling

- `TransportSegment.bookingCodeEnc` and `Accommodation.bookingCodeEnc` are **NOT** included in the summary DTO. The summary shows segment overview only, not booking codes.
- `UserProfile.passportNumberEnc` and `UserProfile.nationalIdEnc` are **NOT** queried. The summary does not display identity documents.
- Passenger data (`Trip.passengers` JSON) is deserialized and validated against `PassengersSchema` before inclusion.

---

## 5. Service Implementation

### 5.1 JourneySummaryService

```typescript
// src/server/services/journey-summary.service.ts
import "server-only";

import { db } from "@/server/db";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import type { JourneySummaryDTO } from "@/types/journey-summary.types";

export class JourneySummaryService {
  /**
   * Assembles a complete journey summary for a trip.
   * BOLA guard: verifies trip ownership before fetching any related data.
   */
  static async getSummary(
    userId: string,
    tripId: string
  ): Promise<JourneySummaryDTO> {
    // Step 1: Verify ownership (BOLA guard)
    const trip = await db.trip.findFirst({
      where: { id: tripId, deletedAt: null },
      select: {
        id: true,
        userId: true,
        destination: true,
        origin: true,
        startDate: true,
        endDate: true,
        coverEmoji: true,
        coverGradient: true,
        tripType: true,
        currentPhase: true,
        passengers: true,
        localMobility: true,
      },
    });

    if (!trip) throw new NotFoundError("Trip", tripId);
    if (trip.userId !== userId) throw new ForbiddenError();

    // Step 2: Fetch related data in parallel
    const [phases, transport, accommodations, checklist, guide, itinerary] =
      await Promise.all([
        db.expeditionPhase.findMany({
          where: { tripId },
          select: {
            phaseNumber: true,
            status: true,
            completedAt: true,
            pointsEarned: true,
          },
          orderBy: { phaseNumber: "asc" },
        }),
        db.transportSegment.findMany({
          where: { tripId },
          select: {
            id: true,
            transportType: true,
            departurePlace: true,
            arrivalPlace: true,
            departureAt: true,
            arrivalAt: true,
            provider: true,
            isReturn: true,
            estimatedCost: true,
            currency: true,
          },
          orderBy: { segmentOrder: "asc" },
        }),
        db.accommodation.findMany({
          where: { tripId },
          select: {
            id: true,
            accommodationType: true,
            name: true,
            checkIn: true,
            checkOut: true,
            estimatedCost: true,
            currency: true,
          },
          orderBy: { orderIndex: "asc" },
        }),
        db.phaseChecklistItem.findMany({
          where: { tripId },
          select: { required: true, completed: true },
        }),
        db.destinationGuide.findFirst({
          where: { tripId },
          select: {
            destination: true,
            content: true,
            generatedAt: true,
          },
        }),
        db.itineraryPlan.findFirst({
          where: { tripId },
          select: {
            id: true,
            generatedAt: true,
          },
        }),
      ]);

    // Step 3: Fetch itinerary day/activity counts if plan exists
    let dayCount = 0;
    let activityCount = 0;
    if (itinerary?.generatedAt) {
      const [days, activities] = await Promise.all([
        db.itineraryDay.count({ where: { tripId } }),
        db.activity.count({
          where: { day: { tripId } },
        }),
      ]);
      dayCount = days;
      activityCount = activities;
    }

    // Step 4: Assemble DTO
    const requiredItems = checklist.filter((i) => i.required);
    const recommendedItems = checklist.filter((i) => !i.required);

    // Parse guide content to count sections
    let guideSectionCount = 0;
    if (guide?.content && typeof guide.content === "object") {
      const content = guide.content as Record<string, unknown>;
      guideSectionCount = Object.keys(content).length;
    }

    return {
      trip: {
        id: trip.id,
        destination: trip.destination,
        origin: trip.origin,
        startDate: trip.startDate?.toISOString() ?? null,
        endDate: trip.endDate?.toISOString() ?? null,
        coverEmoji: trip.coverEmoji,
        coverGradient: trip.coverGradient,
        tripType: trip.tripType,
        currentPhase: trip.currentPhase,
        passengers: trip.passengers as JourneySummaryDTO["trip"]["passengers"],
        localMobility: trip.localMobility,
      },
      phases: phases.map((p) => ({
        phaseNumber: p.phaseNumber,
        status: p.status,
        completedAt: p.completedAt?.toISOString() ?? null,
        pointsEarned: p.pointsEarned,
      })),
      transport: transport.map((t) => ({
        id: t.id,
        transportType: t.transportType,
        departurePlace: t.departurePlace,
        arrivalPlace: t.arrivalPlace,
        departureAt: t.departureAt?.toISOString() ?? null,
        arrivalAt: t.arrivalAt?.toISOString() ?? null,
        provider: t.provider,
        isReturn: t.isReturn,
        estimatedCost: t.estimatedCost ? Number(t.estimatedCost) : null,
        currency: t.currency,
      })),
      accommodations: accommodations.map((a) => ({
        id: a.id,
        accommodationType: a.accommodationType,
        name: a.name,
        checkIn: a.checkIn?.toISOString() ?? null,
        checkOut: a.checkOut?.toISOString() ?? null,
        estimatedCost: a.estimatedCost ? Number(a.estimatedCost) : null,
        currency: a.currency,
      })),
      checklist: {
        requiredTotal: requiredItems.length,
        requiredDone: requiredItems.filter((i) => i.completed).length,
        recommendedTotal: recommendedItems.length,
        recommendedDone: recommendedItems.filter((i) => i.completed).length,
      },
      itinerary: {
        hasItinerary: itinerary?.generatedAt != null,
        dayCount,
        activityCount,
      },
      guide: {
        hasGuide: guide != null,
        destination: guide?.destination ?? null,
        sectionCount: guideSectionCount,
        generatedAt: guide?.generatedAt?.toISOString() ?? null,
      },
    };
  }
}
```

### 5.2 Query Complexity Analysis

| Query | Table | Index Used | Expected Rows | Est. Latency |
|---|---|---|---|---|
| Trip lookup | trips | PK (id) + userId filter | 1 | < 1ms |
| Phases | expedition_phases | tripId index | 8 | < 1ms |
| Transport | transport_segments | tripId, segmentOrder index | 0-10 | < 1ms |
| Accommodation | accommodations | tripId, orderIndex index | 0-5 | < 1ms |
| Checklist | phase_checklist_items | tripId, phaseNumber index | 0-50 | < 2ms |
| Guide | destination_guides | tripId unique index | 0-1 | < 1ms |
| Itinerary plan | itinerary_plans | tripId unique index | 0-1 | < 1ms |
| Day count | itinerary_days | tripId index | COUNT only | < 1ms |
| Activity count | activities | dayId -> tripId join | COUNT only | < 2ms |

**Total estimated server-side latency**: < 10ms (parallel execution, bounded by slowest query).

---

## 6. Edit Flow Architecture

### 6.1 "Edit Section" Navigation

Each summary card has an "Edit" button that navigates to the relevant phase wizard:

| Summary Section | Edit Target | Return Strategy |
|---|---|---|
| Overview (dates, passengers) | `/expedition/[tripId]/phase-1` | Wizard "back" or browser back |
| Transport | `/expedition/[tripId]/phase-4` | Same |
| Accommodation | `/expedition/[tripId]/phase-4` | Same |
| Mobility | `/expedition/[tripId]/phase-4` | Same |
| Checklist | `/expedition/[tripId]/phase-3` | Same |
| Itinerary | `/expedition/[tripId]/phase-6` | Same |
| Destination Guide | `/expedition/[tripId]/phase-5` | Same |

### 6.2 Return Navigation

When a user clicks "Edit" on the summary page and navigates to a phase wizard, the wizard already has a "back" button that navigates to the expedition hub. After editing, the user navigates back to the summary via:

1. **Browser back button**: The summary page is in the browser history stack.
2. **Explicit "Back to Summary" link**: Add a `returnTo` query parameter to the edit URL:
   ```
   /expedition/[tripId]/phase-4?returnTo=summary
   ```
   The phase wizard reads this parameter and, on save/back, redirects to `/expedition/[tripId]/summary` instead of the default expedition hub.

**Decision**: Use approach (1) for MVP. Browser back is sufficient. Approach (2) can be added later if UX testing reveals confusion.

### 6.3 Data Freshness After Edit

When the user edits a section and navigates back to the summary:
- If using browser back: Next.js will re-render the Server Component on back navigation (App Router behavior -- not cached by default).
- The summary will show fresh data from the database.
- No special invalidation mechanism needed.

---

## 7. Security Considerations

- **BOLA**: The service method performs ownership verification (`trip.userId !== userId`) before fetching ANY related data. All subsequent queries use `tripId` which is already verified.
- **No booking codes exposed**: `bookingCodeEnc` is explicitly excluded from all `select` clauses.
- **No PII exposed**: Passport, national ID, and other profile PII are not queried.
- **Passenger data**: Validated via `PassengersSchema` Zod schema before rendering. Malformed JSON in `Trip.passengers` will be treated as `null`.
- **Guide content**: `DestinationGuide.content` is a JSON blob. The summary only counts sections (keys). It does NOT render raw guide content on the summary page, reducing XSS surface.

---

## 8. Performance Requirements

| Metric | Target | Notes |
|---|---|---|
| Page LCP | < 1.5s | Server-rendered, no heavy client JS |
| Server data assembly | < 50ms | 6-8 parallel queries, all indexed |
| Bundle size | < 20KB | Summary components are simple cards, no heavy dependencies |
| CLS | < 0.05 | Cards render server-side, no layout shift |

### Caching (Future)

When caching is needed, the interface is ready:

```typescript
// Future: Redis cache layer
const cacheKey = CacheKeys.journeySummary(tripId);
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached) as JourneySummaryDTO;

const summary = await assembleFromDB(userId, tripId);
await redis.setex(cacheKey, 60, JSON.stringify(summary)); // 60s TTL
return summary;
```

Cache invalidation points (for future implementation):
- `completePhaseAction` -> invalidate `journeySummary(tripId)`
- `saveTransportAction` / `saveAccommodationAction` -> invalidate
- `generateChecklistAction` / `generateItineraryAction` -> invalidate
- `generateGuideAction` -> invalidate

---

## 9. Implementation Guide

### Files to Create

| File | Action | Description |
|---|---|---|
| `src/types/journey-summary.types.ts` | Create | `JourneySummaryDTO` type definition |
| `src/server/services/journey-summary.service.ts` | Create | Data aggregation service |
| `src/app/[locale]/(app)/expedition/[tripId]/summary/page.tsx` | Create | Server Component page |
| `src/components/features/expedition/JourneySummary.tsx` | Create | Main summary layout component |
| `src/components/features/expedition/summary/SummaryOverviewCard.tsx` | Create | Trip basics card |
| `src/components/features/expedition/summary/SummaryPhaseProgress.tsx` | Create | Phase completion overview |
| `src/components/features/expedition/summary/SummaryTransportCard.tsx` | Create | Transport segments |
| `src/components/features/expedition/summary/SummaryAccommodationCard.tsx` | Create | Accommodation list |
| `src/components/features/expedition/summary/SummaryChecklistCard.tsx` | Create | Checklist progress |
| `src/components/features/expedition/summary/SummaryItineraryCard.tsx` | Create | Itinerary overview |
| `src/components/features/expedition/summary/SummaryGuideCard.tsx` | Create | Guide highlights |
| `src/components/features/expedition/summary/SummaryMobilityCard.tsx` | Create | Local mobility |
| `src/components/features/expedition/summary/SummaryEditButton.tsx` | Create | Reusable edit link |
| `messages/en.json` | Modify | Add `summary.*` i18n keys |
| `messages/pt-BR.json` | Modify | Add `summary.*` i18n keys |

### Implementation Order

1. Create `JourneySummaryDTO` type.
2. Create `JourneySummaryService` with full test coverage.
3. Create the page.tsx (Server Component).
4. Create summary card components (can be parallelized across developers).
5. Add navigation link to summary from ExpeditionCard or expedition hub.
6. Add i18n keys.

---

## 10. Testing Strategy

### Unit Tests (Service Layer)
- `getSummary` returns correct DTO shape for a trip with all phases populated.
- `getSummary` returns empty arrays/zero counts for a trip with no transport, no accommodation, no checklist items.
- `getSummary` throws `NotFoundError` for non-existent trip.
- `getSummary` throws `ForbiddenError` for trip belonging to another user (BOLA).
- `getSummary` handles `null` passengers JSON gracefully.
- `getSummary` handles malformed guide content gracefully.
- Decimal `estimatedCost` is correctly converted to `number`.
- `bookingCodeEnc` is NOT present in the returned DTO.

### Unit Tests (Components)
- `SummaryOverviewCard` renders destination, dates, passenger counts.
- `SummaryTransportCard` renders transport segments in order. Empty state when no segments.
- `SummaryChecklistCard` renders progress bar with correct percentages.
- `SummaryEditButton` renders link to correct phase wizard.
- `SummaryPhaseProgress` renders 8 phase indicators with correct status colors.

### Integration Tests
- Page renders with real data (mock Prisma at service boundary).
- Auth redirect for unauthenticated users.
- 404 for non-existent trip.
- 403 for trip belonging to another user.

### E2E Tests
- Create expedition, populate some phases, navigate to summary, verify data appears.
- Click "Edit" on transport card, edit transport, navigate back, verify updated data.

---

## 11. Open Questions

- [ ] Should the summary page be accessible from the expedition hub (phase list page) or only from the expeditions list? Recommendation: both -- add a "View Summary" button on the expedition hub.
- [ ] Should the summary include a total estimated budget (sum of transport + accommodation costs)? This is useful but requires currency conversion if mixed currencies.
- [ ] Should the guide section show actual content snippets or just metadata (section count, generation date)?
- [ ] Phase progress on the summary: should it show the same `DashboardPhaseProgressBar` component or a more detailed per-phase breakdown?

---

## 12. Vendor Dependencies

| Vendor | Usage | Abstraction Layer | Exit Strategy |
|---|---|---|---|
| None | No external vendors | N/A | N/A |

This spec uses only existing internal services and Prisma queries. No new vendor dependencies.

---

## 13. Constraints (MANDATORY)

### Architectural Boundaries
- The summary page is **read-only**. No data mutations happen on this page.
- No new Prisma models or migrations required.
- `bookingCodeEnc` fields MUST NOT be included in any query `select` clause.
- The service MUST perform BOLA verification before any data fetch.
- No direct database calls from components -- all data comes from the service via page props.

### Performance Budgets
- Server-side data assembly: < 50ms.
- Page LCP: < 1.5s.
- No lazy loading needed (all components are lightweight cards).
- Total client JS for summary page: < 20KB (cards are mostly static text).

### Security Requirements
- Auth guard inherited from `(app)/layout.tsx`.
- BOLA: trip ownership verified before all queries.
- No encrypted fields exposed (bookingCodeEnc excluded).
- No PII from UserProfile queried.
- Passenger JSON validated with Zod before rendering.

### Scalability
- MAX_ACTIVE_TRIPS = 20. Summary is per-trip, so query volume is bounded.
- MAX_TRANSPORT_SEGMENTS = 10, MAX_ACCOMMODATIONS = 5. Card lists are small.
- Redis caching interface is prepared but not implemented for MVP.

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-11 | architect | Initial draft |

---

> Draft -- Ready for tech-lead review. No blockers. Implementation can proceed after UX spec defines card layouts.
