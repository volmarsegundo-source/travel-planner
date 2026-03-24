---
spec_id: SPEC-PROD-051
title: Phase Shell V2 + Authenticated Nav V2
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

# SPEC-PROD-051: Phase Shell V2 + Authenticated Nav V2

## 1. Problem Statement

As of Sprint 39, the Atlas V2 design system is visible at the top-of-funnel (Landing Page, Login Page). However, once a user authenticates and enters the expedition wizard, the design reverts to the legacy V1 shell: a generic top bar, no sidebar, and a progress indicator that uses neither the `atlas-*` color tokens nor the `AtlasPhaseProgress` component built in Sprint 38. The visual contract established by the Landing and Login pages is immediately broken.

This spec defines the structural layer that every authenticated phase screen will inherit: a new `PhaseShellV2` layout component and an updated `AuthenticatedNavbarV2`. Together they form the chrome around every wizard phase, the expedition summary, and the dashboard when `NEXT_PUBLIC_DESIGN_V2=true`. All subsequent phase-migration specs (SPEC-PROD-052, SPEC-PROD-053, SPEC-PROD-054) depend on this shell being in place.

Scope is limited to the layout chrome. Phase content is out of scope for this spec.

## 2. User Story

As a @leisure-solo who just registered via the new Landing and Login pages,
I want the authenticated area of Atlas to share the same visual language as the pages that convinced me to sign up,
so that my first expedition setup feels like a premium, coherent product — not a bait-and-switch.

### Traveler Context

- **Pain point**: Entering the wizard after the new landing page feels like opening a beautifully packaged box and finding generic packaging inside. The tone mismatch undermines trust during the highest-friction moment (wizard setup).
- **Current workaround**: There is none — users accept the inconsistency because they have no alternative.
- **Frequency**: Every authenticated session begins with this chrome. Every wizard phase is wrapped by it. It is the highest-exposure UI surface in the product for logged-in users.

## 3. Acceptance Criteria

