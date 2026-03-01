# Product Owner — Agent Memory

## Project: Travel Planner

### Backlog State (as of 2026-03-01)
- `docs/tasks.md` at version 3.0.0, Sprint current: 5
- Sprints 1-4 complete: auth, landing page, dev toolkit, 227 tests passing
- Sprint 5 added: US-100 to US-103 (navigation + bug fixes from manual testing)
- US-100 (Navbar autenticada) P0, US-101 (Logout) P0, US-102 (Login error fix) P0, US-103 (Breadcrumbs) P1
- Tasks T-031 to T-037 defined for Sprint 5
- Full backlog: US-001 through US-016 + US-100 through US-103; Won't Have list documented
- Next available US ID: US-104; Next available Task ID: T-038

### Scoring Formula
Score = Pain Severity (30%) + Revenue Impact (25%) + Effort inv. (20%) + Strategic Align (15%) + Competitive Diff (10%)
- Each criterion scored 1-5, weighted by percentage
- Used in Sprint 5 scoring matrix (US-100 to US-103)
- Previous formula (User Value x2 + Business Value x2 + Effort + Risk + Dep) used in Sprint 1 matrix

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
