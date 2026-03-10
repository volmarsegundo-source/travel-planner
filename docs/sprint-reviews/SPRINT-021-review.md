# Sprint 21 -- Combined Review

**Reviewers:** tech-lead, security-specialist, architect, devops-engineer, release-manager, finops-engineer
**Date:** 2026-03-11
**Branch:** feat/sprint-21
**PR:** #22 (merged)
**Version:** v0.14.0 -> v0.15.0
**Baseline:** 1489 tests, 100 suites | **Final:** 1575 tests, 106 suites (+86 tests, +6 suites)

---

## Executive Summary

Sprint 21 delivered all 9 committed items on time: Phase 4 "A Logística" full UI with tabbed Transport/Accommodation/Mobility sections, booking code encryption, origin field with profile pre-population, passenger cap validation, clickable progress bar with labels, and PassengersStep tech debt extraction. The sprint added 86 new tests (+5.8%), reaching 1575 total across 106 suites. All tests pass and build compiles cleanly.

**Review verdict: APPROVED**

---

## Task Completion Table

| Task | Description | Assignee | Status | Notes |
|------|-------------|----------|--------|-------|
| T-S21-001 | Origin field UI + pre-population | dev-fullstack-1 | DONE | DestinationAutocomplete reuse, profile pre-fill |
| T-S21-002 | Transport wizard Section A | dev-fullstack-1 | DONE | N-record list, visual type selector, encrypted booking codes |
| T-S21-003 | Accommodation Section B | dev-fullstack-2 | DONE | N-record list, max 5 cap, encrypted booking codes |
| T-S21-004 | Local Mobility Section C | dev-fullstack-2 | DONE | Multi-select icon grid, 7 mobility options |
| T-S21-005 | Booking code encryption service | dev-fullstack-1 | DONE | AES-256-GCM via crypto.ts, BOLA-protected |
| T-S21-006 | Passenger cap validation | dev-fullstack-2 | DONE | Total ≤ 20 Zod refinement |
| T-S21-007 | Clickable progress bar | dev-fullstack-2 | DONE | Link to phase page for completed/current |
| T-S21-008 | Progress bar phase labels | dev-fullstack-2 | DONE | Hover tooltips with CSS group/hover |
| T-S21-009 | PassengersStep extraction | dev-fullstack-1 | DONE | Phase2Wizard 636 → ~200 lines |

**Completion: 9/9 tasks (100%)**

---

## Security Review (security-specialist)

### Status: APPROVED

**Encryption (T-S21-005):**
- [PASS] BOLA checks present in both TransportService and AccommodationService
- [PASS] bookingCode encrypted with AES-256-GCM before storage (`encrypt()` from crypto.ts)
- [PASS] Decrypted on read, encrypted value (`bookingCodeEnc`) stripped from response
- [PASS] Both services import `"server-only"` — not importable from client bundles
- [PASS] Transaction pattern prevents partial state on failure

**Server Actions (transport.actions.ts):**
- [PASS] Auth check (`await auth()`) on every action
- [PASS] Zod validation on all inputs before DB operations
- [PASS] No raw user input reaches DB unvalidated
- [PASS] Logger uses `hashUserId()` — no raw PII exposure

**Progress Bar Navigation (T-S21-007):**
- [PASS] Only completed and current phases render as `<Link>`
- [PASS] Future/coming-soon phases are non-clickable divs
- [PASS] Phase page itself has its own server-side auth guard (AppShellLayout)

**Passenger Cap (T-S21-006):**
- [PASS] Server-side Zod refinement: `adults + children.count + seniors + infants <= 20`
- [PASS] Applied in PassengersSchema which is validated in server actions

**Observations (from detailed review SEC-S21-001-security-review.md):**
- FIND-S21-001 (LOW): Spread operator on DB objects in `transport.service.ts:75` / `accommodation.service.ts:73` could leak future columns — recommend explicit field whitelist
- FIND-S21-002 (LOW): `tripId` parameter not Zod-validated for CUID format in `transport.actions.ts` — recommend `z.string().cuid()`
- FIND-S21-003 (INFO): `MAX_PASSENGERS_PER_TYPE` (20) equals `MAX_TOTAL_PASSENGERS` (20), making per-type cap redundant
- FIND-S21-004 (LOW): Origin field in `expedition.schema.ts:11` lacks `.trim()`, allowing whitespace-only strings server-side
- SEC-S21-OBS-001 (INFO): Consider adding rate limiting on transport/accommodation save actions in future sprint

