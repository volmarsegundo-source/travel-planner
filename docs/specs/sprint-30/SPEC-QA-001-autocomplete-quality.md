# Test Strategy: Autocomplete Quality

**Strategy ID**: SPEC-QA-001
**Related Spec**: SPEC-PROD-017 (Destination Autocomplete Rewrite)
**Author**: qa-engineer
**Date**: 2026-03-17
**Sprint**: 30
**Version**: 1.0.0

---

## 1. Risk Assessment

| Risk Area | Likelihood | Impact | Test Priority |
|---|---|---|---|
| Wrong city selected (ambiguous results) | High | Critical | P0 |
| Fallback offline returns stale or wrong data | Medium | High | P0 |
| IATA code search returns wrong airport | Medium | High | P0 |
| Debounce fails, excessive API calls | Medium | Medium | P1 |
| Mobile overlay obscured by virtual keyboard | Medium | High | P1 |
| ARIA attributes missing or incorrect | Medium | Medium | P1 |
| Recent searches leak between users (BOLA) | Low | Critical | P0 |
| Flag emoji not rendered on Windows/older browsers | Medium | Low | P2 |
| i18n: country names not translated | Medium | Medium | P1 |
| API timeout >3s without fallback activation | Low | High | P1 |

---

## 2. Test Pyramid

```
        [E2E]          -- 5 critical journeys (search, select, recent, mobile, keyboard)
       [Integration]   -- API proxy contract, recent searches persistence, fallback
      [Unit Tests]     -- debounce logic, flag resolver, result formatting, ARIA state
```

**Unit tests** (devs must cover):
- `debounce(300ms)` — no call under 2 chars, single call after pause
- `formatResult(locale, city, state, country, iso2)` — correct string for both locales
- `getCountryFlag(iso2)` — returns correct emoji or empty for invalid codes
- `filterOfflineCities(query)` — fuzzy match against 200-city list
- `recentSearches.add / remove / list` — max 5, dedup, order
- ARIA attribute state machine (`expanded`, `activedescendant`)

**Integration tests**:
- `/api/destinations/search?q=...&locale=...` contract (request/response schema)
- Recent searches CRUD — persisted per userId, isolated between users
- Fallback activation when upstream returns 500 or times out >3s
- Redis cache behavior for repeated queries

**E2E** (automate):
- E2E-AC-001: Search "Sao Paulo" in pt-BR -> first result matches, flag present
- E2E-AC-002: Search "GRU" -> Guarulhos airport result
- E2E-AC-003: Select destination -> field shows canonical name, metadata stored
- E2E-AC-004: Keyboard navigation (ArrowDown, Enter, Escape)
- E2E-AC-005: Mobile overlay opens at 375px viewport, Cancel closes it

---

## 3. Critical E2E Scenarios

### Scenario E2E-AC-001: City Search Accuracy
**ID**: E2E-AC-001
**Priority**: P0
**Persona**: @leisure-solo
**Preconditions**: Authenticated user on Phase 1 Step 2 (Destination)

#### Steps
1. Type "Sao Paulo" in destination field -> debounce fires after 300ms
2. Results dropdown appears -> first result contains "Sao Paulo" with BR flag
3. Result line 2 shows "SP, Brasil" (pt-BR) or "SP, Brazil" (en)
4. Click first result -> field shows "Sao Paulo" (no flag emoji in field)
5. Form metadata contains `{ lat: ~-23.55, lon: ~-46.63, iso2: "BR" }`

#### Edge Cases
- Search "Sao Paulo" (without cedilla) -> still matches "Sao Paulo"
- Search "SP" (2 chars) -> triggers search (minimum met)
- Search "S" (1 char) -> no API call, no dropdown
- Search "Sao Paulo, Argentina" -> returns the Argentine city, not Brazil

#### Test Data
- Traveler: `autocomplete-test@playwright.invalid`, userId: `test-user-ac-001`
- Locale: pt-BR and en (run in both)

