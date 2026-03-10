# Sprint 21 -- Backlog Seeds

**Source:** Sprint 20 deferrals + tech-lead review findings
**Date:** 2026-03-10
**Estimated scope:** 24-34h (2 devs x ~15h each)

---

## Priority 1: Transport Phase UI (Phase 4 "A Logistica")

Data models for TransportSegment and Accommodation were delivered in Sprint 20 (T-S20-011). Sprint 21 builds the UI and service layer on top.

### SEED-S21-001: Transport UI -- Phase 4 Section A

- **Estimate:** 6-8h
- **Depends on:** T-S20-011 (complete)
- **Description:** Create transport form wizard step in Phase 4. N-record list with add/remove segments. Each segment: transport type (visual card selector), departure/arrival places (text or autocomplete), departure/arrival times (datetime picker), provider, booking code, estimated cost, notes, isReturn toggle. Use TransportSegmentSchema for validation. Save via new server action.
- **Schema ready:** TransportSegment model, TransportSegmentSchema, TRANSPORT_TYPES enum
- **Key decision:** Encrypt bookingCode before storage using existing crypto.ts (see SEED-S21-006)

### SEED-S21-002: Accommodation UI -- Phase 4 Section B

- **Estimate:** 4-6h
- **Depends on:** T-S20-011 (complete)
- **Description:** Create accommodation form wizard step. N-record list with add/remove entries. Each entry: accommodation type (visual card selector), name, address, booking code, check-in/check-out dates, estimated cost, notes. Use AccommodationSchema for validation.
- **Schema ready:** Accommodation model, AccommodationSchema, ACCOMMODATION_TYPES enum

### SEED-S21-003: Local Mobility UI -- Phase 4 Section C

- **Estimate:** 2-3h
- **Depends on:** T-S20-011 (complete)
- **Description:** Multi-select grid with icons for local mobility options (public transit, taxi/rideshare, walking, bicycle, private transfer, car rental, other). Save to Trip.localMobility String[].
- **Schema ready:** LocalMobilitySchema, LOCAL_MOBILITY_OPTIONS enum

### SEED-S21-004: Origin Field UI + Pre-population

- **Estimate:** 2h
- **Depends on:** T-S20-011 (complete), T-S20-005 (complete)
- **Description:** Add origin field to Phase 1 or Phase 4 using DestinationAutocomplete component. Pre-populate from UserProfile.country + city if available. Save to Trip.origin.
- **Schema ready:** Trip.origin field, OriginSchema

---

## Priority 1: Data Integrity

### SEED-S21-005: Total Passenger Cap Validation

- **Estimate:** 0.5h
- **Source:** SEC-S20-OBS-001
- **Description:** Add `.refine()` to PassengersSchema enforcing `adults + children.count + seniors + infants <= 20` (or appropriate business limit). Currently max theoretical total is 80. Update Phase2Wizard validation message.
- **File:** `src/lib/validations/trip.schema.ts`

### SEED-S21-006: Booking Code Encryption (Service Layer)

- **Estimate:** 1.5h
- **Source:** SEC-S20-OBS-002
- **Description:** When saving TransportSegment or Accommodation via server actions, encrypt the `bookingCode` field using `encrypt()` from `src/lib/crypto.ts` before storing as `bookingCodeEnc`. Decrypt on read. The schema field is already named `bookingCodeEnc` (Text type for ciphertext). Existing crypto.ts provides AES-256-GCM.
- **Files:** New transport.service.ts and accommodation.service.ts

---

## Priority 2: Code Quality

### SEED-S21-007: Phase2Wizard Component Extraction

- **Estimate:** 1.5h
- **Source:** Tech-lead review finding
- **Description:** Extract PassengersStep from Phase2Wizard.tsx (636 lines) into a standalone `PassengersStep.tsx` subcomponent. This will be especially important as Sprint 21 adds more Phase 4 UI complexity.
- **File:** `src/components/features/expedition/Phase2Wizard.tsx`

### SEED-S21-008: Build Check in Integration Test Task

- **Estimate:** 0h (process change)
- **Source:** Sprint 20 lesson learned
- **Description:** Future sprint integration test tasks (T-SXX-012 equivalent) must include `npm run build` as an explicit acceptance criterion, not just `npm run test`. Sprint 20 had 3 build-breaking issues that tests did not catch: unused imports, Prisma type mismatches, and missing badge map entries.

---

## Priority 2: AI Integration

### SEED-S21-009: AI Itinerary Uses Transport Data

- **Estimate:** 4-6h
- **Source:** T-S20-011 deferral, TRANSPORT-PHASE-SPEC.md
- **Description:** Update Phase 6 itinerary generation prompts to incorporate transport segments and accommodation data. If the user has booked a flight arriving at 14:00, Day 1 activities should start after arrival. If accommodation is in a specific neighborhood, nearby activities should be prioritized.
- **Depends on:** SEED-S21-001 (transport UI must exist to populate data)
- **Consult:** prompt-engineer for token optimization; finops-engineer for cost impact

---

## Priority 3: UX Polish (Deferred from Sprint 19)

### SEED-S21-010: Clickable Progress Bar Segments

- **Estimate:** 2h
- **Source:** Sprint 19 P2 deferral
- **Description:** DashboardPhaseProgressBar segments should be clickable to navigate to the corresponding phase page. Currently the bar is display-only.

### SEED-S21-011: Progress Bar Phase Labels

- **Estimate:** 1h
- **Source:** Sprint 19 P2 deferral
- **Description:** Show phase name labels on hover/tap over DashboardPhaseProgressBar segments.

---

## Effort Summary

| Seed | Estimate | Priority |
|------|----------|----------|
| SEED-S21-001: Transport UI | 6-8h | P1 |
| SEED-S21-002: Accommodation UI | 4-6h | P1 |
| SEED-S21-003: Local Mobility UI | 2-3h | P1 |
| SEED-S21-004: Origin field UI | 2h | P1 |
| SEED-S21-005: Passenger cap | 0.5h | P1 |
| SEED-S21-006: Booking encryption | 1.5h | P1 |
| SEED-S21-007: Phase2Wizard extraction | 1.5h | P2 |
| SEED-S21-008: Build check process | 0h | P2 |
| SEED-S21-009: AI transport integration | 4-6h | P2 |
| SEED-S21-010: Clickable progress bar | 2h | P3 |
| SEED-S21-011: Progress bar labels | 1h | P3 |
| **Total** | **24-34h** | |

---

## Notes

- Transport UI (SEED-S21-001/002/003) is the largest item and constitutes the bulk of Phase 4 "A Logistica" implementation.
- SEED-S21-006 (booking encryption) should be implemented alongside SEED-S21-001/002 since the service layer is created at the same time.
- SEED-S21-009 (AI integration) depends on transport UI being complete and should involve prompt-engineer and finops-engineer per project protocol.
- The Phase 4 rename from "O Abrigo" to "A Logistica" was already completed in Sprint 20 (phase-config.ts + i18n).
