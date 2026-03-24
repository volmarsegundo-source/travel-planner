---
spec_id: SPEC-PROD-052
title: Wizard Phases 1-3 V2
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

# SPEC-PROD-052: Wizard Phases 1-3 V2

## 1. Problem Statement

Phases 1, 2, and 3 of the Atlas expedition wizard were built iteratively across Sprints 6-25 using legacy Tailwind classes (slate, amber, green), shadcn/ui primitives, and no adherence to `atlas-*` design tokens. With the V2 shell in place (SPEC-PROD-051), the chrome is correct but the content inside each phase still uses the old visual language.

These three phases cover the highest-stakes user journey moments: creating a trip (Phase 1), defining travel identity and passengers (Phase 2), and completing the document checklist (Phase 3). Design inconsistency at these steps causes cognitive dissonance and undermines the premium brand impression established by the Landing and Login pages.

Stitch exports exist for Phase 1 ("A Inspiracao" / "O Chamado" in code) and Phase 3 ("O Preparo"). Phase 2 ("O Explorador") does not yet have a Stitch export; its V2 must be designed inline using design system tokens, following the same visual grammar established by the exported screens.

This spec covers the V2 visual migration of these three phases. Business logic (form validation, AI calls, gamification point awards) is unchanged and out of scope.

## 2. User Stories

### Phase 1 — "O Chamado" (Trip Creation)

As a @leisure-solo starting a new expedition,
I want the trip creation form to feel intentional and exciting — not a generic web form,
so that from the very first step I believe this planning experience will be different.

### Phase 2 — "O Explorador" (Travel Style + Passengers)

As a @leisure-family configuring passenger details and travel preferences,
I want the selection UI to be visually clear, accessible, and consistent with the rest of the V2 design,
so that I can quickly express who I am as a traveler without decoding a cluttered interface.

### Phase 3 — "O Preparo" (Document Checklist)

As a @business-traveler preparing documentation before an international trip,
I want the document checklist to have a clean, scannable layout with clear completion states,
so that I can confidently verify I have everything I need without missing an item.

### Traveler Context

- **Pain point**: The current wizard phases use inconsistent typography, gray-on-gray color combinations with insufficient contrast, and checkbox/chip components that do not match the design system. Users have commented in usability sessions that the forms feel "unfinished."
- **Current workaround**: Users push through because the functionality works. But qualitative feedback shows the form experience is a friction point that reduces confidence in the product's quality.
- **Frequency**: Every user who creates a trip passes through all 3 phases. This is the highest-frequency authenticated user journey in the product.

## 3. Acceptance Criteria

### Phase 1 — "O Chamado"

