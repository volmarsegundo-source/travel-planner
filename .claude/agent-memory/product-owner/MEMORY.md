# Product Owner -- Agent Memory

## Project: Travel Planner

### Spec-Driven Development (SDD) -- Effective Sprint 25
- SDD is the official development process starting Sprint 25 (v0.18.0+)
- Product Owner owns Product Specs (SPEC-PROD-XXX)
- Product specs define WHAT and WHY, never HOW
- Product specs must be technology-agnostic (no library/framework references)
- Every product spec must include: user story, acceptance criteria, constraints (security, a11y, performance budgets)
- PO approves/rejects spec change requests that affect product requirements
- Spec IDs (SPEC-PROD-XXX) must be referenced in all commits and PRs
- Spec change protocol: stop implementation -> update spec -> get approval -> resume
- Spec drift (code != spec) is classified as P0 bug
- Templates: `docs/specs/templates/TEMPLATE-PRODUCT-SPEC.md`
- Process doc: `docs/specs/SDD-PROCESS.md`
- Product specs stored in: `docs/specs/product/`
- User stories in `docs/tasks.md` remain for backlog tracking but link to their spec
- Sprint 25: new features require specs; Sprint 26: retroactive specs for critical features

### Backlog State (as of 2026-03-11, post Sprint 26)
- Product version: 0.19.0 (Sprint 26 complete), 1655 tests
- Sprints 1-26 complete
- `docs/tasks.md` at version 3.0.0 (stale -- needs major update)
- Next available US ID: US-124; Next available Spec ID: SPEC-PROD-010
- Full backlog: US-001 through US-016 + US-100 through US-123
- Q2 2026 Roadmap: `docs/product/ROADMAP-2026-Q2.md` (needs update)
- Staging: travel-planner-eight-navy.vercel.app
- Sprint 26 backlog: `docs/specs/sprint-26/SPRINT-26-BACKLOG.md`
- Sprint 27 backlog: `docs/specs/sprint-27/SPRINT-27-BACKLOG.md`

### Sprint 27 Planning
- Theme: "Recurring Bug Blitz + Structural UX Fixes"
- Budget: 27.5h committed + 12.5h buffer (31%)
- 14 recurring bugs (REC-001 through REC-014) from v0.19.0 manual testing
- P0: Navigation bugs (T-S27-001, 4h), Autocomplete (T-S27-002, 2h), Guide fixes (T-S27-003, 3h)
- P1: Phase 4 labels (1h), Dashboard bar (1h), Preferences (1h), Profile image (0.5h), Phase 1 fields (2h), CTA standardization (SPEC-PROD-009, 6h)
- P2: Gamification header (SPEC-PROD-006, 4h), Map pin (1h)
- Mandatory: Manual test re-run (T-S27-012, 2h)
- Sacrifice order: T-S27-011 (Map Pin) > T-S27-010 (Gamification Header) > T-S27-009 (CTA Buttons)
- New specs: SPEC-PROD-006, SPEC-PROD-007, SPEC-PROD-008, SPEC-PROD-009
- Sprint 27 specs stored in: `docs/specs/sprint-27/`
- Beta readiness (monitoring, LGPD, analytics) deferred to Sprint 28

### Sprint 26 Results
- Theme: "Guide Visibility, UX Polish & Expedition Closure"
- v0.19.0, 1655 tests
- Manual testing revealed ~40 NOK out of 111 tests, 14 recurring bugs
- Sprint 26 specs stored in: `docs/specs/sprint-26/`

### Sprint 25 Results (first SDD sprint)
- Theme: "Navigation Overhaul + Bug Fixes"
- SPEC-PROD-001: 7/18 ACs implemented, 11 deferred (many already working)
- SPEC-PROD-002: 5/12 ACs implemented, 7 deferred
- Key deliverables: Phase 3 rename, bi-directional nav, progress bar click fix, legacy buttons removed, confirmation screens completed
- v0.18.0, 1612 tests, build clean
- Deferred to S26: AC-017 (Complete Expedition), AC-009 (Summary), AC-002 (trip card redesign)

### Phase Names (canonical, post Sprint 25 triage)
- Phase 1: "O Chamado" (Trip creation)
- Phase 2: "O Explorador" (Travel style + Passengers)
- Phase 3: "O Preparo" (Document checklist) -- RENAMED from "A Rota"
- Phase 4: "A Logistica" (Transport, Accommodation, Mobility)
- Phase 5: "A Conexao" (Destination guide)
- Phase 6: "O Roteiro" (Itinerary)

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

### MVP Roadmap (updated post Sprint 26, 2026-03-11)
- Sprints 22-26: DONE
- Sprint 27: Recurring bug blitz + CTA standardization + gamification header (v0.20.0)
- Sprint 28: Beta polish + nav restructure + summary enhancement + monitoring + LGPD
- Sprint 29: Beta launch (50-100 users) + feedback loop
- Sprint 30-31: US-122 Premium chat + payment gateway + v1.0 GA
- Full roadmap: `docs/product/ROADMAP-2026-Q2.md` (needs update)
- Note: Beta launch slipped 1 sprint due to recurring bug debt from S26 manual testing

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
- v0.17.0 manual testing: 37% failure rate (35/95 NOK). Automated tests (1593) did not catch navigation sequencing, missing UI steps, or legacy button persistence. Lesson: automated test coverage != user journey coverage. Manual testing must happen BEFORE beta planning, not after.
- Phase naming matters: "A Rota" confused testers who expected route planning, not document checklists. Renamed to "O Preparo". Always validate phase/feature names with actual users.
- Sprint 26/v0.19.0: 14 recurring bugs (reported 3-4 sprints in a row). Recurring bugs MUST be prioritized over new features -- they signal systemic fix failures and erode tester trust.
- CTA consistency is a systemic issue, not a per-phase bug. Requires a cross-cutting spec (SPEC-PROD-009) that touches all wizards simultaneously.
- Phase 5 subtitle confusion: "A Conexao" is fine as a name, but subtitle/description must clearly say "Destination Guide" not "Map of Days". Label accuracy matters as much as phase naming.
