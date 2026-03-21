---
spec-id: SPEC-QA-010
title: Sprint 33 Test Strategy — Footer, Phase 3 Rules, Phase 4 Mandatory, Summary, Prompt Enrichment, Social Login
version: 1.0.0
status: Draft
author: qa-engineer
sprint: 33
reviewers: [tech-lead, architect]
---

# SPEC-QA-010: Sprint 33 Test Strategy

**Strategy ID**: QA-SPEC-010
**Related Specs**: SPEC-SEC-004, SPEC-AI-004, SPRINT-33-PLAN
**Author**: qa-engineer
**Date**: 2026-03-20
**Sprint**: 33
**Baseline**: v0.27.1

---

## 1. Contexto

Sprint 33 introduz 6 areas de implementacao (IMPs):

1. **Footer Save/Discard** — dialog de confirmacao para dados nao salvos
2. **Phase 3 Completion Rules** — regras refinadas para conclusao da fase de preparacao
3. **Phase 4 Mandatory Fields** — validacao server-side de campos obrigatorios de logistica
4. **Summary Report Enhancements** — novos campos de fases 3-5 no relatorio
5. **Prompt Enrichment** — contexto de fases 1-5 no prompt de itinerario
6. **Social Login (Google OAuth)** — login social via Google (Apple em sprint futuro)

Este documento define o plano de testes completo para todas as IMPs.

---

## 2. Risk Assessment

| Risk Area | Likelihood | Impact | Test Priority |
|---|---|---|---|
| Footer save/discard bypass | Media | Alto | P0 |
| Phase 3 false completion | Media | Critico | P0 |
| Phase 4 skip sem dados no server | Alta | Critico | P0 |
| Summary PII leakage | Baixa | Critico | P0 |
| Prompt enrichment PII in prompt | Baixa | Critico | P0 |
| OAuth account takeover | Baixa | Critico | P0 |
| OAuth CSRF | Media | Alto | P0 |
| Footer data loss on navigation | Alta | Alto | P0 |
| Prompt enrichment token overflow | Baixa | Medio | P1 |
| Phase 3 rules regressao | Baixa | Alto | P1 |
| Summary i18n novos campos | Media | Medio | P1 |
| Regressao v0.27.1 fixes | Baixa | Critico | P0 |

---

## 3. Test Pyramid

```
        [E2E]          <- 10 critical journeys (footer, phase 4, OAuth, full flow)
       [Integration]   <- context collection, report generation, OAuth callback
      [Unit Tests]     <- prompt enrichment, phase rules, validation schemas
```

---

## 4. Test Scenarios — Footer Save/Discard

### Unit Tests

| ID | Scenario | Given | When | Then | Priority |
|---|---|---|---|---|---|
| U-FTR-001 | Dirty state detected on form change | Form loaded, no changes | User changes a field | `isDirty` becomes `true` | P0 |
| U-FTR-002 | Clean state after save | Form dirty, user clicks Save | Save completes | `isDirty` becomes `false` | P0 |
| U-FTR-003 | Clean state after discard | Form dirty, user clicks Discard | Discard completes | `isDirty` becomes `false`, form values reset | P0 |
| U-FTR-004 | Dialog shown on navigation attempt when dirty | Form is dirty | User clicks browser back or progress bar | SaveDiscardDialog is visible | P0 |
| U-FTR-005 | Dialog NOT shown when form is clean | Form is clean (no changes) | User navigates away | No dialog, navigation proceeds | P0 |
| U-FTR-006 | Dialog offers 3 actions | Dialog is visible | Inspect dialog | "Salvar e Sair", "Descartar", "Continuar Editando" buttons present | P0 |
| U-FTR-007 | "Salvar e Sair" saves and navigates | Dialog visible, form dirty | Click "Salvar e Sair" | Server action called, then navigation occurs | P1 |
| U-FTR-008 | "Descartar" discards and navigates | Dialog visible, form dirty | Click "Descartar" | No server action called, navigation occurs, form values reset | P1 |
| U-FTR-009 | "Continuar Editando" closes dialog | Dialog visible | Click "Continuar Editando" | Dialog closes, user stays on page, form values preserved | P1 |
| U-FTR-010 | beforeunload event fires when dirty | Form is dirty | Window beforeunload event | Browser native confirmation dialog appears | P1 |

