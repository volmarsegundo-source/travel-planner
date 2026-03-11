# SPEC-PROD-003: Destination Guide Full Visibility

**Version**: 1.0.0
**Status**: Draft
**Author**: product-owner
**Reviewers**: [tech-lead, ux-designer, architect]
**Created**: 2026-03-11
**Last Updated**: 2026-03-11

---

## 1. Problem Statement

The Destination Guide (Phase 5 "A Conexao") was redesigned in Sprint 19 to include 10 content categories. However, the current implementation only renders 4 stat cards visibly, with the remaining 6 content sections collapsed behind accordion/expand controls. This defeats the purpose of the redesign: users do not discover the full depth of destination information available to them.

Additionally, the "Atualizar guia" (Update Guide) button is present on the guide screen, but its purpose is unclear. Users click it expecting new content, but it merely re-triggers the same AI generation. The guide should auto-update when the underlying trip data changes (destination, dates, preferences, passengers) -- not require a manual action.

Finally, the banner/highlight area at the top of the guide shows generic placeholder content instead of summarizing the key insights from the stat cards below.

**Evidence**: Sprint 25 manual testing (ITEM-2 in backlog). Observed during v0.18.0 validation. 6 of 10 guide sections require user action to reveal content, reducing discoverability and perceived value of the AI-generated guide.

**Affected users**: All personas (@leisure-solo, @leisure-family, @business-traveler, @bleisure). Every user who reaches Phase 5 is affected.

## 2. User Story

As a traveler (any persona),
I want to see ALL destination guide content sections fully visible without needing to expand or collapse anything,
so that I can quickly scan and absorb all the destination insights the AI has prepared for my trip without missing important information.

### Traveler Context

- **Pain point**: Users complete 4 phases of trip planning to reach the guide, expecting a rich destination overview. Instead, they see only 4 stat cards and must manually click to reveal 6 more sections. Many users never discover the hidden content, which means the AI-generated value (local customs, safety tips, transportation advice, etc.) goes unseen.
- **Current workaround**: Users must individually click/tap each collapsed section to expand it. There is no "expand all" option. Most users do not realize there is more content below the fold.
- **Frequency**: Every trip, every user who reaches Phase 5. This is the primary touchpoint for destination intelligence.

## 3. Acceptance Criteria

### Full Visibility

- [ ] AC-001: The destination guide screen MUST display ALL 10 content sections in a fully expanded, visible state. No section may be collapsed, hidden behind an accordion, or require user action to reveal its content.
- [ ] AC-002: The 10 sections are (in order): (1) Overview/Highlights, (2) Best Time to Visit, (3) Local Cuisine, (4) Cultural Customs, (5) Transportation, (6) Safety Tips, (7) Budget Guide, (8) Language & Communication, (9) Must-See Attractions, (10) Practical Tips. The exact section names may vary by locale but the content categories must all be present.
- [ ] AC-003: Each section MUST display its full AI-generated content. Truncation of section content is not permitted. If a section has no content (AI did not generate it), the section MUST display a "Content not available" indicator rather than being silently hidden.

### Stat Cards

- [ ] AC-004: The 4 stat cards (currently visible) MUST remain in their current position at the top of the guide. Their content and behavior are unchanged by this spec.
- [ ] AC-005: The stat cards MUST visually connect to their corresponding expanded sections below. The connection can be achieved through consistent labeling, color coding, or section anchoring -- the specific mechanism is defined in the UX spec.

### Banner Highlights

