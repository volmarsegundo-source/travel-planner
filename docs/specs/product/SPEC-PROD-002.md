# SPEC-PROD-002: Dashboard Trip Cards & Phase Confirmation

**Version**: 1.0.0
**Status**: Draft
**Author**: product-owner
**Reviewers**: [tech-lead, ux-designer, architect]
**Created**: 2026-03-11
**Last Updated**: 2026-03-11

---

## 1. Problem Statement

Manual testing of v0.17.0 revealed two issues with data presentation that undermine user trust and create confusion:

1. **Legacy dashboard buttons persist** (BUG-P0-003): Trip cards on the dashboard still display action buttons labeled "Itens", "Checklist", and "Hospedagem". These buttons were superseded when the expedition flow was restructured into the 6-phase model (Phase 4 "A Logistica" absorbed accommodation, Phase 3 absorbed checklist). Their continued presence creates duplicate entry points, confuses users about where to manage their trip data, and signals an incomplete product.

2. **Confirmation screen shows incomplete data** (BUG-P0-004): When a user completes a phase, the confirmation/summary screen only displays Destination, Origin, Dates, Trip Type, Accommodation Preference, Pace, and Budget. It is missing: Name, Bio, Passengers (adults/children/infants/seniors), and selected Preferences. Users cannot verify that all their data was captured correctly before proceeding, which erodes trust -- especially for the passengers count, which directly affects itinerary and budget calculations.

**Evidence**: Both issues were identified in manual testing. BUG-P0-003 has been reported in multiple sprint reviews and deferred repeatedly. BUG-P0-004 was discovered during the v0.17.0 triage.

**Affected users**: All personas. Every user sees the dashboard and every user passes through phase confirmation screens.

## 2. User Story

As a traveler (any persona),
I want the trip dashboard to show only current, relevant actions and the confirmation screens to display ALL data I have entered,
so that I can trust the product is correctly capturing my trip information and I am not confused by obsolete controls.

### Traveler Context

- **Pain point**: Legacy buttons suggest features that no longer work as standalone actions -- clicking them may lead to dead ends or duplicate data entry. The incomplete confirmation screen means users cannot verify that critical data (especially passengers) was recorded, forcing them to navigate back and check manually.
- **Current workaround**: Users ignore the legacy buttons (if they realize they are obsolete). For missing confirmation data, there is no workaround -- users simply do not know their data was captured.
- **Frequency**: Every session (dashboard is the home screen), every phase completion (confirmation is shown after each phase).

## 3. Acceptance Criteria

### Dashboard Trip Cards

- [ ] AC-001: Trip cards on the dashboard MUST NOT display the following legacy buttons: "Itens", "Checklist", "Hospedagem". These entry points have been superseded by the expedition phase flow.
- [ ] AC-002: Each trip card MUST display: (a) trip destination name, (b) travel dates (formatted for locale), (c) trip status indicator (active/completed/archived), (d) current phase progress (e.g., "Phase 3 of 6" or a mini progress bar), (e) a single primary action to continue/resume the expedition.
- [ ] AC-003: The primary action button on each trip card MUST navigate the user to their current phase in the expedition flow. If the expedition is complete, the button MUST navigate to the trip summary/overview.
- [ ] AC-004: Given a trip has been archived, the trip card MUST display a visual indicator of the archived state and the primary action MUST be "View" (read-only), not "Continue".
- [ ] AC-005: Trip cards MUST NOT display any action that does not have a functional destination. Every button/link on a trip card must lead to a working screen.

### Phase Confirmation Screen

- [ ] AC-006: The confirmation screen displayed at the end of Phase 1 MUST show all data collected in Phase 1: destination (city, country), origin (city, country), start date, end date, name, and bio.
- [ ] AC-007: The confirmation screen displayed at the end of Phase 2 MUST show all data collected in Phase 2: traveler type, accommodation preference, travel pace, budget level, and passengers breakdown (X adults, Y children, Z infants, W seniors -- total N).
- [ ] AC-008: If a phase has no explicit confirmation screen (e.g., Phase 3 checklist, Phase 5 guide), this spec does not require adding one. Confirmation screens are required only for phases that already have them (Phase 1, Phase 2) and for the final expedition summary.
- [ ] AC-009: The expedition completion summary (shown after Phase 6 or accessible from the dashboard for completed trips) MUST display a consolidated view of ALL trip data across all phases:
  - From Phase 1: Destination, Origin, Dates, Name, Bio
  - From Phase 2: Traveler type, Accommodation preference, Pace, Budget, Passengers
  - From Phase 3: Number of checklist items completed vs total
  - From Phase 4: Number of transport segments, number of accommodations, selected mobility options
  - From Phase 5: Confirmation that guide was generated (date of generation)
  - From Phase 6: Number of itinerary days planned
