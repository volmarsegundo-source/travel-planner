---
id: SPEC-ARCH-007
title: "Summary Page Integration -- Readiness, Next Steps, and Countdown"
status: draft
sprint: 29
author: architect
created: 2026-03-12
version: "1.0.0"
related_specs:
  - SPEC-ARCH-004
  - SPEC-ARCH-005
  - SPEC-PROD-007
  - SPEC-PROD-010
---

# SPEC-ARCH-007: Summary Page Integration -- Readiness, Next Steps, and Countdown

**Version**: 1.0.0
**Status**: Draft
**Author**: architect
**Reviewers**: [tech-lead, ux-designer, qa-engineer, security-specialist]
**Created**: 2026-03-12
**Last Updated**: 2026-03-12

---

## 1. Overview

The expedition summary page (`/expedition/[tripId]/summary`) currently renders phase-by-phase data from `ExpeditionSummaryService` in a text-based layout. Sprint 28 introduced three new backend capabilities -- `TripReadinessService` (weighted preparation percentage), `NextStepsEngine` (contextual suggestions), and `TripCountdown` (days-until-trip display) -- but these are not yet integrated into the summary page.

This spec defines how to wire the new services into the summary page's server component, pass the assembled data to client components, and render readiness, next steps, and countdown within the existing card-based layout. No new services or database models are needed -- this is pure integration and UI composition work.

---

## 2. Architecture Decision Records

### ADR-021: Summary Page Data Assembly -- Single Server Component Orchestration

- **Status**: Proposed
- **Context**: The summary page needs data from three independent sources: `ExpeditionSummaryService.getExpeditionSummary()` (phase data), `TripReadinessService.calculateTripReadiness()` (readiness percentage), and `NextStepsEngine.getNextStepsSuggestions()` (actionable suggestions). Each service performs its own BOLA check. We need to decide whether to: (A) call all three independently from the page server component, (B) create a facade service that combines them, or (C) merge the readiness/next-steps logic into `ExpeditionSummaryService`.

- **Options Considered**:

| Option | Pros | Cons |
|---|---|---|
| A: Parallel calls in page.tsx | Simple. No new abstractions. Each service stays single-responsibility. | Three BOLA checks (redundant). 3 independent trip lookups. |
| B: Facade service | Single BOLA check. Clean API. | New file. Couples three services. May become a god-class over time. |
| C: Merge into ExpeditionSummaryService | Single service, single query set. | Violates SRP. Bloats existing service. Harder to test in isolation. |

- **Decision**: **Option A -- parallel calls in page.tsx**. The server component calls all three in `Promise.all`. The redundant BOLA checks are acceptable: each hits the `trips` table PK index (< 1ms), and keeping services independent preserves testability and single responsibility. The NextStepsEngine is a pure function (no DB calls) -- it receives the readiness result as input, so it runs synchronously after readiness is computed.

- **Consequences**:
  - **Positive**: No new abstractions. Each service remains independently testable. Easy to add/remove sections later.
  - **Negative**: Two redundant trip lookups (ExpeditionSummaryService + TripReadinessService both fetch the Trip). At < 1ms each via PK index, this is negligible.
  - **Risk**: If a future "summary v2" needs even more data sources, this pattern could lead to many parallel calls. Mitigated: if it reaches 5+ parallel calls, create a facade then (YAGNI for now).

---

## 3. System Design

### 3.1 Data Flow

```
SummaryPage (Server Component) -- src/app/[locale]/(app)/expedition/[tripId]/summary/page.tsx
  |
  |-- auth() --> session.user.id
  |
  |-- Promise.all([
  |     ExpeditionSummaryService.getExpeditionSummary(tripId, userId),  // existing
  |     TripReadinessService.calculateTripReadiness(tripId, userId),    // Sprint 28
  |   ])
  |     --> [summary, readiness]
  |
  |-- nextSteps = getNextStepsSuggestions(tripId, readiness.phases, readiness.readinessPercent)
  |     // Pure function, synchronous, no DB calls
  |
  |-- trip = await db.trip.findFirst({ where: {id, userId}, select: {startDate, endDate} })
  |     // For countdown -- OR reuse from readiness.phases[0].dataSnapshot
  |
  |-- <ExpeditionSummary
  |       tripId={tripId}
  |       summary={summary}
  |       readiness={readiness}
  |       nextSteps={nextSteps}
  |       startDate={startDate}
  |       endDate={endDate}
  |     />
```

