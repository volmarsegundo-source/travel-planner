# Technical Specification: Report Generation Service

**Spec ID**: SPEC-ARCH-017
**Related Story**: Sprint 31 Planning — Report Generation Service
**Author**: architect
**Status**: Draft
**Last Updated**: 2026-03-17

---

## 1. Overview

The expedition summary page (`ExpeditionSummaryService`) currently provides a phase-by-phase aggregation optimized for the summary UI. This spec introduces a `ReportGenerationService` that produces a comprehensive, flat report DTO containing all 6 phases of trip data in a format suitable for rendering in a report view, future PDF export (SPEC-ARCH-014, deferred), or sharing. The service checks report availability (phases 3, 5, and 6 must have generated content), enforces BOLA on every query, and reuses the existing `ExpeditionSummaryService` as its data source rather than duplicating queries.

## 2. Architecture Diagram

```
+-------------------------------+
| /expedition/{id}/summary      |
|                               |
| [View Report] button          |----> /expedition/{id}/report (new page)
+-------------------------------+

+-------------------------------+
| ReportGenerationService       |
| (server-only)                 |
|                               |
| isReportAvailable(tripId, uId)| <-- checks phases 3, 5, 6
| generateTripReport(tripId,uId)| <-- returns TripReportDTO
+---------------+---------------+
                |
                | delegates to
                v
+-------------------------------+     +---------------------------+
| ExpeditionSummaryService      |     | Additional DB queries     |
| .getExpeditionSummary()       |     | (checklist detail,        |
| (existing, reused)            |     |  guide full content,      |
+-------------------------------+     |  itinerary with activities)|
                                      +---------------------------+

Data Flow:
  1. Page requests report via ReportGenerationService.generateTripReport()
  2. Service checks availability (phases 3+5+6 have content)
  3. Service calls ExpeditionSummaryService.getExpeditionSummary() for base data
  4. Service enriches with detailed data (full checklist, full guide, itinerary days+activities)
  5. Returns TripReportDTO to page component
```

## 3. ADR-022: Report Service as Composition Layer

**Date**: 2026-03-17
**Status**: PROPOSED
**Deciders**: architect, tech-lead

### Context

SPEC-ARCH-014 (Sprint 30) designed a full export system with PDF generation, share URLs, and print styles. Sprint 31 implements only the data layer -- structured report data for a report UI component. PDF and sharing are deferred.

Two approaches for the report data service:

### Options Considered

| Option | Pros | Cons |
|---|---|---|
| A: Compose on top of ExpeditionSummaryService + enrichment queries | Reuses existing BOLA-checked queries; no duplication; summary DTO is already tested | Two-layer call (summary + enrichment); summary may fetch data the report does not need |
| B: Independent service with its own queries | Optimized single query set; no dependency on summary service | Duplicates BOLA logic, trip query, phase data extraction; higher maintenance cost |

### Decision

**Option A: Composition layer**. `ReportGenerationService` calls `ExpeditionSummaryService.getExpeditionSummary()` for the base summary, then runs additional queries for detail-level data (full checklist items, full guide content, itinerary days with activities).

Rationale:
- `ExpeditionSummaryService` is already tested and BOLA-hardened
- The "extra" data fetched by the summary that the report does not use is negligible (~2-3 fields)
- Reduces code to maintain: one source of truth for phase aggregation
- Enrichment queries are simple and independent

### Consequences

**Positive**:
- No duplication of BOLA logic or phase aggregation
- Existing summary tests cover the base data layer
- Report service tests focus only on enrichment and availability logic

**Negative / Trade-offs**:
- Two DB round-trips (summary queries + enrichment queries) instead of one optimized batch. Acceptable: total < 200ms.
- If `ExpeditionSummaryService` changes its DTO shape, the report service must adapt.

---

## 4. Data Model

No schema changes. The service reads existing data from:

- `Trip` (destination, dates, origin, passengers, mobility, coordinates)
- `User` + `UserProfile` (name -- for report header)
- `ExpeditionPhase` (phase metadata)
- `PhaseChecklistItem` (all items, not just counts)
- `TransportSegment` (full details)
- `Accommodation` (full details)
- `DestinationGuide` (full content JSON)
- `ItineraryDay` + `Activity` (full itinerary)

## 5. Report DTO

