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
- Maps: Mapbox GL JS 3.x, State: TanStack Query v5, Forms: React Hook Form + Zod
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

## Specs & Architecture Docs
- SPEC-001: docs/SPEC-001.md (Trip Creation)
- SPEC-005: docs/specs/SPEC-005-authenticated-navigation.md
- Sprint 20 Architecture: docs/architecture/SPRINT-20-ARCHITECTURE.md
- SPEC-ARCH-001: docs/specs/sprint-26/SPEC-ARCH-001.md (DnD Time Adjustment)

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
