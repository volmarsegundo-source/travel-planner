# Sprint 20 -- Tech Lead Review

**Reviewer:** tech-lead
**Date:** 2026-03-10
**Branch:** feat/sprint-20
**Version:** v0.13.0 -> v0.14.0
**Baseline:** 1365 tests, 94 suites | **Final:** 1489 tests, 100 suites

---

## Executive Summary

Sprint 20 delivered all 7 sprint goals on time: guide rendering fix, dashboard cleanup, userId hashing, Phase 1 reorder with profile persistence, structured preferences with gamification, passenger details, and transport data model. The sprint added 124 new tests (+9.1%), reaching 1489 total across 100 suites. All tests pass and the build compiles cleanly after tech-lead review fixes.

The sprint resolved the last known security debt (SEC-S19-001) and introduced no new MEDIUM+ security findings. Three database migrations were coordinated successfully (preferences, passengers, transport). Code quality is generally strong, with well-structured Zod schemas, proper BOLA protection on profile persistence, and consistent use of hashUserId in all logger calls.

**Review verdict: APPROVED** -- ready for merge after review fixes committed.

---

## Task Completion Table

| Task | Description | Assignee | Status | Notes |
|------|-------------|----------|--------|-------|
| T-S20-001 | Guide redesign rendering fix | dev-fullstack-1 | DONE | Backward-compatible guard for old 6-section guides |
| T-S20-002 | Remove duplicate buttons (DEBT-S18-001) | dev-fullstack-2 | DONE | Clean removal, PhaseToolsBar retained |
| T-S20-003 | Hash userId in engine logs (SEC-S19-001) | dev-fullstack-1 | DONE | All 9+ occurrences fixed, grep confirms zero raw userId |
| T-S20-004 | Phase 1 step reorder | dev-fullstack-1 | DONE | Personal info now Step 1; i18n updated |
| T-S20-005 | Profile persistence skip | dev-fullstack-1 | DONE | Summary card with Edit button; BOLA-safe |
| T-S20-006 | Preferences schema + types | dev-fullstack-2 | DONE | 10 categories with Zod enums; parsePreferences graceful |
| T-S20-007 | Preferences UI (Phase 2) | dev-fullstack-2 | DONE | Chip-based selectors; existing free-text preserved |
| T-S20-008 | Preferences gamification | dev-fullstack-2 | DONE | 10 pts/category; identity_explorer badge at 5+ |
| T-S20-009 | Passenger details schema | dev-fullstack-1 | DONE | PassengersSchema with ages refinement |
| T-S20-010 | Passenger details UI (Phase 2) | dev-fullstack-1 | DONE | Airline-style +/- steppers; conditional for family/group |
| T-S20-011 | Transport data model | dev-fullstack-2 | DONE | TransportSegment + Accommodation models; cascade deletion |
| T-S20-012 | Integration testing | dev-fullstack-2 | DONE | All tests pass; import conventions clean |

**Completion: 12/12 tasks (100%)**

---

## Test Metrics

| Metric | Before (Sprint 19) | After (Sprint 20) | Delta |
|--------|--------------------|--------------------|-------|
| Test files | 94 | 100 | +6 |
| Total tests | 1365 | 1489 | +124 (+9.1%) |
| Failures | 0 | 0 | -- |
| Duration | ~120s | ~150s | +30s |

Test growth exceeded the target of +75 minimum (actual: +124). New test suites cover preferences schema, preferences service, passenger schema, transport schema, Phase1Wizard reorder, and Phase2Wizard passengers.

---

## Security Review Summary

Security review by security-specialist: **APPROVED** (see `docs/security/SPRINT-20-SECURITY-REVIEW.md`).

| Finding | Severity | Status |
|---------|----------|--------|
| SEC-S19-001: Raw userId in logger calls | LOW | **RESOLVED** (T-S20-003) |
| SEC-S20-OBS-001: No total passenger cap | INFO | Observation -- no security risk |
| SEC-S20-OBS-002: Booking code encryption deferred to S21 | INFO | Schema ready (bookingCodeEnc field) |

Key security validations passed:
- BOLA protection on profile persistence (server-side session.user.id only)
- Zod closed enums on all preferences (no injection vectors)
- Cascade deletion updated for TransportSegment and Accommodation
- No new API routes (all via server actions)
- Zero raw userId in any logger call across entire codebase

---

## Code Review Findings

### Critical -- Fixed During Review

1. **Build failure: 5 unused imports across 3 files** -- `Phase2Wizard.tsx` imported `getTotalPassengers` and `Passengers` but never used them. `PreferencesSection.tsx` imported `PREFERENCE_CATEGORIES` unused. `profile.actions.ts` imported `PreferenceCategoryKey` and `UserPreferences` types unused. All removed.

2. **Build failure: Prisma JSON type incompatibility** -- `Record<string, unknown>` casts for Prisma JSON fields did not satisfy `Prisma.InputJsonValue` in strict build mode. Fixed in `profile.actions.ts`, `preferences.service.ts`, and `expedition.service.ts` using `as unknown as Prisma.InputJsonValue`.

3. **Build failure: Missing identity_explorer in badgeNameMap** -- Sprint 20 added `identity_explorer` to the `BadgeKey` union type (gamification.types.ts) but `PointsAnimation.tsx` was not updated. The `Record<BadgeKey, string>` map was incomplete. Added `identity_explorer: "identityExplorer"` and corresponding i18n keys in both locales.

