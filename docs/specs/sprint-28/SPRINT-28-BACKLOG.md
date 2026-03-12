# Sprint 28 Backlog Prioritization

**Sprint**: 28
**Version Target**: 0.21.0
**Budget**: 40-50h (2 developers)
**Theme**: "Beta Polish -- Navigation, Summary & Gamification Visibility"
**Process**: Spec-Driven Development (SDD)
**Author**: product-owner
**Date**: 2026-03-11

---

## 0. Sprint Context

### Why "Beta Polish" After "Bug Blitz"

Sprint 27 (v0.20.0) was dedicated to eliminating 14 recurring bugs that had persisted across 3-4 sprints. With those resolved, Sprint 28 shifts focus to the structural improvements and polish features that were deferred from Sprint 27. These are the last non-trivial product changes before beta launch in Sprint 29.

Sprint 28 is the final feature sprint before beta. After Sprint 28, no new features will be added until beta feedback is collected. Sprint 29 is beta launch + monitoring + feedback loops only.

### Key Inputs

- Sprint 27 results: 14 recurring bugs resolved (target), CTA standardization delivered (SPEC-PROD-009), gamification header and map pin deferred
- SPEC-PROD-006, 007, 008 (Sprint 27 drafts) superseded by SPEC-PROD-010, 011, 012
- Beta readiness items: LGPD pages, monitoring setup, analytics (operational, not product features)
- Remaining UX debt from v0.20.0 manual testing

### Budget Allocation

| Category | Hours | % |
|----------|-------|---|
| P1 features (specs) | 28h | 56% |
| P1 remaining fixes | 5.5h | 11% |
| Operational (beta readiness) | 6h | 12% |
| Manual test full re-run | 4h | 8% |
| Buffer | 6.5h | 13% |
| **Total** | **50h** | **100%** |

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
| 1 | NEW-003: Navigation Restructure (SPEC-PROD-012) | 4 | 4 | 2 | 5 | 5 | 3.85 | 12h | P1 |
| 2 | NEW-002: Journey Summary with Edit (SPEC-PROD-011) | 4 | 3 | 2 | 5 | 4 | 3.55 | 10h | P1 |
| 3 | NEW-001: Gamification Header (SPEC-PROD-010) | 3 | 3 | 3 | 5 | 4 | 3.45 | 4h | P1 |
| 4 | NEW-004: CTA Standardization overflow (SPEC-PROD-009) | 3 | 2 | 4 | 4 | 2 | 2.95 | 2h | P1 |
| 5 | FIX-001: Profile name persistence | 3 | 2 | 4 | 3 | 1 | 2.75 | 1.5h | P1 |
| 6 | FIX-002: Phase 4 auto-save on tab switch | 3 | 2 | 3 | 4 | 2 | 2.85 | 2h | P1 |
| 7 | FIX-003: Phase revisit shows saved data | 4 | 3 | 3 | 5 | 2 | 3.50 | 2h | P1 |
| 8 | OPS-001: LGPD Legal Pages | 2 | 5 | 4 | 5 | 1 | 3.50 | 4h | P1 |
| 9 | OPS-002: Basic Monitoring Setup | 2 | 3 | 3 | 5 | 1 | 2.80 | 2h | P1 |
| 10 | T-S28-010: Manual Test Full Re-Run | 5 | 4 | 3 | 5 | 1 | 3.90 | 4h | Mandatory |

### Scoring Rationale

**NEW-003 (Navigation Restructure, 3.85)**: Highest strategic alignment (5) and competitive differentiation (5). The dual navigation (Expeditions + Meu Atlas) with a map view is the feature that most differentiates Atlas from generic trip planners. Effort inverse is low (2) because 12h is significant, but this is the foundational structural change that enables the Atlas identity. Must be done before beta.

**NEW-002 (Journey Summary with Edit, 3.55)**: High pain (4) because the summary is the "payoff moment" and is currently a dead end. The edit capability transforms it from a read-only screen to a trip control center. 10h includes readiness calculation, dashboard button, and edit navigation.

**FIX-003 (Phase revisit shows saved data, 3.50)**: Scored high on pain (4) and strategic (5) because returning to a previously completed phase and seeing empty fields instead of saved data is a trust-breaking experience. If Sprint 27 did not fully resolve REC-006, this remains critical.