**Key optimization**: The `TripReadinessService` already fetches `trip.startDate` and `trip.endDate` in its internal query. Rather than making a fourth DB call for countdown dates, extract them from the readiness result's `phases[0].dataSnapshot` (Phase 1 always contains `startDate` and `endDate`). This eliminates the redundant trip fetch.

### 3.2 Revised Data Flow (Optimized)

```
SummaryPage (Server Component)
  |
  |-- auth() --> session.user.id
  |
  |-- [summary, readiness] = await Promise.all([
  |     ExpeditionSummaryService.getExpeditionSummary(tripId, userId),
  |     TripReadinessService.calculateTripReadiness(tripId, userId),
  |   ])
  |
  |-- nextSteps = getNextStepsSuggestions(tripId, readiness.phases, readiness.readinessPercent)
  |
  |-- startDate/endDate from readiness.phases[0].dataSnapshot (no extra DB call)
  |
  |-- Serialize all data as props to <ExpeditionSummary />
```

### 3.3 Component Composition

```
<ExpeditionSummary>
  |
  |-- <TripCountdown startDate={...} endDate={...} />
  |     // Existing component -- already built in Sprint 28
  |
  |-- <ReadinessIndicator percent={readiness.readinessPercent} phases={readiness.phases} />
  |     // NEW: visual progress ring + per-phase status badges
  |
  |-- <NextStepsList steps={nextSteps} />
  |     // NEW: 1-3 clickable action cards
  |
  |-- [Existing phase cards: Phase1..Phase6 sections unchanged]
  |
  |-- <WizardFooter /> or "View Dashboard" CTA
```

---

## 4. Data Model

No new database models or migrations. All data comes from existing services.

### 4.1 Props Interface (Server -> Client Boundary)

```typescript
// Updated ExpeditionSummaryProps
interface ExpeditionSummaryProps {
  tripId: string;
  summary: ExpeditionSummary;          // from expedition-summary.service.ts
  readiness: TripReadinessResult;      // from trip-readiness.service.ts
  nextSteps: NextStep[];               // from next-steps-engine.ts
  tripDates: {
    startDate: string | null;          // ISO date string
    endDate: string | null;            // ISO date string
  };
  celebration?: {
    pointsEarned: number;
    badgeAwarded: string | null;
  } | null;
}
```

### 4.2 Serialization Notes

All data crossing the server-client boundary must be JSON-serializable:
- `Date` objects from Prisma are already converted to ISO strings by both services.
- `readiness.phases[].dataSnapshot` contains `Record<string, unknown>` -- already serializable.
- `NextStep[]` contains only strings and numbers -- already serializable.

No `Decimal`, `Date`, or `BigInt` types cross this boundary.

---

## 5. New Client Components

### 5.1 ReadinessIndicator

```
src/components/features/expedition/summary/ReadinessIndicator.tsx
```

**Props**:
```typescript
interface ReadinessIndicatorProps {
  percent: number;                     // 0-100
  phases: PhaseReadiness[];            // per-phase status
}
```

**Rendering**:
- Circular progress ring (SVG, no external library) showing `percent`.
- Below the ring: 6 small phase status dots (green = complete, amber = partial, gray = not_started).
- Accessible: `role="meter"`, `aria-valuenow={percent}`, `aria-valuemin={0}`, `aria-valuemax={100}`, `aria-label` with localized "Trip readiness: X%".
- Color scale: 0-33% = destructive, 34-66% = amber/warning, 67-100% = success/green.

**Size**: < 3KB client JS. Pure SVG + Tailwind. No animation library.

### 5.2 NextStepsList

```
src/components/features/expedition/summary/NextStepsList.tsx
```

**Props**:
```typescript
interface NextStepsListProps {
  steps: NextStep[];                   // 1-3 items
}
```

**Rendering**:
- Vertical stack of 1-3 action cards.
- Each card: icon (phase-appropriate), localized label (via `labelKey` + `useTranslations`), right-arrow indicator.
- Each card is a `<Link>` wrapping the card content, navigating to `step.targetUrl`.
- Use `@/i18n/navigation` `Link` (NOT `next/link`).
- Empty state: if `steps` is empty, render nothing (should not happen -- engine always returns >= 1).

