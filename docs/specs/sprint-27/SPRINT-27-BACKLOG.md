# Sprint 27 Backlog Prioritization

**Sprint**: 27
**Version Target**: 0.20.0
**Budget**: 40h (2 developers)
**Theme**: "Recurring Bug Blitz + Structural UX Fixes"
**Process**: Spec-Driven Development (SDD)
**Author**: product-owner
**Date**: 2026-03-11

---

## 0. Sprint Context

### Why "Bug Blitz" and not "Beta Readiness"

The original Sprint 27 theme was "Beta Launch Readiness" (per Q2 roadmap). However, v0.19.0 manual testing revealed **14 recurring bugs** -- issues reported across 3-4 consecutive sprints that were never fully resolved. Shipping to beta with known recurring bugs would damage first impressions and create a support burden that a 2-person team cannot absorb.

**Decision**: Sprint 27 prioritizes recurring bug elimination. New features are included ONLY if they fit within budget after all critical bugs are addressed. Beta readiness (monitoring, LGPD, analytics) shifts to Sprint 28.

### Root-Cause Analysis Summary (from tech-lead)

| Bug | Root Cause | Fix Complexity |
|-----|-----------|----------------|
| REC-001 (autocomplete dropdown clipped) | CSS stacking/overflow on parent containers | S (2h) |
| REC-002 (dashboard progress bar click) | Dashboard bar is intentionally non-interactive; user expectation mismatch with expedition bar | S (1h) -- clarify UI, not a code bug |
| REC-003 (Phase 2 back goes to /trips) | CONFIRMED: hardcoded `/trips` instead of Phase 1 route | XS (0.5h) |
| REC-004 (Phase 5/6 back button missing) | Phase 5 HAS back button; DestinationGuideWizard view may hide it | S (1h) -- verify and fix visibility |
| REC-005 (Phase 6 no progress bar) | CONFIRMED: Phase6Wizard does not render ExpeditionProgressBar | XS (0.5h) |
| REC-006 (completed phase blocks re-entry) | Phase guard logic may prevent re-advancing after completion | S (1.5h) |
| REC-007 (preferences not persisting) | Covered by existing SPEC-UX-004 | S (1h) |
| REC-008 (Phase 4 labels wrong) | Translation keys or hardcoded labels | XS (0.5h) |
| REC-009 (summary too sparse) | Summary exists but lacks visual polish | M (4h) -- covered by SPEC-PROD-007 |
| REC-010 (profile image not saving) | XS bug fix, likely missing field in save action | XS (0.5h) |
| REC-011 (map pin non-interactive) | Decorative element with broken affordance | S (1h) -- covered by SPEC-PROD-008 |
| REC-012 (guide sections still collapsed) | Sprint 26 SPEC-PROD-003 may not have fully resolved | S (1h) |
| REC-013 (guide "Atualizar" still visible) | Translation key issue or conditional rendering | XS (0.5h) |
| REC-014 (guide loading state unclear) | Missing or inadequate loading indicator | S (1h) |

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
| 1 | ITEM-1: Navigation Bug Cluster (REC-003/004/005/006) | 5 | 4 | 4 | 5 | 2 | 4.25 | 4h | P0 |
| 2 | ITEM-2: Autocomplete Fix (REC-001) | 5 | 3 | 4 | 4 | 2 | 3.90 | 2h | P0 |
| 3 | ITEM-3: Guide Remaining Fixes (REC-012/013/014) | 4 | 4 | 4 | 5 | 3 | 4.00 | 3h | P0 |
| 4 | ITEM-4: Phase 4 Label Fixes (REC-008) | 3 | 2 | 5 | 4 | 1 | 3.00 | 1h | P1 |
| 5 | ITEM-5: Dashboard Progress Bar Clarification (REC-002) | 3 | 2 | 5 | 3 | 1 | 2.85 | 1h | P1 |
| 6 | ITEM-6: Preferences Persistence Fix (REC-007) | 4 | 3 | 4 | 4 | 2 | 3.55 | 1h | P1 |
| 7 | ITEM-7: Profile Image Fix (REC-010) | 2 | 1 | 5 | 3 | 1 | 2.25 | 0.5h | P1 |
| 8 | ITEM-8: Phase 1 Mandatory Fields | 3 | 3 | 4 | 4 | 2 | 3.20 | 2h | P1 |
| 9 | ITEM-9: CTA Button Standardization (NEW-004) | 4 | 3 | 3 | 5 | 3 | 3.65 | 6h | P1 |
| 10 | ITEM-10: Gamification Header Display (NEW-001) | 3 | 3 | 3 | 5 | 4 | 3.45 | 4h | P2 |
| 11 | ITEM-11: Map Pin Resolution (REC-011, part of NEW-003) | 2 | 1 | 4 | 3 | 2 | 2.25 | 1h | P2 |
| 12 | ITEM-12: Journey Summary Enhancement (NEW-002/REC-009) | 3 | 3 | 2 | 4 | 4 | 3.10 | 6h | P2 |
| 13 | ITEM-13: Nav Restructure -- Expeditions vs Meu Atlas (NEW-003) | 3 | 3 | 2 | 5 | 4 | 3.25 | 8h | P3 |