**OPS-001 (LGPD Legal Pages, 3.50)**: Revenue impact is the highest in this category (5) because beta launch is blocked without LGPD compliance. Traveler pain is low (2) but business risk is critical. Non-negotiable for beta.

---

## 2. Sprint 28 Commitment (50h Budget)

### P1 Features -- Specced (28h)

| Task ID | Item | Spec | Est. | Rationale |
|---------|------|------|------|-----------|
| T-S28-001 | Navigation Restructure | SPEC-PROD-012 | 12h | Structural nav change: 2 nav items, Meu Atlas page (gamification profile + map section), breadcrumb updates, mobile menu, empty states. Largest item -- schedule first |
| T-S28-002 | Journey Summary with Edit | SPEC-PROD-011 | 10h | Summary enhancement: countdown, readiness indicator, edit per phase, next steps, card layout, dashboard "View Summary" button |
| T-S28-003 | Gamification Header | SPEC-PROD-010 | 4h | Compact points/level indicator in header, real-time updates, click-through to Meu Atlas, mobile responsive |
| T-S28-004 | CTA Standardization Overflow | SPEC-PROD-009 (S27) | 2h | Complete any CTA work not finished in Sprint 27. Likely: Phase 4 sub-section CTAs, disabled state feedback polish |

### P1 Remaining Fixes (5.5h)

| Task ID | Item | Spec | Est. | Rationale |
|---------|------|------|------|-----------|
| T-S28-005 | Profile name persistence | No spec (S) | 1.5h | User's display name on profile not persisting correctly after save. Reported in v0.20.0 testing |
| T-S28-006 | Phase 4 auto-save on tab switch | No spec (S) | 2h | When switching between Transport/Accommodation/Mobility tabs in Phase 4, unsaved data in the current tab is lost. Should auto-save or prompt before switching |
| T-S28-007 | Phase revisit shows saved data | No spec (S) | 2h | When returning to a previously completed phase, form fields should be pre-populated with saved data. Verify across all 6 phases. May partially overlap with SPEC-PROD-011 AC-008 |

### Operational -- Beta Readiness (6h)

| Task ID | Item | Spec | Est. | Rationale |
|---------|------|------|------|-----------|
| T-S28-008 | LGPD Legal Pages | No spec (legal/ops) | 4h | Create privacy policy and terms of use pages. Required for beta. Content includes: data collected, AI provider privacy disclosure (Google free tier), user rights, data deletion |
| T-S28-009 | Basic Monitoring Setup | No spec (ops) | 2h | Minimum viable monitoring for beta: error tracking, uptime check, AI API usage alerting. NOT full observability -- just enough to know if beta is broken |

### Mandatory Quality Gate (4h)

| Task ID | Item | Spec | Est. | Rationale |
|---------|------|------|------|-----------|
| T-S28-010 | Manual Test Full Re-Run | N/A | 4h | Full re-run of manual test checklist (all 178 scenarios from v2 + new scenarios for Sprint 28 features). Must pass before beta approval |

### Budget Summary

| Category | Hours |
|----------|-------|
| P1 features (specced) | 28h |
| P1 remaining fixes | 5.5h |
| Operational (beta readiness) | 6h |
| Manual test re-run | 4h |
| **Total committed** | **43.5h** |
| **Buffer** | **6.5h (13%)** |
| **Total budget** | **50h** |

### Buffer Analysis

- Buffer is 13% -- lower than the 31% used in Sprint 27
- Justification: Sprint 28 has larger items (12h + 10h) but they are well-specced with clear scope boundaries. Sprint 27's high buffer was needed for investigation of unknown root causes; Sprint 28 items are new feature work with defined acceptance criteria
- Risk: SPEC-PROD-012 (nav restructure, 12h) is the highest-risk item due to its structural nature. If it overruns, it consumes the buffer first
- Mitigation: If T-S28-001 overruns by >4h, defer the map section (AC-007 through AC-011) to Sprint 29 and ship the navigation restructure without the map

### Sacrifice Order (if budget pressure)

If the sprint runs over budget, items are sacrificed in this order (first sacrificed first):

1. **T-S28-009** (Basic Monitoring, 2h) -- Can use Vercel's built-in analytics as a temporary fallback for beta. Not ideal but not blocking.
2. **T-S28-004** (CTA Overflow, 2h) -- If Sprint 27 delivered the core CTA changes, remaining polish can wait.
3. **T-S28-001 partial** (Map Section, ~4h of 12h) -- The nav restructure (Expeditions + Meu Atlas + gamification profile) ships WITHOUT the map section. Map deferred to Sprint 29.
4. **T-S28-006** (Phase 4 auto-save, 2h) -- Annoying UX but not blocking. Can warn users with a confirmation dialog as a band-aid.

