# Data Engineer — Persistent Memory

## Project: Travel Planner

### Stack (confirmed from docs/architecture.md)
- Next.js 15 App Router, TypeScript, PostgreSQL 16, Redis (Upstash), Prisma 7, Auth.js v5
- Hosting: Vercel (frontend) + Railway/Render (DB)
- Error monitoring: Sentry; Observability: OpenTelemetry + Vercel Analytics
- IDs: CUID2 (@paralleldrive/cuid2) for all primary keys

### Analytics Decision (ADR — Bootstrap Phase 1)
- PostHog is the recommended analytics tool (EU cloud or self-hosted)
- Server-side collection only — no client-side SDK in browser
- All events validated with Zod before dispatch
- See docs/data-architecture.md for full spec

### Hashing Strategy (GDPR)
- userId: SHA-256(ANALYTICS_SALT + ":" + userId)
- entity IDs: SHA-256(ANALYTICS_ENTITY_SALT + ":" + entityType + ":" + entityId)
- Two separate salts — never reuse ANALYTICS_SALT for entity IDs
- Salt must be >= 32 bytes (64 hex chars); generate with: openssl rand -hex 32
- Hashing lives in src/lib/analytics/hash.ts (server-only)

### Key Conventions
- analytics track() always server-side — never call PostHog SDK in client components
- BaseEvent interface is the contract for all events (see data-architecture.md)
- P0 events: page_viewed, user_signed_up, user_signed_in, user_signed_out, trip_created, trip_updated, trip_deleted, destination_searched, destination_viewed, bookmark_added, bookmark_removed, activity_added, error_occurred
- trip_archived added as P0 in DATA-TRACK-001 (not in base spec — update data-architecture.md P0 table)
- NEVER store in analytics: email, name, search query text, trip titles, GPS coords, full IP, full user-agent
- Trip-specific: NEVER store destination text (free text field), confirmationTitle, coverEmoji

### Instrumentation Location Convention
- Mutation events (created/updated/archived/deleted): dispatch inside TripService, not in Server Actions
- Page view events (list_viewed, detail_viewed): dispatch in Server Component page.tsx
- All dispatch is fire-and-forget: void track(...) — never await in the critical path

### GDPR Erasure Pipeline
- Soft delete (deletedAt) on User → queue erasure job → hard delete within 30 days
- Call PostHog delete person API with user_id_hash
- Audit log (subjectHash + completedAt only, no PII) retained 7 years
- See erasure.service.ts pattern in docs/data-architecture.md

### Env Vars Required for Analytics
- ANALYTICS_SALT (min 64 hex chars)
- ANALYTICS_ENTITY_SALT (min 64 hex chars, different from above)
- POSTHOG_API_KEY (starts with "phc_")
- POSTHOG_HOST (URL)
- Validated via @t3-oss/env-nextjs in src/lib/env.ts

### Data Retention Summary
- User data: account lifetime + 30 days erasure window
- Auth sessions (Redis): 30 days TTL
- Search cache (Redis): 5 min TTL
- Raw analytics events (PostHog): 1 year
- Aggregated metrics: 3 years
- Sentry logs: 90 days
- App logs (Vercel): 30 days
- GDPR audit logs: 7 years

### Files Written
- docs/data-architecture.md — full analytics foundation spec (DATA-MODEL-001 equivalent)
- docs/DATA-TRACK-001.md — event tracking spec for Trip Creation & Management (US-001/SPEC-001)

### DATA-TRACK-001 Event Summary (Trip feature)
7 events defined: trip_created (P0), trip_updated (P0), trip_archived (P0), trip_deleted (P0),
trip_limit_reached (P1), trip_list_viewed (P1), trip_detail_viewed (P1)
- TypeScript interfaces live in: src/lib/analytics/events/trip-events.ts
- Helper builders live in: src/server/analytics/trip-analytics.ts
- Open questions: OQ-DATA-001 (deletion_source param), OQ-DATA-002 (UA parser in SC),
  OQ-DATA-004 (consent implementation), OQ-DATA-005 (trip_archived P0 elevation)