### Scoring Rationale

**ITEM-1 (Navigation Bug Cluster, 4.25)**: Highest score. Four confirmed navigation bugs that make the expedition flow unreliable. REC-003 is a one-line fix, REC-005 is adding a missing component render, REC-004 needs visibility verification, REC-006 is a guard logic issue. All four are individually small but collectively critical. Pain is maximum (5) because navigation is the primary interaction pattern. Effort inverse is high (4h total for 4 fixes).

**ITEM-3 (Guide Remaining Fixes, 4.00)**: Sprint 26 SPEC-PROD-003 was supposed to resolve guide visibility. If REC-012/013/014 persist post-Sprint 26, they represent spec drift (code != spec), which is classified as P0 under SDD. High strategic alignment because the guide is the AI showcase feature.

**ITEM-2 (Autocomplete Fix, 3.90)**: Third consecutive sprint reporting this issue. Root cause identified (CSS stacking/overflow). Quick fix with high pain relief. Every trip creation is affected.

**ITEM-9 (CTA Standardization, 3.65)**: Not a single bug but a systemic UX pattern issue. Scores high on strategic alignment (5) because consistent CTAs affect every phase of every expedition. 6h is significant but the fix is spread across the entire flow, touching all wizards. SPEC-PROD-009 provides the complete specification.

**ITEM-13 (Nav Restructure, 3.25)**: High strategic and competitive scores but lowest effort inverse (8h for a structural change). This is the right thing to do but too large for a bug-focused sprint. Deferred to Sprint 28.

---

## 2. Sprint 27 Commitment (40h Budget)

### Committed (Sprint 27) -- 27.5h + 12.5h buffer (31%)

