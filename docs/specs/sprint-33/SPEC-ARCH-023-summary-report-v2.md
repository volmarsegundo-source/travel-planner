# Technical Specification: Summary/Report Data Aggregation v2

**Spec ID**: SPEC-ARCH-023
**Related Stories**: SPEC-PROD-032 (IMP-004), TASK-S33-008, TASK-S33-009, TASK-S33-010
**Author**: architect
**Status**: Draft
**Last Updated**: 2026-03-20

---

## 1. Overview

This spec defines the v2 architecture for the expedition summary/report data aggregation, expanding the existing `ExpeditionSummaryService` to return complete, untruncated data from all 6 phases with pending-item calculation, expedition completeness percentage, and phase-by-phase status. The v2 DTO replaces the current summary-only shape with a full report shape that supports: (a) access from Phase 2 onwards, (b) display of all user data without abbreviation, (c) inline pending-item highlighting, and (d) i18n translation at the component layer.

## 2. Architecture Diagram

```
Summary/Report Page (server component)
  |
  v
ExpeditionSummaryService.getFullReport(tripId, userId)
  |
  +---> BOLA check (trip.userId === session.userId)
  |
  +---> Promise.all([
  |       trip query (Phase 1 fields),
  |       phase2 metadata,
  |       userProfile (preferences),
  |       phaseChecklistItems (Phase 3 -- ALL items, not just count),
  |       transportSegments (ALL fields except bookingCodeEnc raw),
  |       accommodations (ALL fields except bookingCodeEnc raw),
  |       destinationGuide (full content),
  |       itineraryDays + activities (full),
  |       expeditionPhases (all 6 -- status + completedAt),
  |     ])
  |
  v
buildFullReportDTO(allData) --> ExpeditionFullReport
  |
  v
ExpeditionReport (client component)
  |
  +---> Phase sections (expandable accordion on mobile)
  +---> Pending items panel (top)
  +---> Completeness indicator (percentage)
  +---> Section anchors (deep links)
  +---> Booking code reveal (click to unmask)
  +---> Print/PDF action
```

## 3. Data Model

### ExpeditionFullReport DTO

