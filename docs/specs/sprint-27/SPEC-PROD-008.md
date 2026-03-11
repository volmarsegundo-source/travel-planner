# SPEC-PROD-008: Navigation Restructure -- Expeditions vs Meu Atlas

**Version**: 1.0.0
**Status**: Draft
**Author**: product-owner
**Reviewers**: [tech-lead, ux-designer, architect]
**Created**: 2026-03-11
**Last Updated**: 2026-03-11

---

## 1. Problem Statement

The current navigation structure conflates trip management with the gamification/profile experience. The authenticated navbar has a single "Minhas Viagens" (My Trips) link that leads to the dashboard, which displays trip cards alongside gamification stats. Manual testing (v0.19.0, NEW-003) revealed three problems:

1. **No dedicated entry point for gamification**: The user's Atlas profile (badges, points history, level progress, achievements) is buried inside the account/profile page. There is no top-level navigation item for "Meu Atlas" or "My Map" -- the gamification identity that the product is built around. This undermines the Atlas branding and the explorer metaphor.

2. **Map pin on the map is non-functional (REC-011)**: The dashboard shows a decorative map element with a pin on the destination. Users expect the pin to be interactive (click to see destination details or jump to the guide), but it does nothing. This creates a broken affordance.

3. **Navigation does not reflect the dual identity of the product**: Atlas is both a trip planner (functional) and a gamified exploration platform (emotional). The navigation should reflect both dimensions: "Expeditions" (trips/planning) and "Meu Atlas" (gamification/profile/achievements). Currently, only the functional dimension has a navigation entry.

**Evidence**: NEW-003 from v0.19.0 manual testing. Multiple testers asked "where do I see my badges?" and could not find the gamification profile without help.

**Affected users**: All personas. The navigation structure affects every authenticated page.

## 2. User Story

As a traveler (any persona),
I want the main navigation to clearly separate my trip planning ("Expeditions") from my Atlas explorer profile ("Meu Atlas"),
so that I can quickly access either my active trips or my achievements, progress, and explorer identity without confusion.

### Traveler Context

- **Pain point**: Users who engage with the gamification system (earning points, badges, completing phases) have no quick way to see their overall progress. The Atlas explorer identity -- which differentiates this product from generic trip planners -- has no "home" in the navigation. Users who want to check their badges must navigate to Account > Profile and scroll to the gamification section.
- **Current workaround**: Users click "Account" in the user menu, then manually scroll to the gamification section within the profile page. This is 2+ clicks and non-discoverable.
- **Frequency**: Every session. Navigation is used on every page load.

## 3. Acceptance Criteria

### Navigation Items

- [ ] AC-001: The authenticated navbar MUST contain two primary navigation items (in addition to the logo, language switcher, and user menu): (a) "Expeditions" / "Expedicoes" -- linking to the trip dashboard (current "Minhas Viagens" functionality), and (b) "Meu Atlas" / "My Atlas" -- linking to a dedicated gamification/explorer profile page.
- [ ] AC-002: The label "Minhas Viagens" MUST be replaced with "Expedicoes" (PT-BR) / "Expeditions" (EN) to align with the Atlas expedition metaphor throughout the product.
- [ ] AC-003: The active navigation item MUST be visually highlighted (consistent with existing active state styling from US-100).

### Meu Atlas Page

- [ ] AC-004: The "Meu Atlas" page MUST display: (a) user's current level and total points, (b) earned badges with visual representations, (c) a progress indicator toward the next level, (d) expedition completion history (list of completed trips with completion dates). The page MAY include additional gamification content in future specs.
- [ ] AC-005: The "Meu Atlas" page MUST be a dedicated route accessible from the main navigation. It MUST NOT be a section within the account/profile page.
- [ ] AC-006: The "Meu Atlas" page MUST be accessible without having created any trips. For new users with no gamification history, display a welcoming "Start your first expedition" prompt with a link to create a trip.

### Map Pin Interactivity

