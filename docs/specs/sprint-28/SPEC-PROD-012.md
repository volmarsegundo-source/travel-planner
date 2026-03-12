---
spec_id: SPEC-PROD-012
title: "Navigation Restructure -- Expeditions vs Meu Atlas"
type: product
status: Draft
version: "1.0.0"
author: product-owner
sprint: 28
priority: P1
created: "2026-03-11"
updated: "2026-03-11"
related_specs: [SPEC-PROD-008, SPEC-PROD-010, SPEC-PROD-006]
---

# SPEC-PROD-012: Navigation Restructure -- Expeditions vs Meu Atlas

**Version**: 1.0.0
**Status**: Draft
**Author**: product-owner
**Reviewers**: [tech-lead, ux-designer, architect]
**Created**: 2026-03-11
**Last Updated**: 2026-03-11

---

## 1. Problem Statement

The current navigation structure conflates trip management with the gamification/profile experience. The authenticated navbar has a single "Minhas Viagens" (My Trips) link that leads to the dashboard, which displays trip cards alongside gamification stats. Manual testing across v0.19.0 and v0.20.0 (NEW-003) revealed three persistent problems:

1. **No dedicated entry point for gamification**: The user's Atlas profile (badges, points history, level progress, achievements) is buried inside the account/profile page. There is no top-level navigation item for "Meu Atlas" -- the gamification identity that the product is built around. This undermines the Atlas branding and the explorer metaphor.

2. **Map page with trip pins is missing**: The product is called "Atlas" and uses an explorer metaphor, yet there is no map view showing the user's destinations. A map page with colored pins by trip status would reinforce the explorer identity and give travelers a spatial overview of their planned and completed journeys.

3. **Navigation does not reflect the dual identity of the product**: Atlas is both a trip planner (functional) and a gamified exploration platform (emotional). The navigation should reflect both dimensions: "Expeditions" (trips/planning) and "Meu Atlas" (gamification/profile/map/achievements). Currently, only the functional dimension has a navigation entry.

Additionally, REC-011 (map pin non-interactive on dashboard) was partially addressed in Sprint 27 but the broader map experience remains unresolved.

This spec supersedes SPEC-PROD-008 (Sprint 27 draft) and expands it with the map page concept.

**Evidence**: NEW-003 from v0.19.0 manual testing. REC-011 recurring since Sprint 26. Multiple testers asked "where do I see my badges?" and could not find the gamification profile without help.

**Affected users**: All personas. The navigation structure affects every authenticated page.

## 2. User Story

### Primary Story

As a traveler (any persona),
I want the main navigation to clearly separate my trip planning ("Expeditions") from my Atlas explorer profile ("Meu Atlas"),
so that I can quickly access either my active trips or my achievements, progress, and explorer identity without confusion.

### Secondary Story

As a traveler who has planned multiple trips,
I want to see a map view showing all my trip destinations with colored pins indicating each trip's status (planning, active, completed),
so that I get a visual overview of my travel history and feel like a true explorer building my personal atlas.

### Traveler Context

- **Pain point**: Users who engage with the gamification system (earning points, badges, completing phases) have no quick way to see their overall progress. The Atlas explorer identity -- which differentiates this product from generic trip planners -- has no "home" in the navigation. Users who want to check their badges must navigate to Account > Profile and scroll to the gamification section (2+ clicks, non-discoverable). Additionally, there is no spatial visualization of trips despite the product being named "Atlas."
- **Current workaround**: Users click "Account" in the user menu, then manually scroll to the gamification section within the profile page. For a spatial trip overview, users have no workaround -- they must mentally track their destinations.
- **Frequency**: Every session. Navigation is used on every page load. Map view would be used once per session as an overview, especially by users with 3+ trips.

## 3. Acceptance Criteria

### Navigation Items

- [ ] AC-001: The authenticated navbar MUST contain two primary navigation items (in addition to the logo, language switcher, gamification indicator from SPEC-PROD-010, and user menu): (a) "Expeditions" / "Expedicoes" -- linking to the trip dashboard (current "Minhas Viagens" functionality), and (b) "Meu Atlas" / "My Atlas" -- linking to a dedicated gamification/explorer profile page.
- [ ] AC-002: The label "Minhas Viagens" MUST be replaced with "Expedicoes" (PT-BR) / "Expeditions" (EN) to align with the Atlas expedition metaphor throughout the product.
- [ ] AC-003: The active navigation item MUST be visually highlighted (consistent with existing active state styling from US-100).

