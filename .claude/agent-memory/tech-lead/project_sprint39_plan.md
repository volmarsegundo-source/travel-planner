---
name: Sprint 39 Plan
description: Sprint 39 "Landing Page + Login V2" — execution plan, key decisions, task breakdown for dev-fullstack-1 (landing) and dev-fullstack-2 (login + carryover)
type: project
---

Sprint 39: "Landing Page + Login V2", target v0.34.0, 50h budget.

**Why:** First real application of Sprint 38 design system foundation. Landing page is highest-traffic conversion page; login is second. Both need premium visual treatment with atlas-* tokens.

**How to apply:** All V2 code behind DesignBranch (NEXT_PUBLIC_DESIGN_V2 flag). V1 must remain 100% unchanged. UX-SPEC-LANDING-LOGIN-V2 is visual source of truth.

Key decisions:
- FIX-004 (ESLint cn/cva detection) DEFERRED to tech debt DEBT-S39-001
- Lucide React for icons (not @material-symbols/font-600) — tree-shakeable, no font loading
- Link text color: #005049 (atlas-on-tertiary-fixed-variant) for WCAG AA, NOT #1c9a8e
- Input focus border: teal (#1c9a8e), keyboard ring: amber (#fe932c) — dual-purpose per UX
- DesignBranch placement: page.tsx route files, NOT layout.tsx
- Footer bg: atlas-primary (#040d1b), NOT atlas-primary-container
- Newsletter: ornamental only (mock toast, no backend)
- AtlasButton loading: accepts current spinner-only behavior (DEBT-S39-002 for loadingText prop)

Track 1 (dev-fullstack-1): 10 tasks, 25h — Landing sections T1.1-T1.10
Track 2 (dev-fullstack-2): 8+1 tasks, 18h+4h — Carryover T2.1-T2.3 + Login T2.5-T2.10

Blocking gates: TC.2 (UX mid-sprint review after hero+brand panel), TC.3 (UX final validation before merge)

Plan: docs/specs/sprint-39/SPRINT-39-EXECUTION-PLAN.md
Specs: SPEC-PROD-048, SPEC-PROD-049, SPEC-PROD-050, UX-SPEC-LANDING-LOGIN-V2
