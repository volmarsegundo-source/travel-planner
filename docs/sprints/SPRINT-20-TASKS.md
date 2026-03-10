# Sprint 20 -- Task Breakdown

**Tech Lead:** tech-lead
**Date:** 2026-03-10
**Branch:** `feat/sprint-20`
**Version:** v0.13.0 -> v0.14.0
**Budget:** 40h (2 devs x 20h each)
**Baseline:** 1365 tests, 94 suites

---

## Sprint Goals

1. Verify and fix Sprint 19 guide redesign rendering (P0)
2. Clean up dashboard UX -- remove duplicate buttons (P1, DEBT-S18-001)
3. Hash raw userId in gamification engines (Debt, SEC-S19-001)
4. Reorder Phase 1 -- personal info before trip info, with profile persistence (P1)
5. Expand personal preferences -- 8-10 structured categories with toggles (P1)
6. Add passenger details -- adults/children/seniors/infants breakdown (P1)
7. Transport phase data model only -- schema + migration for Sprint 21 UI (P1, partial ITEM-E)

---

## Dependency Map

```
T-S20-001 (guide verify) ........... standalone, parallel
T-S20-002 (remove dup buttons) ..... standalone, parallel
T-S20-003 (hash userId) ............ standalone, parallel

T-S20-004 (Phase 1 reorder) -----> T-S20-005 (profile persistence skip)
                                      |
T-S20-006 (preferences schema) --> T-S20-007 (preferences UI) --> T-S20-008 (preferences gamification)
                                      |
T-S20-009 (passenger schema) ----> T-S20-010 (passenger UI)

T-S20-011 (transport data model) .. standalone, parallel (schema + migration only)
T-S20-012 (integration tests) ..... depends on all above
```

**Parallelism plan:**
- Dev-1: T-S20-001, T-S20-003, T-S20-004, T-S20-005, T-S20-009, T-S20-010
- Dev-2: T-S20-002, T-S20-006, T-S20-007, T-S20-008, T-S20-011, T-S20-012

---

## Tasks

### Quick Wins (P0 + Debt)

#### T-S20-001: Verify and fix guide redesign rendering on staging

- **Assignee:** `dev-fullstack-1`
- **Priority:** P0
- **Estimate:** 1.5h
- **Depends on:** None
- **Spec ref:** ITEM-F (stakeholder report); Sprint 19 T-S19-006 (guide redesign)
- **Description:** Sprint 19 delivered DestinationGuideWizard with card-based layout (stat grid + content list). Stakeholder reports cards may not render on staging. Investigate whether the issue is (a) AI response missing new section keys (safety, health, transport_overview, local_customs), (b) Zod validation rejecting partial guide data from before the redesign, or (c) a rendering/hydration issue. Fix as needed.
- **Files likely affected:** `src/components/features/expedition/DestinationGuideWizard.tsx`, `src/types/ai.types.ts`, `src/lib/prompts/system-prompts.ts`
- **Acceptance criteria:**
  - [ ] DestinationGuideWizard renders all 10 section cards (4 stat + 6 content) when guide data is present
  - [ ] Guides generated before Sprint 19 (6-section format) gracefully degrade -- no crash, missing sections shown as empty or not shown
  - [ ] New guide generation produces all 10 sections
  - [ ] At least 1 test covers backward-compatible rendering of old guide format

---

#### T-S20-002: Remove duplicate Checklist/Roteiro shortcut buttons from ExpeditionCard

- **Assignee:** `dev-fullstack-2`
- **Priority:** P1
- **Estimate:** 1h
- **Depends on:** None
- **Spec ref:** DEBT-S18-001; Sprint 19 deferred T-S19-007; ITEM-B (stakeholder)
- **Description:** ExpeditionCard.tsx lines 82-103 render manual Checklist (viewChecklist) and Itinerary (viewItinerary) shortcut links alongside PhaseToolsBar, which already provides equivalent navigation. Remove the duplicated shortcuts. Keep the DashboardPhaseProgressBar, ChecklistProgressMini badge, and the PhaseToolsBar. Keep the "Continuar" overlay link.
- **Files affected:** `src/components/features/dashboard/ExpeditionCard.tsx`
- **Acceptance criteria:**
  - [ ] No duplicate Checklist or Roteiro/Itinerary buttons visible on the ExpeditionCard
  - [ ] PhaseToolsBar remains and provides access to checklist (phase >= 5) and itinerary (phase 6)
  - [ ] ChecklistProgressMini badge still displays for phase >= 3
  - [ ] Existing ExpeditionCard tests updated
  - [ ] Visual regression check: card layout remains clean at 375px and 1024px widths

