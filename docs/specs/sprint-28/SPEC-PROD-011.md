---
spec_id: SPEC-PROD-011
title: "Complete Journey Summary with Edit"
type: product
status: Draft
version: "1.0.0"
author: product-owner
sprint: 28
priority: P1
created: "2026-03-11"
updated: "2026-03-11"
related_specs: [SPEC-PROD-005, SPEC-PROD-007, SPEC-PROD-009]
---

# SPEC-PROD-011: Complete Journey Summary with Edit

**Version**: 1.0.0
**Status**: Draft
**Author**: product-owner
**Reviewers**: [tech-lead, ux-designer, architect]
**Created**: 2026-03-11
**Last Updated**: 2026-03-11

---

## 1. Problem Statement

SPEC-PROD-005 (Expedition Completion & Summary) defines the summary screen shown after completing all 6 phases. SPEC-PROD-007 (Sprint 27 draft) proposed visual enrichment and next steps. Both specs treat the summary as a read-only, end-of-flow screen. Sprint 27 and v0.20.0 testing revealed three additional gaps that this spec addresses:

1. **No edit capability from summary**: After completing the expedition, travelers frequently want to adjust details -- change accommodation dates, update transport booking codes, or revise itinerary preferences. Currently, they must navigate back to the specific phase manually using the sidebar or progress bar. The summary should serve as a "control center" where any section can be edited with a single click.

2. **No dashboard access to summary for completed trips**: Once a traveler leaves the summary screen after completing an expedition, there is no way to return to it. The dashboard shows trip cards but no "View Summary" action for completed expeditions. Travelers who complete a trip and come back days later cannot review their aggregated plan.

3. **Missing readiness intelligence**: Travelers approaching their trip departure date need at-a-glance information about what is ready and what still needs attention. A trip countdown, readiness percentage, and "what's missing" checklist turn the summary from a static data dump into an actionable travel dashboard.

This spec supersedes SPEC-PROD-007 (Sprint 27 draft) and extends SPEC-PROD-005 with edit capability, dashboard access, and readiness intelligence.

**Evidence**: REC-009 from v0.19.0 manual testing. Stakeholder feedback requesting "a summary you'd actually want to come back to." Competitor analysis: TripIt and Wanderlog both offer editable trip summaries accessible from the main trip list.

**Affected users**: All personas who complete or partially complete an expedition. Primarily @leisure-solo and @leisure-family who revisit their plans multiple times before departure.

## 2. User Story

### Primary Story

As a traveler who has completed all 6 phases of expedition planning,
I want to see a comprehensive, visually engaging summary that shows all my trip data, allows me to edit any section by navigating to its phase, displays a countdown to my trip, and highlights what is still incomplete,
so that I feel confident my trip is well-planned, can quickly fix anything that needs attention, and feel excited about the upcoming journey.

### Secondary Story

As a traveler returning to the dashboard after completing an expedition,
I want to access my trip summary directly from the trip card on the dashboard,
so that I can review and update my plan without having to re-enter the expedition flow.

### Traveler Context

- **Pain point**: After investing time in 6 phases of planning, the summary should be the "payoff moment" -- a rewarding, comprehensive view that makes the user feel their planning effort was worthwhile. A text-only, read-only data dump does not deliver that emotional satisfaction. Additionally, users finish the expedition but may have incomplete checklist items or missing transport bookings, and the summary does not flag these gaps. Finally, once they leave the summary, they cannot return to it.
- **Current workaround**: Users manually check each phase to verify completion status. They use external calendar apps for trip countdowns. There is no integrated "readiness check." To edit a detail, they navigate to the specific phase from the sidebar. To review a completed trip, they re-enter the expedition flow.
- **Frequency**: The summary is viewed at completion (once per expedition) and then revisited 2-5 times in the days leading up to departure. The edit capability is used 1-3 times per completed expedition as travelers finalize details.

## 3. Acceptance Criteria

### Trip Countdown

- [ ] AC-001: The summary screen MUST display a trip countdown showing the number of days until the trip start date. Format: "X days until your trip" / "X dias para sua viagem". If the trip has already started, display "Trip in progress" / "Viagem em andamento". If the trip has ended, display "Trip completed on [end date]" / "Viagem concluida em [data fim]".
- [ ] AC-002: The countdown MUST be visually prominent -- positioned near the top of the summary, with typography and styling that conveys excitement and anticipation.

