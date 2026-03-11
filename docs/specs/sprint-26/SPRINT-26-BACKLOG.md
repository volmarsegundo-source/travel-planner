# Sprint 26 Backlog Prioritization

**Sprint**: 26
**Version Target**: 0.19.0
**Budget**: 40h (2 developers)
**Theme**: "Guide Visibility, UX Polish & Expedition Closure"
**Process**: Spec-Driven Development (SDD)
**Author**: product-owner
**Date**: 2026-03-11

---

## 1. Scoring Summary

Scoring formula (consistent since Sprint 5):

| Criterion | Weight |
|-----------|--------|
| Traveler pain severity | 30% |
| Business revenue impact | 25% |
| Implementation effort (inverse: 5=XS, 1=XL) | 20% |
| Strategic alignment | 15% |
| Competitive differentiation | 10% |

### Scored Backlog

| # | Item | Pain | Revenue | Effort Inv. | Strategic | Competitive | Score | Est. | Priority |
|---|------|------|---------|-------------|-----------|-------------|-------|------|----------|
| 1 | ITEM-2: Guide Full Visibility | 4 | 4 | 3 | 5 | 4 | 4.00 | 8h | P1 |
| 2 | ITEM-1: Autocomplete UX Fix | 5 | 3 | 4 | 4 | 2 | 3.90 | 4h | P1 |
| 3 | ITEM-8: Sprint 25 Remaining ACs | 4 | 3 | 4 | 5 | 2 | 3.75 | 4h | P1 |
| 4 | ITEM-7: Expedition Completion & Summary | 3 | 4 | 3 | 5 | 4 | 3.70 | 8h | P1 |
| 5 | ITEM-3: Phase Transitions | 3 | 2 | 4 | 4 | 3 | 3.05 | 4h | P2 |
| 6 | ITEM-4: Preferences Wizard | 3 | 2 | 3 | 4 | 3 | 2.95 | 6h | P2 |
| 7 | ITEM-6: Dashboard Improvements | 3 | 3 | 3 | 4 | 3 | 3.15 | 6h | P2 |
| 8 | ITEM-5: DnD Time Adjustment | 3 | 3 | 2 | 4 | 5 | 3.20 | 10h | P2 |

### Scoring Rationale

**ITEM-2 (Guide Full Visibility, 4.00)**: High strategic alignment -- the destination guide is the AI showcase feature. 6 of 10 sections hidden defeats the product's differentiation. Pain is high because users miss valuable content. Revenue impact is significant because guide quality directly affects perceived product value for premium conversion.

**ITEM-1 (Autocomplete Fix, 3.90)**: Highest pain severity -- a transparent dropdown and missing city names affect every trip creation. High effort inverse (4h fix, straightforward). Low competitive diff but critical for baseline quality.

**ITEM-8 (Remaining ACs, 3.75)**: Many are already working and just need E2E validation. High strategic alignment because closing out Sprint 25 spec conformance is essential for SDD process integrity. Low effort for high compliance value.

**ITEM-7 (Expedition Completion, 3.70)**: Strong strategic and competitive scores -- the gamified expedition needs a proper endpoint. This fulfills two deferred ACs from Sprint 25 specs. Revenue impact is high because the completion flow is the natural upsell moment for premium features.

**ITEM-5 (DnD Time Adjustment, 3.20)**: Highest competitive differentiation (5) -- few travel planners auto-adjust times on reorder. However, the 10h estimate and lower pain severity (users can mentally adjust) push it down. The effort inverse is only 2 (10h is significant).

**ITEM-6 (Dashboard Improvements, 3.15)**: Moderate across all dimensions. The trip card redesign was deferred from SPEC-PROD-002 AC-002. Important for polish but not blocking beta.

**ITEM-3 (Phase Transitions, 3.05)**: UX polish that improves perceived quality but does not solve a functional problem. Three different animation styles is jarring but not a blocker.

**ITEM-4 (Preferences Wizard, 2.95)**: The preferences page works functionally. Breaking it into wizard pages is a UX improvement that reduces cognitive load but the pain is moderate -- users complete preferences today despite crowding.

---

## 2. Sprint 26 Commitment (40h Budget)

### Committed (Sprint 26) -- 30h + 10h buffer (25%)

| Task ID | Item | Spec | Est. | Rationale |
|---------|------|------|------|-----------|
| T-S26-001 | Guide Full Visibility | SPEC-PROD-003 | 8h | P1. AI showcase feature, 10 sections visible, remove manual refresh, auto-update |
| T-S26-002 | Autocomplete UX Fix | No spec needed (XS/UX) | 4h | P1. Transparent dropdown + missing city name. Covered by existing UI standards |
| T-S26-003 | Sprint 25 Remaining ACs | SPEC-PROD-001/002 | 4h | P1. E2E validation of already-working ACs. Closes Sprint 25 spec conformance |
| T-S26-004 | Expedition Completion & Summary | SPEC-PROD-005 | 8h | P1. Fulfills SPEC-PROD-001 AC-017 + SPEC-PROD-002 AC-009. Expedition endpoint |
| T-S26-005 | Phase Transitions | No spec needed (UX) | 4h | P2. Unified animation style across all phases |
| T-S26-006 | Preferences Wizard | No spec needed (UX) | 6h | P2. Break into 1-2 pages, fix chip truncation |
| **Total committed** | | | **34h** | **Buffer: 6h (15%)** |

### Sacrifice Order (if budget pressure)

If the sprint runs over budget, items are sacrificed in this order (first sacrificed first):

