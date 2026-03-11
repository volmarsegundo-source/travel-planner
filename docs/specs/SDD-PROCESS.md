# Spec-Driven Development (SDD) -- Atlas Travel Planner

**Effective**: Sprint 25 (v0.18.0+)
**Last Updated**: 2026-03-11
**Owner**: tech-lead (process), product-owner (product specs)

---

## 1. Overview

Spec-Driven Development (SDD) is the mandatory development process for Atlas Travel Planner starting Sprint 25. Every feature, change, or fix of non-trivial scope must have an approved specification BEFORE any code is written.

**Why SDD?** After 24 sprints of organic growth (1593 tests, 13 agents, v0.17.0), the project has reached the complexity threshold where informal coordination leads to spec drift, rework, and misaligned implementations. SDD introduces rigor without sacrificing velocity by making specifications the single source of truth for all product decisions.

**What SDD replaces**: Previously, user stories in `docs/tasks.md` and sprint seed documents served as informal specs. Under SDD, these remain for backlog tracking, but formal specs in `docs/specs/` become the authoritative contract between agents.

---

## 2. Core Principles

### Principle 1: Specs Are the SINGLE SOURCE OF TRUTH

- Specs are the main control plan for all product development.
- If a conflict exists between a spec and the code, the SPEC wins. Code must be corrected to match the spec, or the spec must be formally updated first.
- Every product decision must be traceable to a spec.
- All agents reference spec IDs (e.g., `SPEC-PROD-012`) in commits, PRs, and task descriptions.
- No feature ships without an approved spec.

### Principle 2: Specs Are LIVING DOCUMENTS

- Specs evolve with the product. They are not write-once artifacts.
- Each spec uses semantic versioning in its header:
  - **Major** (2.0.0): Breaking change to acceptance criteria or scope.
  - **Minor** (1.1.0): Additive change (new AC, expanded scope).
  - **Patch** (1.0.1): Clarification, typo fix, formatting (no behavioral change).
- Every spec maintains a Change History table at the bottom.
- When requirements change: update the spec FIRST, then update the code.
- A stale spec (code has diverged without spec update) is treated as tech debt with the same urgency as a bug.

### Principle 3: Codify ARCHITECTURAL and SECURITY Constraints

- Architecture Decision Records (ADRs) are embedded in or referenced from specs.
- Security requirements are MANDATORY in every spec, not optional.
- Every spec must include a Constraints section covering:
  - **Architectural boundaries**: what the feature cannot do, dependencies it cannot introduce.
  - **Security**: authentication, authorization, PII handling, BOLA prevention.
  - **Performance budgets**: response time, token limits, bundle size impact.
  - **Accessibility**: WCAG compliance level, screen reader support, keyboard navigation.
- Constraints are non-negotiable. They cannot be deferred or descoped without explicit stakeholder approval.

### Principle 4: Prevent SPEC DRIFT

- QA validates completed code AGAINST the approved spec, not against developer interpretation.
- If a deviation is discovered during implementation:
  1. STOP implementation.
  2. Update the spec with the proposed change.
  3. Get approval from spec owner + tech-lead.
  4. RESUME implementation against the updated spec.
- Post-sprint: QA performs a spec conformance audit for all delivered features.
- Spec drift (code that does not match its approved spec) is classified as a P0 bug.

### Principle 5: Avoid VENDOR LOCK-IN

- Specs are technology-agnostic where possible.
- Product specs (SPEC-PROD) and UX specs (SPEC-UX) NEVER reference specific libraries, frameworks, or vendor products.
- Architecture specs (SPEC-ARCH) document abstraction layers and exit strategies for any vendor-specific choices.
- Prefer open standards: OpenAPI for APIs, JSON Schema for validation contracts, Markdown for documentation, SQL for data definitions.

---

## 3. Spec Types

| Type | ID Pattern | Owner | Defines | Technology-Agnostic? |
|------|-----------|-------|---------|---------------------|
| Product Spec | SPEC-PROD-XXX | product-owner | WHAT and WHY (problem, user story, acceptance criteria, constraints) | Yes (mandatory) |
| UX Spec | SPEC-UX-XXX | ux-designer | User experience, flows, interaction patterns, visual specs | Yes (mandatory) |
| Architecture Spec | SPEC-ARCH-XXX | architect | HOW to build it (system design, API contracts, data flow, tech choices) | No (tech choices allowed, but must include exit strategies) |
| Security Spec | SPEC-SEC-XXX | security-specialist | Security requirements, threat model, compliance controls | Yes (mandatory) |
| Data Spec | SPEC-DATA-XXX | data-engineer | Data models, event tracking schemas, analytics pipelines | Partially (SQL and JSON Schema preferred) |

