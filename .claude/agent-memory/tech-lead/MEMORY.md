# Tech Lead Memory -- Travel Planner

## Project State (as of 2026-03-09)
- Sprints 1-15 complete and merged to master
- Sprint 15: prompt-engineer agent added (#13), initial audit complete
- Current: 750+ tests, v0.9.0
- Sprint 16: PLANNED -- prompt engineering + AI guardrails

## Key Docs Paths
- docs/tasks.md -- backlog (large file, 1278 lines, use offset/limit)
- docs/prompts/OPTIMIZATION-BACKLOG.md -- prompt-engineer audit findings (OPT-001..012)
- docs/prompts/TECH-LEAD-REVIEW.md -- Sprint 16 review + task plan
- docs/architecture.md -- conventions, folder structure, ADRs
- src/lib/prompts/injection-guard.ts -- prompt injection detection (created Sprint 15, needs fixes)

## Sprint 16 Task Plan (T-S16-001..T-S16-008)
- T-S16-001: Expand model type to "plan"|"checklist"|"guide" [dev-1] S
- T-S16-002: System prompts + cache_control all 3 AI calls [dev-1] L (biggest task)
- T-S16-003: Token usage structured logging [dev-1] S
- T-S16-004: Injection guard fixes (pt-BR, NFKD, system: regex) [dev-2] M
- T-S16-005: PII masker pre-API (CPF, email, phone, card, passport) [dev-2] M
- T-S16-006: Integrate guards into ai.actions.ts + expedition.actions.ts [dev-2] M
- T-S16-007: Reduce MIN_PLAN_TOKENS 4096->2048 [dev-1] S
- T-S16-008: Integration tests for full sanitization flow [dev-1 or 2] M
- Target: +40 new tests (790+ total)

## Sprint 16 Key Decisions
- OPT-004: Destination guide KEEPS Haiku -- intentional optimization, fix typing only
- OPT-010: PII masking PROMOTED from P3 to P1 -- LGPD compliance
- OPT-009: Batch API DEMOTED from P2 to P3 -- insufficient volume
- Medium-confidence injection patterns stay as WARN (no block) -- false positive risk

## Sprint 16 Findings to Enforce at PR Review
- FIND-S16-001: injection-guard needs pt-BR patterns (high-confidence)
- FIND-S16-002: Apply normalize('NFKD') before regex in injection-guard
- FIND-S16-003: `/\bsystem\s*:\s*/i` gives false positive on "transit system: Tokyo"
- BUG-S16-001: ai.service.ts:494 passes "checklist" for guide (fix in T-S16-001)

## Critical Security Findings (cumulative)
- FIND-M-001: redirect() must be OUTSIDE try/catch in all Server Actions
- FIND-M-002: Prisma 7 uses db.$extends NOT db.$use for soft-delete middleware
- SR-005: Every Prisma query in TripService must have explicit select clause
- SR-006: coverEmoji needs Unicode regex or enum
- SR-007: confirmationTitle needs .max(100) in TripDeleteSchema

## AI Provider Architecture (current)
- Interface: AiProvider in src/server/services/ai-provider.interface.ts
  - model type: "plan" | "checklist" (Sprint 16 adds "guide")
  - Sprint 16 adds optional systemPrompt parameter
- Claude: src/server/services/providers/claude.provider.ts
  - plan -> claude-sonnet-4-6, checklist -> claude-haiku-4-5-20251001
  - guide -> haiku (intentional, documented)
- Factory: getProvider() in ai.service.ts
- All 3 calls currently use only user message (no system prompt)
- Token usage returned but NOT logged (Sprint 16 T-S16-003 fixes this)

## Prompt Engineering Files (new Sprint 15+)
- src/lib/prompts/injection-guard.ts -- checkPromptInjection(), sanitizeForPrompt()
- src/lib/prompts/pii-masker.ts -- maskPII() (Sprint 16 T-S16-005, not yet created)
- docs/prompts/OPTIMIZATION-BACKLOG.md -- 12 optimization items prioritized
- .claude/agent-memory/prompt-engineer/MEMORY.md -- prompt-engineer findings

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

## Outstanding Debt (cumulative)
- DEBT-S6-003: Analytics events onboarding.completed/skipped not implemented
- DEBT-S6-004: style-src 'unsafe-inline' in prod CSP
- DEBT-S7-001: LoginForm useSearchParams from next/navigation -- exception
- DEBT-S7-002: AppError/TripError near-duplicate -- refactor to shared ErrorBoundaryCard
- DEBT-S7-003: generate-test-plan.js is CommonJS -- convert to TypeScript
- DEBT-S8-005: eslint-disable @typescript-eslint/no-explicit-any in PlanGeneratorWizard
- DT-S8-004: Factory creates new instance per call (low impact, accepted)