**Accessibility**: Each card is a focusable link with descriptive `aria-label`.

---

## 6. Server Component Changes

### 6.1 summary/page.tsx (Updated)

```typescript
// src/app/[locale]/(app)/expedition/[tripId]/summary/page.tsx
import { ExpeditionSummaryService } from "@/server/services/expedition-summary.service";
import { TripReadinessService } from "@/server/services/trip-readiness.service";
import { getNextStepsSuggestions } from "@/lib/engines/next-steps-engine";

export default async function SummaryPage({ params }: SummaryPageProps) {
  const { locale, tripId } = await params;
  const session = await auth();
  // ... auth guard ...

  let summary, readiness;
  try {
    [summary, readiness] = await Promise.all([
      ExpeditionSummaryService.getExpeditionSummary(tripId, session.user.id),
      TripReadinessService.calculateTripReadiness(tripId, session.user.id),
    ]);
  } catch {
    redirect({ href: "/dashboard", locale });
    return null;
  }

  const nextSteps = getNextStepsSuggestions(
    tripId,
    readiness.phases,
    readiness.readinessPercent
  );

  // Extract dates from readiness phase 1 snapshot (avoids extra DB call)
  const phase1 = readiness.phases.find((p) => p.phase === 1);
  const tripDates = {
    startDate: (phase1?.dataSnapshot.startDate as string) ?? null,
    endDate: (phase1?.dataSnapshot.endDate as string) ?? null,
  };

  return (
    <ExpeditionSummary
      tripId={tripId}
      summary={summary}
      readiness={readiness}
      nextSteps={nextSteps}
      tripDates={tripDates}
    />
  );
}
```

### 6.2 Error Handling

Both services throw on BOLA violation or missing trip. The single `try/catch` around `Promise.all` handles both:
- `AppError("FORBIDDEN")` from `TripReadinessService` -> redirect to dashboard.
- `Error("errors.tripNotFound")` from `ExpeditionSummaryService` -> redirect to dashboard.

If one service fails, both results are discarded and the user is redirected. This is correct: a partial summary with readiness but no phase data (or vice versa) is not useful.

### 6.3 Loading State

The summary page is a Server Component -- it renders fully on the server before streaming to the client. Loading state is handled by Next.js Suspense via `loading.tsx` in the same directory (if it exists) or the parent layout's loading boundary.

No client-side skeleton is needed for the readiness/next-steps sections since they are rendered server-side as part of the initial HTML.

---

## 7. Security Considerations

- **BOLA**: Both `ExpeditionSummaryService` and `TripReadinessService` independently verify `trip.userId === userId`. No change needed.
- **No new data exposure**: ReadinessIndicator displays a percentage (0-100) and phase statuses (complete/partial/not_started). No PII, no booking codes, no encrypted data.
- **NextStepsEngine**: Pure function operating on already-BOLA-verified data. No direct DB access. No security concern.
- **XSS**: `NextStep.labelKey` is an i18n key (not user input). `labelValues` are numbers and phase names from `PHASE_DEFINITIONS` (hardcoded). No user-generated content is rendered unescaped.

---

## 8. Performance Requirements

| Metric | Target | Notes |
|---|---|---|
| Server data assembly | < 60ms | Two parallel service calls (each < 50ms), plus sync NextSteps computation (< 1ms) |
| Page LCP | < 1.5s | Same as SPEC-ARCH-005 target |
| New component bundle | < 5KB | ReadinessIndicator (SVG + Tailwind) + NextStepsList (links + text) |
| CLS | < 0.05 | All content server-rendered, no client-side layout shift |

### Caching (Not Implemented)

Same strategy as SPEC-ARCH-005 ADR-020: no cache for MVP. Both services return fresh data on every page load. The combined latency (< 60ms server-side) does not justify cache complexity.

---

## 9. Testing Strategy

### Unit Tests

**ReadinessIndicator**:
- Renders correct percentage text for 0%, 50%, 100%.
- Applies correct color class for each range (0-33 red, 34-66 amber, 67-100 green).
- Renders 6 phase dots with correct status colors.
- Has correct ARIA attributes (`role="meter"`, `aria-valuenow`).

**NextStepsList**:
- Renders 1 step correctly.
- Renders 3 steps correctly.
- Each step links to correct `targetUrl`.
- Uses `@/i18n/navigation` Link (not `next/link`).
- Empty array renders nothing (no wrapper div).