```typescript
// src/server/services/report-generation.service.ts

import type {
  ExpeditionSummary,
  ExpeditionSummaryPhase1,
  ExpeditionSummaryPhase2,
  ExpeditionSummaryPhase4,
} from "./expedition-summary.service";

// ─── Report-Specific Types ───────────────────────────────────────────────────

export interface ChecklistItemDetail {
  itemKey: string;
  required: boolean;
  completed: boolean;
  pointsValue: number;
}

export interface GuideSection {
  key: string;
  title: string;
  icon: string;
  content: string;
}

export interface ItineraryDayDetail {
  dayNumber: number;
  date: string | null;
  notes: string | null;
  activities: Array<{
    title: string;
    startTime: string | null;
    endTime: string | null;
    location: string | null;
    notes: string | null;
    orderIndex: number;
  }>;
}

export interface ReportPhase3 {
  items: ChecklistItemDetail[];
  completedCount: number;
  totalCount: number;
}

export interface ReportPhase5 {
  generatedAt: string;
  destination: string;
  locale: string;
  sections: GuideSection[];
}

export interface ReportPhase6 {
  days: ItineraryDayDetail[];
  totalActivities: number;
}

// ─── Full Report DTO ─────────────────────────────────────────────────────────

export interface TripReportDTO {
  tripId: string;
  tripTitle: string;
  generatedAt: string;  // ISO timestamp of report generation

  // Phase data (reuses summary types where sufficient, enriches where needed)
  phase1: ExpeditionSummaryPhase1 | null;
  phase2: ExpeditionSummaryPhase2 | null;
  phase3: ReportPhase3 | null;
  phase4: ExpeditionSummaryPhase4 | null;  // summary DTO already has transport/accommodation detail
  phase5: ReportPhase5 | null;
  phase6: ReportPhase6 | null;
}

export interface ReportAvailability {
  available: boolean;
  missingPhases: number[];  // phases that need content before report can be generated
}
```

## 6. Service Implementation

