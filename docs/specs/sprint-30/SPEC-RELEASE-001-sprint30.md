---
spec-id: SPEC-RELEASE-001-S30
title: v0.25.0 Release Plan
version: 1.0.0
status: Approved
author: release-manager
sprint: 30
reviewers: [tech-lead]
date: 2026-03-17
---

# SPEC-RELEASE-001-S30: v0.25.0 Release Plan

**Versao**: 1.0.0
**Status**: Approved
**Autor**: release-manager
**Data**: 2026-03-17
**Sprint**: 30
**Versao anterior**: v0.24.0 (Phase Nav Redesign)

---

## 1. Version

**v0.25.0** -- minor release (new features, no breaking changes).

Follows semver: MAJOR.MINOR.PATCH. New autocomplete provider architecture and dashboard rewrite are additive features.

---

## 2. Changelog Entries

### Features
- **Autocomplete geocoding provider abstraction**: `GeocodingProvider` interface with Mapbox (primary) and Nominatim (fallback), automatic failover, Redis cache with 7-day TTL (SPEC-ARCH-011, SPEC-PROD-017)
- **Mapbox Geocoding v6 integration**: improved result quality for pt-BR queries, structured city/country/state fields, country flag emojis in results
- **Offline autocomplete fallback**: top-100 cities static JSON for offline/degraded scenarios
- **Autocomplete recent searches**: up to 5 persisted recent destination searches per user
- **Dashboard rewrite**: consistent card grid layout, sort by date/destination/status, filter by status chips, contextual action buttons, skeleton loading states (SPEC-PROD-019)
- **Dashboard empty states**: dedicated empty state for no expeditions and for empty filter results
- **Dashboard card actions menu**: view details, rename, archive, delete with confirmation

### Improvements
- Client-side debounce reduced from 400ms to 300ms for autocomplete
- Mapbox attribution added to autocomplete dropdown
- Mobile full-screen overlay for autocomplete (viewports <= 640px)
- Mobile FAB for "Nova Expedicao" on dashboard
- Skeleton loading with `prefers-reduced-motion` support

### Bug Fixes
- (To be filled during sprint as bugs are found and fixed)

---

## 3. Breaking Changes

**None.** This release contains no breaking changes:
- Existing URLs unchanged (`/expeditions`, `/expedition/[tripId]/*`)
- API contract for `/api/destinations/search` is backward-compatible (same request/response shape, new `provider` and `cached` fields are additive)
- No schema changes -- Prisma models unchanged
- No removed components or exports

---

## 4. Database Migration

**None required.** No Prisma schema changes in Sprint 30.

---

## 5. Environment Changes

| Variable | Action | Required | Notes |
|----------|--------|----------|-------|
| `MAPBOX_SECRET_TOKEN` | Add to Vercel | Optional | Falls back to Nominatim if absent |

No variables removed. No variables renamed.

---

## 6. Rollback Plan

If critical issues are found post-deploy:
1. Revert to `v0.24.0` tag: `git checkout v0.24.0`
2. Redeploy from v0.24.0 commit via Vercel dashboard
3. No database rollback needed (no migrations)
4. Remove `MAPBOX_SECRET_TOKEN` from Vercel env if Mapbox-specific issues

Risk assessment: LOW -- no data model changes, no auth changes, no migration to reverse.

---

## 7. Deploy Strategy

Standard Vercel deployment on push to master:
1. PR merged to master triggers automatic Vercel build
2. Preview deployment on PR creation (for QA validation)
3. Production deployment on merge to master
4. Tag `v0.25.0` after successful production deploy

No canary deployment needed -- changes are UI-layer and geocoding proxy, not data-layer.

---

## 8. Release Checklist

- [ ] All Sprint 30 tasks marked complete in `docs/tasks.md`
- [ ] All PRs merged and reviewed by tech-lead
- [ ] Test coverage >= 80% on new service and schema files
- [ ] E2E tests passing
- [ ] Eval gate passing (`npm run eval:gate`)
- [ ] `MAPBOX_SECRET_TOKEN` configured in Vercel Production
- [ ] CHANGELOG.md updated with entries from section 2
- [ ] Git tag `v0.25.0` created
- [ ] Sprint review completed by all mandatory reviewers

---

## Historico de Alteracoes

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-17 | release-manager | Plano de release inicial — v0.25.0 |