---

## Tech Lead Review

### Status: APPROVED

**Code Quality:**
- Consistent naming and structure across all new components
- Service layer follows established pattern (static methods, BOLA checks, transactions)
- Server actions follow established pattern (`"use server"`, auth check, Zod parse, try/catch)
- Components follow existing wizard patterns (VisualCardSelector reuse, atlas styling)

**TypeScript:**
- Proper typed interfaces on all components
- `AccommodationInput` and `TransportSegmentInput` from Zod inference
- Decimal conversion uses `toNumber()` method check for Prisma compatibility

**Test Coverage:**
- 86 new tests covering services, components, schemas, and dashboard
- Service tests mock DB and crypto correctly
- Component tests cover rendering, interactions, and edge cases
- Schema tests cover boundary conditions

**i18n:**
- All new keys present in both `en.json` and `pt-BR.json`
- Consistent key structure under `expedition.phase4.*`

**Observations:**
- TECH-S21-OBS-001 (SUGGESTION): Phase4Wizard could benefit from useMemo on tab content to prevent re-renders
- TECH-S21-OBS-002 (SUGGESTION): TransportStep and AccommodationStep share significant UI patterns — consider extracting a shared `RecordListStep` base in Sprint 22

---

## Architect Review

### Status: APPROVED

- Phase4Wizard tabbed architecture is clean and extensible
- Replace-all pattern for transport/accommodation CRUD is appropriate for this use case (N records, managed as a set)
- No new migrations needed — Sprint 20 models used as-is
- Origin field integration follows established pattern (optional field, profile pre-population)
- PassengersStep extraction improves component maintainability

---

## DevOps Review

### Status: APPROVED

- No infrastructure changes required
- No new environment variables needed (ENCRYPTION_KEY already configured)
- Build size increase minimal: Phase 4 page 8.28 kB (reasonable for 3-tab wizard)
- No new API routes — all functionality via server actions

---

## Release Manager Review

### Status: APPROVED

- Version bump: 0.14.0 → 0.15.0 (minor — new features, no breaking changes)
- No breaking API changes
- No database migrations required
- Backward compatible — existing Phase 4 data untouched
- PR #22 merged cleanly, tag v0.15.0 pushed

---

## FinOps Review

### Status: APPROVED

- No new AI API calls introduced (AI integration deferred to Sprint 22)
- No new third-party service costs
- Encryption uses Node.js built-in crypto — zero cost
- No impact on current cost baseline

---

## Sprint Metrics

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Tests | 1489 | 1575 | +86 (+5.8%) |
| Test Suites | 100 | 106 | +6 |
| Build Size (Phase 4) | 3.2 kB | 8.28 kB | +5.08 kB |
| New Files | — | 7 | — |
| Modified Files | — | 8 | — |
| Lines Added | — | ~3,783 | — |
| Lines Removed | — | ~195 | — |

---

## Deferred Items

| Item | Reason | Target |
|------|--------|--------|
| AI itinerary uses transport data | Needs prompt-engineer + finops consultation | Sprint 22 |
| RecordListStep base extraction | Non-blocking tech debt | Sprint 22+ |
| Rate limiting on transport actions | Low priority, auth-gated | Sprint 22+ |
| Explicit field whitelist on service reads | FIND-S21-001, prevent future column leaks | Sprint 22 |
| CUID validation on tripId params | FIND-S21-002, defense in depth | Sprint 22 |
| Origin field .trim() | FIND-S21-004, whitespace-only input | Sprint 22 |

---

## Sprint Review Checklist

- [x] `architect` review completed and documented
- [x] `security-specialist` review completed and documented
- [x] `devops-engineer` review completed and documented
- [x] `tech-lead` review completed and documented
- [x] `release-manager` review completed and documented
- [x] `finops-engineer` review completed — no cost impact
- [x] All blockers resolved
- [x] Sprint review committed to repository