- [ ] AC-010: All data displayed on confirmation screens MUST be formatted for the active locale (dates in locale format, labels in the active language).

### Data Accuracy

- [ ] AC-011: Confirmation screens MUST display data as it was persisted (read from the data store), NOT from transient form state. This ensures the user sees what was actually saved, not what they think they entered.
- [ ] AC-012: If any expected data field is missing (e.g., passengers were not collected due to a bug), the confirmation screen MUST display a clear indicator (e.g., "Not provided" or a warning icon) rather than silently omitting the field.

## 4. Scope

### In Scope

- Removal of legacy buttons from trip dashboard cards ("Itens", "Checklist", "Hospedagem")
- Trip card redesign: destination, dates, status, phase progress, single primary action
- Phase 1 confirmation screen: add Name, Bio fields
- Phase 2 confirmation screen: add Passengers breakdown
- Expedition completion summary: consolidated view of all phases
- Missing data indicator on confirmation screens
- Locale-aware formatting on all confirmation displays

### Out of Scope

- Adding confirmation screens to phases that currently do not have them (Phase 3, 4, 5)
- Trip card visual design beyond content/actions (colors, shadows, animations are UX spec domain)
- Trip deletion or archival actions on the card (existing functionality, not changed by this spec)
- Dashboard layout or grid changes (trip card arrangement, responsive breakpoints)
- Adding new data fields to the trip model

## 5. Constraints (MANDATORY)

### Security

- Confirmation screens MUST display data for the authenticated user's trip only. The trip ownership check (BOLA prevention) must be enforced when loading confirmation data.
- Booking codes displayed on the expedition summary MUST be shown in masked format (e.g., "BOOK-****-XY7") unless the user explicitly requests to reveal them. Booking codes are classified as sensitive data and are encrypted at rest.
- No PII (name, bio) may be logged when rendering confirmation screens.

### Accessibility

- WCAG 2.1 AA compliance minimum.
- Trip cards MUST be navigable via keyboard (tab to card, Enter to activate primary action).
- Confirmation screen data MUST be structured with proper heading hierarchy (phase name as heading, data fields as labeled values).
- Screen readers MUST be able to identify each data field and its value (e.g., "Passengers: 2 adults, 1 child, total 3").
- Missing data indicators MUST be announced by screen readers (e.g., "Passengers: not provided").

### Performance

- Dashboard rendering with up to 20 trip cards MUST complete in under 2 seconds.
- Confirmation screen data load MUST complete in under 1 second.
- Removing legacy buttons MUST NOT introduce layout shift on existing trip cards (CLS = 0 for the card container).

### Architectural Boundaries

- This spec does NOT define the visual design of trip cards or confirmation screens. Visual specifications belong in SPEC-UX.
- This spec does NOT define API contracts for loading confirmation data. Those belong in SPEC-ARCH.
- The list of legacy buttons to remove ("Itens", "Checklist", "Hospedagem") is exhaustive. If other obsolete UI elements are discovered, they require a spec update.

## 6. Success Metrics

- **Legacy button elimination**: Zero instances of "Itens", "Checklist", or "Hospedagem" buttons visible anywhere in the application. Measured by: QA conformance audit.
- **Confirmation completeness**: 100% of data fields collected in Phase 1 and Phase 2 are displayed on their respective confirmation screens. Measured by: automated test assertions + manual verification.
- **User trust signal**: Reduction in "back navigation to check data" behavior by >= 50% after deployment (if analytics are available). Users who see complete confirmation screens should feel less need to go back and verify.
- **Manual test pass rate**: All confirmation-screen-related test cases must pass in Sprint 25 QA cycle.

## 7. Dependencies

- SPEC-PROD-001 (Expedition Navigation & Phase Sequencing): The confirmation screens rely on correct navigation and data persistence. Specifically, passengers data must be collected in Phase 2 (AC-004 of SPEC-PROD-001) before it can be displayed in the Phase 2 confirmation screen.
- Existing trip card component and confirmation components must be identified by the architect for modification scope.

## 8. Vendor Independence

- This spec describes WHAT the feature does, not HOW it is implemented.
- Must NOT reference specific libraries, frameworks, or vendor products.
- Implementation details belong in the corresponding SPEC-ARCH document.

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-11 | product-owner | Initial draft based on v0.17.0 manual test triage |
