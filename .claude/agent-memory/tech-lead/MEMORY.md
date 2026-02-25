# Tech Lead Memory — Travel Planner

## Project State (as of 2026-02-24)
- Bootstrap Phase 2 complete: SPEC-001, QA-SPEC-001, SEC-SPEC-001, CIA-001 all approved
- Sprint 1 detailed plan written to docs/tasks.md (section "Sprint 1 — Plano Detalhado")
- MVP v2.0: 10 user stories Sprint 1, Claude API core, Google Places, i18n from Day 1
- T-001 to T-014 fully planned with daily subtasks, sync points, risks and DoD

## Key Docs Paths
- docs/tasks.md — backlog + Sprint 1 task breakdown (TASK-001 to TASK-019)
- docs/SPEC-001.md — Trip Creation & Management spec
- docs/QA-SPEC-001.md — Test strategy (unit UT-001..043, integration IT-001..008, E2E E2E-001..010)
- docs/SEC-SPEC-001.md — CLEARED WITH CONDITIONS (FIND-M-001, FIND-M-002 must be fixed)
- docs/CIA-001.md — v0.1.0, non-breaking greenfield, users table must exist before trips migration
- docs/architecture.md — conventions, folder structure, error classes, naming

## Critical Security Findings to Enforce at PR Review
- FIND-M-001: redirect() must be OUTSIDE try/catch in all Server Actions (SPEC-001 §11.4 has the correct pattern; §4.1 sample is wrong)
- FIND-M-002: Prisma 7 uses db.$extends NOT db.$use for soft-delete middleware (db.$use is deprecated Prisma 5+)
- SR-005: Every Prisma query in TripService must have explicit select clause
- SR-006: coverEmoji needs Unicode regex or enum — z.string().max(10) alone is insufficient
- SR-007: confirmationTitle needs .max(100) in TripDeleteSchema

## Sprint 1 Parallelization Pattern (v2.0)
- dev-fullstack-1: T-001, T-005, T-007, T-010, T-012 + backend Server Actions
- dev-fullstack-2: T-002, T-003, T-004, T-006, T-008, T-009, T-011 + frontend UI
- Days 1-7 parallel; Days 8-10 QA + integration with qa-engineer
- CIA-001 constraint: users table migration must run BEFORE trips migration
- Claude models: claude-sonnet-4-6 for travel plans, claude-haiku-4-5-20251001 for checklists
- Cache strategy: Redis TTL 24h, hash key uses bucket ranges (R$500 budget buckets, month not exact date)
- i18n (next-intl): MUST be configured Day 1 before any text is hardcoded in frontend
- Google Places: proxy via /api/v1/places/autocomplete to never expose API key to client
- Drag-and-drop: @dnd-kit/core + @dnd-kit/sortable (MIT) with TouchSensor for mobile
- Key sync points: Day 1 17h (session contract), Day 4 EOD (trip types), Day 6 AM (AI types), Day 7 17h (full flow test)

## Team Conventions
- Communication: Portuguese; Code: English
- Commits: Conventional Commits (feat:, fix:, docs:, etc.)
- No direct commits to main — always via PR
- Tests included in same task as implementation (not separate tasks)
- Coverage target: >= 80% on service and schema files
