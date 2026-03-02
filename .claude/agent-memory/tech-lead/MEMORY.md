# Tech Lead Memory — Travel Planner

## Project State (as of 2026-03-01)
- Sprints 1-4 complete: auth, landing page, dev toolkit, 227 tests passing
- Sprint 5 planned: Authenticated Navigation & Fixes (US-100..103, T-031..037)
- SPEC-005 reviewed; ADR-006 (route group) and ADR-007 (shared LanguageSwitcher) accepted
- T-032 + T-034 start in parallel; T-031 + T-035 after T-032; T-033 after T-031; T-036 after T-035; T-037 last

## Key Docs Paths
- docs/tasks.md — backlog + Sprint 5 task breakdown (T-031 to T-037)
- docs/specs/SPEC-005-authenticated-navigation.md — Sprint 5 spec (navbar, logout, login fix, breadcrumbs)
- docs/SPEC-001.md — Trip Creation & Management spec
- docs/QA-SPEC-001.md — Test strategy
- docs/SEC-SPEC-001.md — CLEARED WITH CONDITIONS (FIND-M-001, FIND-M-002)
- docs/architecture.md — conventions, folder structure, ADR-001..007

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
