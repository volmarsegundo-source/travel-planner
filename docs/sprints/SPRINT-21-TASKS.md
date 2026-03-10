# Sprint 21 — Task Breakdown

## Dev Assignments

### dev-fullstack-1 (18h)

#### T-S21-005: Booking Code Encryption Service (Day 1, 1.5h)
- Create `src/server/services/transport.service.ts`
  - CRUD for TransportSegment with bookingCode encrypt/decrypt
  - BOLA check: verify trip belongs to user
- Create `src/server/services/accommodation.service.ts`
  - CRUD for Accommodation with bookingCode encrypt/decrypt
  - BOLA check: verify trip belongs to user
- Tests: encrypt on save, decrypt on read, BOLA rejection
- **Dependency:** Both devs need this for booking codes

#### T-S21-001: Origin Field UI (2h)
- Add origin field to Phase1Wizard Step 2 (after destination)
  - Use `DestinationAutocomplete` component
  - Pre-populate from `userProfile.city + userProfile.country`
  - Save to Trip.origin via createExpeditionAction
- Update Phase1Schema to accept `origin` field
- Add i18n keys for origin field
- Tests: pre-population, save, validation

#### T-S21-002: Transport Wizard Section A (6-8h)
- Create `src/components/features/expedition/TransportStep.tsx`
  - N-record list with add/remove segments (max 10)
  - Each segment: transport type (VisualCardSelector), departure/arrival places,
    departure/arrival datetime, provider, booking code, estimated cost, notes, isReturn
  - Uses TransportSegmentSchema for validation
- Create `src/server/actions/transport.actions.ts`
  - saveTransportSegmentsAction, getTransportSegmentsAction
  - Uses TransportService for encrypt/decrypt
- Refactor Phase4Wizard.tsx to tabbed layout with 3 sections
- Add i18n keys for transport step
- Tests: add/remove segments, validation, save, load

#### T-S21-009: PassengersStep Extraction (1.5h)
- Extract passengers step from Phase2Wizard (lines 263-426) into `PassengersStep.tsx`
- Props: passenger state + setters, navigation handlers
- Keep Phase2Wizard as orchestrator
- Update existing Phase2Wizard tests
- Tests: PassengersStep unit tests

---

### dev-fullstack-2 (17.5h)

#### T-S21-006: Passenger Cap Validation (0.5h)
- Add `.refine()` to PassengersSchema: `adults + children.count + seniors + infants <= 20`
- Add i18n error message for cap exceeded
- Update Phase2Wizard validation message
- Tests: cap enforcement, boundary cases

#### T-S21-004: Local Mobility Section C (2-3h)
- Create `src/components/features/expedition/MobilityStep.tsx`
  - Multi-select icon grid for LOCAL_MOBILITY_OPTIONS
  - Each option: icon + label, toggle on/off
  - Uses LocalMobilitySchema
- Create server action to save localMobility to Trip
- Add i18n keys for mobility options
- Tests: select/deselect, save, load

#### T-S21-003: Accommodation Section B (4-6h)
- Create `src/components/features/expedition/AccommodationStep.tsx`
  - N-record list with add/remove (max 5)
  - Each entry: type (VisualCardSelector), name, address, booking code,
    check-in/check-out dates, estimated cost, notes
  - Uses AccommodationSchema
- Create server action for accommodation CRUD
- Add i18n keys for accommodation step
- Tests: add/remove entries, validation, max 5 cap, save, load

#### T-S21-007: Clickable Progress Bar (2h)
- Update DashboardPhaseProgressBar to accept `tripId` prop
- Make completed + current segments clickable (Link to phase page)
- Future/coming-soon phases remain non-clickable
- Pass tripId from ExpeditionCard
- Tests: click navigation, non-clickable future phases

#### T-S21-008: Progress Bar Phase Labels (1h)
- Add tooltip/label on hover for each progress bar segment
- Show phase name below segment on larger screens
- Tests: hover label visibility, accessibility

---

## Critical Path

```
Day 1: T-S21-005 (encryption service) → both devs unblocked
        T-S21-006 (passenger cap) → quick win

Day 2: T-S21-001 (origin field) | T-S21-004 (mobility)
        T-S21-002 starts (transport wizard) | T-S21-003 starts (accommodation)

Day 3: T-S21-002 continues | T-S21-003 continues
        T-S21-009 (passengers extraction)

Day 4: T-S21-002 finishes | T-S21-007 (clickable progress bar)
        Integration testing | T-S21-008 (progress bar labels)

Day 5: Build verification, security review, merge
```

## Files to Create
- `src/server/services/transport.service.ts`
- `src/server/services/accommodation.service.ts`
- `src/server/actions/transport.actions.ts`
- `src/components/features/expedition/TransportStep.tsx`
- `src/components/features/expedition/AccommodationStep.tsx`
- `src/components/features/expedition/MobilityStep.tsx`
- `src/components/features/expedition/PassengersStep.tsx`

## Files to Modify
- `src/components/features/expedition/Phase4Wizard.tsx` — tabbed refactor
- `src/components/features/expedition/Phase1Wizard.tsx` — origin field
- `src/components/features/expedition/Phase2Wizard.tsx` — extraction
- `src/components/features/dashboard/DashboardPhaseProgressBar.tsx` — clickable + labels
- `src/components/features/dashboard/ExpeditionCard.tsx` — pass tripId
- `src/lib/validations/trip.schema.ts` — passenger cap
- `src/lib/validations/expedition.schema.ts` — origin field
- `src/lib/engines/phase-config.ts` — update phase 4 tools
- `messages/en.json` — new i18n keys
- `messages/pt-BR.json` — new i18n keys
