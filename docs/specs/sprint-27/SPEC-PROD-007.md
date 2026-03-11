# SPEC-PROD-007: Complete Journey Summary Enhancement

**Version**: 1.0.0
**Status**: Draft
**Author**: product-owner
**Reviewers**: [tech-lead, ux-designer, architect]
**Created**: 2026-03-11
**Last Updated**: 2026-03-11

---

## 1. Problem Statement

SPEC-PROD-005 (Expedition Completion & Summary) defines the summary screen shown after completing all 6 phases. During Sprint 26/27 manual testing (REC-009), testers reported that while the summary data was present, it lacked two critical qualities:

1. **No visual richness**: The summary is text-only. Competing travel apps (TripIt, Wanderlog, Google Travel) show destination photos, maps, and visual highlights in their trip summaries. A text-only summary for a trip to Paris feels flat compared to the planning effort invested.

2. **No actionable next steps**: After completing the expedition, users see their data but receive no guidance on what to do next. There is no prompt to share their plan, no reminder about checklist items still pending, no suggestion to review transport bookings. The summary is a dead end rather than a launchpad.

3. **Missing trip duration and countdown**: Testers expected to see "X days until your trip" or "Your trip is in Y days" -- a basic but emotionally resonant detail that builds anticipation.

This spec enhances SPEC-PROD-005 by adding visual enrichment and actionable intelligence to the summary screen. It does NOT replace SPEC-PROD-005; it extends it.

**Evidence**: REC-009 from v0.19.0 manual testing. Stakeholder feedback requesting a "more polished" summary experience.

**Affected users**: All personas who complete an expedition. Primarily @leisure-solo and @leisure-family who are more emotionally invested in the visual experience.

## 2. User Story

As a traveler who has completed all 6 phases of expedition planning,
I want to see a visually engaging summary that includes a trip countdown, completion status highlights, and clear next steps,
so that I feel confident my trip is well-planned, excited about the upcoming journey, and guided toward any remaining actions I should take.

### Traveler Context

- **Pain point**: After investing time in 6 phases of planning, the summary should be the "payoff moment" -- a rewarding, comprehensive view that makes the user feel their planning effort was worthwhile. A text-only data dump does not deliver that emotional satisfaction. Additionally, users finish the expedition but may have incomplete checklist items or missing transport bookings, and the summary does not flag these gaps.
- **Current workaround**: Users manually check each phase to verify completion status. They use external calendar apps for trip countdowns. There is no integrated "readiness check."
- **Frequency**: Once per completed expedition, at the highest-value moment in the user journey.

## 3. Acceptance Criteria

### Trip Countdown

- [ ] AC-001: The summary screen MUST display a trip countdown showing the number of days until the trip start date. Format: "X days until your trip" / "X dias para sua viagem". If the trip has already started, display "Trip in progress" / "Viagem em andamento". If the trip has ended, display "Trip completed on [end date]" / "Viagem concluida em [data fim]".
- [ ] AC-002: The countdown MUST be visually prominent -- positioned near the top of the summary, with typography and styling that conveys excitement and anticipation.

### Completion Status Highlights

- [ ] AC-003: The summary MUST display a "trip readiness" indicator that shows an overall preparation percentage based on: (a) number of phases completed (weight: 40%), (b) checklist completion percentage from Phase 3 (weight: 30%), (c) whether transport is booked in Phase 4 (weight: 15%), (d) whether accommodation is booked in Phase 4 (weight: 15%).
- [ ] AC-004: Each of the 6 phase sections in the summary MUST display a completion status icon/badge: "complete" (all data filled), "partial" (some data, some missing), or "not started" (no data). The specific visual treatment is defined in SPEC-UX.
- [ ] AC-005: If any phase section has status "partial" or "not started", the section MUST display a brief call-to-action: "Complete this section" / "Completar esta secao" with a link to the relevant phase.

### Actionable Next Steps

- [ ] AC-006: The summary MUST include a "Next Steps" section at the bottom that dynamically generates 1-3 suggested actions based on the trip's current state. Examples: "Complete your checklist (5 of 12 items done)", "Add accommodation details for your stay", "Your trip is in 15 days -- review your itinerary". The exact logic for which suggestions appear is implementation-defined, but MUST prioritize incomplete or high-impact items.
- [ ] AC-007: Each suggested action in the "Next Steps" section MUST be clickable and navigate directly to the relevant screen (phase, checklist, transport form, etc.).

### Visual Enrichment

