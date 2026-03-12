---
id: SPEC-ARCH-008
title: "Phase Data Pre-population -- Edit Mode for Completed Phases"
status: draft
sprint: 29
author: architect
created: 2026-03-12
version: "1.0.0"
related_specs:
  - SPEC-PROD-001
  - SPEC-ARCH-006
  - SPEC-ARCH-005
---

# SPEC-ARCH-008: Phase Data Pre-population -- Edit Mode for Completed Phases

**Version**: 1.0.0
**Status**: Draft
**Author**: architect
**Reviewers**: [tech-lead, ux-designer, qa-engineer, security-specialist]
**Created**: 2026-03-12
**Last Updated**: 2026-03-12

---

## 1. Overview

When a user completes Phase 1 and advances to Phase 2, then revisits Phase 1, the wizard form shows empty fields instead of the previously saved data. This is a recurring complaint (FIX-004 from Sprint 28) and applies to all 6 phase wizards. The root cause is that phase wizard components initialize form state from hardcoded defaults (empty strings, nulls), not from persisted data.

This spec defines the architectural pattern for pre-populating phase wizards with saved data when users revisit completed or partially completed phases. It covers the data loading strategy for each phase, the distinction between "create mode" (first visit) and "edit mode" (revisit), and the auto-save pattern for Phase 4 sub-steps.

---

## 2. Architecture Decision Records

### ADR-022: Phase Data Loading -- Server Props vs Client Fetch

- **Status**: Proposed
- **Context**: Each phase wizard is a client component rendered by a server component page. When a user revisits a completed phase, the wizard needs the previously saved data. We need to decide where and how to load this data.

- **Options Considered**:

| Option | Pros | Cons |
|---|---|---|
| A: Server component fetches saved data, passes as props | Data available immediately. No loading state. No client-side fetch. Consistent with Phase1Wizard pattern (already receives `userProfile` as props). | Each page.tsx needs a data-fetching block. Props interface grows. |
| B: Client component fetches on mount via server action | Wizard is self-contained. Page.tsx stays simple. | Loading state needed. Extra round-trip. Flash of empty form before data arrives. |
| C: React Server Component with Suspense boundary | Data fetched per-component. Progressive loading. | Over-engineered for 6 small forms. Suspense boundaries add complexity. |

- **Decision**: **Option A -- Server component fetches saved data, passes as props**. This is the pattern already established by Phase1Wizard (`userProfile`, `userName` props) and Phase2Wizard (`tripContext` props). Extending this pattern to all phases is consistent and avoids flash-of-empty-form. The page.tsx server components already fetch trip data for the phase access guard -- we simply expand the `select` clause and pass more data down.

- **Consequences**:
  - **Positive**: No loading states for form pre-population. Instant render with correct data. Single round-trip. Consistent pattern across all phases.
  - **Negative**: Page.tsx files become slightly more complex (more DB queries). Props interfaces grow.
  - **Risk**: If saved data is very large (e.g., full guide content), it bloats the HTML payload. Mitigated: we only fetch the fields needed for form state, not full content blobs.

### ADR-023: Edit Mode vs Create Mode -- Implicit Detection

- **Status**: Proposed
- **Context**: When a wizard receives pre-populated data, it should behave slightly differently than on first creation. For example, Phase 1 should skip the profile summary and show the destination form pre-filled. The save action on edit should update existing records rather than creating new ones. We need a way to distinguish create vs edit mode.

- **Options Considered**:

| Option | Pros | Cons |
|---|---|---|
| A: Explicit `mode` prop ("create" / "edit") | Clear API. Wizard knows its context. | Requires page.tsx to determine mode (more logic in server component). |
| B: Infer from presence of saved data | Simpler API. No explicit mode prop. If `savedData` is non-null, it is edit mode. | Implicit -- could be confusing for developers. |
| C: URL query parameter `?mode=edit` | Visible in URL. Easy to test. | URL manipulation risk. Must validate server-side. |

- **Decision**: **Option B -- Infer from presence of saved data**. The wizards already partially do this: Phase1Wizard checks `isProfileComplete(userProfile)` to decide whether to show the summary card or the form. Extending this pattern: if `savedPhaseData` prop is provided and non-null, the wizard is in edit mode. This avoids adding a new prop and keeps the API surface minimal.

