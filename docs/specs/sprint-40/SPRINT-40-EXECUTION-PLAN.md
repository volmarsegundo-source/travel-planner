# Sprint 40 — Execution Plan (Retroactive)

**Version**: 1.0.0
**Date**: 2026-03-24
**Author**: tech-lead
**Sprint**: 40
**Target version**: v0.35.0
**Budget**: 50h

---

## Track Assignment

### Track 1 — dev-fullstack-1: Layout + Phases 1-3 V2 (25h)

| Task | Hours | Description |
|---|---|---|
| T1.1 | 3h | AuthenticatedNavbarV2 (PA badge, atlas tokens, sticky) |
| T1.2 | 3h | NavbarBranch (server component bridge for DesignBranch) |
| T1.3 | 3h | PhaseShellV2 (sidebar AtlasPhaseProgress, breadcrumb) |
| T1.4 | 2h | DesignBranch integration in app layout + PhaseShell |
| T1.5 | 5h | Phase1WizardV2 (4-step form, AtlasInput) |
| T1.6 | 5h | Phase2WizardV2 (AtlasChip preferences, AtlasStepperInput) |
| T1.7 | 4h | Phase3WizardV2 (checklist toggles, AtlasBadge PA) |

### Track 2 — dev-fullstack-2: Dashboard + Phases 4-6 + Summary (25h)

| Task | Hours | Description |
|---|---|---|
| T2.1 | 5h | DashboardV2 (expedition cards, empty state, filter chips) |
| T2.2 | 5h | Phase4WizardV2 (3-step transport/accommodation/mobility) |
| T2.3 | 4h | DestinationGuideV2 (bento grid, section accents) |
| T2.4 | 4h | Phase6ItineraryV2 (day-by-day timeline, streaming) |
| T2.5 | 3h | ExpeditionSummaryV2 (phase cards, readiness, next steps) |
| T2.6 | 3h | Unit tests + i18n |
| T2.7 | 1h | DesignBranch integration in all page routes |

## Key Technical Decisions

1. **DesignBranch at wizard level**: V2 components created alongside V1, switched by flag
2. **NavbarBranch**: Server component bridge since layout.tsx can't use hooks
3. **PhaseShell dual-render**: Extracted V1 to private function, public export wraps both
4. **Reuse existing sub-components**: Phase4V2 reuses TransportStep/AccommodationStep/MobilityStep
5. **Phase 6 streaming preserved**: V2 wraps the same streaming/PA logic

## Dependency Graph

```
T1.1-T1.2 (Nav) ─── parallel ─── T1.3 (PhaseShell)
                                       │
T1.4 (DesignBranch) ──────────────────┘
                                       │
T1.5-T1.7 (Phases 1-3) ──────────────┘

T2.1 (Dashboard) ─── parallel ─── T2.2-T2.4 (Phases 4-6)
                                       │
T2.5 (Summary) ──────────────────────┘
```
