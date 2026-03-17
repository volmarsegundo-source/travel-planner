# Test Strategy: Map Rendering

**Strategy ID**: SPEC-QA-002
**Related Spec**: (SPEC-PROD to be created for Map feature)
**Author**: qa-engineer
**Date**: 2026-03-17
**Sprint**: 30
**Version**: 1.0.0

---

## 1. Risk Assessment

| Risk Area | Likelihood | Impact | Test Priority |
|---|---|---|---|
| Map tiles fail to load (provider outage) | Low | High | P0 |
| Pins placed at wrong coordinates | Medium | Critical | P0 |
| Click on pin shows wrong trip data | Low | Critical | P0 |
| Pinch-to-zoom broken on mobile | Medium | Medium | P1 |
| Map JS bundle bloats page load | Medium | High | P1 |
| BOLA: map shows other user's trip pins | Low | Critical | P0 |
| Empty state not shown when zero trips | Low | Medium | P1 |
| Accessibility: pins not navigable by keyboard | Medium | Medium | P1 |
| Completed vs in-progress pin colors wrong | Medium | Medium | P1 |
| Map does not render inside SSR (hydration mismatch) | Medium | High | P1 |

---

## 2. Test Pyramid

```
        [E2E]          -- 4 critical journeys (load, pins, click, empty)
       [Integration]   -- Pin data API, coordinate validation, BOLA
      [Unit Tests]     -- Pin color logic, popup card data mapping, coordinate utils
```

**Unit tests** (devs must cover):
- `getPinColor(tripStatus)` — gold for completed, blue for in-progress, grey for planned
- `getPinAnimation(tripStatus)` — pulse class for in-progress only
- `formatPopupCard(trip)` — destination, dates, progress percentage
- `coordinatesToBounds(pins[])` — correct viewport bounds for pin set
- `shouldShowEmptyState(trips)` — true when 0 trips

**Integration tests**:
- Map data endpoint returns only current user's trips (BOLA)
- Coordinates are valid (lat -90..90, lon -180..180) for all persisted trips
- Soft-deleted trips do not appear as pins

**E2E** (automate):
- E2E-MAP-001: Map loads with correct pin count for user's trips
- E2E-MAP-002: Pin click opens popup with correct trip info
- E2E-MAP-003: Empty state shown for user with zero trips
- E2E-MAP-004: Completed trip pin is visually distinct from in-progress

---

## 3. Critical E2E Scenarios

### Scenario E2E-MAP-001: Map Load and Pin Rendering
**ID**: E2E-MAP-001
**Priority**: P0
**Persona**: @leisure-solo (3 trips: 1 completed, 1 in-progress, 1 planned)
**Preconditions**: Authenticated user with seeded trip data including coordinates

#### Steps
1. Navigate to expeditions page -> map component visible
2. Map tiles load within 3s on 4G throttle
3. 3 pins visible on map
4. Completed trip pin: gold color
5. In-progress trip pin: blue color with pulse animation
6. Planned trip pin: default color (no pulse)

#### Edge Cases
- User has trips without coordinates -> those trips have no pin (no error)
- User has 50+ trips -> map adjusts bounds to fit all pins
- Map provider slow -> loading skeleton shown during tile fetch

#### Test Data
- User: `map-test@playwright.invalid`
- Trips: Paris (completed, lat 48.8566, lon 2.3522), Tokyo (in-progress, lat 35.6762, lon 139.6503), Rio (planned, lat -22.9068, lon -43.1729)

#### Pass Criteria
- [ ] Map tiles load within 3s
- [ ] Correct number of pins rendered
- [ ] Pin colors match trip status
- [ ] Pulse animation on in-progress pin only
- [ ] Zero console errors

---

### Scenario E2E-MAP-002: Pin Click Popup
**ID**: E2E-MAP-002
**Priority**: P0
**Persona**: @leisure-solo
**Preconditions**: Map loaded with at least 1 pin

#### Steps
1. Click on Paris pin -> popup card appears
2. Popup shows: destination "Paris", trip dates, progress percentage
3. Popup has "View" link/button -> clicking navigates to trip detail page
4. Click elsewhere on map -> popup closes

#### Edge Cases
- Click two pins in succession -> first popup closes, second opens
- Popup on edge of viewport -> repositions to stay visible
- Trip with missing dates -> popup shows "Dates not set" or similar