```typescript
// src/server/services/expedition-summary.service.ts (extended)

/** Phase status derived from ExpeditionPhase records */
export type ReportPhaseStatus = "not_started" | "in_progress" | "completed";

/** Individual pending item with link to phase */
export interface PendingItem {
  phaseNumber: number;
  category: string;               // "checklist" | "transport" | "accommodation" | "guide" | "itinerary"
  messageKey: string;              // i18n key for the pending message
  count?: number;                  // For checklist: number of mandatory items pending
}

// ─── Phase 1 (expanded) ─────────────────────────────────────────────────────

export interface ReportPhase1 {
  destination: string;
  origin: string | null;
  startDate: string | null;        // ISO date
  endDate: string | null;
  durationDays: number | null;     // Calculated
  tripType: string;
  destinationLat: number | null;
  destinationLon: number | null;
}

// ─── Phase 2 (expanded) ─────────────────────────────────────────────────────

export interface ReportPhase2 {
  travelerType: string;
  accommodationStyle: string;
  travelPace: number | null;
  budget: number | null;
  currency: string | null;
  passengers: {
    adults: number;
    children: number;
    childrenAges: number[];
    infants: number;
    seniors: number;
    total: number;
  } | null;
  // User preferences (all 10 categories)
  preferences: {
    travelPace: string | null;
    foodPreferences: string[];
    interests: string[];
    budgetStyle: string | null;
    socialPreference: string[];
    accommodationStyle: string[];
    fitnessLevel: string | null;
    photographyInterest: string | null;
    wakePreference: string | null;
    connectivityNeeds: string | null;
  } | null;
}

// ─── Phase 3 (expanded -- full items, not just count) ────────────────────────

export interface ReportChecklistItem {
  itemKey: string;
  required: boolean;
  completed: boolean;
  category: string;                // Derived from itemKey prefix or stored category
}

export interface ReportPhase3 {
  items: ReportChecklistItem[];
  totalItems: number;
  completedItems: number;
  mandatoryTotal: number;
  mandatoryCompleted: number;
  categories: string[];            // Distinct categories present
}

// ─── Phase 4 (expanded -- full fields) ───────────────────────────────────────

export interface ReportTransportSegment {
  type: string;
  departurePlace: string | null;
  arrivalPlace: string | null;
  departureAt: string | null;      // ISO datetime
  arrivalAt: string | null;
  provider: string | null;
  maskedBookingCode: string | null;
  estimatedCost: number | null;
  currency: string | null;
  notes: string | null;
  isReturn: boolean;
}

export interface ReportAccommodation {
  type: string;
  name: string | null;
  address: string | null;
  checkIn: string | null;
  checkOut: string | null;
  maskedBookingCode: string | null;
  estimatedCost: number | null;
  currency: string | null;
  notes: string | null;
}

export interface ReportPhase4 {
  transportSegments: ReportTransportSegment[];
  accommodations: ReportAccommodation[];
  mobility: string[];
}

// ─── Phase 5 (expanded -- full guide content) ────────────────────────────────

export interface ReportGuideSection {
  key: string;                     // GuideSectionKey
  title: string;
  icon: string;
  content: string;                 // Full section text
}

export interface ReportPhase5 {
  generatedAt: string;
  sections: ReportGuideSection[];
  totalSections: number;
}

// ─── Phase 6 (expanded -- full itinerary) ────────────────────────────────────

export interface ReportActivity {
  title: string;
  notes: string | null;
  startTime: string | null;
  endTime: string | null;
  activityType: string | null;
}

export interface ReportItineraryDay {
  dayNumber: number;
  date: string | null;
  notes: string | null;
  activities: ReportActivity[];
}

export interface ReportPhase6 {
  days: ReportItineraryDay[];
  dayCount: number;
  totalActivities: number;
}

// ─── Full Report ─────────────────────────────────────────────────────────────

export interface ExpeditionFullReport {
  tripId: string;
  tripTitle: string;
  tripStatus: string;

  // Phase statuses
  phaseStatuses: Record<number, ReportPhaseStatus>;

  // Completeness
  completenessPercent: number;     // 0-100
  completedPhaseCount: number;
  totalPhaseCount: 6;

  // Pending items
  pendingItems: PendingItem[];

  // Phase data (null = phase not started)
  phase1: ReportPhase1;           // Always present (trip exists)
  phase2: ReportPhase2 | null;
  phase3: ReportPhase3 | null;
  phase4: ReportPhase4 | null;
  phase5: ReportPhase5 | null;
  phase6: ReportPhase6 | null;
}
```

### No Schema Migration Required

All data already exists. This spec reads existing models with expanded `select` clauses.

## 4. API Contract

### Service Method

```typescript
class ExpeditionSummaryService {
  // Existing (kept for backward compat -- used by ExpeditionSummary component)
  static async getExpeditionSummary(tripId: string, userId: string): Promise<ExpeditionSummary>;

  // New (v2 -- full report)
  static async getFullReport(tripId: string, userId: string): Promise<ExpeditionFullReport>;
}
```

### Access Guard Change

Currently, the summary page requires Phase 6 completion (or similar). Change the access check:

```typescript
// In summary/page.tsx
// Before: trip.currentPhase >= 6 or similar
// After:
if (trip.currentPhase < 2) {
  redirect(`/${locale}/expedition/${tripId}/phase-1`);
}
```

The report is accessible from Phase 2 onwards (AC-001, AC-002).

### Error Responses

| Condition | Behavior |
|-----------|----------|
| Trip not found | throw NotFoundError("errors.tripNotFound") |
| BOLA violation (trip.userId !== session.userId) | throw NotFoundError (same -- do not reveal existence) |
| Trip in Phase 1 | redirect to Phase 1 (not an error, just guard) |

## 5. Business Logic

### Completeness Calculation

```typescript
function calculateCompleteness(phaseStatuses: Record<number, ReportPhaseStatus>): number {
  const weights: Record<number, number> = {
    1: 15,  // Trip basics
    2: 15,  // Traveler profile
    3: 20,  // Document checklist
    4: 20,  // Logistics
    5: 15,  // Destination guide
    6: 15,  // Itinerary
  };

  let earned = 0;
  for (const [phase, weight] of Object.entries(weights)) {
    const status = phaseStatuses[Number(phase)];
    if (status === "completed") earned += weight;
    else if (status === "in_progress") earned += weight * 0.5;
  }

  return Math.round(earned);
}
```

**Phase status derivation**:
- `completed`: ExpeditionPhase.status === "completed"
- `in_progress`: ExpeditionPhase record exists AND status !== "completed"
- `not_started`: No ExpeditionPhase record for this phase number, OR phase number > trip.currentPhase

