# Test Strategy: Dashboard Layout

**Strategy ID**: SPEC-QA-003
**Related Spec**: (SPEC-PROD to be created for Dashboard Rewrite)
**Author**: qa-engineer
**Date**: 2026-03-17
**Sprint**: 30
**Version**: 1.0.0

---

## 1. Risk Assessment

| Risk Area | Likelihood | Impact | Test Priority |
|---|---|---|---|
| Stale trip data shown on dashboard (cache) | Medium | High | P0 |
| Sort by date wrong for cross-timezone trips | Medium | High | P0 |
| Filter loses state on page refresh | Medium | Medium | P1 |
| Responsive breakpoints break card layout | Medium | Medium | P1 |
| New Expedition button hidden or unreachable | Low | High | P1 |
| BOLA: dashboard shows other user's trips | Low | Critical | P0 |
| Empty state CTA leads to wrong page | Low | Medium | P1 |
| Cards truncate long destination names | Medium | Low | P2 |
| Progress bar in card shows wrong percentage | Medium | High | P1 |
| i18n: dates formatted wrong for locale | Medium | Medium | P1 |

---

## 2. Test Pyramid

```
        [E2E]          -- 5 critical journeys (cards, sort, filter, empty, responsive)
       [Integration]   -- Trip list endpoint, sort/filter params, BOLA
      [Unit Tests]     -- Card component, date formatting, progress calc, filter logic
```

**Unit tests** (devs must cover):
- `TripCard` component — renders destination, dates, progress correctly
- `formatTripDates(startDate, endDate, locale)` — locale-aware formatting
- `calculateProgress(phases)` — correct percentage from phase completion data
- `sortTrips(trips, sortBy)` — date ascending/descending, alphabetical
- `filterTrips(trips, status)` — active, completed, all
- `getResponsiveColumns(viewportWidth)` — 1 at <640, 2 at 640-1024, 3 at >1024

**Integration tests**:
- `/api/trips` or Server Action returns only current user's trips (BOLA)
- Sort parameter applied correctly at DB level (not just client sort)
- Soft-deleted trips excluded from dashboard
- Trips without dates sort to end (not to top)

**E2E** (automate):
- E2E-DASH-001: Dashboard shows correct trip cards with data
- E2E-DASH-002: Sort by date reorders cards
- E2E-DASH-003: Filter Active/Completed shows correct subset
- E2E-DASH-004: Empty state with CTA for new user
- E2E-DASH-005: Responsive layout at 3 breakpoints

---

## 3. Critical E2E Scenarios

### Scenario E2E-DASH-001: Trip Cards Display
**ID**: E2E-DASH-001
**Priority**: P0
**Persona**: @leisure-solo (has 3 trips in various states)
**Preconditions**: Authenticated user with seeded trips

#### Steps
1. Navigate to /expeditions -> page loads
2. Trip cards visible in grid layout
3. Each card shows: destination name, date range, progress indicator
4. Card for completed trip shows 100% progress or "Completed" badge
5. Card for in-progress trip shows partial progress bar
6. Click a card -> navigates to trip detail page (correct trip ID in URL)

#### Edge Cases
- Trip with no destination set -> card shows "Destination not set" placeholder
- Trip with no dates -> card shows "Dates not set"
- Very long destination name (e.g., "Sao Jose dos Campos, Sao Paulo, Brazil") -> truncated with ellipsis
- Trip created seconds ago -> appears immediately (no stale cache)

#### Test Data
- User: `dashboard-test@playwright.invalid`
- Trips: "Paris Adventure" (completed, July 2026), "Tokyo Discovery" (in-progress, Aug 2026), "Rio Planning" (planned, no dates)

#### Pass Criteria
- [ ] All 3 trip cards visible
- [ ] Destination, dates, and progress shown correctly per card
- [ ] Click navigates to correct `/expedition/[tripId]` URL
- [ ] Zero console errors

---

### Scenario E2E-DASH-002: Sort by Date
**ID**: E2E-DASH-002
**Priority**: P1
**Persona**: @leisure-solo (3+ trips with different dates)
**Preconditions**: Dashboard loaded with trip cards

#### Steps
1. Default sort: most recent first (or upcoming first)
2. Change sort to "Oldest first" -> cards reorder
3. First card is now the trip with earliest date
4. Change sort to "Newest first" -> first card is most recent trip

#### Edge Cases
- Trip with no date set -> sorts to bottom regardless of sort direction
- Two trips with same date -> stable sort (order preserved)
- Switching sort rapidly -> no race condition or flicker

#### Pass Criteria
- [ ] Sort control is visible and interactive
- [ ] Card order changes correctly on sort change
- [ ] Trips without dates consistently sort last

---

### Scenario E2E-DASH-003: Status Filter
**ID**: E2E-DASH-003
**Priority**: P1
**Persona**: @leisure-solo (mix of active and completed trips)
**Preconditions**: Dashboard with both active and completed trips

