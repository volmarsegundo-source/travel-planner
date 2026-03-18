---
name: Sprint 31 Planning State
description: Sprint 31 scope, schedule, assignments, and key decisions -- Meu Atlas Rewrite + Phase Completion + Dashboard Quick-Access + UX Cleanups
type: project
---

Sprint 31 planned on 2026-03-17. Theme: Meu Atlas Rewrite + Phase Completion + Dashboard Quick-Access + UX Cleanups.

**Why:** v0.25.0 shipped Autocomplete Rewrite + Dashboard Overhaul (2024 tests). Map rewrite deferred from Sprint 30 is highest-priority. Phase completion engine needs explicit per-phase rules. Dashboard cards need quick-access links. UX debt items need cleanup.

**How to apply:**
- Budget: 45h (2 devs, 10 days including 2 spec days)
- Baseline: v0.25.0, 2024 tests, build clean
- Test target: 2090+
- dev-fullstack-1: Atlas map (TASK-S31-001 through 007, 16h) + date validation (TASK-S31-015, 3h)
- dev-fullstack-2: Phase completion (TASK-S31-008 through 011, 9h) + Quick-access (TASK-S31-012-013, 6h) + UX cleanups (TASK-S31-014, 2h)
- Days 1-2: Spec finalization + cross-review + approval gate
- Days 3-7: Implementation
- Days 8-10: QA + eval gates + fixes + PR

**Scope IN:**
- Meu Atlas rewrite: Leaflet, OSM/CartoDB tiles, pins, popups, filters, clusters, dark mode, mobile bottom sheet (13h)
- Phase completion engine: per-phase rules, visual sync, auto-completion trigger (9h)
- Dashboard quick-access links: Ver Checklist/Guia/Roteiro, Gerar Relatorio (7h)
- UX cleanups: profile link dropdown, badge non-interactive, date validation, button replacement (5h)
- Tests + eval gates (8h)

**Scope OUT (deferred to Sprint 32):**
- Summary/Report rewrite (PDF + share + print)
- DnD time auto-adjustment (eighth carry)
- AI-generated report summaries

**New specs (all Draft):**
- SPEC-QA-005/006/007/008, SPEC-SEC-002-S31, SPEC-INFRA-002-S31, SPEC-RELEASE-002-S31, SPEC-COST-002-S31, SPEC-AI-002-S31

**Eval datasets (4 new):**
- atlas-map-rendering.json (10 cases), phase-completion-states.json (12 cases), dashboard-quickaccess.json (6 cases), date-validation.json (8 cases)

**Key decisions:**
- Leaflet + OSM tiles (free, MIT/BSD, no API keys needed)
- Dynamic import with ssr: false for Leaflet (prevents window undefined crash)
- Coordinates are NOT PII (SEC-S31-001)
- Date validation must be server-side enforced (SEC-S31-005)
- Zero AI cost impact this sprint
