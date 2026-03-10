# Tech Lead Memory -- Travel Planner

## Project State (as of 2026-03-10)
- Sprints 1-18 complete and merged to master
- Current: 1288 tests, v0.12.0, 89 suites
- Sprint 18: Streaming AI, Dashboard Redesign, Phase Tools (PR #19)
- Sprint 19: IN PLANNING -- 12 tasks (T-S19-001a through T-S19-012)
  - P0: Streaming fix (3 parts), hub redirect, cascade deletion, progress count, bio fix
  - P1: Guide redesign, duplicate buttons, Phase 1 reorder, auto-advance, default currency
  - P2: Clickable progress bar, phase labels
  - Deferred: ITEM-10 (traveler breakdown), ITEM-12 (preferences), ITEM-13 (transport)

## Key Docs Paths
- docs/tasks.md -- backlog (large file, use offset/limit)
- docs/sprints/SPRINT-19-TASKS.md -- Sprint 19 task breakdown (12 tasks, 32.5h)
- docs/sprints/SPRINT-18-TASKS.md -- Sprint 18 task breakdown (12 tasks)
- docs/security/SPRINT-18-SECURITY-REVIEW.md -- security review
- docs/sprint-reviews/SPRINT-018-review.md -- tech-lead sprint review
- docs/architecture.md -- conventions, folder structure, ADRs
- docs/prompts/OPTIMIZATION-BACKLOG.md -- prompt-engineer audit findings

## Critical Security Findings (cumulative)
- FIND-M-001: redirect() must be OUTSIDE try/catch in all Server Actions
- FIND-M-002: Prisma 7 uses db.$extends NOT db.$use for soft-delete middleware
- SR-005: Every Prisma query in TripService must have explicit select clause
- SR-006: coverEmoji needs Unicode regex or enum
- SR-007: confirmationTitle needs .max(100) in TripDeleteSchema
- SEC-S18-001 (MEDIUM): ItineraryDay/Activity/ChecklistItem not deleted on account deletion (Sprint 19 P0)

## AI Provider Architecture (current, post-Sprint 18)
- Interface: AiProvider in src/server/services/ai-provider.interface.ts
  - model type: "plan" | "checklist" | "guide"
  - systemPrompt parameter supported
  - generateStreamingResponse() returns { stream: ReadableStream, usage: Promise }
- Claude: src/server/services/providers/claude.provider.ts
  - plan -> claude-sonnet-4-6, checklist/guide -> claude-haiku-4-5-20251001
  - Both generateResponse() and generateStreamingResponse() have AbortSignal.timeout(90s)
- Streaming API: POST /api/ai/plan/stream (SSE format)
  - Defense-in-depth: auth -> Zod -> rate limit -> BOLA -> age guard -> injection -> PII mask
  - Rate limit key: ai:plan:${userId} (shared with server action)
  - X-Content-Type-Options: nosniff on SSE response
- Factory: getProvider() in ai.service.ts
- Token usage logged after stream completes (non-blocking)

## Streaming Architecture (Sprint 18 -- bugs found Sprint 19)
- ClaudeProvider.generateStreamingResponse() -> ReadableStream<string>
- API Route /api/ai/plan/stream -> SSE (data: chunk\n\n + data: [DONE]\n\n)
- BUG-S19-001: Stream route does NOT call persistItinerary() -- data not saved to DB
- BUG-S19-001: Phase6Wizard shows raw JSON in <pre> tag -- needs progress indicator
- BUG-S19-001: useState(initialDays) not refreshed after router.refresh() -- needs key prop
- persistItinerary() is private in ai.actions.ts -- must extract to shared service
- Auto-trigger on first visit (useEffect + hasTriggeredRef)
- AI disclaimer banner below generated content

## Dashboard Architecture (new Sprint 18)
- ExpeditionCard: overlay link pattern with pointer-events-none/auto
- PhaseToolsBar: renders tools from getPhaseTools(currentPhase)
- DashboardPhaseProgressBar: 8 segments (gold=complete, pulse=current, gray=future, opacity=coming_soon)
- Phase tools config: src/lib/engines/phase-config.ts (PHASE_TOOLS record)
- Phases 7-8 show "Em construcao" with Lock icon

## Prompt Engineering Files
- src/lib/prompts/injection-guard.ts -- checkPromptInjection(), sanitizeForPrompt()
- src/lib/prompts/pii-masker.ts -- maskPII()
- src/lib/prompts/ -- travelPlanPrompt, PLAN_SYSTEM_PROMPT

## Recurring Import Convention Violations
- PATTERN: Devs sometimes use `next/navigation` or `next/link` instead of `@/i18n/navigation`
- CHECK at every code review: grep for these in components
- Only middleware.ts and i18n config files should import from next/* navigation directly

## Team Conventions
- Communication: Portuguese; Code: English
- Commits: Conventional Commits (feat:, fix:, docs:, etc.)
- No direct commits to main -- always via PR
- Tests included in same task as implementation (not separate tasks)
- Coverage target: >= 80% on service and schema files

## Outstanding Debt (cumulative)
- SEC-S18-001: ItineraryDay/Activity/ChecklistItem orphaned on account deletion (Sprint 19 P0)
- DEBT-S6-003: Analytics events onboarding.completed/skipped not implemented
- DEBT-S6-004: style-src 'unsafe-inline' in prod CSP
- DEBT-S7-001: LoginForm useSearchParams from next/navigation -- exception
- DEBT-S7-002: AppError/TripError near-duplicate -- refactor to shared ErrorBoundaryCard
- DEBT-S7-003: generate-test-plan.js is CommonJS -- convert to TypeScript
- DEBT-S8-005: eslint-disable @typescript-eslint/no-explicit-any in PlanGeneratorWizard
- DEBT-S18-001: PhaseToolsBar duplicates checklist/itinerary shortcuts in ExpeditionCard (T-S19-007)
- DEBT-S18-002: account.actions.ts has two hashUserId functions (local + imported hashForLog)

## Sprint 19 Key Bugs (root cause confirmed via code inspection)
- ITEM-1: 3 bugs in streaming: no persistence, raw JSON display, stale state after refresh
- ITEM-2: ExpeditionHubPage defaults to phase 1 when getCurrentPhase() returns null
- ITEM-3: completedPhases counts only explicit "completed" records, ignores implicit completion
- SEC-S18-001: account deletion misses ItineraryDay, Activity, ChecklistItem (soft-delete bypasses cascade)

## Sprint 18 Lessons Learned
- Security review caught StreamRequestSchema mismatch (nested vs flat body format) -- functional bug found via security analysis
- 3 LOW findings (AbortSignal, nosniff, rate limit key) fixed within sprint after review
- Parallel dev workstream (backend streaming + frontend dashboard) worked well with minimal conflicts