### Positive Findings

1. **Phase1Wizard profile persistence** -- Clean implementation with `isProfileComplete()` pure function, summary card with Edit toggle, and proper pre-population from server props. The server component uses explicit `select` to avoid sending sensitive fields (passportNumberEnc, nationalIdEnc).

2. **Preferences schema design** -- Well-structured with 10 categories, all using Zod closed enums. The `parsePreferences()` function handles null, undefined, and invalid data gracefully with defaults. `isCategoryFilled()` and `countFilledCategories()` are clean utility functions.

3. **Phase2Wizard passengers** -- Smart conditional step rendering based on travelerType (family/group only). Dynamic step array via useMemo. Airline-style +/- steppers with proper touch targets (h-11 w-11 = 44px). Children age dropdowns are simple and effective.

4. **ExpeditionCard cleanup** -- The duplicate button removal is clean. The component went from 103 lines to 81 lines with improved clarity. The `hasItineraryPlan` prop was correctly removed from the destructuring with a comment explaining why.

5. **Transport data model** -- Well-designed with proper Decimal types for cost, VARCHAR constraints matching Zod schema, cascade deletion, and isReturn flag for bidirectional transport segments.

6. **Phase 4 rename** -- "O Abrigo" -> "A Logistica" applied cleanly in phase-config.ts with matching i18n key update.

### Minor (Follow-up in Sprint 21)

1. **SEC-S20-OBS-001**: PassengersSchema allows up to 80 total passengers (20 per type). Consider adding a `.refine()` with a reasonable total cap (e.g., 20 total) as a business rule. Not a security issue.

2. **Phase2Wizard size** -- At 636 lines, Phase2Wizard is getting large. Consider extracting the passengers step into a `PassengersStep` subcomponent in Sprint 21 when adding transport UI.

3. **Preferences expansion scope** -- The task spec called for 8 categories but the implementation has 10 (added wakePreference and connectivityNeeds). While good additions, future scope creep should be flagged earlier.

---

## Import Convention Check

Single violation found: `src/components/features/auth/LoginForm.tsx` line 4 imports `useSearchParams` from `next/navigation`. This is a known exception (DEBT-S7-001) documented in the tech-lead memory. No new violations introduced in Sprint 20.

---

## Deferred Items for Sprint 21

From the Sprint 20 task doc (ITEM-E deferral table) plus review findings:

| Item | Estimate | Source |
|------|----------|--------|
| Transport UI -- Phase 4 Section A | 6-8h | T-S20-011 deferral |
| Accommodation UI -- Phase 4 Section B | 4-6h | T-S20-011 deferral |
| Local mobility UI -- Phase 4 Section C | 2-3h | T-S20-011 deferral |
| Origin field UI + pre-population | 2h | T-S20-011 deferral |
| Booking code AES-256-GCM encryption (service layer) | 1.5h | SEC-S20-OBS-002 |
| Total passenger cap Zod refinement | 0.5h | SEC-S20-OBS-001 |
| Phase2Wizard component extraction | 1.5h | Review finding |
| AI integration: itinerary uses transport data | 4-6h | T-S20-011 deferral |
| Clickable progress bar segments | 2h | Sprint 19 P2 deferral |

---

## Lessons Learned

1. **Build != Tests**: All 1489 tests passed but the build failed due to unused imports and Prisma type strictness. Next.js production build applies stricter ESLint and TypeScript checking than Vitest. The integration test task (T-S20-012) should explicitly include a build check as acceptance criteria.

2. **Badge map completeness**: When adding new entries to union types (like BadgeKey), all exhaustive Record/switch usages must be updated. A TypeScript strict Record ensures compile-time safety -- which is exactly what caught this. This is a good pattern.

3. **Prisma JSON type casts**: `Record<string, unknown>` is not assignable to Prisma's `InputJsonValue` in strict mode. Use `as unknown as Prisma.InputJsonValue` for JSON field writes. This should be added to the project conventions.

4. **Scope creep on preferences**: 10 categories vs 8 planned. The extra 2 categories (wakePreference, connectivityNeeds) added testing and i18n work. Devs should flag scope increases in the task doc before implementing.

5. **Three migrations succeeded**: The coordination strategy (preferences first, passengers second, transport third) worked well. No conflicts.

---

## Definition of Done Checklist

- [x] All 12 tasks marked complete
- [x] Code review approved by tech-lead (this document)
- [x] Test coverage target met (1489 tests, +124 from baseline)
- [x] Security checklist passed (see SPRINT-20-SECURITY-REVIEW.md)
- [x] No hardcoded credentials
- [x] hashUserId in all engine logger calls
- [x] No PII in logs
- [x] Bias checklist passed:
  - [x] Preference categories are inclusive and non-discriminatory
  - [x] Passenger types neutral
  - [x] No dark patterns in profile persistence
- [x] No import convention violations (new code)
- [x] All i18n keys present in both locales (en + pt-BR)
- [x] Migrations apply cleanly
- [x] Build passes (after review fixes)
- [ ] Merged to main via PR (pending)

---

**Sprint 20 status: APPROVED for merge.**