| Task ID | Item | Spec | Est. | Rationale |
|---------|------|------|------|-----------|
| T-S27-001 | Navigation Bug Cluster | SPEC-PROD-001 (existing) | 4h | P0. Fixes REC-003 (back hardcode), REC-004 (guide back visibility), REC-005 (Phase 6 progress bar), REC-006 (phase guard re-entry). All confirmed bugs |
| T-S27-002 | Autocomplete Fix | Existing (no new spec) | 2h | P0. REC-001. CSS stacking/overflow fix. Third sprint reported |
| T-S27-003 | Guide Remaining Fixes | SPEC-PROD-003 (existing) | 3h | P0. REC-012 (sections still collapsed), REC-013 (Atualizar button/translation), REC-014 (loading state). Validates SPEC-PROD-003 conformance |
| T-S27-004 | Phase 4 Label Fixes | No spec (XS) | 1h | P1. REC-008. Translation key correction |
| T-S27-005 | Dashboard Progress Bar Clarification | No spec (XS) | 1h | P1. REC-002. Add tooltip or visual cue distinguishing dashboard bar (view-only) from expedition bar (interactive) |
| T-S27-006 | Preferences Persistence Fix | Existing SPEC-UX-004 | 1h | P1. REC-007. Verify preferences save/load cycle |
| T-S27-007 | Profile Image Fix | No spec (XS) | 0.5h | P1. REC-010. Missing field in save action |
| T-S27-008 | Phase 1 Mandatory Fields | No spec (S) | 2h | P1. Ensure destination, dates, origin are validated and required before advancing |
| T-S27-009 | CTA Button Standardization | **SPEC-PROD-009** (new) | 6h | P1. Systemic UX fix across all 6 phases. Labels, placement, hierarchy, disabled states |
| T-S27-010 | Gamification Header Display | **SPEC-PROD-006** (new) | 4h | P2. Compact points/level in header. Immediate gamification feedback loop |
| T-S27-011 | Map Pin Resolution | SPEC-PROD-008 (partial) | 1h | P2. REC-011. Make interactive or remove. Isolated from full nav restructure |
| T-S27-012 | Manual Test Re-Run | N/A | 2h | Mandatory. Validate all REC-XXX fixes. Run targeted tests for the 14 recurring items |
| **Total committed** | | | **27.5h** | **Buffer: 12.5h (31%)** |

### Buffer Analysis

- Total committed: 27.5h
- Buffer: 12.5h (31%)
- Lesson from Sprint 19: UI sprints need >= 25% buffer -- this sprint has significant UI work (CTA standardization), so 31% is appropriate
- Lesson from Sprint 26: autocomplete and guide fixes were underestimated in previous sprints -- extra buffer covers potential re-investigation
- Risk: CTA standardization (T-S27-009, 6h) touches all 6 wizards. If integration issues arise, this item could overrun
- Mitigation: If T-S27-009 overruns, defer its lower-priority phases (Phase 4 sub-sections, disabled state feedback) to Sprint 28

### Sacrifice Order (if budget pressure)

If the sprint runs over budget, items are sacrificed in this order (first sacrificed first):

1. **T-S27-011** (Map Pin Resolution, 1h) -- Cosmetic fix. Non-functional pin is confusing but not blocking.
2. **T-S27-010** (Gamification Header, 4h) -- New feature, not a bug fix. Valuable but not critical for bug blitz theme.
3. **T-S27-009** (CTA Standardization, 6h) -- Can be partially delivered (label fixes only) and completed in Sprint 28.

Items T-S27-001 through T-S27-008 and T-S27-012 are **non-negotiable** for Sprint 27. These represent the recurring bug fixes that MUST be resolved before beta.

---

## 3. Deferred to Sprint 28

| Item | Spec | Est. | Reason for Deferral |
|------|------|------|-------------------|
| ITEM-12: Journey Summary Enhancement | SPEC-PROD-007 | 6h | Depends on SPEC-PROD-005 being stable. Polish feature, not a bug. Sprint 28 theme will be "Beta Polish + Readiness" |
| ITEM-13: Nav Restructure (Expeditions vs Meu Atlas) | SPEC-PROD-008 | 8h | Largest new feature (8h). Structural navigation change too risky for a bug-focused sprint. Map pin fix (REC-011) extracted as standalone for S27 |
| DnD Time Adjustment | SPEC-PROD-004 | 10h | Carried from Sprint 26 deferral. Still the highest-effort single item. Not beta-blocking |
| Dashboard Trip Card Redesign | SPEC-PROD-002 AC-002 | 6h | Depends on SPEC-PROD-005 completion state on cards |
| Monitoring + Analytics Setup | No spec (ops) | 8h | Beta-blocking but requires ops focus, not UI work |
| LGPD Legal Pages | No spec (legal) | 4h | Beta-blocking compliance requirement |

### Sprint 28 Preview

Sprint 28 theme: "Beta Polish & Readiness"
- ITEM-12: Journey Summary Enhancement (SPEC-PROD-007, 6h)
- ITEM-13: Nav Restructure (SPEC-PROD-008, 8h)
- Monitoring + analytics setup (8h)
- LGPD legal pages (4h)
- Manual test full re-run (4h)
- CTA standardization overflow if needed (0-6h)
- Total: ~30-36h + buffer