### Pending Items Calculation

```typescript
function calculatePendingItems(report: ExpeditionFullReport): PendingItem[] {
  const pending: PendingItem[] = [];

  // Phase 3: mandatory checklist items not completed
  if (report.phase3) {
    const mandatoryPending = report.phase3.mandatoryTotal - report.phase3.mandatoryCompleted;
    if (mandatoryPending > 0) {
      pending.push({
        phaseNumber: 3,
        category: "checklist",
        messageKey: "report.pending.mandatoryChecklist",
        count: mandatoryPending,
      });
    }
  } else if (report.phaseStatuses[3] !== "not_started") {
    pending.push({
      phaseNumber: 3,
      category: "checklist",
      messageKey: "report.pending.checklistEmpty",
    });
  }

  // Phase 4: no transport
  if (report.phase4 && report.phase4.transportSegments.length === 0) {
    pending.push({
      phaseNumber: 4,
      category: "transport",
      messageKey: "report.pending.noTransport",
    });
  }

  // Phase 4: no accommodation
  if (report.phase4 && report.phase4.accommodations.length === 0) {
    pending.push({
      phaseNumber: 4,
      category: "accommodation",
      messageKey: "report.pending.noAccommodation",
    });
  }

  // Phase 5: guide not generated
  if (!report.phase5 && report.phaseStatuses[5] !== "not_started") {
    pending.push({
      phaseNumber: 5,
      category: "guide",
      messageKey: "report.pending.guideNotGenerated",
    });
  }

  // Phase 6: itinerary not generated
  if (!report.phase6 && report.phaseStatuses[6] !== "not_started") {
    pending.push({
      phaseNumber: 6,
      category: "itinerary",
      messageKey: "report.pending.itineraryNotGenerated",
    });
  }

  return pending;
}
```

### Booking Code Handling

Booking codes are stored encrypted (`bookingCodeEnc`). In the report:
- **Default display**: masked (existing `maskBookingCode()` function)
- **Reveal on click** (AC-014): The client component calls a server action to decrypt and return the full code. This action has BOLA check.

```typescript
// New server action
export async function revealBookingCodeAction(
  tripId: string,
  segmentId: string,
  type: "transport" | "accommodation"
): Promise<{ code: string } | { error: string }>;
```

This action:
1. Checks session authentication
2. Verifies trip ownership (BOLA)
3. Fetches the encrypted code from the specific record
4. Decrypts and returns
5. Rate-limited: 10 reveals per minute per user

### i18n Translation Strategy

**Principle**: All translation happens at the component layer, NOT in the service.

The service returns raw enum values (e.g., `"flight"`, `"hotel"`, `"relaxed"`). The React component translates them using `useTranslations`:

```typescript
// In ExpeditionReport component
const t = useTranslations("report");
// t(`enums.transportType.${segment.type}`) => "Voo" (pt-BR) or "Flight" (en)
// t(`enums.accommodationType.${record.type}`) => "Hotel" (pt-BR)
// t(`enums.travelPace.${pace}`) => "Relaxado" (pt-BR)
```

**i18n key structure**:

```json
{
  "report": {
    "title": "Relatorio da Expedicao",
    "completeness": "Completude: {percent}%",
    "pendingPanel": "Pendencias",
    "noPending": "Tudo completo!",
    "notStarted": "Nao preenchido ainda",
    "inProgress": "Em andamento",
    "sections": {
      "phase1": "Dados da Viagem",
      "phase2": "Perfil do Viajante",
      "phase3": "Checklist de Documentos",
      "phase4": "Logistica",
      "phase5": "Guia de Destino",
      "phase6": "Roteiro"
    },
    "enums": {
      "transportType": { "flight": "Voo", "bus": "Onibus", "train": "Trem", "car": "Carro", "ferry": "Balsa", "other": "Outro" },
      "accommodationType": { "hotel": "Hotel", "hostel": "Hostel", "airbnb": "Airbnb", "friends_house": "Casa de amigos", "camping": "Camping", "other": "Outro" },
      "travelPace": { "relaxed": "Relaxado", "moderate": "Moderado", "intense": "Intenso" },
      "tripType": { "international": "Internacional", "domestic": "Nacional" },
      "travelerType": { "leisure_solo": "Lazer Solo", "leisure_couple": "Casal", "family": "Familia", "business": "Negocios", "backpacker": "Mochileiro" }
    },
    "pending": {
      "mandatoryChecklist": "{count} itens obrigatorios pendentes",
      "checklistEmpty": "Checklist nao preenchido",
      "noTransport": "Nenhum transporte cadastrado",
      "noAccommodation": "Nenhuma hospedagem cadastrada",
      "guideNotGenerated": "Guia de destino nao gerado",
      "itineraryNotGenerated": "Roteiro nao gerado"
    }
  }
}
```

