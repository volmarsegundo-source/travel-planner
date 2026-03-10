# Tech Lead Memory -- Travel Planner

## Project State (as of 2026-03-10)
- Sprints 1-19 complete (Sprint 19 on feat/sprint-19, pending merge)
- Current: 1365 tests, v0.13.0, 94 suites
- Sprint 19: 10 of 12 tasks delivered, 2 P1 deferred (duplicate buttons, Phase 1 reorder)
  - DONE: Streaming fix (3 parts), hub redirect, cascade deletion, progress count, bio fix, auto-advance, currency util, guide redesign, dedup autocomplete
  - DEFERRED to S20: T-S19-007 (remove duplicate buttons), T-S19-008 (Phase 1 reorder), T-S19-011/012 (P2)

## Key Docs Paths
- docs/tasks.md -- backlog (large file, use offset/limit)
- docs/sprints/SPRINT-19-TASKS.md -- Sprint 19 task breakdown (12 tasks, 32.5h)
- docs/sprints/SPRINT-18-TASKS.md -- Sprint 18 task breakdown (12 tasks)
- docs/security/SPRINT-19-SECURITY-REVIEW.md -- security review (APPROVED, no MEDIUM+)
- docs/sprint-reviews/SPRINT-019-review.md -- tech-lead sprint review
- docs/architecture.md -- conventions, folder structure, ADRs
- docs/prompts/OPTIMIZATION-BACKLOG.md -- prompt-engineer audit findings

## Critical Security Findings (cumulative)
- FIND-M-001: redirect() must be OUTSIDE try/catch in all Server Actions
- FIND-M-002: Prisma 7 uses db.$extends NOT db.$use for soft-delete middleware
- SR-005: Every Prisma query in TripService must have explicit select clause
- SR-006: coverEmoji needs Unicode regex or enum
- SR-007: confirmationTitle needs .max(100) in TripDeleteSchema
- SEC-S18-001 (MEDIUM): **RESOLVED in Sprint 19** -- cascade deletion added for ItineraryDay/Activity/ChecklistItem
- SEC-S19-001 (LOW): Raw userId in phase-engine.ts (4), points-engine.ts (4), itinerary-plan.service.ts (1) -- pre-existing

## Streaming Architecture (post-Sprint 19 -- FIXED)
- Stream route now accumulates output, parses with Zod, persists via itinerary-persistence.service.ts
- Redis lock (NX+EX, TTL 300s) prevents duplicate generations per tripId
- Phase6Wizard shows progress UI (spinner + phase messages + progress bar), NOT raw JSON
- Key prop on Phase6Wizard forces remount after router.refresh(): key={`phase6-${days.length}`}
- New service: src/server/services/itinerary-persistence.service.ts
  - persistItinerary(), parseItineraryJson(), acquireGenerationLock(), releaseGenerationLock()
- Progress utility: src/lib/utils/stream-progress.ts
  - getProgressPhase(), countDaysInStream(), calculateProgressPercent()

## AI Provider Architecture (current, post-Sprint 18)
- Interface: AiProvider in src/server/services/ai-provider.interface.ts
  - model type: "plan" | "checklist" | "guide"
  - systemPrompt parameter supported
  - generateStreamingResponse() returns { stream: ReadableStream, usage: Promise }
- Claude: src/server/services/providers/claude.provider.ts
  - plan -> claude-sonnet-4-6, checklist/guide -> claude-haiku-4-5-20251001
- Streaming API: POST /api/ai/plan/stream (SSE format)
  - Defense-in-depth: auth -> Zod -> rate limit -> BOLA -> age guard -> injection -> PII mask -> Redis lock
- Factory: getProvider() in ai.service.ts

## Guide Architecture (post-Sprint 19)
- GUIDE_SYSTEM_PROMPT: 10 sections (was 6) -- timezone, currency, language, electricity, connectivity, cultural_tips, safety, health, transport_overview, local_customs
- Section types: "stat" (factual) vs "content" (descriptive with optional details)
- Types: GuideSectionType, GuideSectionKey, GuideSectionData, DestinationGuideContent in ai.types.ts
- DestinationGuideWizard: card-based layout (2-col stat grid, expandable content list)

