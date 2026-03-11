# QA-TP-XXX: Test Plan — [Feature Name]

**Spec References**: SPEC-PROD-XXX, SPEC-UX-XXX, SPEC-ARCH-XXX, SPEC-SEC-XXX
**Date**: YYYY-MM-DD
**Author**: qa-engineer
**Sprint**: XX
**Status**: Draft / Approved / Executed

---

## 1. Test Scope

### Features Under Test
[List the features and components being tested, derived directly from the referenced specs.]

### Acceptance Criteria Coverage Map

Every AC from every referenced spec must appear in this table. If an AC is out of scope
for this test plan, it must be listed with justification.

| Spec | AC# | AC Description | Test Case(s) | Coverage |
|------|-----|---------------|-------------|----------|
| SPEC-PROD-XXX | AC-1 | [description] | TC-001 | Covered |
| SPEC-PROD-XXX | AC-2 | [description] | TC-002, TC-003 | Covered |
| SPEC-UX-XXX | AC-1 | [description] | TC-A01 | Covered |
| SPEC-ARCH-XXX | AC-1 | [description] | TC-P01 | Covered |
| SPEC-SEC-XXX | AC-1 | [description] | TC-N01 | Covered |
| SPEC-PROD-XXX | AC-5 | [description] | — | Out of scope: [reason] |

### Out of Scope
[What will NOT be tested in this plan and why. Reference spec sections explicitly.]

---

## 2. Test Cases (from Acceptance Criteria)

### Happy Path

| TC# | Spec AC | Description | Preconditions | Steps | Expected Result | Priority |
|-----|---------|-------------|--------------|-------|----------------|----------|
| TC-001 | AC-1 | [description] | [state required] | 1. [action] 2. [action] 3. [action] | [expected outcome] | P0 |
| TC-002 | AC-2 | [description] | [state required] | 1. [action] 2. [action] | [expected outcome] | P0 |
| TC-003 | AC-3 | [description] | [state required] | 1. [action] 2. [action] | [expected outcome] | P1 |

### Edge Cases

| TC# | Spec AC | Description | Preconditions | Steps | Expected Result | Priority |
|-----|---------|-------------|--------------|-------|----------------|----------|
| TC-E01 | AC-1 | [edge case description] | [state required] | 1. [action] 2. [action] | [expected outcome] | P1 |
| TC-E02 | AC-2 | [edge case description] | [state required] | 1. [action] 2. [action] | [expected outcome] | P1 |

### Error Paths

| TC# | Spec AC | Description | Preconditions | Steps | Expected Result | Priority |
|-----|---------|-------------|--------------|-------|----------------|----------|
| TC-F01 | AC-1 | [failure scenario] | [state required] | 1. [action] 2. [trigger error] | [error handling behavior] | P0 |
| TC-F02 | AC-2 | [failure scenario] | [state required] | 1. [action] 2. [trigger error] | [error handling behavior] | P1 |

---

## 3. Negative Test Cases (from Security Spec)

Derived from SPEC-SEC-XXX threat model and security requirements.

| TC# | Threat Vector | Spec Requirement | Description | Steps | Expected Result | Priority |
|-----|-------------|-----------------|-------------|-------|----------------|----------|
| TC-N01 | BOLA | SR-001 | Access another user's resource | 1. Authenticate as User A 2. Request User B's resource by ID | 404 (not 403 — no existence leakage) | P0 |
| TC-N02 | Mass assignment | SR-002 | Submit userId in request body | 1. POST with userId field in payload | userId stripped by Zod; server uses session userId | P0 |
| TC-N03 | Auth bypass | SR-003 | Call server action without session | 1. Clear session 2. Call action directly | Redirect to login / 401 | P0 |
| TC-N04 | Input injection | SR-004 | Submit XSS payload in text field | 1. Enter `<script>` in input 2. Submit | Input sanitized; no script execution | P1 |
| TC-N05 | Rate limiting | SR-005 | Rapid repeated requests | 1. Send N+1 requests within window | 429 Too Many Requests after threshold | P1 |

---

## 4. Accessibility Test Cases (from UX Spec)

Derived from SPEC-UX-XXX accessibility requirements and WCAG 2.1 AA criteria.