- **Consequences**:
  - **Positive**: Minimal API change. No new URL parameters. Natural -- "if you have data, you are editing it."
  - **Negative**: Developers must be careful to pass `undefined` (not an empty object) for create mode. Document this clearly.
  - **Risk**: Edge case -- a partially completed phase has some data but not all fields. The wizard should pre-fill available fields and leave others empty. This is the correct behavior for both create and edit modes.

### ADR-024: Phase 4 Auto-Save -- Dirty Check with debounced Server Action

- **Status**: Proposed
- **Context**: Phase 4 has three sub-steps (Transport, Accommodation, Mobility). When a user fills Transport data and navigates to Accommodation, the Transport data should auto-save. Currently, data is only saved on explicit "Save" click. The Sprint 28 plan identified this as FIX-003.

- **Options Considered**:

| Option | Pros | Cons |
|---|---|---|
| A: Save on sub-step change (onBeforeNavigate) | Only saves when needed. Low save frequency. | Complex to detect "leaving" a sub-step. React has no onBeforeUnmount with async. |
| B: Debounced auto-save on field change | Continuous saves. No data loss. | High save frequency. Many DB writes for each keystroke (debounce helps). |
| C: Save on sub-step change via parent state | Parent tracks dirty state per sub-step. When switching sub-step, parent saves the dirty one first. | Clean separation. Parent orchestrates. Sub-step components stay simple. |

- **Decision**: **Option C -- Parent-orchestrated save on sub-step change**. The `Phase4Wizard` component tracks which sub-step is active and maintains a `dirtySteps` set. When the user switches sub-steps (e.g., from Transport to Accommodation), the parent checks if the departing sub-step is dirty, and if so, triggers the save action before switching. The save is async but non-blocking -- the UI switches immediately and shows a brief toast/indicator on successful save. If the save fails, the user is warned and the data remains in local state (not lost).

- **Consequences**:
  - **Positive**: Saves happen only when navigating between sub-steps (low frequency). Data is preserved. Sub-step components remain pure form components.
  - **Negative**: If the user closes the browser mid-sub-step, unsaved data is lost. Acceptable -- this is standard form behavior. A future enhancement could add `beforeunload` warning.
  - **Risk**: If the save action is slow (> 500ms), the sub-step switch may feel delayed if implemented as blocking. Mitigated: switch immediately, save in background, show indicator.

---

## 3. System Design

### 3.1 Per-Phase Data Loading Matrix

| Phase | Page Server Component | Data to Fetch | Source | New Query? |
|---|---|---|---|---|
| 1 | `expedition/[tripId]/page.tsx` | destination, origin, startDate, endDate, flexibleDates, profile fields | `Trip` + `UserProfile` | Expand existing trip query. Profile query already exists. |
| 2 | `phase-2/page.tsx` | travelerType, accommodationStyle, travelPace, budget, currency, passengers, preferences | `ExpeditionPhase(2).metadata` + `Trip.passengers` + `UserProfile.preferences` | Add `ExpeditionPhase` query. Passengers already in trip. |
| 3 | `phase-3/page.tsx` | Checklist items (text, checked status, category) | `PhaseChecklistItem` where tripId + phaseNumber=3 | New query in page.tsx |
| 4 | `phase-4/page.tsx` | TransportSegments, Accommodations, localMobility | `TransportSegment[]`, `Accommodation[]`, `Trip.localMobility` | New queries. Add to existing trip fetch. |
| 5 | `phase-5/page.tsx` | Guide content (if exists, pass as read-only context) | `DestinationGuide.content` | New query. Guide is AI-generated -- pre-populate means showing existing, not editing. |
| 6 | `phase-6/page.tsx` | Itinerary days, activities (if exists) | `ItineraryDay[]` with `Activity[]` | New query. Itinerary is AI-generated -- same as Phase 5. |

### 3.2 Data Flow Pattern (Per Phase)

```
phase-N/page.tsx (Server Component)
  |
  |-- auth() --> session.user.id
  |
  |-- trip = db.trip.findFirst({ where: {id, userId, deletedAt: null}, select: {...} })
  |     // Already exists for phase access guard. Expand select.
  |
  |-- phaseData = db.expeditionPhase.findFirst({
  |     where: { tripId, phaseNumber: N },
  |     select: { status, metadata, completedAt }
  |   })
  |     // New query for phases 2-6. Phase 1 uses Trip fields directly.
  |
  |-- [additional queries per phase -- see matrix above]
  |
  |-- Serialize all data as JSON-safe props
  |
  |-- <PhaseNWizard
  |       tripId={tripId}
  |       savedData={phaseData ? { ...fields } : undefined}
  |       ... existing props ...
  |     />
```