---

## 4. Spec Requirements Matrix

| Item | SPEC-PROD | SPEC-UX | SPEC-ARCH | Notes |
|------|-----------|---------|-----------|-------|
| ITEM-1 (Nav Bug Cluster) | SPEC-PROD-001 (existing) | Not needed | Not needed | Bug fixes within existing spec |
| ITEM-2 (Autocomplete) | Not needed (XS CSS fix) | Not needed | Not needed | Parent container overflow |
| ITEM-3 (Guide Fixes) | SPEC-PROD-003 (existing) | Not needed | Not needed | Spec conformance validation |
| ITEM-4 (Phase 4 Labels) | Not needed (XS) | Not needed | Not needed | Translation key fix |
| ITEM-5 (Dashboard Bar) | Not needed (XS) | Not needed | Not needed | Tooltip or visual cue |
| ITEM-6 (Preferences) | Existing SPEC-UX-004 | Not needed | Not needed | Persistence verification |
| ITEM-7 (Profile Image) | Not needed (XS) | Not needed | Not needed | Field save fix |
| ITEM-8 (Phase 1 Fields) | Not needed (S) | Not needed | Not needed | Validation enforcement |
| ITEM-9 (CTA Buttons) | **SPEC-PROD-009** (new) | Needed | Not needed | Client-side only |
| ITEM-10 (Gamification Header) | **SPEC-PROD-006** (new) | Needed | Needed (data fetch) | New header component |
| ITEM-11 (Map Pin) | SPEC-PROD-008 (partial) | Needed | Not needed | Make interactive or remove |
| ITEM-12 (Summary Enhancement) | **SPEC-PROD-007** (new) | Needed | Needed (readiness calc) | Sprint 28 |
| ITEM-13 (Nav Restructure) | **SPEC-PROD-008** (new) | Needed | Needed (new route) | Sprint 28 |

---

## 5. Spec Cross-References

### New Specs Created (Sprint 27)

| Spec ID | Title | File | Fulfills |
|---------|-------|------|----------|
| SPEC-PROD-006 | Gamification Header Display | `docs/specs/sprint-27/SPEC-PROD-006.md` | NEW-001, ITEM-10 |
| SPEC-PROD-007 | Complete Journey Summary Enhancement | `docs/specs/sprint-27/SPEC-PROD-007.md` | NEW-002, REC-009, ITEM-12 (Sprint 28) |
| SPEC-PROD-008 | Navigation Restructure -- Expeditions vs Meu Atlas | `docs/specs/sprint-27/SPEC-PROD-008.md` | NEW-003, REC-011, ITEM-13 (Sprint 28) |
| SPEC-PROD-009 | CTA Button Standardization | `docs/specs/sprint-27/SPEC-PROD-009.md` | NEW-004, ITEM-9 |

### Existing Specs Referenced

| Spec ID | Title | Items Covered |
|---------|-------|--------------|
| SPEC-PROD-001 | Expedition Navigation & Phase Sequencing | REC-003, REC-004, REC-005, REC-006 (ITEM-1) |
| SPEC-PROD-003 | Destination Guide Full Visibility | REC-012, REC-013, REC-014 (ITEM-3) |
| SPEC-UX-004 | (Preferences) | REC-007 (ITEM-6) |

### Recurring Bug to Spec Traceability

