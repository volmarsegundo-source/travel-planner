# EDD Sprint 30 Plan — Atlas Travel Planner

**Document ID**: EDD-SPRINT-30-PLAN
**Author**: qa-engineer
**Date**: 2026-03-17
**Version**: 1.0.0
**Status**: Draft
**Related**: SPEC-PROD-017, SPEC-QA-001..004, TRUST-SCORE.md, EVAL-DRIVEN-DEVELOPMENT.md

---

## 1. Sprint 30 Scope

Sprint 30 delivers 4 major rewrites focused on improving UX quality, autocomplete accuracy, and overall trust score from ~0.84 to 0.90+.

| Feature | Spec | QA Spec | Eval Dataset | Grader |
|---|---|---|---|---|
| Autocomplete Rewrite | SPEC-PROD-017 | SPEC-QA-001 | autocomplete-quality.json (20 cases) | autocomplete-quality.ts |
| Map Rendering | TBD (SPEC-PROD) | SPEC-QA-002 | map-rendering.json (10 cases) | (code grader, in E2E) |
| Dashboard Layout | TBD (SPEC-PROD) | SPEC-QA-003 | dashboard-layout.json (8 cases) | navigation-update.ts |
| Summary Report | TBD (SPEC-PROD) | SPEC-QA-004 | summary-completeness.json (6 cases) | summary-completeness.ts |

**Total eval test cases**: 44 across 4 datasets.

---

## 2. Trust Score Targets

### Current Baseline (v0.24.0 estimates)

| Category | Weight | Current | Target | Delta |
|---|---|---|---|---|
| Safety | 30% | 0.95 | 0.95+ | Maintain |
| Accuracy | 25% | 0.80 | 0.90 | +0.10 |
| Performance | 20% | 0.85 | 0.90 | +0.05 |
| UX | 15% | 0.70 | 0.85 | +0.15 |
| i18n | 10% | 0.90 | 0.90+ | Maintain |
| **Composite** | | **~0.84** | **0.90+** | **+0.06** |

### Trust Score Calculation at Target

```
Trust = (0.95 * 0.30) + (0.90 * 0.25) + (0.90 * 0.20) + (0.85 * 0.15) + (0.90 * 0.10)
Trust = 0.285 + 0.225 + 0.180 + 0.1275 + 0.090
Trust = 0.9075
```

This meets the production threshold (>= 0.90).

### Improvement Drivers

| Target | Improvement Driver | Eval Measurement |
|---|---|---|
| Accuracy 0.80 -> 0.90 | Better autocomplete (IATA, flags, disambiguation) | EVAL-UX-002 (autocomplete-quality.json) |
| UX 0.70 -> 0.85 | Dashboard cards, map pins, responsive layout | EVAL-UX-004, EVAL-UX-005 |
| Performance 0.85 -> 0.90 | Faster map tiles, debounce optimization, cold start fixes | EVAL-PERF timing graders |

### Degradation Triggers to Monitor

| Trigger | Condition | Risk in Sprint 30 |
|---|---|---|
| Safety floor breach | Any Safety sub-metric < 0.90 | LOW — no security-impacting changes planned (except BOLA for new endpoints) |
| UX category floor | UX < 0.50 | LOW — UX is being improved, not degraded |
| Regression > 0.10 | Trust Score drops > 0.10 from v0.24.0 | MEDIUM — map library addition could impact bundle/performance |
| Zero-tolerance | PII leak or injection bypass | LOW — no new AI features, existing guards unchanged |

---

## 3. CI/CD Eval Gates

### 3.1 PR Gate (every pull request)

```yaml
pr-gate:
  required:
    trust-score: ">= 0.80"
    unit-tests: "0 failures"
    build: "clean (no warnings treated as errors)"
  evals:
    - navigation-basic       # existing, must not regress
    - autocomplete-basic     # subset: AQ-001, AQ-004, AQ-005, AQ-015 (4 cases)
  blocking: true
  timeout: "5 minutes"
  cost: "$0 (code graders only)"
```