### 3.3 Phase 4 Auto-Save Architecture

```
Phase4Wizard (parent component)
  |
  |-- state: activeStep ("transport" | "accommodation" | "mobility")
  |-- state: dirtySteps: Set<string>
  |-- state: stepData: { transport: TransportFormData, accommodation: AccommodationFormData, mobility: string[] }
  |
  |-- handleStepChange(newStep):
  |     if dirtySteps.has(activeStep):
  |       saveStepData(activeStep, stepData[activeStep])  // async, non-blocking
  |       dirtySteps.delete(activeStep)
  |     setActiveStep(newStep)
  |
  |-- <TransportStep
  |       data={stepData.transport}
  |       onChange={(data) => { stepData.transport = data; dirtySteps.add("transport") }}
  |     />
  |-- <AccommodationStep
  |       data={stepData.accommodation}
  |       onChange={(data) => { stepData.accommodation = data; dirtySteps.add("accommodation") }}
  |     />
  |-- <MobilityStep
  |       data={stepData.mobility}
  |       onChange={(data) => { stepData.mobility = data; dirtySteps.add("mobility") }}
  |     />
```

### 3.4 Component Props Changes

#### Phase1Wizard (minimal change)

Phase1Wizard already receives `userProfile` and `userName` for profile pre-population. For trip data pre-population on revisit, add:

```typescript
interface Phase1WizardProps {
  passportExpiry?: string;
  userCountry?: string;
  userProfile?: UserProfileData;
  userName?: string;
  // NEW: saved trip data for edit mode
  savedTripData?: {
    destination: string;
    origin: string | null;
    startDate: string | null;
    endDate: string | null;
    flexibleDates: boolean;
    destinationCountryCode: string | null;
    originCountryCode: string | null;
  };
}
```

When `savedTripData` is present, initialize form state from it:
```typescript
const [destination, setDestination] = useState(savedTripData?.destination ?? "");
const [origin, setOrigin] = useState(
  savedTripData?.origin ?? (userProfile?.city && userProfile?.country
    ? `${userProfile.city}, ${userProfile.country}`
    : "")
);
const [startDate, setStartDate] = useState(savedTripData?.startDate ?? "");
const [endDate, setEndDate] = useState(savedTripData?.endDate ?? "");
```

The confirmation step on edit should call an `updateExpeditionAction` instead of `createExpeditionAction`. This action updates the existing Trip record.

#### Phase2Wizard

```typescript
interface Phase2WizardProps {
  tripId: string;
  tripContext?: TripContext;
  // NEW: saved phase 2 data for edit mode
  savedPhaseData?: {
    travelerType: string;
    accommodationStyle: string;
    travelPace: number | null;
    budget: number | null;
    currency: string | null;
    adults: number;
    childrenCount: number;
    childrenAges: number[];
    infants: number;
    preferences: Record<string, string[]> | null;
  };
}
```

#### Phase4Wizard

```typescript
interface Phase4WizardProps {
  tripId: string;
  tripType: string;
  origin: string | null;
  destination: string;
  startDate: string | null;
  currentPhase: number;
  // NEW: saved Phase 4 data for edit mode
  savedTransport?: TransportSegmentData[];
  savedAccommodations?: AccommodationData[];
  savedMobility?: string[];
}
```

#### Phases 3, 5, 6

These phases involve AI-generated content (checklist, guide, itinerary). Pre-population means displaying existing data as read-only or editable depending on the content type:

- **Phase 3 (Checklist)**: Show existing checklist items with their checked/unchecked status. User can toggle items and regenerate.
- **Phase 5 (Guide)**: Show existing guide content. The wizard already handles this -- if a guide exists, it is displayed. No form pre-population needed (guide is AI output, not user input).
- **Phase 6 (Itinerary)**: Show existing itinerary. The ItineraryEditor already loads data via server action on mount. No change needed for pre-population -- the editor fetches its own data.

**Summary of required changes per phase**:

