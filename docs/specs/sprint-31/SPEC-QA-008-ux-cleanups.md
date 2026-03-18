---
spec-id: SPEC-QA-008
title: "Test Strategy: UX Cleanups"
version: 1.0.0
status: Draft
author: qa-engineer
sprint: 31
reviewers: [tech-lead, ux-designer]
date: 2026-03-17
related-specs: []
---

# SPEC-QA-008: Test Strategy — UX Cleanups

**Versao**: 1.0.0
**Status**: Draft
**Autor**: qa-engineer
**Data**: 2026-03-17
**Sprint**: 31
**Contexto**: Miscellaneous UX cleanup items identified during Sprint 30 review and user testing. Each item is small (< 2h) but collectively impacts perceived quality.

---

## 1. Cleanup Items

### CLEANUP-001: Profile link in dropdown menu (not top nav)

**Current state**: Profile/account link may appear in top navigation bar on some viewports.
**Desired state**: Profile link appears ONLY in the UserMenu dropdown (triggered by avatar click). It does NOT appear as a standalone item in the top nav bar.
**Component**: `src/components/layout/AuthenticatedNavbar.tsx`, `src/components/layout/UserMenu.tsx`

### CLEANUP-002: Gamification badge not clickable

**Current state**: Gamification badge/score indicator in the header may have pointer-events or clickable styling.
**Desired state**: Badge is purely informational. No pointer cursor, no click handler, no navigation on click. `pointer-events: none` or equivalent. aria-role="status" (live region for screen readers, not interactive).
**Component**: Gamification header component (likely in `AuthenticatedNavbar.tsx` or a child component)

### CLEANUP-003: Date validation rules

**Current state**: Date inputs in Phase 1 wizard may accept invalid date combinations.
**Desired state**:
- Past dates: blocked (both start and end date must be today or later)
- Same-day start and end: blocked (minimum 1-day trip duration)
- Start date > end date: blocked (end must be after start)
- All validation enforced both client-side (Zod schema + UI feedback) AND server-side (server action validation)
**Component**: `src/lib/validations/trip.schema.ts`, Phase1Wizard date inputs, `createExpeditionAction`

### CLEANUP-004: "Completar Expedicao" button removed

**Current state**: A "Completar Expedicao" button may exist on the dashboard or expedition detail page.
**Desired state**: Button removed entirely. Replaced with "Ver Expedicoes" which navigates to the expeditions list (dashboard). Expedition completion is automatic (driven by phase completion engine, not manual user action).
**Component**: Dashboard page, ExpeditionCard, or expedition detail page

---

## 2. Risk Assessment

| Risk Area | Likelihood | Impact | Test Priority |
|---|---|---|---|
| Profile link still visible in top nav after cleanup | Medium | Medium | P1 |
| Badge click triggers unexpected navigation | Medium | Medium | P1 |
| Past date accepted by server action (client-only validation) | High | High | P0 |
| Start > end date accepted by server | High | High | P0 |
| "Completar Expedicao" button still rendered somewhere | Medium | Medium | P1 |
| "Ver Expedicoes" link navigates to wrong page | Low | Medium | P1 |

---

## 3. Test Pyramid

```
        [E2E]          -- 8 scenarios (profile link, badge, date validation, button replacement)
       [Integration]   -- Server-side date validation in createExpeditionAction
      [Unit Tests]     -- Date schema validation rules, component rendering assertions
```

### Unit Tests

#### Date Validation (CLEANUP-003)
- `TripSchema.safeParse({ startDate: yesterday })` returns error "Date must be today or later"
- `TripSchema.safeParse({ startDate: today, endDate: today })` returns error "End date must be after start date"
- `TripSchema.safeParse({ startDate: tomorrow, endDate: today })` returns error "End date must be after start date"
- `TripSchema.safeParse({ startDate: tomorrow, endDate: dayAfterTomorrow })` returns success
- Server action `createExpeditionAction` rejects past start dates with validation error
- Server action `createExpeditionAction` rejects start >= end with validation error

#### Profile Link (CLEANUP-001)
- `AuthenticatedNavbar` does NOT render a profile/account link in the top nav
- `UserMenu` dropdown contains a profile/account link

#### Gamification Badge (CLEANUP-002)
- Badge element has `pointer-events: none` or no onClick handler
- Badge has `role="status"` for screen reader announcement
- Badge does NOT render as `<a>`, `<button>`, or `<Link>`

