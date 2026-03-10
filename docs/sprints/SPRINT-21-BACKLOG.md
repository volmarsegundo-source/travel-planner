# Sprint 21 — Backlog

**Sprint goal:** Transport Phase UI (Phase 4 "A Logística") + Progress Bar UX improvements
**Version target:** v0.15.0
**Budget:** 40h (2 devs × 20h), 33h committed + 7h buffer
**Date:** 2026-03-10

---

## Committed Items (33h)

### P1 — Transport Phase UI

| ID | Story | Est. | Dev | Status |
|----|-------|------|-----|--------|
| T-S21-001 | Origin field UI + pre-population from profile | 2h | dev-1 | TODO |
| T-S21-002 | Transport wizard Section A (N-record list, type selector, dates, costs) | 6-8h | dev-1 | TODO |
| T-S21-003 | Accommodation Section B (N-record list, max 5, type selector) | 4-6h | dev-2 | TODO |
| T-S21-004 | Local Mobility Section C (multi-select icon grid) | 2-3h | dev-2 | TODO |
| T-S21-005 | Booking code encryption service (AES-256-GCM) | 1.5h | dev-1 | TODO |
| T-S21-006 | Passenger cap Zod refinement (total ≤ 20) | 0.5h | dev-2 | TODO |

### P2 — UX Polish

| ID | Story | Est. | Dev | Status |
|----|-------|------|-----|--------|
| T-S21-007 | Clickable progress bar segments (navigate to phases) | 2h | dev-2 | TODO |
| T-S21-008 | Progress bar phase labels (hover/visible) | 1h | dev-2 | TODO |

### P2 — Code Quality

| ID | Story | Est. | Dev | Status |
|----|-------|------|-----|--------|
| T-S21-009 | Phase2Wizard PassengersStep extraction (tech debt) | 1.5h | dev-1 | TODO |

---

## Deferred to Sprint 22

| ID | Story | Est. | Reason |
|----|-------|------|--------|
| SEED-S21-009 | AI itinerary uses transport data | 4-6h | Needs prompt-engineer + finops consultation |

---

## Acceptance Criteria

1. Phase 4 wizard has 3 tabbed sections: Transport, Accommodation, Mobility
2. Transport segments support CRUD with encrypted booking codes
3. Accommodation entries support CRUD with encrypted booking codes (max 5)
4. Local mobility uses multi-select icon grid
5. Origin field pre-populates from UserProfile
6. Passenger total capped at 20 via Zod refinement
7. Progress bar segments are clickable (navigate to phase page)
8. Progress bar shows phase labels on hover
9. PassengersStep extracted from Phase2Wizard
10. All tests pass (`npm run test`)
11. Build succeeds (`npm run build`)
12. Test count target: 1550+

---

## Key Decisions

1. **Accommodation pulled into Sprint 21** — Phase 4 only delivers value with all 3 sections
2. **AI integration deferred** — transport data needs to exist first
3. **Phase4Wizard becomes tabbed** — 3 section tabs, each in own component file
4. **No new Prisma migrations needed** — all models from Sprint 20
