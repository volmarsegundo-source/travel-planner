---
name: Sprint 43 Multidestinos + Premium
description: Architectural spec for multi-city expeditions and Premium subscription entitlements
type: project
---

# Sprint 43 — Multidestinos & Premium Entitlements

**Spec**: docs/specs/sprint-43/SPEC-ARCH-MULTIDESTINOS.md (SPEC-ARCH-043-001 v1.0.0 Draft, 935 lines)
**Date**: 2026-04-10

**Why**: Trip model has single destination hardcoded; feature requires 1-4 cities (1 Free, 4 Premium) with independent guides and integrated multi-city plan. Simultaneously introduces Premium subscription with monthly 1500 PA refresh (no rollover), Mercado Pago gateway.

**How to apply**: When touching Trip, DestinationGuide, UserProgress.availablePoints, or Phase 5/6 code in Sprint 43+, must reference this spec. Entitlement checks at server action layer (NOT middleware).

## Key Schema Decisions
- NEW `Destination` model: tripId, order, city, country, lat, lng, startDate, endDate, nights
- NEW `Subscription` model: 1:1 with User, plan/status/gateway enums, currentPeriodStart/End
- NEW `SubscriptionEvent` model: audit log, onDelete Restrict, gatewayEventId @unique for idempotency
- NEW `PaEntitlement` model: buckets with source (PREMIUM_MONTHLY, PACKAGE_PURCHASE, ONBOARDING, ADMIN_GRANT, REFERRAL), amount, consumed, expiresAt
- Trip.destination* kept as legacy read-only denormalization (deprecate Sprint 45)
- DestinationGuide loses @unique tripId, gains destinationId FK
- ItineraryDay gains nullable destinationId (null = transit day)
- Phased zero-downtime migration (M1-M7) with dual-write period

## ADRs Proposed
- ADR-032: Multidestinos relational (not JSON)
- ADR-033: Entitlements enforced at server action layer, not middleware (Edge runtime constraint)
- ADR-034: PA buckets with expiry, FIFO consumption order (expirables first, then onboarding, then packages)

## PA Consumption Order (critical)
1. PREMIUM_MONTHLY/ANNUAL (expires first, ASC by expiresAt)
2. ONBOARDING (FIFO)
3. ADMIN_GRANT (FIFO)
4. PACKAGE_PURCHASE last (user paid real money, highest perceived value)

Implemented via SELECT FOR UPDATE + pg_advisory_xact_lock per userId.

## Cost Impact (Phases)
- Phase 5 Guide: 50 + 30*(N-1) PA — N parallel calls
- Phase 6 Plan: 80 + 15*(N-1) PA — single call with all cities
- N=4 total: 265 PA per expedition

## Webhook
- POST /api/webhooks/mercado-pago
- HMAC-SHA256 in constant time, 5-min replay window
- Idempotency via SubscriptionEvent.gatewayEventId @unique
- Retries handled by MP (6x exponential backoff)

## Effort
~52h total arch/backend (adjusted up from 42h briefing due to consumePa refactor + integration tests)

## Open Questions Flagged
- OQ-1: 3 active trips limit for Free is new (currently 20) — PO confirm
- OQ-2: PREMIUM_ANNUAL = 12 monthly refreshes vs single 18000 bucket
- OQ-3: Trial period policy
- OQ-4: Refund reverses consumed PA?
- OQ-5: Remove Trip.destination legacy in Sprint 45
- OQ-7: Grep for @unique tripId dependencies before M1
- OQ-8: Cancel mid-period keeps PA until periodEnd