#### Steps
1. Default: "All" filter active, all trips visible
2. Click "Active" filter -> only in-progress/planned trips shown
3. Completed trip card is hidden
4. Click "Completed" filter -> only completed trips shown
5. Active trip cards are hidden
6. Click "All" -> all trips visible again

#### Edge Cases
- All trips are completed -> "Active" filter shows empty state
- Filter persists on page refresh (if specified in spec, otherwise verify it resets)
- URL reflects current filter state (query param) for shareability

#### Pass Criteria
- [ ] Filter buttons/tabs are visible
- [ ] Correct subset shown for each filter
- [ ] Card count matches expected count per filter
- [ ] Empty state shown when filter yields 0 results

---

### Scenario E2E-DASH-004: Empty State
**ID**: E2E-DASH-004
**Priority**: P1
**Persona**: @leisure-solo (brand new user, 0 trips)
**Preconditions**: Authenticated user with no expedition data

#### Steps
1. Navigate to /expeditions -> empty state displayed
2. Empty state shows illustration/icon, message, and "New Expedition" CTA
3. Click CTA -> navigates to expedition creation flow
4. After creating trip and returning -> empty state replaced by trip card

#### Pass Criteria
- [ ] No broken layout (no empty grid)
- [ ] CTA button visible and navigates correctly
- [ ] Message is in correct locale (pt-BR or en)

---

### Scenario E2E-DASH-005: Responsive Layout
**ID**: E2E-DASH-005
**Priority**: P1
**Persona**: @leisure-solo
**Preconditions**: Dashboard loaded with 4+ trip cards

#### Steps
1. Desktop (1280px) -> 3 columns of cards
2. Tablet (768px) -> 2 columns of cards
3. Mobile (375px) -> 1 column of cards
4. At each breakpoint: cards fill available width, no horizontal scroll
5. New Expedition button visible at all breakpoints

#### Pass Criteria
- [ ] Column count matches breakpoint
- [ ] No horizontal overflow at any breakpoint
- [ ] Cards are equal width within their row
- [ ] New Expedition button accessible at all sizes

---

## 4. Manual Exploratory Testing Areas

- **Rapid trip creation/deletion**: Create and delete trips rapidly while dashboard is open. Verify real-time updates without stale state.
- **Slow network**: Verify skeleton loaders during data fetch, not blank page.
- **100+ trips**: Performance and scroll behavior with large trip count. Verify pagination or virtual scrolling if implemented.
- **Dark mode**: Card contrast, progress bar visibility, empty state illustration adaptation.
- **RTL considerations**: If future locale support adds Arabic/Hebrew.

---

## 5. Performance Targets

| Metric | Target | Test Method |
|---|---|---|
| Dashboard FCP | < 1,500ms on 4G | Lighthouse via Playwright |
| Trip list fetch (10 trips) | < 200ms P95 | Integration test timing |
| Trip list fetch (100 trips) | < 500ms P95 | Integration test timing |
| Filter/sort client-side rerender | < 100ms | Playwright performance timing |
| Card image lazy load | Below fold images deferred | Intersection observer check |

---

## 6. Test Data Requirements

### Synthetic Trip Data
- User with 0 trips (empty state testing)
- User with 3 trips (standard case: completed, in-progress, planned)
- User with 10+ trips (sort/filter testing)
- All using `@playwright.invalid` email domain

### Date Edge Cases
- Trip spanning year boundary (Dec 31 - Jan 2)
- Trip with start date only (no end date)
- Trip with dates in the past (completed)
- Trip with dates far in the future (2027+)

---

## 7. Out of Scope

| Item | Reason |
|---|---|
| Trip card drag-and-drop reordering | Not in Sprint 30 scope |
| Infinite scroll / pagination | Only if spec requires it |
| Dashboard analytics/stats section | Separate feature |
| Trip sharing from dashboard | Not in current spec |

---

## 8. AC-to-Test Traceability Matrix

| Expected AC | Test ID(s) | Test Type | Status |
|---|---|---|---|
| Cards show destination, dates, progress | E2E-DASH-001 | E2E + Unit | Planned |
| Sort by date works | E2E-DASH-002 | E2E + Unit | Planned |
| Filter Active shows only active | E2E-DASH-003 | E2E | Planned |
| Filter Completed shows only completed | E2E-DASH-003 | E2E | Planned |
| Empty state with CTA | E2E-DASH-004 | E2E | Planned |
| 1/2/3 columns at breakpoints | E2E-DASH-005 | E2E | Planned |
| New Expedition button works | E2E-DASH-001, E2E-DASH-004 | E2E | Planned |
| BOLA: only own trips | INT-DASH-BOLA | Integration | Planned |

---

## Historico de Alteracoes

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-17 | qa-engineer | Versao inicial — Sprint 30 planning |