---

#### T-S20-003: Hash raw userId in gamification engine log calls

- **Assignee:** `dev-fullstack-1`
- **Priority:** Debt (SEC-S19-001)
- **Estimate:** 1h
- **Depends on:** None
- **Spec ref:** SEC-S19-001 (LOW); security review finding
- **Description:** Replace 9 occurrences of raw `userId` in logger calls across `phase-engine.ts` (4), `points-engine.ts` (4), and `itinerary-plan.service.ts` (1) with `hashForLog(userId)` from `src/lib/utils/hash.ts`. Import already exists in some files; add where missing.
- **Files affected:** `src/lib/engines/phase-engine.ts`, `src/lib/engines/points-engine.ts`, `src/server/services/itinerary-plan.service.ts`
- **Acceptance criteria:**
  - [ ] Zero raw userId strings in any logger.info/warn/error call across the 3 files
  - [ ] All logger calls use hashForLog(userId) or equivalent hashed identifier
  - [ ] Existing tests still pass (no behavioral change)

---

### Phase 1 Reorder (P1)

#### T-S20-004: Reorder Phase 1 steps -- personal info before trip info

- **Assignee:** `dev-fullstack-1`
- **Priority:** P1
- **Estimate:** 4h
- **Depends on:** None
- **Spec ref:** Sprint 19 deferred T-S19-008; ITEM-C (stakeholder)
- **Description:** Current Phase1Wizard step order: (1) Destination, (2) Dates, (3) About You (name, bio, travel style), (4) Confirmation. New order: (1) About You (name, birthDate, bio, country, city), (2) Destination, (3) Dates, (4) Confirmation. The "About You" step collects profile fields that are also editable on the /account page. The confirmation step must display all collected data from the new order.
- **Current step flow in Phase1Wizard.tsx:**
  - Step 1: DestinationAutocomplete + tripType badge
  - Step 2: startDate + endDate + flexibleDates
  - Step 3: birthDate, phone, country, city, bio
  - Step 4: Confirmation summary + submit
- **New step flow:**
  - Step 1: birthDate, phone, country, city, bio (personal info)
  - Step 2: DestinationAutocomplete + tripType badge
  - Step 3: startDate + endDate + flexibleDates
  - Step 4: Confirmation summary + submit
- **Files affected:** `src/components/features/expedition/Phase1Wizard.tsx`, i18n keys in `messages/en.json` and `messages/pt.json` (step labels/descriptions)
- **Acceptance criteria:**
  - [ ] Phase1Wizard renders personal info as Step 1
  - [ ] Destination is Step 2, Dates is Step 3, Confirmation is Step 4
  - [ ] TOTAL_STEPS remains 4 (no new steps added)
  - [ ] Step navigation (Next/Back) works correctly in new order
  - [ ] Confirmation step shows all data from all 3 input steps
  - [ ] createExpeditionAction still receives all required fields
  - [ ] Existing Phase1Wizard tests updated for new step order
  - [ ] i18n step labels updated (pt + en)

---

#### T-S20-005: Profile persistence -- skip personal info if already filled

- **Assignee:** `dev-fullstack-1`
- **Priority:** P1
- **Estimate:** 2.5h
- **Depends on:** T-S20-004
- **Spec ref:** ITEM-C (stakeholder); ITEM-7 from Sprint 18 backlog
- **Description:** When the user already has a UserProfile with name, birthDate, country, and city filled, pre-populate Step 1 (personal info) with those values. Show a "Use saved profile" summary card with an "Edit" button instead of empty fields. If the user clicks Edit, show the form fields pre-populated. If the user has no profile data, show the form as today. This avoids re-asking the same info for every new expedition.
- **Files affected:** `src/components/features/expedition/Phase1Wizard.tsx`, `src/app/[locale]/(app)/expedition/new/page.tsx` (pass profile data as props)
- **Acceptance criteria:**
  - [ ] Phase1Wizard receives optional `userProfile` prop with pre-filled fields
  - [ ] If profile has name + birthDate + country + city, Step 1 shows summary card with "Edit" button
  - [ ] If profile is incomplete, Step 1 shows editable form (current behavior)
  - [ ] "Edit" button reveals form fields pre-populated with profile values
  - [ ] Changes in Step 1 are submitted as profileFields to createExpeditionAction (existing behavior)
  - [ ] Server component (expedition/new/page.tsx) fetches UserProfile and passes it as prop
  - [ ] Tests cover both paths: profile-present and profile-absent

