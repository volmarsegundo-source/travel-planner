# SPEC-PROD-001: Expedition Navigation & Phase Sequencing

**Version**: 1.0.0
**Status**: Draft
**Author**: product-owner
**Reviewers**: [tech-lead, ux-designer, architect]
**Created**: 2026-03-11
**Last Updated**: 2026-03-11

---

## 1. Problem Statement

Manual testing of v0.17.0 (95 test cases) revealed that the expedition flow -- the core user journey of the product -- has critical navigation and sequencing defects. Specifically:

1. **Passengers selector never appears** (BUG-P0-001): Users complete the expedition without ever being asked about the number of travelers. This means AI-generated itineraries, checklists, and transport suggestions operate without passenger data, producing inaccurate results.

2. **Progress bar navigation is broken** (BUG-P0-002): Clicking any phase segment on the progress bar navigates the user to the last completed phase instead of the clicked phase. Users cannot jump to a specific phase to review or edit data.

3. **No bi-directional navigation** (OBS-001): Users cannot freely move backward to previous phases. Once a phase is completed, the only way to revisit it is through the (broken) progress bar.

4. **No visual indicator of phase completeness** (OBS-002): All phases look the same visually regardless of whether they are complete, in progress, or not yet started.

5. **No phase/step identification on screen** (OBS-003): Users do not see which phase they are in or which step within a phase. This causes disorientation, especially on mobile.

6. **Phase 3 name mismatch** (OBS-004): Phase 3 is named "A Rota" (The Route) but functions as a document/preparation checklist, confusing users who expect route planning.

7. **Car rental in wrong step** (BUG-P1-003): In Phase 4, car rental options appear in Step 1 (Transport) instead of Step 3 (Mobilidade/Mobility).

These issues collectively make the expedition flow -- the product's primary value proposition -- unreliable and confusing.

**Evidence**: 35 of 95 manual test cases failed (37% failure rate). At least 8 failures directly relate to navigation and phase sequencing.

**Affected users**: All personas (@leisure-solo, @leisure-family, @business-traveler, @bleisure). Every user who creates a trip is affected.

## 2. User Story

As a traveler (any persona),
I want to navigate through the expedition phases in a clear, predictable sequence with the ability to move forward and backward at any time,
so that I can complete my trip planning without confusion, review and edit any previously entered data, and trust that all necessary information (including passengers) has been collected.

### Traveler Context

- **Pain point**: The expedition flow is the core product experience -- planning a trip through 6 structured phases. When navigation is broken, users cannot complete their planning, cannot review data, and lose trust in the product. Missing passenger data means AI outputs are inaccurate (e.g., budget for 1 person when traveling with 4).
- **Current workaround**: Users have no workaround. They cannot access the passengers selector at all, and cannot navigate backward. The only option is to delete the trip and start over.
- **Frequency**: 100% of users are affected on every trip creation. This is not an edge case -- it is the happy path.

## 3. Acceptance Criteria

### Phase Sequence

- [ ] AC-001: The expedition MUST present exactly 6 phases in this order: Phase 1 "O Chamado", Phase 2 "O Explorador", Phase 3 "O Preparo", Phase 4 "A Logistica", Phase 5 "A Conexao", Phase 6 "O Roteiro".
- [ ] AC-002: Phase 3 MUST be labeled "O Preparo" (not "A Rota") in all UI elements: progress bar, page headers, breadcrumbs, and navigation controls. This applies to both PT-BR and EN localizations (EN: "The Preparation").
- [ ] AC-003: Each phase MUST collect the data defined in the Phase Data Ownership table (see Section 4). No data field may be silently skipped.

### Phase 2 -- Passengers

- [ ] AC-004: Phase 2 "O Explorador" MUST include a passengers step with selectors for: adults (default 1, min 1, max 20), children (default 0, min 0), infants (default 0, min 0), seniors (default 0, min 0). The total across all categories MUST NOT exceed 20.

### Navigation -- Bi-directional

