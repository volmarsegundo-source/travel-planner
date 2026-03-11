# SPEC-PROD-009: CTA Button Standardization

**Version**: 1.0.0
**Status**: Draft
**Author**: product-owner
**Reviewers**: [tech-lead, ux-designer, architect]
**Created**: 2026-03-11
**Last Updated**: 2026-03-11

---

## 1. Problem Statement

Manual testing of v0.19.0 (NEW-004) revealed inconsistent call-to-action (CTA) button behavior across the expedition flow:

1. **Inconsistent button labels**: The primary forward action uses different labels depending on the phase: "Next" in some phases, "Continue" in others, "Generate" in Phase 5, "Save" in Phase 4 sub-steps, and no clear primary CTA in some views. This inconsistency confuses users about what the button will do and whether it will advance them to the next phase or just save data within the current phase.

2. **Inconsistent button placement**: Primary CTAs appear at different positions -- sometimes at the bottom of the form, sometimes in a sticky footer, sometimes inline. Users develop muscle memory for button positions during multi-step flows, and inconsistent placement slows them down and causes accidental clicks.

3. **No visual hierarchy**: Some phases have multiple buttons (Save, Next, Back, Skip) at the same visual prominence. There is no consistent primary/secondary/tertiary button hierarchy that helps users identify the recommended action at a glance.

4. **Disabled state confusion**: In phases where the CTA is disabled until required fields are filled, the disabled state is not always visually distinct. Some phases use a grayed-out button, others use a tooltip, and some just silently do nothing on click.

These issues were flagged across multiple testing sessions, not just v0.19.0, making this a systemic UX consistency problem rather than a phase-specific bug.

**Evidence**: NEW-004 from v0.19.0 manual testing. Similar observations in Sprint 25 and Sprint 26 testing sessions.

**Affected users**: All personas. Every user interacts with CTA buttons on every phase of every expedition.

## 2. User Story

As a traveler (any persona),
I want all action buttons across the expedition to follow a consistent pattern in labeling, placement, visual hierarchy, and disabled state behavior,
so that I always know where to look for the next action, what it will do, and whether I can proceed.

### Traveler Context

- **Pain point**: In a 6-phase flow where each phase has 1-3 steps, the user encounters 10-20+ button interactions per expedition. When each button looks, behaves, and is positioned differently, the user wastes cognitive effort on basic navigation instead of focusing on trip planning. This is especially painful on mobile where screen space is limited and button positioning matters more.
- **Current workaround**: Users learn through trial and error which button to press in each phase. Experienced users develop phase-specific habits. New users often press the wrong button or miss the primary CTA.
- **Frequency**: Every phase, every step, every expedition. This is the most frequent interaction pattern in the product.

## 3. Acceptance Criteria

### Button Label Standardization

- [ ] AC-001: The primary forward navigation button in every expedition phase MUST follow this labeling convention:
  - Phases 1-5 (advancing to next phase): "Continue" / "Continuar"
  - Phase 6 (final phase, completing expedition): "Complete Expedition" / "Concluir Expedicao" (per SPEC-PROD-005)
  - Save actions within a phase (e.g., saving transport in Phase 4): "Save" / "Salvar"
  - AI generation triggers (Phase 3 checklist, Phase 5 guide, Phase 6 itinerary): "Generate [Type]" / "Gerar [Tipo]" (e.g., "Generate Itinerary" / "Gerar Roteiro")

- [ ] AC-002: The back navigation button MUST consistently be labeled "Back" / "Voltar" across all phases. It MUST NOT use "Previous", "Return", "Go back", or any other variant.

- [ ] AC-003: Secondary actions (e.g., "Skip", "Save as draft") MUST be labeled consistently across all phases where they appear. "Skip" / "Pular" for optional steps. "Save as draft" / "Salvar rascunho" if applicable.

### Button Placement Standardization

- [ ] AC-004: In every expedition phase, the primary CTA and back button MUST be positioned in a sticky footer bar at the bottom of the viewport. The layout MUST be: Back button on the left, primary CTA on the right. This is consistent across ALL phases, ALL steps, both mobile and desktop.
- [ ] AC-005: The sticky footer bar MUST remain visible at all times while scrolling through phase content. It MUST NOT scroll with the content.
- [ ] AC-006: Secondary actions (Skip, Save as draft) MUST be positioned between the Back and primary CTA buttons, or above the sticky footer bar. They MUST NOT be placed outside the footer bar in a different area of the screen.

### Visual Hierarchy

- [ ] AC-007: The primary CTA MUST have the highest visual prominence: filled background, contrasting text, largest button size. The specific colors and sizes are defined in the design system/UX spec, but the hierarchy principle is mandated here.
- [ ] AC-008: The back button MUST have secondary visual prominence: outlined or text-only style, same height as primary CTA but visually recessive.
- [ ] AC-009: Tertiary actions (Skip, Save as draft) MUST have the lowest visual prominence: text-only or underlined link style.
- [ ] AC-010: There MUST be exactly ONE primary CTA visible at any time per screen. Multiple filled/prominent buttons on the same screen are not permitted.

