# DevOps SDD Integration Guide

> Author: devops-engineer
> Date: 2026-03-11
> Applies from: Sprint 25 onward

This guide defines how DevOps processes integrate with Spec-Driven Development (SDD). Every infrastructure change, deployment, and observability configuration must trace back to an approved spec.

---

## CI/CD and Spec Compliance

### Commit Message Validation

All commits SHOULD reference spec IDs using conventional commit format:

- `feat(SPEC-PROD-XXX): description` -- product spec implementation
- `fix(SPEC-ARCH-XXX): description` -- architecture spec bugfix
- `test(SPEC-SEC-XXX): description` -- security spec test coverage
- `infra(SPEC-ARCH-XXX): description` -- infrastructure change
- `docs(SPEC-XXX): description` -- spec-related documentation

Commits that do not reference a spec ID (e.g., chores, refactors, CI fixes) are permitted but should be the exception, not the norm, for feature work.

### PR Checks

Every pull request should include:

1. **Spec references in description** -- list all specs implemented or affected
2. **Conformance statement** -- explicit declaration such as:
   - "Implements SPEC-PROD-042 v1.0.0"
   - "Partially implements SPEC-ARCH-018 v1.2.0 (sections 3-5)"
3. **Checklist items** -- confirm that:
   - [ ] All spec acceptance criteria are addressed
   - [ ] Performance budgets from spec are met or have documented exceptions
   - [ ] Rollback strategy is defined (for infra/deploy changes)
   - [ ] Monitoring plan is in place (for new services or endpoints)

CI pipeline checks should validate that PR descriptions contain at least one spec reference for feature branches.

---

## Infrastructure Specs

Any infrastructure change requires:

1. **SPEC-ARCH-XXX documenting the change** -- no manual or ad-hoc infra modifications
2. **Rollback strategy** -- explicit steps to revert if the change causes issues
3. **Monitoring plan** -- aligned with performance budgets defined in the originating spec
4. **Cost estimate** -- expected monthly cost impact of the change

### What Counts as an Infrastructure Change

- New cloud resources (databases, caches, queues, storage)
- CI/CD pipeline modifications (new stages, changed gates, tool swaps)
- Environment variable additions or modifications
- Docker/container configuration changes
- Network or security group changes
- Secrets additions or rotation policy changes

### SPEC-ARCH Infrastructure Section Template

Every SPEC-ARCH that involves infrastructure must include this section:

```markdown
## Infrastructure Requirements

### Resources
| Resource | Type | Config | Environment | Est. Cost/mo |
|---|---|---|---|---|
| [name] | [type] | [size] | [env] | $XX |

### Environment Variables
| Variable | Source | Sensitive | Spec Reference |
|---|---|---|---|
| [name] | [Secrets Manager / Vercel / .env] | [yes/no] | SPEC-XXX |

### Rollback Strategy
[How to revert this infrastructure change]

### Monitoring
[What metrics/alerts this change requires]
```

---

## Observability Alignment

Specs define performance expectations. DevOps translates those into observable, alertable metrics.

### Performance Budgets to Monitoring Alerts

Each spec may define performance budgets such as:
- API response time targets (e.g., P95 < 2s)
- Throughput requirements (e.g., 100 req/s sustained)
- Availability targets (e.g., 99.9% uptime)

DevOps maps these to:
- **Datadog/Grafana alerts** that fire when budgets are breached
- **SLO definitions** with error budget tracking
- **Dashboard panels** showing real-time performance against spec targets

### Error Budgets to SLO Definitions

When a spec defines an availability target:
1. Calculate the error budget (e.g., 99.9% = 43.8 min/month downtime allowed)
2. Configure SLO monitoring with burn rate alerts
3. P0 alert when error budget consumption exceeds 50% in a rolling window

### Metric Mapping Pattern

```
Spec Performance Constraint --> Metric Name --> Alert Threshold --> Severity
─────────────────────────────────────────────────────────────────────────────
"Search < 2s P95"          --> api.search.latency.p95 --> > 2000ms --> P1
"Booking 99.95% available" --> booking.availability    --> < 99.95% --> P0
"AI response < 10s"        --> ai.generate.latency.p95 --> > 10000ms --> P2
```

---

## Environment Configuration

### Spec-Required Environment Variables

- All environment variables required by a feature must be documented in the corresponding SPEC-ARCH
- No environment variable may be added to staging or production without a spec reference
- The spec must specify:
  - Variable name and purpose
  - Whether it is sensitive (requires Secrets Manager)
  - Default value for development (if applicable)
  - Validation rules (enforced via `src/lib/env.ts`)

### Environment Parity

- Development, staging, and production must use the same variable names
- Value differences between environments must be documented in the spec
- Docker Compose local setup must mirror production configuration structure

---

## Deployment Strategy per Feature

Each SPEC-ARCH should define the deployment approach for its feature. The following options are available:

### Rolling Deployment (default)
- Suitable for: most features, non-breaking changes
- Pods/instances replaced one at a time
- Automatic rollback on health check failure

### Canary Deployment
- Suitable for: high-risk changes, new user-facing features
- Traffic split: 5% --> 25% --> 100%
- Rollback trigger: error rate > 1% or latency P95 > 2x baseline
- Minimum observation period: 15 minutes per stage

### Blue-Green Deployment
- Suitable for: database migrations, breaking API changes
- Full parallel environment provisioned
- Instant cutover via DNS/load balancer
- Previous environment retained for 24h as rollback target

### Feature Flag Gated
- Suitable for: long-running features, A/B tests, gradual rollouts
- Feature flag created before deployment
- Deployment ships code to 100% of instances, flag controls activation
- Rollback = disable flag (instant, no redeploy)

### Spec Deployment Section Template

```markdown
## Deployment Strategy

**Approach**: [rolling | canary | blue-green | feature-flag]
**Feature flag**: [flag name, if applicable]
**Rollback trigger conditions**:
- [condition 1, e.g., error rate > 1%]
- [condition 2, e.g., latency P95 > Xms]
**Rollback procedure**: [automatic | manual, with steps]
**Estimated deployment duration**: [X minutes]
```

---

## Pipeline Integration Summary

```
PR Created
  |
  v
CI Pipeline (ci.yml)
  |-- Lint + Type Check (< 3 min)
  |-- Unit Tests + Coverage Gate (>= 80%)
  |-- SAST (Semgrep: secrets + OWASP)
  |-- Build Docker Image
  |-- Container Scan (Trivy: CRITICAL/HIGH block)
  |-- [NEW] Spec Reference Check (PR description)
  |
  v
Merge to master
  |
  v
Deploy Pipeline (deploy.yml)
  |-- Deploy Staging (automatic)
  |-- Integration Tests
  |-- E2E Smoke Tests (Playwright)
  |-- [Manual Approval Gate]
  |-- Deploy Production (per spec deployment strategy)
  |-- Production Smoke Tests
  |-- Notify (Slack + release notes)
```

---

## Checklist for DevOps Review Under SDD

When reviewing a PR or spec as devops-engineer, verify:

- [ ] Infrastructure changes have a SPEC-ARCH reference
- [ ] New environment variables are documented in the spec
- [ ] Performance budgets from the spec have corresponding monitoring
- [ ] Deployment strategy is defined and appropriate for the risk level
- [ ] Rollback procedure is documented and tested (or testable)
- [ ] No secrets are hardcoded -- all use Secrets Manager or GitHub Secrets
- [ ] Cost impact is estimated for new resources
- [ ] CI pipeline stages are sufficient for the change type
