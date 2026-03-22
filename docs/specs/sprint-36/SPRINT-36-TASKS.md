# Sprint 36 — Task Checklist

**Budget**: 50h | **Estimated**: 48h | **Buffer**: 2h

---

## Track 1 — WizardFooter Global (dev-fullstack-1) — 20h

### Implementation

- [ ] **T1.1** (2h) Extract `useFormDirty` hook → `src/hooks/useFormDirty.ts` [SPEC-ARCH-028]
- [ ] **T1.2** (3h) Create `SaveDiscardDialog` → `src/components/ui/SaveDiscardDialog.tsx` [SPEC-UX-041]
- [ ] **T1.3** (1h) Enhance `WizardFooter` props (showSave, isDirty, onSave) [SPEC-ARCH-028]
- [ ] **T1.4** (2h) Refactor `Phase4Wizard` to use `useFormDirty` hook (remove inline) [SPEC-PROD-039]
- [ ] **T1.5** (3h) Integrate WizardFooter + dirty-state in Phase 1 (4 steps) [SPEC-PROD-039]
- [ ] **T1.6** (2h) Integrate WizardFooter + dirty-state in Phase 2 (preferences) [SPEC-PROD-039]
- [ ] **T1.7** (2h) Integrate WizardFooter + dirty-state in Phase 3 (checklist) [SPEC-PROD-039]
- [ ] **T1.8** (1h) Add read-only footer to Phase 5 (Voltar + Avançar) and Phase 6 (Voltar + Ver Expedições) [SPEC-PROD-039]

### Testing

- [ ] **T1.9** (3h) Unit tests: useFormDirty (10), SaveDiscardDialog (8), WizardFooter per phase (12) [SPEC-QA-012]
- [ ] **T1.10** (1h) E2E tests: footer behavior across all 6 phases (6 scenarios) [SPEC-QA-012]

---

## Track 2 — Gamification Wave 2 (dev-fullstack-2) — 26h

### Badges (12h)

- [ ] **T2.1** (1h) Prisma migration: Purchase model + User.role [SPEC-ARCH-030, DATA-ARCH]
- [ ] **T2.2** (2h) Badge registry: 16 badge definitions → `src/lib/gamification/badge-registry.ts` [SPEC-ARCH-029]
- [ ] **T2.3** (4h) Badge evaluation engine → `src/lib/gamification/badge-engine.ts` [SPEC-ARCH-029]
- [ ] **T2.4** (1h) Badge API routes: GET /api/badges [SPEC-ARCH-029]
- [ ] **T2.5** (3h) Badge showcase UI in Meu Atlas [SPEC-UX-042]
- [ ] **T2.6** (2h) Badge unlock toast + animation [SPEC-UX-042]

### PA Packages (7h)

- [ ] **T2.7** (1h) PA packages constant → `src/lib/gamification/pa-packages.ts` [SPEC-ARCH-030]
- [ ] **T2.8** (2h) Mock payment provider → `src/server/services/payment/mock-provider.ts` [SPEC-ARCH-030]
- [ ] **T2.9** (3h) Purchase flow: actions + UI (select → confirm → credit) [SPEC-UX-043, SPEC-PROD-041]
- [ ] **T2.10** (1h) Purchase history page [SPEC-UX-043]

### Admin Dashboard (7h)

- [ ] **T2.11** (2h) Admin layout + 3-layer guard (middleware, layout, action) [SPEC-ARCH-031, SPEC-SEC-006]
- [ ] **T2.12** (3h) Admin KPIs + aggregation service → `src/server/services/admin-dashboard.service.ts` [SPEC-ARCH-031]
- [ ] **T2.13** (2h) Admin charts + per-user table [SPEC-UX-044]

### Testing (5h)

- [ ] **T2.14** (3h) Unit tests: badge engine (48), payment (25), admin (18) [SPEC-QA-012]
- [ ] **T2.15** (2h) E2E tests: badge + purchase + admin (11 scenarios) [SPEC-QA-012]

---

## Cross-Cutting — 2h

- [ ] **TC.1** (1h) Spec review + approval — tech-lead
- [ ] **TC.2** (0.5h) Security audit of PRs — security-specialist
- [ ] **TC.3** (0.5h) Eval gate validation — qa-engineer
- [ ] **TC.4** (—) i18n: add keys to en.json + pt-BR.json — dev-fullstack-1 + dev-fullstack-2

---

## Release — included in estimates

- [ ] **TR.1** Tag v0.31.0
- [ ] **TR.2** Sprint 36 review document → `docs/sprint-reviews/SPRINT-036-review.md`
- [ ] **TR.3** Update CHANGELOG.md
- [ ] **TR.4** Update package.json version

---

## Summary

| Track | Tasks | Hours |
|---|---|---|
| Track 1 (Footer) | 10 | 20h |
| Track 2 (Gamification) | 15 | 26h |
| Cross-cutting | 4 | 2h |
| **Total** | **29** | **48h** |
| **Buffer** | | **2h** |
| **Budget** | | **50h** |
