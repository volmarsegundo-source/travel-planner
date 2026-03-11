# QA-CONF-XXX: Spec Conformance Audit — Sprint XX

**Date**: YYYY-MM-DD
**Auditor**: qa-engineer
**Sprint**: XX
**Specs Audited**: [list of spec IDs, e.g., SPEC-PROD-025, SPEC-UX-025, SPEC-ARCH-025]
**Verdict**: CONFORM / DRIFT DETECTED

---

## Methodology

This audit verifies that the implemented code conforms to every acceptance criterion,
constraint, and requirement defined in the approved specs for this sprint. Spec drift
is classified as a P0 bug and blocks release until resolved (either code is fixed or
spec is formally amended via change request).

**Audit scope**: All specs whose implementation was completed or modified during this sprint.

**Evidence standard**: Every PASS must cite a test ID or code reference. Every DRIFT must
include reproduction steps and a filed bug ID.

---

## Audit Results

### SPEC-XXX: [Feature Name]

**Spec Version**: vX.Y (date approved)
**Implementation PR**: #NNN

#### Acceptance Criteria Conformance

| AC# | Acceptance Criteria | Spec Says | Code Does | Evidence | Status |
|-----|-------------------|-----------|-----------|----------|--------|
| AC-1 | [criteria text] | [expected behavior from spec] | [actual behavior observed] | [test ID or code ref] | PASS / DRIFT / MISSING |
| AC-2 | [criteria text] | [expected behavior from spec] | [actual behavior observed] | [test ID or code ref] | PASS / DRIFT / MISSING |
| AC-3 | [criteria text] | [expected behavior from spec] | [actual behavior observed] | [test ID or code ref] | PASS / DRIFT / MISSING |

#### Constraints Compliance

| Constraint Category | Spec Requirement | Implementation | Evidence | Status |
|--------------------|-----------------|----------------|----------|--------|
| Security: BOLA | assertTripOwnership on all endpoints | Implemented in [file:line] | TC-N01 | PASS / DRIFT |
| Security: Auth | Auth check first statement in action | Verified in [file:line] | TC-N02 | PASS / DRIFT |
| Security: Input validation | Zod schema strips userId, id, status | Schema at [file:line] | TC-N03 | PASS / DRIFT |
| Performance: API response | < XXXms P95 | Measured: XXms | TC-P01 | PASS / DRIFT |
| Performance: DB query | < XXms P95 | Measured: XXms | TC-P02 | PASS / DRIFT |
| Accessibility: WCAG AA | Keyboard navigation for all controls | Tested with axe-core | TC-A01 | PASS / DRIFT |
| Accessibility: Screen reader | Semantic HTML, ARIA labels | Manual + axe audit | TC-A02 | PASS / DRIFT |
| i18n: All user-facing strings | No hardcoded strings | Grep audit | [ref] | PASS / DRIFT |
| Data model | Schema matches spec ERD | Prisma schema at [file:line] | [ref] | PASS / DRIFT |

#### Drift Items

| # | Description | Severity | Spec Section | Bug ID | Action Required |
|---|-------------|----------|-------------|--------|----------------|
| 1 | [what drifted from spec] | P0 / P1 / P2 | [spec section ref] | BUG-XXX | Update spec / Fix code |
| 2 | [what drifted from spec] | P0 / P1 / P2 | [spec section ref] | BUG-XXX | Update spec / Fix code |

#### Unspecified Additions

| # | Description | Risk Assessment | Action Required |
|---|-------------|----------------|----------------|
| 1 | [feature/behavior not in any spec] | [risk if untested] | Add to spec / Remove from code / Accept with spec amendment |

---

### SPEC-YYY: [Feature Name]

_(Repeat the same structure for each spec audited in this sprint.)_

---

## Summary

| Metric | Count |
|--------|-------|
| Specs Audited | X |
| Total ACs Checked | X |
| PASS | X |
| DRIFT | X |
| MISSING (not implemented) | X |
| Unspecified Additions | X |
| P0 Bugs Filed | X |
| P1 Bugs Filed | X |

## Open Drift Bugs

| Bug ID | Severity | Spec | AC# | Description | Ship Decision |
|--------|----------|------|-----|-------------|---------------|
| BUG-XXX | P0 | SPEC-XXX | AC-1 | [description] | HOLD — must fix before release |
| BUG-YYY | P1 | SPEC-XXX | AC-3 | [description] | Fix in hotfix / next sprint |

## Verdict

- [ ] **ALL SPECS CONFORM** — No drift detected. Ready for release.
- [ ] **DRIFT DETECTED** — P0 bugs filed. Release blocked until all P0 drift items are resolved.
- [ ] **PARTIAL CONFORMANCE** — P1 drift only. Release approved with known issues documented.

### Verdict Rationale

[Explain why this verdict was reached. Reference specific drift items if applicable.
If approving with known issues, explain the risk acceptance rationale.]

---

## Appendix: Audit Checklist

Before marking this audit complete, confirm:

- [ ] All specs for this sprint have been audited
- [ ] Every AC has been checked against implementation
- [ ] Security constraints verified (BOLA, auth, input validation)
- [ ] Performance budgets measured (not estimated)
- [ ] Accessibility requirements tested (axe-core + manual)
- [ ] i18n completeness verified (no hardcoded strings)
- [ ] All drift items have filed bug reports
- [ ] All P0 drift bugs are linked to this audit
- [ ] Tech-lead notified of any drift findings
- [ ] Audit results recorded in sprint QA sign-off (QA-REL-XXX)
