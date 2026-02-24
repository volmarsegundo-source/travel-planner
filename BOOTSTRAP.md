# 🚀 Travel Planner — Project Bootstrap Prompt

## How to use this file
Copy the content of the section "BOOTSTRAP PROMPT" below and paste it
directly into Claude Code to initialize the project with the full agent team.

Run this ONCE at the beginning of the project, or when onboarding to a new codebase.

---

## BOOTSTRAP PROMPT
> Copy everything below this line and paste into Claude Code

---

You are initializing the **Travel Planner** project with a full team of specialized agents.
Before doing anything else, read the following files in this exact order:

1. `CLAUDE.md` — team configuration, global rules, and workflow
2. `docs/tasks.md` — current backlog state
3. `docs/architecture.md` — existing architecture decisions

Then execute the following bootstrap sequence:

---

## PHASE 1 — Project Foundation (run sequentially)

### Step 1.1 — Architect: Codebase Assessment
Use the `architect` agent to:
- Explore the current codebase structure
- Identify existing patterns, frameworks, and conventions
- Document findings in `docs/architecture.md` using the ADR format
- Define the initial tech stack decisions as ADR-001
- Identify any immediate architectural risks or gaps
- End with: what the team needs to know before writing any code

### Step 1.2 — DevOps Engineer: Infrastructure Assessment
Use the `devops-engineer` agent to:
- Assess the current CI/CD setup (or lack thereof)
- Define the minimum viable pipeline needed to start development safely
- Document in `docs/infrastructure.md`
- Identify what needs to exist before the first feature ships:
  - Environment variables management
  - Local dev setup
  - Basic CI pipeline (lint + test + build)

### Step 1.3 — Security Specialist: Initial Security Baseline
Use the `security-specialist` agent to:
- Review `docs/architecture.md` produced in Step 1.1
- Identify the top 5 security risks for a travel product at MVP stage
- Document in `docs/security.md` with a risk register
- Define the minimum security requirements the team must follow from day one

### Step 1.4 — Data Engineer: Analytics Foundation
Use the `data-engineer` agent to:
- Review the architecture and identify key data flows
- Define the minimum event tracking needed from day one:
  - Which user actions MUST be tracked (P0 events)
  - How user IDs will be handled (hashing strategy)
  - Data retention policy for MVP
- Document in `docs/data-architecture.md`

---

## PHASE 2 — First Feature (run after Phase 1 is complete)

### Step 2.1 — Product Owner: First Must-Have Feature
Use the `product-owner` agent to:
- Define the single most important Must Have feature for the Travel Planner MVP
- Write a complete user story with acceptance criteria
- Add to `docs/tasks.md` under "In Progress"
- Justify the prioritization using the scoring matrix

### Step 2.2 — UX Designer: Experience Specification
Use the `ux-designer` agent to:
- Read the user story from Step 2.1
- Define the complete user flow for the feature
- Write a full UX specification (UX-001)
- Produce a self-contained HTML/CSS prototype
- Save prototype to `docs/prototypes/feature-001.html`

### Step 2.3 — Architect: Technical Specification
Use the `architect` agent to:
- Read the user story (Step 2.1) and UX spec (Step 2.2)
- Write the complete technical specification (SPEC-001)
- Define the data model, API contract, and business logic
- Document any new architectural decisions as ADRs

### Step 2.4 — Data Engineer: Event Tracking Spec
Use the `data-engineer` agent to:
- Read SPEC-001
- Define all events to track for this feature (DATA-TRACK-001)
- Ensure GDPR compliance of all tracked data
- Add instrumentation requirements to the spec

### Step 2.5 — Release Manager: Change Impact Assessment
Use the `release-manager` agent to:
- Review SPEC-001
- Produce Change Impact Assessment (CIA-001)
- Confirm this is a greenfield feature (no breaking changes)
- Set initial version: 0.1.0

### Step 2.6 — Security Specialist: Spec Security Review
Use the `security-specialist` agent to:
- Review SPEC-001 and DATA-TRACK-001
- Produce security review (SEC-SPEC-001)
- Define security requirements for developers
- Confirm cleared / blocked status

### Step 2.7 — QA Engineer: Test Strategy
Use the `qa-engineer` agent to:
- Read SPEC-001, UX-001, and SEC-SPEC-001
- Define the test strategy (QA-SPEC-001)
- Write the critical E2E scenarios
- Define performance targets

