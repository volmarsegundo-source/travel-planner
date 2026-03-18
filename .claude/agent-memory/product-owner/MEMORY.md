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

### Backlog State (as of 2026-03-17, Sprint 31 planning)
- Product version: v0.24.0 (Sprint 30 assumed complete) / v0.25.0 in planning
- Sprints 1-30 complete (assumed)
- `docs/tasks.md` at version 3.0.0 (stale -- needs major update)
- Next available US ID: US-124; Next available Spec ID: SPEC-PROD-025
- Sprint 30 backlog: `docs/specs/sprint-30/SPRINT-30-PRIORITIES.md`
- Sprint 31 backlog: `docs/specs/sprint-31/SPRINT-31-PRIORITIES.md`
- Sprint 31 product specs: SPEC-PROD-021, SPEC-PROD-022, SPEC-PROD-023, SPEC-PROD-024
- Staging: travel-planner-eight-navy.vercel.app

### Sprint 29 Planning
- Theme: "Beta Readiness -- Summary Polish, Data Persistence & CTA Closure"
- Budget: 38h committed + 7h buffer (16%)
- 7 deferred items from Sprint 28 (profile name, map pins, auto-save, phase revisit, summary cards, next steps, CTA integration)
- P0: Summary card redesign (5h), Next Steps integration (2h), CTA integration (3h), Summary tests (3h)
- P1: Phase revisit (4h), Map pins full (5h), Auto-save (3h), Profile name (2h), Beta validation (3h)
- P2: Shareable summary link (SPEC-PROD-014, 3h), Trip duplication (SPEC-PROD-015, 2h)
- Mandatory: Manual test re-run (3h)
- Sacrifice order: T-S29-011 > T-S29-010 > T-S29-007 > T-S29-006 partial
- New specs: SPEC-PROD-013 (Beta Validation), SPEC-PROD-014 (Shareable Link), SPEC-PROD-015 (Trip Duplication)

### Sprint 28 Results
- Theme: "Structural Improvements -- Navigation, Summary & Gamification"
- v0.21.0, 1721 tests
- Delivered: Navigation restructure (Expeditions + Meu Atlas), gamification header, LGPD pages, monitoring
- 7 items deferred to Sprint 29 (summary integration, CTA integration, profile fix, map pins, auto-save, phase revisit)

### Sprint 27 Results
- Theme: "Recurring Bug Blitz + Structural UX Fixes"
- v0.20.0, 14 recurring bugs resolved, CTA standardization partial
- WizardFooter component created but not integrated across phases

### Phase Names (canonical, confirmed from phase-config.ts v0.23.0)
- Phase 1: "O Chamado" (Trip creation)
- Phase 2: "O Explorador" (Travel style + Passengers)
- Phase 3: "O Preparo" (Document checklist) -- RENAMED from "A Rota"
- Phase 4: "A Logistica" (Transport, Accommodation, Mobility)
- Phase 5: "Guia do Destino" (Destination guide) -- CONFIRMED from code; prior memory "A Conexao" was stale
- Phase 6: "O Roteiro" (Itinerary)
- Phases 7-8 ("A Expedicao", "O Legado"): defined in config, NOT active in MVP, not counted for completion

### Sprint 19-21 Summary
- Sprint 19: Guide redesign, streaming fix (v0.13.0, 1365 tests)
- Sprint 20: Preferences 10 cats, passengers airline-style, Phase 1 reorder (v0.14.0, 1489 tests)
- Sprint 21: Transport UI, accommodation, mobility, origin, encryption (v0.15.0, 1575 tests)
- Sprint 22-S: Stabilization, 14 bug fixes (v0.15.1)

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

### MVP Roadmap (updated 2026-03-17, Sprint 31 planning)
- Sprints 22-30: DONE (v0.24.0 assumed)
- Sprint 31: "Beta Hardening" -- SPEC-PROD-023 (phase completion logic) + SPEC-PROD-024 (UX cleanups) + SPEC-PROD-022 (dashboard) + SPEC-PROD-021 (Atlas map, P3/scope risk) + Beta launch (50-100 users) (v0.25.0)
- Sprint 32-33: US-122 Premium chat + payment gateway + v1.0 GA
- Note: Beta launch slipped 3+ sprints from original plan (recurring bugs + nav crisis + structural work)

### Pending Debts (as of Sprint 29)
- Accumulated LOW debt: DEBT-S7-002/003, DEBT-S8-005 (deferred to Sprint 30+)
- BUG-S7-001: Raw userId in logger.info (LOW)
- Most HIGH/MEDIUM debts resolved in Sprints 22-28

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

### Sprint 31 Planning (2026-03-17)
- Theme: "Beta Hardening -- States, Dashboard & Atlas"
- Budget: ~45h
- P0: SPEC-PROD-023 (Phase Completion Logic, 8-10h) -- foundation for dashboard and auto-completion
- P1: SPEC-PROD-024 (UX Cleanups: REQ-002/003/005/006, 6-8h) -- REQ-002/003/005 independent of SPEC-PROD-023
- P2: SPEC-PROD-022 (Dashboard Improvements, 10-13h) -- depends on SPEC-PROD-023
- P3: SPEC-PROD-021 (Meu Atlas Map, 16-20h full / 8-10h reduced scope) -- highest risk, last to start
- Sacrifice order: SPEC-PROD-021 full -> SPEC-PROD-022 RF-003 -> SPEC-PROD-022 RF-004 partial -> SPEC-PROD-024 REQ-002
- Non-negotiable: SPEC-PROD-023 complete + SPEC-PROD-024 REQ-005 (date validation) + SPEC-PROD-024 REQ-006 (auto-completion)
- Specs files in: `docs/specs/sprint-31/`
- Beta GO criteria: SPEC-PROD-023 100% ACs, date validation 0 invalid trips, nav regression <= 5%, GeminiProvider active

### Sprint 30 Planning (2026-03-17)
- Theme: "Navigation Stabilization + 4 Product Rewrites"
- Budget: 40-50h
- P0: SPEC-PROD-016 full conformance (navigation engine, ~23h) -- beta launch blocked until resolved
- P1: 5 staging bugs -- BUG-S30-001 (Phase 3->4 timeout), BUG-S30-002 (guide card height), BUG-S30-003 (profile menu), BUG-S30-004 (gamification points realtime), BUG-S30-005 (date fields mandatory)
- P2: SPEC-PROD-019 (Expedicoes Dashboard) + SPEC-PROD-017 scoped (Autocomplete, mobile UX only)
- Deferred to Sprint 31: SPEC-PROD-018 (Meu Atlas map), SPEC-PROD-020 full (PDF + share link)
- Specs files in: `docs/specs/sprint-30/`
- GO/NO-GO criteria: nav failure rate <= 5%, SPEC-PROD-016 >= 16/18 ACs, Phase 3->4 timeout resolved, dates mandatory enforced

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
- Phase 5 name resolution (Sprint 31): code (phase-config.ts) is authoritative over PO memory. The name "A Conexao" in memory was stale. Canonical name confirmed as "Guia do Destino". When memory and code conflict, always read the code.
