# Tech Lead SDD Orchestration Guide

> Effective from Sprint 25 onward. Sprints 1-24 are legacy (pre-SDD).

## Role Summary

The tech-lead is the central orchestrator of Spec-Driven Development (SDD). No code ships without an approved spec. The tech-lead acts as the gatekeeper between product vision, technical architecture, and implementation -- ensuring every line of code traces back to a versioned, reviewed, and approved specification.

Spec drift is a P0 bug. Treat it with the same urgency as a security vulnerability.

---

## Core Principles

1. **Specs before code** -- No dev task is created without an approved spec
2. **Traceability** -- Every commit, PR, and test references a spec ID
3. **Change control** -- Specs are versioned; changes require approval before code resumes
4. **Cross-agent review** -- Specs are reviewed by all relevant agents before approval
5. **Conformance validation** -- QA validates code against the approved spec, not just "does it work"

---

## Workflow: New Feature

### Phase 1 -- Spec Creation

1. Receive feature request from product-owner
2. Product-owner creates SPEC-PROD-XXX (product spec with user stories, acceptance criteria)
3. Tech-lead triggers downstream specs:
   - Request UX spec from ux-designer (SPEC-UX-XXX)
   - Request architecture spec from architect (SPEC-ARCH-XXX)
   - Request security review from security-specialist (SPEC-SEC-XXX if needed)
   - Notify finops-engineer for cost impact assessment
   - Notify prompt-engineer if AI features are involved
4. Data-engineer reviews for event tracking / analytics schema needs

### Phase 2 -- Spec Review

5. Coordinate reviews: each agent reviews specs relevant to their domain
   - architect reviews SPEC-PROD and SPEC-UX for feasibility
   - security-specialist reviews all specs for threat surface
   - ux-designer reviews SPEC-ARCH for UX constraint compliance
   - finops-engineer reviews for cost implications
   - prompt-engineer reviews AI-related specs for prompt design and token optimization
6. Collect feedback, route to spec owners for revisions
7. Iterate until all reviewers approve

### Phase 3 -- Approval Gate

8. **APPROVAL GATE**: All required specs must be in "Approved" status
   - SPEC-PROD-XXX: Approved
   - SPEC-UX-XXX: Approved (if UX changes)
   - SPEC-ARCH-XXX: Approved (if architecture changes)
   - SPEC-SEC-XXX: Approved (if security implications)
9. Update docs/specs/SPEC-STATUS.md with approval status
10. Only now: create dev tasks in docs/tasks.md or sprint task doc

### Phase 4 -- Implementation

11. Break approved specs into dev tasks with explicit spec references (section-level)
12. Assign tasks to dev-fullstack-1 and dev-fullstack-2
13. Monitor implementation for spec conformance during standups
14. Request QA spec conformance audit before merge

### Phase 5 -- Merge

15. Code review: verify code matches approved spec
16. QA sign-off: conformance validated
17. Security clearance: no new vulnerabilities
18. Approve merge only if code matches spec

---

## Workflow: Spec Change During Implementation

This is the most critical workflow. Uncontrolled spec changes lead to drift, bugs, and wasted effort.

### The "Stop, Update, Approve, Resume" Protocol

1. **STOP**: Dev identifies need for spec change and immediately stops coding the affected area
2. **NOTIFY**: Dev notifies tech-lead with:
   - Which spec needs changing (SPEC-XXX)
   - What needs to change and why
   - Impact assessment (scope, timeline, other specs affected)
3. **ROUTE**: Tech-lead routes the change request to the appropriate spec owner:
   - Product change -> product-owner (SPEC-PROD)
   - UX change -> ux-designer (SPEC-UX)
   - Architecture change -> architect (SPEC-ARCH)
   - Security change -> security-specialist (SPEC-SEC)
4. **UPDATE**: Spec owner updates the spec with:
   - Version bump (e.g., 1.0.0 -> 1.1.0)
   - Change description in the spec's changelog section
   - Updated content
5. **APPROVE**: Tech-lead reviews and approves the updated spec
   - For significant changes, re-trigger cross-agent review
   - Update docs/specs/SPEC-STATUS.md
6. **RESUME**: Dev resumes coding against the updated spec version
7. **REVALIDATE**: QA re-validates against the updated spec

### What counts as a spec change?

- Adding/removing API endpoints or fields
- Changing data model structure
- Modifying user flow or screen behavior
- Altering security constraints or auth rules
- Changing AI prompt structure or model selection
- Any deviation from what the approved spec describes

### What does NOT require a spec change?

- Implementation details not covered by the spec (e.g., internal function naming)
- Performance optimizations that don't change behavior
- Bug fixes to match existing spec intent
- Refactoring that preserves spec-defined behavior

---

## Workflow: Sprint Planning with SDD

1. Review backlog with product-owner
2. Identify candidate features for the sprint
3. Check spec status for each feature:

| Spec Status | Action |
|-------------|--------|
| No spec exists | Product-owner must create SPEC-PROD first. Cannot schedule for dev. |
| Draft | Spec is incomplete. Cannot schedule for dev. Push spec completion as sprint goal. |
| In Review | May schedule if review is expected to complete early in sprint. Flag as risk. |
| Approved | Ready for task breakdown and dev assignment. |
| Implemented | Already done. Skip unless rework needed. |

