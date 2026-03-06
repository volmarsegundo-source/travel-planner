# Tech Lead Memory -- Travel Planner

## Project State (as of 2026-03-05)
- Sprints 1-8 complete and merged to master
- Sprint 8: v0.8.0, 469 tests, AI Provider Abstraction + Wizard Improvements (T-077..T-081)
- Sprint 9: PLANNED in docs/sprint-9-tasks.md (T-082..T-094), pending execution

## Key Docs Paths
- docs/tasks.md -- backlog (large file, use offset/limit)
- docs/sprint-9-tasks.md -- Sprint 9 full task breakdown
- docs/sprint-reviews/SPRINT-008-review.md -- Sprint 8 review
- docs/architecture.md -- conventions, folder structure, ADR-001..007 (ADR-008 pending in Sprint 9)
- docs/product-backlog-review-sprint-8.md -- product-owner backlog review

## Sprint 9 Task Summary (T-082..T-094)
- T-082: Zod validation server-side for GeneratePlanParams [dev-1] -- SEC
- T-083: Prompt injection defense (system/user separation) [dev-1] -- SEC
- T-084: Guard fail-fast API key absent [dev-2] -- SEC
- T-085: Token usage logging [dev-2] -- FINOPS
- T-086: ADR-008 documentation [dev-2] -- DOCS
- T-087: Migration Prisma UserTier enum + field [dev-1] -- FEATURE
- T-088: GeminiProvider + factory by tier [dev-1] -- FEATURE (biggest task)
- T-089: Prompt caching Anthropic cache_control [dev-2] -- FINOPS
- T-090: env.ts GOOGLE_AI_API_KEY validation [dev-2]
- T-091: Cache key includes provider name [dev-1]
- T-092: Integration tests factory+providers+tier [dev-1 or 2]
- T-093: Legal pages /terms, /privacy, /support [dev-2] -- DEBT BUG-S7-004
- T-094: QA final [qa-engineer]
- Target: ~541 tests (469 + ~72 new)

## Critical Security Findings to Enforce at PR Review
- FIND-M-001: redirect() must be OUTSIDE try/catch in all Server Actions
- FIND-M-002: Prisma 7 uses db.$extends NOT db.$use for soft-delete middleware
- FIND-S8-M-001: Zod validation server-side for AI params (RESOLVING in T-082)
- FIND-S8-M-002: Prompt injection via travelNotes (RESOLVING in T-083)
- FIND-S8-M-003: Singleton Anthropic apiKey:"" fail-fast (RESOLVING in T-084)
- SR-005: Every Prisma query in TripService must have explicit select clause
- SR-006: coverEmoji needs Unicode regex or enum
- SR-007: confirmationTitle needs .max(100) in TripDeleteSchema

## Outstanding Debt (post Sprint 8)
- DEBT-S6-003: Analytics events onboarding.completed/skipped not implemented
- DEBT-S6-004: style-src 'unsafe-inline' in prod CSP
- DEBT-S7-001: LoginForm useSearchParams from next/navigation -- exception
- DEBT-S7-002: AppError/TripError near-duplicate -- refactor to shared ErrorBoundaryCard
- DEBT-S7-003: generate-test-plan.js is CommonJS -- convert to TypeScript
- DEBT-S7-004: console.log analytics in deleteUserAccountAction
- DEBT-S8-005: eslint-disable @typescript-eslint/no-explicit-any in PlanGeneratorWizard
- DT-S8-002: getProvider() doesnt receive userTier (RESOLVING in T-088)
- DT-S8-004: Factory creates new instance per call (low impact, accepted)

## AI Provider Architecture (Sprint 8-9)
- Interface: AiProvider in src/server/services/ai-provider.interface.ts
- Claude: src/server/services/providers/claude.provider.ts (Sonnet for plans, Haiku for checklists)
- Gemini: src/server/services/providers/gemini.provider.ts (Sprint 9 T-088)
- Factory: getProvider() in ai.service.ts -- Sprint 9 adds tier routing
- AiProviderResponse includes inputTokens/outputTokens
- Sprint 9 changes interface to (systemPrompt, userMessage, maxTokens, model)

## Recurring Import Convention Violations
- PATTERN: Devs sometimes use `next/navigation` or `next/link` instead of `@/i18n/navigation`
- CHECK at every code review: grep for `from "next/navigation"` and `from "next/link"` in components
- Only middleware.ts and i18n config files should import from next/* navigation directly

## Team Conventions
- Communication: Portuguese; Code: English
- Commits: Conventional Commits (feat:, fix:, docs:, etc.)
- No direct commits to main -- always via PR
- Tests included in same task as implementation (not separate tasks)
- Coverage target: >= 80% on service and schema files