#### Button Replacement (CLEANUP-004)
- "Completar Expedicao" string does NOT appear in any rendered component
- "Ver Expedicoes" link renders and points to `/[locale]/expeditions` (or equivalent dashboard URL)

---

## 4. Critical E2E Scenarios

### E2E-QA008-001: Profile link only in dropdown

**Steps**:
1. Log in and navigate to any authenticated page.
2. Inspect top navigation bar links.
3. Click avatar to open UserMenu dropdown.
4. Inspect dropdown items.
**Expected**:
- Top nav: No "Perfil", "Profile", "Minha Conta", or "Account" link visible
- Dropdown: Profile/account link is present and navigates to `/[locale]/account`

### E2E-QA008-002: Gamification badge is not clickable

**Steps**:
1. Log in and verify gamification badge/score is visible in header.
2. Hover over badge.
3. Click badge.
**Expected**:
- No pointer cursor on hover (cursor: default)
- Click does NOT navigate anywhere or trigger any visible action
- No console errors on click
- Badge remains visually unchanged after click

### E2E-QA008-003: Past start date blocked (client-side)

**Steps**:
1. Navigate to Phase 1 wizard (new expedition).
2. Attempt to set start date to yesterday.
**Expected**:
- Date picker prevents selection of past dates (dates before today are disabled/grayed)
- OR: If free text input, validation error appears: "Data deve ser hoje ou posterior"
- Form cannot be submitted with past date

### E2E-QA008-004: Same-day start and end date blocked

**Steps**:
1. Navigate to Phase 1 wizard.
2. Set start date to tomorrow.
3. Set end date to the same day (tomorrow).
**Expected**: Validation error: "Data de retorno deve ser posterior a data de ida". Form cannot be submitted.

### E2E-QA008-005: Start date after end date blocked

**Steps**:
1. Navigate to Phase 1 wizard.
2. Set start date to March 25.
3. Set end date to March 20.
**Expected**: Validation error displayed. Form cannot be submitted.

### E2E-QA008-006: Server-side date validation (bypass client)

**Steps**:
1. Use direct API call or form manipulation to submit expedition with startDate = yesterday, endDate = today.
**Expected**: Server action returns validation error. No trip created. Database unchanged.

### E2E-QA008-007: "Completar Expedicao" removed, "Ver Expedicoes" present

**Steps**:
1. Navigate to dashboard with completed and in-progress expeditions.
2. Search all visible text for "Completar Expedicao" or "Complete Expedition".
3. Search for "Ver Expedicoes" or equivalent.
**Expected**:
- "Completar Expedicao" / "Complete Expedition" NOT found anywhere on dashboard or expedition cards
- "Ver Expedicoes" link is present and navigates to expeditions list

### E2E-QA008-008: Valid date combination accepted

**Steps**:
1. Navigate to Phase 1 wizard.
2. Set start date to 2 days from now.
3. Set end date to 5 days from now.
4. Fill remaining required fields (destination).
5. Submit form.
**Expected**: Form submits successfully. Expedition created with correct dates. No validation errors.

---

## 5. Server-Side Validation (Critical)

CLEANUP-003 date validation MUST be enforced server-side in addition to client-side. This is a security requirement (SPEC-SEC-002).

**Server-side enforcement points**:
- `createExpeditionAction` in server actions
- Any `updateTrip` action that modifies dates
- Zod schema used by both client and server (shared schema pattern)

**Why both sides**: Client-side validation can be bypassed. A malicious user could submit past dates via direct HTTP request. Server-side is the authoritative gate.

---

## 6. Eval Dataset Reference

Dataset: `docs/evals/datasets/date-validation.json` (8 cases)
Grader: Input validation correctness checker

---

## 7. Definition of Done (QA perspective)

- [ ] All 8 E2E scenarios automated and passing
- [ ] Date validation unit tests (6+ cases covering all rules)
- [ ] Server-side date validation confirmed (not just client)
- [ ] Profile link placement verified in navbar and dropdown
- [ ] Gamification badge non-interactive verified (pointer-events, role, no click handler)
- [ ] "Completar Expedicao" text not present in codebase (grep verification)
- [ ] "Ver Expedicoes" link renders correctly in both locales (PT-BR + EN)
- [ ] Eval dataset passes with trust score >= 0.8