**Rationale**: PR gate runs only code graders (zero AI cost). Subset of 4 autocomplete cases covers critical paths (correct city, no-call on empty, no-call on 1 char, no-results). Full eval suite runs on staging.

### 3.2 Staging Gate (merge to staging branch)

```yaml
staging-gate:
  required:
    trust-score: ">= 0.85"
    e2e-tests: ">= 95% pass rate (116/122 minimum)"
  evals:
    - navigation             # full navigation eval
    - autocomplete-quality   # all 20 cases
    - map-rendering          # all 10 cases
    - dashboard-layout       # all 8 cases
    - summary-completeness   # all 6 cases
  blocking: true
  timeout: "15 minutes"
  cost: "$0 (all code graders)"
  flake-policy: "1 retry per failed eval case before blocking"
```

**Rationale**: Staging gate runs the full eval suite (44 cases). All are code graders, so no AI cost. E2E pass rate threshold is 95% to allow for known flakes (Nominatim API on staging).

### 3.3 Production Gate (deploy to production)

```yaml
production-gate:
  required:
    trust-score: ">= 0.90"
    e2e-tests: "100% pass rate (excluding known flakes documented in QA-REL-030)"
    manual-verification: "yes — qa-engineer sign-off required"
  evals:
    - all-staging-evals      # must have passed staging gate
    - security-evals         # EVAL-SEC-001 (injection), EVAL-SEC-003 (BOLA)
  additional:
    - "qa-engineer sign-off document: QA-REL-030"
    - "No open P0 bugs"
    - "No Safety sub-metric < 0.90"
  blocking: true
  rollback-trigger: "trust-score < 0.70 in production monitoring"
```

**Rationale**: Production requires manual QA sign-off. Trust score must be >= 0.90. Rollback is automatic if trust score drops below 0.70.

---

## 4. Eval Dataset Summary

### 4.1 autocomplete-quality.json (EVAL-UX-002)

| Dimension | Cases | Coverage |
|---|---|---|
| City search accuracy | AQ-001, AQ-002, AQ-003, AQ-011, AQ-017 | 5 major cities (BR, US, GB, JP, BR) |
| IATA code search | AQ-006, AQ-007, AQ-008 | 3 airports (GRU, CDG, JFK) |
| Accented characters | AQ-009, AQ-010 | Umlaut (Zurich), missing accent (Bogota) |
| Ambiguous cities | AQ-012, AQ-013 | Springfield (10+ matches), San Jose (US/CR) |
| Edge cases | AQ-004, AQ-005, AQ-014, AQ-015 | Empty, 1 char, XSS, nonexistent city |
| Performance | AQ-016 | Debounce verification |
| Mobile | AQ-018 | Touch target >= 44px |
| Accessibility | AQ-019 | Keyboard navigation ArrowDown |
| Landmark search | AQ-020 | Patagonia (region, not city) |

**Total**: 20 test cases. Pass threshold: 0.85.

### 4.2 map-rendering.json (EVAL-UX-004)

| Dimension | Cases | Coverage |
|---|---|---|
| Empty state | MR-001 | Zero trips |
| Pin colors by status | MR-002, MR-003 | Completed (gold), in-progress (blue pulse) |
| Multiple pins | MR-004 | 3 pins, bounds fitting |
| Null coordinates | MR-005 | Trip without lat/lon |
| Popup interaction | MR-006 | Open/close, data accuracy |
| Performance | MR-007 | 3s load target on 4G |
| Mobile | MR-008 | Pinch-to-zoom, responsive |
| Accessibility | MR-009 | aria-labels on pins |
| Edge coordinates | MR-010 | Antimeridian (Fiji) |

**Total**: 10 test cases. Pass threshold: 0.80.

### 4.3 dashboard-layout.json (EVAL-UX-005)

| Dimension | Cases | Coverage |
|---|---|---|
| Card content by status | DL-001, DL-002, DL-003 | Completed, in-progress, planned |
| Long text handling | DL-004 | Truncation with ellipsis |
| Empty state | DL-005 | Zero trips, CTA |
| Responsive columns | DL-006 | 3 breakpoints |
| Filters | DL-007 | Active, Completed, All |
| Sorting | DL-008 | Newest/oldest, null-date handling |

