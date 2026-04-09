# Tech Lead Memory -- Travel Planner

## Project State (as of 2026-03-23)
- Sprints 1-24 complete (legacy, pre-SDD)
- Sprint 25 COMPLETE: v0.18.0, 1612 tests
- Sprint 26 COMPLETE: v0.19.0, 1655 tests
- Sprint 27 COMPLETE: v0.20.0, recurring bug blitz
- Sprint 28 COMPLETE: v0.21.0, 1721 tests (partial delivery)
- Sprint 29 COMPLETE: v0.22.0, 1776 tests (summary redesign, coordinates, WizardFooter, countdown)
- Phase Nav Redesign SHIPPED: v0.24.0, 1869 tests (PhaseNavigationEngine, PhaseShell, ADR-017)
- Sprint 30 COMPLETE: v0.25.0, 2024 tests (autocomplete rewrite, dashboard overhaul, bug fixes)
  - See: [project_sprint30_plan.md](project_sprint30_plan.md)
- Sprint 31 COMPLETE: v0.26.0 (Atlas map, completion engine, quick-access, header cleanup)
  - See: [project_sprint31_plan.md](project_sprint31_plan.md)
- Sprint 32 COMPLETE: v0.27.0 + v0.27.1 hotfix (stabilization, phase transitions, completion engine)
  - See: [project_sprint32_plan.md](project_sprint32_plan.md)
  - Plan: docs/specs/sprint-32/SPRINT-32-PLAN.md
- Sprint 33: PLANNED -- data integrity + UX foundation + social login, 15 tasks, v0.28.0
  - See: [project_sprint33_plan.md](project_sprint33_plan.md)
  - Plan: docs/specs/sprint-33/SPRINT-33-PLAN.md
- Sprint 38: PLANNED -- Design System Foundation, 18 tasks, v0.33.0
  - See: [project_sprint38_plan.md](project_sprint38_plan.md)
  - Plan: docs/specs/sprint-38/SPRINT-38-EXECUTION-PLAN.md
- Sprint 37: PLANNED -- Gamification Wave 3 (Stripe + Admin), 27 tasks, v0.32.0
  - See: [project_sprint37_plan.md](project_sprint37_plan.md)
  - Plan: docs/specs/sprint-37/SPRINT-37-PLAN.md
- Sprint 39: PLANNED -- Landing Page + Login V2, 22+1 tasks, v0.34.0
  - See: [project_sprint39_plan.md](project_sprint39_plan.md)
  - Plan: docs/specs/sprint-39/SPRINT-39-EXECUTION-PLAN.md
- Sprint 41: PLANNED -- Polish + Beta Launch, 26 tasks, v0.58.0
  - See: [project_sprint41_plan.md](project_sprint41_plan.md)
  - Plan: docs/specs/sprint-41/SPRINT-41-PLAN.md

## Key Docs Paths
- docs/tasks.md -- backlog (large file, use offset/limit)
- docs/specs/SPRINT-25-TECH-ANALYSIS.md -- Sprint 25 tech analysis + task plan
- docs/specs/SPEC-STATUS.md -- SDD spec status tracker
- docs/specs/templates/GUIDE-TECH-LEAD-SDD.md -- SDD orchestration guide
- docs/architecture.md -- conventions, folder structure, ADRs
- docs/product/TRANSPORT-PHASE-SPEC.md -- full transport phase product spec
- docs/prompts/OPTIMIZATION-BACKLOG.md -- prompt-engineer audit findings

## Sprint 20 Outcomes
- ALL 12 tasks completed (100%)
- +124 tests (1365 -> 1489), +6 suites (94 -> 100)
- SEC-S19-001 RESOLVED (last known security debt)
- Three migrations applied: preferences, passengers, transport
- Phase 4 renamed: "O Abrigo" -> "A Logistica"
- New badge: identity_explorer (preferences gamification, 5+ categories)
- Review fixes: 5 unused imports, 3 Prisma JSON type casts, 1 missing badge map entry, 2 i18n keys

## Critical Security Findings (cumulative)
- FIND-M-001: redirect() must be OUTSIDE try/catch in all Server Actions
- FIND-M-002: Prisma 7 uses db.$extends NOT db.$use for soft-delete middleware
- SR-005: Every Prisma query in TripService must have explicit select clause
- SR-006: coverEmoji needs Unicode regex or enum
- SR-007: confirmationTitle needs .max(100) in TripDeleteSchema
- SEC-S18-001 (MEDIUM): RESOLVED in Sprint 19
- SEC-S19-001 (LOW): RESOLVED in Sprint 20 (T-S20-003)
- SEC-S20-OBS-001 (INFO): No total passenger cap -- schedule for Sprint 21
- SEC-S20-OBS-002 (INFO): Booking code encryption deferred to Sprint 21

## Prisma JSON Type Pattern (Sprint 20 lesson)
- CRITICAL: `Record<string, unknown>` is NOT assignable to Prisma's InputJsonValue in strict build
- CORRECT pattern: `as unknown as Prisma.InputJsonValue` for JSON field writes
- Import: `import { type Prisma } from "@prisma/client"`
- This applies to: preferences (UserProfile), passengers (Trip), any future Json fields