1. **T-S26-006** (Preferences Wizard, 6h) -- UX improvement, not functional. Can defer without user impact.
2. **T-S26-005** (Phase Transitions, 4h) -- Polish item. Different animation styles are jarring but not broken.
3. **T-S26-004** (Expedition Completion, 8h) -- High value but can ship without it for one more sprint.

Items T-S26-001, T-S26-002, and T-S26-003 are non-negotiable for Sprint 26.

### Buffer Analysis

- Total committed: 34h
- Buffer: 6h (15%)
- Lesson from Sprint 19: UI redesign sprints need >= 25% buffer
- Risk: ITEM-2 (guide) involves AI auto-update logic which may be more complex than estimated
- Mitigation: If T-S26-001 runs over, sacrifice T-S26-006 first (recovers 6h)
- Note: Buffer is lower than ideal (15% vs 25% recommended). This is acceptable because most items are well-defined with existing component foundations.

---

## 3. Deferred to Sprint 27

| Item | Spec | Est. | Reason for Deferral |
|------|------|------|-------------------|
| ITEM-5: DnD Time Adjustment | SPEC-PROD-004 | 10h | Highest effort item (10h). Valuable but not beta-blocking. Sprint 27 has more room after Sprint 26 establishes completion flow |
| ITEM-6: Dashboard Improvements | No spec (UX) | 6h | Trip card redesign with mini progress bar. Depends on SPEC-PROD-005 being implemented first (completed state on cards) |

### Sprint 27 Preview

Sprint 27 theme: "Beta Launch Readiness" (per roadmap)
- ITEM-5: DnD Time Adjustment (10h)
- ITEM-6: Dashboard Improvements (6h)
- Manual test full re-run (~8h)
- Monitoring + analytics setup (~8h)
- LGPD legal pages (~4h)
- Beta environment hardening (~4h)
- Total: ~40h

---

## 4. Spec Requirements Matrix

| Item | SPEC-PROD | SPEC-UX | SPEC-ARCH | Notes |
|------|-----------|---------|-----------|-------|
| ITEM-1 (Autocomplete) | Not needed (XS) | Not needed | Not needed | UX fix within existing component |
| ITEM-2 (Guide) | **SPEC-PROD-003** (created) | Needed | Needed (auto-update logic) | New spec created this session |
| ITEM-3 (Transitions) | Not needed (UX-only) | Needed | Not needed | Animation standardization |
| ITEM-4 (Preferences) | Not needed (UX-only) | Needed | Not needed | Layout restructuring |
| ITEM-5 (DnD Times) | **SPEC-PROD-004** (created) | Needed | Needed (recalc algorithm) | New spec created this session. Sprint 27 |
| ITEM-6 (Dashboard) | Not needed (covered by SPEC-PROD-002) | Needed | Not needed | Deferred AC from existing spec |
| ITEM-7 (Completion) | **SPEC-PROD-005** (created) | Needed | Needed (aggregation endpoint) | New spec created this session |
| ITEM-8 (Remaining ACs) | Covered by SPEC-PROD-001/002 | Not needed | Not needed | E2E validation only |

---

## 5. Spec Cross-References

### New Specs Created

| Spec ID | Title | File | Fulfills |
|---------|-------|------|----------|
| SPEC-PROD-003 | Destination Guide Full Visibility | `docs/specs/sprint-26/SPEC-PROD-003.md` | ITEM-2 |
| SPEC-PROD-004 | Itinerary Time Auto-Adjustment on Reorder | `docs/specs/sprint-26/SPEC-PROD-004.md` | ITEM-5 (Sprint 27) |
| SPEC-PROD-005 | Expedition Completion & Summary | `docs/specs/sprint-26/SPEC-PROD-005.md` | ITEM-7 + SPEC-PROD-001 AC-017 + SPEC-PROD-002 AC-009 |

### Sprint 25 Deferred ACs Addressed

| Deferred AC | Addressed By |
|-------------|-------------|
| SPEC-PROD-001 AC-017 (Phase 6 "Complete Expedition") | SPEC-PROD-005 AC-001/AC-002 |
| SPEC-PROD-002 AC-009 (Expedition completion summary) | SPEC-PROD-005 AC-005/AC-007 |
| SPEC-PROD-002 AC-002 (Trip card phase progress mini-bar) | Deferred to Sprint 27 (ITEM-6) |

---

## 6. Risk Register

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Guide auto-update logic more complex than estimated | T-S26-001 overruns by 4-6h | Medium | Sacrifice T-S26-006 first. Auto-update can be simplified to "always regenerate on Phase 5 entry" as fallback |
| Expedition summary requires new data aggregation endpoint | T-S26-004 overruns by 2-4h | Medium | Architect should start SPEC-ARCH early. Summary can initially use existing per-phase queries (N+1 acceptable for v1) |
| Sprint 25 remaining ACs uncover new bugs during E2E validation | T-S26-003 grows beyond 4h | Low | Cap E2E validation at 4h. Log new bugs for Sprint 27, do not fix in-sprint |
| Buffer too thin (15%) for a sprint with UI redesign work | Overall sprint overrun | Medium | Strict sacrifice order. Do not allow scope creep on any item |

---

## 7. Definition of Done (Sprint 26)

- [ ] All committed items implemented and passing automated tests
- [ ] SPEC-PROD-003 (Guide) acceptance criteria validated by QA
- [ ] SPEC-PROD-005 (Completion) acceptance criteria validated by QA
- [ ] Sprint 25 remaining ACs confirmed via E2E testing
- [ ] No spec drift: code matches approved specs
- [ ] All commits reference spec IDs per SDD process
- [ ] Version bumped to 0.19.0
- [ ] Sprint 26 review completed by all mandatory reviewers
- [ ] SPEC-STATUS.md updated with new specs and their implementation status