| Phase | Pre-population Source | Form Fields to Pre-fill | Change Scope |
|---|---|---|---|
| 1 | Trip record | destination, origin, dates, flexibleDates | Medium -- add `savedTripData` prop, update page.tsx |
| 2 | ExpeditionPhase.metadata + Trip.passengers + UserProfile.preferences | travelerType, accommodation, pace, budget, passengers, preferences | Medium -- add `savedPhaseData` prop, update page.tsx |
| 3 | PhaseChecklistItem[] | Checklist items (displayed, not form fields) | Small -- wizard already renders items if they exist |
| 4 | TransportSegment[], Accommodation[], Trip.localMobility | Transport records, accommodation records, mobility selections | Large -- add 3 new props, update page.tsx with 3 queries |
| 5 | DestinationGuide | N/A (AI output, not user-editable form) | None |
| 6 | ItineraryPlan + days + activities | N/A (editor already fetches on mount) | None |

---

## 4. Server Component Changes

### 4.1 Phase 1 Page (expedition/[tripId]/page.tsx)

The Phase 1 page currently renders based on whether the trip exists. For revisit, expand the trip query to include fields needed for pre-population:

```typescript
const trip = await db.trip.findFirst({
  where: { id: tripId, userId: session.user.id, deletedAt: null },
  select: {
    id: true,
    destination: true,
    origin: true,
    startDate: true,
    endDate: true,
    currentPhase: true,
    // NEW: for pre-population on revisit
    tripType: true,
  },
});

// If trip exists and currentPhase > 1, this is a revisit (edit mode)
const savedTripData = trip && trip.currentPhase > 1 ? {
  destination: trip.destination,
  origin: trip.origin,
  startDate: trip.startDate?.toISOString().split("T")[0] ?? null,
  endDate: trip.endDate?.toISOString().split("T")[0] ?? null,
  flexibleDates: false, // Not stored -- default to false
  destinationCountryCode: null, // Not stored in Trip model currently
  originCountryCode: null,      // Not stored in Trip model currently
} : undefined;

// Pass to wizard
<Phase1Wizard savedTripData={savedTripData} ... />
```

**Note**: `flexibleDates` and country codes are not persisted in the Trip model. On revisit, these default to `false`/`null`. This is an acceptable limitation -- the user can re-select if needed. Persisting these would require a schema change (out of scope for this spec).

### 4.2 Phase 2 Page (phase-2/page.tsx)

```typescript
// Existing trip query stays. Add phase metadata query.
const phase2Record = await db.expeditionPhase.findFirst({
  where: { tripId, phaseNumber: 2 },
  select: { status: true, metadata: true },
});

const savedPhaseData = phase2Record?.metadata ? (() => {
  const meta = phase2Record.metadata as Record<string, unknown>;
  const passengers = trip.passengers as Record<string, unknown> | null;
  return {
    travelerType: (meta.travelerType as string) ?? "",
    accommodationStyle: (meta.accommodationStyle as string) ?? "",
    travelPace: meta.travelPace != null ? Number(meta.travelPace) : null,
    budget: meta.budget != null ? Number(meta.budget) : null,
    currency: (meta.currency as string) ?? null,
    adults: passengers ? Number(passengers.adults ?? 1) : 1,
    childrenCount: passengers ? Number(
      (passengers.children as Record<string, unknown>)?.count ?? 0
    ) : 0,
    childrenAges: passengers
      ? (passengers.children as Record<string, unknown>)?.ages as number[] ?? []
      : [],
    infants: passengers ? Number(passengers.infants ?? 0) : 0,
    preferences: null, // Loaded from UserProfile.preferences separately
  };
})() : undefined;
```

### 4.3 Phase 4 Page (phase-4/page.tsx)