## Streaming Architecture (post-Sprint 19 -- FIXED)
- Stream route accumulates output, parses with Zod, persists via itinerary-persistence.service.ts
- Redis lock (NX+EX, TTL 300s) prevents duplicate generations per tripId
- Phase6Wizard shows progress UI, NOT raw JSON
- Key prop forces remount: key={`phase6-${days.length}`}

## AI Provider Architecture (current)
- Interface: AiProvider in src/server/services/ai-provider.interface.ts
- Claude: plan -> claude-sonnet-4-6, checklist/guide -> claude-haiku-4-5-20251001
- Streaming API: POST /api/ai/plan/stream (SSE format)
- Factory: getProvider() in ai.service.ts

## Guide Architecture (post-Sprint 19)
- 10 sections: timezone, currency, language, electricity, connectivity, cultural_tips, safety, health, transport_overview, local_customs
- Section types: "stat" (factual) vs "content" (descriptive)
- DestinationGuideWizard: card-based layout (2-col stat grid, expandable content list)
- T-S20-001 FIXED: old guides (6 sections) now gracefully degrade

## Dashboard Architecture (Sprint 18+19+20)
- ExpeditionCard: overlay link with pointer-events-none/auto -- CLEANED in S20
- PhaseToolsBar: renders tools from getPhaseTools(currentPhase)
- DUPLICATE BUTTONS: RESOLVED in T-S20-002
- DashboardPhaseProgressBar: 8 segments (gold=complete, pulse=current, gray=future)

## Phase 1 Wizard (Sprint 20)
- Step order: (1) About You, (2) Destination, (3) Dates, (4) Confirmation
- Profile persistence: shows summary card when birthDate+country+city filled
- Props: passportExpiry, userCountry, userProfile (from server component)

## Phase 2 Wizard (Sprint 20)
- Dynamic step array based on travelerType
- Passengers step: conditional for family/group; airline-style +/- steppers
- Preferences step: free-text dietary + accessibility (legacy)
- 636 lines -- extract PassengersStep in Sprint 21

## Preferences System (Sprint 20)
- 10 categories: travelPace, foodPreferences, interests, budgetStyle, socialPreference, accommodationStyle, fitnessLevel, photographyInterest, wakePreference, connectivityNeeds
- Schema: src/lib/validations/preferences.schema.ts
- Service: src/server/services/preferences.service.ts
- Gamification: 10 pts per filled category, identity_explorer badge at 5+
- parsePreferences() graceful fallback for null/invalid data

## Transport Data Model (Sprint 20 -- schema only)
- TransportSegment: type, departure/arrival places+times, provider, bookingCodeEnc, cost, isReturn
- Accommodation: type, name, address, bookingCodeEnc, checkIn/checkOut, cost
- Trip.origin: VarChar(150), Trip.localMobility: String[]
- Both models: onDelete Cascade, added to account deletion transaction
- Zod schemas: src/lib/validations/transport.schema.ts

## Recurring Import Convention Violations
- PATTERN: Devs sometimes use `next/navigation` or `next/link` instead of `@/i18n/navigation`
- CHECK at every code review
- Known exceptions: LoginForm (useSearchParams), layout/catch-all (notFound)

## Team Conventions
- Communication: Portuguese; Code: English
- Commits: Conventional Commits with task IDs (e.g., feat(T-S20-004): description)
- No direct commits to main -- always via PR
- Tests included in same task as implementation
- Coverage target: >= 80% on service and schema files
- ENFORCE: Commit task IDs MUST match planning doc IDs

## Outstanding Debt (cumulative)
- DEBT-S6-003: Analytics events onboarding.completed/skipped not implemented
- DEBT-S6-004: style-src 'unsafe-inline' in prod CSP
- DEBT-S7-001: LoginForm useSearchParams from next/navigation -- exception
- DEBT-S7-002: AppError/TripError near-duplicate -- refactor to shared ErrorBoundaryCard
- DEBT-S7-003: generate-test-plan.js is CommonJS -- convert to TypeScript
- DEBT-S8-005: eslint-disable @typescript-eslint/no-explicit-any in PlanGeneratorWizard
- DEBT-S18-002: account.actions.ts has two hashUserId functions (local + imported hashForLog)
- ExpeditionHubPage coming soon uses hardcoded gray colors instead of theme tokens

