# Technical Specification: Phase 4 Conditional Fields

**Spec ID**: SPEC-ARCH-026
**Related Stories**: SPEC-PROD-031, SPEC-UX-038
**Author**: architect
**Status**: Draft
**Created**: 2026-03-21
**Last Updated**: 2026-03-21

---

## 1. Overview

This spec defines the architecture for three Phase 4 improvements: (1) `isRoundTrip` boolean state for the transport step, (2) `isUndecided` boolean per step that bypasses Zod validation, and (3) accommodation save fix verification. These changes affect `Phase4Wizard.tsx`, `TransportStep.tsx`, `AccommodationStep.tsx`, `MobilityStep.tsx`, and the `transport.schema.ts` validation layer.

### Current State Analysis

From `Phase4Wizard.tsx`:
- Uses 3-step wizard (Transport, Accommodation, Mobility)
- `validatePhase4()` requires at least 1 valid transport segment, 1 valid accommodation, and 1 mobility selection
- No `isRoundTrip` or `isUndecided` state exists
- Each step has its own save action called via `handleSaveTransport`, `handleSaveAccommodation`, `handleSaveMobility`

From `TransportStep.tsx`:
- `isReturn` boolean exists per segment but is a manual checkbox
- No round-trip toggle at step level

## 2. `isRoundTrip` Boolean State

### Location: `Phase4Wizard.tsx` (lifted state) + `TransportStep.tsx` (UI)

### Data Flow

```
Phase4Wizard
  |-- isRoundTrip: boolean (state, default: false)
  |
  +-- TransportStep
        |-- receives isRoundTrip prop
        |-- renders radio toggle
        |-- when isRoundTrip changes:
        |     true  -> auto-create return segment
        |     false -> remove segments where isReturn === true
```

### Auto-Created Return Segment

When `isRoundTrip` changes from `false` to `true`:

```typescript
const firstSegment = segments[0];
const returnSegment: TransportSegmentInput = {
  ...createEmptySegment(segments.length),
  isReturn: true,
  transportType: firstSegment.transportType,
  departurePlace: firstSegment.arrivalPlace,
  arrivalPlace: firstSegment.departurePlace,
  // departureAt and arrivalAt left null for manual entry
};
setSegments(prev => [...prev, returnSegment]);
```

When `isRoundTrip` changes from `true` to `false`:

```typescript
setSegments(prev => prev.filter(s => !s.isReturn).map((s, i) => ({ ...s, segmentOrder: i })));
```

### Persistence

`isRoundTrip` is derived from segments data — if any segment has `isReturn: true`, the toggle shows "Ida e Volta". This avoids adding a new DB field. On load:

```typescript
const initialIsRoundTrip = transportSegments.some(s => s.isReturn);
```

## 3. `isUndecided` Per Step

### State Shape

```typescript
// Phase4Wizard.tsx
const [undecidedSteps, setUndecidedSteps] = useState<{
  transport: boolean;
  accommodation: boolean;
  mobility: boolean;
}>({ transport: false, accommodation: false, mobility: false });
```

### Impact on Validation

The `validatePhase4()` function in `Phase4Wizard.tsx` currently enforces all 3 steps. With `isUndecided`:

```typescript
function validatePhase4(): string[] {
  const errors: string[] = [];

  if (!undecidedSteps.transport) {
    const hasValidTransport = transportSegments.some(
      s => s.transportType && s.departurePlace && s.arrivalPlace && s.departureAt && s.arrivalAt
    );
    if (!hasValidTransport) errors.push(tValidation("transportRequired"));
  }

  if (!undecidedSteps.accommodation) {
    const hasValidAccommodation = accommodations.some(
      a => a.accommodationType && a.checkIn && a.checkOut
    );
    if (!hasValidAccommodation) errors.push(tValidation("accommodationRequired"));
  }

  if (!undecidedSteps.mobility) {
    if (mobility.length === 0) errors.push(tValidation("mobilityRequired"));
  }

  return errors;
}
```

### Server-Side Validation

The server actions (`saveTransportSegmentsAction`, etc.) must also respect the undecided state. Options:

**Option A (Recommended)**: Save whatever data exists (even empty) + store `isUndecided` flag in `ExpeditionPhase.metadata`:

