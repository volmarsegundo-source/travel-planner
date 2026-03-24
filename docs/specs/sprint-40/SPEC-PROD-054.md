---
spec_id: SPEC-PROD-054
title: Dashboard "Meu Atlas" V2
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

# SPEC-PROD-054: Dashboard "Meu Atlas" V2

## 1. Problem Statement

The "Meu Atlas" dashboard (route `/expeditions`) is the authenticated home screen of the Atlas product. It is the first screen a returning user sees after login, and the hub from which all expedition management happens. The Dashboard Stitch export is one of the six official screens in `docs/design/SCREEN-INDEX.md`.

The current dashboard was iteratively built across Sprints 9-29 with legacy styling. It uses the V1 navigation shell, non-`atlas-*` color tokens, shadcn/ui Card primitives, and a phase progress indicator that predates the `AtlasPhaseProgress` component. It does not display the user's PA balance prominently, does not use `AtlasCard` for expedition listing, and has no design-system-compliant empty state.

With the V2 shell (SPEC-PROD-051) and all six wizard phases migrated (SPEC-PROD-052, SPEC-PROD-053), the dashboard is the final authenticated surface to complete the full V2 visual experience. Leaving it in V1 after the wizard phases are migrated would create a jarring re-entry experience every time a user returns to the hub.

## 2. User Story

As a @leisure-solo returning to Atlas to continue planning or start a new expedition,
I want the "Meu Atlas" dashboard to immediately show me my active expeditions in a visually clear, status-aware layout with easy access to my PA balance and quick actions,
so that I can pick up exactly where I left off without hunting for information or feeling like I'm using a different product than the one I just set up.

### Traveler Context

- **Pain point**: The current dashboard presents expeditions as a plain table/list that does not communicate progress, urgency, or next actions at a glance. Users with 3+ active expeditions report difficulty remembering which one needs attention. The PA balance is not visible on the dashboard — users must navigate to a separate page to check it.
- **Current workaround**: Power users bookmark direct phase URLs. Casual users spend the first seconds of each session re-orienting themselves.
- **Frequency**: Every authenticated session that does not start from a direct deep-link passes through this screen. It is the highest-frequency authenticated entry point in the product.

## 3. Acceptance Criteria