### Numbering Convention

- IDs are sequential within each type: SPEC-PROD-001, SPEC-PROD-002, etc.
- IDs are never reused, even if a spec is deprecated.
- Cross-references use the full ID: "See SPEC-ARCH-003 for implementation details."

---

## 4. Spec Lifecycle

```
Draft --> In Review --> Approved --> In Development --> Implemented --> (Deprecated)
```

| Status | Meaning | Who Can Transition |
|--------|---------|-------------------|
| **Draft** | Spec is being written. Not yet ready for review. | Spec owner |
| **In Review** | Spec is circulated to reviewers. Comments and changes expected. | Spec owner |
| **Approved** | All reviewers have signed off. Spec is frozen for implementation. | tech-lead (final approval) |
| **In Development** | Devs are actively implementing against this spec. | tech-lead (assigns to sprint) |
| **Implemented** | Code matches spec. QA has validated conformance. | qa-engineer (conformance audit) |
| **Deprecated** | Spec is no longer active. Superseded or feature removed. | product-owner + tech-lead |

### Transition Rules

- Draft to In Review: spec owner believes it is complete.
- In Review to Approved: all listed reviewers have approved. No unresolved blocking comments.
- Approved to In Development: tech-lead assigns to a sprint backlog.
- In Development to Implemented: QA confirms code matches all acceptance criteria in the spec.
- Any status to Deprecated: requires product-owner justification and tech-lead acknowledgment.

---

## 5. Workflow for New Features

This is the mandatory sequence. Steps cannot be skipped.

```
Step 1: product-owner    --> SPEC-PROD-XXX (WHAT and WHY)
Step 2: ux-designer      --> SPEC-UX-XXX (experience and flows)
Step 3: architect        --> SPEC-ARCH-XXX (HOW to build it)
Step 4: data-engineer    --> SPEC-DATA-XXX (if analytics/data needed)
Step 5: security-specialist --> Reviews all specs + creates SPEC-SEC-XXX if needed
Step 6: finops-engineer  --> Cost impact assessment
Step 7: tech-lead        --> Approves all specs, creates sprint tasks
Step 8: dev-fullstack-1/2 --> Implement against approved specs
Step 9: qa-engineer      --> Validates against specs (conformance audit)
Step 10: release-manager --> Documents changes, version bump
Step 11: Any deviation   --> STOP, update spec, get approval, RESUME
```

### Minimum Spec Requirements by Feature Size

| Size | Required Specs |
|------|---------------|
| XS (< 2h) | Bug fix or config change. No spec needed if covered by existing spec. |
| S (2-4h) | SPEC-PROD at minimum. |
| M (4-12h) | SPEC-PROD + SPEC-ARCH. |
| L (12-24h) | SPEC-PROD + SPEC-UX + SPEC-ARCH. Security review mandatory. |
| XL (24h+) | All spec types. Dedicated security spec (SPEC-SEC). |

---

## 6. Spec Change Protocol

Once a spec is Approved, changes follow this protocol:

1. **Identify need for change.** Developer, QA, or any agent discovers that the approved spec needs modification.
2. **STOP implementation** of the affected area. Do not code against outdated specs.
3. **Spec owner creates a change proposal** with:
   - What changed and why.
   - Impact on acceptance criteria.
   - Impact on other specs (cross-references).
   - Version bump (major/minor/patch per semver rules).
4. **Review and approval.** tech-lead + original reviewers must approve. For major version bumps, stakeholder approval is also required.
5. **Update the spec.** Merge the change, update the Change History table.
6. **Resume implementation** against the updated spec.
7. **QA re-validates** any already-tested areas affected by the change.

### Emergency Changes

For production incidents or security vulnerabilities:
- Fix first, spec second (but spec update must happen within the same sprint).
- Tag the commit with `[SPEC-PENDING]` and create a spec update task as P0.

---

## 7. Spec Storage