```typescript
// In advanceFromPhaseAction for Phase 4
await db.expeditionPhase.update({
  where: { tripId_phaseNumber: { tripId, phaseNumber: 4 } },
  data: {
    metadata: {
      ...existingMetadata,
      undecidedSteps: {
        transport: undecidedSteps.transport,
        accommodation: undecidedSteps.accommodation,
        mobility: undecidedSteps.mobility,
      },
    },
  },
});
```

**Option B**: Skip save for undecided steps entirely (data loss risk if user partially filled).

Decision: **Option A** — always save whatever data exists, store flags separately.

### Schema Change

No Zod schema change needed. The schemas are already `.nullable().optional()` for all fields. The `isUndecided` flag only affects client-side validation and the `metadata` JSON column.

## 4. Phase Completion Engine Impact

The `evaluatePhase4` function in `phase-completion.engine.ts` must account for `isUndecided`:

```typescript
// Updated PhaseDataSnapshot
phase4: {
  transportSegmentCount: number;
  accommodationCount: number;
  undecidedSteps?: {        // NEW
    transport: boolean;
    accommodation: boolean;
    mobility: boolean;
  };
};
```

```typescript
function evaluatePhase4(data: PhaseDataSnapshot["phase4"]): PhaseCompletionResult {
  const allUndecided = data.undecidedSteps?.transport &&
                       data.undecidedSteps?.accommodation &&
                       data.undecidedSteps?.mobility;

  const hasTransport = data.transportSegmentCount > 0 || data.undecidedSteps?.transport;
  const hasAccommodation = data.accommodationCount > 0 || data.undecidedSteps?.accommodation;
  const hasEither = hasTransport || hasAccommodation || allUndecided;

  const requirements = [{
    key: "logisticsEntry",
    met: hasEither,
    label: "phase4.logisticsEntry",
  }];

  return {
    phase: 4,
    status: hasEither ? "completed" : "pending",
    requirements,
  };
}
```

## 5. Accommodation Save Verification

### Current Flow

In `Phase4Wizard.tsx`, `handleSaveAccommodation` calls `saveAccommodationsAction` from `transport.actions.ts`. Need to verify:

- [ ] `saveAccommodationsAction` correctly calls the accommodation service
- [ ] BOLA check is present (tripId ownership verification)
- [ ] Booking codes are encrypted before storage
- [ ] `syncPhaseStatus` is called after save (for progress bar update)

### Known Issue

The `goToStep` function auto-saves when navigating between steps, but only if data is non-empty:

```typescript
if (currentStep === 2 && accommodations.length > 0) {
  handleSaveAccommodation(accommodations);
}
```

This means if the user adds an accommodation entry but doesn't fill it, the empty default entry (`createEmptyEntry(0)`) is NOT saved because `initialAccommodations` starts with length 0 but `entries` starts with 1 (the empty default). The auto-save condition should check the actual state, not just length > 0.

## 6. Props Changes

### TransportStep (new props)

```typescript
interface TransportStepProps {
  // ... existing props
  isRoundTrip: boolean;
  onRoundTripChange: (isRoundTrip: boolean) => void;
  isUndecided: boolean;
  onUndecidedChange: (isUndecided: boolean) => void;
}
```

### AccommodationStep (new props)

```typescript
interface AccommodationStepProps {
  // ... existing props
  isUndecided: boolean;
  onUndecidedChange: (isUndecided: boolean) => void;
}
```

### MobilityStep (new props)

```typescript
interface MobilityStepProps {
  // ... existing props
  isUndecided: boolean;
  onUndecidedChange: (isUndecided: boolean) => void;
}
```

## 7. Security Considerations

- **Client manipulation of `isUndecided`**: A user could set `isUndecided: true` via DevTools to bypass all Phase 4 validation. This is acceptable because:
  1. Phase 4 data is not security-critical (logistics planning)
  2. The server still validates data format when saved
  3. The `isUndecided` flag is stored in `metadata` and can be audited
  4. Downstream phases (5, 6) handle missing logistics gracefully

- **Server action must NOT trust client's undecided state for advancing**: The `advanceFromPhaseAction` should store the flag but not skip ownership/authorization checks.

---

## Historico de Alteracoes

| Versao | Data | Alteracao |
|---|---|---|
| 1.0.0 | 2026-03-21 | Criacao inicial — Sprint 34 |