- [ ] AC-01: Given `NEXT_PUBLIC_DESIGN_V2=true`, when a user navigates to any wizard phase route (`/expedition/[tripId]/phase/[n]`), then the `PhaseShellV2` layout renders in place of the legacy shell.
- [ ] AC-02: Given `PhaseShellV2`, when it renders, then a left sidebar is visible on screens >= 1024px wide containing: the Atlas logo, `AtlasPhaseProgress` component showing all 6 active phases, and a bottom section with the user PA balance.
- [ ] AC-03: Given `PhaseShellV2`, when it renders, then a breadcrumb trail is visible at the top of the content area showing at minimum: "Meu Atlas > [Trip name] > [Phase name]", with each segment being a navigable link.
- [ ] AC-04: Given `PhaseShellV2`, when it renders, then the current phase title is displayed as a heading (`atlas-text-h1` token scale) directly below the breadcrumb.
- [ ] AC-05: Given `AuthenticatedNavbarV2` and `NEXT_PUBLIC_DESIGN_V2=true`, when a logged-in user views any authenticated route, then the navbar displays: Atlas logo (left), PA balance badge using `atlas-secondary-container` (#fe932c) color (center-right), user avatar with initials fallback (right), and a language switcher.
- [ ] AC-06: Given the PA balance badge in `AuthenticatedNavbarV2`, when clicked, then it navigates to `/atlas/purchases` (the PA purchase page).
- [ ] AC-07: Given the user avatar/menu in `AuthenticatedNavbarV2`, when clicked, then a dropdown renders with: profile link, settings link, and a sign-out action — matching the existing V1 `UserMenu` behavior.
- [ ] AC-08: Given `PhaseShellV2` on screens < 1024px (mobile/tablet), when it renders, then the sidebar is hidden and replaced by a horizontal phase progress indicator at the top of the content area (below the navbar), scrollable horizontally if needed.
- [ ] AC-09: Given `AuthenticatedNavbarV2` on screens < 768px, when it renders, then the PA balance badge label text is hidden and only the icon + numeric value is shown to preserve space.
- [ ] AC-10: Given `NEXT_PUBLIC_DESIGN_V2=false`, when any authenticated route renders, then the legacy `AuthenticatedNavbar` and legacy phase shell are used — zero visual change for the current production experience.
- [ ] AC-11: Given `PhaseShellV2`, when the `AtlasPhaseProgress` sidebar component renders, then completed phases are visually distinct from the active phase and from not-yet-started phases, using `atlas-success`, `atlas-secondary-container`, and `atlas-surface-container-high` tokens respectively.
- [ ] AC-12: Given any authenticated route under `NEXT_PUBLIC_DESIGN_V2=true`, when the page is audited with axe-core, then zero accessibility violations are reported at the WCAG 2.1 AA level.

## 4. Scope

### In Scope

- `PhaseShellV2` layout component: sidebar (desktop) + responsive top-bar (mobile/tablet)
- `AuthenticatedNavbarV2`: PA badge, user menu, language switcher
- `DesignBranch` conditional rendering integrated at the app-shell layout level for all authenticated routes
- Breadcrumb rendered from current route context (trip name + phase name)
- Phase title heading rendered from phase configuration
- Responsive behavior at 375px, 768px, 1024px, 1440px breakpoints
- Unit tests for `PhaseShellV2` and `AuthenticatedNavbarV2` at >= 80% coverage
- E2E: flag ON renders V2 shell; flag OFF renders V1 shell (no regression)

### Out of Scope

- Phase content (forms, wizards, AI output) — covered by SPEC-PROD-052 and SPEC-PROD-053
- Dashboard layout migration — covered by SPEC-PROD-054
- Expedition Summary layout migration — covered by SPEC-PROD-053
- Notification center (no current spec; future sprint)
- Dark mode
- Animations or transition effects between phases (deferred)
- Mobile bottom-tab navigation (not in current roadmap)

## 5. Constraints

### Security

- The PA balance displayed in the navbar must be fetched server-side or via a server action — it must never be read from client-side localStorage or unprotected cookies.
- User avatar/initials must not expose the user's full name in the DOM in a way that leaks PII to unauthenticated parties (server component rendering boundary must be respected).
- Navigation links in the breadcrumb and sidebar must enforce the same auth guard as the current `(app)` route group — no bypass.
- BOLA: the trip name displayed in the breadcrumb must be fetched using the authenticated session's userId as a filter — never trust `tripId` from the URL alone.

### Accessibility

- WCAG 2.1 AA minimum across all shell components.
- The sidebar `AtlasPhaseProgress` must expose phase names and completion status to screen readers via `aria-label` or `aria-describedby`.
- The breadcrumb must use a `<nav aria-label="breadcrumb">` wrapper with structured `<ol>` semantics.
- The user menu dropdown must be keyboard-navigable (Tab, Enter, Escape to close) and trap focus while open.
- Color contrast: the PA badge (`atlas-secondary-container` #fe932c background with `atlas-primary` #040d1b text) must meet the 4.5:1 ratio requirement for normal text — this combination is approved in the design system.
- `prefers-reduced-motion`: no animated transitions in the shell if the user has this preference set.

### Performance

- The shell layout is a Server Component wrapper; only interactive sub-components (user menu dropdown, mobile phase progress toggle) are Client Components.
- Initial shell render (TTFB to LCP) must not add more than 100ms to existing authenticated page load times.
- The PA balance fetch must be co-located with the existing session fetch — no additional round trip.
- No new third-party dependencies introduced by this spec.

### Architectural Boundaries

- This spec describes WHAT the shell looks like and HOW it behaves — not HOW it is implemented in code.
- Must use `AtlasPhaseProgress`, `AtlasButton`, `AtlasCard`, and other Sprint-38 components from `src/components/ui/` — must not re-implement them inline.
- Must integrate with the existing `DesignBranch` pattern established in Sprints 38-39 — must not introduce a second feature-flag branching mechanism.
- Must not alter the routing structure of the `(app)` route group.
- Must not duplicate the `UserMenu` business logic — it should reuse or extend the existing component.

## 6. Success Metrics

- Zero authenticated-area visual regressions (V1 flag-off) measured by Playwright screenshot baseline.
- axe-core: zero AA violations on the V2 shell in any phase route.
- Shell render adds <= 100ms to authenticated page LCP (measured in Vercel Analytics, staging environment).
- UX Designer approves fidelity to design system tokens before merge.

## 7. Dependencies

- SPEC-PROD-046 (Sprint 38 Design System Foundation) — tokens, fonts, ESLint rules: COMPLETE
- SPEC-PROD-047 (Sprint 38 Component Library v1) — `AtlasPhaseProgress`, `AtlasButton`, `AtlasCard`: COMPLETE
- SPEC-PROD-048 (Sprint 39 Landing Page V2) — `DesignBranch` pattern established: IN PROGRESS
- SPEC-PROD-049 (Sprint 39 Login Page V2) — `AuthenticatedNavbarV2` design language consistency: IN PROGRESS
- Gamification PA balance API (Sprint 35-36 Wave 1 & 2): COMPLETE
- Phase configuration (`src/lib/engines/phase-config.ts`, confirmed v0.23.0+): COMPLETE

## 8. Vendor Independence

- This spec describes WHAT the shell looks like and WHAT it does — not HOW it is implemented.
- Must NOT reference Next.js layouts, React Server Components, Tailwind classes, or specific library APIs.
- Implementation details belong in the corresponding SPEC-ARCH document.

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-24 | product-owner | Initial draft — Sprint 40 |