### E2E Tests

| ID | Scenario | Steps | Expected | Priority |
|---|---|---|---|---|
| E2E-FTR-001 | Save/Discard dialog on progress bar click | Login -> Phase 2 -> change a field -> click Phase 1 in progress bar | SaveDiscardDialog appears with 3 options | P0 |
| E2E-FTR-002 | "Salvar e Sair" saves data | Continue from E2E-FTR-001 -> click "Salvar e Sair" | Navigate to Phase 1, return to Phase 2 and see saved data | P0 |
| E2E-FTR-003 | "Descartar" discards changes | Login -> Phase 2 -> change destination -> click Phase 3 -> "Descartar" -> return to Phase 2 | Original destination value restored | P0 |
| E2E-FTR-004 | No dialog when form is clean | Login -> Phase 2 (no changes) -> click Phase 3 | Navigate directly to Phase 3, no dialog | P1 |
| E2E-FTR-005 | Dialog on browser back button | Login -> Phase 2 -> change field -> click browser back | Dialog appears (or browser native prompt for beforeunload) | P1 |

---

## 5. Test Scenarios — Phase 3 Completion Rules

### Unit Tests

| ID | Scenario | Given | When | Then | Priority |
|---|---|---|---|---|---|
| U-PH3-001 | All required checklist items done -> completed | All required items checked | evaluatePhaseCompletion(3, snapshot) | status: "completed" | P0 |
| U-PH3-002 | Some required items pending -> in_progress | 3 of 5 required items checked | evaluatePhaseCompletion(3, snapshot) | status: "in_progress" | P0 |
| U-PH3-003 | No items at all -> pending | Empty checklist | evaluatePhaseCompletion(3, snapshot) | status: "pending" | P0 |
| U-PH3-004 | Optional items unchecked, all required done -> completed | All required done, 2 optional unchecked | evaluatePhaseCompletion(3, snapshot) | status: "completed" | P0 |
| U-PH3-005 | Uncheck required item reverts to in_progress | Was completed, 1 item unchecked | evaluatePhaseCompletion(3, snapshot) | status: "in_progress" | P0 |
| U-PH3-006 | International trip requires visa item | tripType: international | getRequiredChecklistItems(tripType) | Includes visa-related item | P1 |
| U-PH3-007 | Domestic trip does not require visa item | tripType: domestic | getRequiredChecklistItems(tripType) | Does NOT include visa-related item | P1 |

---

## 6. Test Scenarios — Phase 4 Mandatory Fields

### Unit Tests

| ID | Scenario | Given | When | Then | Priority |
|---|---|---|---|---|---|
| U-PH4-001 | Transport segment with all required fields passes validation | Complete transport segment | Validate against Zod schema | Passes validation | P0 |
| U-PH4-002 | Transport segment missing `type` fails validation | Transport segment without type | Validate against Zod schema | ZodError on `type` field | P0 |
| U-PH4-003 | Transport segment with empty `from` fails validation | Transport with from: "" | Validate against Zod schema | ZodError: `.min(1)` violation | P0 |
| U-PH4-004 | Accommodation with all required fields passes | Complete accommodation | Validate against Zod schema | Passes validation | P0 |
| U-PH4-005 | Accommodation missing `checkIn` fails validation | Accommodation without checkIn | Validate against Zod schema | ZodError on `checkIn` | P0 |
| U-PH4-006 | completePhase4Action rejects with zero transport AND zero accommodation | Empty Phase 4 data | Call completePhase4Action | Error: at least 1 transport or accommodation required | P0 |
| U-PH4-007 | completePhase4Action accepts with 1 transport, 0 accommodation | 1 valid transport segment | Call completePhase4Action | Success | P0 |
| U-PH4-008 | completePhase4Action accepts with 0 transport, 1 accommodation | 1 valid accommodation | Call completePhase4Action | Success | P0 |
| U-PH4-009 | Server action rejects extra fields (mass assignment) | Payload with `userId` field | Call saveTransportAction | `userId` stripped, uses session.user.id | P0 |
| U-PH4-010 | BOLA: server action rejects other user's trip | tripId owned by different user | Call saveTransportAction | Error / 404 | P0 |