```typescript
// src/server/services/report-generation.service.ts
import "server-only";

import { db } from "@/server/db";
import { logger } from "@/lib/logger";
import { hashUserId } from "@/lib/hash";
import { AppError } from "@/lib/errors";
import { ExpeditionSummaryService } from "./expedition-summary.service";
import type { DestinationGuideContent, GuideSectionKey } from "@/types/ai.types";

export class ReportGenerationService {
  /**
   * Check whether a report can be generated for this trip.
   * Requires phases 3 (checklist generated), 5 (guide generated),
   * and 6 (itinerary created) to have content.
   *
   * BOLA: verifies trip belongs to user.
   */
  static async isReportAvailable(
    tripId: string,
    userId: string
  ): Promise<ReportAvailability> {
    // BOLA check
    const trip = await db.trip.findFirst({
      where: { id: tripId, userId, deletedAt: null },
      select: { id: true },
    });

    if (!trip) {
      throw new AppError("FORBIDDEN", "errors.tripNotFound", 403);
    }

    // Check data presence for phases 3, 5, 6
    const [checklistCount, guide, itineraryCount] = await Promise.all([
      db.phaseChecklistItem.count({ where: { tripId, phaseNumber: 3 } }),
      db.destinationGuide.findUnique({
        where: { tripId },
        select: { id: true },
      }),
      db.itineraryDay.count({ where: { tripId } }),
    ]);

    const missingPhases: number[] = [];
    if (checklistCount === 0) missingPhases.push(3);
    if (!guide) missingPhases.push(5);
    if (itineraryCount === 0) missingPhases.push(6);

    return {
      available: missingPhases.length === 0,
      missingPhases,
    };
  }

  /**
   * Generate a full trip report.
   * Composes ExpeditionSummaryService base data with enrichment queries.
   *
   * BOLA: inherited from ExpeditionSummaryService + own queries.
   *
   * @throws AppError if trip not found (BOLA) or report not available.
   */
  static async generateTripReport(
    tripId: string,
    userId: string
  ): Promise<TripReportDTO> {
    // Check availability first
    const availability = await this.isReportAvailable(tripId, userId);
    if (!availability.available) {
      throw new AppError(
        "VALIDATION",
        "errors.reportNotAvailable",
        422
      );
    }

    // Get base summary (BOLA checked inside)
    const summary = await ExpeditionSummaryService.getExpeditionSummary(
      tripId,
      userId
    );

    // Get trip title
    const trip = await db.trip.findFirst({
      where: { id: tripId, userId, deletedAt: null },
      select: { title: true },
    });

    // Enrichment queries (parallel)
    const [checklistItems, guide, itineraryDays] = await Promise.all([
      db.phaseChecklistItem.findMany({
        where: { tripId, phaseNumber: 3 },
        orderBy: { itemKey: "asc" },
        select: {
          itemKey: true,
          required: true,
          completed: true,
          pointsValue: true,
        },
      }),
      db.destinationGuide.findUnique({
        where: { tripId },
        select: {
          content: true,
          generatedAt: true,
          destination: true,
          locale: true,
        },
      }),
      db.itineraryDay.findMany({
        where: { tripId },
        orderBy: { dayNumber: "asc" },
        select: {
          dayNumber: true,
          date: true,
          notes: true,
          activities: {
            orderBy: { orderIndex: "asc" },
            select: {
              title: true,
              startTime: true,
              endTime: true,
              location: true,
              notes: true,
              orderIndex: true,
            },
          },
        },
      }),
    ]);

    // Build enriched phase 3
    const phase3: ReportPhase3 | null =
      checklistItems.length > 0
        ? {
            items: checklistItems.map((item) => ({
              itemKey: item.itemKey,
              required: item.required,
              completed: item.completed,
              pointsValue: item.pointsValue,
            })),
            completedCount: checklistItems.filter((i) => i.completed).length,
            totalCount: checklistItems.length,
          }
        : null;

    // Build enriched phase 5
    let phase5: ReportPhase5 | null = null;
    if (guide) {
      const content = guide.content as unknown as DestinationGuideContent;
      const sections: GuideSection[] = [];

      // Extract all sections from guide content
      const sectionKeys: GuideSectionKey[] = [
        "timezone",
        "currency",
        "language",
        "weather",
        "safety",
        "transport",
        "culture",
        "food",
        "health",
        "emergency",
      ];

      for (const key of sectionKeys) {
        const section = content[key];
        if (section) {
          sections.push({
            key,
            title: section.title,
            icon: section.icon,
            content:
              typeof section.content === "string"
                ? section.content
                : JSON.stringify(section.content),
          });
        }
      }

      phase5 = {
        generatedAt: guide.generatedAt.toISOString().split("T")[0]!,
        destination: guide.destination,
        locale: guide.locale,
        sections,
      };
    }

    // Build enriched phase 6
    const phase6: ReportPhase6 | null =
      itineraryDays.length > 0
        ? {
            days: itineraryDays.map((day) => ({
              dayNumber: day.dayNumber,
              date: day.date ? day.date.toISOString().split("T")[0]! : null,
              notes: day.notes,
              activities: day.activities.map((a) => ({
                title: a.title,
                startTime: a.startTime,
                endTime: a.endTime,
                location: a.location,
                notes: a.notes,
                orderIndex: a.orderIndex,
              })),
            })),
            totalActivities: itineraryDays.reduce(
              (sum, day) => sum + day.activities.length,
              0
            ),
          }
        : null;

    logger.info("trip.report.generated", {
      userId: hashUserId(userId),
      tripId,
    });

    return {
      tripId,
      tripTitle: trip?.title ?? "",
      generatedAt: new Date().toISOString(),
      phase1: summary.phase1,
      phase2: summary.phase2,
      phase3,
      phase4: summary.phase4,
      phase5,
      phase6,
    };
  }
}
```

## 7. API Contract

### Server Component Direct Access (Primary)

No API route for MVP. The report page server component calls the service directly:

```typescript
// src/app/[locale]/(app)/expedition/[tripId]/report/page.tsx

import { ReportGenerationService } from "@/server/services/report-generation.service";

export default async function ReportPage({ params }: { params: { tripId: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const report = await ReportGenerationService.generateTripReport(
    params.tripId,
    session.user.id
  );

  return <TripReport data={report} />;
}
```

### Future: GET /api/trips/{tripId}/report (Deferred)

Reserved for future PDF generation endpoint (SPEC-ARCH-014). When implemented:
- Auth: Required
- Rate Limit: 10 req/min
- Response: JSON (TripReportDTO)
- Error Responses: 401, 403 (BOLA), 404, 422 (report not available)

### Availability Check Endpoint (Optional, for UI gating)

The summary page needs to know if the "View Report" button should be enabled. This can be done:
- **Option A (recommended)**: Server component queries `isReportAvailable()` in `summary/page.tsx` and passes the result as a prop.
- **Option B**: API route `GET /api/trips/{tripId}/report/availability`. Deferred -- unnecessary for server-rendered pages.