- [ ] AC-008: The summary header area MUST display a destination-relevant visual element. This can be: (a) a static color gradient themed to the destination's country/region, or (b) an icon or illustration representing the destination type (beach, city, mountain, etc. based on trip classification). Actual photographs are OUT OF SCOPE (licensing complexity).
- [ ] AC-009: The summary MUST use a card-based layout for the 6 phase sections rather than a flat text list. Each phase card MUST have: the phase name, its icon (matching the expedition progress bar icons), the completion status, and the key data summary.

### Localization

- [ ] AC-010: All new text introduced by this spec (countdown, readiness indicator labels, next steps suggestions, completion status labels) MUST be localized for PT-BR and EN.

## 4. Scope

### In Scope

- Trip countdown display (days until trip)
- Trip readiness percentage indicator
- Per-phase completion status badges
- Calls-to-action for incomplete phases
- Dynamic "Next Steps" suggestions (1-3 items)
- Card-based visual layout for phase sections
- Destination-themed header visual (gradient/icon, no photos)
- Localization of all new UI text

### Out of Scope

- Destination photographs (licensing and CDN complexity -- future feature)
- Weather forecast integration (requires third-party API)
- PDF export or print-optimized view (deferred)
- Social sharing functionality (deferred)
- Email summary send (requires email provider)
- Map embed in the summary
- Animated transitions or confetti effects beyond SPEC-PROD-005 celebration

## 5. Constraints (MANDATORY)

### Security

- All data displayed MUST be server-fetched and scoped to the authenticated user's trip (BOLA prevention, consistent with SPEC-PROD-005).
- The trip readiness calculation MUST happen server-side. The client MUST NOT compute readiness from local state.
- No new PII is introduced by this spec.

### Accessibility

- WCAG 2.1 AA compliance minimum.
- The trip countdown MUST be readable by screen readers with a clear label (e.g., "Trip countdown: 15 days remaining").
- The readiness percentage MUST be conveyed to screen readers as a numeric value, not only visually (e.g., "Trip readiness: 78 percent").
- Phase completion status icons MUST have accessible text alternatives ("Phase 1: Complete", "Phase 3: Partially complete").
- Card-based layout MUST maintain logical reading order for screen readers (Phase 1 through Phase 6, top to bottom).
- Destination-themed gradient MUST NOT convey meaning through color alone; any information also conveyed through text.

### Performance

- The summary screen (with enhancements) MUST load in under 2 seconds (consistent with SPEC-PROD-005 performance budget).
- Trip readiness calculation MUST complete in under 500ms server-side.
- No additional AI calls are required by this spec. All data is already persisted from phases.

### Architectural Boundaries

- This spec enhances SPEC-PROD-005. It does NOT replace it. All SPEC-PROD-005 acceptance criteria remain in force.
- This spec does NOT define the visual design details (colors, typography, card dimensions). That belongs to SPEC-UX.
- This spec does NOT define the API shape for the readiness calculation. That belongs to SPEC-ARCH.
- The "Next Steps" suggestion logic is implementation-defined within the constraints of this spec. A dedicated AI call for suggestions is NOT justified.

## 6. Success Metrics

- **Summary dwell time**: >= 50% increase in average time spent on the summary screen compared to SPEC-PROD-005 baseline (indicating users find more value in the enhanced view). Measured by analytics.
- **Next Steps click-through**: >= 30% of users who view the summary click at least one "Next Step" suggestion. Measured by analytics.
- **Readiness improvement**: >= 20% of users who see "partial" status on a phase return to complete it (driven by the call-to-action). Measured by phase completion rate change.
- **NPS contribution**: Summary screen satisfaction contributes positively to overall NPS. Measured by in-app feedback survey.

## 7. Dependencies

- SPEC-PROD-005 (Expedition Completion & Summary): This spec extends it. SPEC-PROD-005 MUST be implemented first.
- Phase completion data from all 6 phases must be queryable in a single aggregation call (defined in SPEC-PROD-005 SPEC-ARCH).
- Checklist completion percentage from Phase 3 must be available (existing feature from Sprint 12+).
- Trip classification (domestic/international/intercontinental) from trip-classifier for destination-themed visual.

## 8. Vendor Independence

- This spec describes WHAT the feature does, not HOW it is implemented.
- Must NOT reference specific libraries, frameworks, or vendor products.
- Implementation details belong in the corresponding SPEC-ARCH document.

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-11 | product-owner | Initial draft for Sprint 27. Enhances SPEC-PROD-005 based on REC-009 and stakeholder feedback |
