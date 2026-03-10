# Sprint Findings (Detailed) — Architect

## Sprint 15 Findings
- New model: ItineraryPlan (1:1 with Trip, onDelete: Cascade, tripId @unique)
- New service: ItineraryPlanService (getOrCreateItineraryPlan, recordGeneration, getExpeditionContext)
- Phase6Wizard: client component (188 lines), 3 states (empty/generating/generated)
- /trips route deactivated (redirects to /dashboard); navbar link removed
- Expedition context enrichment: Phase 2 metadata + Phase 5 guide injected into AI prompt
- generateTravelPlanAction extended (not duplicated) for expedition flow
- TRIP_SELECT now includes expeditionMode + currentPhase (DT-S9-002 resolved)
- getUserTripsWithExpeditionData includes itineraryPlan relation for dashboard badge
- Migration: 20260309010315_itinerary_plan_phase6

### Sprint 15 Debt
- LOW: DT-S15-001 — getOrCreateItineraryPlan race condition (no upsert/P2002 catch)
- LOW: DT-S15-002 — window.location.reload() workaround in Phase6Wizard
- BAIXO: DT-S15-003 — Itinerary generation points use type "purchase" (same as DT-S9-005)
- BAIXO: DT-S15-004 — Redundant trip ownership check (page + service)
- MEDIO: DT-S15-005 — recordGeneration empty catch block swallows all errors silently

## Sprint 9 Findings
- Engines pattern (static class methods) pragmatic for MVP — essentially namespaces
- phase-config.ts correctly isomorphic (no server-only) for client import of definitions
- points-engine and phase-engine are effectively server services but in src/lib/engines/
- spendPoints has TOCTOU race condition — needs $transaction wrapping before production
- Trip type/TRIP_SELECT not updated with gamification fields — integration gap
- String columns vs Prisma enums inconsistency should be documented in ADR-008
- Welcome bonus type "purchase" is semantically wrong — should be "welcome_bonus"
- 119 new tests, all unit (mock-heavy); integration tests with real DB would add confidence
- expeditionMode defaults true on ALL trips including pre-existing — acceptable for MVP only

## Sprint 6 Findings
- CSP nonce via crypto.randomUUID() in Edge middleware — production removes unsafe-eval from script-src
- style-src still has unsafe-inline (Tailwind limitation, accepted trade-off)
- Middleware accumulates 4 responsibilities (auth, i18n, route protection, CSP) — monitor complexity
- OnboardingWizard is monolithic (397 lines) — extract steps if it grows
- Fixed window rate limiter has 2x burst at window boundary — acceptable for MVP
- TrustSignals uses wrong Link import (next/link vs @/i18n/navigation) — MUST fix Sprint 7
- buildCsp() not exported from middleware — tests replicate logic instead of testing directly