**Total**: 8 test cases. Pass threshold: 0.80.

### 4.4 summary-completeness.json (EVAL-UX-006)

| Dimension | Cases | Coverage |
|---|---|---|
| Phase 1-6 data sections | SC-001 through SC-006 | One case per phase |
| Booking code masking | SC-004 | Transport + accommodation codes |
| Locale formatting | SC-001, SC-003 | pt-BR date/text formatting |
| Data accuracy vs DB | All cases | `data_matches_db` assertion |

**Total**: 6 test cases. Pass threshold: 0.85.

---

## 5. Grader Specifications

### 5.1 autocomplete-quality.ts (New)

| Dimension | Weight | Metric | Method |
|---|---|---|---|
| Accuracy | 0.40 | First result matches expected city/country | String containment + ISO2 match |
| Performance | 0.30 | Response < 300ms, debounce API call count | Timing measurement + request counting |
| Format | 0.30 | Flag emoji present, secondary text, result count | DOM inspection |
| Mobile | 1.00 (when applicable) | Touch target >= 44px | Bounding box measurement |
| Accessibility | 1.00 (when applicable) | aria-activedescendant, highlight state | ARIA attribute check |

**Location**: `docs/evals/graders/autocomplete-quality.ts`
**Schedule**: per-commit (code grader)
**Cost**: $0

### 5.2 navigation-update.ts (Update to existing)

| Dimension | Weight | Metric | Method |
|---|---|---|---|
| Routing | 0.40 | Navigation goes to expected URL | URL comparison |
| Guards | 0.35 | Locked phases remain blocked | URL + redirect check |
| Progress bar | 0.25 | Correct phase states displayed | DOM state inspection |

**Location**: `docs/evals/graders/navigation-update.ts`
**Schedule**: per-commit (code grader)
**Cost**: $0

### 5.3 summary-completeness.ts (New)

| Dimension | Weight | Metric | Method |
|---|---|---|---|
| Completeness | 0.35 | All 6 phase sections visible | DOM visibility check |
| Accuracy | 0.35 | Data matches DB snapshot | Field comparison |
| Security | 0.30 | Booking codes masked, no encrypted blobs | Regex pattern + string scan |
| Print (optional) | 0.15 | Sections visible in print, break-inside avoided | Print CSS check |

**Location**: `docs/evals/graders/summary-completeness.ts`
**Schedule**: per-commit (code grader)
**Cost**: $0
**Zero-tolerance**: If any booking code shows encrypted blob, score = 0.0 (security override).

---

## 6. E2E Test Plan Summary

### New E2E Scenarios (Sprint 30)

| ID | Feature | Priority | Automation |
|---|---|---|---|
| E2E-AC-001 | Autocomplete: city search accuracy | P0 | Playwright |
| E2E-AC-002 | Autocomplete: IATA airport search | P0 | Playwright |
| E2E-AC-003 | Autocomplete: recent searches | P1 | Playwright |
| E2E-AC-004 | Autocomplete: keyboard navigation | P1 | Playwright |
| E2E-AC-005 | Autocomplete: mobile overlay | P1 | Playwright |
| E2E-MAP-001 | Map: pin rendering by status | P0 | Playwright |
| E2E-MAP-002 | Map: pin click popup | P0 | Playwright |
| E2E-MAP-003 | Map: empty state | P1 | Playwright |
| E2E-MAP-004 | Map: pin accessibility | P1 | Playwright |
| E2E-DASH-001 | Dashboard: trip card display | P0 | Playwright |
| E2E-DASH-002 | Dashboard: sort by date | P1 | Playwright |
| E2E-DASH-003 | Dashboard: status filter | P1 | Playwright |
| E2E-DASH-004 | Dashboard: empty state | P1 | Playwright |
| E2E-DASH-005 | Dashboard: responsive layout | P1 | Playwright |
| E2E-SUM-001 | Summary: full view (6 phases) | P0 | Playwright |
| E2E-SUM-002 | Summary: partial (missing phases) | P0 | Playwright |
| E2E-SUM-003 | Summary: print layout | P1 | Playwright |
| E2E-SUM-004 | Summary: BOLA test | P0 | Playwright |