### Meu Atlas Page -- Gamification Profile

- [ ] AC-004: The "Meu Atlas" page MUST display: (a) user's current level and total points, (b) earned badges with visual representations, (c) a progress indicator toward the next level, (d) expedition completion history (list of completed trips with completion dates). The page MAY include additional gamification content in future specs.
- [ ] AC-005: The "Meu Atlas" page MUST be a dedicated route accessible from the main navigation. It MUST NOT be a section within the account/profile page.
- [ ] AC-006: The "Meu Atlas" page MUST be accessible without having created any trips. For new users with no gamification history, display a welcoming "Start your first expedition" / "Comece sua primeira expedicao" prompt with a link to create a trip.

### Meu Atlas Page -- Map View

- [ ] AC-007: The "Meu Atlas" page MUST include a map section showing pins for all trips that have a destination set. The map MUST be interactive (pan, zoom).
- [ ] AC-008: Map pins MUST be color-coded by trip status: (a) blue for trips in planning (expedition started but not all phases completed), (b) gold for trips that are currently active (trip dates include today), (c) green for completed trips (expedition completed AND trip end date has passed). The specific colors are indicative; the UX spec defines the exact palette, but there MUST be at least 3 visually distinct states.
- [ ] AC-009: Clicking a map pin MUST display a brief tooltip or popup with: trip name, destination, dates, and a "View Trip" / "Ver Viagem" link that navigates to the expedition or summary for that trip.
- [ ] AC-010: If a user has no trips with a destination set, the map section MUST display a welcoming empty state: "Plan your first expedition to start building your atlas" / "Planeje sua primeira expedicao para comecar a construir seu atlas".
- [ ] AC-011: The map section MUST auto-center and auto-zoom to fit all the user's trip pins. If only one trip exists, center on that destination with a reasonable zoom level (city-level).

### Mobile Navigation

- [ ] AC-012: On mobile viewports (< 768px), both "Expeditions" and "Meu Atlas" MUST be accessible from the hamburger/mobile menu. The order MUST be: Expeditions first, then Meu Atlas.
- [ ] AC-013: The mobile menu MUST show a compact gamification indicator (points or level) next to the "Meu Atlas" item as a preview, encouraging exploration.
- [ ] AC-014: The "Meu Atlas" page on mobile MUST display the gamification profile section first (above the fold), with the map section below. The map MUST be functional on mobile with touch gestures for pan and zoom.

### Breadcrumb Updates

- [ ] AC-015: Breadcrumbs on the "Meu Atlas" page MUST show: Home > Meu Atlas.
- [ ] AC-016: Breadcrumbs on the expeditions (trips) page MUST show: Home > Expedicoes.
- [ ] AC-017: Breadcrumbs within an expedition phase MUST update to: Home > Expedicoes > [Trip Name] > [Phase Name].

## 4. Scope

### In Scope

- Restructuring the main navigation from 1 item to 2 items (Expeditions + Meu Atlas)
- Renaming "Minhas Viagens" to "Expedicoes" / "Expeditions"
- Creating a dedicated "Meu Atlas" page with gamification profile content
- Map section on "Meu Atlas" page with colored pins by trip status
- Pin interactivity (tooltip with trip details + link)
- Mobile navigation adaptation
- Breadcrumb updates for new navigation structure
- Localization (PT-BR and EN) for all navigation labels and page content
- Empty states for both gamification and map sections

### Out of Scope

- Redesigning the trip dashboard layout (beyond the name change)
- Adding new gamification mechanics (leaderboards, streaks, social features)
- Full-screen dedicated map page (the map is a section within Meu Atlas, not a standalone page)
- Route planning or directions on the map
- Map-based trip creation (clicking on the map to start a new trip)
- Third-party map tile provider selection (belongs to SPEC-ARCH)
- Travel community or social features within Meu Atlas
- Gamification notifications or alerts beyond SPEC-PROD-010 header indicator
- Map pin clustering for users with many trips in the same area (future optimization)

## 5. Constraints (MANDATORY)

### Security

- The "Meu Atlas" page MUST only display the authenticated user's gamification data and trip pins. BOLA prevention applies.
- Map pin click actions MUST verify trip ownership before navigating to the expedition/summary.
- No new PII exposure. Gamification data (points, badges, levels) is not PII. Trip destination coordinates are derived from the existing destination field.
- Trip coordinates for map pins MUST be derived from the destination already stored in the trip record. No new geolocation data collection.

