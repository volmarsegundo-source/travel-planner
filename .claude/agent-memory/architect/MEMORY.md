# Architect Memory — Travel Planner

## Project State
- Sprint 20 architecture designed 2026-03-10: ITEM-A/C/D/E — docs/architecture/SPRINT-20-ARCHITECTURE.md
- Sprint 15 review done 2026-03-09; APPROVED WITH NOTES
- Sprint 9 review done 2026-03-06; APPROVED WITH OBSERVATIONS
- Sprint 6 review done 2026-03-04; APPROVED WITH OBSERVATIONS
- ADR-001-007 (accepted); ADR-008 PENDING (engines convention)
- ADR-009-012 PROPOSED (Sprint 20): passengers, transport models, preferences JSON, Phase 4 rename
- Detailed sprint findings: see sprint-findings.md

## Confirmed Tech Stack (ADR-001)
- Next.js 15 App Router, TypeScript 5.x strict, Tailwind CSS 4 + shadcn/ui
- Prisma 7 + PostgreSQL 16, Redis via ioredis, Auth.js v5 (JWT strategy)
- AI: Anthropic SDK (sonnet for itinerary, haiku for checklist)
- i18n: next-intl, locales: pt-BR (default), en
- Maps: Leaflet 1.9 + react-leaflet 4.2 + OSM tiles (ADR-019), State: TanStack Query v5, Forms: React Hook Form + Zod
- Testing: Vitest + Playwright, CI/CD: GitHub Actions, Hosting: Vercel + Railway/Render

## Key Architectural Decisions
- CUID2 for all PKs; soft deletes (deletedAt) on user-owned entities
- String columns for extensible value sets (not Prisma enums) — rank/badge/status/transportType
- onDelete: Cascade for derived data (ChecklistItem, ItineraryDay, TransportSegment, Accommodation)
- JSON fields validated by Zod: DestinationGuide.content, ExpeditionPhase.metadata, UserProfile.preferences
- MAX_ACTIVE_TRIPS = 20; MAX_TRANSPORT_SEGMENTS = 10; MAX_ACCOMMODATIONS = 5
- Profile loaded server-side in page.tsx, passed as serialized props to client wizards
- Mass assignment: never spread user input into Prisma — map fields explicitly

## Sprint 20 Architecture (ADR-009 through ADR-012)
- ITEM-C: Phase 1 reorder — Personal Info first, skip if profile complete, save at confirmation
- ITEM-D: Passenger counts as flat fields on Trip (adultsCount, childrenCount, infantsCount, childrenAges Int[])
- ITEM-E: TransportSegment + Accommodation as separate Prisma models (not JSON in metadata)
- ITEM-E: Trip.origin (String?, VarChar 150), Trip.localMobility (String[])
- ITEM-A: UserProfile.preferences as JSON with Zod PreferencesSchema (8 categories)
- Phase 4 rename: "O Abrigo" -> "A Logistica"; badge "host" -> "logistics_master"
- 3 migrations: trip_origin_and_passengers, transport_and_accommodation, user_preferences
- bookingCodeEnc fields encrypted via AES-256-GCM (same as passportNumberEnc)

## Critical Conventions
- `src/server/` requires "server-only" import; Prisma singleton in src/server/db/client.ts
- Redis singleton in src/server/cache/redis.ts; CacheKeys in src/server/cache/keys.ts
- Env vars validated via @t3-oss/env-nextjs in src/lib/env.ts
- Error classes: AppError, NotFoundError, UnauthorizedError, ForbiddenError
- Auth checked BEFORE data access; BOLA mitigation: userId in every Prisma WHERE
- i18n: use src/i18n/navigation.ts exports (Link, redirect, useRouter) — NOT next/link
- redirect() must NOT be inside try/catch (throws internally)
- Rate limiting: checkRateLimit() with atomic Lua script

## Known Debt (Still Open)
- ALTO: updateTrip uses implicit spread — mass assignment risk (DT-004)
- ALTO: DT-S9-001 — spendPoints no $transaction (TOCTOU race)
- MEDIO: Several import/env issues — see sprint-findings.md for full list
- BAIXO: Various semantic type mismatches (purchase vs welcome_bonus, etc.)