- [ ] AC-005: Given a user is on any phase N (where N > 1), when the user activates the "Back" control, then the user MUST be navigated to phase N-1 with all previously entered data preserved.
- [ ] AC-006: Given a user has completed phase N and is on phase N+1 or later, when the user activates the "Back" control repeatedly, then the user MUST be able to navigate all the way back to Phase 1 with data preserved at every phase.
- [ ] AC-007: Given a user is on any phase N (where N < 6) and the current phase data is valid, when the user activates the "Next" control, then the user MUST be navigated to phase N+1.

### Progress Bar Navigation

- [ ] AC-008: The progress bar MUST visually distinguish three phase states using distinct colors or visual treatments: (a) **Completed** -- phase has been finished, (b) **Current** -- phase the user is currently viewing, (c) **Incomplete** -- phase not yet started or partially filled.
- [ ] AC-009: Given a user views the progress bar, when the user activates (clicks/taps) a specific phase segment, then the user MUST be navigated directly to THAT specific phase (not to the last completed phase, not to any other phase).
- [ ] AC-010: Given a user navigates to a previously completed phase via the progress bar, then all data from that phase MUST be pre-populated with the previously saved values.

### Phase/Step Identification

- [ ] AC-011: Every screen within the expedition flow MUST display: (a) the current phase name (e.g., "O Explorador"), and (b) the current step number within the phase if the phase has multiple steps (e.g., "Step 2 of 4").
- [ ] AC-012: The phase name and step number MUST be visible without scrolling (above the fold) on both mobile (375px) and desktop (1280px) viewports.

### Phase 4 -- Car Rental Placement

- [ ] AC-013: In Phase 4 "A Logistica", car rental options MUST appear in Step 3 (Mobilidade/Mobility), NOT in Step 1 (Transport). Step 1 covers inter-city transport (flights, trains, buses). Step 3 covers local mobility (walking, public transit, car rental, bicycle, taxi/rideshare).

### Data Persistence

- [ ] AC-014: Given a user completes phase N and navigates forward to phase N+1, when the user later navigates back to phase N (via back button or progress bar), then all data from phase N MUST be displayed exactly as it was saved. No data loss on navigation.
- [ ] AC-015: Given a user edits data in a previously completed phase, when the user saves and navigates forward again, then the updated data MUST be persisted and reflected in all downstream phases that consume it.

### Edge Cases

- [ ] AC-016: Given a user is on Phase 1 (first phase), then the "Back" control MUST either be hidden or navigate to the trip dashboard (not cause an error).
- [ ] AC-017: Given a user is on Phase 6 (last phase), then the "Next" control MUST be replaced by a "Complete Expedition" or equivalent final action.
- [ ] AC-018: Given a user navigates to an incomplete phase via the progress bar (e.g., jumps from Phase 1 to Phase 4 without completing Phase 2-3), the system MUST either: (a) allow the jump and show the incomplete phase with empty fields, OR (b) redirect the user to the first incomplete phase with a message. The chosen behavior must be consistent -- never silently redirect to a wrong phase.

## 4. Scope

### In Scope

- Phase sequence enforcement (6 phases in correct order)
- Phase 3 rename from "A Rota" to "O Preparo" (all UI, all locales)
- Passengers step restoration in Phase 2
- Progress bar click-to-navigate fix (navigate to the clicked phase)
- Progress bar visual states (completed/current/incomplete)
- Back/Next navigation controls on every phase screen
- Phase name + step number display on every expedition screen
- Car rental moved from Phase 4 Step 1 to Phase 4 Step 3
- Data persistence across forward/backward navigation

### Phase Data Ownership (authoritative)

| Phase | Steps | Data Fields |
|-------|-------|-------------|
| Phase 1 "O Chamado" | Profile, Destination, Dates, Confirmation | Name, bio, destination (city/country), origin (city/country), start date, end date |
| Phase 2 "O Explorador" | Traveler type, Accommodation pref, Pace, Budget, Passengers | Traveler type, accommodation preference, travel pace, budget level, adults count, children count, infants count, seniors count |
| Phase 3 "O Preparo" | Checklist | Trip classification (domestic/international/intercontinental), AI-generated document checklist, packing suggestions |
| Phase 4 "A Logistica" | Transport, Accommodation, Mobility | Transport segments (N records, each with type/departure/arrival/dates/booking code), accommodation bookings (max 5, each with name/address/dates/booking code), local mobility selections (multi-select from predefined options including car rental) |
| Phase 5 "A Conexao" | Guide | AI-generated destination guide with 10 visible categories |
| Phase 6 "O Roteiro" | Itinerary | AI-generated daily itinerary, day-by-day plan, drag-and-drop reorder |