## 8. Business Logic

### 8.1 Report Availability Rules

A report is available when ALL of:
1. Phase 3: at least 1 `PhaseChecklistItem` exists for the trip (checklist was generated)
2. Phase 5: `DestinationGuide` record exists for the trip (guide was generated)
3. Phase 6: at least 1 `ItineraryDay` exists for the trip (itinerary was created)

Phases 1, 2, and 4 are always included if they have data, but do not gate availability. Rationale:
- Phase 1 always has data (trip creation requires destination)
- Phase 2 may be skipped (traveler type is optional for report)
- Phase 4 may be empty (not all trips need transport/accommodation booked)
- Phases 3, 5, 6 contain the "generated content" that makes a report meaningful

### 8.2 Data Included in Report

| Phase | Data | Source | Sensitive Data Handling |
|---|---|---|---|
| 1 - O Chamado | Destination, origin, dates, trip type, coordinates | `Trip` table | None sensitive |
| 2 - O Explorador | Traveler type, accommodation style, pace, budget, passengers | `ExpeditionPhase.metadata` + `Trip.passengers` | None sensitive |
| 3 - O Preparo | Full checklist items with completion status | `PhaseChecklistItem` | None sensitive |
| 4 - A Logistica | Transport segments, accommodations, mobility | `TransportSegment`, `Accommodation`, `Trip.localMobility` | Booking codes MASKED (via `maskBookingCode` from summary service) |
| 5 - Guia do Destino | Full guide sections (timezone, currency, safety, etc.) | `DestinationGuide.content` | None sensitive |
| 6 - O Roteiro | Itinerary days with all activities | `ItineraryDay` + `Activity` | None sensitive |

### 8.3 What the Report Does NOT Include

- User email, phone, address, passport number (PII)
- Raw encrypted booking codes (only masked versions from summary)
- Points, badges, ranks (gamification data -- not relevant to trip report)
- AI generation metadata (model used, token counts)

## 9. Security Considerations

- **BOLA**: Every method checks `userId` via Prisma WHERE clause. `isReportAvailable` checks trip ownership. `generateTripReport` delegates to `ExpeditionSummaryService` which has its own BOLA check, plus additional queries that filter by tripId (already BOLA-validated).
- **Booking codes**: Phase 4 data comes from `ExpeditionSummaryService` which already masks booking codes via `maskBookingCode()`. The report service never sees or handles raw encrypted codes.
- **No PII in report**: No user email, phone, address, or passport data. Only `user.name` (for trip title context) could be considered PII -- acceptable in a user's own report.
- **Mass assignment prevention**: Report DTO is built by explicit field mapping, never by spreading raw DB results.

## 10. Performance Requirements

| Metric | Target |
|---|---|
| `isReportAvailable()` (3 parallel count/find queries) | < 50ms |
| `generateTripReport()` (summary + 3 enrichment queries) | < 300ms |
| Report page render (server component + data fetch) | < 1s |

`generateTripReport()` makes two rounds of parallel queries:
1. `isReportAvailable()`: 1 trip query + 3 parallel checks (~50ms)
2. `getExpeditionSummary()`: 1 trip query + 6 parallel queries (~100ms)
3. Enrichment: 3 parallel queries (~50ms)

Total: ~200ms for typical data volume. The trip query runs twice (availability + summary) which is a minor redundancy. Acceptable for MVP. Can be optimized later by passing a pre-fetched trip record.

## 11. Testing Strategy

### Unit Tests

- `ReportAvailability`: phases 3+5+6 present -> available; phase 3 missing -> unavailable with [3]; multiple missing -> correct missingPhases array
- `TripReportDTO` shape: verify all fields are correctly mapped from summary + enrichment
- `GuideSection` extraction: verify all section keys are extracted from guide content JSON
- `ItineraryDayDetail`: verify activities are ordered by `orderIndex`

### Integration Tests (Prisma mocked)

- `isReportAvailable()`: mock DB to return/not return phase data; verify correct availability
- `generateTripReport()`: mock DB with full data; verify DTO matches expected structure
- `generateTripReport()`: report not available -> throws AppError with 422
- BOLA: tripId belongs to different user -> throws AppError with 403
- Phase 4 booking codes: verify masked (not raw) codes in report DTO
- Empty phases: trip with no Phase 2 data -> phase2 is null in report
- Empty activities: itinerary day with 0 activities -> activities array is empty (not null)

