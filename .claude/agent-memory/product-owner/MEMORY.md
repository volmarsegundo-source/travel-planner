# Product Owner — Agent Memory

## Project: Travel Planner

### Backlog State (as of 2026-03-05)
- `docs/tasks.md` at version 3.0.0 (needs update for Sprint 8-9 tasks)
- Sprints 1-8 complete: auth, DB, landing, dev toolkit, nav, onboarding, profile, wizard+AI provider
- Sprint 8 delivered: Trip Hub, wizard improvements (editable fields, 9 styles, travelNotes, budget 100k), AI Provider Abstraction Layer
- Sprint 9 planned: `docs/sprint-9-planning.md` — User Tier (Free/Premium) + Gemini Flash integration
- Product version: 0.8.0 (469 tests, 0 failures)
- US-110 (Trip Hub) Done, US-111 (Health check) Done (Sprint 8)
- US-112 (User Tier) P0, US-113 (Gemini Provider) P0, US-114 (Tier badge UI) P1 — Sprint 9
- Tasks T-082 to T-096 defined for Sprint 9
- Next available US ID: US-115; Next available Task ID: T-097
- Full backlog: US-001 through US-016 + US-100 through US-114

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

### MVP Roadmap (updated post Sprint 8)
- Sprint 9: User Tier + Gemini Flash (US-112, US-113, US-114) + security debts
- Sprint 10: Upgrade Flow + Budget/Expenses (US-009, US-011, US-012, US-013)
- Sprint 11: LGPD full compliance (US-016) + security audit + production deploy
- Budget features moved from original Sprint 9 to Sprint 10 (freemium takes priority)

### Pending Debts Entering Sprint 9
- FIND-S8-M-001: Zod validation for travelStyle/budgetTotal/budgetCurrency server-side
- FIND-S8-M-002: travelNotes prompt injection (no system/user separation)
- FIND-S8-M-003: Anthropic singleton with apiKey empty string
- FIND-S8-L-002: GOOGLE_AI_API_KEY no prefix validation
- DEBT-S8-001: ADR-008 not documented
- OPT-S8-005: Token usage not logged
- OPT-S8-001: travelNotes not normalized before hash

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
