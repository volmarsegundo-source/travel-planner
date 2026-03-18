---
spec-id: SPEC-QA-007
title: "Test Strategy: Dashboard Quick-Access Links"
version: 1.0.0
status: Draft
author: qa-engineer
sprint: 31
reviewers: [tech-lead, ux-designer]
date: 2026-03-17
related-specs: [SPEC-PROD-022]
---

# SPEC-QA-007: Test Strategy — Dashboard Quick-Access Links

**Versao**: 1.0.0
**Status**: Draft
**Autor**: qa-engineer
**Data**: 2026-03-17
**Sprint**: 31
**Contexto**: ExpeditionCard quick-access links on the Expeditions dashboard. Links provide one-tap navigation to generated content within an expedition.

---

## 1. Risk Assessment

| Risk Area | Likelihood | Impact | Test Priority |
|---|---|---|---|
| Quick-access link visible when content does not exist | Medium | High | P0 |
| Quick-access link missing when content exists | Medium | High | P0 |
| BOLA: link navigates to another user's trip content | Low | Critical | P0 |
| "Gerar Relatorio" enabled when prerequisites not met | Medium | Medium | P1 |
| Navigation target is wrong phase URL | Medium | High | P1 |
| Links not visible on mobile card layout | Medium | Medium | P1 |

---

## 2. Quick-Access Link Rules

| Link Label | Visible When | Navigates To | Phase |
|---|---|---|---|
| "Ver Checklist" | Phase 3 checklist items exist (count > 0) | `/[locale]/expedition/[tripId]/checklist` | Phase 3 |
| "Ver Guia" | Phase 5 completed (guide generated) | `/[locale]/expedition/[tripId]/guide` | Phase 5 |
| "Ver Roteiro" | Phase 6 completed (itinerary generated) | `/[locale]/expedition/[tripId]/itinerary` | Phase 6 |
| "Gerar Relatorio" | Phases 3 + 5 + 6 ALL completed | `/[locale]/expedition/[tripId]/summary` or report generation action | Summary |

---

## 3. Test Pyramid

```
        [E2E]          -- 6 journeys (link visibility per state, navigation, BOLA, report button)
       [Integration]   -- Quick-access link resolver with real trip data
      [Unit Tests]     -- Link visibility logic, prerequisite checker, URL builder
```

### Unit Tests

- `shouldShowChecklistLink(trip)` returns `true` when checklist items count > 0
- `shouldShowChecklistLink(trip)` returns `false` when checklist items count === 0
- `shouldShowGuideLink(trip)` returns `true` when phase 5 status === "completed"
- `shouldShowGuideLink(trip)` returns `false` when phase 5 status !== "completed"
- `shouldShowItineraryLink(trip)` returns `true` when phase 6 status === "completed"
- `shouldShowItineraryLink(trip)` returns `false` when phase 6 status !== "completed"
- `shouldEnableReportButton(trip)` returns `true` ONLY when phases 3 + 5 + 6 are all completed
- `shouldEnableReportButton(trip)` returns `false` when only 2 of 3 prerequisites met
- `shouldEnableReportButton(trip)` returns `false` when none of the prerequisites met
- `buildQuickAccessUrl(tripId, target, locale)` returns correct localized URL for each target

### Integration Tests

- Quick-access data returned from dashboard API includes correct visibility flags per trip
- BOLA: quick-access data for trip not owned by requesting user returns 403

---

## 4. Critical E2E Scenarios

### E2E-QA007-001: Quick-access links appear only when content exists

**Precondition**: User has 3 trips:
- Trip A: Phases 1-6 all completed (full expedition)
- Trip B: Phases 1-3 completed only
- Trip C: Phase 1 only
**Steps**:
1. Navigate to dashboard.
2. Inspect Trip A card quick-access area.
3. Inspect Trip B card quick-access area.
4. Inspect Trip C card quick-access area.
**Expected**:
- Trip A: "Ver Checklist", "Ver Guia", "Ver Roteiro", "Gerar Relatorio" all visible/enabled
- Trip B: "Ver Checklist" visible. "Ver Guia", "Ver Roteiro" NOT visible. "Gerar Relatorio" disabled or hidden.
- Trip C: No quick-access links visible.

### E2E-QA007-002: "Ver Checklist" link navigates to Phase 3

**Precondition**: Trip with Phase 3 checklist generated (items exist).
**Steps**:
1. Navigate to dashboard.
2. Click "Ver Checklist" on the trip card.
**Expected**: User navigates to `/[locale]/expedition/[tripId]/checklist`. Page loads with checklist content. Back button returns to dashboard.

### E2E-QA007-003: "Ver Guia" link navigates to Phase 5

**Precondition**: Trip with Phase 5 completed (guide generated).
**Steps**:
1. Navigate to dashboard.
2. Click "Ver Guia" on the trip card.
**Expected**: User navigates to `/[locale]/expedition/[tripId]/guide`. Page loads with guide content.

### E2E-QA007-004: "Ver Roteiro" link navigates to Phase 6

**Precondition**: Trip with Phase 6 completed (itinerary generated).
**Steps**:
1. Navigate to dashboard.
2. Click "Ver Roteiro" on the trip card.
**Expected**: User navigates to `/[locale]/expedition/[tripId]/itinerary`. Page loads with itinerary content.

### E2E-QA007-005: "Gerar Relatorio" enabled only when phases 3+5+6 done

**Precondition**: Two trips -- Trip A with phases 3+5+6 all complete, Trip B with only phases 3+5 complete.
**Steps**:
1. Navigate to dashboard.
2. Inspect "Gerar Relatorio" button on Trip A.
3. Inspect "Gerar Relatorio" button on Trip B.
**Expected**:
- Trip A: Button enabled (clickable, no disabled attribute, no muted styling)
- Trip B: Button disabled (aria-disabled="true", muted styling, non-clickable)

### E2E-QA007-006: BOLA enforcement on quick-access navigation

**Precondition**: User A has a trip. User B is a different authenticated user.
**Steps**:
1. Log in as User B.
2. Attempt direct URL navigation to User A's checklist: `/[locale]/expedition/[userA-tripId]/checklist`.
**Expected**: 403 Forbidden or redirect to User B's dashboard. User A's content is NOT displayed.

---

## 5. Accessibility Considerations

| Requirement | Test |
|---|---|
| Quick-access links have descriptive aria-labels | aria-label="Ver Checklist para [destination]" |
| Disabled "Gerar Relatorio" has aria-disabled="true" | Button is announced as disabled by screen reader |
| Links are keyboard-focusable | Tab reaches each quick-access link |
| Touch targets >= 44px on mobile | Verify computed height >= 44px |

---

## 6. Eval Dataset Reference

Dataset: `docs/evals/datasets/dashboard-quickaccess.json` (6 cases)
Grader: Link visibility correctness checker

---

## 7. Definition of Done (QA perspective)

- [ ] All 6 E2E scenarios automated and passing
- [ ] Unit tests for all 4 link visibility functions
- [ ] Report button prerequisite logic tested (3/3, 2/3, 0/3 scenarios)
- [ ] BOLA test for direct URL navigation
- [ ] Quick-access links tested on 375px mobile viewport
- [ ] aria-labels verified on all links
- [ ] Eval dataset passes with trust score >= 0.8