## Rate Limits
- generateTravelPlanAction: 10 req/hr/user
- generateChecklistAction: 5 req/hr/user
- registerAction: 5 req/15min; loginAction: 10 req/15min

## Sprint 26 Architecture (ADR-013 PROPOSED)
- SPEC-ARCH-001: DnD Time Auto-Adjustment (docs/specs/sprint-26/SPEC-ARCH-001.md)
- ADR-013: Client-side time recalculation with server persistence (PROPOSED)
- AC review: docs/specs/sprint-26/ARCH-REVIEW-REMAINING-ACS.md
- Key finding: SPEC-PROD-001 AC-004 mentions "seniors" but no seniorsCount in schema — needs PO decision
- Key finding: AC-015 (downstream data cascade) only partially works — guide covered by SPEC-PROD-003
- Expedition summary page (AC-009 PROD-002) not yet built — ~6h effort

## Sprint 27 Architecture (ADR-014 through ADR-016 PROPOSED)
- Root-cause analysis: docs/specs/sprint-27/ARCH-ROOT-CAUSE-ANALYSIS.md
- SPEC-ARCH-002: Navigation Restructure (docs/specs/sprint-27/SPEC-ARCH-002.md)
  - ADR-014: Page split /expeditions + /atlas (PROPOSED)
  - ADR-015: Server revalidation for map pins, no SSE/WebSocket (PROPOSED)
  - New fields: Trip.destinationLat, Trip.destinationLon
  - Mapbox GL JS for interactive atlas; react-simple-maps kept for lightweight use
- SPEC-ARCH-003: Autocomplete Alternative (docs/specs/sprint-27/SPEC-ARCH-003.md)
  - ADR-016: Replace custom autocomplete with cmdk + Radix Popover portal (PROPOSED)
  - Root cause: dropdown trapped inside stacking context, CSS fixes are insufficient
  - cmdk scored 41/40 weighted vs portal-only 36, Google 27, Mapbox 24
- Key architectural findings (RCA):
  - 3 progress bar components cause confusion (PhaseProgressBar, ExpeditionProgressBar, DashboardPhaseProgressBar)
  - No shared ExpeditionPhaseShell — recommend wrapper component
  - Phase 2 back button hardcodes /trips (invalid route)
  - Phase 6 missing ExpeditionProgressBar entirely
  - Completed phase revisit shows empty form (no state hydration from metadata)

## Sprint 28 Architecture (ADR-019 through ADR-020 PROPOSED)
- SPEC-ARCH-004: Summary Page Data Architecture (referenced in Sprint 28 plan)
- SPEC-ARCH-005: Journey Summary Data Aggregation (docs/specs/sprint-28/SPEC-ARCH-005.md)
  - ADR-019: Parallel Promise.all queries for summary assembly (PROPOSED)
  - ADR-020: No cache for MVP, Redis-ready interface (PROPOSED)
  - JourneySummaryService: 6 parallel queries, JourneySummaryDTO
- SPEC-ARCH-006: Phase Auto-Save Architecture (referenced in Sprint 28 plan)
- Sprint 28 services: TripReadinessService, NextStepsEngine, TripCountdown, WizardFooter
- Sprint 28 baseline: v0.21.0, 1721 tests

## Sprint 29 Architecture (ADR-021 through ADR-026 PROPOSED)
- SPEC-ARCH-007: Summary Page Integration (docs/specs/sprint-29/SPEC-ARCH-007.md)
  - ADR-021: Parallel calls in page.tsx, no facade service (PROPOSED)
  - Integrates TripReadinessService + NextStepsEngine + TripCountdown into summary page
  - New components: ReadinessIndicator (SVG ring), NextStepsList (action cards)
  - Date extraction from readiness.phases[0].dataSnapshot to avoid extra DB call
- SPEC-ARCH-008: Phase Data Pre-population (docs/specs/sprint-29/SPEC-ARCH-008.md)
  - ADR-022: Server props for saved data (not client fetch) (PROPOSED)
  - ADR-023: Edit mode inferred from presence of savedData prop (PROPOSED)
  - ADR-024: Phase 4 auto-save via parent dirty-check on sub-step change (PROPOSED)
  - Phases 1,2,4 need pre-population; Phases 3,5,6 already handle existing data
  - Phase 1 needs new updatePhase1Action for edit mode
  - bookingCodeEnc MUST NOT cross server-client boundary
