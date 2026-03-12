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

---

## 11. Integracao EDD (Eval-Driven Development)

> **Adicionado em**: 2026-03-12
> **Referencia completa**: `docs/process/EVAL-DRIVEN-DEVELOPMENT.md` (quando criado)
> **Status**: Draft — processo em definicao

### 11.1 Contexto

Eval-Driven Development (EDD) complementa o SDD adicionando **metricas objetivas e repetiveis** de qualidade a cada feature. Enquanto o SDD define O QUE construir (specs) e garante conformidade (spec drift = P0), o EDD mede QUAO BEM foi construido atraves de eval datasets, graders automatizados e trust scores.

EDD nao substitui SDD — estende-o. Toda feature continua precisando de spec aprovada. EDD adiciona gates quantitativos ao fluxo existente.

### 11.2 Mudancas na Definition of Ready

A Definition of Ready para mover uma spec de **Approved** para **In Development** agora inclui:

| Criterio Existente (SDD) | Criterio Novo (EDD) |
|---------------------------|---------------------|
| Spec aprovada por todos os revisores | **Eval criteria definidos**: quais metricas serao medidas e quais sao os thresholds de aceitacao |
| Tech-lead aprovou | **Golden set baseline**: pelo menos 3 exemplos de input/output esperado para features com logica de negocio |
| Security review completa (para L/XL) | **Performance budget declarado**: latencia maxima aceitavel para server actions (p95) |

**Formato dos eval criteria no spec**:

```markdown
## Eval Criteria (EDD)

| Metrica | Threshold | Grader |
|---------|-----------|--------|
| Schema conformance | 100% | Programatico (Zod) |
| Response latency (p95) | < 200ms | Heuristico |
| AI output quality | >= 7/10 | LLM-as-judge |
| Test coverage | >= 80% | Programatico (Vitest) |
```

### 11.3 Mudancas na Definition of Done

A Definition of Done para mover uma spec de **In Development** para **Implemented** agora inclui:

| Criterio Existente (SDD) | Criterio Novo (EDD) |
|---------------------------|---------------------|
| Todos os ACs passam | **Eval suite passa**: todos os evals definidos no spec passam com os thresholds especificados |
| QA conformance audit completa | **Trust score >= 70**: pontuacao composta atinge minimo aceitavel |
| Testes unitarios >= 80% coverage | **Regression anchors**: bugs corrigidos durante implementacao sao adicionados ao eval dataset |
| Security checklist aprovada | **Eval report gerado**: relatorio de eval documentado para audit trail |

### 11.4 Trust Score Gate no Release

O trust score e uma metrica composta (0-100) que quantifica a confianca em uma feature estar pronta para producao.

**Composicao**:

| Componente | Peso | Fonte |
|------------|------|-------|
| Test Coverage | 25% | Vitest coverage report |
| Eval Pass Rate | 30% | Eval suite results |
| Spec Conformance | 20% | QA conformance audit |
| Security Audit | 15% | Security-specialist sign-off |
| Debt Ratio | 10% | Divida tecnica aberta na feature |

**Gates de release**:

| Trust Score | Decisao |
|-------------|---------|
| >= 90 | Release permitido (tech-lead pode aprovar diretamente) |
| 70-89 | Release permitido com aprovacao explicita do tech-lead |
| 50-69 | Release bloqueado — requer plano de remediacao |
| < 50 | Feature revertida ou pausada |

**Nota**: durante a fase de adocao (primeiros 3 sprints com EDD), trust scores sao **informativos** e nao bloqueantes. Apos validacao do processo, tornam-se gates mandatorios.

### 11.5 Fluxo SDD+EDD Integrado

O fluxo de feature agora inclui passos de EDD (marcados com `[EDD]`):

```
Step 1:  product-owner       --> SPEC-PROD-XXX (WHAT and WHY)
Step 2:  ux-designer         --> SPEC-UX-XXX (experience and flows)
Step 3:  architect           --> SPEC-ARCH-XXX (HOW to build it)
Step 3b: [EDD] architect     --> Define eval criteria no SPEC-ARCH    [NOVO]
Step 4:  data-engineer       --> SPEC-DATA-XXX (if analytics/data needed)
Step 5:  security-specialist --> Reviews all specs + SPEC-SEC-XXX
Step 6:  finops-engineer     --> Cost impact assessment
Step 6b: [EDD] qa-engineer   --> Cria golden set baseline             [NOVO]
Step 7:  tech-lead           --> Approves all specs + eval criteria
Step 8:  dev-fullstack-1/2   --> Implement against approved specs
Step 8b: [EDD] dev           --> Adiciona regression anchors ao dataset [NOVO]
Step 9:  qa-engineer         --> Validates against specs + runs evals
Step 9b: [EDD] qa-engineer   --> Calcula trust score                   [NOVO]
Step 10: release-manager     --> Documents changes, version bump
Step 10b:[EDD] release-mgr   --> Inclui trust score no release notes   [NOVO]
Step 11: Any deviation       --> STOP, update spec + eval criteria, RESUME
```

### 11.6 Responsabilidades EDD por Agente

| Agente | Responsabilidade EDD |
|--------|---------------------|
| **architect** | Define eval criteria em SPEC-ARCH; define performance budgets |
| **qa-engineer** | Mantem eval datasets (golden sets, regression anchors); executa eval suites; calcula trust scores |
| **dev-fullstack-1/2** | Adiciona regression anchors durante implementacao; garante que evals passam antes de submeter PR |
| **tech-lead** | Aprova eval criteria na Definition of Ready; valida trust scores antes de release |
| **security-specialist** | Contribui para trust score (security audit component) |
| **finops-engineer** | Monitora custo de evals (especialmente LLM-as-judge) |
| **prompt-engineer** | Define evals para features AI (schema conformance, output quality) |
| **release-manager** | Documenta trust scores no CHANGELOG e release notes |

### 11.7 Excecoes EDD

As mesmas excecoes da Secao 10 se aplicam ao EDD, com as seguintes adicoes:

- **Hotfixes**: eval criteria podem ser definidos retroativamente (mesmo sprint), mas trust score deve ser calculado antes do proximo release regular.
- **XS tasks**: nao requerem eval criteria proprios se cobertos por um eval dataset existente.
- **Fase de adocao**: nos primeiros 3 sprints com EDD, trust scores sao informativos. Nenhuma feature sera bloqueada por score baixo, mas o score sera documentado para calibracao.

### 11.8 Documentacao Relacionada

| Documento | Localizacao | Descricao |
|-----------|-------------|-----------|
| EDD Framework Completo | `docs/process/EVAL-DRIVEN-DEVELOPMENT.md` | Processo detalhado de EDD (a ser criado) |
| Auditoria de Estado Atual | `docs/process/CURRENT-STATE-AUDIT.md` | Gaps identificados e prioridades |
| Arquitetura AS-IS | `docs/architecture/AS-IS.md` | Estado atual da arquitetura |
| Arquitetura TO-BE | `docs/architecture/TO-BE.md` | Visao alvo com EDD integrado |
| Genesis Spec | `docs/specs/GENESIS-SPEC.md` | Especificacao fundacional do projeto |