### E2E Tests

| ID | Scenario | Steps | Expected | Priority |
|---|---|---|---|---|
| E2E-PH4-001 | Phase 4 cannot complete without data | Login -> Phase 4 -> click "Proximo" without adding transport or accommodation | Error message: "Adicione pelo menos 1 transporte ou hospedagem" | P0 |
| E2E-PH4-002 | Phase 4 completes with 1 transport | Login -> Phase 4 -> add 1 transport segment -> click "Proximo" | Navigate to Phase 5 successfully | P0 |
| E2E-PH4-003 | Phase 4 validates required fields | Login -> Phase 4 -> add transport with empty "from" field -> submit | Field-level error on "from" field | P0 |
| E2E-PH4-004 | Phase 4 completes with 1 accommodation only | Login -> Phase 4 -> add 1 accommodation -> click "Proximo" | Navigate to Phase 5 successfully | P1 |

---

## 7. Test Scenarios — Summary Report

### Unit Tests

| ID | Scenario | Given | When | Then | Priority |
|---|---|---|---|---|---|
| U-RPT-001 | Report includes Phase 3 checklist summary | Trip with checklist data | generateTripReport(tripId, userId) | Report DTO includes checklist completion ratio | P1 |
| U-RPT-002 | Report includes Phase 4 transport segments | Trip with transport | generateTripReport(tripId, userId) | Report DTO includes transport with masked booking codes | P0 |
| U-RPT-003 | Report includes Phase 4 accommodation | Trip with accommodation | generateTripReport(tripId, userId) | Report DTO includes accommodation with masked booking codes | P0 |
| U-RPT-004 | Report includes Phase 5 guide highlights | Trip with guide generated | generateTripReport(tripId, userId) | Report DTO includes guide section summaries | P1 |
| U-RPT-005 | Report excludes birthDate (PII) | Trip with user birthDate set | generateTripReport(tripId, userId) | DTO does NOT contain `birthDate` field | P0 |
| U-RPT-006 | Report shows age range, not exact age | User born 1995-03-15 | generateTripReport(tripId, userId) | DTO contains `ageRange: "25-34"`, NOT `age: 31` | P0 |
| U-RPT-007 | Report masks booking codes | Transport with bookingCode | generateTripReport(tripId, userId) | `maskedBookingCode: "****AB12"`, no encrypted blob | P0 |
| U-RPT-008 | Report BOLA check: other user's trip | tripId owned by userB, called by userA | generateTripReport(tripId, userAId) | Throws ForbiddenError or returns null | P0 |
| U-RPT-009 | Empty Phase 3 shows placeholder | No checklist items | generateTripReport(tripId, userId) | Checklist section shows "Nenhum dado" or equivalent | P1 |
| U-RPT-010 | Empty Phase 4 shows placeholder | No transport or accommodation | generateTripReport(tripId, userId) | Logistics section shows "Nenhum dado" or equivalent | P1 |
| U-RPT-011 | Enum values translated (pt-BR) | tripType: "international" | Render report in pt-BR | Shows "Internacional", not "international" | P1 |
| U-RPT-012 | Enum values translated (en) | tripType: "international" | Render report in en | Shows "International", not "international" | P1 |

---

## 8. Test Scenarios — Prompt Enrichment

### Unit Tests

