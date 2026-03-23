---
name: Sprint 37 Plan
description: Sprint 37 orchestration -- Gamification Wave 3 (Stripe payment + admin dashboard enhancement), v0.32.0, 2 tracks, 50h budget
type: project
---

Sprint 37: Gamification Wave 3 -- Monetization + Admin Dashboard Enhancement
- **Version target**: v0.32.0
- **Branch**: feat/sprint-37-gamification-wave3
- **Baseline**: v0.31.0, 2408 tests, 122/130 E2E
- **Budget**: 50h (estimated 47h + 3h buffer)
- **13 specs**: SPEC-PROD-043/044/045, SPEC-UX-045/046, SPEC-ARCH-032/033, SPEC-SEC-007, SPEC-QA-013, SPEC-AI-007, SPEC-INFRA-007, SPEC-RELEASE-007, SPEC-COST-007

**Why:** Sprint 36 delivered mock payment provider and basic admin dashboard. Sprint 37 replaces mock with real Stripe Checkout Sessions and enhances admin with period filters, ARPU, CSV export, and margin alerts.

**How to apply:**
- Track 1 (dev-fullstack-1, 25h): Stripe integration -- provider, 3 API routes, webhook, purchase page update, success/cancel pages
- Track 2 (dev-fullstack-2, 22h): Admin dashboard -- period filter, new aggregation queries, CSV export, margin alerts, enhanced UI
- Tracks are fully independent (can run in parallel from Day 1)
- Key security items: SEC-037-001 (webhook signature), SEC-037-002 (secret key isolation), SEC-037-006 (CSV formula injection)
- Plans: docs/specs/sprint-37/SPRINT-37-PLAN.md, docs/specs/sprint-37/SPRINT-37-TASKS.md
- Existing foundation: PaymentProvider interface, MockPaymentProvider, AdminDashboardService (all from Sprint 36)