### Completion Status and Readiness

- [ ] AC-003: The summary MUST display a "trip readiness" indicator that shows an overall preparation percentage based on: (a) number of phases completed (weight: 40%), (b) checklist completion percentage from Phase 3 (weight: 30%), (c) whether transport is booked in Phase 4 (weight: 15%), (d) whether accommodation is booked in Phase 4 (weight: 15%).
- [ ] AC-004: Each of the 6 phase sections in the summary MUST display a completion status badge: "complete" (all data filled), "partial" (some data, some missing), or "not started" (no data). The specific visual treatment is defined in SPEC-UX.
- [ ] AC-005: If any phase section has status "partial" or "not started", the section MUST display a brief call-to-action: "Complete this section" / "Completar esta secao" that links directly to the relevant phase.

### Edit Capability

- [ ] AC-006: Each phase section in the summary MUST display an "Edit" / "Editar" action (icon or text link). Clicking "Edit" MUST navigate the user to the corresponding expedition phase (Phase 1 through Phase 6), pre-loaded with the existing data for that trip.
- [ ] AC-007: After the user edits data in a phase and returns (via the back button, breadcrumb, or completing the phase), the summary MUST reflect the updated data WITHOUT requiring a full page reload. Stale data on the summary after an edit is NOT acceptable.
- [ ] AC-008: The edit action MUST be available for ALL phases, including completed phases. A user MUST be able to re-enter a completed phase to modify data. The phase completion status MAY change as a result of edits (e.g., removing required data changes status from "complete" to "partial").

### Actionable Next Steps

- [ ] AC-009: The summary MUST include a "Next Steps" section that dynamically generates 1-3 suggested actions based on the trip's current state. Examples: "Complete your checklist (5 of 12 items done)", "Add accommodation details for your stay", "Your trip is in 15 days -- review your itinerary". The suggestions MUST prioritize incomplete or high-impact items.
- [ ] AC-010: Each suggested action in the "Next Steps" section MUST be clickable and navigate directly to the relevant screen (phase, checklist, transport form, etc.).

### Visual Layout

- [ ] AC-011: The summary header area MUST display a destination-relevant visual element. This can be: (a) a static color gradient themed to the destination's country/region, or (b) an icon or illustration representing the destination type (beach, city, mountain, etc. based on trip classification). Actual photographs are OUT OF SCOPE (licensing complexity).
- [ ] AC-012: The summary MUST use a card-based layout for the 6 phase sections rather than a flat text list. Each phase card MUST have: the phase name, its icon (matching the expedition progress bar icons), the completion status badge, key data summary, and the "Edit" action.

### Dashboard Access

- [ ] AC-013: For trips with expedition status "completed" (all 6 phases done) or "in_progress" (at least 1 phase started), the dashboard trip card MUST display a "View Summary" / "Ver Resumo" action button.
- [ ] AC-014: Clicking "View Summary" on the dashboard MUST navigate to the summary screen for that trip, showing all aggregated data.
- [ ] AC-015: The "View Summary" button MUST follow the CTA hierarchy defined in SPEC-PROD-009: secondary visual prominence (not competing with the primary "Continue Expedition" button for in-progress trips).

### Localization

- [ ] AC-016: All new text introduced by this spec (countdown, readiness indicator labels, next steps suggestions, completion status labels, edit labels, view summary button) MUST be localized for PT-BR and EN.

## 4. Scope

### In Scope

- Trip countdown display (days until trip)
- Trip readiness percentage indicator
- Per-phase completion status badges
- Edit action per phase section (navigates to phase)
- Summary reflects updated data after edit without full reload
- Calls-to-action for incomplete phases
- Dynamic "Next Steps" suggestions (1-3 items)
- Card-based visual layout for phase sections
- Destination-themed header visual (gradient/icon, no photos)
- "View Summary" button on dashboard trip cards for completed/in-progress trips
- Localization of all new UI text

### Out of Scope

- Destination photographs (licensing and CDN complexity -- future feature)
- Weather forecast integration (requires third-party API)
- PDF export or print-optimized view (deferred to post-beta)
- Social sharing functionality (deferred to post-beta)
- Email summary send (requires email provider, not chosen yet)
- Map embed in the summary (covered by SPEC-PROD-012 if applicable)
- Animated transitions or confetti effects beyond SPEC-PROD-005 celebration
- Inline editing within the summary page itself (user navigates to the phase to edit)
- Trip duplication or "plan a similar trip" feature (future)