- [ ] AC-01: Given `NEXT_PUBLIC_DESIGN_V2=true`, when a user navigates to `/expeditions`, then the page renders within the `PhaseShellV2` chrome (from SPEC-PROD-051), but without a phase-specific sidebar — the sidebar shows only the Atlas logo, user PA balance, and navigation links.
- [ ] AC-02: Given the expedition list, when it renders, then each expedition is displayed as an `AtlasCard` containing: trip name (in `atlas-text-h3` scale), destination badge (using `AtlasBadge` with `atlas-primary-fixed` background), date range (in `atlas-text-small` + `atlas-on-surface-variant`), and an `AtlasPhaseProgress` bar showing the 6-phase completion state.
- [ ] AC-03: Given an expedition card, when the `AtlasPhaseProgress` bar renders, then completed phases are shown with `atlas-success` color, the active/next phase is shown with `atlas-secondary-container` (#fe932c) highlight, and locked/not-started phases use `atlas-surface-container-high`.
- [ ] AC-04: Given the dashboard, when a user has zero expeditions (empty state), then a full-width empty state component renders with: an illustration or icon using `atlas-on-tertiary-container` (#1c9a8e teal) color, a heading in `atlas-text-h2` scale, a short description in `atlas-text-body`, and a primary `AtlasButton` CTA labeled "Comecar uma Expedicao."
- [ ] AC-05: Given the expedition list, when it contains more than 6 expeditions, then a filter/sort control bar renders above the list with sort options (by date created, by last activity, by departure date) and a status filter (all, in progress, completed); controls use `AtlasChip` for filter pills.
- [ ] AC-06: Given the dashboard header area, when rendered, then the user's PA balance is displayed prominently using the same badge style as `AuthenticatedNavbarV2` (from SPEC-PROD-051), with a "Comprar PA" `AtlasButton` link adjacent to it.
- [ ] AC-07: Given the expedition list on a 375px screen (mobile), when rendered, then cards stack in a single column, the `AtlasPhaseProgress` bar is displayed as a compact horizontal strip (no phase labels, only color segments), and the filter/sort bar collapses to a single "Filtrar" button that opens a bottom sheet.
- [ ] AC-08: Given the expedition list on a 768px screen (tablet), when rendered, then cards render in a 2-column grid.
- [ ] AC-09: Given the expedition list on >= 1024px (desktop), when rendered, then cards render in a 3-column grid with the sidebar visible.
- [ ] AC-10: Given `NEXT_PUBLIC_DESIGN_V2=false`, when the user navigates to `/expeditions`, then zero visual change from the current V1 dashboard — full regression safety.

## 4. Scope

### In Scope

- V2 visual styling of the expedition list using `AtlasCard` and `AtlasPhaseProgress`
- V2 empty state component with CTA
- V2 filter/sort controls using `AtlasChip`
- PA balance display and "Comprar PA" link in the dashboard header area
- Responsive grid layout (1-col mobile / 2-col tablet / 3-col desktop)
- All changes gated behind `NEXT_PUBLIC_DESIGN_V2` feature flag
- Unit tests at >= 80% coverage for all new V2 dashboard components
- E2E: flag ON shows V2; flag OFF shows V1 with zero regressions

### Out of Scope

- Trip deletion, duplication, or archiving flows (existing V1 functionality unchanged)
- "Shareable summary link" feature (SPEC-PROD-014, deferred Sprint 29)
- Real-time activity feed or notification inbox
- Statistics/analytics panels on the dashboard (separate feature)
- Admin dashboard (SPEC-PROD-042/044, separate surface)
- Gamification rank display beyond PA balance (rank tier badge — future sprint)
- Dark mode

## 5. Constraints

### Security

- The expedition list must be fetched using the authenticated session's userId — BOLA guard applies; no trip belonging to another user may appear.
- PA balance displayed must be fetched server-side using the authenticated session; must not be stored in unprotected client-side state.
- The "max 20 active trips" business rule (defined in US-001 AC-007) must continue to be enforced — the V2 CTA to create a new expedition must be disabled (with an informative message) when the limit is reached.

### Accessibility

- WCAG 2.1 AA minimum across all V2 dashboard components.
- Each expedition `AtlasCard` must have a meaningful accessible name that includes the trip name and destination (not just a generic "card" role).
- The `AtlasPhaseProgress` bar in each card must expose progress information to screen readers (e.g., "3 of 6 phases complete").
- The empty state illustration must have a descriptive `alt` text.
- Filter/sort chips must communicate their selected state via `aria-pressed` or `aria-selected`.
- On mobile, the bottom sheet filter panel must trap focus while open.

### Performance

- The expedition list must render within the existing page load budget — no new sequential server round-trips introduced.
- The filter/sort functionality must operate client-side on the already-loaded expedition list (no additional API calls per filter change) for lists up to 20 items (the max active trip limit).
- `AtlasPhaseProgress` within cards must not trigger individual API calls per expedition — progress data must be included in the expedition list fetch.

### Architectural Boundaries

- This spec is technology-agnostic — it defines WHAT the dashboard looks like and WHAT it does, not HOW it is coded.
- Must not alter the V1 dashboard component tree or break existing tests.
- Must use only `atlas-*` tokens — no inline standard Tailwind color classes in V2 code paths.
- Must not change the expedition data model or the `/expeditions` API contract.
- The `/dashboard` route redirect to `/expeditions` (established Sprint 29) must remain in place.

## 6. Success Metrics

- Zero V1 regressions: all existing dashboard E2E tests pass with `NEXT_PUBLIC_DESIGN_V2=false`.
- axe-core: zero AA violations on V2 dashboard components.
- UX Designer approves fidelity to the Dashboard Stitch export before merge.
- Test coverage >= 80% on all new V2 dashboard component files.
- Internal usability review: returning users can identify their most recently active expedition and its next recommended action within 5 seconds (time-to-orient metric).

## 7. Dependencies

- SPEC-PROD-046 (Sprint 38 Design System Foundation): COMPLETE
- SPEC-PROD-047 (Sprint 38 Component Library v1 — AtlasCard, AtlasPhaseProgress, AtlasChip, AtlasButton, AtlasBadge): COMPLETE
- SPEC-PROD-051 (Sprint 40 Phase Shell V2): hard dependency — the V2 dashboard uses the same `PhaseShellV2` chrome
- SPEC-PROD-052 and SPEC-PROD-053: parallel — can develop concurrently; same sprint
- Dashboard Stitch export: `docs/design/SCREEN-INDEX.md` (official screen, export available)
- Gamification PA balance API (Sprint 35-36, Wave 1): COMPLETE
- Expedition list API (`/expeditions` route, existing): COMPLETE

## 8. Vendor Independence

- This spec describes WHAT the dashboard looks like and WHAT it does — not HOW it is implemented.
- Must NOT reference Next.js, React, Tailwind, or specific library APIs.
- Implementation details belong in the corresponding SPEC-ARCH document.

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-24 | product-owner | Initial draft — Sprint 40 (originally Sprint 42 in roadmap; consolidated into single visual migration sprint) |