Items T-S28-002, T-S28-003, T-S28-005, T-S28-007, T-S28-008, and T-S28-010 are **non-negotiable** for Sprint 28. These represent the core beta polish (summary + header), critical fixes (profile + phase revisit), compliance (LGPD), and quality gate (manual tests).

---

## 3. Spec Requirements Matrix

| Item | SPEC-PROD | SPEC-UX | SPEC-ARCH | Notes |
|------|-----------|---------|-----------|-------|
| T-S28-001 (Nav Restructure) | **SPEC-PROD-012** (new) | Needed (Meu Atlas page layout, map section) | Needed (new route, map data endpoint) | L-sized feature, all spec types |
| T-S28-002 (Summary with Edit) | **SPEC-PROD-011** (new) | Needed (card layout, readiness visual) | Needed (readiness calculation endpoint) | L-sized feature, all spec types |
| T-S28-003 (Gamification Header) | **SPEC-PROD-010** (new) | Needed (indicator design, mobile treatment) | Needed (gamification data fetch) | M-sized feature |
| T-S28-004 (CTA Overflow) | SPEC-PROD-009 (S27, existing) | Existing | Not needed | Continuation of S27 work |
| T-S28-005 (Profile name) | Not needed (S) | Not needed | Not needed | Bug fix |
| T-S28-006 (Phase 4 auto-save) | Not needed (S) | Not needed | Not needed | UX fix |
| T-S28-007 (Phase revisit data) | Not needed (S) | Not needed | Not needed | Bug fix, overlaps SPEC-PROD-011 |
| T-S28-008 (LGPD Pages) | Not needed (legal) | Not needed | Not needed | Content pages |
| T-S28-009 (Monitoring) | Not needed (ops) | Not needed | Not needed | Ops task |
| T-S28-010 (Manual Tests) | N/A | N/A | N/A | Quality gate |

---

## 4. Spec Cross-References

### New Specs Created (Sprint 28)

| Spec ID | Title | File | Supersedes |
|---------|-------|------|------------|
| SPEC-PROD-010 | Gamification Score in Header | `docs/specs/sprint-28/SPEC-PROD-010.md` | SPEC-PROD-006 (S27 draft) |
| SPEC-PROD-011 | Complete Journey Summary with Edit | `docs/specs/sprint-28/SPEC-PROD-011.md` | SPEC-PROD-007 (S27 draft) |
| SPEC-PROD-012 | Navigation Restructure -- Expeditions vs Meu Atlas | `docs/specs/sprint-28/SPEC-PROD-012.md` | SPEC-PROD-008 (S27 draft) |

### Sprint 27 Specs Carried Forward

| Spec ID | Title | Status |
|---------|-------|--------|
| SPEC-PROD-009 | CTA Button Standardization | Partially implemented in S27. Overflow work in T-S28-004 |

### Dependency Graph

```
SPEC-PROD-010 (Header)
    |
    +---> clicks through to ---> SPEC-PROD-012 (Meu Atlas page)
    |
SPEC-PROD-012 (Nav Restructure)
    |
    +---> map pin "View Trip" links to ---> SPEC-PROD-011 (Summary) for completed trips
    |
SPEC-PROD-011 (Summary with Edit)
    |
    +---> "View Summary" button follows ---> SPEC-PROD-009 (CTA hierarchy)
    +---> extends ---> SPEC-PROD-005 (Expedition Completion)
```

### Implementation Order Recommendation

1. **T-S28-001** (Nav Restructure) FIRST -- creates the Meu Atlas route and page shell that T-S28-003 links to
2. **T-S28-003** (Gamification Header) SECOND -- links to the Meu Atlas page created in step 1
3. **T-S28-002** (Summary with Edit) THIRD -- independent of nav restructure but benefits from CTA standardization
4. **T-S28-004 through T-S28-009** can be done in parallel or in any order
5. **T-S28-010** (Manual Tests) LAST -- validates everything

---

## 5. Deferred to Sprint 29+