| ID | Scenario | Given | When | Then | Priority |
|---|---|---|---|---|---|
| U-PRO-001 | buildEnrichedContext with full data | All phases 1-5 data present | buildEnrichedContext(data, 600) | XML with all sections present | P0 |
| U-PRO-002 | buildEnrichedContext with empty Phase 4 | No transport/accommodation | buildEnrichedContext(data, 600) | Omits `<transport>` and `<accommodation>` tags | P0 |
| U-PRO-003 | buildEnrichedContext with token overflow | Very long data, budget = 200 | buildEnrichedContext(data, 200) | Only P0+P1 sections included, P3+ truncated | P1 |
| U-PRO-004 | PII never in prompt output | Data includes birthDate, bookingCode | buildEnrichedContext(data, 600) | Output does NOT contain birthDate or bookingCode | P0 |
| U-PRO-005 | Injection sanitization | Preferences include `<script>alert(1)</script>` | buildEnrichedContext(data, 600) | Script tags sanitized/escaped | P0 |
| U-PRO-006 | Backward compatibility | No enrichment data (undefined) | travelPlanPrompt.buildUserPrompt(baseParams) | Output identical to v1.0.0 | P0 |
| U-PRO-007 | getExpeditionContextForPrompt returns correct data | Trip with phases 1-5 complete | getExpeditionContextForPrompt(tripId, userId) | Returns EnrichedExpeditionContext with all fields | P1 |
| U-PRO-008 | getExpeditionContextForPrompt BOLA check | tripId of another user | getExpeditionContextForPrompt(tripId, wrongUserId) | Throws ForbiddenError | P0 |
| U-PRO-009 | Preferences formatted as comma-separated | preferences: ["cultural", "gastronomic", "adventure"] | buildPreferencesSection(prefs) | "cultural, gastronomic, adventure" | P1 |
| U-PRO-010 | Guide highlights limited to top 3 sections | Guide with 10 sections | buildGuideHighlights(guide) | Only 3 most relevant sections included | P1 |

---

## 9. Test Scenarios — Social Login (Google OAuth)

### Integration Tests

| ID | Scenario | Given | When | Then | Priority |
|---|---|---|---|---|---|
| I-OAUTH-001 | Google login redirect | User not authenticated | Click "Login com Google" | Redirect to Google OAuth consent screen URL | P0 |
| I-OAUTH-002 | Google callback creates new account | No existing account with this email | Google callback with valid code | New user created, session established, redirect to /expeditions | P0 |
| I-OAUTH-003 | Google callback links to existing account (safe) | Existing account with verified email | Google callback with verified email | Accounts linked (or prompt shown), session established | P0 |
| I-OAUTH-004 | Google callback rejects unverified email linking | Existing Credentials account, Google email NOT verified | Google callback with unverified email | New account created, NOT linked, warning shown | P0 |
| I-OAUTH-005 | CSRF: callback without state parameter | No state cookie | Send callback without state | 403 / redirect to login with error | P0 |
| I-OAUTH-006 | CSRF: callback with mismatched state | Different state in cookie vs callback | Send callback with wrong state | 403 / redirect to login with error | P0 |
| I-OAUTH-007 | Token expired: callback with old code | Authorization code older than 10 min | Send callback with expired code | Error, redirect to login | P1 |
| I-OAUTH-008 | callbackUrl validation: relative URL accepted | callbackUrl: "/expeditions" | Complete OAuth flow | Redirect to /expeditions | P1 |
| I-OAUTH-009 | callbackUrl validation: external URL rejected | callbackUrl: "https://evil.com" | Complete OAuth flow | Redirect to default (/) NOT to evil.com | P0 |
| I-OAUTH-010 | Existing Google account re-login | User previously logged in via Google | Google callback with same email | Session established, no duplicate account | P1 |

---

## 10. Regression Tests (v0.27.1 post-migration)

| ID | Scenario | Area | Priority |
|---|---|---|---|
| REG-001 | Phase 1->2->3->4->5->6 full flow | Phase transitions | P0 |
| REG-002 | Phase completion revert on checklist uncheck | Completion engine | P0 |
| REG-003 | Phase 4 false completion guard | Completion engine | P0 |
| REG-004 | Phase 6 auto-generation | AI flow | P0 |
| REG-005 | Progress bar locked phase guard | Navigation | P0 |
| REG-006 | Back navigation then forward | Navigation | P0 |
| REG-007 | BOLA: user B cannot see user A trips | Security | P0 |
| REG-008 | Report completeness (existing fields) | Report | P1 |
| REG-009 | Report booking code masking | Security | P0 |
| REG-010 | Login + registration flow (Credentials) | Auth | P1 |
| REG-011 | Dashboard expedition cards | Dashboard | P1 |
| REG-012 | i18n: all strings localized (pt + en) | i18n | P1 |

