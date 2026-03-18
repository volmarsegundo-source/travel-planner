---
spec-id: SPEC-QA-005
title: "Test Strategy: Meu Atlas Interactive Map"
version: 1.0.0
status: Draft
author: qa-engineer
sprint: 31
reviewers: [tech-lead, architect, ux-designer]
date: 2026-03-17
related-specs: [SPEC-PROD-021, SPEC-UX-021, SPEC-ARCH-013]
---

# SPEC-QA-005: Test Strategy — Meu Atlas Interactive Map

**Versao**: 1.0.0
**Status**: Draft
**Autor**: qa-engineer
**Data**: 2026-03-17
**Sprint**: 31
**Specs relacionadas**: SPEC-PROD-021 (Meu Atlas), SPEC-UX-021 (Map Visual), SPEC-ARCH-013 (Map Library Evaluation)

---

## 1. Risk Assessment

| Risk Area | Likelihood | Impact | Test Priority |
|---|---|---|---|
| Map fails to render on slow networks (4G) | High | Critical | P0 |
| Pin colors do not match trip status | Medium | High | P0 |
| Pin click shows wrong expedition data (data mismatch) | Medium | Critical | P0 |
| Pin popup BOLA: user sees another user's expedition | Low | Critical | P0 |
| Empty state not rendered when user has no trips | Medium | Medium | P1 |
| Filter chips do not correctly filter pins | Medium | High | P1 |
| Mobile pinch-to-zoom breaks pin positioning | Medium | Medium | P1 |
| Dark mode tiles not rendering correctly | Medium | Low | P2 |
| Leaflet SSR crash (window undefined) | High | Critical | P0 |
| Cluster interaction fails with 2+ trips at same destination | Medium | Medium | P1 |
| Coordinate-less trips crash map instead of showing fallback list | Medium | High | P0 |

---

## 2. Test Pyramid

```
        [E2E]          -- 8 critical journeys (render, pin colors, popup, filter, mobile, dark, empty, cluster)
       [Integration]   -- Map data API contract, BOLA enforcement, pin-trip mapping
      [Unit Tests]     -- Pin color resolver, filter logic, popup data formatter, empty state guard, SSR guard
```

### Unit Tests (devs must cover)

- `getPinColor(tripStatus)` -- returns correct color for each of the 3 statuses (yellow=planning, blue=active, green=completed)
- `getPinShape(tripStatus)` -- returns correct shape/size variant per status (accessibility: not color-only)
- `formatPopupData(trip)` -- returns correct destination, dates, phase progress, CTA label
- `filterPinsByStatus(pins, selectedFilter)` -- "Todas", "Concluidas", "Em Progresso", "Planejadas"
- `groupPinsByProximity(pins, radiusKm)` -- clusters pins within 50km radius
- `isCoordinateValid(lat, lon)` -- rejects NaN, null, out-of-range (-90..90, -180..180)
- Guard: `typeof window === "undefined"` prevents Leaflet import on server
- `getEmptyStateMessage(tripCount, filteredCount)` -- correct i18n key for zero trips vs zero filtered results

### Integration Tests

- `/api/map/pins` (or equivalent data fetch) returns pins only for authenticated user (BOLA)
- Pin data includes correct status derived from `TripReadinessService.calculateTripReadiness()`
- Trips without coordinates are excluded from pin array and returned in separate `unlocatedTrips` array
- Filter query param correctly limits response

### E2E Scenarios

See section 3 below.

---

## 3. Critical E2E Scenarios

### E2E-QA005-001: Map renders within 3s on throttled 4G

**Precondition**: User has 3+ trips with coordinates.
**Steps**:
1. Throttle network to "Fast 4G" (1.5 Mbps down, 750 Kbps up, 40ms RTT).
2. Navigate to `/[locale]/meu-atlas`.
3. Start timer on navigation commit.
4. Wait for map tiles + pins to be visible.
**Expected**: Map container and at least 1 pin visible within 3000ms of navigation commit.
**Measures**: Performance.mark before navigation, Performance.mark on first pin render, assert delta < 3000ms.

### E2E-QA005-002: Pin colors match trip status

**Precondition**: User has 3 trips -- one completed (all 6 phases), one active (phases 1-3 done), one planned (only created, phase 1 not completed).
**Steps**:
1. Navigate to `/[locale]/meu-atlas`.
2. Inspect each pin's rendered color.
**Expected**:
- Completed trip pin: green (or gold per SPEC-PROD-021 RF-002)
- Active trip pin: blue with pulse animation class
- Planned trip pin: gray, no animation class
**Assertion**: `data-pin-status` attribute matches trip status. Pin color CSS class matches spec.

### E2E-QA005-003: Click pin shows popup with correct expedition data

**Precondition**: User has a trip to "Paris, France" departing 2026-06-15, currently in phase 4 (4/6 phases complete).
**Steps**:
1. Navigate to `/[locale]/meu-atlas`.
2. Click on the Paris pin.
3. Read popup content.
**Expected**:
- Destination: "Paris, France"
- Dates: "15/06/2026 - [end date]" (or locale-formatted)
- Status badge: "Em Progresso"
- Phase progress: "4/6"
- Primary CTA: "Continuar Expedicao"
- Secondary CTA: "Ver Detalhes"

### E2E-QA005-004: Empty state renders when user has no trips