### Out of Scope

- New data fields not already implemented (no new columns or models)
- Phase 6 back button (deferred to Sprint 26 -- BUG-P1-008)
- Phase 6 drag-and-drop time adjustment (deferred to Sprint 26 -- BUG-P1-009)
- Phase transition animations (deferred -- UX-001)
- Adding new phases or removing existing phases
- Changes to the AI generation logic within phases
- Mobile-specific navigation patterns beyond responsive layout (no swipe gestures, no bottom nav)

## 5. Constraints (MANDATORY)

### Security

- Phase navigation MUST NOT bypass server-side validation. If a user navigates backward and modifies data, the modified data MUST be re-validated server-side before persisting.
- BOLA prevention: navigation between phases MUST verify that the trip belongs to the authenticated user. A user MUST NOT be able to navigate to phases of another user's trip by manipulating phase/trip identifiers.
- Passenger data (adults, children, infants, seniors) is non-PII and does not require encryption.

### Accessibility

- WCAG 2.1 AA compliance minimum for all navigation elements.
- Progress bar MUST be keyboard-navigable: each phase segment must be focusable and activatable via Enter or Space.
- Progress bar phase states (completed/current/incomplete) MUST be communicated via both visual styling AND accessible labels (not color alone).
- Back/Next buttons MUST have descriptive accessible labels (e.g., "Go back to Phase 1 O Chamado", not just "Back").
- Phase name and step number MUST be announced by screen readers when the phase changes.
- Focus MUST move to the phase content area when navigating between phases (not remain on the progress bar or navigation control).

### Performance

- Phase navigation (clicking progress bar, back/next) MUST complete in under 500ms (perceived transition time, excluding network latency for data save).
- Data persistence on phase change MUST complete within 2 seconds.
- Progress bar rendering MUST NOT cause layout shift (CLS = 0 for the progress bar component).

### Architectural Boundaries

- This spec does NOT define the internal step structure within each phase (e.g., how many form fields per step, field layout). That is the domain of the UX spec (SPEC-UX).
- This spec does NOT define the data models or API contracts. That is the domain of the architecture spec (SPEC-ARCH).
- The phase sequence (6 phases) is a product decision. Adding or removing phases requires a major version bump to this spec.

## 6. Success Metrics

- **Phase completion rate**: Increase from current ~60% (estimated based on bug severity) to >= 90% within 2 weeks of deployment. Measured by: users who start Phase 1 and reach Phase 6.
- **Passengers data collection**: 100% of trips created after deployment MUST have passengers data recorded (currently 0% due to BUG-P0-001).
- **Navigation error rate**: Zero instances of "click phase X, land on phase Y" behavior (BUG-P0-002 regression). Measured by: QA conformance audit + analytics events.
- **Manual test pass rate**: All navigation-related test cases (currently 8+ failures) must pass in Sprint 25 QA cycle.

## 7. Dependencies

- No external dependencies. All data models and components already exist.
- Phase 3 rename requires i18n key updates in both PT-BR and EN locale files.
- Passengers step component (PassengersStep) already exists from Sprint 20-21 -- it needs to be wired into the Phase 2 flow, not built from scratch.
- Progress bar component (DashboardPhaseProgressBar) exists -- its click handler needs correction.

## 8. Vendor Independence

- This spec describes WHAT the feature does, not HOW it is implemented.
- Must NOT reference specific libraries, frameworks, or vendor products.
- Implementation details belong in the corresponding SPEC-ARCH document.

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-11 | product-owner | Initial draft based on v0.17.0 manual test triage |
