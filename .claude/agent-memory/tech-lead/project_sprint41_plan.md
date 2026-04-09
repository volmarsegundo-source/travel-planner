---
name: Sprint 41 Plan - Polish + Beta Launch
description: Sprint 41 breakdown — 26 tasks, 7 scope areas (SEO, perf, sec, finops, E2E, deploy, beta), target v0.58.0
type: project
---

Sprint 41: Polish + Beta Launch, planned 2026-04-07, target v0.58.0

**Why:** Final stabilization sprint before public beta. All gaps identified: no sitemap/robots/OG/JSON-LD, Lighthouse not measured, deploy.yml has placeholder echoes, Sentry/analytics/feedback not integrated, 30 E2E failing.

**How to apply:** Enforce 3-phase execution (parallel audit -> sequential deploy -> parallel beta infra). Block deploy until all P0 audit tasks pass. Block beta checklist until Sentry + analytics confirmed operational.

Key findings from codebase inspection:
- /api/test-unsplash route must be removed before production
- style-src 'unsafe-inline' still present (DEBT-S6-004)
- deploy.yml has echo placeholders, not real CLI
- E2E: 16 spec files, 100/130 passing
- Zero Sentry/analytics/feedback integration exists

Plan: docs/specs/sprint-41/SPRINT-41-PLAN.md
26 tasks, ~80h estimated, 7 agents involved
