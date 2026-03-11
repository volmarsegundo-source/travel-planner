# Spec Status Tracker

> Maintained by: tech-lead
> Last updated: 2026-03-11
> SDD effective from: Sprint 25

## Status Definitions

| Status | Meaning |
|--------|---------|
| Draft | Spec is being written. Not ready for review. |
| In Review | Spec submitted for cross-agent review. |
| Approved | All reviewers approved. Ready for task breakdown and implementation. |
| Implemented | Code merged and QA conformance validated. |
| Deprecated | Spec no longer applies. Superseded or feature removed. |

---

## Active Specs

| Spec ID | Title | Owner | Status | Version | Sprint | Reviewers |
|---------|-------|-------|--------|---------|--------|-----------|
| SPEC-PROD-001 | Expedition Navigation & Phase Sequencing | product-owner | Implemented | 1.1.0 | 25 | tech-lead, architect, security-specialist |
| SPEC-PROD-002 | Dashboard Trip Cards & Phase Confirmation | product-owner | Implemented | 1.1.0 | 25 | tech-lead, architect, ux-designer |
| SPEC-PROD-003 | Destination Guide Full Visibility | product-owner | Approved | 1.1.0 | 26 | tech-lead, ux-designer, architect |
| SPEC-PROD-004 | Itinerary Time Auto-Adjustment on Reorder | product-owner | Draft | 1.0.0 | 27 | tech-lead, architect |
| SPEC-PROD-005 | Expedition Completion & Summary | product-owner | Approved | 1.1.0 | 26 | tech-lead, ux-designer, architect |
| SPEC-UX-001 | Autocomplete Redesign | ux-designer | Approved | 1.1.0 | 26 | product-owner, tech-lead, architect |
| SPEC-UX-002 | Guide Full Visibility | ux-designer | Approved | 1.1.0 | 26 | product-owner, tech-lead, architect |
| SPEC-UX-003 | Unified Phase Transitions | ux-designer | Approved | 1.1.0 | 26 | product-owner, tech-lead, architect |
| SPEC-UX-004 | Preferences Pagination | ux-designer | Approved | 1.1.0 | 26 | product-owner, tech-lead, architect |
| SPEC-UX-005 | Dashboard Visual Polish | ux-designer | Approved | 1.1.0 | 26 | product-owner, tech-lead, architect |
| SPEC-ARCH-001 | DnD Time Auto-Adjustment | architect | Draft | 1.0.0 | 27 | tech-lead, security-specialist |

---

## Approval Queue

| Spec ID | Title | Submitted | Reviewers | Status | Blockers |
|---------|-------|-----------|-----------|--------|----------|
| SPEC-PROD-003 | Destination Guide Full Visibility | 2026-03-11 | tech-lead, ux-designer, architect | Approved v1.1.0 | — |
| SPEC-PROD-005 | Expedition Completion & Summary | 2026-03-11 | tech-lead, ux-designer, architect | Approved v1.1.0 | — |
| SPEC-UX-001 | Autocomplete Redesign | 2026-03-11 | product-owner, tech-lead, architect | Approved v1.1.0 | — |
| SPEC-UX-002 | Guide Full Visibility | 2026-03-11 | product-owner, tech-lead, architect | Approved v1.1.0 | — |
| SPEC-UX-003 | Unified Phase Transitions | 2026-03-11 | product-owner, tech-lead, architect | Approved v1.1.0 | — |
| SPEC-UX-004 | Preferences Pagination | 2026-03-11 | product-owner, tech-lead, architect | Approved v1.1.0 | — |
| SPEC-UX-005 | Dashboard Visual Polish | 2026-03-11 | product-owner, tech-lead, architect | Approved v1.1.0 | — |

---

## Implemented Specs

> Sprints 1-24 are legacy (pre-SDD). Specs listed here for reference only.

| Spec ID | Title | Version | Sprint | QA Conformance |
|---------|-------|---------|--------|---------------|
| SPEC-005 | Authenticated Navigation | 1.0.0 | Sprint 5 | Legacy (pre-SDD) |
| SPEC-ARCH-008 | AI Provider Abstraction | 1.0.0 | Sprint 8 | Legacy (pre-SDD) |
| SPEC-ARCH-009 | Atlas Gamification Engine | 1.0.0 | Sprint 9 | Legacy (pre-SDD) |
| SPEC-PROD-TRANSPORT | Transport Phase (Phase 4) | 1.0.0 | Sprint 20-21 | Legacy (pre-SDD) |
| SPEC-PROD-001 | Expedition Navigation & Phase Sequencing | 1.1.0 | Sprint 25 | Partial (7/18 ACs — remaining deferred to Sprint 26) |
| SPEC-PROD-002 | Dashboard Trip Cards & Phase Confirmation | 1.1.0 | Sprint 25 | Partial (5/12 ACs — remaining deferred to Sprint 26) |

---

## Deprecated Specs

| Spec ID | Title | Deprecated On | Reason |
|---------|-------|--------------|--------|
| — | — | — | — |

---

## Changelog

| Date | Change | By |
|------|--------|----|
| 2026-03-11 | Created spec status tracker as part of SDD rollout | tech-lead |
| 2026-03-11 | Added SPEC-PROD-001 and SPEC-PROD-002 to approval queue for Sprint 25 | tech-lead |
| 2026-03-11 | SPEC-PROD-001 and SPEC-PROD-002 implemented (partial) in Sprint 25 v0.18.0 | tech-lead |
| 2026-03-11 | Sprint 26 planning: created SPEC-PROD-003/004/005, SPEC-UX-001-005, SPEC-ARCH-001 (all Draft) | tech-lead |
| 2026-03-11 | Approved 7 Sprint 26 specs (SPEC-PROD-003/005, SPEC-UX-001-005) to v1.1.0 with stakeholder decisions Q1-Q5. SPEC-PROD-004 and SPEC-ARCH-001 remain Draft (Sprint 27). | tech-lead |