### Accessibility

- WCAG 2.1 AA compliance minimum.
- Navigation items MUST be keyboard-navigable with visible focus indicators.
- The "Meu Atlas" page MUST use semantic heading hierarchy for content sections (h1: Meu Atlas, h2: Progress, h2: Badges, h2: Map, etc.).
- Badge images/icons on the "Meu Atlas" page MUST have alt text descriptions.
- The mobile menu MUST be operable via keyboard and screen reader.
- Map pins MUST be accessible via keyboard navigation (tab through pins). Each pin MUST have an accessible label ("Trip to Paris, planning status").
- The map MUST have a text-based alternative for screen readers: a list of trip destinations with their statuses, displayed below or alongside the map.
- Color-coded pin states MUST have a secondary indicator (shape, icon, or pattern) in addition to color for users with color vision deficiency.

### Performance

- Adding the "Meu Atlas" navigation item MUST NOT increase navbar render time by more than 50ms.
- The "Meu Atlas" page MUST load in under 2 seconds (gamification data + map initialization + pin rendering).
- Map tile loading MUST NOT block the gamification profile section from rendering. The profile section MUST appear first, with the map loading progressively below.
- For users with many trips (up to the 20-trip maximum), all pins MUST render within the 2-second budget.
- Map pin click handler MUST respond in under 200ms.

### Architectural Boundaries

- This spec does NOT define the visual design of the "Meu Atlas" page. That belongs to SPEC-UX.
- This spec does NOT define new gamification data models. It uses existing UserProgress, UserBadge, and PointTransaction data.
- This spec does NOT define the API shape for the "Meu Atlas" page data. That belongs to SPEC-ARCH.
- This spec does NOT select a map tile provider. That is an architectural decision documented in SPEC-ARCH. The product requirement is simply "an interactive map with pins."
- This spec does NOT define how destination coordinates are extracted or geocoded. The existing destination field and Nominatim integration (from Sprint 11) are assumed to provide this data.
- The map section is embedded within the Meu Atlas page. It is NOT a standalone map route/page.

## 6. Success Metrics

- **Navigation usage**: >= 25% of authenticated sessions include at least one click on "Meu Atlas" within the first month post-beta. Measured by analytics.
- **Gamification discoverability**: >= 80% of users who have earned badges can find their badge collection within 1 click from any page (via header nav). Measured by usability testing.
- **Map engagement**: >= 50% of users with 2+ trips interact with the map (pan, zoom, or click a pin) at least once per week. Measured by analytics.
- **Naming alignment**: 100% of navigation labels use "Expeditions" / "Expedicoes" instead of "Minhas Viagens". Measured by QA audit.
- **Pin accuracy**: 100% of trips with a destination set display a correctly positioned pin. Measured by QA audit.

## 7. Dependencies

- Gamification engine (UserProgress, UserBadge, PointsEngine) from Sprint 9 must be functional.
- Authenticated navbar (US-100, Sprint 5) must support adding a second navigation item.
- SPEC-PROD-010 (Gamification Header Display): the header indicator clicks through to the "Meu Atlas" page defined in this spec.
- Destination data and geocoding: existing Nominatim integration (Sprint 11) provides coordinates for trip destinations.
- Existing map component: the project already uses Mapbox GL JS (noted in architecture constraints). This spec does not mandate a specific provider but assumes an interactive map is feasible.
- SPEC-PROD-011 (Summary with Edit): the map pin "View Trip" link should navigate to the summary for completed trips and to the expedition flow for in-progress trips.
- Max 20 trips per user (US-001 AC-007) bounds the maximum number of pins on the map.

## 8. Vendor Independence

- This spec describes WHAT the feature does, not HOW it is implemented.
- Must NOT reference specific libraries, frameworks, or vendor products by name as requirements.
- The map functionality requires a mapping solution, but this spec does NOT mandate which one. The architectural decision belongs in SPEC-ARCH.
- Implementation details belong in the corresponding SPEC-ARCH document.

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-11 | product-owner | Initial draft for Sprint 28. Supersedes SPEC-PROD-008 (Sprint 27 draft). Adds map view with colored pins, expands mobile and accessibility requirements |