---

### Preferences Expansion (P1)

#### T-S20-006: Personal preferences schema and types

- **Assignee:** `dev-fullstack-2`
- **Priority:** P1
- **Estimate:** 2h
- **Depends on:** None
- **Spec ref:** ITEM-A (stakeholder); ITEM-12 from Sprint 18
- **Description:** Define structured preference categories as a Zod schema and TypeScript types. Categories (8-10): cuisine preferences (multi-select), activity types (multi-select), travel pace (already exists in Phase 2 -- reuse), accessibility needs (exists as free text -- convert to structured), dietary restrictions (exists as free text -- convert to structured), budget sensitivity (low/med/high), nightlife preference (yes/no/sometimes), photography interest (none/casual/enthusiast). Store as JSON in a new `preferences` field on UserProfile (Json? type). This avoids N columns and is queryable via Prisma Json filters if needed.
- **Files affected:** `prisma/schema.prisma` (add `preferences Json?` to UserProfile), `src/lib/validations/preferences.schema.ts` (new), `src/types/preferences.types.ts` (new), migration file
- **Acceptance criteria:**
  - [ ] Prisma schema has `preferences Json?` on UserProfile
  - [ ] Migration created and tested locally
  - [ ] Zod schema `PreferencesSchema` validates all 8 categories
  - [ ] TypeScript type `UserPreferences` exported from types file
  - [ ] Each category has defined allowed values (enums/arrays)
  - [ ] Schema tests: valid preferences pass, invalid values rejected
  - [ ] Backward compatible: existing profiles with null preferences work

---

#### T-S20-007: Preferences UI -- toggles and checkboxes in Phase 2

- **Assignee:** `dev-fullstack-2`
- **Priority:** P1
- **Estimate:** 5h
- **Depends on:** T-S20-006
- **Spec ref:** ITEM-A (stakeholder); ITEM-2 from manual test findings
- **Description:** Replace the free-text `dietaryRestrictions` and `accessibility` fields in Phase2Wizard "preferences" step with structured toggles/checkboxes organized by category. Use the categories defined in T-S20-006. Render as a scrollable grid of category cards, each with multi-select checkboxes or toggle switches. Persist via a new `savePreferencesAction` server action that writes to `UserProfile.preferences` JSON field. Pre-populate from existing profile preferences if present.
- **Files affected:** `src/components/features/expedition/Phase2Wizard.tsx`, `src/server/actions/profile.actions.ts` (new action), i18n messages (pt + en for all category labels and option labels)
- **Acceptance criteria:**
  - [ ] Phase2Wizard "preferences" step shows 8 structured categories
  - [ ] Each category renders with appropriate control (checkbox group, toggle, or slider)
  - [ ] Existing free-text dietaryRestrictions and accessibility still accepted (backward compat)
  - [ ] Preferences saved to UserProfile.preferences JSON field
  - [ ] Pre-populated from existing profile on subsequent expeditions
  - [ ] Responsive: 2-column grid on desktop, 1-column on mobile
  - [ ] i18n: all labels translated (pt + en)
  - [ ] Tests: render, selection, submit, pre-population

---

#### T-S20-008: Preferences gamification -- points per category fill

- **Assignee:** `dev-fullstack-2`
- **Priority:** P1
- **Estimate:** 1.5h
- **Depends on:** T-S20-007
- **Spec ref:** ITEM-A (stakeholder); gamification integration
- **Description:** Award gamification points when the user fills each preference category for the first time. Use PointsEngine.awardPoints with type "preference_fill". Award 10 points per category filled (max 80 for all 8). Track which categories have been filled in the UserProfile.preferences JSON (add a `_filled` metadata key or check non-empty arrays). Integrate with completionScore recalculation.
- **Files affected:** `src/server/actions/profile.actions.ts`, `src/lib/engines/points-engine.ts`, `src/server/services/profile.service.ts`
- **Acceptance criteria:**
  - [ ] First fill of each preference category awards 10 points
  - [ ] Repeat fills of same category do not award duplicate points
  - [ ] completionScore updated when preferences change
  - [ ] PointTransaction records created with type "preference_fill"
  - [ ] Tests: points awarded on first fill, no duplicates on re-fill