- [ ] AC-006: The banner/highlight area at the top of the guide MUST display a dynamic summary based on the AI-generated content. The summary MUST include at minimum: (a) the best time to visit (if the user's dates are optimal or not), (b) one key cultural insight, and (c) one practical tip. Generic placeholder text is not acceptable.
- [ ] AC-007: The banner summary MUST be derived from the same AI generation that produces the guide sections. It MUST NOT require a separate AI call.

### Auto-Update Behavior

- [ ] AC-008: The "Atualizar guia" (Update Guide) button MUST be removed from the guide screen. There must be no manual trigger for guide regeneration visible to the user.
- [ ] AC-009: The guide MUST auto-regenerate when the user returns to Phase 5 AND any of the following trip data has changed since the last generation: (a) destination, (b) travel dates, (c) number of passengers, (d) user preferences (cuisine, activities, accessibility, etc.), (e) traveler type. The system determines "changed" by comparing current trip data against the data snapshot stored at the time of the last generation.
- [ ] AC-010: If the user returns to Phase 5 and NO trip data has changed since the last generation, the previously generated guide MUST be displayed immediately from cache/storage. No AI call is made.
- [ ] AC-011: While the guide is being generated (or regenerated), a loading state MUST be displayed that indicates content is being prepared. The loading state MUST NOT block the user from navigating away (back to previous phases).

### Localization

- [ ] AC-012: All section titles, stat card labels, banner text, and loading indicators MUST be localized for PT-BR and EN.

## 4. Scope

### In Scope

- Expanding all 10 guide sections to be fully visible (no collapse/accordion)
- Removing the "Atualizar guia" manual button
- Implementing auto-update logic (detect trip data changes, regenerate when needed)
- Banner summary that reflects actual AI-generated content
- Loading state during guide generation
- Localization of all new/changed UI text

### Out of Scope

- Changing the AI prompt or model used for guide generation (that is prompt-engineer scope)
- Adding new guide categories beyond the existing 10
- Offline guide access or PDF export
- Guide content editing by the user
- Map integration within the guide
- Social sharing of guide content

## 5. Constraints (MANDATORY)

### Security

- Guide content is generated per-trip and per-user. The auto-update mechanism MUST verify trip ownership (BOLA prevention) before triggering regeneration.
- The data snapshot comparison (to detect changes) MUST happen server-side. The client MUST NOT be trusted to determine whether data has changed.
- No PII is stored in the guide content itself. Destination and preference data used for generation is already validated elsewhere.

### Accessibility

- WCAG 2.1 AA compliance minimum for all guide sections.
- Each of the 10 sections MUST have a proper heading (semantic heading hierarchy: section title as h2 or h3).
- Stat cards MUST be readable by screen readers with their label and value (e.g., "Average temperature: 28 degrees Celsius").
- The loading state MUST be announced by screen readers (e.g., "Generating destination guide, please wait").
- Content MUST be readable without horizontal scrolling on 375px viewport width.

### Performance

- Guide display (from cache, no regeneration) MUST render in under 1 second.
- Guide regeneration MUST use streaming to display sections progressively as they are generated, with full generation completing in under 15 seconds.
- The auto-update check (has trip data changed?) MUST complete in under 200ms and MUST NOT require an AI call.
- Removing the accordion/collapse behavior MUST NOT significantly increase initial page load time (the content was already fetched, just hidden).

### Architectural Boundaries

- This spec does NOT define the AI prompt structure or model selection for guide generation. Those belong to the prompt-engineer and SPEC-ARCH.
- This spec does NOT define the visual layout of the 10 sections (grid, cards, list). That belongs to SPEC-UX.
- This spec does NOT change the data model for guide storage. The existing guide storage mechanism is used.
- The "data snapshot" comparison mechanism is an implementation detail defined in SPEC-ARCH.

## 6. Success Metrics

- **Section visibility**: 100% of guide sections visible without user action. Measured by QA conformance audit.
- **Guide engagement**: Increase in average scroll depth on the guide page by >= 40% (users scroll through more content when it is visible). Measured by analytics if available.
- **Manual refresh elimination**: Zero instances of the "Atualizar guia" button in the UI. Measured by QA audit.
- **Auto-update accuracy**: 100% of guide regenerations triggered when trip data actually changed; 0% false triggers (regeneration when nothing changed). Measured by automated tests.

## 7. Dependencies

- SPEC-PROD-001 (Expedition Navigation): Guide is Phase 5 in the expedition flow. Navigation to/from Phase 5 must work correctly.
- Existing AI guide generation service must support the streaming display of 10 sections.
- Existing guide data model must store the data snapshot (destination, dates, preferences hash) for change detection. If the current model does not store this, a SPEC-ARCH is needed to define the schema change.

## 8. Vendor Independence

- This spec describes WHAT the feature does, not HOW it is implemented.
- Must NOT reference specific libraries, frameworks, or vendor products.
- Implementation details belong in the corresponding SPEC-ARCH document.

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-11 | product-owner | Initial draft for Sprint 26, based on ITEM-2 backlog |