```typescript
// Add parallel queries for existing transport, accommodation, mobility
const [transportSegments, accommodations] = await Promise.all([
  db.transportSegment.findMany({
    where: { tripId },
    orderBy: { segmentOrder: "asc" },
    select: {
      id: true,
      transportType: true,
      departurePlace: true,
      arrivalPlace: true,
      departureAt: true,
      arrivalAt: true,
      provider: true,
      estimatedCost: true,
      currency: true,
      notes: true,
      isReturn: true,
      // NOT bookingCodeEnc -- never pass encrypted data to client
    },
  }),
  db.accommodation.findMany({
    where: { tripId },
    orderBy: { orderIndex: "asc" },
    select: {
      id: true,
      accommodationType: true,
      name: true,
      address: true,
      checkIn: true,
      checkOut: true,
      estimatedCost: true,
      currency: true,
      notes: true,
      // NOT bookingCodeEnc -- never pass encrypted data to client
    },
  }),
]);

// Serialize dates and decimals for client boundary
const serializedTransport = transportSegments.map(t => ({
  ...t,
  departureAt: t.departureAt?.toISOString() ?? null,
  arrivalAt: t.arrivalAt?.toISOString() ?? null,
  estimatedCost: t.estimatedCost ? Number(t.estimatedCost) : null,
}));

const serializedAccommodations = accommodations.map(a => ({
  ...a,
  checkIn: a.checkIn?.toISOString() ?? null,
  checkOut: a.checkOut?.toISOString() ?? null,
  estimatedCost: a.estimatedCost ? Number(a.estimatedCost) : null,
}));

<Phase4Wizard
  tripId={tripId}
  tripType={trip.tripType}
  origin={trip.origin ?? null}
  destination={trip.destination}
  startDate={trip.startDate?.toISOString() ?? null}
  currentPhase={trip.currentPhase}
  savedTransport={serializedTransport.length > 0 ? serializedTransport : undefined}
  savedAccommodations={serializedAccommodations.length > 0 ? serializedAccommodations : undefined}
  savedMobility={trip.localMobility.length > 0 ? trip.localMobility : undefined}
/>
```

---

## 5. Security Considerations

- **bookingCodeEnc MUST NOT cross server-client boundary**: The `select` clauses explicitly exclude `bookingCodeEnc`. Encrypted booking codes stay server-side. If a user wants to see their booking code, it must be decrypted and masked via a dedicated server action (already exists in `ExpeditionSummaryService.maskBookingCode`).
- **BOLA**: All page server components already verify `trip.userId === session.user.id` via the existing trip query. No additional BOLA checks needed.
- **Mass assignment**: When updating trip/phase data on edit, the server action MUST NOT spread the full props object into Prisma. Map each field explicitly (DT-004 -- known debt).
- **Passenger data**: Validated via `PassengersSchema` before saving (already enforced in `completePhase2Action`).
- **PII in transit**: `passportNumberEnc` and `nationalIdEnc` are NOT fetched in any page query. Only `passportExpiry` is fetched for Phase 1 warning display (already exists).

---

## 6. Performance Requirements

| Metric | Target | Notes |
|---|---|---|
| Phase page load (with pre-pop data) | < 1.5s LCP | Additional queries add < 5ms (all indexed) |
| Phase 4 auto-save latency | < 500ms | Single Prisma create/update per sub-step |
| Additional query overhead | < 10ms | 1-3 queries per page, all using indexed fields (tripId, phaseNumber) |

### Query Analysis

| Phase | New Queries | Index Used | Expected Rows | Est. Latency |
|---|---|---|---|---|
| 1 | 0 (expand existing) | trips PK | 1 | +0ms |
| 2 | +1 (ExpeditionPhase) | tripId + phaseNumber unique | 1 | < 1ms |
| 3 | 0 (wizard already loads items) | -- | -- | +0ms |
| 4 | +2 (TransportSegment, Accommodation) | tripId indexes | 0-15 | < 2ms |
| 5 | 0 (no change) | -- | -- | +0ms |
| 6 | 0 (no change) | -- | -- | +0ms |

---

## 7. Testing Strategy

### Unit Tests

**Phase1Wizard (edit mode)**:
- When `savedTripData` is provided, destination field is pre-populated.
- When `savedTripData` is provided, date fields are pre-populated.
- When `savedTripData` is `undefined`, fields start empty (create mode).
- Edit mode submits update action (not create).

**Phase2Wizard (edit mode)**:
- When `savedPhaseData` is provided, travelerType card is pre-selected.
- When `savedPhaseData` is provided, passenger counts match saved data.
- Budget slider reflects saved value.

**Phase4Wizard (auto-save)**:
- Switching from Transport to Accommodation triggers save of transport data.
- Dirty check: switching without changes does NOT trigger save.
- Save failure shows error indicator but does not block sub-step switch.
- Returning to a saved sub-step shows the saved data.

**Phase4Wizard (pre-population)**:
- When `savedTransport` is provided, transport list renders existing segments.
- When `savedAccommodations` is provided, accommodation list renders existing records.
- When `savedMobility` is provided, mobility icons are pre-selected.

### Integration Tests (Page Level)

- Phase 2 page passes saved phase metadata to wizard when revisiting.
- Phase 4 page passes serialized transport/accommodation data.
- `bookingCodeEnc` is NOT present in any serialized prop (security regression test).
- Decimal values are correctly converted to numbers at the server-client boundary.

### Test Count Estimate