### Empty Phase Rendering (AC-006)

For phases with status `not_started`, the component renders a placeholder card:

```tsx
<section id={`phase-${phaseNumber}`}>
  <h2>{t(`sections.phase${phaseNumber}`)}</h2>
  <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/10 p-6 text-center">
    <p className="text-muted-foreground">{t("notStarted")}</p>
  </div>
</section>
```

### Print/PDF (AC-012)

For MVP, use browser `window.print()` with a print-specific CSS stylesheet that:
- Hides navigation, footer, header, action buttons
- Removes accordion collapse (all sections expanded)
- Uses `@media print` rules
- Sets `page-break-inside: avoid` on phase sections

Full PDF generation via `@react-pdf/renderer` is deferred (was already deferred in SPEC-ARCH-014). Browser print-to-PDF is sufficient for Sprint 33.

## 6. External Integrations

None. All data is sourced from the local database.

## 7. Security Considerations

- **BOLA**: `getFullReport()` includes `userId` in the trip WHERE clause. The reveal-booking-code action also checks ownership.
- **PII exclusion**: `birthDate` is NOT included in the report (per SPEC-SEC-003 finding and SPEC-PROD-032 security constraint). Age range can be derived for display but must not expose the exact date.
- **Booking code masking**: Default masked display. Reveal requires explicit user action + BOLA check + rate limit.
- **noindex**: The report page includes `<meta name="robots" content="noindex">` and is behind auth middleware. No public caching.
- **Server rendering**: Booking codes are decrypted server-side only for the reveal action. The initial HTML rendered by the server component contains ONLY masked codes.

## 8. Performance Requirements

| Metric | Target | Approach |
|--------|--------|----------|
| Report load time | < 2s on 4G (AC from SPEC-PROD-032) | Single Promise.all with 9 parallel queries, all using SELECT clauses |
| Database queries | 9 (parallel) | No N+1; activities fetched via nested include on itineraryDays |
| Payload size | < 50KB for full expedition | JSON serialization of DTO; no base64 images |
| Print/PDF | Non-blocking | window.print() opens browser dialog |
| Booking code reveal | < 500ms | Single DB read + decrypt |

### Query Optimization

The full report query is heavier than the existing summary. Key optimizations:

1. **Nested include for Phase 6**: Use `itineraryDays: { include: { activities: true }, orderBy: { dayNumber: "asc" } }` instead of separate queries
2. **Select clauses**: Fetch only needed columns (e.g., do NOT fetch `createdAt`/`updatedAt` for display-only data)
3. **Guide content**: The `DestinationGuide.content` JSON can be large (5-10KB). This is acceptable for a single trip report.

### Cache Strategy

No cache for MVP (consistent with ADR-020). The report is always fresh from the database. If performance becomes an issue, add Redis cache with `revalidateTag` on any phase completion action.

## 9. Testing Strategy

### Unit Tests

- `calculateCompleteness`: all completed = 100%; none = 0%; mixed = expected percentage; in-progress = half weight
- `calculatePendingItems`: full expedition = empty array; missing transport = pending item; mandatory checklist incomplete = pending with count
- `buildFullReportDTO`: all phases present -> full DTO; partial phases -> null sections; booking codes masked
- `ReportPhase3` construction: items grouped by category; mandatory vs optional correctly separated

### Integration Tests

- `getFullReport`: mock DB with full data -> DTO has all 6 phases populated
- `getFullReport`: mock DB with Phase 1+2 only -> phases 3-6 null, statuses correct
- `getFullReport`: BOLA violation -> NotFoundError
- `revealBookingCodeAction`: valid request -> decrypted code; BOLA violation -> error

### E2E Tests

- Navigate to report from Phase 2 -> report loads with Phase 1 data + Phase 2 data
- Navigate to report from completed expedition -> all 6 sections visible, completeness 100%
- Click booking code reveal -> code shown; verify auto-hide after 10 seconds (UX decision)

