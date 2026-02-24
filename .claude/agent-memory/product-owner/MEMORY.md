# Product Owner — Agent Memory

## Project: Travel Planner

### Backlog State (as of 2026-02-23)
- `docs/tasks.md` created at version 1.0.0
- US-001 (Trip creation & management) is the active P0 story in Sprint 1
- US-003 (Auth) is P0 and runs in parallel with US-001 (second dev)
- Full backlog: US-001 through US-010 defined; Won't Have list documented

### Scoring Formula
Score = User Value x2 + Business Value x2 + Effort(inv) + Risk(inv) + Dependency
- Effort and Risk are inverse (5 = low effort/risk, 1 = high)
- Used this formula in the feature scoring matrix in docs/tasks.md

### Key Domain Decisions
- Trip entity is the central domain object — all other features depend on it
- Max 20 active trips per user (MVP business rule defined in US-001 AC-007)
- Soft delete policy: `deletedAt` for Trip/User; `status=ARCHIVED` for archiving (distinct from delete)
- Destination field in v1 is free text (no Mapbox autocomplete yet — deferred to US-004)
- Cover image upload deferred to US-010 (schema field reserved but UI not built in Sprint 1)

### Architecture Constraints Relevant to PO
- Stack: Next.js 15, PostgreSQL, Redis (Upstash), Prisma 7, Auth.js v5, Mapbox GL JS
- Team: 2 full-stack developers
- Auth architecture already decided (Auth.js v5, self-hosted, GDPR compliant)
- No microservices, no separate mobile app in MVP scope
- Booking integration deferred (PCI-DSS scope, GDS/NDC complexity)
- Collaborative real-time editing deferred (WebSocket/CRDT complexity)

### Communication Rules
- Documents written in Portuguese (team rule)
- User story variables (As a / I want / So that) stay in English
- Technical terms stay in English
- No emojis in outputs (project convention)

### Traveler Personas Confirmed for this Project
- @leisure-solo: primary for US-001
- @leisure-family: primary for US-001
- @business-traveler: secondary for US-001
- Other personas (@bleisure, @group-organizer, @travel-agent) relevant for future features

### Open Questions to Flag (from architecture.md)
- B2B/multi-tenancy: must decide before first DB migration (schema change required)
- Email notifications: provider not chosen yet
- Analytics platform: PostHog self-hosted is candidate (GDPR)
- Content management: who manages destination data (CMS vs seed data)?
