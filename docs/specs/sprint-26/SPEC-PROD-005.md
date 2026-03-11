# SPEC-PROD-005: Expedition Completion & Summary

**Version**: 1.0.0
**Status**: Draft
**Author**: product-owner
**Reviewers**: [tech-lead, ux-designer, architect]
**Created**: 2026-03-11
**Last Updated**: 2026-03-11

---

## 1. Problem Statement

The expedition flow currently has no defined endpoint. When a user finishes Phase 6 (Itinerary), there is no "Complete Expedition" action and no consolidated summary of all trip data collected across 6 phases. This creates two problems:

1. **No closure signal** (SPEC-PROD-001 AC-017, deferred from Sprint 25): Phase 6 has "Next" navigation but no terminal action. Users finish the itinerary and have no clear indication that their expedition planning is complete. There is no transition from "planning" to "planned" state.

2. **No consolidated view** (SPEC-PROD-002 AC-009, deferred from Sprint 25): After completing all 6 phases, users cannot see a single-page overview of everything they planned. To review their trip, they must navigate phase by phase -- destination in Phase 1, passengers in Phase 2, checklist in Phase 3, transport in Phase 4, guide in Phase 5, itinerary in Phase 6. This is tedious and error-prone.

**Evidence**: Both items were defined as acceptance criteria in Sprint 25 specs but deferred due to budget constraints. They are the two most significant deferred items from Sprint 25.

**Affected users**: All personas. Every user who completes all 6 phases needs a completion signal and a summary view.

## 2. User Story

As a traveler (any persona),
I want to complete my expedition with a clear "finish" action and then see a consolidated summary of ALL my trip planning data in one place,
so that I can confirm everything is correct, feel a sense of completion, and have a single reference page for my upcoming trip.

### Traveler Context

- **Pain point**: After investing time in 6 phases of planning, there is no payoff moment. No congratulations, no summary, no sense of achievement. The expedition just... ends with the itinerary. For a gamified product ("Atlas"), the absence of a completion milestone undermines the entire expedition metaphor.
- **Current workaround**: Users must manually navigate through each phase to review their data. There is no printable or shareable summary. Users often take screenshots of individual phases, which is fragile and incomplete.
- **Frequency**: Once per trip, at the most critical moment -- when the user has invested maximum effort and needs maximum confidence that their plan is complete.

## 3. Acceptance Criteria

### Complete Expedition Action

- [ ] AC-001: On Phase 6 (the final phase), the primary forward navigation MUST be labeled "Complete Expedition" (EN) / "Concluir Expedição" (PT-BR) instead of "Next" or any generic label.
- [ ] AC-002: When the user activates the "Complete Expedition" action, the system MUST: (a) set the trip's expedition status to "completed", (b) award the appropriate gamification points and badge for expedition completion, (c) navigate the user to the Expedition Summary screen.
- [ ] AC-003: The "Complete Expedition" action MUST require confirmation. Before executing, a confirmation dialog MUST ask: "Are you sure you want to complete this expedition? You can still edit your trip data afterward." (EN) / "Tem certeza que deseja concluir esta expedição? Você ainda poderá editar os dados da viagem depois." (PT-BR). The dialog MUST have "Confirm" and "Cancel" options.
- [ ] AC-004: After completion, the trip MUST remain editable. Completing the expedition is a milestone marker, NOT a lock. Users MUST be able to re-enter any phase and modify data.

### Expedition Summary Screen

- [ ] AC-005: The Expedition Summary screen MUST display a consolidated view of ALL trip data from all 6 phases, organized in clearly labeled sections:
  - **Phase 1 - O Chamado**: Destination (city, country), Origin (city, country), Travel dates (start - end, with duration in days), Traveler name, Bio
  - **Phase 2 - O Explorador**: Traveler type, Accommodation preference, Travel pace, Budget level, Passengers breakdown (X adults, Y children, Z infants, W seniors -- total N)
  - **Phase 3 - O Preparo**: Checklist completion status (N of M items completed), Trip classification (domestic/international/intercontinental)
  - **Phase 4 - A Logistica**: Number of transport segments with summary (e.g., "2 flights, 1 bus"), Number of accommodation bookings with summary (e.g., "2 hotels"), Selected mobility options (e.g., "Walking, Public transit, Taxi")
  - **Phase 5 - A Conexao**: Guide generation status (generated on [date] / not generated), Top 3 highlights from the guide (if available)
  - **Phase 6 - O Roteiro**: Number of itinerary days, Total number of planned activities
- [ ] AC-006: Each section in the summary MUST have an "Edit" link/button that navigates the user directly to the corresponding phase in the expedition flow, preserving all data.
- [ ] AC-007: The summary screen MUST be accessible from the dashboard for completed expeditions. The trip card's primary action for completed trips MUST navigate to the summary (not to Phase 1).

### Gamification Integration

- [ ] AC-008: Completing an expedition MUST award gamification points. The point value is defined by the existing PointsEngine configuration (currently: expedition completion = configurable, recommend 100 points).
- [ ] AC-009: Completing an expedition for the first time MUST award the "expedition_complete" badge (or equivalent, as defined in the badge catalog). If the badge already exists in the catalog, use it; if not, this spec requires adding it.
- [ ] AC-010: The Expedition Summary screen MUST display the gamification reward earned (points + badge) in a celebratory but non-intrusive manner. The celebration MUST auto-dismiss or be dismissible.