## Sprint 25 Root-Cause Findings
- BUG-P0-001: PassengersStep IS in Phase2Wizard, conditional on family/group -- spec ambiguity, not code bug
- BUG-P0-002: DashboardPhaseProgressBar links completed phases to NEXT phase -- by design, spec clarification needed
- BUG-P0-003: No "Itens" string exists in codebase; "Checklist"/"Hospedagem" are i18n keys, not dashboard buttons
- BUG-P0-004: Phase1 and Phase2 each have separate confirmations -- no global confirmation exists
- BUG-P1-003 CONFIRMED: Car rental question in Phase4Wizard step 1, should be in step 3 (mobility)
- BUG-P1-004 CONFIRMED: TransportStep does not receive or pre-fill trip origin/destination
- BUG-P1-007: Points are additive-only by design -- never deducted on deselect
- BUG-P1-008 CONFIRMED: Phase6Wizard has no back button
- BUG-P1-009: DnD time adjustment is a NEW FEATURE, not a bug -- deferred to Sprint 26
- Two progress bars: DashboardPhaseProgressBar (dashboard) vs ExpeditionProgressBar (wizard pages)
- `name` field NOT in PROFILE_FIELD_POINTS -- saved via separate db.user.update in createExpeditionAction

## Sprint 25 Outcome
- SPEC-PROD-001 and SPEC-PROD-002 implemented (partial) in v0.18.0
- 7/18 ACs implemented for SPEC-PROD-001, 5/12 for SPEC-PROD-002
- Remaining ACs addressed in Sprint 26 (ITEM-6 dashboard polish, ITEM-7 completion summary)

## Spec-Driven Development (SDD) -- Effective Sprint 25

### Role: GATEKEEPER
- NO code ships without an approved spec (SPEC-PROD, SPEC-UX, SPEC-ARCH, SPEC-SEC as needed)
- Tech-lead approves/rejects spec change requests during implementation
- Spec drift is a P0 bug -- treat it like a security vulnerability

### SDD Workflow
1. Product-owner submits SPEC-PROD-XXX -> tech-lead triggers UX/ARCH/SEC specs
2. All required specs must reach "Approved" status before task breakdown
3. Task breakdown references spec IDs explicitly (section-level granularity)
4. Devs STOP coding if spec change needed -> notify tech-lead -> spec owner updates -> tech-lead approves -> dev resumes
5. QA validates code conformance against approved spec version
6. Release-manager ensures changelog references spec IDs

### Commit Convention (SDD)
- All commits reference spec IDs: `feat(SPEC-PROD-025): description`
- PR descriptions must include spec conformance checklist
- Any spec deviation in PR requires pre-approval documentation

### Spec Status Tracking
- Tracker: docs/specs/SPEC-STATUS.md
- States: Draft -> In Review -> Approved -> Implemented -> Deprecated
- Version bumps required for any change to approved specs

### Key Files
- docs/specs/templates/GUIDE-TECH-LEAD-SDD.md -- orchestration guide
- docs/specs/SPEC-STATUS.md -- status tracker
- docs/specs/templates/TEMPLATE-*-SPEC.md -- spec templates (PROD, UX, ARCH, SEC)

### Enforcement Rules
- Sprint planning: only features with Approved specs can be scheduled for dev
- Code review: verify code matches spec; reject PRs with undocumented deviations
- Coordinate cross-agent spec reviews (security, architecture, UX) before approval gate
- Sprints 1-24 are legacy (pre-SDD) -- retroactive spec coverage not required

## Recurring Bug Root Causes (Sprint 27 investigation)
- THREE progress bars: PhaseProgressBar (intra-phase steps, Phase 1/2/4), ExpeditionProgressBar (cross-phase nav, Phase 3/5), DashboardPhaseProgressBar (dashboard cards, read-only)
- Autocomplete dropdown clipping: CSS z-index/bg fixes pass unit tests but fail visually due to parent overflow:hidden -- JSDOM does not compute CSS stacking contexts
- Architectural fix needed: React createPortal to document.body for dropdown rendering
- Phase2Wizard line 273: hardcoded router.push("/trips") instead of Phase 1 navigation
- Phase6Wizard: missing ExpeditionProgressBar entirely (no import, no render)
- No phase access guards: URL manipulation can skip ahead to future phases
- LESSON: For CSS/layout bugs, unit tests are NECESSARY but NOT SUFFICIENT -- mandate manual verification protocol (MANUAL-V)
- LESSON: When multiple similar components exist (3 progress bars), fix tickets MUST specify which component by filename, not by description

## Lessons Learned (cumulative)
- Task ID discipline: Commits MUST use planning doc task IDs
- Key prop for React remount after router.refresh() -- reusable pattern
- Redis NX+EX lock with graceful degradation -- good for AI generation dedup
- Guide redesign took more scope than estimated in S19 -- displaced 2 P1 tasks
- Three migrations in one sprint: coordinate order to avoid conflicts
- BUILD != TESTS: Next.js build applies stricter ESLint+TS than Vitest. Integration test tasks MUST include `npm run build`
- Badge map completeness: adding to union types requires updating all exhaustive Records
- Prisma JSON writes: use `as unknown as Prisma.InputJsonValue`, not `as Record<string, unknown>`
- Scope creep: preferences had 10 categories vs 8 planned -- devs should flag increases
- P0 bug triage: 4 of 4 "P0 bugs" in Sprint 25 were spec ambiguities, not code defects -- always root-cause before planning fixes
- SDD enforcement: never plan implementation tasks until specs are Approved -- Sprint 25 blocked on SPEC-PROD-001/002
