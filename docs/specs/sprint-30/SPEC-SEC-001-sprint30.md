---
spec-id: SPEC-SEC-001-S30
title: Sprint 30 Security Review
version: 1.0.0
status: Approved
author: security-specialist
sprint: 30
reviewers: [tech-lead, architect]
date: 2026-03-17
---

# SPEC-SEC-001-S30: Sprint 30 Security Review

**Versao**: 1.0.0
**Status**: Approved
**Autor**: security-specialist
**Data**: 2026-03-17
**Sprint**: 30
**Specs revisadas**: SPEC-PROD-017, SPEC-PROD-019, SPEC-ARCH-011

---

## 1. Mapbox API Key Management

### Finding: SEC-S30-001 (CRITICAL enforcement)

The Mapbox secret token (`MAPBOX_SECRET_TOKEN`, prefix `sk.`) MUST remain server-side only. It is already correctly configured in `src/lib/env.ts` under the `server` block (not `client`).

**Requirements**:
- The geocoding proxy route (`/api/destinations/search`) is the ONLY code path that uses `MAPBOX_SECRET_TOKEN`
- The token MUST NOT appear in any client bundle, React component, or `NEXT_PUBLIC_*` variable for geocoding
- Note: `NEXT_PUBLIC_MAPBOX_TOKEN` (prefix `pk.`) exists for map tile rendering -- this is a separate public token with read-only tile scope. It MUST NOT be used for geocoding API calls
- Mapbox token scopes: `MAPBOX_SECRET_TOKEN` should have `geocoding:read` scope only -- no write, no admin

### Existing Pattern to Reuse

The current Nominatim proxy in `/api/destinations/search/route.ts` already implements the correct pattern:
- Server-side API route acts as proxy between client and external geocoding service
- Client never communicates directly with geocoding provider
- API key never leaves the server

The new `GeocodingProvider` abstraction (SPEC-ARCH-011) MUST preserve this proxy pattern. Direct client-to-Mapbox calls are not permitted.

---

## 2. BOLA (Broken Object-Level Authorization)

### Finding: SEC-S30-002 (NO NEW RISK)

The dashboard rewrite (SPEC-PROD-019) displays expedition cards filtered by the authenticated user. The existing trip query pattern in the codebase already enforces `userId: session.user.id` in all Prisma queries via `TripService`.

**Requirements**:
- Dashboard queries MUST continue to filter by `session.user.id` -- no changes to authorization logic
- The new sort/filter controls (RF-005, RF-006) operate client-side on already-fetched data -- no new server endpoints needed
- The "Excluir" (delete) and "Arquivar" (archive) actions in the card menu MUST verify ownership server-side before mutating data (existing pattern in `trip.actions.ts`)

---

## 3. Input Sanitization — Autocomplete Search Query

### Finding: SEC-S30-003 (MEDIUM)

The autocomplete search query (`q` parameter) is passed to an external API (Mapbox or Nominatim). Malicious input could be used for:
- XSS via reflected search terms in the dropdown UI
- Injection into the external API URL

**Requirements**:
- Strip HTML tags and script content from the `q` parameter before processing: `q.replace(/<[^>]*>/g, "")`
- Apply `encodeURIComponent()` before constructing the Mapbox/Nominatim API URL (already noted in SPEC-ARCH-011 section 10)
- Validate: min 2 chars, max 100 chars, trimmed (already specified in SPEC-ARCH-011 section 5)
- React's JSX auto-escaping prevents XSS in the dropdown UI, but sanitize at the API layer as defense-in-depth
- Search queries MUST NOT be logged (they could reveal travel plans -- PII adjacent)

---

## 4. Rate Limiting

### Finding: SEC-S30-004 (NO NEW RISK)

The existing `checkRateLimit` utility (Redis-backed, per-user) MUST be reused for the refactored `/api/destinations/search` route.

**Requirements**:
- Rate limit: 10 req/5s per user (relaxed from 3/2s per SPEC-ARCH-011 section 5, due to Mapbox's generous limits)
- Rate limiting is per authenticated user (`session.user.id`), not per IP -- prevents false positives on shared networks
- 429 response format: `{ "error": "Rate limit exceeded" }` -- no additional information leaked

---

## 5. PII Assessment

### Finding: SEC-S30-005 (NO NEW RISK)

Neither the autocomplete rewrite nor the dashboard rewrite introduces new PII handling:
- Autocomplete search queries are geographic location names -- not PII
- Dashboard displays trip data already accessible to the authenticated user
- Recent searches (RF-003 in SPEC-PROD-017) store destination names, not personal data
- No new fields containing names, emails, passport numbers, or payment data

---

## 6. Dependency Review

No new npm dependencies are introduced in Sprint 30 (per SPEC-ARCH-011 section 14). Mapbox Geocoding v6 is accessed via native `fetch` -- no SDK needed.

---

## 7. Security Checklist for Sprint 30 PRs

All PRs in Sprint 30 MUST pass:

- [ ] `MAPBOX_SECRET_TOKEN` is never imported or referenced in any file under `src/components/` or `src/app/` client components
- [ ] Geocoding API calls go through the server-side route handler only
- [ ] Search query parameter is sanitized (HTML stripped, URI-encoded, length-validated)
- [ ] Dashboard queries filter by `session.user.id`
- [ ] Delete/archive actions verify ownership server-side
- [ ] Rate limiting is applied to the geocoding proxy route
- [ ] No search queries are logged
- [ ] No hardcoded API keys or tokens in committed code

---

## Historico de Alteracoes

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-17 | security-specialist | Revisao de seguranca inicial — Sprint 30 |