#### Pass Criteria
- [ ] Popup contains correct trip name and dates
- [ ] Progress percentage matches trip's actual completion
- [ ] Navigation link goes to correct trip ID
- [ ] Only one popup visible at a time

---

### Scenario E2E-MAP-003: Empty State
**ID**: E2E-MAP-003
**Priority**: P1
**Persona**: @leisure-solo (new user, 0 trips)
**Preconditions**: Authenticated user with no trips

#### Steps
1. Navigate to expeditions page -> map area shows empty state
2. Empty state shows illustration and CTA text
3. CTA button leads to "New Expedition" flow

#### Pass Criteria
- [ ] No map tiles rendered (or map hidden)
- [ ] Illustration and message visible
- [ ] CTA navigates to expedition creation

---

### Scenario E2E-MAP-004: Accessibility - Pin Aria Labels
**ID**: E2E-MAP-004
**Priority**: P1
**Persona**: @accessibility-user
**Preconditions**: Map loaded with pins

#### Steps
1. Tab to map area -> focus trapped within map
2. Each pin has `aria-label` with format "Trip to [Destination], [status]"
3. Screen reader announces pin destination and status

#### Edge Cases
- Pin cluster (overlapping pins) -> accessible label for cluster "N trips in this area"

#### Pass Criteria
- [ ] Every pin has descriptive `aria-label`
- [ ] Tab navigation reaches pins
- [ ] Enter on focused pin opens popup

---

## 4. Manual Exploratory Testing Areas

- **Tile provider reliability**: Test with slow/no internet. Verify graceful degradation (placeholder image or message, not blank div).
- **Touch gestures on real devices**: Pinch-to-zoom, double-tap zoom, pan. Playwright cannot fully emulate multi-touch.
- **High-DPI rendering**: Retina displays may show blurry tiles if wrong tile resolution served.
- **Large dataset (50+ pins)**: Performance and visual clustering behavior.
- **Dark mode**: Map tiles and pin colors must be visible in dark theme.

---

## 5. Performance Targets

| Metric | Target | Test Method |
|---|---|---|
| Map tiles first paint | < 3s on 4G | Playwright with network throttle |
| Map JS bundle size | < 100KB gzipped | Build output analysis |
| Pin render time (10 pins) | < 200ms after data fetch | Performance.mark timing |
| Popup open latency | < 100ms | E2E timing |

---

## 6. Test Data Requirements

### Trip Fixtures for Map Testing
- 3 trips with valid coordinates (Paris, Tokyo, Rio de Janeiro)
- 1 trip without coordinates (should not crash map)
- Statuses: completed (gold pin), in-progress (blue pulse), planned (default)
- All using synthetic user `map-test@playwright.invalid`

### Coordinate Edge Cases
- Antimeridian crossing (Fiji: lat -17.7134, lon 177.9) -> pin renders correctly
- Equator (Quito: lat -0.1807, lon -78.4678)
- High latitude (Reykjavik: lat 64.1466, lon -21.9426)

---

## 7. Out of Scope

| Item | Reason |
|---|---|
| Offline map tiles | No spec requires offline map support |
| Custom map themes/skins | Deferred to future sprint |
| Directions/routing between pins | Not in Sprint 30 scope |
| Map print layout | Covered under Summary Report spec |

---

## 8. AC-to-Test Traceability Matrix

| Expected AC | Test ID(s) | Test Type | Status |
|---|---|---|---|
| Map loads within 3s | E2E-MAP-001 | E2E | Planned |
| Trip pins at correct locations | E2E-MAP-001 | E2E + Integration | Planned |
| Gold pin for completed | E2E-MAP-001, E2E-MAP-004 | E2E + Unit | Planned |
| Blue pulse for in-progress | E2E-MAP-001 | E2E + Unit | Planned |
| Pin click shows popup | E2E-MAP-002 | E2E | Planned |
| Empty state illustration | E2E-MAP-003 | E2E | Planned |
| Pinch-to-zoom on mobile | Manual | Exploratory | Planned |
| Pins have aria-labels | E2E-MAP-004 | E2E | Planned |
| BOLA: no cross-user pins | INT-MAP-BOLA | Integration | Planned |

---

## Historico de Alteracoes

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-17 | qa-engineer | Versao inicial — Sprint 30 planning |