- [ ] AC-01: Given `NEXT_PUBLIC_DESIGN_V2=true`, when a user opens Phase 1 (trip creation), then all text inputs use `AtlasInput` with the correct label, placeholder, helper text, and error state tokens.
- [ ] AC-02: Given Phase 1 Step 1 (personal information), when rendered, then the heading uses `atlas-text-h2` scale, the traveler name and birth date fields are styled with `AtlasInput`, and the form card uses `atlas-surface-container-lowest` background with `atlas-outline-variant` border.
- [ ] AC-03: Given Phase 1 Step 2 (destination selection), when the `DestinationAutocomplete` component is open, then the dropdown options use `atlas-surface-container-low` background, `atlas-on-surface` text, and the selected item is highlighted with `atlas-secondary-fixed` background.
- [ ] AC-04: Given Phase 1 Step 3 (dates), when a date range is selected, then the selected date range is displayed with `atlas-secondary-container` (#fe932c) as the range-fill color and `atlas-primary` text.
- [ ] AC-05: Given Phase 1 Step 4 (confirmation screen), when rendered, then the summary card uses `AtlasCard`, the CTA button to proceed uses `AtlasButton` with `atlas-secondary-container` background and `atlas-primary` text (WCAG 4.5:1 approved pair).
- [ ] AC-06: Given `NEXT_PUBLIC_DESIGN_V2=false`, when Phase 1 renders, then zero visual change from the current V1 experience — full regression safety.

### Phase 2 — "O Explorador"

- [ ] AC-07: Given `NEXT_PUBLIC_DESIGN_V2=true`, when a user opens Phase 2 (travel style and passengers), then preference category chips use `AtlasChip` with selected state using `atlas-secondary-container` fill and unselected state using `atlas-surface-container-high` fill.
- [ ] AC-08: Given Phase 2 (passengers), when the passenger count stepper renders, then it uses `AtlasStepperInput` with the label, increment/decrement buttons using `atlas-primary` icon color, and the current value in `atlas-text-h3` scale.
- [ ] AC-09: Given Phase 2 budget selection, when a budget tier is selected (budget/moderate/premium), then the selected card is highlighted with a `2px solid atlas-secondary-container` border and `atlas-secondary-fixed` background; unselected cards use `atlas-outline-variant` border and `atlas-surface-container-lowest` background.
- [ ] AC-10: Given Phase 2 accessibility preferences chip group, when rendered, then each chip includes an icon and a label, the group has an `aria-label` describing the category, and selected state is announced to screen readers.
- [ ] AC-11: Given `NEXT_PUBLIC_DESIGN_V2=false`, when Phase 2 renders, then zero visual change from the current V1 experience.
- [ ] AC-12: Given Phase 2 on a 375px screen, when rendered, then the preference chip grid reflows to a 2-column layout and the stepper inputs remain full-width and tappable at >= 44px touch target height.

### Phase 3 — "O Preparo"

- [ ] AC-13: Given `NEXT_PUBLIC_DESIGN_V2=true`, when a user opens Phase 3 (document checklist), then each checklist item renders with a toggle using `atlas-success` (#10b981) for checked state, `atlas-outline-variant` border for unchecked state, and a strikethrough label style when checked.
- [ ] AC-14: Given Phase 3, when the AI-generated checklist content is loading, then a skeleton loader using `atlas-surface-container-high` animated placeholder is displayed in place of each checklist item.
- [ ] AC-15: Given Phase 3, when all items in a category are checked, then the category header displays a completion badge using `AtlasBadge` with `atlas-success-container` background and `atlas-success` text.
- [ ] AC-16: Given Phase 3, when the phase is viewed on a 768px screen (tablet), then checklist items render in a single column and the AI suggestion panel (if visible) renders below the checklist, not beside it.
- [ ] AC-17: Given `NEXT_PUBLIC_DESIGN_V2=false`, when Phase 3 renders, then zero visual change from the current V1 experience.
- [ ] AC-18: Given any of Phases 1-3 under `NEXT_PUBLIC_DESIGN_V2=true`, when audited with axe-core at WCAG 2.1 AA, then zero violations are reported.

## 4. Scope

### In Scope

- V2 visual styling of Phase 1 form steps (personal info, destination, dates, confirmation)
- V2 visual styling of Phase 2 preference chips, stepper inputs, budget selector cards
- V2 visual styling of Phase 3 checklist items, category headers, AI loading skeleton
- Application of `AtlasInput`, `AtlasChip`, `AtlasStepperInput`, `AtlasCard`, `AtlasBadge`, `AtlasButton` from Sprint 38 component library
- Responsive behavior across 375 / 768 / 1024 / 1440px breakpoints
- All changes gated behind `NEXT_PUBLIC_DESIGN_V2` feature flag
- Unit tests for each V2 phase component at >= 80% coverage
- E2E: flag ON shows V2; flag OFF shows V1 with zero regressions

### Out of Scope

- Business logic changes: form validation rules, AI call parameters, gamification point awards
- Phase 2 Stitch export creation (no official export exists; this spec uses design system tokens as the design authority)
- Any new form fields or passenger type additions
- Backend API changes
- Phases 4-6 and Summary — covered by SPEC-PROD-053
- Phase Shell / Navigation — covered by SPEC-PROD-051

## 5. Constraints

### Security

- Form inputs in Phase 1 (traveler name, birth date, destination) handle PII — must not be logged client-side.
- The confirmation screen in Phase 1 may display trip details; BOLA guard must remain in place (trip fetched using authenticated session userId).
- No new data collection beyond what already exists in V1.

### Accessibility

- WCAG 2.1 AA minimum on all V2 phase components.
- `AtlasChip` in Phase 2 multi-select groups must use `role="group"` + `aria-label` for the category, and each chip must communicate selected/unselected state via `aria-pressed` or `aria-selected`.
- `AtlasStepperInput` must have accessible labels for the increment and decrement buttons (not just icon-only).
- Date range input in Phase 1 must be keyboard-operable (no mouse-only interactions).
- Focus ring must be visible on all interactive elements using `atlas-focus-ring` (#fe932c) token.
- Color is never the sole indicator of state — checked checklist items also use strikethrough text, not just color change.

### Performance

- Phase components are rendered within the `PhaseShellV2` Server Component boundary — only the form client interactivity is a Client Component.
- No new AI calls introduced by this spec; existing AI call patterns (checklist generation in Phase 3) are unchanged.
- Phase 1 destination autocomplete debounce behavior is unchanged from V1 (300ms, confirmed Sprint 11).
- No additional Nominatim requests or Redis cache changes.

### Architectural Boundaries

- This spec is technology-agnostic — it defines WHAT each phase looks like, not HOW it is coded.
- Must not alter the V1 component tree or break existing tests for V1 components.
- Must use only Sprint 38 `atlas-*` tokens — no inline `slate-*`, `amber-*`, or `green-*` Tailwind classes in V2 code paths.
- Must not introduce new animation libraries.

## 6. Success Metrics

- Zero V1 regressions: all existing Phase 1-3 E2E tests pass with `NEXT_PUBLIC_DESIGN_V2=false`.
- axe-core: zero AA violations on V2 phase components.
- UX Designer approves visual fidelity for Phase 1 and Phase 3 (Stitch exports exist); approves Phase 2 inline design against token system.
- Test coverage >= 80% on all new V2 component files.

## 7. Dependencies

- SPEC-PROD-046 (Sprint 38 Design System Foundation): COMPLETE
- SPEC-PROD-047 (Sprint 38 Component Library v1 — AtlasInput, AtlasChip, AtlasStepperInput, AtlasCard, AtlasBadge, AtlasButton): COMPLETE
- SPEC-PROD-051 (Sprint 40 Phase Shell V2): must be in place before this spec is implemented — hard dependency
- Phase 1 Stitch export: `docs/design/stitch-exports/` (screen listed in SCREEN-INDEX.md)
- Phase 3 Stitch export: `docs/design/stitch-exports/` (screen listed in SCREEN-INDEX.md)
- Phase 2: no Stitch export — UX Designer inline review required before implementation begins

## 8. Vendor Independence

- This spec describes WHAT each phase looks like and WHAT it does — not HOW it is implemented.
- Must NOT reference Next.js, React, Tailwind, or specific library APIs.
- Implementation details belong in the corresponding SPEC-ARCH document.

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-24 | product-owner | Initial draft — Sprint 40 |