### Data Accuracy

- [ ] AC-011: All data displayed on the summary MUST be read from the persisted data store, NOT from transient state. This ensures accuracy.
- [ ] AC-012: If any phase data is missing (e.g., user skipped Phase 4 transport), the corresponding summary section MUST display "Not completed" / "Nao concluido" rather than being silently omitted.
- [ ] AC-013: Booking codes displayed in the summary (transport, accommodation) MUST be masked (e.g., "BOOK-****-XY7") per the security requirement from SPEC-PROD-002.

### Dashboard Integration

- [ ] AC-014: On the dashboard, trip cards for completed expeditions MUST display a visual "Completed" badge/indicator distinct from active/in-progress trips.
- [ ] AC-015: The dashboard MUST support filtering or sorting by expedition status (active vs. completed) if the user has more than 5 trips.

## 4. Scope

### In Scope

- "Complete Expedition" action on Phase 6 with confirmation dialog
- Expedition status transition (in-progress to completed)
- Expedition Summary screen with consolidated data from all 6 phases
- "Edit" navigation from summary to individual phases
- Gamification rewards for expedition completion (points + badge)
- Dashboard integration for completed trips (visual indicator + summary access)
- Localization (PT-BR and EN) for all new UI text
- Masked booking codes on summary

### Out of Scope

- PDF export of the summary (future feature)
- Sharing the summary via link or social media (future feature)
- Printing optimization (CSS print styles) -- deferred
- Trip archival workflow (separate from completion)
- Email notification on completion (requires email provider, not yet chosen)
- Re-opening a completed expedition (it is already editable per AC-004, no separate "re-open" needed)
- Summary for partially completed expeditions (this spec covers only fully completed expeditions)

## 5. Constraints (MANDATORY)

### Security

- The summary screen MUST enforce trip ownership (BOLA prevention). A user MUST NOT be able to view another user's expedition summary by manipulating URL parameters or trip identifiers.
- Booking codes MUST be masked by default on the summary. Revealing the full code requires explicit user action (click to reveal) with a re-authentication check if the session is older than 15 minutes.
- The "Complete Expedition" action MUST be a server-side state transition. The client cannot set the expedition status directly.
- No PII (name, bio) may be logged when rendering the summary screen.

### Accessibility

- WCAG 2.1 AA compliance minimum.
- The summary screen MUST use a proper heading hierarchy: each phase section as a heading (h2), data fields as labeled values.
- Screen readers MUST be able to navigate by section headings to jump between phases in the summary.
- The confirmation dialog MUST trap focus and be dismissible via Escape key.
- The gamification celebration MUST NOT use auto-playing audio or motion that cannot be disabled (respects prefers-reduced-motion).
- "Edit" links MUST have descriptive accessible labels (e.g., "Edit Phase 1 O Chamado data", not just "Edit").

### Performance

- The summary screen MUST load in under 2 seconds (aggregating data from all 6 phases).
- The "Complete Expedition" action (status update + gamification award) MUST complete in under 3 seconds.
- The confirmation dialog MUST appear in under 200ms after user activates the action.

### Architectural Boundaries

- This spec does NOT define the data aggregation mechanism or API shape. That belongs to SPEC-ARCH.
- This spec does NOT define the visual design of the summary screen or the gamification celebration. That belongs to SPEC-UX.
- This spec does NOT introduce new data models. The expedition status is an existing field on the Trip model (or should be added via SPEC-ARCH if not present).
- The gamification point value for expedition completion is a configuration parameter, not hardcoded in this spec.

## 6. Success Metrics

- **Expedition completion rate**: >= 80% of users who reach Phase 6 activate the "Complete Expedition" action (currently 0% because the action does not exist). Measured by analytics event.
- **Summary engagement**: >= 70% of users who complete an expedition view the summary screen for at least 10 seconds (indicating they read it). Measured by analytics.
- **Edit-from-summary usage**: >= 20% of users click at least one "Edit" link from the summary to review/modify phase data. Measured by analytics.
- **Gamification satisfaction**: Completion badge earned by >= 90% of users who reach Phase 6. Measured by badge award records.

## 7. Dependencies

- SPEC-PROD-001 (Expedition Navigation): Phase 6 navigation must work correctly. AC-017 of SPEC-PROD-001 is fulfilled by this spec's AC-001/AC-002.
- SPEC-PROD-002 (Dashboard): AC-009 of SPEC-PROD-002 is fulfilled by this spec's AC-005/AC-007. AC-002 (trip card redesign) provides the dashboard context for completed trips.
- Gamification engine (PointsEngine, badge catalog) from Sprint 9 must support the "expedition_complete" event. If not already configured, this is an implementation task.
- SPEC-ARCH required to define the data aggregation endpoint for the summary screen.

## 8. Vendor Independence

- This spec describes WHAT the feature does, not HOW it is implemented.
- Must NOT reference specific libraries, frameworks, or vendor products.
- Implementation details belong in the corresponding SPEC-ARCH document.

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-11 | product-owner | Initial draft for Sprint 26. Consolidates SPEC-PROD-001 AC-017 and SPEC-PROD-002 AC-009 |