### E2E Tests (Playwright)

- Navigate to summary page, verify "View Report" button is enabled when phases 3+5+6 have content
- Navigate to summary page with incomplete data, verify "View Report" button is disabled with tooltip explaining missing phases
- Click "View Report", verify report page renders with all phase sections
- Verify report page shows masked booking codes (not raw)
- Verify report page does not show PII (email, passport)

## 12. Component Architecture

### New Files

```
src/server/services/
  report-generation.service.ts    -- ReportGenerationService (server-only)

src/app/[locale]/(app)/expedition/[tripId]/report/
  page.tsx                        -- Server component: auth, generate report, render
  loading.tsx                     -- Suspense fallback

src/components/features/expedition/
  TripReport.tsx                  -- Client component: renders TripReportDTO as a formatted report
  ReportPhaseSection.tsx          -- Reusable section card for each phase in the report
```

### Modified Files

```
src/app/[locale]/(app)/expedition/[tripId]/summary/page.tsx
  -- Add isReportAvailable() call, pass to ExpeditionSummary as prop
  -- "View Report" button (enabled/disabled based on availability)
```

## 13. i18n

New translation keys:

```json
{
  "report": {
    "title": "Relatorio da Expedicao",
    "viewReport": "Ver relatorio",
    "reportNotAvailable": "O relatorio estara disponivel quando as fases de preparo, guia e roteiro estiverem completas.",
    "missingPhase3": "Gere o checklist de preparo",
    "missingPhase5": "Gere o guia do destino",
    "missingPhase6": "Crie o roteiro de viagem",
    "generatedAt": "Gerado em {date}",
    "phase1Title": "O Chamado",
    "phase2Title": "O Explorador",
    "phase3Title": "O Preparo",
    "phase4Title": "A Logistica",
    "phase5Title": "Guia do Destino",
    "phase6Title": "O Roteiro",
    "checklistProgress": "{done} de {total} itens completos",
    "itineraryDays": "{count} dias de roteiro",
    "activities": "{count} atividades"
  }
}
```

## 14. Migration Path

### Phase 1: Service Layer (Non-breaking)
1. Create `src/server/services/report-generation.service.ts`
2. Write unit and integration tests
3. No UI changes yet

### Phase 2: Report Page (Additive)
1. Create `/expedition/{tripId}/report/page.tsx`
2. Create `TripReport.tsx` and `ReportPhaseSection.tsx` components
3. Add i18n keys

### Phase 3: Summary Integration (Non-breaking)
1. Add `isReportAvailable()` call to summary page.tsx
2. Add "View Report" button to `ExpeditionSummary` component
3. Button links to `/expedition/{tripId}/report`

## 15. Open Questions

- [ ] **OQ-1**: Should the report page be accessible for incomplete expeditions (showing only available phases) or strictly gated by availability? Current decision: gated by availability (phases 3+5+6). Recommendation: keep gated for MVP to ensure report quality.
- [ ] **OQ-2**: Should the report include a "trip readiness" percentage from `TripReadinessService`? Nice-to-have, low priority. Recommendation: defer.
- [ ] **OQ-3**: Should the guide content in the report be the full text or a summary/highlights version? Current decision: full sections (all keys from guide content). This matches SPEC-ARCH-014 OQ-1's recommendation to include highlights only for *shared* reports, but full content for the user's own report.

## 16. Definition of Done

- [ ] `ReportGenerationService` created with `isReportAvailable()` and `generateTripReport()`
- [ ] Service delegates to `ExpeditionSummaryService` for base data (no query duplication)
- [ ] Report availability checks phases 3, 5, 6 for content presence
- [ ] Report DTO includes all 6 phases with enriched detail data
- [ ] Booking codes masked in report (via summary service `maskBookingCode`)
- [ ] No PII (email, passport, phone) in report DTO
- [ ] BOLA enforced on all service methods
- [ ] Report page at `/expedition/{tripId}/report`
- [ ] "View Report" button on summary page (gated by availability)
- [ ] Missing phases shown as tooltip/message on disabled button
- [ ] Unit tests for availability logic and DTO construction
- [ ] Integration tests for BOLA, error cases, data mapping
- [ ] E2E test for report page rendering
- [ ] i18n keys for pt-BR and en
- [ ] Unit test coverage >= 80% for new code
- [ ] ADR-022 accepted by tech-lead

> PROPOSED -- Awaiting tech-lead review before implementation begins