---

## 11. Test Data Requirements

| Data | Source | Notes |
|------|--------|-------|
| Test user (Credentials) | `tests/fixtures/users.ts` | `@playwright.invalid` domain |
| Test user (Google OAuth) | Mock Google provider | Mocked in integration tests |
| Trip with all phases | Test seed | Synthetic data, all 6 phases populated |
| Trip with empty Phase 4 | Test seed | No transport or accommodation |
| Trip with partial checklist | Test seed | Mix of checked/unchecked items |
| Migration target data | Migration test fixtures | Pre-migration schema records |

---

## 12. Test Execution Plan

| Phase | Test Type | Method | Owner | ETA |
|-------|----------|--------|-------|-----|
| 1 | Unit tests (prompt, validation, rules) | Vitest (automated) | dev-fullstack | During implementation |
| 2 | Unit tests (footer, dialog) | Vitest + RTL (automated) | dev-fullstack | During implementation |
| 3 | Integration tests (OAuth, context, report) | Vitest (automated) | dev-fullstack | After implementation |
| 4 | Security tests (BOLA, PII, CSRF) | Vitest + manual | qa-engineer | Post-implementation |
| 5 | E2E tests (footer, Phase 4, full flow) | Playwright (automated) | qa-engineer | Pre-release |
| 6 | Regression suite | Playwright (automated) | qa-engineer | Pre-release |
| 7 | Exploratory testing (OAuth UX, dialog edge cases) | Manual | qa-engineer | Pre-release |

---

## 13. Exit Criteria

- [ ] All P0 test cases pass (100%)
- [ ] All P1 test cases pass (>= 95%)
- [ ] No P0 bugs remain open
- [ ] Regression suite passes (zero regressions)
- [ ] Security checklist from SPEC-SEC-004 fully verified
- [ ] PII guardrails verified (birthDate, bookingCode never in report DTO or prompt)
- [ ] OAuth CSRF and account linking tests pass
- [ ] Migration script tested with --dry-run on staging copy

---

## 14. Eval Criteria (EDD)

| Metrica | Threshold | Grader | Dataset |
|---------|-----------|--------|---------|
| Footer save behavior accuracy | 100% | Programatico | footer-save-behavior.json |
| Phase 4 mandatory field validation | 100% | Programatico | phase4-mandatory-fields.json |
| Report completeness (v2, with phases 3-5) | >= 95% | Programatico | report-completeness-v2.json |
| Itinerary personalization (enriched context) | >= 80% | LLM-judge | itinerary-personalization.json |
| Response latency (phase 4 validate p95) | < 500ms | Heuristico | -- |
| Test coverage (new code) | >= 80% | Vitest | -- |

### Trust Score Target
- Sprint 33 target: >= 87
- Composition: Test Coverage (25%) + Eval Pass Rate (30%) + Spec Conformance (20%) + Security Audit (15%) + Debt Ratio (10%)

### CI/CD Eval Gates
- Pre-merge: `npm run eval:gate` must pass (threshold 0.87)
- Post-deploy: E2E against staging (all existing + new tests passing)
- Drift check: `npm run eval:drift` (max 10% from baseline)

### Eval Datasets

| Dataset | Cases | Pass Threshold | Coverage |
|---------|-------|----------------|----------|
| `footer-save-behavior.json` | 10 | 100% | Footer save/discard dialog |
| `phase4-mandatory-fields.json` | 8 | 100% | Phase 4 validation |
| `report-completeness-v2.json` | 12 | 95% | Report with phases 3-5 |
| `itinerary-personalization.json` | 10 | 80% | Prompt enrichment quality |

---

## Historico de Alteracoes

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-20 | qa-engineer | Documento inicial — Sprint 33 test strategy, 6 IMPs, 4 eval datasets |
