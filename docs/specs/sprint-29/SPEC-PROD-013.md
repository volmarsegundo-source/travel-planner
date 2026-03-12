---
spec_id: SPEC-PROD-013
title: "Beta Onboarding Flow Validation"
type: product
status: Draft
version: "1.0.0"
author: product-owner
sprint: 29
priority: P1
created: "2026-03-12"
updated: "2026-03-12"
related_specs: [SPEC-PROD-001, SPEC-PROD-005, SPEC-PROD-011]
---

# SPEC-PROD-013: Beta Onboarding Flow Validation

**Version**: 1.0.0
**Status**: Draft
**Author**: product-owner
**Reviewers**: [tech-lead, qa-engineer]
**Created**: 2026-03-12
**Last Updated**: 2026-03-12

---

## 1. Problem Statement

Atlas Travel Planner is approaching its first beta launch (50-100 invited users). The product has been developed over 29 sprints with 1721 automated tests, but the critical path that a brand-new user follows -- from registration to a complete trip summary -- has never been validated end-to-end as a single, uninterrupted flow.

Individual features work in isolation (tested via unit and component tests), but the full journey has integration seams that may break: session initialization after registration, first-trip creation with empty profile, phase progression through all 6 phases, and summary rendering with real data. If a beta user hits a dead end or error in their first session, the product loses credibility immediately.

This spec defines the validation protocol for the beta onboarding flow, not a new feature. It establishes what must be tested, what "pass" means, and how failures are documented and escalated.

**Evidence**: Sprint 26 manual testing revealed ~40 NOK out of 111 scenarios (36% failure rate). While Sprint 27's bug blitz resolved 14 recurring bugs and Sprint 28 delivered structural improvements, no end-to-end flow validation has been performed since.

**Affected users**: All beta users. Every persona starts with this flow.

## 2. User Story

As a new beta user who has received an invitation to try Atlas,
I want to register, set up my profile, create my first trip, and see a complete trip summary without encountering any errors, dead ends, or confusing screens,
so that my first impression of the product is positive and I am motivated to continue planning my trip.

### Traveler Context

- **Pain point**: First impressions are irreversible. A beta user who encounters an error during registration or trip creation will likely abandon the product and provide negative feedback, undermining the beta program's goal of collecting constructive improvement suggestions.
- **Current workaround**: None. Beta users have no prior knowledge of the product and cannot work around issues.
- **Frequency**: Once per user (but 100% of beta users go through this flow).

## 3. Acceptance Criteria

### Scenario A: Credentials Registration Flow

- [ ] AC-001: User navigates to the registration page, fills in name, email, password, and password confirmation. Submits successfully. No error screens, no unexpected redirects.
- [ ] AC-002: After registration, user is redirected to the login page with a success banner ("Account created successfully" or equivalent localized message).
- [ ] AC-003: User logs in with the credentials just created. Dashboard (Expeditions) page loads with empty state ("Create your first expedition" prompt).
- [ ] AC-004: User clicks "Create Expedition" (or equivalent CTA). Phase 1 wizard opens. User fills destination, dates, and traveler info. Advances to Phase 2.
- [ ] AC-005: User completes Phase 2 (travel style + passengers). Advances to Phase 3. AI generates checklist without errors.
- [ ] AC-006: User completes Phase 3 (reviews checklist). Advances through Phase 4, 5, 6. Each phase loads without errors and displays appropriate content.
- [ ] AC-007: After completing Phase 6, the summary page renders with: trip countdown, readiness percentage, 6 phase cards with data, and Next Steps suggestions.
- [ ] AC-008: User clicks "Edit" on Phase 1 from the summary. Phase 1 reopens with previously saved data pre-populated. User changes the destination. Returns to summary. Summary reflects the updated destination without full page reload.

### Scenario B: Google OAuth Registration Flow

- [ ] AC-009: User clicks "Sign in with Google" on the registration/login page. Google OAuth flow completes. User lands on the Dashboard (Expeditions) page.
- [ ] AC-010: Same flow as AC-004 through AC-008, but starting from the Google-authenticated session.

### Cross-Cutting Validations

- [ ] AC-011: All screens render correctly on both desktop (1280px) and mobile (375px) viewports.
- [ ] AC-012: All user-facing text appears in the correct locale (PT-BR or EN based on user's language selection). No hardcoded English strings in a PT-BR session, and vice versa.
- [ ] AC-013: The gamification header indicator is visible throughout the flow and updates after point-earning actions (phase completion).
- [ ] AC-014: Navigation items (Expeditions, Meu Atlas) are visible and functional throughout the flow.
- [ ] AC-015: No console errors (JavaScript exceptions) appear during the entire flow.

### Failure Escalation

- [ ] AC-016: Any AC failure that blocks the flow (user cannot proceed) is classified as P0 and must be fixed within Sprint 29 or Sprint 30 becomes a fix sprint.
- [ ] AC-017: Any AC failure that degrades the experience but allows the user to proceed (e.g., missing translation, visual glitch) is classified as P1 and documented for Sprint 30.
- [ ] AC-018: Results must be documented in `docs/test-results/beta-onboarding-validation-s29.md` with pass/fail per AC, screenshots for failures, and severity classification.

## 4. Scope

### In Scope

- Scripted end-to-end validation of the critical beta user path
- Two registration methods: credentials and Google OAuth
- Phase 1 through Phase 6 traversal
- Summary page rendering and edit capability
- Documentation of results with pass/fail per AC

### Out of Scope

- Automated E2E test creation (this is manual validation)
- Edge cases (password reset, account deletion, concurrent sessions)
- Performance benchmarking (covered by existing performance budgets in SPEC-PROD-011/012)
- Load testing with multiple concurrent users
- Non-critical flows (preferences editing, badge viewing, map interaction)

## 5. Constraints (MANDATORY)

### Security

- The validation must use test accounts, not real user data.
- Google OAuth testing requires a valid Google test account. If unavailable, document as "unable to test" with justification.

### Accessibility

- The flow must be navigable via keyboard only (Tab, Enter, Space) for at least Scenario A. Document any keyboard traps.

### Performance

- Each page transition must complete in under 3 seconds. Document any transitions that exceed this threshold.

## 6. Success Metrics

- **Pass rate**: 100% of AC-001 through AC-015 pass (P0: all "proceed" ACs pass; P1: all "quality" ACs pass).
- **Zero blockers**: No P0 issues remain after Sprint 29.
- **Documentation**: Results file committed to repository.

## 7. Dependencies

- Summary page card-based redesign (T-S29-001) must be complete.
- Phase revisit data loading (T-S29-005) must be complete.
- CTA standardization (T-S29-003) must be complete.
- Staging environment must be deployed with Sprint 29 code.

## 8. Vendor Independence

- This spec describes WHAT must be validated, not HOW the validation is performed.
- No vendor-specific testing tools are mandated.

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-12 | product-owner | Initial draft for Sprint 29. Defines beta onboarding flow validation protocol |