### Disabled State

- [ ] AC-011: When the primary CTA is disabled (e.g., required fields not filled), it MUST: (a) be visually distinct from the enabled state (reduced opacity or desaturated color), (b) show a cursor change indicating non-interactivity, (c) NOT be completely invisible or hidden.
- [ ] AC-012: When a disabled CTA is clicked/tapped, the system MUST provide feedback about why it is disabled. The feedback mechanism can be: (a) inline validation messages appearing on the incomplete fields, or (b) a brief toast/message near the button indicating what is missing. Silent failure (no visual response to click) is NOT acceptable.

### Phase-Specific Behavior

- [ ] AC-013: In Phase 4 (A Logistica), which has sub-sections (Transport, Accommodation, Mobility), the CTA within each sub-section MUST be "Save" / "Salvar". The phase-level "Continue" / "Continuar" to Phase 5 MUST only appear when the user is ready to leave Phase 4 entirely.
- [ ] AC-014: In phases with AI generation (Phase 3, 5, 6), the generation button MUST be distinct from the navigation "Continue" button. The generation button triggers AI content creation. The "Continue" button advances to the next phase. Both may be present on the same screen but MUST follow the hierarchy: generation button as primary (since it is the main action), "Continue" as secondary (available after generation is complete).

## 4. Scope

### In Scope

- Standardizing CTA labels across all 6 expedition phases
- Standardizing button placement (sticky footer, left/right positioning)
- Defining visual hierarchy rules (primary/secondary/tertiary)
- Standardizing disabled state behavior and feedback
- Phase 4 sub-section vs phase-level CTA distinction
- AI generation vs navigation CTA distinction
- Localization of all button labels (PT-BR and EN)

### Out of Scope

- Redesigning the visual design system (colors, fonts, border radius) -- that is UX/design system scope
- Changing the phase sequence or adding/removing phases
- Changing what data each phase collects
- Adding new button types (e.g., "Share", "Export")
- Landing page or authentication page CTAs (this spec covers only the expedition flow)
- Keyboard shortcuts for button actions (future accessibility enhancement)

## 5. Constraints (MANDATORY)

### Security

- No security implications. This spec covers UI presentation and does not affect data handling, authentication, or authorization.

### Accessibility

- WCAG 2.1 AA compliance minimum.
- All buttons MUST be keyboard-focusable and activatable via Enter and Space keys.
- The sticky footer MUST NOT trap keyboard focus. Users MUST be able to tab between the footer buttons and the form content above.
- Disabled buttons MUST have `aria-disabled="true"` and MUST NOT use `display:none` or `visibility:hidden` (which would hide them from screen readers entirely).
- Button labels MUST be descriptive enough for screen readers. If the visible label is just "Continue", the accessible label MUST include context (e.g., "Continue to Phase 3 O Preparo").
- Color MUST NOT be the only indicator of button hierarchy. Size, weight, or border style MUST also differentiate primary from secondary.

### Performance

- The sticky footer MUST NOT cause layout shifts during scrolling.
- Button state changes (enabled/disabled, loading) MUST render in under 100ms.
- No performance impact beyond standard UI rendering.

### Architectural Boundaries

- This spec defines WHAT the buttons do and how they behave, not HOW they are implemented.
- This spec does NOT define specific colors, fonts, or pixel dimensions. Those belong to SPEC-UX and the design system.
- This spec does NOT change any server-side behavior. All changes are client-side presentation.
- This spec does NOT introduce new components; it standardizes the behavior of existing button components.

## 6. Success Metrics

- **Consistency audit**: 100% of expedition phases conform to the standardized button pattern. Measured by QA audit across all 6 phases and their sub-steps.
- **Task completion time**: >= 10% reduction in average time to navigate from Phase 1 to Phase 6 (indicating less confusion at each step). Measured by analytics session flow.
- **Error clicks**: >= 50% reduction in "wrong button" clicks (users pressing Save when they meant Continue, or vice versa). Measured by click tracking if available.
- **Accessibility compliance**: 100% of buttons pass automated accessibility audit (keyboard, aria, focus management). Measured by CI/CD a11y checks.

## 7. Dependencies

- All 6 expedition phase wizards must be auditable for current button behavior.
- SPEC-PROD-005 (Expedition Completion): defines the Phase 6 "Complete Expedition" button, which this spec standardizes.
- SPEC-PROD-001 (Expedition Navigation): defines back/forward navigation, which this spec standardizes at the button level.
- UX spec needed for the visual design system details (colors, sizes, spacing).

## 8. Vendor Independence

- This spec describes WHAT the feature does, not HOW it is implemented.
- Must NOT reference specific libraries, frameworks, or vendor products.
- Implementation details belong in the corresponding SPEC-ARCH document.

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-11 | product-owner | Initial draft for Sprint 27. Based on NEW-004 from v0.19.0 manual testing and recurring observations from Sprints 25-26 |
