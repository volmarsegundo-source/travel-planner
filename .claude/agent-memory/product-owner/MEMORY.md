# Product Owner -- Agent Memory

## Project: Travel Planner

### Backlog State (as of 2026-03-11)
- Product version: 0.15.1 (post Sprint 22-S Stabilization)
- Sprints 1-21 complete + Sprint 22-S (stabilization, 14 bug fixes)
- 1575 tests passing, 0 failures, clean build
- `docs/tasks.md` at version 3.0.0 (stale -- needs major update)
- Next available US ID: US-124; Next available Task ID: TBD
- Full backlog: US-001 through US-016 + US-100 through US-123
- Sprint 22 backlog seeds: `docs/sprints/SPRINT-22-BACKLOG-SEEDS.md` (11 items, 20-28h)
- Q2 2026 Roadmap: `docs/product/ROADMAP-2026-Q2.md`
- Staging: travel-planner-eight-navy.vercel.app (manual testing pending)

### Sprint 21 Results (latest feature sprint)
- ALL Sprint 21 seeds delivered (transport UI, accommodation, mobility, origin, encryption, passenger cap, progress bar UX)
- 1575 tests (106 suites), v0.15.0
- Sprint review: APPROVED (all 6 reviewers)
- Stabilization Sprint 22-S: 14 bug fixes, v0.15.1

### Sprint 20 Results
- 12/12 tasks completed (100%)
- Preferences 10 categories, passengers airline-style, Phase 1 reorder, profile persistence
- SEC-S19-001 RESOLVED (last known security debt at time)
- v0.14.0, 1489 tests

### Sprint 19 Results
- 10 of 12 tasks delivered
- Guide redesign (10 cats), streaming fix, cascade delete, auto-advance
- Carried to S20: DEFER-001, DEFER-002 (both resolved)

### Sprint 20 Plan (theme: "Personal Preferences + UX Debt Cleanup")
- P0: T-S20-001 verify guide redesign on staging (0.5h)
- P1: T-S20-002 preferences expansion 8 categories (10h), T-S20-003 Phase 1 reorder (8h), T-S20-004 remove dup buttons (1h)
- P2: T-S20-005 SEC-S19-001 hash userId (1h), T-S20-006 passenger details airline-style (6h), T-S20-007 theme tokens (1h)
- Total committed: ~27.5h + 12.5h buffer (31%)
- Sacrifice order: T-S20-007 -> T-S20-006 -> T-S20-005

### US-123 Preference Categories (8 categories, defined Sprint 20)
1. Cuisine (multi-select): local, italian, japanese, mexican, vegetarian, vegan, street_food, fine_dining, cafes
2. Activities (multi-select): museums, hiking, beaches, nightlife, shopping, sports, photography, gastronomy, history
3. Travel pace (single-select): relaxed, moderate, intense
4. Day period (multi-select): morning, afternoon, evening
5. Dietary restrictions (multi-select): gluten_free, lactose_free, vegetarian, vegan, halal, kosher, seafood_allergy, none
6. Accessibility (multi-select): wheelchair, reduced_mobility, visual, hearing, none
7. Meal budget (single-select): budget, moderate, premium
8. Cultural interests (multi-select): contemporary_art, ancient_history, religion, live_music, theater, festivals, crafts
- Storage: UserProfile.preferences JSON field
- Gamification: +10 pts per category, badge "identity_explorer" at >= 5 categories

### ITEM-13/14 User Stories
- US-115: Transport registration (Must, L, 3.70) -- Sprint 21
- US-116: Accommodation registration (Must, M, 3.10) -- Sprint 22
- US-117: Local mobility selection (Should, S, 3.10) -- Sprint 21
- US-118: Trip origin field (Must, S, 3.65) -- Sprint 21
- US-119: AI cost estimate for transport (Could, S, 3.30) -- Sprint 22
- US-120: Destination guide cards redesign (Must, M, 3.20) -- DONE Sprint 19
- US-121: Expanded guide categories (Should, S, 3.10) -- DONE Sprint 19
- US-122: Destination chat AI -- Premium (Could, L, 3.65) -- Future

### Phase 4 Redesign Decision
- Rename Phase 4: "O Abrigo" -> "A Logistica" (APPROVED by stakeholder -- PO-1)
- 3 internal sections: Transport, Accommodation, Local Mobility
- Keep 8 phases total (no new phase added)
- Badge rename: host -> logistics_master
- Trip.origin field required (new column)
- Transport: round-trip AND one-way (PO-2), multi-city connections (PO-3)
- Multiple accommodations per trip, max 5 (UX-1)

### Transport Assessment (Sprint 20 decision)
- Transport full scope (US-115+116+117+118+rename) = 36-40h = entire sprint
- Decision: DO NOT include in Sprint 20. Dedicate Sprint 21 to transport.
- Sprint 21: US-118 + US-115 + US-117 + rename (~26-30h)
- Sprint 22: US-116 + US-119 (~14-16h)