4. Break approved specs into dev tasks (use standard task planning format)
5. Assign tasks with explicit spec references:
   ```
   - [ ] dev-fullstack-1 -- TASK-001: Implement transport segment CRUD
     - Spec ref: SPEC-ARCH-014 S3.2 (Data Model), SPEC-PROD-025 S2 (User Stories)
     - Acceptance: [matches spec's acceptance criteria verbatim]
   ```
6. Schedule spec creation/review work alongside dev work -- specs for Sprint N+1 should be in progress during Sprint N

---

## Quality Gates

| Gate | Owner | Criteria | When |
|------|-------|----------|------|
| Spec Completeness | tech-lead | All required spec types exist for the feature | Before task breakdown |
| Spec Approval | tech-lead + reviewers | All specs approved by relevant agents | Before dev starts |
| Code-Spec Conformance | tech-lead | Code matches approved spec (no undocumented deviations) | Code review |
| QA Conformance Audit | qa-engineer | Acceptance criteria from spec are testable and tested | Before merge |
| Security Clearance | security-specialist | All SPEC-SEC constraints met, no new vulnerabilities | Before merge |
| Release Traceability | release-manager | Changelog references spec IDs, version correct | Before release |

---

## Commit Message Convention (SDD)

All commits must reference spec IDs. The spec ID replaces or augments the task ID in the conventional commit scope.

### Format

```
feat(SPEC-PROD-025): add trip sharing feature
fix(SPEC-ARCH-012): correct API response schema per S4.1
test(SPEC-SEC-008): add BOLA negative tests
refactor(SPEC-ARCH-014): extract transport service per S3.4
docs(SPEC-UX-019): update component storybook
```

### Rules

- Primary spec reference goes in the commit scope
- If multiple specs apply, use the most specific one in the scope and mention others in the body
- Task IDs (T-SXX-NNN) remain in commit body for sprint tracking
- Example with both:
  ```
  feat(SPEC-PROD-025): implement passenger form validation

  T-S25-004: Zod schema with total cap per SPEC-ARCH-014 S3.2
  ```

---

## PR Description Convention (SDD)

Every PR must include spec traceability and a conformance checklist.

### Template

```markdown
## Spec References
- SPEC-PROD-XXX vX.Y.Z -- [title]
- SPEC-ARCH-XXX vX.Y.Z -- [title]
- SPEC-UX-XXX vX.Y.Z -- [title] (if applicable)
- SPEC-SEC-XXX vX.Y.Z -- [title] (if applicable)

## Spec Conformance Checklist
- [ ] All acceptance criteria from SPEC-PROD met
- [ ] API contract matches SPEC-ARCH
- [ ] UI matches SPEC-UX wireframes/flows
- [ ] Security constraints from SPEC-SEC enforced
- [ ] No undocumented deviations from any spec

## Deviations (if any)
| Spec | Section | Deviation | Approval |
|------|---------|-----------|----------|
| — | — | — | — |

## Tasks
- T-SXX-001: [description]
- T-SXX-002: [description]
```

---

## Spec ID Naming Convention

| Prefix | Owner | Example |
|--------|-------|---------|
| SPEC-PROD-XXX | product-owner | SPEC-PROD-025 (Trip Sharing) |
| SPEC-UX-XXX | ux-designer | SPEC-UX-025 (Trip Sharing Flows) |
| SPEC-ARCH-XXX | architect | SPEC-ARCH-025 (Trip Sharing API) |
| SPEC-SEC-XXX | security-specialist | SPEC-SEC-025 (Trip Sharing AuthZ) |

- Numbers are sequential and shared across types when they relate to the same feature
- Version format: MAJOR.MINOR.PATCH (semantic, within the spec)
  - MAJOR: breaking changes to the spec's contract
  - MINOR: additive changes (new fields, new endpoints)
  - PATCH: clarifications, typo fixes, no behavioral change

---

## Anti-Patterns to Watch For

1. **"We'll spec it later"** -- Reject. No code without spec.
2. **Spec exists but nobody read it** -- Require spec reference in every task and PR.
3. **Spec is outdated but code moved on** -- P0 bug. Stop and reconcile.
4. **Spec is too vague to implement** -- Send back for revision. Do not let devs interpret ambiguity.
5. **Multiple specs contradict each other** -- Escalate to architect. Resolve before any code.
6. **Dev changes behavior without spec update** -- Reject PR. Trigger the change protocol.

---

## Escalation Matrix

| Issue | Escalate To | Expected Resolution |
|-------|------------|-------------------|
| Spec ambiguity | Spec owner (product-owner, architect, etc.) | Spec revision within 1 business day |
| Spec contradiction between types | architect | Alignment meeting, updated specs |
| Stakeholder disagrees with spec | product-owner | Stakeholder meeting, spec revision |
| Security concern in spec | security-specialist | Security review, SPEC-SEC created/updated |
| Cost concern in spec | finops-engineer | Cost assessment, spec revision if needed |
| Spec change impacts timeline | tech-lead -> product-owner | Re-prioritization or scope cut |

---

## Metrics to Track

- **Spec coverage**: % of features with complete spec set before dev starts
- **Spec drift incidents**: Number of times code deviated from spec without approval
- **Change request turnaround**: Time from dev stop to spec approval and dev resume
- **Conformance pass rate**: % of PRs that pass QA conformance audit on first review
- **Sprint spec readiness**: % of sprint backlog items with Approved specs at sprint start