- SPEC-ARCH-009: Map Coordinates & Destination Pin (docs/specs/sprint-29/SPEC-ARCH-009.md)
  - ADR-025: Two nullable Float columns (destinationLat, destinationLon) on Trip (PROPOSED)
  - ADR-026: CSS pin on cards, interactive Mapbox GL JS on /atlas page (PROPOSED)
  - Migration: add_destination_coordinates
  - Coordinates captured from DestinationAutocomplete.onSelect (lat/lon already available)
  - No backfill for existing trips (MVP decision)
  - Mapbox GL JS loaded via dynamic import on /atlas only
  - GeoJSON coordinate order: [lon, lat] (NOT [lat, lon])

## Phase Navigation Redesign (SPEC-ARCH-010, ADR-017 PROPOSED)
- Full analysis: docs/architecture/PHASE-NAVIGATION-REDESIGN.md
- ADR-017: Centralized isomorphic PhaseNavigationEngine (PROPOSED)
- New files: src/lib/engines/phase-navigation.ts (isomorphic), src/lib/guards/phase-access-guard.ts (server)
- 8 bugs catalogued (NAV-001 through NAV-008), 11 inconsistencies documented
- NAV-001 CRITICAL: Phase 1 has no access guard — URL manipulation creates duplicate trips
- NAV-002 HIGH: Phase 5 revisit throws PHASE_ALREADY_COMPLETED
- Key design: `resolveAccess()` returns PhaseAccessMode (first_visit | revisit | blocked)
- `accessMode` replaces all `isRevisiting` inference patterns
- PHASE_ROUTE_MAP consolidates 3 independent route dictionaries
- Migration: 5 phases (A-E), ~16h effort, ~15 files changed
- Open: OQ-1 (updatePhase1Action), OQ-4 (Phase5Wizard dead code disposition)

## Sprint 30 Architecture (ADR-018 through ADR-020 PROPOSED)
- SPEC-ARCH-011: Autocomplete Rewrite — ADR-018 Mapbox Geocoding v6 + Nominatim fallback
- SPEC-ARCH-012: Map Rewrite — ADR-019 Leaflet+OSM, removes react-simple-maps
- SPEC-ARCH-013: Dashboard Rewrite — TanStack Query, filter/sort, virtual scroll
- SPEC-ARCH-014: Summary/Report — ADR-020 @react-pdf/renderer + HMAC share URLs

## Sprint 31 Architecture (ADR-019-IMPL, ADR-021, ADR-022 PROPOSED)
- SPEC-ARCH-015: Meu Atlas with Leaflet/OSM (docs/specs/sprint-31/SPEC-ARCH-015.md)
  - ADR-019-IMPL: Confirms Sprint 30 ADR-019 for implementation
  - react-leaflet v4.2.1 (stable, not RC v5); no /api/trips/geo (server component only)
  - 3 pin colors: yellow=planning, blue=in_progress, green=completed
  - Hero map rewritten as CSS pins on static SVG; CITY_COORDS eliminated
  - New deps: leaflet, react-leaflet, react-leaflet-markercluster, @types/leaflet
  - Removes: react-simple-maps
- SPEC-ARCH-016: Phase Completion Engine (docs/specs/sprint-31/SPEC-ARCH-016.md)
  - ADR-021: Isomorphic engine + server service (mirrors phase-navigation pattern)
  - Engine: src/lib/engines/phase-completion.engine.ts (pure functions, no DB)
  - Service: src/server/services/phase-completion.service.ts (DB queries + auto-complete)
  - Per-phase rules: P1(5 fields), P2(travelerType), P3(all required checked), P4(transport OR accommodation), P5(guide exists), P6(itinerary exists)
  - Auto-completion: checkAndCompleteTrip() sets trip.status=COMPLETED when all 6 done
  - Fire-and-forget integration in phase action files
- SPEC-ARCH-017: Report Generation Service (docs/specs/sprint-31/SPEC-ARCH-017.md)
  - ADR-022: Composition on ExpeditionSummaryService + enrichment queries
  - Report available when phases 3+5+6 have content
  - Full guide sections, full checklist items, full itinerary+activities
  - No PDF (deferred from SPEC-ARCH-014); structured TripReportDTO only
  - BOLA on all methods; booking codes masked; no PII

