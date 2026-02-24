# Release Manager — Persistent Memory

## Project State

- **Current version**: 0.1.0 (first release, greenfield)
- **Changelog**: does not exist yet — will be created when v0.1.0 ships
- **Release risk register**: does not exist yet — CIA-001 is the first entry
- **API contracts**: no public REST endpoints exist yet; Server Actions are internal contracts
- **Production users**: zero — system is in Bootstrap Phase 2

## Versioning Baseline

- Initial release is **0.1.0** (not 1.0.0 — public API not yet stable; SemVer pre-1.0)
- Pre-1.0 breaking change policy: even in 0.x.x, any breaking change to an existing Server Action signature or data migration of existing data requires a MINOR bump and a migration guide
- 1.0.0 will be declared when the REST API is publicly stable

## Key Architectural Facts

- Stack: Next.js 15 App Router + Prisma 7 + PostgreSQL 16 + Redis (Upstash) + Auth.js v5
- All mutations use Server Actions — no REST endpoints in MVP scope for trips feature
- REST endpoints under `/api/v1/` are planned for future external integrations (mobile, webhooks)
- Soft delete is mandatory for all user-owned entities (Trip, User) — `deletedAt` field
- User data isolation enforced at query level: every Trip query includes `userId` in WHERE clause
- CUID2 is the ID strategy for all primary keys

## SPEC-001 Open Issues to Track

- OQ-003: `TripService.listTrips` default status filter — must be resolved before implementation
- OQ-004: `useActionState` React 19 signature — confirm with dev before TripForm implementation
- OQ-005: Prisma 7 soft-delete uses `$extends`, not `$use` — must be confirmed before db/client.ts implementation

## CIA Conventions Established

- CIA IDs: CIA-XXX format, sequential
- CIA-001 covers US-001 / SPEC-001
- Assessment template follows the standard format defined in the agent persona
- Deployment order dependency: US-003 (users table) must be deployed before US-001 (trips table)

## Communication Language

- All docs and team communication in **Portuguese**
- Code, variables, functions, commits in **English**
- Release notes for stakeholders written in **Portuguese**
