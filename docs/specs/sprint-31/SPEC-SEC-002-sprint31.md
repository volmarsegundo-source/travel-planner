---
spec-id: SPEC-SEC-002-S31
title: Sprint 31 Security Review
version: 1.0.0
status: Draft
author: security-specialist
sprint: 31
reviewers: [tech-lead, architect]
date: 2026-03-17
---

# SPEC-SEC-002-S31: Sprint 31 Security Review

**Versao**: 1.0.0
**Status**: Draft
**Autor**: security-specialist
**Data**: 2026-03-17
**Sprint**: 31
**Specs revisadas**: SPEC-PROD-021 (Meu Atlas), SPEC-QA-005/006/007/008

---

## 1. Meu Atlas — Map Coordinates

### Finding: SEC-S31-001 (NO RISK — Informational)

Coordinates (latitude/longitude) are geographic data, NOT personally identifiable information (PII). They describe a destination (e.g., "Paris at 48.8566, 2.3522"), not the user's home address or current location.

**Rationale**:
- Trip destinations are chosen by the user and represent travel targets, not residential addresses
- The same coordinates are shared by all users who travel to the same city
- Coordinates are already stored unencrypted in `trip.destinationLat` / `trip.destinationLon` (Sprint 29)
- GDPR Article 4(1) defines personal data as data relating to an identified or identifiable natural person — a public city coordinate does not identify a person

**No encryption required** for destination coordinates.

### Finding: SEC-S31-002 (ENFORCEMENT — BOLA)

All map pin data MUST be fetched through queries that include `userId` filter:

```
// CORRECT
db.trip.findMany({ where: { userId: session.user.id, deletedAt: null } })

// WRONG — returns all users' trips
db.trip.findMany({ where: { deletedAt: null } })
```

The existing `TripService` pattern enforces BOLA on all trip queries. The map data endpoint (or server component data fetch) MUST reuse this pattern. Do NOT create a separate unguarded query for map pins.

**Test requirement**: SEC-QA005-001 and SEC-QA005-002 in SPEC-QA-005.

---

## 2. Report Generation — BOLA Check

### Finding: SEC-S31-003 (ENFORCEMENT — BOLA on Report)

The "Gerar Relatorio" feature aggregates data from phases 3, 5, and 6. Each data access point MUST enforce BOLA:

| Data Source | Required Guard |
|---|---|
| Checklist items (Phase 3) | `where: { tripId, trip: { userId } }` or join through trip |
| Guide data (Phase 5) | `where: { tripId, trip: { userId } }` |
| Itinerary data (Phase 6) | `where: { tripId, trip: { userId } }` |

The existing `ExpeditionSummaryService` (src/server/services/expedition-summary.service.ts) already performs BOLA checks. Report generation MUST reuse this service or replicate its authorization pattern.

**Booking code masking**: Any booking codes displayed in reports MUST remain masked (first 3 chars + "***") as already implemented in ExpeditionSummaryService.

---

## 3. Profile Dropdown — No New Security Concerns

### Finding: SEC-S31-004 (NO RISK)

Moving the profile link from top nav to UserMenu dropdown is a cosmetic change with zero security implications. The profile page itself (`/[locale]/account`) already:
- Requires authentication (AppShellLayout guard)
- Uses BOLA (user can only see their own profile)
- Encrypts PII at rest (via existing Prisma middleware)

**No changes needed.**

---

## 4. Date Validation — Server-Side Enforcement

### Finding: SEC-S31-005 (CRITICAL — Dual Validation Required)

Date validation (past dates, start > end, same-day) MUST be enforced on both client and server:

**Client-side**: For UX (immediate feedback). Can be bypassed.

**Server-side**: For security (authoritative). Cannot be bypassed. The Zod schema used in `createExpeditionAction` and any `updateTrip` actions MUST include:

```typescript
// In trip schema (shared between client and server)
startDate: z.date().min(new Date(new Date().setHours(0,0,0,0)), {
  message: "errors.dateMustBeTodayOrLater"
}),
endDate: z.date(),
// ... then .refine() to check endDate > startDate
```

**Threat model**: Without server-side enforcement, an attacker could create trips with dates in the past (e.g., 2020-01-01), which could:
- Corrupt analytics data (trip duration calculations)
- Break countdown logic (negative day counts)
- Produce nonsensical checklist deadlines

**Test requirement**: E2E-QA008-006 in SPEC-QA-008 specifically tests server-side bypass.

---

## 5. Leaflet / OSM — No API Keys Required

### Finding: SEC-S31-006 (INFORMATIONAL)

OpenStreetMap tiles are served freely with no API key. The Leaflet library (MIT license) loads tiles from public tile servers. There are no secrets to manage for the map feature in Sprint 31.

**Note**: If the team later switches to Mapbox tiles for the map (distinct from the existing Mapbox geocoding in Sprint 30), a `NEXT_PUBLIC_MAPBOX_TOKEN` (public token, `pk.` prefix) would be used client-side for tile rendering. This is the CORRECT pattern — public map tokens are designed for client-side use. The existing `NEXT_PUBLIC_MAPBOX_TOKEN` in `src/lib/env.ts` already supports this.

---

## 6. Gamification Badge — Non-Interactive

### Finding: SEC-S31-007 (LOW — Defense in Depth)

Ensuring the gamification badge has `pointer-events: none` and no click handler is a UX cleanup, but it also removes a potential attack surface. An interactive badge could be:
- A target for clickjacking (overlay attack tricking user into clicking)
- A confusing element for accessibility (interactive element with no function)

Setting `pointer-events: none` and `aria-role="status"` is the correct approach.

---

## 7. Sprint 31 Security Checklist

- [ ] Map pin data queries include `userId` filter (BOLA)
- [ ] Report data access uses BOLA on all 3 data sources (checklist, guide, itinerary)
- [ ] Booking codes in reports are masked (3 chars + "***")
- [ ] Date validation enforced server-side (not just client)
- [ ] No new API keys or secrets introduced
- [ ] No PII in map API responses (only destination, dates, status)
- [ ] Leaflet loaded via dynamic import (no SSR, prevents `window` errors)
- [ ] No new dependencies with known CVEs (verify leaflet, react-leaflet)