## Sprint 32 Architecture (ADR-018 PROPOSED)
- SPEC-ARCH-018: Phase Completion Engine Fixes (docs/specs/sprint-32/SPEC-ARCH-018-completion-engine-fixes.md)
  - ADR-018: Phase Completion Sync Pattern — new syncPhaseStatus() method on PhaseCompletionService
  - Root causes: missing revisit guard (Phase2Wizard), inflated completedPhases (Math.max heuristic), no sync after toggle/generation
  - New actions: updatePhase2Action, syncPhase6CompletionAction
  - Modified: togglePhase3ItemAction (adds sync), TripService (completedPhases number[] not count)
  - No schema migration needed
- SPEC-ARCH-019: Report i18n Layer (docs/specs/sprint-32/SPEC-ARCH-019-report-i18n-layer.md)
  - Translate enums in TripReport.tsx via report.enums.* i18n keys (component-side, not service-side)
  - Enrich ReportPhase1 (duration, ageRange, passengers), ReportPhase2 (preferences)
  - Checklist item translation via expedition.phase3.checklist namespace
  - Required pending items highlighted with text+icon (WCAG), not just color
  - No schema migration needed

## Sprint 33 Architecture (ADR-027 PROPOSED)
- SPEC-ARCH-020: WizardFooter Save/Discard (docs/specs/sprint-33/SPEC-ARCH-020-wizard-footer-save-discard.md)
  - Form hash dirty detection (djb2/FNV-1a), dialog state machine, 3-button layout
  - Backward compat: onSave omitted -> 2-button layout unchanged
  - Phases 1,2,4 get onSave; Phases 3,5,6 stay 2-button
- SPEC-ARCH-021: Phase 6 Prompt Enrichment (docs/specs/sprint-33/SPEC-ARCH-021-phase6-prompt-enrichment.md)
  - 7 parallel queries, EnrichedExpeditionContext extends ExpeditionContext
  - 800-token budget, priority truncation (structural > logistics > preferences > context)
  - Security: no bookingCode, birthDate, passport, userId in prompt
- SPEC-ARCH-022: Social Login (docs/specs/sprint-33/SPEC-ARCH-022-social-login.md)
  - ADR-027: allowDangerousEmailAccountLinking for Google+Apple (verified emails only)
  - Google already configured; Apple new. No client SDK — server-side OAuth only
  - getAvailableProviders() for conditional UI rendering
- SPEC-ARCH-023: Summary/Report v2 (docs/specs/sprint-33/SPEC-ARCH-023-summary-report-v2.md)
  - ExpeditionFullReport DTO: all fields untruncated, completeness %, pending items
  - 9 parallel queries, access from Phase 2+, booking code reveal action
  - i18n at component layer (not service), print via browser @media print