## Dashboard Architecture (Sprint 18+19)
- ExpeditionCard: overlay link pattern with pointer-events-none/auto
- PhaseToolsBar: renders tools from getPhaseTools(currentPhase)
- STILL HAS duplicate buttons (lines 82-103) -- DEBT-S18-001 unresolved
- DashboardPhaseProgressBar: 8 segments (gold=complete, pulse=current, gray=future)
- completedPhases: Math.max(explicit "completed" count, currentPhase - 1)
- PhaseEngine.getHighestCompletedPhase() added for hub redirect fallback

## Prompt Engineering Files
- src/lib/prompts/injection-guard.ts -- checkPromptInjection(), sanitizeForPrompt()
- src/lib/prompts/pii-masker.ts -- maskPII()
- src/lib/prompts/system-prompts.ts -- PLAN_SYSTEM_PROMPT, CHECKLIST_SYSTEM_PROMPT, GUIDE_SYSTEM_PROMPT

## Recurring Import Convention Violations
- PATTERN: Devs sometimes use `next/navigation` or `next/link` instead of `@/i18n/navigation`
- CHECK at every code review: grep for these in components
- Only middleware.ts and i18n config files should import from next/* navigation directly
- Known exceptions: LoginForm (useSearchParams), layout/catch-all (notFound)

## Team Conventions
- Communication: Portuguese; Code: English
- Commits: Conventional Commits (feat:, fix:, docs:, etc.)
- No direct commits to main -- always via PR
- Tests included in same task as implementation (not separate tasks)
- Coverage target: >= 80% on service and schema files
- ENFORCE: Commit task IDs MUST match planning doc IDs (Sprint 19 lesson learned)

## Outstanding Debt (cumulative)
- DEBT-S6-003: Analytics events onboarding.completed/skipped not implemented
- DEBT-S6-004: style-src 'unsafe-inline' in prod CSP
- DEBT-S7-001: LoginForm useSearchParams from next/navigation -- exception
- DEBT-S7-002: AppError/TripError near-duplicate -- refactor to shared ErrorBoundaryCard
- DEBT-S7-003: generate-test-plan.js is CommonJS -- convert to TypeScript
- DEBT-S8-005: eslint-disable @typescript-eslint/no-explicit-any in PlanGeneratorWizard
- DEBT-S18-001: PhaseToolsBar duplicates checklist/itinerary shortcuts in ExpeditionCard
- DEBT-S18-002: account.actions.ts has two hashUserId functions (local + imported hashForLog)
- SEC-S19-001 (LOW): Raw userId in gamification engines (9 occurrences, ~1h fix)
- ExpeditionHubPage coming soon uses hardcoded gray colors instead of theme tokens

## Sprint 20 Carry-Over (from Sprint 19)
- T-S19-007: Remove duplicate Checklist/Roteiro buttons in ExpeditionCard (P1)
- T-S19-008: Phase 1 step reorder -- personal info before trip info (P1)
- T-S19-011: Clickable progress bar segments (P2)
- T-S19-012: Progress bar phase labels (P2)
- ITEM-10: Traveler count adult/child/senior breakdown (P2, needs schema change)
- ITEM-12: Expanded personal preferences with toggles (P2, needs ADR)

## Sprint 19 Lessons Learned
- Task ID discipline: Commits MUST use planning doc task IDs. Sprint 19 had mismatched IDs causing traceability issues
- Key prop for React remount after router.refresh() -- reusable pattern for stale useState
- Redis NX+EX lock with graceful degradation is good pattern for AI generation dedup
- extracting persistItinerary to shared service was correct architectural call
- Guide redesign took more scope than estimated -- displaced T-S19-007 and T-S19-008
