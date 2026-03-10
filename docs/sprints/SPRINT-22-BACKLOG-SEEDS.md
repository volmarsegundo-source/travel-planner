# Sprint 22 -- Backlog Seeds

**Source:** Sprint 21 deferrals + review observations
**Date:** 2026-03-11
**Estimated scope:** 24-36h (2 devs x ~15h each)

---

## Priority 1: AI Integration

### SEED-S22-001: AI Itinerary Uses Transport Data

- **Estimate:** 4-6h
- **Source:** Sprint 21 deferral (SEED-S21-009)
- **Depends on:** Sprint 21 complete (transport/accommodation UI exists)
- **Description:** Update Phase 6 itinerary generation prompts to incorporate transport segments and accommodation data. If the user has booked a flight arriving at 14:00, Day 1 activities should start after arrival. If accommodation is in a specific neighborhood, nearby activities should be prioritized.
- **Consult:** prompt-engineer for token optimization; finops-engineer for cost impact
- **Key files:** `src/server/services/ai.service.ts`, `src/lib/prompts/`

### SEED-S22-002: AI Transport Suggestions

- **Estimate:** 3-4h
- **Description:** Optional AI-powered transport suggestions based on destination and travel style. "Based on your trip to Tokyo, consider booking a Japan Rail Pass for regional travel." Display in Phase 4 Transport tab as a dismissible suggestion card.
- **Consult:** prompt-engineer, finops-engineer
- **Depends on:** SEED-S22-001

---

## Priority 1: Data Integrity & Security

### SEED-S22-003: Rate Limiting on Transport/Accommodation Actions

- **Estimate:** 1h
- **Source:** SEC-S21-OBS-002
- **Description:** Add rate limiting to `saveTransportSegmentsAction`, `saveAccommodationsAction`, `saveLocalMobilityAction` using existing `src/lib/rate-limit.ts`. Suggested limit: 30 requests/minute per user.
- **File:** `src/server/actions/transport.actions.ts`

### SEED-S22-004: Server-Side Passenger Cap in Phase 2 Action

- **Estimate:** 0.5h
- **Source:** Defense in depth
- **Description:** Verify `completePhase2Action` enforces the MAX_TOTAL_PASSENGERS=20 cap server-side using the refined PassengersSchema. Currently the schema has the refinement, but confirm the action uses it.
- **File:** `src/server/actions/expedition.actions.ts`

---

## Priority 2: Code Quality

### SEED-S22-005: RecordListStep Base Component Extraction

- **Estimate:** 3-4h
- **Source:** TECH-S21-OBS-002
- **Description:** TransportStep and AccommodationStep share significant UI patterns (add/remove records, visual type selector, form fields, save button). Extract a generic `RecordListStep<T>` base component that both can extend. Reduces code duplication by ~40%.
- **Files:** `src/components/features/expedition/TransportStep.tsx`, `AccommodationStep.tsx`

### SEED-S22-006: Phase4Wizard Tab Content Memoization

- **Estimate:** 0.5h
- **Source:** TECH-S21-OBS-001
- **Description:** Add `useMemo` to Phase4Wizard tab content rendering to prevent unnecessary re-renders when switching tabs. Currently each tab re-renders all content on every state change.
- **File:** `src/components/features/expedition/Phase4Wizard.tsx`

---

## Priority 2: UX Polish

### SEED-S22-007: Transport/Accommodation Data Loading States

- **Estimate:** 1.5h
- **Description:** Phase4Wizard loads transport, accommodation, and mobility data on mount. Add skeleton loading states for each tab while data is being fetched. Currently shows empty forms until data arrives.
- **File:** `src/components/features/expedition/Phase4Wizard.tsx`

### SEED-S22-008: Phase 4 Completion Logic Update

- **Estimate:** 2h
- **Description:** Update `advanceFromPhaseAction` for Phase 4 to require at least 1 transport segment saved before allowing phase completion. Currently Phase 4 can be completed with only the car rental question answered.
- **Files:** `src/server/actions/expedition.actions.ts`, `src/lib/engines/phase-engine.ts`

### SEED-S22-009: Transport Cost Summary

- **Estimate:** 1.5h
- **Description:** Add a cost summary at the bottom of the Transport tab showing total estimated transport cost and total accommodation cost. Display in user's selected currency with a "total logistics cost" combined figure.
- **File:** `src/components/features/expedition/Phase4Wizard.tsx` or new `CostSummary.tsx`

---

## Priority 3: Existing Debt

### SEED-S22-010: Footer Links Fix (BUG-S7-004)

- **Estimate:** 2h
- **Source:** Sprint 7 known bug
- **Description:** Footer links /terms, /privacy, /support lead to 404. Create minimal static pages or redirect to external URLs.

### SEED-S22-011: Accessibility Hardcoded English (BUG-S7-006)

- **Estimate:** 1h
- **Source:** Sprint 7 known bug
- **Description:** `aria-label="Loading"` hardcoded English in loading.tsx files. Should use i18n.

---

## Effort Summary

| Seed | Estimate | Priority |
|------|----------|----------|
| SEED-S22-001: AI itinerary transport | 4-6h | P1 |
| SEED-S22-002: AI transport suggestions | 3-4h | P1 |
| SEED-S22-003: Rate limiting transport | 1h | P1 |
| SEED-S22-004: Passenger cap server check | 0.5h | P1 |
| SEED-S22-005: RecordListStep extraction | 3-4h | P2 |
| SEED-S22-006: Tab memoization | 0.5h | P2 |
| SEED-S22-007: Loading states | 1.5h | P2 |
| SEED-S22-008: Phase 4 completion logic | 2h | P2 |
| SEED-S22-009: Transport cost summary | 1.5h | P2 |
| SEED-S22-010: Footer links fix | 2h | P3 |
| SEED-S22-011: Accessibility i18n | 1h | P3 |
| **Total** | **20-28h** | |

---

## Notes

- SEED-S22-001 is the biggest item and was intentionally deferred from Sprint 21 to allow transport data to exist before integrating with AI.
- AI items (SEED-S22-001, SEED-S22-002) require prompt-engineer and finops-engineer consultation per project protocol.
- RecordListStep extraction (SEED-S22-005) would reduce future maintenance cost as more record-list UIs are added.
