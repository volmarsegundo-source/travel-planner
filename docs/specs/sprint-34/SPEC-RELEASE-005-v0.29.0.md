# SPEC-RELEASE-005: v0.29.0 Release Plan

**Version**: 1.0.0
**Status**: Draft
**Author**: release-manager
**Reviewers**: tech-lead
**Created**: 2026-03-21
**Last Updated**: 2026-03-21

---

## 1. Release Summary

**Version**: v0.29.0
**Sprint**: 34
**Theme**: Footer redesign, Phase 4 improvements, OAuth, Phone validation

## 2. Changelog

### Features
- **Footer 3-button redesign**: Standardized WizardFooter with Voltar/Salvar/Avancar layout, dirty-state detection via form hash, save/discard confirmation dialog with 3 options (SPEC-UX-037, SPEC-ARCH-024)
- **Phase 4 improvements**: Ida/Ida e Volta toggle for transport, "Ainda nao decidi" checkbox per step (transport/accommodation/mobility), mandatory field asterisks, inline error states (SPEC-UX-038, SPEC-ARCH-026)
- **Phone input mask**: Auto-formatting phone input with Brazilian default, international support, E.164 validation (SPEC-UX-039)
- **Social login error handling**: OAuth error banners, loading states, account linking prompts for Google and Apple (SPEC-UX-040, SPEC-ARCH-027)

### Fixes
- **Phase 3 completion**: Verify `syncPhaseStatus` called after every checklist toggle, fix edge case for 0 mandatory items (SPEC-ARCH-025)

### Internal
- `useFormDirty` hook + `computeFormHash` utility (SPEC-ARCH-024)
- Apple Sign In provider configuration (SPEC-ARCH-027)

## 3. Breaking Changes

None. The WizardFooter API is backward-compatible (new props are optional).

## 4. Migrations

None. No Prisma schema changes. `undecidedSteps` stored in existing `ExpeditionPhase.metadata` JSON column.

## 5. Rollback Plan

Rollback to: **v0.28.0**

Steps:
1. Revert git to v0.28.0 tag
2. Redeploy
3. No data migration rollback needed (metadata JSON is additive)

## 6. Pre-Deploy Checklist

- [ ] All 46 test scenarios passing (SPEC-QA-011)
- [ ] Trust score >= 85%
- [ ] OAuth redirect URIs registered in Google Cloud Console and Apple Developer
- [ ] Environment variables set for staging and production
- [ ] Security review findings addressed (SPEC-SEC-005)

## 7. Post-Deploy Checklist

- [ ] Verify Google login flow end-to-end on production
- [ ] Verify Apple login flow end-to-end on production
- [ ] Verify footer save/discard dialog on all 6 phases
- [ ] Verify Phase 4 "Ainda nao decidi" bypass works correctly
- [ ] Monitor error logs for OAuth callback failures

---

## Historico de Alteracoes

| Versao | Data | Alteracao |
|---|---|---|
| 1.0.0 | 2026-03-21 | Criacao inicial — Sprint 34 |
