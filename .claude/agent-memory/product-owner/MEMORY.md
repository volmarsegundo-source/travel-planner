# Product Owner — Agent Memory

## Project: Travel Planner

### Backlog State (as of 2026-03-04)
- `docs/tasks.md` at version 3.0.0, Sprint current: 5 (completed)
- Sprint planning 6-7 created: `docs/sprint-planning-6-7.md`
- Sprints 1-5 complete: auth, DB, landing, dev toolkit, authenticated navigation (268 tests)
- Sprint 6 planned: debt (CSP, rate limiter, ARIA, docs) + onboarding wizard + trust signals + header/footer auth
- Sprint 7 planned: user profile/settings + authenticated footer + E2E polish
- US-104 (Onboarding wizard) P0, US-105 (Trust signals) P1, US-106 (Header auth) P1
- US-107 (User profile) P0, US-108 (Auth footer) P1, US-109 (E2E polish) P1
- Tasks T-038 to T-055 defined for Sprints 6-7
- Full backlog: US-001 through US-016 + US-100 through US-109
- Next available US ID: US-110; Next available Task ID: T-056
- S6-003 removed from backlog (404 i18n already fixed pre-Sprint 6)

### Scoring Formula
Score = Pain Severity (30%) + Revenue Impact (25%) + Effort inv. (20%) + Strategic Align (15%) + Competitive Diff (10%)
- Each criterion scored 1-5, weighted by percentage
- Used consistently since Sprint 5

### Key Domain Decisions
- Trip entity is the central domain object — all other features depend on it
- Max 20 active trips per user (MVP business rule defined in US-001 AC-007)
- Soft delete policy: `deletedAt` for Trip/User; `status=ARCHIVED` for archiving (distinct from delete)
- Destination field in v1 is free text (no Mapbox autocomplete yet — deferred to US-004)
- Cover image upload deferred to US-010 (schema field reserved but UI not built in Sprint 1)
- Onboarding detection: check if user has 0 trips (no hasCompletedOnboarding flag in v1)
- Account deletion: soft delete + PII anonymization + audit log (hash of user ID only)
- Profile edit v1: name + language only (email read-only, password change deferred, avatar upload deferred)

### Architecture Constraints Relevant to PO
- Stack: Next.js 15, PostgreSQL, Redis (Upstash), Prisma 7, Auth.js v5, Mapbox GL JS
- Team: 2 full-stack developers
- Auth architecture: Auth.js v5 with JWT sessions (not database sessions — ADR-005 to be corrected in T-040)
- No microservices, no separate mobile app in MVP scope
- Booking integration deferred (PCI-DSS scope, GDS/NDC complexity)
- Collaborative real-time editing deferred (WebSocket/CRDT complexity)

### Communication Rules
- Documents written in Portuguese (team rule)
- User story variables (As a / I want / So that) stay in English
- Technical terms stay in English
- No emojis in outputs (project convention)

### Traveler Personas Confirmed for this Project
- @leisure-solo: primary for US-001, US-104, US-107
- @leisure-family: primary for US-001, US-104, US-107
- @business-traveler: secondary for US-001, US-107
- Other personas (@bleisure, @group-organizer, @travel-agent) relevant for future features

### MVP Roadmap (post Sprint 7)
- Sprint 8: Budget + expenses (US-009, US-011, US-012, US-013)
- Sprint 9: Booking links (US-010) + on-the-go editing (US-014)
- Sprint 10: LGPD full compliance (US-016) + security audit + production deploy

### Open Questions to Flag
- Email notifications: provider not chosen yet (needed for account deletion confirmation)
- Analytics platform: PostHog self-hosted is candidate (GDPR)
- Content management: who manages destination data (CMS vs seed data)?

### Bugs Fixed Pre-Sprint 6 (session 2026-03-04)
1. RegisterForm missing confirm password field — FIXED
2. Registration redirected to verify-email instead of login — FIXED
3. Breadcrumbs missing on /trips page — FIXED
4. 404 page without Header/Footer and i18n — FIXED