### Scoring Formula
Score = Pain Severity (30%) + Revenue Impact (25%) + Effort inv. (20%) + Strategic Align (15%) + Competitive Diff (10%)
- Each criterion scored 1-5, weighted by percentage
- Used consistently since Sprint 5

### Key Domain Decisions
- Trip entity is the central domain object -- all other features depend on it
- Max 20 active trips per user (MVP business rule defined in US-001 AC-007)
- Soft delete policy: `deletedAt` for Trip/User; `status=ARCHIVED` for archiving (distinct from delete)
- Onboarding detection: check if user has 0 trips (no hasCompletedOnboarding flag in v1)
- Account deletion: soft delete + PII anonymization + audit log (hash of user ID only)
- **Freemium model**: Free tier = Gemini Flash, Premium tier = Claude Sonnet (decided Sprint 8)
- **AI Provider Abstraction**: AiProvider interface + ClaudeProvider + factory getProvider() (Sprint 8)
- **User Tier**: enum FREE/PREMIUM on User model, default FREE, exposed in JWT session (Sprint 9)
- **Preferences**: JSON field on UserProfile, 8 structured categories (Sprint 20)
- **Passenger details**: airline-style steppers (adults/children/infants/seniors) -- Sprint 20-21

### Architecture Constraints Relevant to PO
- Stack: Next.js 15, PostgreSQL, Redis (Upstash), Prisma 7, Auth.js v5, Mapbox GL JS
- Team: 2 full-stack developers
- Auth architecture: Auth.js v5 with JWT sessions (ADR-005 corrected in Sprint 6)
- AI: AiProvider interface, ClaudeProvider (Sonnet for plans, Haiku for checklists), GeminiProvider planned
- No microservices, no separate mobile app in MVP scope
- Booking integration deferred (PCI-DSS scope, GDS/NDC complexity)

### Communication Rules
- Documents written in Portuguese (team rule)
- User story variables (As a / I want / So that) stay in English
- Technical terms stay in English
- No emojis in outputs (project convention)

### Traveler Personas Confirmed for this Project
- @leisure-solo: primary for US-001, US-104, US-107, US-112, US-113, US-123
- @leisure-family: primary for US-001, US-104, US-107, US-112, US-113, US-123
- @business-traveler: secondary for US-001, US-107; primary for Premium tier
- Other personas (@bleisure, @group-organizer, @travel-agent) relevant for future features

### MVP Roadmap (updated post Sprint 22-S)
- Sprint 22: AI transport integration + security hardening + code quality (SEED-S22-001 through 011)
- Sprint 23: GeminiProvider (Free tier) + paginas legais + US-119 (AI cost estimate)
- Sprint 24: Analytics (PostHog) + testes manuais + prompt caching -- BETA READY
- Sprint 25: Beta launch (50-100 users) + US-122 (Premium chat AI)
- Sprint 26-28: Iteration on feedback + payment gateway + v1.0 GA
- Full roadmap: `docs/product/ROADMAP-2026-Q2.md`

### Pending Debts (post Sprint 22-S)
- DT-S9-001 (HIGH): spendPoints TOCTOU race condition -- scheduled Sprint 22
- DT-S15-005 (MEDIUM): recordGeneration catch block vazio -- scheduled Sprint 23
- DT-010 (MEDIUM): TrustSignals.tsx uses next/link incorrectly -- scheduled Sprint 23
- Redis singleton globalThis (MEDIUM): connection leak risk -- scheduled Sprint 23
- DEBT-S6-003 (MEDIUM): Analytics events not implemented -- scheduled Sprint 23
- BUG-S7-004 (LOW): Footer links 404 -- scheduled Sprint 22
- BUG-S7-006 (LOW): aria-label hardcoded English -- scheduled Sprint 22
- 8 LOW items: DEBT-S7-002/003, DEBT-S8-005, DEBT-S18-002, DT-S15-001, SEC-S16/S17 findings
- Total: 17 debt items across 21 sprints (~0.8/sprint, healthy rate)

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

### Lessons Learned
- Sprint 19: guide redesign took more scope than estimated, causing 2 P1 items to slip. Use generous buffer (>25%) for sprints with UI redesign work.
- Task ID discipline: commit IDs must match planning doc IDs (Sprint 19 lesson)
- Transport is 36-40h minimum -- never try to squeeze it alongside other features
- Sprint 20: Prisma JSON fields need `as unknown as Prisma.InputJsonValue` cast -- build breaks that tests don't catch
- Sprint 20: Preferences scope grew from 8 to 10 categories during implementation -- flag scope increases early
- Sprint 22-S: Stabilization sprint post-feature sprint is valuable -- 14 bugs fixed. Consider scheduling after every major feature sprint.
- MVP readiness: features ~78% complete but 0% operational readiness (analytics, monitoring, legal pages). Must address before beta.
- Beta blockers are NOT feature gaps -- they are compliance (LGPD pages), cost (GeminiProvider), and quality (manual testing)