---

### Passenger Details (P1)

#### T-S20-009: Passenger details schema -- adults/children/seniors/infants

- **Assignee:** `dev-fullstack-1`
- **Priority:** P1
- **Estimate:** 1.5h
- **Depends on:** None
- **Spec ref:** ITEM-D (stakeholder); ITEM-10 from Sprint 18
- **Description:** Add structured passenger breakdown to Trip model. Replace or augment the existing `groupSize` (currently a simple integer in Phase 2) with a structured `passengers` JSON field on Trip. Structure: `{ adults: number, children: { count: number, ages: number[] }, seniors: number, infants: number }`. Add Zod schema for validation. Children ages are needed for airline booking context and activity suitability.
- **Files affected:** `prisma/schema.prisma` (add `passengers Json?` to Trip), `src/lib/validations/trip.schema.ts` (new PassengersSchema), migration file
- **Acceptance criteria:**
  - [ ] Trip model has `passengers Json?` field
  - [ ] Migration created and tested locally
  - [ ] Zod `PassengersSchema` validates structure (adults >= 1, children.ages array length matches children.count, seniors >= 0, infants >= 0)
  - [ ] Total passengers derived function: adults + children.count + seniors + infants
  - [ ] Backward compatible: existing trips with null passengers work (falls back to groupSize)
  - [ ] Schema tests cover valid and invalid passenger combinations

---

#### T-S20-010: Passenger details UI in Phase 1 or Phase 2

- **Assignee:** `dev-fullstack-1`
- **Priority:** P1
- **Estimate:** 3.5h
- **Depends on:** T-S20-009, T-S20-004
- **Description:** Add passenger breakdown UI to the expedition creation flow. Place after the dates step (new Step 3 in the reordered flow, shifting Confirmation to Step 5, TOTAL_STEPS becomes 5). Use +/- stepper controls for adults/seniors/infants. Children: +/- stepper with age input for each child (dropdown 0-17). Show total passenger count. Persist via `passengers` JSON on Trip. If existing Phase2Wizard `groupSize` is already set, pre-populate total from it.
- **Decision point:** Adding passengers to Phase 1 increases TOTAL_STEPS from 4 to 5. Alternative: place in Phase 2 alongside travelerType/groupSize (which already has group size). Recommendation: Phase 2 (alongside existing groupSize) to keep Phase 1 focused on the essential trip creation data and avoid making the initial wizard too long.
- **Revised placement: Phase 2 step, NOT Phase 1.** Add as a new step in Phase2Wizard after "travelerType" and before "accommodation". Replace the simple `groupSize` slider with the structured passenger breakdown. This keeps Phase 1 at 4 steps (as reordered in T-S20-004).
- **Files affected:** `src/components/features/expedition/Phase2Wizard.tsx`, `src/server/actions/expedition.actions.ts` (save passengers on phase 2 complete), i18n messages
- **Acceptance criteria:**
  - [ ] Phase2Wizard has a "Passengers" step with +/- steppers for adults, children, seniors, infants
  - [ ] Children ages collected via dropdown (0-17) for each child
  - [ ] Minimum 1 adult enforced (validation)
  - [ ] Total passenger count displayed
  - [ ] Data saved to Trip.passengers JSON on phase 2 completion
  - [ ] Old groupSize logic still works for trips without passengers field
  - [ ] Responsive: steppers usable on mobile (375px touch targets >= 44px)
  - [ ] i18n labels for all passenger types (pt + en)
  - [ ] Tests: render, add/remove passengers, validation, submit

---

### Transport Data Model (P1 -- partial ITEM-E)

#### T-S20-011: Transport phase data model -- schema, types, migration

