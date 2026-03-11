# SPEC-PROD-006: Gamification Header Display

**Version**: 1.0.0
**Status**: Draft
**Author**: product-owner
**Reviewers**: [tech-lead, ux-designer, architect]
**Created**: 2026-03-11
**Last Updated**: 2026-03-11

---

## 1. Problem Statement

The Atlas gamification system awards points, badges, and tracks user level/progress throughout the expedition flow. However, this information is only visible on the dedicated profile/dashboard screen. During the expedition itself -- where users are actively earning points -- there is no persistent indicator of their gamification state.

Manual testing (v0.19.0, NEW-001) confirmed that testers expected to see their points, level, or progress in the header/navbar area while navigating through expedition phases. The absence of this feedback loop weakens the gamification engagement cycle: users earn points but receive no real-time reinforcement until they navigate away from the expedition flow.

Travel apps with gamification (Duolingo for language learning, TripAdvisor for reviews) consistently display streak/progress indicators in the persistent header. This is a proven pattern for engagement retention.

**Evidence**: Manual testing feedback from v0.19.0. Stakeholder request for persistent gamification visibility.

**Affected users**: All personas. Every authenticated user who has started at least one expedition.

## 2. User Story

As a traveler (any persona),
I want to see my current gamification status (points, level, or progress indicator) in the application header at all times while logged in,
so that I feel a continuous sense of progress and accomplishment as I plan my trip, reinforcing the "Atlas explorer" identity.

### Traveler Context

- **Pain point**: Users earn gamification points and badges throughout the 6 expedition phases, but receive no persistent visual feedback. The reward signal only appears in the profile/dashboard, creating a disconnect between the action (completing a phase step) and the reinforcement (seeing progress). This violates the core gamification principle of immediate feedback.
- **Current workaround**: Users must navigate to the profile or dashboard to check their points and level. During an expedition, this means leaving the flow, which is disruptive and unlikely.
- **Frequency**: Every authenticated session. Users are always logged in when interacting with the product, so the header is always visible.

## 3. Acceptance Criteria

### Header Display

- [ ] AC-001: The authenticated navbar/header MUST display a compact gamification status indicator. The indicator MUST show at minimum: (a) current total points, and (b) current level or rank name.
- [ ] AC-002: The gamification indicator MUST be visible on ALL authenticated pages, including: dashboard, expedition phases 1-6, account/profile, and any other authenticated route.
- [ ] AC-003: The gamification indicator MUST be positioned in the header area, consistent across all pages. It MUST NOT overlap with or obscure existing navigation elements (logo, nav links, language switcher, user menu).
- [ ] AC-004: On mobile viewports (< 768px), the gamification indicator MUST adapt gracefully. Options include: (a) showing only the points number with an icon, (b) moving to the mobile menu, or (c) a compact badge representation. The specific mobile treatment is defined in the UX spec. The indicator MUST NOT be hidden entirely on mobile.

### Real-Time Updates

- [ ] AC-005: When a user earns points during a session (e.g., completing a phase, filling preferences), the header indicator MUST update to reflect the new total WITHOUT requiring a page reload or navigation away from the current screen.
- [ ] AC-006: When a user's level changes as a result of earning points, the header indicator MUST update the level display. A brief, non-intrusive visual cue (e.g., a subtle animation or highlight) SHOULD signal the level-up, but MUST NOT block or interrupt the user's workflow.

### Interaction

- [ ] AC-007: The gamification indicator MUST be interactive. Clicking or tapping it MUST navigate the user to their full gamification profile/dashboard (where badges, detailed history, and progress details are available).
- [ ] AC-008: The indicator MUST display a loading/skeleton state while gamification data is being fetched on initial page load. It MUST NOT display "0 points" as a flash before the real value loads.

### Data Accuracy

- [ ] AC-009: Points and level displayed in the header MUST be consistent with the values shown on the profile/dashboard page. There MUST be no discrepancy caused by caching or stale state.
- [ ] AC-010: For new users with 0 points and no level, the indicator MUST display a welcoming initial state (e.g., "0 pts - Explorer" or equivalent starter rank) rather than appearing empty or broken.

## 4. Scope

### In Scope

- Compact gamification indicator in the authenticated header/navbar
- Points and level/rank display
- Real-time update when points are earned in-session
- Click-through to full gamification profile
- Mobile-responsive treatment
- Skeleton/loading state
- Localization (PT-BR and EN) for level names and labels

### Out of Scope

- Redesigning the full gamification profile/dashboard
- Adding new gamification mechanics (streaks, leaderboards, etc.)
- Push notifications for gamification events
- Displaying badges in the header (too complex for compact indicator)
- Gamification for unauthenticated users
- Sound effects or audio feedback for point changes

## 5. Constraints (MANDATORY)

### Security

- Gamification data MUST be fetched from the server using the authenticated user's session. No cross-user data leakage.
- Points values displayed in the header MUST NOT be modifiable via client-side manipulation. The display is read-only; all point mutations happen server-side.
- BOLA prevention: the gamification endpoint used by the header MUST scope data to the authenticated user only.

### Accessibility

- WCAG 2.1 AA compliance minimum.
- The gamification indicator MUST have an accessible label readable by screen readers (e.g., "Your progress: 250 points, Level Explorer").
- The level-up visual cue MUST respect prefers-reduced-motion. If reduced motion is preferred, the cue MUST be static (e.g., a color change) rather than animated.
- The click target for the indicator MUST meet minimum touch target size (44x44px on mobile).

### Performance

- Fetching gamification data for the header MUST complete in under 500ms. This fetch MUST NOT block the rendering of the rest of the page.
- The header indicator MUST NOT increase the overall page bundle size by more than 5KB (compressed).
- Real-time updates MUST use existing data flow mechanisms (e.g., revalidation after a mutation). A dedicated WebSocket or polling connection is NOT justified for this feature.

### Architectural Boundaries

- This spec does NOT define the visual design of the indicator (icon style, color, typography). That belongs to SPEC-UX.
- This spec does NOT define new gamification data models. It uses existing UserProgress and PointTransaction data.
- This spec does NOT define the API shape for fetching gamification data. That belongs to SPEC-ARCH.
- This spec does NOT introduce real-time communication infrastructure (WebSockets). Updates happen via standard data revalidation after mutations.

## 6. Success Metrics

- **Visibility**: 100% of authenticated pages display the gamification indicator. Measured by QA audit.
- **Engagement lift**: >= 15% increase in users visiting the full gamification profile page (driven by header click-through). Measured by analytics event comparison.
- **Real-time accuracy**: 100% of in-session point awards reflected in header within 2 seconds of the awarding action. Measured by automated tests.
- **Mobile usability**: Indicator visible and interactive on 375px viewport. Measured by QA mobile test.

## 7. Dependencies

- Gamification engine (PointsEngine, UserProgress model) from Sprint 9 must be functional and returning accurate data.
- Authenticated navbar/header (US-100, Sprint 5) must support additional content items without layout breakage.
- SPEC-PROD-005 (Expedition Completion): the "expedition_complete" points award should trigger a header update.

## 8. Vendor Independence

- This spec describes WHAT the feature does, not HOW it is implemented.
- Must NOT reference specific libraries, frameworks, or vendor products.
- Implementation details belong in the corresponding SPEC-ARCH document.

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-11 | product-owner | Initial draft for Sprint 27. Based on NEW-001 from v0.19.0 manual testing feedback |