- Phase 1 edit mode: 4 tests
- Phase 2 edit mode: 3 tests
- Phase 4 pre-population: 4 tests
- Phase 4 auto-save: 4 tests
- Page-level integration: 4 tests
- Security regression (bookingCodeEnc): 2 tests
- **Total new tests**: ~21

---

## 8. Implementation Notes for Developers

1. **Phase 1 edit mode -- updateExpeditionAction**: This action does not exist yet. Create a new server action `updatePhase1Action(tripId, data)` that updates the Trip record instead of creating a new one. It should:
   - BOLA check (trip.userId === session.user.id)
   - Validate with Phase1Schema (or a subset)
   - `db.trip.update({ where: { id: tripId }, data: { destination, origin, startDate, endDate } })`
   - NOT re-award points (phase already completed)
   - NOT recreate ExpeditionPhase records

2. **Phase 4 auto-save -- optimistic UI**: When the user switches sub-steps, switch the tab immediately. Show a small "Saving..." indicator (toast or inline text). If the save succeeds, show "Saved" briefly. If it fails, keep the data in local state and show an error. Do NOT block the sub-step switch.

3. **Date serialization**: Prisma `DateTime` fields must be serialized to ISO strings before passing as props. Use `.toISOString().split("T")[0]` for date-only fields (startDate, endDate, checkIn, checkOut) and `.toISOString()` for datetime fields (departureAt, arrivalAt).

4. **Decimal serialization**: Prisma `Decimal` fields (estimatedCost) are not JSON-serializable. Convert to `Number()` in the server component before passing as props.

5. **Phase 3 special case**: The checklist wizard already handles existing items -- it fetches them via `getChecklistAction` on mount. No pre-population change needed for Phase 3. However, verify that the wizard correctly shows checked/unchecked state for existing items.

6. **Phase 5/6 special case**: These phases display AI-generated content that is already loaded by the wizard. No pre-population needed. Phase 5 (`DestinationGuideWizard`) checks if a guide exists and displays it. Phase 6 (`ItineraryEditor`) fetches itinerary data on mount via its own server action. No changes required.

7. **Country code limitation**: `destinationCountryCode` and `originCountryCode` are not stored in the Trip model. On Phase 1 revisit, the trip type badge will not show until the user re-selects a destination from the autocomplete. Consider adding these fields to the Trip model in a future migration if this becomes a UX issue.

---

## 9. Open Questions

- [ ] Should Phase 1 edit mode allow changing the destination? This would invalidate the trip type classification, checklist (Phase 3), and guide (Phase 5). Recommendation: Allow it but warn the user that downstream data may become stale. Product-owner to confirm.
- [ ] Should we persist `flexibleDates` and country codes in the Trip model? Currently lost on revisit. Recommendation: Add in a future migration if UX testing reveals this is a problem.
- [ ] Should Phase 4 auto-save also trigger when the user clicks the browser back button or navigates away entirely? Recommendation: Add `beforeunload` warning for dirty data, but do NOT auto-save on unload (unreliable in modern browsers). Accept data loss in this edge case.
- [ ] Should editing a completed phase reset its `completedAt` timestamp? Recommendation: No. The phase remains "completed" even after edits. Only the underlying data changes. If the product-owner wants a "needs review" status, that is a separate feature.

---

## 10. Vendor Dependencies

| Vendor | Usage | Abstraction Layer | Exit Strategy |
|---|---|---|---|
| None | No external vendors | N/A | N/A |

---

## 11. Constraints (MANDATORY)

### Architectural Boundaries
- `bookingCodeEnc` MUST NOT be included in any `select` clause that feeds client component props.
- Pre-populated data is READ from the database; the existing save actions handle WRITES. Do not create new save paths unless specifically needed (Phase 1 update action).
- No new Prisma models. No migrations.
- Auto-save must be non-blocking -- never prevent the user from navigating between sub-steps.

### Performance Budgets
- Additional server-side query time per phase page: < 5ms.
- Phase 4 auto-save round-trip: < 500ms.
- No client-side data fetching for pre-population (all via server props).

### Security Requirements
- BOLA enforced on all page-level queries (already exists).
- No encrypted fields in client props.
- Mass assignment prevented -- map fields explicitly in update actions.

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-12 | architect | Initial draft |

---

> Draft -- Ready for tech-lead review. Blocked on: confirmation from product-owner on open question about destination edit behavior in Phase 1 edit mode.