- **Assignee:** `dev-fullstack-2`
- **Priority:** P1
- **Estimate:** 3h
- **Depends on:** None
- **Spec ref:** ITEM-E (stakeholder); TRANSPORT-PHASE-SPEC.md (US-115, US-118)
- **Description:** Lay the data foundation for the transport phase (Phase 4 expansion). This sprint delivers ONLY the schema -- no UI, no API routes, no wizard changes. Create: (1) `origin` field on Trip (VarChar(150), nullable), (2) `TripTransport` model for N transport records per trip, (3) `TripAccommodation` model for N accommodation records per trip, (4) `localMobility` Json? field on Trip for multi-select options. Booking codes (reservationCode) must be encrypted at rest (store as `reservationCodeEnc` using existing crypto.ts AES-256-GCM). Zod schemas for all new models. Types file.
- **Files affected:** `prisma/schema.prisma`, `src/lib/validations/transport.schema.ts` (new), `src/types/transport.types.ts` (new), migration file
- **Acceptance criteria:**
  - [ ] Trip model has `origin String? @db.VarChar(150)` field
  - [ ] Trip model has `localMobility Json?` field
  - [ ] TripTransport model with fields: id, tripId, transportType (enum), operator, reservationCodeEnc, departureAt, arrivalAt, departureLocation, arrivalLocation, estimatedCost, estimatedCostCurrency, notes, orderIndex, createdAt, updatedAt
  - [ ] TripAccommodation model with fields: id, tripId, accommodationType (enum), name, address, reservationCodeEnc, checkIn, checkOut, estimatedCost, estimatedCostCurrency, notes, orderIndex, createdAt, updatedAt
  - [ ] Both models have FK to Trip with onDelete: Cascade
  - [ ] Zod schemas validate all fields with appropriate constraints
  - [ ] TransportType enum: flight, bus, train, car, ferry, other
  - [ ] AccommodationType enum: hotel, hostel, airbnb, friends_house, camping, other
  - [ ] Migration created and tested locally
  - [ ] Cascade deletion of TripTransport and TripAccommodation added to account deletion flow
  - [ ] Types exported
  - [ ] Schema tests cover validation rules

---

### Cross-cutting

#### T-S20-012: Integration testing and sprint validation

- **Assignee:** `dev-fullstack-2`
- **Priority:** P1
- **Estimate:** 2h
- **Depends on:** All previous tasks
- **Description:** Final validation pass. Run full test suite, verify no regressions, check import conventions (no `next/navigation` in components), verify all new i18n keys present in both locales, verify migration applies cleanly on fresh DB. Fix any issues found.
- **Acceptance criteria:**
  - [ ] All tests pass (target: >= 1440 tests, 0 failures)
  - [ ] No `next/navigation` or `next/link` imports in new component files (use `@/i18n/navigation`)
  - [ ] All new i18n keys present in both `messages/en.json` and `messages/pt.json`
  - [ ] `npx prisma migrate dev` applies cleanly
  - [ ] `npm run build` succeeds with no errors
  - [ ] No new eslint-disable comments without justification

---

## Effort Summary

| Task | Assignee | Estimate | Priority |
|------|----------|----------|----------|
| T-S20-001: Guide redesign verify/fix | dev-fullstack-1 | 1.5h | P0 |
| T-S20-002: Remove duplicate buttons | dev-fullstack-2 | 1h | P1/Debt |
| T-S20-003: Hash userId in engines | dev-fullstack-1 | 1h | Debt |
| T-S20-004: Phase 1 step reorder | dev-fullstack-1 | 4h | P1 |
| T-S20-005: Profile persistence skip | dev-fullstack-1 | 2.5h | P1 |
| T-S20-006: Preferences schema/types | dev-fullstack-2 | 2h | P1 |
| T-S20-007: Preferences UI (Phase 2) | dev-fullstack-2 | 5h | P1 |
| T-S20-008: Preferences gamification | dev-fullstack-2 | 1.5h | P1 |
| T-S20-009: Passenger details schema | dev-fullstack-1 | 1.5h | P1 |
| T-S20-010: Passenger details UI (Phase 2) | dev-fullstack-1 | 3.5h | P1 |
| T-S20-011: Transport data model | dev-fullstack-2 | 3h | P1 |
| T-S20-012: Integration testing | dev-fullstack-2 | 2h | P1 |
| **Dev-1 total** | | **14h** | |
| **Dev-2 total** | | **14.5h** | |
| **Sprint total** | | **28.5h** | |
| **Buffer (review, fixes, unknowns)** | | **11.5h** | |

---

## Dev Assignment and Execution Order

### Dev-fullstack-1 (14h)