**Precondition**: New user with zero trips.
**Steps**:
1. Navigate to `/[locale]/meu-atlas`.
**Expected**:
- Map renders (empty world map visible)
- Empty state message: "Voce ainda nao tem expedicoes" (or i18n equivalent)
- CTA button: "Criar Expedicao" linking to trip creation flow
- No pins rendered
- No JavaScript errors in console

### E2E-QA005-005: Filter chips filter pins correctly

**Precondition**: User has 2 completed, 1 active, 1 planned trips.
**Steps**:
1. Navigate to `/[locale]/meu-atlas`.
2. Verify 4 pins visible (default "Todas").
3. Click "Concluidas" filter chip.
4. Verify only 2 pins visible (green/gold).
5. Click "Em Progresso" filter chip.
6. Verify only 1 pin visible (blue).
7. Click "Planejadas" filter chip.
8. Verify only 1 pin visible (gray).
9. Click "Todas" to reset.
10. Verify 4 pins visible again.
**Expected**: Pin count matches filter at every step. Filter chips show active state. URL search params update per filter selection.

### E2E-QA005-006: Mobile pinch-to-zoom and bottom sheet

**Precondition**: User has 2+ trips. Viewport: 375x812 (iPhone SE/13 mini).
**Steps**:
1. Navigate to `/[locale]/meu-atlas` at 375px viewport.
2. Verify map fills viewport.
3. Simulate pinch-to-zoom gesture (or use Leaflet zoom controls).
4. Verify map zooms without breaking pin positions.
5. Tap a pin.
6. Verify bottom sheet slides up (not a centered popup that obscures the map).
7. Verify bottom sheet contains the same data as desktop popup (RF-003).
8. Swipe down or tap outside to dismiss.
**Expected**: Pinch-to-zoom works. Bottom sheet appears on pin tap. Pin positions remain correct after zoom. Touch targets >= 44px.

### E2E-QA005-007: Dark mode renders dark tiles

**Precondition**: User has 1+ trip. System/browser dark mode enabled.
**Steps**:
1. Enable dark mode (prefers-color-scheme: dark).
2. Navigate to `/[locale]/meu-atlas`.
3. Inspect map tile layer.
**Expected**:
- Map tiles use a dark tile provider (CartoDB dark, Stamen toner, or equivalent).
- Pin colors remain distinguishable on dark background.
- Popup/bottom sheet uses dark theme tokens.
- No white flash during tile load.

### E2E-QA005-008: Coordinate-less trips appear in fallback section

**Precondition**: User has 2 trips with coordinates and 1 trip without coordinates (destinationLat/destinationLon are null).
**Steps**:
1. Navigate to `/[locale]/meu-atlas`.
2. Verify 2 pins on map (not 3).
3. Scroll below map.
4. Verify "Expedicoes sem localizacao" section visible.
5. Verify 1 trip listed in fallback section with destination name and link.
**Expected**: Only geocoded trips show pins. Non-geocoded trips appear in text list below map. No crash or error.

---

## 4. Security Test Cases

| ID | Test | Expected | Priority |
|---|---|---|---|
| SEC-QA005-001 | Request map pin data as User A, verify User B's trips are NOT included | 403 or empty pins array for unauthorized trips | P0 |
| SEC-QA005-002 | Manipulate tripId in popup deep-link URL, verify BOLA enforcement | Redirect to 403 or empty popup | P0 |
| SEC-QA005-003 | Verify no PII (email, passport) in pin/popup API response | Response contains only: destination, dates, status, phase count, tripId | P1 |
| SEC-QA005-004 | Verify coordinates are not PII per SPEC-SEC-002 | Lat/lon are geographic, not personal -- no encryption required | P2 |

---

## 5. Accessibility Test Cases

| ID | Test | Expected |
|---|---|---|
| A11Y-QA005-001 | Pin status not conveyed by color alone | Shape or size differs per status (SPEC-PROD-021 RF-002) |
| A11Y-QA005-002 | Popup content reachable via keyboard | Tab to pin, Enter to open popup, Tab through popup content, Escape to close |
| A11Y-QA005-003 | Screen reader announces pin content | aria-label on pin: "[Destination] - [Status]" |
| A11Y-QA005-004 | Map has aria-label and role="application" | Leaflet map container has descriptive label |
| A11Y-QA005-005 | Filter chips are keyboard-navigable | Tab between chips, Enter/Space to toggle |

---

## 6. Performance Targets

| Metric | Target | How to Measure |
|---|---|---|
| Map first meaningful paint | < 3s on 4G | Lighthouse throttled audit |
| Pin render after data load | < 500ms | Performance.mark delta |
| Popup open after click | < 200ms | User-perceived instant |
| Leaflet bundle size | < 40KB gzip (leaflet core) | Bundle analyzer |
| Dynamic import: no leaflet in initial JS bundle | 0 bytes in main chunk | next/dynamic with ssr:false verified in build output |

---

## 7. Eval Dataset Reference

Dataset: `docs/evals/datasets/atlas-map-rendering.json` (10 cases)
Grader: Visual regression + data correctness

---

## 8. Definition of Done (QA perspective)

- [ ] All 8 E2E scenarios automated and passing
- [ ] All 4 security test cases passing
- [ ] All 5 accessibility test cases passing
- [ ] Performance targets met (3s on 4G, < 40KB gzip)
- [ ] Eval dataset passes with trust score >= 0.8
- [ ] No Leaflet code in server-side bundle (dynamic import verified)
- [ ] Dark mode visual regression baseline captured
- [ ] Mobile bottom sheet tested at 375px, 390px, 414px viewports
