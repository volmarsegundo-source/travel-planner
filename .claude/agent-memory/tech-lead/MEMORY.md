# Tech Lead Memory -- Travel Planner

## Project State (as of 2026-03-10)
- Sprints 1-19 complete, Sprint 19 merged to master (eed7a14)
- Current: 1365 tests, v0.13.0, 94 suites
- Sprint 20: PLANNING COMPLETE, branch feat/sprint-20 created
  - 12 tasks (T-S20-001 to T-S20-012), 28.5h estimated + 11.5h buffer
  - Task doc: docs/sprints/SPRINT-20-TASKS.md

## Key Docs Paths
- docs/tasks.md -- backlog (large file, use offset/limit)
- docs/sprints/SPRINT-20-TASKS.md -- Sprint 20 task breakdown (12 tasks, 28.5h)
- docs/sprints/SPRINT-19-TASKS.md -- Sprint 19 task breakdown (12 tasks, 32.5h)
- docs/security/SPRINT-19-SECURITY-REVIEW.md -- security review (APPROVED, no MEDIUM+)
- docs/sprint-reviews/SPRINT-019-review.md -- tech-lead sprint review
- docs/architecture.md -- conventions, folder structure, ADRs
- docs/product/TRANSPORT-PHASE-SPEC.md -- full transport phase product spec
- docs/prompts/OPTIMIZATION-BACKLOG.md -- prompt-engineer audit findings

## Sprint 20 Plan Summary
- T-S20-001 (dev-1, 1.5h): Verify/fix guide redesign rendering on staging (P0)
- T-S20-002 (dev-2, 1h): Remove duplicate buttons from ExpeditionCard (DEBT-S18-001)
- T-S20-003 (dev-1, 1h): Hash raw userId in engine logs (SEC-S19-001)
- T-S20-004 (dev-1, 4h): Phase 1 step reorder -- personal info before trip info
- T-S20-005 (dev-1, 2.5h): Profile persistence -- skip if already filled (depends T-S20-004)
- T-S20-006 (dev-2, 2h): Preferences schema + types (8 categories, Json on UserProfile)
- T-S20-007 (dev-2, 5h): Preferences UI -- toggles/checkboxes in Phase 2 (depends T-S20-006)
- T-S20-008 (dev-2, 1.5h): Preferences gamification points (depends T-S20-007)
- T-S20-009 (dev-1, 1.5h): Passenger details schema (adults/children/seniors/infants on Trip)
- T-S20-010 (dev-1, 3.5h): Passenger details UI in Phase 2 (depends T-S20-009)
- T-S20-011 (dev-2, 3h): Transport data model -- schema only, UI deferred to S21
- T-S20-012 (dev-2, 2h): Integration testing + sprint validation
- Three migrations: preferences, passengers, transport (apply in that order)

## Critical Security Findings (cumulative)
- FIND-M-001: redirect() must be OUTSIDE try/catch in all Server Actions
- FIND-M-002: Prisma 7 uses db.$extends NOT db.$use for soft-delete middleware
- SR-005: Every Prisma query in TripService must have explicit select clause
- SR-006: coverEmoji needs Unicode regex or enum
- SR-007: confirmationTitle needs .max(100) in TripDeleteSchema
- SEC-S18-001 (MEDIUM): RESOLVED in Sprint 19
- SEC-S19-001 (LOW): Scheduled fix in Sprint 20 (T-S20-003)

## Streaming Architecture (post-Sprint 19 -- FIXED)
- Stream route accumulates output, parses with Zod, persists via itinerary-persistence.service.ts
- Redis lock (NX+EX, TTL 300s) prevents duplicate generations per tripId
- Phase6Wizard shows progress UI, NOT raw JSON
- Key prop forces remount: key={`phase6-${days.length}`}

## AI Provider Architecture (current)
- Interface: AiProvider in src/server/services/ai-provider.interface.ts
- Claude: plan -> claude-sonnet-4-6, checklist/guide -> claude-haiku-4-5-20251001
- Streaming API: POST /api/ai/plan/stream (SSE format)
- Factory: getProvider() in ai.service.ts

## Guide Architecture (post-Sprint 19)
- 10 sections: timezone, currency, language, electricity, connectivity, cultural_tips, safety, health, transport_overview, local_customs
- Section types: "stat" (factual) vs "content" (descriptive)
- DestinationGuideWizard: card-based layout (2-col stat grid, expandable content list)
- POTENTIAL ISSUE: old guides (6 sections) may not render cards -- T-S20-001 investigates

## Dashboard Architecture (Sprint 18+19)
- ExpeditionCard: overlay link pattern with pointer-events-none/auto
- PhaseToolsBar: renders tools from getPhaseTools(currentPhase)
- DUPLICATE BUTTONS (lines 82-103): Scheduled fix in T-S20-002
- DashboardPhaseProgressBar: 8 segments (gold=complete, pulse=current, gray=future)

## Recurring Import Convention Violations
- PATTERN: Devs sometimes use `next/navigation` or `next/link` instead of `@/i18n/navigation`
- CHECK at every code review
- Known exceptions: LoginForm (useSearchParams), layout/catch-all (notFound)

## Team Conventions
- Communication: Portuguese; Code: English
- Commits: Conventional Commits with task IDs (e.g., feat(T-S20-004): description)
- No direct commits to main -- always via PR
- Tests included in same task as implementation
- Coverage target: >= 80% on service and schema files
- ENFORCE: Commit task IDs MUST match planning doc IDs

## Outstanding Debt (cumulative)
- DEBT-S6-003: Analytics events onboarding.completed/skipped not implemented
- DEBT-S6-004: style-src 'unsafe-inline' in prod CSP
- DEBT-S7-001: LoginForm useSearchParams from next/navigation -- exception
- DEBT-S7-002: AppError/TripError near-duplicate -- refactor to shared ErrorBoundaryCard
- DEBT-S7-003: generate-test-plan.js is CommonJS -- convert to TypeScript
- DEBT-S8-005: eslint-disable @typescript-eslint/no-explicit-any in PlanGeneratorWizard
- DEBT-S18-002: account.actions.ts has two hashUserId functions (local + imported hashForLog)
- ExpeditionHubPage coming soon uses hardcoded gray colors instead of theme tokens

## Sprint 21 Backlog (from Sprint 20 deferrals)
- Transport UI -- Phase 4 Section A (6-8h)
- Accommodation UI -- Phase 4 Section B (4-6h)
- Local mobility UI -- Phase 4 Section C (2-3h)
- Phase 4 rename "O Abrigo" -> "A Logistica" (1h)
- Origin field UI + pre-population from UserProfile (2h)
- Cascade deletion for TripTransport/TripAccommodation (1h)
- AI integration: itinerary uses transport data (4-6h)
- P2 deferred: Clickable progress bar segments, progress bar phase labels

## Lessons Learned (cumulative)
- Task ID discipline: Commits MUST use planning doc task IDs
- Key prop for React remount after router.refresh() -- reusable pattern
- Redis NX+EX lock with graceful degradation -- good for AI generation dedup
- Guide redesign took more scope than estimated in S19 -- displaced 2 P1 tasks
- Three migrations in one sprint: coordinate order to avoid conflicts
