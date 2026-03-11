# Sprint 25 Triage -- v0.17.0 Manual Test Results

**Date**: 2026-03-11
**Author**: product-owner
**Product Version**: 0.17.0 (v0.16.0 tag, 1593 tests)
**Test Results**: 95 cases -- ~55 PASS, ~35 NOK, ~5 not testable
**Sprint Budget**: 40h (2 devs x ~20h)
**Process**: First sprint under Spec-Driven Development (SDD)

---

## 1. Phase Sequence Clarification

The expedition flow consists of 6 phases, each collecting specific data. The **canonical sequence and data ownership** is defined below. This is the authoritative reference -- any implementation that deviates is classified as spec drift (P0).

| Phase | Name | Theme | Data Collected |
|-------|------|-------|----------------|
| Phase 1 | O Chamado | Trip creation | Destination, Origin, Travel dates, Profile data (name, bio) |
| Phase 2 | O Explorador | Travel style | Traveler type, Accommodation preference, Travel pace, Budget level, **Passengers** (adults, children, infants, seniors) |
| Phase 3 | O Preparo | Document checklist | Trip classification (domestic/international), Document checklist (AI-generated based on trip type), Packing suggestions |
| Phase 4 | A Logistica | Logistics | Transport segments (flights, trains, buses), Accommodation bookings, Local mobility selection |
| Phase 5 | A Conexao | Destination guide | AI-generated destination guide (10 visible categories, no collapsing) |
| Phase 6 | O Roteiro | Itinerary | AI-generated daily itinerary, Day-by-day plan with drag-and-drop reordering |

### Key Decisions

**Passengers**: Belong in **Phase 2** (O Explorador). The passengers selector was implemented in Sprint 20-21 as part of Phase 2 but is NOT appearing in the flow (BUG-P0-001). This must be fixed -- passengers are essential data for AI itinerary generation and transport planning.

**Preferences**: Preferences are a **profile-level** concept (accessible from the Profile page), NOT a phase step. Preferences inform AI generation across all phases but are not collected during the expedition flow itself.

**Phase 3 Rename**: "A Rota" (The Route) is renamed to **"O Preparo" (The Preparation)**. Rationale: Phase 3 functions as a document and preparation checklist, not route planning. "A Rota" misleads users into expecting route/navigation content. "O Preparo" accurately communicates that this phase prepares the traveler with documents, visa requirements, and packing lists. This rename aligns the phase name with its actual function and avoids confusion with Phase 6 (the actual route/itinerary).

---

## 2. Bug Severity Classification

### P0 -- Blocking User Journey (MUST fix in Sprint 25)

| ID | Description | Root Cause Hypothesis | Spec | Est. |
|----|-------------|----------------------|------|------|
| BUG-P0-001 | Passengers selector never appears in flow | Phase 2 wizard step missing or skipped in sequencing logic | SPEC-PROD-001 | 4h |
| BUG-P0-002 | Progress bar click navigates to LAST completed phase, not the clicked phase | Navigation handler uses wrong index/phase reference | SPEC-PROD-001 | 3h |
| BUG-P0-003 | Dashboard still shows legacy buttons ("Itens", "Checklist", "Hospedagem") | Buttons not removed from trip card component after Phase 4 redesign | SPEC-PROD-002 | 2h |
| BUG-P0-004 | Confirmation screen missing fields (Nome, Bio, Passageiros, Preferencias) | Confirmation component not updated to include all collected data | SPEC-PROD-002 | 3h |

**P0 Subtotal: ~12h**

### P1 -- High Priority (select for Sprint 25 within budget)

| ID | Description | Spec | Est. | Sprint 25? |
|----|-------------|------|------|------------|
| BUG-P1-001 | Autocomplete UX: transparency, format "Bahia, Brasil" instead of "Salvador, Bahia, Brasil" | -- | 3h | YES |
| BUG-P1-002 | Guide still has 6 collapsed sections instead of 10 visible | -- | 2h | YES |
| BUG-P1-003 | Phase 4 car rental in wrong step (should be Step 3 Mobilidade) | SPEC-PROD-001 | 1h | YES |
| BUG-P1-004 | Phase 4 transport not pre-filled from trip data | -- | 2h | YES |
| BUG-P1-005 | Profile name not saving/displaying | -- | 2h | YES |
| BUG-P1-006 | Language switch causes 404 on Phase 3 | -- | 1.5h | YES |
| BUG-P1-007 | Gamification not removing points when deselecting preferences | -- | 1.5h | YES |
| BUG-P1-008 | Phase 6 no back button, cannot test persistence | SPEC-PROD-001 | 1h | DEFERRED |
| BUG-P1-009 | Phase 6 drag-and-drop time adjustment after reorder | -- | 2h | DEFERRED |

**P1 selected for Sprint 25: ~13h (7 items)**
**P1 deferred to Sprint 26: ~3h (2 items)**

### P2 -- UX Improvements (deferred)

| ID | Description | Est. | Sprint |
|----|-------------|------|--------|
| UX-001 | Phase transitions inconsistent (3 animation styles) | 3h | Sprint 26 |
| UX-002 | Preferences page too crowded -- break into wizard | 4h | Sprint 26 |
| UX-003 | Chip text truncated | 1h | Sprint 26 |
| UX-004 | Phase labels overlap progress count text | 1h | Sprint 26 |
| UX-005 | Phase 3 name mismatch (resolved: rename to "O Preparo") | 0.5h | Sprint 25 (covered by SPEC-PROD-001) |