```
Week 1 (parallel start):
  T-S20-001 (1.5h) -- guide verify (P0, day 1)
  T-S20-003 (1h)   -- hash userId (debt, day 1)
  T-S20-004 (4h)   -- Phase 1 reorder (P1, days 1-2)
  T-S20-009 (1.5h) -- passenger schema (parallel with T-S20-004)

Week 2 (sequential after T-S20-004):
  T-S20-005 (2.5h) -- profile persistence (depends on T-S20-004)
  T-S20-010 (3.5h) -- passenger UI in Phase 2 (depends on T-S20-009)
```

### Dev-fullstack-2 (14.5h)

```
Week 1 (parallel start):
  T-S20-002 (1h)   -- remove dup buttons (P1, day 1)
  T-S20-006 (2h)   -- preferences schema (day 1)
  T-S20-011 (3h)   -- transport data model (parallel, days 1-2)

Week 2 (sequential after T-S20-006):
  T-S20-007 (5h)   -- preferences UI (depends on T-S20-006, days 2-3)
  T-S20-008 (1.5h) -- preferences gamification (depends on T-S20-007)
  T-S20-012 (2h)   -- integration testing (end of sprint)
```

---

## ITEM-E (Transport Phase) -- Sprint 21 Deferral

The full transport phase (ITEM-E) is estimated at 20-30h and cannot fit in Sprint 20. This sprint delivers ONLY the data model (T-S20-011: schema, types, migration, Zod validation). The remaining work is deferred:

| Deferred to Sprint 21 | Estimate | Description |
|------------------------|----------|-------------|
| Transport UI -- Phase 4 Section A | 6-8h | Transport form with N-record list, +/- segments |
| Accommodation UI -- Phase 4 Section B | 4-6h | Accommodation form with N-record list |
| Local mobility UI -- Phase 4 Section C | 2-3h | Multi-select grid with icons |
| Phase 4 rename ("O Abrigo" -> "A Logistica") | 1h | Config + i18n update |
| Origin field UI + pre-population | 2h | DestinationAutocomplete for origin in Phase 1 |
| Cascade deletion for new models | 1h | Add to account deletion transaction |
| AI integration (itinerary uses transport data) | 4-6h | Prompt updates for Phase 6 |

---

## Definition of Done

- [ ] All 12 tasks above marked complete
- [ ] Code review approved by tech-lead
- [ ] Test coverage >= 80% on new service/schema files
- [ ] Test count >= 1440 (currently 1365, targeting +75 minimum)
- [ ] Security checklist passed:
  - [ ] No hardcoded credentials
  - [ ] reservationCodeEnc uses AES-256-GCM (T-S20-011 schema only -- encryption tested via existing crypto.ts)
  - [ ] hashForLog(userId) in all engine logger calls (T-S20-003)
  - [ ] No PII in logs
- [ ] Bias checklist passed:
  - [ ] Preference categories are inclusive and non-discriminatory
  - [ ] Passenger types neutral (no nationality-based pricing)
  - [ ] No dark patterns in profile persistence (easy to edit, clear about what is saved)
- [ ] No import convention violations (`@/i18n/navigation` enforced)
- [ ] All i18n keys present in both locales (pt + en)
- [ ] Migrations apply cleanly
- [ ] Build passes
- [ ] Merged to main via PR

---

## Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Guide redesign rendering issue is deeper than expected (data migration needed) | Medium | Medium | T-S20-001 is P0 day-1 -- if migration needed, budget from buffer |
| Phase 1 reorder breaks existing Phase1Wizard tests extensively | Low | Low | Tests are straightforward to update (step index changes) |
| Preferences expansion scope creep (too many categories, too much i18n) | Medium | Medium | Hard limit at 8 categories. Cut to 6 if i18n takes > 2h |
| Passenger details UI complexity (children ages) | Low | Low | Use simple dropdown per child, not date picker |
| Transport schema changes conflict with other schema changes | Low | High | Run all migrations in sequence; T-S20-006, T-S20-009, T-S20-011 must be coordinated |

---

## Notes

- **Commit discipline (Sprint 19 lesson):** All commits MUST reference the planning doc task ID (e.g., `feat(T-S20-004): reorder Phase 1 steps`). If scope changes, update THIS document first.
- **Import convention check:** Every code review must grep for `from "next/navigation"` and `from "next/link"` in components. Only `@/i18n/navigation` allowed.
- **Three migrations in this sprint:** preferences (T-S20-006), passengers (T-S20-009), transport (T-S20-011). Coordinate order to avoid conflicts. Recommended: preferences first, passengers second, transport third.