| Bug | Category | Spec | Sprint 27 Task |
|-----|----------|------|----------------|
| REC-001 | Autocomplete | No spec (CSS fix) | T-S27-002 |
| REC-002 | Dashboard UX | No spec (tooltip) | T-S27-005 |
| REC-003 | Navigation | SPEC-PROD-001 | T-S27-001 |
| REC-004 | Navigation | SPEC-PROD-001 | T-S27-001 |
| REC-005 | Navigation | SPEC-PROD-001 | T-S27-001 |
| REC-006 | Navigation | SPEC-PROD-001 | T-S27-001 |
| REC-007 | Preferences | SPEC-UX-004 | T-S27-006 |
| REC-008 | Labels | No spec (i18n fix) | T-S27-004 |
| REC-009 | Summary | SPEC-PROD-007 | Deferred to S28 (ITEM-12) |
| REC-010 | Profile | No spec (XS fix) | T-S27-007 |
| REC-011 | Map/Nav | SPEC-PROD-008 | T-S27-011 (pin only) |
| REC-012 | Guide | SPEC-PROD-003 | T-S27-003 |
| REC-013 | Guide | SPEC-PROD-003 | T-S27-003 |
| REC-014 | Guide | SPEC-PROD-003 | T-S27-003 |

---

## 6. Stakeholder Questions -- Resolved

### Q1: Should Phase 5 be renamed from "A Conexao"?

**Decision**: No. "A Conexao" (The Connection) is fine as a phase name. However, the subtitle/description text shown to the user MUST clearly say "Guia do Destino" (PT-BR) / "Destination Guide" (EN), NOT "Mapa dos Dias" or any map-related wording. The phase name stays; the description must be accurate. This is a translation/label fix, not a rename. Covered by T-S27-003 (guide fixes).

### Q2: Is the checklist (Phase 3) generated by AI?

**Decision**: YES. The checklist is generated by the AI provider based on the trip classification (domestic, international, intercontinental). The AI receives the trip type, destination, dates, and passenger information, and generates a context-appropriate checklist. This has been functional since Sprint 12. No change needed.

### Q3: Is session persistence after browser close a security issue?

**Decision**: NO. Auth.js JWT sessions persist until token expiry (30 days default). This is standard behavior for consumer web applications. Closing the browser does not invalidate the JWT. This is by design, not a bug. No action needed. If we later want explicit logout-on-close behavior, that would be a feature request requiring a new spec and stakeholder approval, since it would significantly degrade UX for returning users.

---

## 7. Risk Register

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| CTA standardization (T-S27-009) touches all 6 wizards, integration issues | Overrun by 2-4h | Medium | Sacrifice order places this third. Deliver label + placement fixes first, defer disabled state feedback if needed |
| Guide fixes (T-S27-003) reveal deeper Sprint 26 implementation gaps | Overrun by 2-3h | Medium | Cap investigation at 3h. If structural issue found, log for Sprint 28 and apply band-aid fix |
| Autocomplete fix (T-S27-002) is not purely CSS (JS event handling involved) | Overrun by 1-2h | Low | Root cause identified by tech-lead as CSS stacking. If JS needed, apply focused fix only |
| Navigation bug cluster (T-S27-001) has cascading effects when fixing guards | Overrun by 1-2h | Low | Fix one bug at a time with test verification between each |
| Gamification header (T-S27-010) data fetch adds latency to every page | Performance regression | Low | Spec mandates non-blocking fetch and < 500ms budget. Sacrificable if performance issues arise |
| Buffer consumed by bug investigation rather than implementation | All P2 items deferred | Medium | Strict 4h cap on any single investigation. Escalate to tech-lead if root cause not found in 4h |

---

## 8. Definition of Done (Sprint 27)

- [ ] All 14 recurring bugs (REC-001 through REC-014) verified as fixed or have documented resolution (12 fixed in S27, 2 deferred with specs)
- [ ] T-S27-012 manual test re-run completed: all 14 REC items pass
- [ ] SPEC-PROD-009 (CTA Standardization) acceptance criteria validated across all 6 phases
- [ ] SPEC-PROD-006 (Gamification Header) acceptance criteria validated if delivered
- [ ] No spec drift: code matches approved specs
- [ ] All commits reference spec IDs or bug IDs per SDD process
- [ ] Version bumped to 0.20.0
- [ ] Sprint 27 review completed by all mandatory reviewers
- [ ] Recurring bug count at sprint end: 0 (target)
- [ ] SPEC-STATUS.md updated with new specs and their implementation status