## Specs & Architecture Docs
- SPEC-001: docs/SPEC-001.md (Trip Creation)
- SPEC-005: docs/specs/SPEC-005-authenticated-navigation.md
- Sprint 20 Architecture: docs/architecture/SPRINT-20-ARCHITECTURE.md
- SPEC-ARCH-010: docs/architecture/PHASE-NAVIGATION-REDESIGN.md (Phase Navigation Redesign)
- SPEC-ARCH-001: docs/specs/sprint-26/SPEC-ARCH-001.md (DnD Time Adjustment)
- SPEC-ARCH-002: docs/specs/sprint-27/SPEC-ARCH-002.md (Navigation Restructure)
- SPEC-ARCH-003: docs/specs/sprint-27/SPEC-ARCH-003.md (Autocomplete Alternative)
- ARCH-RCA-S27: docs/specs/sprint-27/ARCH-ROOT-CAUSE-ANALYSIS.md
- SPEC-ARCH-005: docs/specs/sprint-28/SPEC-ARCH-005.md (Journey Summary Data Aggregation)
- SPEC-ARCH-007: docs/specs/sprint-29/SPEC-ARCH-007.md (Summary Page Integration)
- SPEC-ARCH-008: docs/specs/sprint-29/SPEC-ARCH-008.md (Phase Data Pre-population)
- SPEC-ARCH-009: docs/specs/sprint-29/SPEC-ARCH-009.md (Map Coordinates & Destination Pin)
- SPEC-ARCH-011: docs/specs/sprint-30/SPEC-ARCH-011.md (Autocomplete Architecture Rewrite)
- SPEC-ARCH-012: docs/specs/sprint-30/SPEC-ARCH-012.md (Map Architecture Rewrite)
- SPEC-ARCH-013: docs/specs/sprint-30/SPEC-ARCH-013.md (Dashboard Architecture Rewrite)
- SPEC-ARCH-014: docs/specs/sprint-30/SPEC-ARCH-014.md (Summary/Report Architecture Rewrite)
- SPEC-ARCH-015: docs/specs/sprint-31/SPEC-ARCH-015.md (Meu Atlas with Leaflet/OSM)
- SPEC-ARCH-016: docs/specs/sprint-31/SPEC-ARCH-016.md (Phase Completion Engine)
- SPEC-ARCH-017: docs/specs/sprint-31/SPEC-ARCH-017.md (Report Generation Service)
- SPEC-ARCH-018: docs/specs/sprint-32/SPEC-ARCH-018-completion-engine-fixes.md (Phase Completion Engine Fixes)
- SPEC-ARCH-019: docs/specs/sprint-32/SPEC-ARCH-019-report-i18n-layer.md (Report i18n Layer)
- SPEC-ARCH-020: docs/specs/sprint-33/SPEC-ARCH-020-wizard-footer-save-discard.md (WizardFooter Save/Discard)
- SPEC-ARCH-021: docs/specs/sprint-33/SPEC-ARCH-021-phase6-prompt-enrichment.md (Phase 6 Prompt Enrichment)
- SPEC-ARCH-022: docs/specs/sprint-33/SPEC-ARCH-022-social-login.md (Social Login)
- SPEC-ARCH-023: docs/specs/sprint-33/SPEC-ARCH-023-summary-report-v2.md (Summary/Report v2)

## Key File Locations
- Architecture: docs/architecture.md | API: docs/api.md | Tasks: docs/tasks.md
- Phase config: src/lib/engines/phase-config.ts (isomorphic)
- Points/Phase engines: src/lib/engines/ (server-only)
- Gamification types: src/types/gamification.types.ts
- Profile service: src/server/services/profile.service.ts
- Profile actions: src/server/actions/profile.actions.ts
- Expedition actions: src/server/actions/expedition.actions.ts
- Phase1Wizard: src/components/features/expedition/Phase1Wizard.tsx
- Trip classifier: src/lib/travel/trip-classifier.ts
- Crypto: src/lib/crypto.ts (AES-256-GCM)
- Middleware: src/middleware.ts (auth + i18n + CSP nonce)
- Itinerary editor: src/components/features/itinerary/ItineraryEditor.tsx
- Itinerary actions: src/server/actions/itinerary.actions.ts
- Trip service (reorder): src/server/services/trip.service.ts (reorderActivities at line 249)
- Phase6Wizard: src/components/features/expedition/Phase6Wizard.tsx

## SDD Process (Sprint 25+)
- Official process: Spec-Driven Development
- Architect owns SPEC-ARCH-XXX specs
- Architecture specs define HOW — system design, API contracts, data flow
- Must embed ADRs (Architecture Decision Records) inline
- Must document vendor dependencies with abstraction layers and exit strategies:
  - Anthropic Claude -> AiProvider interface (src/server/services/ai-provider.interface.ts)
  - Vercel -> deployment adapter pattern
  - PostgreSQL -> Prisma ORM (portable)
  - Redis -> ioredis interface (portable)
  - Nominatim -> geocoding provider interface
- Constraints section MANDATORY: architectural boundaries, performance budgets
- Spec created AFTER product + UX specs, BEFORE implementation
- Any architectural deviation requires spec update + tech-lead approval
- Template: docs/specs/templates/TEMPLATE-ARCH-SPEC.md

## Gamification Architecture
- 8 phases per trip; phases in src/lib/engines/phase-config.ts
- 4 models: UserProgress, ExpeditionPhase, PointTransaction, UserBadge
- Points denormalized in UserProgress; PointTransaction as audit trail
- Phase 4 completion: at least 1 section has data (transport OR accommodation OR mobility)
- WELCOME_BONUS = 500; phase rewards sum to 2100; PROFILE_FIELD_POINTS = 25 each
