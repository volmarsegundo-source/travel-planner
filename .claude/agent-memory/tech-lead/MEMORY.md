# Tech Lead Memory — Travel Planner

## Project State (as of 2026-02-23)
- Bootstrap Phase 2 complete: SPEC-001, QA-SPEC-001, SEC-SPEC-001, CIA-001 all approved
- Sprint 1 task breakdown written to docs/tasks.md
- US-001 status updated to "In Progress" with all spec refs linked

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

## Sprint 1 Parallelization Pattern
- dev-fullstack-1: backend track (schema, TripService, Server Actions, Redis, integration tests)
- dev-fullstack-2: frontend track (UI components, TripForm, pages, E2E tests)
- Days 1-7 are parallel; Days 8-10 are sequential (integration + E2E require full feature)
- CIA-001 constraint: users table migration must run BEFORE trips migration

## Team Conventions
- Communication: Portuguese; Code: English
- Commits: Conventional Commits (feat:, fix:, docs:, etc.)
- No direct commits to main — always via PR
- Tests included in same task as implementation (not separate tasks)
- Coverage target: >= 80% on service and schema files
