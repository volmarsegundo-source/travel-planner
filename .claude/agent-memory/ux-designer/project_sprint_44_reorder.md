---
name: Sprint 44 — Phase Reorder UX
description: UX spec for reordering expedition phases 3-6 (Atlas gamification flow)
type: project
---

Sprint 44 reorders planning phases: Inspiracao(1) -> Perfil(2) -> Guia(3, was 5) -> Roteiro(4, was 6) -> Logistica(5, was 4) -> Preparo(6, was 3). Phases 7-8 unchanged.

**Why:** PO identified flow is unnatural — checklist before knowing destination; roteiro before logistics makes it hard to size accommodations.

**How to apply:** SPEC-UX-REORDER-PHASES.md at docs/specs/. Impacts DashboardPhaseProgressBar, UnifiedProgressBar, PhaseShell, ExpeditionSummary (PHASE_ICONS array line 17), ExpeditionCard quick-access links, WizardFooter CTAs, i18n. New icon mapping: Sparkles/UserCircle/BookOpen/Map/Plane/CheckSquare. UX recommends DB renumbering (not visual-only remap). Existing expeditions get one-time dismissible banner on /expeditions. Key open questions: DB renumber vs visual-only (architect), Roteiro blocking/non-blocking (PO), points rebalance (PO). Guia<->Roteiro cross-referencing in prompts is an opportunity for prompt-engineer.
