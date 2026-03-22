# SPEC-RELEASE-006: v0.31.0 Release Plan — Sprint 36

**Version**: 1.0.0
**Status**: Draft
**Author**: release-manager
**Reviewers**: tech-lead
**Created**: 2026-03-22
**Last Updated**: 2026-03-22
**Sprint**: 36
**Baseline**: v0.30.0

---

## 1. Version

**v0.30.0 → v0.31.0** (MINOR bump)

**Rationale**: All changes are additive — new hooks, components, badge engine, purchase model, admin route. The WizardFooter refactor replaces inline dirty-state logic but preserves identical behavior.

---

## 2. Changelog

### Added
- `useFormDirty` hook — reusable djb2 hash-based dirty-state detection
- `SaveDiscardDialog` component — modal for unsaved changes warning
- WizardFooter applied to all 6 phases (consistent save/navigate behavior)
- Badge evaluation engine with 16 badge definitions in 4 categories
- Badge showcase UI in "Meu Atlas" profile page
- PA package purchase flow with mock payment provider
- `Purchase` Prisma model (additive migration)
- Admin dashboard with profit tracking (/admin/dashboard)
- `User.role` field for admin access control

### Changed
- Phase 1-6 wizards refactored to use shared WizardFooter component
- Phase4Wizard dirty-state logic extracted from inline to `useFormDirty` hook

### Internal
- 4 eval datasets for EDD (footer, badges, purchase, admin)
- 18 specification documents across 9 dimensions

---

## 3. Breaking Changes Assessment

| Category | Breaking? | Details |
|---|---|---|
| API contracts | No | No server action signatures changed |
| Data model | No | Additive migration only (Purchase table, role column) |
| UI behavior | No | WizardFooter preserves Phase4 behavior, adds to others |
| Environment | No | New env vars have defaults or are optional |
| Dependencies | No | No new npm packages required |

**Verdict: No breaking changes.**

---

## 4. Migration Notes

### Database
- Single additive Prisma migration: `add_purchase_model_and_user_role`
- Creates `Purchase` table and adds `role` column to `User`
- No data migration for existing users (role defaults to "user")
- UserBadge model exists since Sprint 9 — no changes

### Environment
- Add 3 new env vars: `PAYMENT_PROVIDER=mock`, `PAYMENT_WEBHOOK_SECRET`, `ADMIN_EMAILS`
- Update `.env.example` and `env.ts`

---

## 5. Risk Matrix

| ID | Risk | Probability | Impact | Mitigation |
|---|---|---|---|---|
| RISK-S36-001 | Phase4Wizard regression after hook extraction | Medium | High | Dedicated regression tests; snapshot comparison |
| RISK-S36-002 | WizardFooter breaks Phase 1-3 wizard navigation | Medium | Medium | E2E tests per phase; manual QA |
| RISK-S36-003 | Badge evaluation triggers false positives | Low | Low | Idempotent awards; criteria validation |
| RISK-S36-004 | Mock payment credits PA without proper validation | Low | Medium | Server-side price lookup; idempotent credit |
| RISK-S36-005 | Admin route accessible to non-admin users | Low | Critical | 3-layer defense; E2E test for 403 |

**Overall risk: MEDIUM** — primary concern is WizardFooter refactor touching all 6 phases.

---

## 6. Rollback Plan

| Trigger | Action |
|---|---|
| Critical bug in WizardFooter | Revert to v0.30.0 tag |
| Admin access control bypass | Hotfix role check; if unresolvable, revert |
| PA credit anomaly | Disable mock payment endpoint; revert if needed |

- Purchase table remains in DB without harm (unused by v0.30.0)
- Badge progress generated during v0.31.0 would be lost (acceptable for new feature)
- PA credited via mock purchases remains in user balance

---

## 7. Pre-Release Checklist

- [ ] All 18 specs approved by tech-lead
- [ ] Spec conformance audit by QA (all features match specs)
- [ ] Security review completed (SPEC-SEC-006)
- [ ] All CRITICAL security items (SEC-036-006/007/008/013/027/028) addressed
- [ ] Unit test count increased (target: +80 from 2325 baseline)
- [ ] E2E test count increased (target: +15 from 124 baseline)
- [ ] Build clean (`npm run build` zero errors)
- [ ] Lint clean (`npm run lint` zero errors)
- [ ] Eval gate passes (trust score >= 0.85)
- [ ] Manual test: WizardFooter in all 6 phases
- [ ] Manual test: Badge unlock flow
- [ ] Manual test: Mock purchase flow end-to-end
- [ ] Manual test: Admin dashboard access (admin + non-admin)
- [ ] Migration runs successfully on staging DB
- [ ] i18n: all new keys in en.json and pt-BR.json
- [ ] No secrets committed
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json

---

## 8. Post-Release Verification

1. Login → navigate to expedition → verify WizardFooter in Phase 1
2. Make changes in Phase 1 → click Voltar → verify SaveDiscardDialog appears
3. Complete a phase → verify badge check runs (check logs)
4. Open "Meu Atlas" → verify badge showcase renders
5. Navigate to /meu-atlas/comprar-pa → verify package cards
6. Mock-purchase Explorador package → verify PA balance increases by 500
7. Check purchase history entry
8. Login as admin → navigate to /admin/dashboard → verify KPIs render
9. Login as non-admin → navigate to /admin/dashboard → verify 403 redirect
10. Run `npm test` → all tests pass
11. Check Redis cache keys created for badge and admin data

---

## 9. Open Risks from Prior Sprints

| ID | Sprint | Description | Status | Blocks v0.31.0? |
|---|---|---|---|---|
| RISK-003 | 8 | AI rate limiting bypass | Mitigated | No |
| RISK-005 | 8 | deploy.yml placeholder | Open | No (no real prod deploy) |
| RISK-010 | 11 | API security headers | Open | No |
| SEC-S34-001 | 34 | OAuth redirect URI | Open | No |
| SEC-S34-004 | 34 | Phone field injection | Open | No |

None block v0.31.0 release.

---

## Historico de Alteracoes

| Versao | Data | Alteracao |
|---|---|---|
| 1.0.0 | 2026-03-22 | Criacao inicial — v0.31.0 release plan |