### EDD Eval Criteria

| Eval ID | Dimension | Criterion | Pass Threshold |
|---------|-----------|-----------|----------------|
| EDD-023-01 | Correctness | Full expedition produces completenessPercent = 100 | 100% |
| EDD-023-02 | Correctness | Report from Phase 2 shows Phase 1 data + Phase 2 data, others null | 100% |
| EDD-023-03 | Correctness | Pending items list matches actual missing data | 100% |
| EDD-023-04 | Security | birthDate NEVER appears in report DTO | 100% |
| EDD-023-05 | Security | bookingCodeEnc raw value NEVER appears in report DTO (only masked) | 100% |
| EDD-023-06 | Performance | getFullReport completes in < 2s for full expedition (9 parallel queries) | 95th percentile |
| EDD-023-07 | i18n | All enum values in report have translation keys in both locales | 100% |
| EDD-023-08 | Backward Compat | Existing getExpeditionSummary method unchanged and tests pass | 100% |
| EDD-023-09 | Accessibility | Pending items communicated via text+icon, not color alone (WCAG) | 100% |

## 10. Implementation Notes for Developers

1. **Do NOT modify `getExpeditionSummary`** -- it is used by `ExpeditionSummary.tsx` (the existing summary card). Create `getFullReport` as a NEW method. Eventually `getExpeditionSummary` can be deprecated, but not in this sprint.

2. **Reuse `maskBookingCode`** from the existing service. It already handles edge cases (short codes, decrypt errors).

3. **Guide content casting**: The `DestinationGuide.content` field is `Json` in Prisma. Cast to `DestinationGuideContent` (already defined in `src/types/ai.types.ts`) and iterate over all section keys, not just the 3 highlight keys.

4. **Accommodation address**: Include in report (unlike prompt enrichment which excludes it). The user entered this data and expects to see it in their own report.

5. **Phase status derivation**: Query all 6 `ExpeditionPhase` records. For any phase without a record, check if `phaseNumber <= trip.currentPhase` to distinguish "in_progress" from "not_started". Phase 1 is always "completed" if the trip exists.

6. **Print CSS**: Create `src/styles/print.css` with `@media print` rules. Import it globally (it only applies during print). Ensure accordion sections expand in print mode.

7. **Section anchors (AC-013)**: Each phase section uses `id={`phase-${phaseNumber}`}`. The pending items panel links to `#phase-${pendingItem.phaseNumber}`. Use `scroll-margin-top` CSS to account for the sticky header.

8. **Reveal booking code component**: Create a `RevealableCode` component that shows masked text with a button. On click, calls server action, shows full code for 10 seconds, then re-masks. Include `aria-live="polite"` for screen readers.

## 11. Open Questions

- [ ] OQ-1: Should the completeness percentage include preferences from UserProfile, or only the 6 expedition phases? Recommendation: only the 6 phases for simplicity; preferences are a profile feature, not a trip feature.
- [ ] OQ-2: Should the report page be a new route (`/expedition/[tripId]/report`) separate from the existing summary (`/expedition/[tripId]/summary`)? Recommendation: reuse the existing `/summary` route and replace its content. A redirect from any legacy bookmarks.
- [ ] OQ-3: Duration of booking code reveal before auto-masking? Recommendation: 10 seconds, with a visible countdown.

## 12. Definition of Done

- [ ] All AC from SPEC-PROD-032 are met (AC-001 through AC-016)
- [ ] `getFullReport` method implemented with all phase data
- [ ] Report accessible from Phase 2 onwards
- [ ] Completeness percentage calculated and displayed
- [ ] Pending items panel with links to relevant phases
- [ ] Empty phases show "Not started" placeholder
- [ ] Booking codes masked by default with reveal action
- [ ] Print CSS applied for browser print-to-PDF
- [ ] i18n keys for all enum values and section names in both locales
- [ ] BOLA enforced on getFullReport and revealBookingCodeAction
- [ ] birthDate excluded from report
- [ ] Unit test coverage >= 80% on new service methods and DTOs
- [ ] Existing getExpeditionSummary tests pass (backward compat)
- [ ] EDD eval criteria EDD-023-01 through EDD-023-09 pass

> Draft -- pending tech-lead review

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-20 | architect | Initial draft -- Sprint 33 summary/report v2 architecture |
