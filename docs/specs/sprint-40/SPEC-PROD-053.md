---
spec_id: SPEC-PROD-053
title: Wizard Phases 4-6 V2 + Expedition Summary V2
version: 1.0.0
status: Draft
sprint: 40
owner: product-owner
created: 2026-03-24
updated: 2026-03-24
feature_flag: NEXT_PUBLIC_DESIGN_V2
token_reference: docs/specs/sprint-38/UX-PARECER-DESIGN-SYSTEM.md
screen_index: docs/design/SCREEN-INDEX.md
---

# SPEC-PROD-053: Wizard Phases 4-6 V2 + Expedition Summary V2

## 1. Problem Statement

With Phases 1-3 migrated (SPEC-PROD-052) and the V2 shell in place (SPEC-PROD-051), the back half of the wizard remains visually inconsistent. Phases 4-6 and the Expedition Summary are the deepest, most content-rich parts of the product — they are where the AI-generated value materializes for the traveler.

Phase 4 ("A Logistica") uses a tabbed-to-steps layout introduced in Sprint 24 with no design system tokens. Phase 5 ("Guia do Destino") displays AI-generated destination content in a plain list layout that does not reflect the premium, information-dense feel of the Stitch "Roteiro" export. Phase 6 ("O Roteiro") is the itinerary — the crown jewel of the product — and its Stitch export is one of the six official screens. The Expedition Summary consolidates all six phases into a single review view; it was built in Sprint 26 and has not been updated since.

No Stitch exports exist for Phase 4 or Phase 5. Phase 6 and the Expedition Summary use the "Roteiro" Stitch export as the design authority.

## 2. User Stories

### Phase 4 — "A Logistica" (Transport, Accommodation, Mobility)

As a @leisure-family organizing flights, hotels, and local transport for a multi-city trip,
I want the logistics phase to present each category in a clear, step-by-step flow with visual confirmation of what I have added,
so that I feel in control of the complex logistics without being overwhelmed.

### Phase 5 — "Guia do Destino" (Destination Guide)

As a @leisure-solo exploring an unfamiliar destination,
I want the AI destination guide to be presented in a visually rich, scannable bento-grid layout,
so that I can absorb key destination knowledge quickly without reading walls of text.

### Phase 6 — "O Roteiro" (Itinerary)

As a @bleisure traveler reviewing my AI-generated day-by-day itinerary,
I want the itinerary to feel like a real travel document — structured, beautiful, and easy to navigate —
so that I can share it confidently with travel companions and use it on the road.

### Expedition Summary

As a @group-organizer who has completed all phases,
I want the expedition summary to give me a consolidated overview of every decision made —
transport, accommodation, checklist completion, itinerary highlights — in a single scrollable view,
so that I can review the full plan and identify anything that needs adjustment before the trip.

### Traveler Context

- **Pain point**: The current Phase 6 itinerary output is a long scrollable list of text blocks with minimal visual structure. Users report difficulty scanning day-by-day schedules. The destination guide (Phase 5) is similarly text-heavy. Both undermine the "wow moment" that should come from AI-generated content.
- **Current workaround**: Power users copy the itinerary text into external tools (Notion, Google Docs) to add their own structure.
- **Frequency**: Phase 6 is the terminal phase of every completed expedition. The itinerary is the primary artifact users return to repeatedly. The Expedition Summary is viewed at least once per completed expedition.

## 3. Acceptance Criteria

### Phase 4 — "A Logistica"

- [ ] AC-01: Given `NEXT_PUBLIC_DESIGN_V2=true`, when a user opens Phase 4, then the 3-step layout (Transport, Accommodation, Mobility) renders each step as a card using `AtlasCard` with `atlas-surface-container-lowest` background and `atlas-outline-variant` border.
- [ ] AC-02: Given Phase 4 Transport step, when a transport segment is saved, then it is displayed as a compact summary row using `atlas-secondary-fixed` background, `atlas-on-secondary-fixed` text, with an edit icon button using `atlas-on-surface-variant` color.
- [ ] AC-03: Given Phase 4 Accommodation step, when an accommodation record is saved, then it renders as a card row with the property name in `atlas-text-body-medium` weight, check-in/check-out dates in `atlas-text-small` scale, and the booking code (if present) masked as `****` with a reveal toggle.
- [ ] AC-04: Given Phase 4 Mobility step, when mobility options are selected, then selected options display as `AtlasChip` with `atlas-secondary-container` fill; unselected options use `atlas-surface-container-high`.
- [ ] AC-05: Given `NEXT_PUBLIC_DESIGN_V2=false`, when Phase 4 renders, then zero visual change from V1.
- [ ] AC-06: Given Phase 4 on a 375px screen, when rendered, then each step is presented in full-width single-column layout with all touch targets >= 44px.

