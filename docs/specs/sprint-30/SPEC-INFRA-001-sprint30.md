---
spec-id: SPEC-INFRA-001-S30
title: Sprint 30 Infrastructure
version: 1.0.0
status: Approved
author: devops-engineer
sprint: 30
reviewers: [tech-lead, architect]
date: 2026-03-17
---

# SPEC-INFRA-001-S30: Sprint 30 Infrastructure

**Versao**: 1.0.0
**Status**: Approved
**Autor**: devops-engineer
**Data**: 2026-03-17
**Sprint**: 30
**Specs relacionadas**: SPEC-ARCH-011, SPEC-PROD-017

---

## 1. Environment Variables

### Existing Configuration (already in place)

The following Mapbox env vars are ALREADY configured in `src/lib/env.ts`:

| Variable | Block | Prefix | Validation | Purpose |
|----------|-------|--------|------------|---------|
| `MAPBOX_SECRET_TOKEN` | server | `sk.` | `z.string().startsWith("sk.").optional()` | Server-side geocoding API calls |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | client | `pk.` | `z.string().startsWith("pk.").optional()` | Client-side map tile rendering |

**No changes to `src/lib/env.ts` are required.** The SPEC-ARCH-011 references `MAPBOX_ACCESS_TOKEN` but the codebase uses the more specific naming (`MAPBOX_SECRET_TOKEN` / `NEXT_PUBLIC_MAPBOX_TOKEN`). Implementation MUST use the existing names.

### Deployment Configuration

Add `MAPBOX_SECRET_TOKEN` to:
- [ ] Vercel project settings: Production environment
- [ ] Vercel project settings: Preview environment
- [ ] `.env.example` (placeholder value, not actual token)

The token should be created in the Mapbox dashboard with `geocoding:read` scope only.

### Fallback Behavior

If `MAPBOX_SECRET_TOKEN` is not set (undefined or empty):
- `getGeocodingProvider()` returns `NominatimGeocodingProvider` (no API key needed)
- The application functions without degradation -- Nominatim is the existing behavior
- This allows local development without a Mapbox account

---

## 2. New Services

No new Docker services are required for Sprint 30:
- PostgreSQL: unchanged
- Redis: unchanged (used for geocoding cache, already running)
- No new containers, volumes, or networks

---

## 3. Database Migrations

No database migrations in Sprint 30. The data model is unchanged:
- `Trip.destinationLat` / `Trip.destinationLon` already exist (Sprint 29)
- `DestinationResult` interface is not persisted -- only the selected destination's data is saved to the Trip model
- Recent searches (SPEC-PROD-017 RF-003) will use Redis or a simple JSON field -- not a new table (deferred to implementation)

---

## 4. CI/CD Pipeline

### Current Pipeline (unchanged)
1. `npm run lint` -- ESLint + TypeScript
2. `npm run build` -- Next.js production build
3. `npm run test` -- Vitest unit/integration tests

### Addition: Eval Gate Step
Add after E2E tests in CI pipeline:
```yaml
- name: Eval Gate
  run: npm run eval:gate
  continue-on-error: false
```

This ensures the eval trust score threshold is met before deployment. The eval gate was implemented in Sprint 25 (EDD Phase 4) but not yet wired into the deploy pipeline.

---

## 5. Infrastructure Checklist for Sprint 30

- [ ] `MAPBOX_SECRET_TOKEN` added to Vercel Production env
- [ ] `MAPBOX_SECRET_TOKEN` added to Vercel Preview env
- [ ] `.env.example` updated with `MAPBOX_SECRET_TOKEN` placeholder
- [ ] Eval gate step added to CI/CD pipeline
- [ ] Redis cache verified for geocoding key pattern `geo:search:*`
- [ ] No new Docker services needed

---

## Historico de Alteracoes

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-17 | devops-engineer | Documento inicial — Sprint 30 infraestrutura |