**Total**: 18 new E2E scenarios (7 P0, 11 P1).
**Estimated E2E count after Sprint 30**: 122 (existing) + 18 = ~140 E2E tests.

### Existing E2E Maintenance

The 10 existing autocomplete E2E tests (`tests/e2e/autocomplete.spec.ts`) will need updates to match the new component structure (RF-001 through RF-016). The existing tests cover:
- Dropdown appearance (2+ chars)
- Result format (city + state/country)
- Selection behavior
- Trip type badge
- No results
- Clear input
- Debounce
- Loading spinner
- Origin autocomplete
- Edit clears badge

These tests will be refactored, not deleted. Data-testid selectors may change with the rewrite.

---

## 7. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Map library adds >100KB to bundle | Medium | Performance regression | Tree-shake, lazy load map component, measure in staging gate |
| Nominatim API unreliable for autocomplete E2E | High | Flaky tests | Fallback offline dataset, retry helper (already exists), known-flake annotation |
| Dashboard rewrite breaks existing E2E tests | Medium | CI/CD blockage | Run existing E2E suite before starting dashboard rewrite; update selectors incrementally |
| Booking code masking incomplete | Low | Security (S1) | Zero-tolerance in summary grader; integration test mandatory |
| SPEC-PROD for map/dashboard/summary not yet created | High | QA specs based on assumptions | SPEC-QA-002/003/004 marked as draft; update when SPEC-PROD approved |
| Trust score regression during rewrite | Medium | Staging gate blocks merge | Monitor trust score per PR; fix regressions before merging next feature |

---

## 8. Sprint 30 QA Calendar

| Day | Activity |
|---|---|
| Day 1-2 | Finalize SPEC-PROD for map, dashboard, summary. Review SPEC-PROD-017 (autocomplete). |
| Day 3 | Approve SPEC-QA-001..004 (this document). Set up eval datasets in CI. |
| Day 4-7 | Dev implementation begins. QA monitors PR eval gate results. |
| Day 8 | Mid-sprint: run full eval suite on staging. Flag any regressions. |
| Day 9-10 | E2E test implementation for new scenarios (P0 first). |
| Day 11 | Full E2E run + eval suite. Bug triage. |
| Day 12 | QA sign-off (QA-REL-030). Trust score calculation. Release decision. |

---

## 9. Dependencies and Blockers

| Dependency | Status | Owner | Impact if Blocked |
|---|---|---|---|
| SPEC-PROD for Map, Dashboard, Summary | Not yet created | product-owner | SPEC-QA-002/003/004 are based on assumptions; may need revision |
| SPEC-ARCH for data provider (Nominatim vs Google Places) | Not yet created | architect | Autocomplete test strategy may change if provider changes |
| Map library selection (Leaflet, Mapbox, etc.) | Not decided | architect | Map E2E selectors and performance targets depend on library |
| CI/CD eval gate integration | Existing | devops-engineer | Eval gates defined here; devops must wire them into pipeline |

---

## 10. Definition of Done (Sprint 30 QA)

- [ ] All 4 SPEC-QA documents approved by tech-lead
- [ ] All 4 eval datasets in `docs/evals/datasets/` and passing JSON validation
- [ ] All 3 grader stubs in `docs/evals/graders/` reviewed by devs
- [ ] PR gate running autocomplete-basic eval (4 cases)
- [ ] Staging gate running full eval suite (44 cases)
- [ ] 18 new E2E scenarios implemented (at minimum: 7 P0 scenarios)
- [ ] Existing autocomplete E2E tests refactored for new component
- [ ] Trust Score >= 0.90 on staging
- [ ] No open P0 bugs
- [ ] QA sign-off document (QA-REL-030) produced
- [ ] MEMORY.md updated with Sprint 30 findings

---

## Historico de Alteracoes

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-17 | qa-engineer | Versao inicial — Sprint 30 EDD planning |
