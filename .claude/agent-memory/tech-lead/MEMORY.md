# Tech Lead Memory -- Travel Planner

## Project State (as of 2026-03-05)
- Sprints 1-6 complete and merged to master
- Sprint 7 reviewed: 6/6 tasks done (T-050..T-055), 449 tests, APPROVED WITH CONDITIONS
- Sprint 7 conditions: CONDITION-001 (FIND-M-001 comment guard), CONDITION-002 (track import violations in backlog)
- Sprint 7 resolved Sprint 6 debt: DEBT-S6-001 (OnboardingWizard), DEBT-S6-002 (TrustSignals)

## Key Docs Paths
- docs/tasks.md -- backlog (large file, use offset/limit)
- docs/sprint-planning-6-7.md -- Sprint 6+7 full planning
- docs/sprint-reviews/SPRINT-006-review.md -- Sprint 6 tech-lead review
- docs/architecture.md -- conventions, folder structure, ADR-001..007
- docs/SPEC-001.md -- Trip Creation & Management spec
- docs/QA-SPEC-001.md -- Test strategy
- docs/SEC-SPEC-001.md -- CLEARED WITH CONDITIONS (FIND-M-001, FIND-M-002)

## Critical Security Findings to Enforce at PR Review
- FIND-M-001: redirect() must be OUTSIDE try/catch in all Server Actions
- FIND-M-002: Prisma 7 uses db.$extends NOT db.$use for soft-delete middleware
- SR-005: Every Prisma query in TripService must have explicit select clause
- SR-006: coverEmoji needs Unicode regex or enum
- SR-007: confirmationTitle needs .max(100) in TripDeleteSchema

## Outstanding Debt (as of Sprint 7 review)
- DEBT-PRE-001: PlanGeneratorWizard.tsx uses `useRouter` from `next/navigation` -- HIGH priority Sprint 8
- DEBT-PRE-002: TripCard.tsx uses `Link` from `next/link` -- HIGH priority Sprint 8
- DEBT-S6-001: RESOLVED in Sprint 7 (OnboardingWizard)
- DEBT-S6-002: RESOLVED in Sprint 7 (TrustSignals)
- DEBT-S6-003: Analytics events onboarding.completed/skipped not implemented (AC-009, AC-010)
- DEBT-S6-004: style-src 'unsafe-inline' in prod CSP (required for Tailwind, needs documentation)
- T-045: Move sprint-5-stabilization.md to docs/ (never done)
- DEBT-S7-001: LoginForm useSearchParams from next/navigation -- needs documentation as exception
- DEBT-S7-002: AppError/TripError are near-duplicate -- refactor to shared ErrorBoundaryCard
- DEBT-S7-003: generate-test-plan.js is CommonJS -- convert to TypeScript
- DEBT-S7-004: console.log analytics in deleteUserAccountAction -- replace with analytics service

## Recurring Import Convention Violations
- PATTERN: Devs sometimes use `next/navigation` or `next/link` instead of `@/i18n/navigation`
- This breaks locale prefix routing and can lose query params on redirect
- CHECK at every code review: grep for `from "next/navigation"` and `from "next/link"` in components
- Only middleware.ts and i18n config files should import from next/* navigation directly

## Team Conventions
- Communication: Portuguese; Code: English
- Commits: Conventional Commits (feat:, fix:, docs:, etc.)
- No direct commits to main -- always via PR
- Tests included in same task as implementation (not separate tasks)
- Coverage target: >= 80% on service and schema files

## Sprint 1 Parallelization Pattern
- dev-fullstack-1: backend Server Actions; dev-fullstack-2: frontend UI
- Claude models: claude-sonnet-4-6 for travel plans, claude-haiku-4-5-20251001 for checklists
- i18n (next-intl): MUST be configured Day 1 before any text is hardcoded
- Google Places: proxy via /api/v1/places/autocomplete to never expose API key