## 5. Constraints (MANDATORY)

### Security

- All data displayed MUST be server-fetched and scoped to the authenticated user's trip (BOLA prevention, consistent with SPEC-PROD-005).
- The trip readiness calculation MUST happen server-side. The client MUST NOT compute readiness from local state.
- The edit action navigates to an existing phase route, so existing phase-level authorization applies. No new authorization logic is introduced.
- No new PII is introduced by this spec.

### Accessibility

- WCAG 2.1 AA compliance minimum.
- The trip countdown MUST be readable by screen readers with a clear label (e.g., "Trip countdown: 15 days remaining").
- The readiness percentage MUST be conveyed to screen readers as a numeric value, not only visually (e.g., "Trip readiness: 78 percent").
- Phase completion status badges MUST have accessible text alternatives ("Phase 1: Complete", "Phase 3: Partially complete").
- Card-based layout MUST maintain logical reading order for screen readers (Phase 1 through Phase 6, top to bottom).
- The "Edit" action MUST have an accessible label with context (e.g., "Edit Phase 1 O Chamado"), not just "Edit".
- Destination-themed gradient MUST NOT convey meaning through color alone; any information also conveyed through text.
- The "View Summary" button on dashboard cards MUST include the trip name in its accessible label (e.g., "View summary for Paris Vacation").

### Performance

- The summary screen (with all enhancements) MUST load in under 2 seconds (consistent with SPEC-PROD-005 performance budget).
- Trip readiness calculation MUST complete in under 500ms server-side.
- No additional AI calls are required by this spec. All data is already persisted from phases.
- After returning from an edit, the summary data refresh MUST complete in under 1 second.

### Architectural Boundaries

- This spec supersedes SPEC-PROD-007 and extends SPEC-PROD-005. All SPEC-PROD-005 acceptance criteria remain in force.
- This spec does NOT define the visual design details (colors, typography, card dimensions). That belongs to SPEC-UX.
- This spec does NOT define the API shape for the readiness calculation. That belongs to SPEC-ARCH.
- The "Next Steps" suggestion logic is implementation-defined within the constraints of this spec. A dedicated AI call for suggestions is NOT justified.
- Inline editing (editing data directly on the summary without navigating to the phase) is explicitly NOT in scope. The edit flow is: click Edit -> navigate to phase -> modify data -> return to summary.

## 6. Success Metrics

- **Summary return visits**: >= 40% of users who complete an expedition return to the summary at least once via the dashboard "View Summary" button. Measured by analytics.
- **Edit usage**: >= 25% of users who view the summary use the "Edit" action on at least one phase section. Measured by analytics.
- **Next Steps click-through**: >= 30% of users who view the summary click at least one "Next Step" suggestion. Measured by analytics.
- **Readiness improvement**: >= 20% of users who see "partial" status on a phase return to complete it (driven by the call-to-action or edit action). Measured by phase completion rate change.
- **Summary dwell time**: >= 50% increase in average time spent on the summary screen compared to pre-enhancement baseline. Measured by analytics.

## 7. Dependencies

- SPEC-PROD-005 (Expedition Completion & Summary): This spec extends it. SPEC-PROD-005 MUST be implemented first (already delivered in Sprint 26).
- SPEC-PROD-009 (CTA Button Standardization): Defines button hierarchy for the "View Summary" button placement on dashboard cards.
- Phase completion data from all 6 phases must be queryable in a single aggregation call.
- Checklist completion percentage from Phase 3 must be available (existing feature from Sprint 12+).
- Trip classification (domestic/international/intercontinental) from trip-classifier for destination-themed visual.
- Expedition phase routes must support re-entry for editing (existing capability, validated in SPEC-PROD-001 AC on phase revisit).

## 8. Vendor Independence

- This spec describes WHAT the feature does, not HOW it is implemented.
- Must NOT reference specific libraries, frameworks, or vendor products.
- Implementation details belong in the corresponding SPEC-ARCH document.

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-11 | product-owner | Initial draft for Sprint 28. Supersedes SPEC-PROD-007 (Sprint 27 draft). Adds edit capability, dashboard access, and readiness intelligence |