- [ ] AC-007: If the dashboard displays a map element with a destination pin (for trips that have a destination set), the pin MUST be interactive. Clicking the pin MUST navigate the user to the destination guide (Phase 5) for that trip.
- [ ] AC-008: If the dashboard does NOT display a map element (e.g., it was a decorative background), the non-functional map pin MUST be removed. Decorative elements that look interactive but do nothing violate UX heuristics (Nielsen's match between system and real world).
- [ ] AC-009: The decision on whether to keep the map element (with interactivity) or remove it entirely is deferred to the UX spec. This product spec requires that the current non-interactive pin state be resolved -- it MUST either work or be removed.

### Mobile Navigation

- [ ] AC-010: On mobile viewports (< 768px), both "Expeditions" and "Meu Atlas" MUST be accessible from the hamburger/mobile menu. The order MUST be: Expeditions first, then Meu Atlas.
- [ ] AC-011: The mobile menu MUST show a compact gamification indicator (points or level) next to the "Meu Atlas" item as a preview, encouraging exploration.

## 4. Scope

### In Scope

- Restructuring the main navigation from 1 item to 2 items (Expeditions + Meu Atlas)
- Renaming "Minhas Viagens" to "Expedicoes" / "Expeditions"
- Creating a dedicated "Meu Atlas" page with gamification profile content
- Resolving the non-functional map pin (make interactive or remove)
- Mobile navigation adaptation
- Localization (PT-BR and EN) for all navigation labels and page content

### Out of Scope

- Redesigning the trip dashboard layout (beyond the name change)
- Adding new gamification mechanics (leaderboards, streaks, social features)
- Interactive destination map with multiple pins (future feature, complex mapping scope)
- Gamification notifications or alerts beyond SPEC-PROD-006 header indicator
- Travel community or social features within Meu Atlas
- Third-party map provider integration for the dashboard (uses existing map element or removes it)

## 5. Constraints (MANDATORY)

### Security

- The "Meu Atlas" page MUST only display the authenticated user's gamification data. BOLA prevention applies.
- The map pin navigation (if kept) MUST verify trip ownership before navigating to Phase 5.
- No new PII exposure. Gamification data (points, badges, levels) is not PII.

### Accessibility

- WCAG 2.1 AA compliance minimum.
- Navigation items MUST be keyboard-navigable with visible focus indicators.
- The "Meu Atlas" page MUST use semantic heading hierarchy for content sections.
- Badge images/icons on the "Meu Atlas" page MUST have alt text descriptions.
- The mobile menu MUST be operable via keyboard and screen reader.
- If the map pin is kept, it MUST have an accessible label ("View destination guide for [destination name]").

### Performance

- Adding the "Meu Atlas" navigation item MUST NOT increase navbar render time by more than 50ms.
- The "Meu Atlas" page MUST load in under 2 seconds (gamification data fetch + render).
- If the map pin is kept with interactivity, the click handler MUST respond in under 200ms.

### Architectural Boundaries

- This spec does NOT define the visual design of the "Meu Atlas" page. That belongs to SPEC-UX.
- This spec does NOT define new gamification data models. It uses existing UserProgress, UserBadge, and PointTransaction data.
- This spec does NOT define the API shape for the "Meu Atlas" page data. That belongs to SPEC-ARCH.
- This spec does NOT require a new map provider or mapping library. The map element decision is about the existing implementation.

## 6. Success Metrics

- **Navigation usage**: >= 25% of authenticated sessions include at least one click on "Meu Atlas" within the first month of release. Measured by analytics.
- **Gamification discoverability**: >= 80% of users who have earned badges can find their badge collection within 1 click from any page (via header nav). Measured by usability testing.
- **Map pin resolution**: Zero instances of non-interactive map elements in the UI. Measured by QA audit.
- **Naming alignment**: 100% of navigation labels use "Expeditions" / "Expedicoes" instead of "Minhas Viagens". Measured by QA audit.

## 7. Dependencies

- Gamification engine (UserProgress, UserBadge, PointsEngine) from Sprint 9 must be functional.
- Authenticated navbar (US-100, Sprint 5) must support adding a second navigation item.
- SPEC-PROD-006 (Gamification Header Display): the header indicator clicks through to the "Meu Atlas" page defined in this spec.
- Existing dashboard and map element implementation must be audited to determine AC-007/008/009 resolution.

## 8. Vendor Independence

- This spec describes WHAT the feature does, not HOW it is implemented.
- Must NOT reference specific libraries, frameworks, or vendor products.
- Implementation details belong in the corresponding SPEC-ARCH document.

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-11 | product-owner | Initial draft for Sprint 27. Based on NEW-003 and REC-011 from v0.19.0 manual testing |