### Stakeholder Observations (addressed by SPEC-PROD-001)

| ID | Description | Resolution |
|----|-------------|------------|
| OBS-001 | Navigation forward AND backward freely at all times | Defined in SPEC-PROD-001 AC-005 |
| OBS-002 | Incomplete phases highlighted in different color | Defined in SPEC-PROD-001 AC-008 |
| OBS-003 | Every screen must show Phase Name + Step number | Defined in SPEC-PROD-001 AC-009 |
| OBS-004 | Phase 3 name mismatch | Resolved: rename to "O Preparo" |

---

## 3. Sprint 25 Scope (40h budget)

### Included -- P0 (must fix)

| # | Item | Source | Spec | Est. |
|---|------|--------|------|------|
| 1 | Expedition navigation and phase sequencing fix | BUG-P0-001, BUG-P0-002, OBS-001/002/003 | SPEC-PROD-001 | 10h |
| 2 | Dashboard trip cards cleanup + confirmation screen | BUG-P0-003, BUG-P0-004 | SPEC-PROD-002 | 5h |
| 3 | Phase 3 rename "A Rota" to "O Preparo" | OBS-004, UX-005 | SPEC-PROD-001 | 0.5h |

**P0 Subtotal: ~15.5h**

### Included -- P1 (high priority, fits budget)

| # | Item | Source | Est. |
|---|------|--------|------|
| 4 | Autocomplete UX fix (transparency + city name format) | BUG-P1-001 | 3h |
| 5 | Guide 10 visible categories (no collapsing) | BUG-P1-002 | 2h |
| 6 | Phase 4 car rental move to Step 3 | BUG-P1-003 | 1h |
| 7 | Phase 4 transport pre-fill from trip data | BUG-P1-004 | 2h |
| 8 | Profile name save/display fix | BUG-P1-005 | 2h |
| 9 | Language switch 404 on Phase 3 | BUG-P1-006 | 1.5h |
| 10 | Gamification point removal on deselect | BUG-P1-007 | 1.5h |

**P1 Subtotal: ~13h**

### Buffer

| Item | Est. |
|------|------|
| Testing, code review, spec conformance audit | 8h |
| Unforeseen complexity / scope adjustment | 3.5h |

**Buffer Subtotal: ~11.5h (29%)**

### Sprint 25 Total: 40h

| Category | Hours | % |
|----------|-------|---|
| P0 fixes (spec-covered) | 15.5h | 39% |
| P1 fixes (selected) | 13.0h | 32% |
| Buffer | 11.5h | 29% |
| **Total** | **40h** | **100%** |

**Sacrifice order** (if budget pressure): BUG-P1-007 > BUG-P1-004 > BUG-P1-001

### Deferred to Sprint 26

| Item | Source | Est. |
|------|--------|------|
| Phase 6 back button | BUG-P1-008 | 1h |
| Phase 6 drag-and-drop time adjustment | BUG-P1-009 | 2h |
| Phase transitions consistency | UX-001 | 3h |
| Preferences wizard breakdown | UX-002 | 4h |
| Chip text truncation | UX-003 | 1h |
| Phase label overlap | UX-004 | 1h |

### Deferred -- Backlog (no sprint assigned)

| Item | Source | Rationale |
|------|--------|-----------|
| US-122 Chat IA Premium | Roadmap | Deprioritized: manual test bugs take precedence over new features |
| Premium upgrade flow | Roadmap | Blocked by payment gateway decision |
| Email notifications | Roadmap | Provider not chosen |
| NPS survey in-app | Roadmap | Requires analytics (PostHog) first |

---

## 4. Spec Plan

| Spec ID | Title | Covers | Status |
|---------|-------|--------|--------|
| SPEC-PROD-001 | Expedition Navigation and Phase Sequencing | BUG-P0-001, BUG-P0-002, BUG-P1-003, OBS-001/002/003/004, Phase 3 rename | Draft |
| SPEC-PROD-002 | Dashboard Trip Cards and Phase Confirmation | BUG-P0-003, BUG-P0-004 | Draft |

Additional specs may be created for P1 items if their scope warrants it (per SDD rules, items under 2h covered by existing specs do not need new specs).

---

## 5. Impact on Roadmap

Sprint 25 was originally planned for "Beta Launch + Premium Foundations" (US-122 Chat IA, premium upgrade flow, email notifications). The manual test results have revealed fundamental UX issues that must be fixed before any beta can launch.

**Roadmap adjustment:**
- Sprint 25: Bug fixes + navigation overhaul (this document)
- Sprint 26: Remaining P1/P2 bugs + Phase 6 improvements
- Sprint 27: Beta launch readiness (analytics, monitoring, manual test re-run)
- Sprint 28: Beta launch with real users

This pushes beta launch by ~2 sprints. This is the correct decision: launching beta with broken navigation, missing data in confirmation screens, and phantom dashboard buttons would destroy first impressions and produce misleading feedback data.

---

*Triage elaborado pelo product-owner em 2026-03-11 com base nos resultados de 95 testes manuais da versao v0.17.0.*
