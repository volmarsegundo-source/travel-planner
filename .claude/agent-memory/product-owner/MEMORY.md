# Product Owner — Agent Memory

## Project: Travel Planner

### Backlog State (as of 2026-03-10)
- Product version: 0.12.0 (post Sprint 18 merge)
- Sprints 1-18 complete; Sprint 18 = feature sprint (1288 tests)
- `docs/tasks.md` at version 3.0.0 (stale — needs major update)
- Next available US ID: US-123; Next available Task ID: TBD
- Full backlog: US-001 through US-016 + US-100 through US-122
- ITEM-13 (Transport) + ITEM-14 (Destination Guide) spec: `docs/product/TRANSPORT-PHASE-SPEC.md`
- US-115 to US-122 defined in TRANSPORT-PHASE-SPEC.md (not yet in tasks.md)
- Sprint 19 backlog: `docs/sprints/SPRINT-19-BACKLOG.md`

### ITEM-13/14 User Stories (defined 2026-03-10)
- US-115: Transport registration (Must, L, 3.70)
- US-116: Accommodation registration (Must, M, 3.10)
- US-117: Local mobility selection (Should, S, 3.10)
- US-118: Trip origin field (Must, S, 3.65)
- US-119: AI cost estimate for transport (Could, S, 3.30)
- US-120: Destination guide cards redesign (Must, M, 3.20)
- US-121: Expanded guide categories (Should, S, 3.10)
- US-122: Destination chat AI — Premium (Could, L, 3.65)

### Phase 4 Redesign Decision
- Rename Phase 4: "O Abrigo" -> "A Logistica" (APPROVED by stakeholder — PO-1)
- 3 internal sections: Transport, Accommodation, Local Mobility
- Keep 8 phases total (no new phase added)
- Badge rename: host -> logistics_master
- Trip.origin field required (new column)
- Transport: round-trip AND one-way (PO-2), multi-city connections (PO-3)
- Multiple accommodations per trip, max 5 (UX-1)

### Scoring Formula
Score = Pain Severity (30%) + Revenue Impact (25%) + Effort inv. (20%) + Strategic Align (15%) + Competitive Diff (10%)
- Each criterion scored 1-5, weighted by percentage
- Used consistently since Sprint 5

### Key Domain Decisions
- Trip entity is the central domain object — all other features depend on it
- Max 20 active trips per user (MVP business rule defined in US-001 AC-007)
- Soft delete policy: `deletedAt` for Trip/User; `status=ARCHIVED` for archiving (distinct from delete)
- Destination field in v1 is free text (no Mapbox autocomplete yet — deferred to US-004)
- Onboarding detection: check if user has 0 trips (no hasCompletedOnboarding flag in v1)
- Account deletion: soft delete + PII anonymization + audit log (hash of user ID only)
- Profile edit v1: name + language only (email read-only, password change deferred, avatar upload deferred)
- **Freemium model**: Free tier = Gemini Flash, Premium tier = Claude Sonnet (decided Sprint 8)
- **AI Provider Abstraction**: AiProvider interface + ClaudeProvider + factory getProvider() (Sprint 8)
- **User Tier**: enum FREE/PREMIUM on User model, default FREE, exposed in JWT session (Sprint 9)

### Architecture Constraints Relevant to PO
- Stack: Next.js 15, PostgreSQL, Redis (Upstash), Prisma 7, Auth.js v5, Mapbox GL JS
- Team: 2 full-stack developers
- Auth architecture: Auth.js v5 with JWT sessions (ADR-005 corrected in Sprint 6)
- AI: AiProvider interface, ClaudeProvider (Sonnet for plans, Haiku for checklists), GeminiProvider planned
- SDK: @google/genai (v1.44.0, GA since May 2025) recommended over legacy @google/generative-ai
- No microservices, no separate mobile app in MVP scope
- Booking integration deferred (PCI-DSS scope, GDS/NDC complexity)

### Communication Rules
- Documents written in Portuguese (team rule)
- User story variables (As a / I want / So that) stay in English
- Technical terms stay in English
- No emojis in outputs (project convention)

### Traveler Personas Confirmed for this Project
- @leisure-solo: primary for US-001, US-104, US-107, US-112, US-113
- @leisure-family: primary for US-001, US-104, US-107, US-112, US-113
- @business-traveler: secondary for US-001, US-107; primary for Premium tier
- Other personas (@bleisure, @group-organizer, @travel-agent) relevant for future features

### MVP Roadmap (updated post Sprint 18)
- Sprint 19: P0 bug fixes (streaming, phase nav, progress bar) + guide redesign (US-120/121) + UX polish
- Sprint 20: US-118 (origin field) + US-115 (transport) + US-117 (local mobility)
- Sprint 21: US-116 (accommodation) + US-119 (AI cost estimate) + ITEM-7/10/12
- Future: US-122 (destination chat AI — Premium)

### Sprint 19 Key Items (14 items triaged from manual testing)
- P0: ITEM-1 (streaming broken, 6h), ITEM-2 (Continue btn phase6+, 3h), ITEM-3 (progress count, 2h), SEC-S18-001 (cascade delete, 3h)
- P1: ITEM-14/US-120+121 (guide redesign, 10h), ITEM-8 (confirmation screen, 3h), ITEM-9 (auto transitions, 3h), ITEM-6 (remove dup btns, 1h), ITEM-11 (currency default, 1h)
- P2: ITEM-4 (clickable progress, 3h), ITEM-5 (phase labels, 2h)
- Deferred: ITEM-13 (transport, Sprint 20), ITEM-7 (phase 1 reorder), ITEM-10 (traveler details), ITEM-12 (preferences expansion)

### Pending Debts (post Sprint 18)
- Most Sprint 6-8 debts resolved in Sprint 17 (hardening)
- SEC-S18-001: Cascade deletion for ItineraryDay/Activity/ChecklistItem (scheduled Sprint 19)
- ITEM-7: Phase 1 reorder (info pessoal before trip info) — deferred, effort L
- ITEM-10: Traveler detail (adults, children, ages) — deferred, requires data model change
- ITEM-12: Preferences expansion — deferred, requires PO category definition

### Gemini Flash Pricing (March 2026)
- Gemini 2.5 Flash: $0.30/M input, $2.50/M output
- Free tier: 15 req/min, 1000 req/day (reduced since Dec 2025)
- Claude Sonnet 4: $3.00/M input, $15.00/M output
- Savings for Free tier: ~90% input, ~83% output vs Claude
- Privacy: Google free tier may use prompts for model improvement (document in ToS)

### Open Questions to Flag
- Email notifications: provider not chosen yet (needed for account deletion confirmation)
- Analytics platform: PostHog self-hosted is candidate (GDPR)
- Payment gateway: not chosen yet (needed for Premium upgrade in Sprint 10+)
- Google AI free tier privacy disclosure: must be added to terms of use