| TC# | WCAG Criterion | Spec Requirement | Description | Method | Expected Result | Priority |
|-----|---------------|-----------------|-------------|--------|----------------|----------|
| TC-A01 | 2.1.1 Keyboard | UX-AC-1 | Tab through all interactive controls | Manual keyboard test | All controls focusable and operable via keyboard | P0 |
| TC-A02 | 4.1.2 Name/Role/Value | UX-AC-2 | Screen reader announces all controls | axe-core + manual | All inputs have accessible names; roles correct | P0 |
| TC-A03 | 1.4.3 Contrast | UX-AC-3 | Text meets minimum contrast ratio | axe-core automated | All text meets 4.5:1 ratio (3:1 for large text) | P1 |
| TC-A04 | 1.3.1 Info/Relationships | UX-AC-4 | Form labels programmatically associated | axe-core automated | All inputs have associated labels | P1 |
| TC-A05 | 2.4.7 Focus Visible | UX-AC-5 | Focus indicator visible on all elements | Manual keyboard test | Clear visible focus ring on all interactive elements | P1 |

---

## 5. Performance Test Cases (from Arch Spec)

Derived from SPEC-ARCH-XXX performance budgets and SLOs.

| TC# | Budget | Spec Requirement | Description | Measurement Method | Target | Priority |
|-----|--------|-----------------|-------------|-------------------|--------|----------|
| TC-P01 | API response | ARCH-PERF-1 | Server action response time | Vitest timer / k6 | < XXXms P95 | P0 |
| TC-P02 | DB query | ARCH-PERF-2 | Database query execution time | Prisma query logging | < XXms P95 | P1 |
| TC-P03 | Page load | ARCH-PERF-3 | First Contentful Paint | Lighthouse CI | < X,XXXms (4G throttle) | P1 |
| TC-P04 | Bundle size | ARCH-PERF-4 | JS bundle size for route | next build analysis | < XXXkB gzipped | P2 |

---

## 6. i18n Test Cases

| TC# | Description | Steps | Expected Result | Priority |
|-----|-------------|-------|----------------|----------|
| TC-I01 | All strings localized (pt) | 1. Switch locale to pt 2. Navigate feature | No English text visible | P0 |
| TC-I02 | All strings localized (en) | 1. Switch locale to en 2. Navigate feature | No Portuguese text visible | P0 |
| TC-I03 | No hardcoded strings in source | Grep source files for raw string literals | All user-facing strings use i18n keys | P1 |

---

## 7. Regression Scope

### Tests That Must Still Pass

| Area | Test Suite | Reason |
|------|-----------|--------|
| [related feature] | [test file path] | [why regression risk exists] |
| [related feature] | [test file path] | [why regression risk exists] |

### Smoke Tests (post-deploy)

| # | Scenario | Expected Result |
|---|----------|----------------|
| 1 | Login with valid credentials | Redirect to dashboard |
| 2 | Create a new trip | Trip appears in trip list |
| 3 | [feature-specific smoke test] | [expected result] |

---

## 8. Test Data Requirements

| Data | Source | Notes |
|------|--------|-------|
| Test user | `tests/fixtures/users.ts` | Synthetic only — `@playwright.invalid` domain |
| Test trip | `tests/fixtures/trips.ts` | Synthetic destinations and dates |
| Payment card | Sandbox provider | Never real card numbers |
| [other data] | [source] | [notes] |

---

## 9. Test Execution Plan

| Phase | Test Type | Method | Owner | ETA |
|-------|----------|--------|-------|-----|
| 1 | Unit tests | Vitest (automated) | dev-fullstack | During implementation |
| 2 | Integration tests | Vitest (automated) | dev-fullstack | After implementation |
| 3 | Security tests | Vitest + manual | qa-engineer | Post-implementation |
| 4 | Accessibility tests | axe-core + manual | qa-engineer | Post-implementation |
| 5 | E2E tests | Playwright (automated) | qa-engineer | Pre-release |
| 6 | Performance tests | Lighthouse / k6 | qa-engineer | Pre-release |
| 7 | Exploratory testing | Manual | qa-engineer | Pre-release |

---

## 10. Exit Criteria

This test plan is complete when:

- [ ] All P0 test cases pass
- [ ] All P1 test cases pass (or failures are triaged and accepted)
- [ ] No P0 bugs remain open
- [ ] Spec conformance audit (QA-CONF-XXX) shows no drift
- [ ] Performance budgets met
- [ ] Accessibility audit clean (no critical/serious axe-core violations)
- [ ] Regression suite passes