#### Pass Criteria
- [ ] First result city name contains "Sao Paulo"
- [ ] First result country code is "BR"
- [ ] Flag emoji visible in dropdown (not in input after selection)
- [ ] Metadata (lat/lon/iso2) passed to form correctly
- [ ] Zero console errors

---

### Scenario E2E-AC-002: IATA Airport Code Search
**ID**: E2E-AC-002
**Priority**: P0
**Persona**: @business-traveler
**Preconditions**: Authenticated user on Phase 1 Step 2

#### Steps
1. Type "GRU" in destination field -> debounce fires
2. Results dropdown appears -> contains Guarulhos airport
3. Result has airport indicator (not plain city)
4. Select result -> metadata includes airport data

#### Edge Cases
- "CDG" -> Charles de Gaulle (France)
- "JFK" -> John F. Kennedy (USA)
- "gru" (lowercase) -> still matches
- "XYZ" (invalid IATA) -> no results or only city matches

#### Pass Criteria
- [ ] Airport result distinguishable from city result
- [ ] IATA code match returns correct airport
- [ ] Case-insensitive matching works

---

### Scenario E2E-AC-003: Recent Searches
**ID**: E2E-AC-003
**Priority**: P1
**Persona**: @leisure-solo
**Preconditions**: Authenticated user, has completed at least 1 prior search+selection

#### Steps
1. Search and select "Madrid" -> stored as recent search
2. Navigate away from Phase 1, then return
3. Focus empty destination field -> "Buscas recentes" / "Recent searches" label shown
4. "Madrid" appears in recent list
5. Click "Madrid" from recents -> field populated immediately (no API call)

#### Edge Cases
- 6th search pushes out oldest (FIFO, max 5)
- Remove individual recent entry -> persisted after page reload
- "Clear all" button -> recents empty
- User B cannot see User A's recent searches (BOLA)

#### Pass Criteria
- [ ] Recent searches appear when field focused and empty
- [ ] Max 5 entries respected
- [ ] Individual removal works and persists
- [ ] Cross-user isolation verified

---

### Scenario E2E-AC-004: Keyboard Navigation
**ID**: E2E-AC-004
**Priority**: P1
**Persona**: @accessibility-user
**Preconditions**: Authenticated user, results dropdown visible

#### Steps
1. Type "London" -> results appear
2. Press ArrowDown -> first result highlighted, `aria-activedescendant` updated
3. Press ArrowDown again -> second result highlighted
4. Press ArrowUp -> back to first result
5. Press Enter -> first result selected, dropdown closes, field populated
6. Repeat: type "Paris" -> results appear
7. Press Escape -> dropdown closes, field retains typed text "Paris" (no selection)

#### Pass Criteria
- [ ] ArrowDown/ArrowUp cycle through results correctly
- [ ] Enter selects highlighted item
- [ ] Escape closes without selection
- [ ] `aria-activedescendant` tracks highlighted item
- [ ] `role="combobox"`, `role="listbox"`, `role="option"` present
- [ ] `aria-expanded` toggles correctly

---

### Scenario E2E-AC-005: Mobile Overlay
**ID**: E2E-AC-005
**Priority**: P1
**Persona**: @leisure-solo (mobile)
**Preconditions**: Authenticated user, viewport 375x667

#### Steps
1. Navigate to Phase 1 Step 2 at viewport 375px
2. Tap destination field -> full-screen overlay opens
3. Overlay shows search input at top, "Cancelar"/"Cancel" button visible
4. Type "Tokyo" -> results appear below search field
5. Each result row height >= 44px (touch target)
6. Tap first result -> overlay closes, field populated
7. Re-open overlay -> tap "Cancelar" -> overlay closes, field unchanged

#### Edge Cases
- Rotate device while overlay open -> overlay adjusts
- Virtual keyboard open -> results still visible above keyboard
- Swipe down on results -> scrolls, does not close overlay

#### Pass Criteria
- [ ] Overlay covers full screen at <=640px viewport
- [ ] Cancel button visible and functional
- [ ] Touch target >= 44px per result row
- [ ] Results visible above virtual keyboard area
- [ ] Overlay does not interfere with field value on cancel