```
docs/
  specs/
    SDD-PROCESS.md              <-- This document (master process reference)
    templates/
      TEMPLATE-PRODUCT-SPEC.md  <-- Product spec template
      TEMPLATE-UX-SPEC.md       <-- UX spec template (ux-designer owns)
      TEMPLATE-ARCH-SPEC.md     <-- Architecture spec template (architect owns)
      TEMPLATE-SEC-SPEC.md      <-- Security spec template (security-specialist owns)
      TEMPLATE-DATA-SPEC.md     <-- Data spec template (data-engineer owns)
    product/
      SPEC-PROD-001.md          <-- Individual product specs
      SPEC-PROD-002.md
    ux/
      SPEC-UX-001.md
    architecture/
      SPEC-ARCH-001.md
    security/
      SPEC-SEC-001.md
    data/
      SPEC-DATA-001.md
```

- All specs are Markdown files, versioned in git alongside the code.
- Specs live in `docs/specs/` -- never in `src/`.
- Templates are maintained by the owning agent and approved by tech-lead.
- Spec filenames use the full ID: `SPEC-PROD-001.md`, not abbreviated.

---

## 8. Agent Responsibilities in SDD

| Agent | SDD Role | Owns | Reviews |
|-------|----------|------|---------|
| **product-owner** | Defines WHAT and WHY. Creates product specs. Approves/rejects changes that affect product requirements. | SPEC-PROD-XXX | All specs (product alignment) |
| **ux-designer** | Defines user experience. Creates UX specs. Ensures flows match product intent. | SPEC-UX-XXX | SPEC-PROD (feasibility) |
| **architect** | Defines HOW. Creates architecture specs. Ensures tech choices support product goals. | SPEC-ARCH-XXX | SPEC-PROD, SPEC-UX (buildability) |
| **data-engineer** | Defines data models and analytics. Creates data specs. | SPEC-DATA-XXX | SPEC-ARCH (data layer) |
| **security-specialist** | Reviews ALL specs for security. Creates security specs when needed. | SPEC-SEC-XXX | ALL specs (security) |
| **tech-lead** | Approves all specs before implementation. Orchestrates the SDD workflow. Resolves conflicts between specs. | Final approval authority | ALL specs |
| **dev-fullstack-1/2** | Implement against approved specs. Flag deviations immediately. | None | SPEC-ARCH (implementation feedback) |
| **qa-engineer** | Validates code against specs. Performs conformance audits. Reports spec drift. | Conformance reports | ALL specs (testability) |
| **release-manager** | Tracks spec versions in changelogs. Ensures release notes reference spec IDs. | CHANGELOG entries | SPEC-PROD (breaking changes) |
| **finops-engineer** | Assesses cost impact of specs. Flags features that exceed budget thresholds. | Cost assessments | SPEC-ARCH, SPEC-PROD (cost) |
| **prompt-engineer** | Reviews AI-related specs for prompt design and token optimization. | Prompt design sections | SPEC-PROD, SPEC-ARCH (AI features) |
| **devops-engineer** | Reviews infrastructure implications. Ensures specs account for deployment constraints. | Infra assessments | SPEC-ARCH (infra) |

### Commit and PR Convention

All commits and PRs that relate to a spec must include the spec ID:

```
feat(transport): implement segment validation [SPEC-PROD-005]
fix(auth): correct BOLA check per spec update [SPEC-SEC-002 v1.1.0]
```

---

## 9. Adoption Plan

| Sprint | Milestone |
|--------|-----------|
| Sprint 25 | SDD process effective. All NEW features require specs. Existing features grandfathered. |
| Sprint 26 | Retroactive specs for critical existing features (auth, AI provider, gamification). |
| Sprint 27+ | Full SDD coverage. No feature without a spec. |

### What Changes for Each Agent

- **product-owner**: Now creates formal SPEC-PROD documents instead of inline user stories only. User stories in `docs/tasks.md` remain for backlog tracking but link to their spec.
- **architect**: Now creates formal SPEC-ARCH documents instead of inline technical notes. ADRs continue but are referenced from specs.
- **dev teams**: Must read and reference the approved spec before starting implementation. Deviations require the stop-update-approve-resume protocol.
- **qa-engineer**: Test plans are derived from spec acceptance criteria. Conformance audits are a new mandatory activity.
- **All agents**: Must include spec IDs in commits, PRs, and documentation.

---

## 10. Exceptions

- **Hotfixes**: Production-critical fixes can bypass the full SDD workflow but must have a spec created retroactively within the same sprint (tagged `[SPEC-PENDING]`).
- **XS tasks**: Bug fixes under 2 hours that fall within an existing spec's scope do not need a new spec. Reference the existing spec ID.
- **Documentation-only changes**: Updates to README, CHANGELOG, or process docs do not require specs.
- **Dependency updates**: Routine dependency bumps do not require specs unless they change behavior covered by an existing spec.