| Item | Est. | Reason for Deferral |
|------|------|---------------------|
| DnD Time Adjustment (SPEC-PROD-004) | 10h | Carried from Sprint 26/27. Not beta-blocking. Post-beta feature |
| Dashboard Trip Card Redesign (SPEC-PROD-002 AC-002) | 6h | Depends on nav restructure landing first. Post-beta UX improvement |
| US-122: Destination Chat AI (Premium) | 12h+ | Revenue feature. Requires GeminiProvider + payment gateway. Sprint 30-31 |
| Full Observability Setup | 6h | Sprint 28 does minimum viable monitoring. Full observability after beta data reveals bottlenecks |
| Analytics Platform Integration | 8h | PostHog or alternative. After beta launch when we know what metrics matter |
| Map Pin Clustering | 2h | Only relevant when users have many trips in one region. Post-beta optimization |

---

## 6. Risk Register

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Nav restructure (T-S28-001, 12h) is structurally complex and touches all authenticated routes | Overrun by 4-6h, consuming buffer and forcing map section deferral | Medium | Map section (AC-007-011) is explicitly in the sacrifice order. Ship nav restructure without map if needed |
| Summary readiness calculation (T-S28-002) requires aggregating data across 6 phases, query complexity | Overrun by 2-3h, or performance budget exceeded (>500ms) | Medium | Cap readiness calculation to 3 queries max. Simplify weights if needed |
| Gamification header (T-S28-003) data fetch adds latency to every page load | Performance regression on all authenticated pages | Low | Spec mandates non-blocking fetch, <500ms, <5KB bundle. If issues arise, ship as client-side lazy load |
| Sprint 27 CTA work incomplete, T-S28-004 needs more than 2h | Budget for CTA overflow is too small | Low | If S27 delivered core labels + placement, the overflow is only disabled state polish. If S27 missed core work, escalate and reprioritize |
| LGPD pages (T-S28-008) require legal review not available within sprint | Content incomplete or inaccurate | Medium | Draft pages using standard LGPD templates for SaaS. Flag as "draft - pending legal review" for beta. Legal review can happen during beta period |
| 13% buffer is tight for a sprint with 12h + 10h items | All sacrifice items are cut | Medium | Sacrifice order is clear. Core delivery (nav + summary + header + LGPD + tests) fits in 38h even without buffer |

---

## 7. Definition of Done (Sprint 28)

- [ ] SPEC-PROD-012 (Navigation Restructure) acceptance criteria validated: 2 nav items, Meu Atlas page with gamification + map, breadcrumbs updated
- [ ] SPEC-PROD-011 (Summary with Edit) acceptance criteria validated: countdown, readiness, edit per phase, next steps, dashboard access
- [ ] SPEC-PROD-010 (Gamification Header) acceptance criteria validated: indicator visible on all pages, real-time updates, click-through to Meu Atlas
- [ ] CTA standardization (SPEC-PROD-009) fully complete across all 6 phases
- [ ] Profile name persistence fix verified
- [ ] Phase 4 auto-save on tab switch verified (if delivered)
- [ ] Phase revisit shows saved data verified across all 6 phases
- [ ] LGPD privacy policy and terms of use pages live and accessible
- [ ] Basic monitoring operational (error tracking + uptime)
- [ ] T-S28-010 manual test full re-run completed: >= 95% pass rate (target)
- [ ] No spec drift: code matches approved specs
- [ ] All commits reference spec IDs or task IDs per SDD process
- [ ] Version bumped to 0.21.0
- [ ] Sprint 28 review completed by all mandatory reviewers
- [ ] Beta launch GO/NO-GO decision documented

---

## 8. Beta Launch Readiness Checklist (Sprint 29 Gate)

After Sprint 28, the following must be TRUE for Sprint 29 beta launch approval:

- [ ] All 14 recurring bugs from v0.19.0 confirmed resolved (Sprint 27)
- [ ] Navigation restructure live (Expeditions + Meu Atlas)
- [ ] Summary with edit capability functional
- [ ] Gamification header visible on all pages
- [ ] CTA buttons standardized across all phases
- [ ] LGPD pages published
- [ ] Monitoring active (errors, uptime, AI usage)
- [ ] Manual test pass rate >= 95%
- [ ] Google AI free tier privacy disclosure in terms of use
- [ ] No P0 or P1 bugs open
- [ ] Staging environment matches production config
- [ ] Beta user onboarding flow tested (new user creates account + first trip)

If any item fails, Sprint 29 becomes "Beta Fix Sprint" instead of "Beta Launch Sprint," and launch moves to Sprint 30.
