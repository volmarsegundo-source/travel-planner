---
spec-id: SPEC-RELEASE-002-S31
title: v0.26.0 Release Plan
version: 1.0.0
status: Draft
author: release-manager
sprint: 31
reviewers: [tech-lead]
date: 2026-03-17
---

# SPEC-RELEASE-002-S31: v0.26.0 Release Plan

**Versao**: 1.0.0
**Status**: Draft
**Autor**: release-manager
**Data**: 2026-03-17
**Sprint**: 31
**Versao anterior**: v0.25.0 (Autocomplete Rewrite + Dashboard Overhaul)

---

## 1. Version

**v0.26.0** -- minor release (new features, no breaking changes).

Follows semver: MAJOR.MINOR.PATCH. Atlas map rewrite, phase completion engine refinements, dashboard quick-access, and UX cleanups are all additive changes.

---

## 2. Changelog Entries

### Features
- **Meu Atlas interactive map**: Leaflet-based world map with expedition pins, status-based pin colors (gold=completed, blue=active, gray=planned), click-to-view popup with expedition data, filter chips by status (SPEC-PROD-018, SPEC-QA-005)
- **Phase completion engine refinements**: Explicit completion rules per phase, auto-completion when all 6 phases done, progress bar color consistency with completion status (SPEC-QA-006)
- **Dashboard quick-access links**: "Ver Checklist", "Ver Guia", "Ver Roteiro" links on expedition cards, visible only when content exists. "Gerar Relatorio" button enabled when phases 3+5+6 are complete (SPEC-QA-007)

### Improvements
- Profile link moved to UserMenu dropdown (cleaner top navigation)
- Gamification badge made non-interactive (pointer-events: none, role="status")
- Date validation strengthened: past dates blocked, same-day blocked, start > end blocked (client + server enforcement)
- "Completar Expedicao" button removed, replaced with "Ver Expedicoes"
- Dark mode support for map tiles (CartoDB Dark Matter)
- Mobile bottom sheet for map pin popups (375px+ viewports)

### Bug Fixes
- (To be filled during sprint as bugs are found and fixed)

### Dependencies
- Added: `leaflet` ^1.9.4 (BSD-2-Clause), `react-leaflet` ^4.2.1 (MIT)
- No dependencies removed

---

## 3. Breaking Changes

**None.**

- Map page is a new feature (no existing behavior changed)
- Phase completion logic refines existing behavior (no status regressions)
- Quick-access links are additive (no existing links removed)
- UX cleanups are cosmetic (no API changes)

---

## 4. Migration Notes

**No database migrations required.** All data fields used by Sprint 31 features already exist in the schema (destinationLat/Lon from Sprint 29, ExpeditionPhase from Sprint 9).

**No environment variable changes required.** Map tiles use OSM (no key needed).

---

## 5. Rollback Plan

If critical issues are discovered post-deploy:

**Rollback to v0.25.0** via:
```bash
git revert <sprint-31-merge-commit>
npm run build
# Deploy reverted build
```

**Specific feature rollbacks** (if only one feature is problematic):
- Map page: Can be hidden via feature flag or route removal without affecting other features
- Phase completion: Revert to previous TripReadinessService logic
- Quick-access links: Remove from ExpeditionCard rendering
- UX cleanups: Revert individual component changes

---

## 6. Test Requirements Before Release

- [ ] All unit tests passing (target: 2024 baseline + Sprint 31 additions)
- [ ] All E2E scenarios from SPEC-QA-005/006/007/008 passing
- [ ] `npm run build` clean (zero errors)
- [ ] `npm run lint` clean
- [ ] `npm run i18n:check` passes (all new strings in PT-BR + EN)
- [ ] `npm run eval:gate` passes (trust score >= 0.8)
- [ ] Security checklist from SPEC-SEC-002-S31 completed
- [ ] Manual verification of map rendering on 4G throttle (< 3s)

---

## 7. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Leaflet SSR crash in production | Low (dynamic import) | High | Verified at build time, E2E test covers |
| OSM tile server downtime | Low | Medium | Map shows empty tiles, app remains functional |
| Phase completion regression | Medium | High | Comprehensive E2E from SPEC-QA-006, unit test suite |
| Date validation bypass in edge timezone | Low | Medium | Server-side Zod validation is timezone-aware |

---

## 8. Post-Release Monitoring

| Metric | Watch Period | Threshold | Action |
|---|---|---|---|
| Error rate on `/meu-atlas` | 24h post-deploy | > 1% | Investigate, consider rollback |
| Phase completion accuracy | 48h post-deploy | Any status mismatch reported | Hotfix |
| Client JS errors | 24h post-deploy | > 0.5% increase | Investigate Leaflet compatibility |
| Bundle size regression | At deploy | > 50KB gzip increase | Investigate, optimize chunks |