---

## 4. Manual Exploratory Testing Areas

- **Nominatim API variability**: Different result ordering for same query on different days. Cannot be automated reliably due to external dependency.
- **Flag emoji rendering**: Visual verification across Windows 10, macOS, iOS, Android. Emoji may render as text on older systems.
- **Virtual keyboard interaction on real devices**: Playwright mobile emulation does not replicate virtual keyboard behavior accurately. Must test on physical iOS and Android devices.
- **Slow network conditions**: Throttle to 3G and verify fallback activates gracefully without jarring UI transitions.
- **Accented characters and non-Latin scripts**: Arabic/Japanese/Korean city names. Nominatim behavior is unpredictable for these.

---

## 5. Performance Targets

| Metric | Target | Test Method |
|---|---|---|
| Debounce-to-results (excluding network) | < 300ms | Playwright performance.mark timing |
| API proxy `/api/destinations/search` P95 | < 500ms | k6 load test, 50 concurrent users |
| Fallback activation on API timeout | < 3s total | Integration test with mock timeout |
| Offline city list filter time (200 cities) | < 50ms | Unit test with performance.now() |
| Mobile overlay open-to-interactive | < 200ms | Playwright mobile viewport timing |

---

## 6. Test Data Requirements

### Synthetic Traveler Profiles
- `ac-test-solo@playwright.invalid` — solo traveler, pt-BR locale
- `ac-test-biz@playwright.invalid` — business traveler, en locale
- `ac-test-a11y@playwright.invalid` — keyboard-only user, en locale

### Search Queries (eval dataset cross-reference)
- 20 queries covering: accented chars, IATA codes, partial matches, ambiguous cities, non-Latin
- See `docs/evals/datasets/autocomplete-quality.json` for full dataset

### Recent Searches Test Data
- Pre-seeded: 5 recent searches for one test user, 0 for another
- Cross-user: two test users, each with different recent searches

---

## 7. Out of Scope

| Item | Reason |
|---|---|
| Google Places API testing | Provider decision deferred to SPEC-ARCH-XXX |
| Multi-destination field | Not in SPEC-PROD-017 v1 scope |
| GPS-based auto-detection | Out of scope per spec |
| Real device testing (automation) | Manual exploratory only; Playwright mobile emulation used for E2E |
| Load testing >100 concurrent users | MVP target is 100; will revisit in Sprint 31 |

---

## 8. AC-to-Test Traceability Matrix

| Spec AC | Test ID(s) | Test Type | Status |
|---|---|---|---|
| AC-001 (search "rio", results with flag) | E2E-AC-001, AQ-001..AQ-005 | E2E + Eval | Planned |
| AC-002 (IATA "GRU") | E2E-AC-002, AQ-006..AQ-008 | E2E + Eval | Planned |
| AC-003 (recent searches) | E2E-AC-003 | E2E | Planned |
| AC-004 (API fallback) | INT-AC-004 | Integration | Planned |
| AC-005 (mobile overlay) | E2E-AC-005 | E2E | Planned |
| AC-006 (cancel overlay) | E2E-AC-005 step 7 | E2E | Planned |
| AC-007 (ArrowDown + Enter) | E2E-AC-004 | E2E | Planned |
| AC-008 (Escape closes) | E2E-AC-004 step 7 | E2E | Planned |
| AC-009 (field shows canonical name) | E2E-AC-001 step 4, E2E-AC-003 step 5 | E2E | Planned |
| AC-010 (1 char = no call) | Unit debounce test | Unit | Planned |
| AC-011 (recents persist) | E2E-AC-003 | E2E | Planned |
| AC-012 (screen reader) | E2E-AC-004 ARIA checks | E2E | Planned |
| AC-013 (3s timeout -> fallback) | INT-AC-004 | Integration | Planned |
| AC-014 (remove recent) | E2E-AC-003 step edge case | E2E | Planned |

---

## Historico de Alteracoes

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-17 | qa-engineer | Versao inicial — Sprint 30 planning |