### Step 2.8 — Tech Lead: Task Planning
Use the `tech-lead` agent to:
- Read all specs produced above
- Break SPEC-001 into granular developer tasks
- Assign to dev-fullstack-1 and dev-fullstack-2
- Identify what can run in parallel
- Update `docs/tasks.md` with full task breakdown

---

## PHASE 3 — Development (run after Phase 2 is complete)

### Step 3.1 — Development (parallel when possible)
Use `dev-fullstack-1` and `dev-fullstack-2` to implement their assigned tasks.

Each dev must:
- Read their assigned tasks from `docs/tasks.md`
- Read SPEC-001 completely before writing any code
- Follow the self-review checklist before marking any task done
- Update `docs/tasks.md` checkboxes as tasks complete

To run in parallel with Agent Teams:
```
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1

"Create an agent team for SPEC-001 implementation:
 - dev-fullstack-1: implement backend tasks from docs/tasks.md
 - dev-fullstack-2: implement frontend tasks from docs/tasks.md
 - tech-lead: coordinate, enforce spec compliance, approve before merge
 Require tech-lead plan approval before any code is written."
```

### Step 3.2 — Security Review (pre-merge)
Use the `security-specialist` agent to:
- Audit all code produced in Step 3.1
- Run OWASP Top 10 checklist
- Produce SEC-PR-001 with verdict

### Step 3.3 — QA Sign-off (pre-release)
Use the `qa-engineer` agent to:
- Run E2E scenarios from QA-SPEC-001
- Execute acceptance tests against all criteria
- Produce QA-REL-001 sign-off

### Step 3.4 — Release Manager: Change Log
Use the `release-manager` agent to:
- Generate CHANGELOG.md entry for v0.1.0
- Produce release notes for stakeholders
- Confirm version bump: 0.1.0

### Step 3.5 — DevOps: Deploy
Use the `devops-engineer` agent to:
- Verify CI/CD pipeline passes all gates
- Deploy to staging → run smoke tests → deploy to production
- Confirm observability is in place for the new feature

### Step 3.6 — Architect: ADR Update
Use the `architect` agent to:
- Review any architectural decisions made during implementation
- Update `docs/architecture.md` with new ADRs if needed

### Step 3.7 — Product Owner: Acceptance Validation
Use the `product-owner` agent to:
- Validate all acceptance criteria from the user story are met
- Mark feature as complete in `docs/tasks.md`
- Define the next priority item from the backlog

---

## EXPECTED OUTPUTS after full bootstrap

After running all phases, these files should exist and be populated:

```
CLAUDE.md                          ✅ already exists
CHANGELOG.md                       ✅ v0.1.0 entry
docs/
  tasks.md                         ✅ first feature complete, next in backlog
  architecture.md                  ✅ ADR-001 + any new ADRs
  api.md                           ✅ first API contract defined
  security.md                      ✅ risk register + SEC-SPEC-001 + SEC-PR-001
  data-architecture.md             ✅ DATA-TRACK-001 + analytics schema
  infrastructure.md                ✅ CI/CD pipeline + infra spec
  ux-patterns.md                   ✅ first UX patterns documented
  release-risk.md                  ✅ CIA-001 + version history
  test-strategy.md                 ✅ QA-SPEC-001 + E2E scenarios
  prototypes/
    feature-001.html               ✅ self-contained HTML/CSS prototype
.claude/
  agents/                          ✅ all 11 agents configured
  commands/                        ✅ slash commands ready
```

---

## QUICK REFERENCE — Invoking agents

```bash
# Single agent
"Use the product-owner agent to..."
"Have the architect review..."
"Ask the security-specialist to audit..."

# Agent Team (parallel)
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
"Create an agent team where dev-fullstack-1 and dev-fullstack-2
 work in parallel on [feature], coordinated by tech-lead."

# Slash commands
/project:planejar-feature [feature name]
/project:revisar-codigo [file path]
```

---

## IMPORTANT REMINDERS

- **Never skip the security review** — SEC clearance is required before any merge
- **Never skip QA sign-off** — QA-REL sign-off is required before any release
- **Data tracking is designed before code is written** — not instrumented after
- **All agent outputs go to docs/** — keep documentation current at all times
- **Commits follow Conventional Commits** — feat:, fix:, docs:, refactor:, test:, chore:
- **No direct commits to main** — always via PR, always reviewed by tech-lead