### Integration Tests (Page Level)

- Page fetches from both services in parallel and renders all sections.
- If `TripReadinessService` throws `FORBIDDEN`, page redirects to `/dashboard`.
- If `ExpeditionSummaryService` throws, page redirects to `/dashboard`.
- Phase 1 dates are correctly extracted from readiness snapshot for countdown.
- Countdown component receives correct Date objects.

### Existing Tests (Regression)

- All existing `ExpeditionSummary` component tests must continue passing.
- The new `readiness` and `nextSteps` props should be added as optional in the transition, then made required once integration is complete.

### Test Count Estimate

- ReadinessIndicator: 5 tests
- NextStepsList: 4 tests
- Page integration: 4 tests
- **Total new tests**: ~13

---

## 10. Implementation Notes for Developers

1. **Prop backward compatibility**: During implementation, add `readiness?`, `nextSteps?`, and `tripDates?` as optional props to `ExpeditionSummaryProps` first. Render the new sections conditionally (`readiness && <ReadinessIndicator ... />`). Once the page.tsx is updated to always pass them, make the props required.

2. **Import path for NextStepsEngine**: `getNextStepsSuggestions` is in `src/lib/engines/next-steps-engine.ts` which is NOT marked `server-only`. It is an isomorphic pure function and can be imported in both server and client contexts. However, since we call it in the server component, no client bundle impact.

3. **Date extraction from readiness**: `readiness.phases[0].dataSnapshot.startDate` returns a string like `"2026-04-15"` (ISO date portion, no time). Pass this to `TripCountdown` as `new Date(dateString)` -- the component already handles `Date | null`.

4. **Layout placement**: Recommended order within the summary page:
   - TripCountdown (hero position, top)
   - ReadinessIndicator (below countdown)
   - NextStepsList (below readiness, only if `readinessPercent < 100`)
   - Phase cards (existing, unchanged)
   - Dashboard CTA (bottom)

5. **SVG progress ring**: Use a standard SVG circle with `stroke-dasharray` and `stroke-dashoffset` for the ring. No animation library needed. Example pattern:
   ```
   <svg viewBox="0 0 120 120">
     <circle cx="60" cy="60" r="54" stroke="gray" strokeWidth="8" fill="none" />
     <circle cx="60" cy="60" r="54" stroke="green" strokeWidth="8" fill="none"
       strokeDasharray={339.29} strokeDashoffset={339.29 * (1 - percent/100)}
       transform="rotate(-90 60 60)" />
   </svg>
   ```

6. **Do NOT use**: `useEffect` for data fetching in these components. All data comes from server props. Client components are purely presentational.

---

## 11. Open Questions

- [x] Should ReadinessIndicator use a circular ring or a horizontal bar? **Decision**: Circular ring -- visually distinct from the existing `PhaseProgressBar` (horizontal) and provides a clear focal point.
- [ ] Should NextStepsList be hidden when readiness is 100%? Recommendation: Yes -- replace with a congratulatory message. But confirm with product-owner.
- [ ] Should the countdown section show both "days until trip" and the actual dates? Currently TripCountdown shows only the message, not the dates. The dates are shown in Phase 1 card below.

---

## 12. Vendor Dependencies

| Vendor | Usage | Abstraction Layer | Exit Strategy |
|---|---|---|---|
| None | No external vendors | N/A | N/A |

---

## 13. Constraints (MANDATORY)

### Architectural Boundaries
- The summary page remains **read-only**. No mutations.
- No new database queries beyond what the existing services already perform.
- No new Prisma models or migrations.
- Client components receive data exclusively through server component props (no client-side fetching).
- `redirect()` calls must be OUTSIDE try/catch (FIND-M-001).

### Performance Budgets
- Combined server-side data assembly: < 60ms.
- New client components total: < 5KB JS.
- No client-side `useEffect` data fetching.

### Security Requirements
- Both services perform independent BOLA checks -- do not bypass.
- No encrypted fields exposed in new components.
- No PII rendered in readiness or next steps sections.

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-12 | architect | Initial draft |

---

> Draft -- Ready for tech-lead review. No blockers. Depends on Sprint 28 deliverables (TripReadinessService, NextStepsEngine, TripCountdown) being merged to master.