### Phase 5 — "Guia do Destino"

- [ ] AC-07: Given `NEXT_PUBLIC_DESIGN_V2=true`, when a user opens Phase 5 and the AI guide has loaded, then the content is presented in a bento-grid layout: one large featured card (destination overview, full-width on mobile) and up to 4 category cards (weather, culture, tips, safety) in a 2x2 grid on desktop.
- [ ] AC-08: Given Phase 5 bento cards, when rendered, then each card uses `AtlasCard` with a category icon using `atlas-on-tertiary-container` (#1c9a8e teal) color, a category label in `atlas-text-caption` scale, and body content in `atlas-text-body` scale.
- [ ] AC-09: Given Phase 5 while AI content is loading, then a skeleton bento-grid using `atlas-surface-container-high` animated placeholders matching the expected card sizes is displayed.
- [ ] AC-10: Given Phase 5 on a 768px screen (tablet), when rendered, then the bento grid collapses to 1-column (stacked cards) and each card remains full-width.
- [ ] AC-11: Given `NEXT_PUBLIC_DESIGN_V2=false`, when Phase 5 renders, then zero visual change from V1.
- [ ] AC-12: Given Phase 5 bento cards, when a user navigates using keyboard only, then focus moves sequentially through cards in DOM order and each card's expand/collapse toggle is operable by keyboard.

### Phase 6 — "O Roteiro"

- [ ] AC-13: Given `NEXT_PUBLIC_DESIGN_V2=true`, when a user opens Phase 6, then the AI itinerary renders as a day-by-day vertical timeline: each day has a date header in `atlas-text-h3` scale with `atlas-secondary-container` (#fe932c) left-border accent, and activities listed below as timeline nodes.
- [ ] AC-14: Given a Phase 6 timeline node (activity), when rendered, then it displays: time slot in `atlas-text-small` + `atlas-on-surface-variant` color, activity name in `atlas-text-body-medium`, location tag as `AtlasChip` with `atlas-primary-fixed` background.
- [ ] AC-15: Given Phase 6 while AI itinerary is generating (streaming), then each day block appears progressively as it streams — not a full-page blank state followed by a dump of content.
- [ ] AC-16: Given Phase 6 itinerary fully loaded, when a user taps/clicks on an activity, then a detail panel or modal renders with the full activity description in `atlas-text-body` scale.
- [ ] AC-17: Given `NEXT_PUBLIC_DESIGN_V2=false`, when Phase 6 renders, then zero visual change from V1.
- [ ] AC-18: Given Phase 6 on a 375px screen, when the itinerary renders, then the timeline is single-column and the day header is sticky within its scroll context (does not disappear when scrolling that day's activities).

### Expedition Summary

- [ ] AC-19: Given `NEXT_PUBLIC_DESIGN_V2=true`, when a user navigates to the Expedition Summary, then each of the 6 phases is represented by a summary section card using `AtlasCard`, with the phase name as a heading, an `AtlasBadge` indicating completion status, and an "Edit" link back to the respective phase.
- [ ] AC-20: Given the Expedition Summary, when rendered, then the top of the page displays a hero summary bar showing: trip name, origin, destination, date range, total passengers — using `atlas-primary-container` (#1a2332) background and `atlas-on-primary` text.
- [ ] AC-21: Given any of Phases 4-6 or the Expedition Summary under `NEXT_PUBLIC_DESIGN_V2=true`, when audited with axe-core at WCAG 2.1 AA, then zero violations are reported.

## 4. Scope

### In Scope

- V2 visual styling of Phase 4: 3-step logistics layout, transport/accommodation rows, mobility chips
- V2 visual styling of Phase 5: bento-grid destination guide, category cards, AI loading skeleton
- V2 visual styling of Phase 6: day-by-day timeline, activity nodes, streaming progressive render
- V2 visual styling of Expedition Summary: 6-phase section cards, hero summary bar
- Application of `AtlasCard`, `AtlasChip`, `AtlasBadge`, `AtlasButton` from Sprint 38 component library
- Responsive behavior at 375 / 768 / 1024 / 1440px breakpoints
- All changes gated behind `NEXT_PUBLIC_DESIGN_V2` feature flag
- Unit tests for each V2 component at >= 80% coverage
- E2E: flag ON shows V2; flag OFF shows V1 with zero regressions

### Out of Scope

- Business logic: booking code encryption/decryption, AI call parameters, PA cost deduction for AI generation
- Phase 4 Stitch export creation (no official export; design system tokens are the authority)
- Phase 5 Stitch export creation (no official export; design system tokens are the authority)
- Map integration changes (Phase 4 / Summary map pins remain as-is)
- Itinerary export to PDF or shareable link (SPEC-PROD-014, deferred Sprint 29)
- Phases 1-3 — covered by SPEC-PROD-052
- Phase Shell / Navigation — covered by SPEC-PROD-051
- Dashboard — covered by SPEC-PROD-054

## 5. Constraints

### Security

- Booking codes (transport, accommodation) in Phase 4 must remain masked on render; the reveal toggle must not expose the decrypted value in the DOM or in logs.
- The Expedition Summary fetches data across all phases — BOLA guard applies: all data must be fetched using the authenticated session's userId filter, never trusting only the `tripId` URL parameter.
- AI-generated content in Phase 5 and Phase 6 is user-specific; must not be cached in shared server-side caches in a way that could expose one user's data to another.

### Accessibility

- WCAG 2.1 AA minimum across all V2 phase and summary components.
- Phase 6 timeline structure must use semantic HTML — each day group should be a `<section>` with an accessible heading, not just visual styling.
- Activity detail modals/panels in Phase 6 must trap focus while open and restore focus to the triggering element when closed.
- Bento-grid cards in Phase 5 must be navigable in a logical reading order — not dictated by CSS grid visual placement alone.
- `prefers-reduced-motion`: Phase 6 streaming progressive render must not use animations that would violate this preference.
- Color contrast: all text on `atlas-secondary-container` (#fe932c) backgrounds must use `atlas-primary` (#040d1b) text — the approved 4.5:1 compliant pair.

### Performance

- Phase 6 streaming: the existing streaming architecture (Sprint 18-19) must be preserved; V2 styling must not block or delay the stream.
- No new AI provider calls introduced by this spec; only visual layer changes.
- Bento-grid images in Phase 5 (if destination images are used) must be lazy-loaded.
- Expedition Summary aggregation query performance must not regress from the current `expedition-summary.service.ts` baseline.

### Architectural Boundaries

- This spec is technology-agnostic — it defines WHAT each phase looks like, not HOW it is coded.
- Must not alter the V1 component tree or break existing tests for V1 components.
- Must use only `atlas-*` tokens — no inline `slate-*`, `amber-*`, or `green-*` Tailwind classes in V2 code paths.
- Must preserve the existing booking code masking logic — visual changes only, no re-encryption or re-decryption.

## 6. Success Metrics

- Zero V1 regressions: all existing Phase 4-6 and Summary E2E tests pass with `NEXT_PUBLIC_DESIGN_V2=false`.
- axe-core: zero AA violations on V2 phase and summary components.
- UX Designer approves Phase 6 visual fidelity against Roteiro Stitch export; approves Phases 4-5 and Summary against token system inline.
- Test coverage >= 80% on all new V2 component files.
- Qualitative: Phase 6 itinerary "wow moment" validated in internal usability review before sprint close.

## 7. Dependencies

- SPEC-PROD-046 (Sprint 38 Design System Foundation): COMPLETE
- SPEC-PROD-047 (Sprint 38 Component Library v1): COMPLETE
- SPEC-PROD-051 (Sprint 40 Phase Shell V2): hard dependency — must complete before phases can be integrated
- SPEC-PROD-052 (Sprint 40 Phases 1-3 V2): parallel — can develop concurrently on separate track
- Phase 6 ("O Roteiro") Stitch export: `docs/design/stitch-exports/` (listed in SCREEN-INDEX.md as "Roteiro/Itinerary")
- Expedition Summary service: `src/server/services/expedition-summary.service.ts` (Sprint 26, stable)
- AI streaming infrastructure: Sprint 18-19, stable
- Phase 4 / Phase 5: no Stitch exports — UX Designer inline review required before implementation begins

## 8. Vendor Independence

- This spec describes WHAT each phase and the summary look like and WHAT they do — not HOW they are implemented.
- Must NOT reference Next.js, React, Tailwind, or specific library APIs.
- Implementation details belong in the corresponding SPEC-ARCH document.

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-24 | product-owner | Initial draft — Sprint 40 (consolidated from original Sprint 40+41 plan) |
