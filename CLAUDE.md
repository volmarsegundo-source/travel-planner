# 🌍 Travel Planner — Team Configuration

## Project Overview
[Describe your Travel Planner project here: what it is, who it's for, what problem it solves]

## Tech Stack
- **Frontend**: [React / Next.js — fill in]
- **Backend**: [Node.js / Python — fill in]
- **Database**: [PostgreSQL / Redis — fill in]
- **Infra**: [AWS / GCP / Docker — fill in]

## Essential Commands
```bash
npm run dev       # start local environment
npm run test      # run test suite
npm run build     # production build
npm run lint      # check code quality
```

## Project Structure
```
src/
  frontend/       # client-side code
  backend/        # server-side code
  shared/         # shared types and utilities
docs/
  architecture.md # ADRs and architecture decisions
  api.md          # API contracts
  tasks.md        # backlog and tasks with checkboxes
.claude/
  agents/         # agent definitions
  rules/          # domain-specific rules
  commands/       # custom slash commands
```

---

## 🤖 Agent Team

This project uses a team of 12 specialized subagents.
Each agent has a defined role, specific tools, and clear boundaries.

### Team Overview

```
You (human)
    │
    ▼
product-owner            ← defines WHAT and WHY (backlog, user stories, priorities)
    │
    ▼
ux-designer              ← defines HOW the traveler experiences it (flows, specs, prototypes)
    │
    ▼
architect                ← defines HOW to build it (specs, ADRs, API contracts)
    │
    ├──▶ data-engineer       ← designs data models, event tracking, analytics pipelines
    │
    ▼
tech-lead                ← orchestrates execution (planning, review, quality gate)
    ├──▶ security-specialist  ← guards security, privacy and compliance (always in the loop)
    ├──▶ release-manager      ← controls change impact, versioning, and change logs
    ├──▶ devops-engineer      ← owns CI/CD, infrastructure, observability
    ├──▶ qa-engineer          ← owns quality, test strategy, and release sign-off
    ├──▶ dev-fullstack-1      ← implements features (full-stack)
    ├──▶ dev-fullstack-2      ← implements features in parallel (full-stack)
    └──▶ finops-engineer      ← guards costs, optimizes AI spend, FinOps reporting
```

### Agent Configuration Summary

| Agent | Model | Tools | Memory | Primary Role |
|---|---|---|---|---|
| `product-owner` | sonnet-4-6 | Read, WebSearch, WebFetch, Write | project | Backlog, user stories, travel industry insights |
| `ux-designer` | opus-4-6 | Read, Write, WebSearch, WebFetch | project | User flows, UX specs, HTML/CSS prototypes |
| `architect` | opus-4-6 | Read, Write, Bash, WebSearch, WebFetch | project | Tech specs, ADRs, API contracts, problem solving |
| `data-engineer` | opus-4-6 | Read, Write, Bash, WebSearch, WebFetch | project | Event tracking, analytics models, privacy pipelines |
| `tech-lead` | opus-4-6 | Read, Write, Edit, Bash, WebSearch, WebFetch | project | Orchestration, task planning, code review, quality gate |
| `security-specialist` | opus-4-6 | Read, Write, Bash, WebSearch, WebFetch | project | Security audits, threat modeling, compliance |
| `release-manager` | opus-4-6 | Read, Write, Bash, WebSearch, WebFetch | project | Change impact, breaking changes, versioning, change logs |
| `devops-engineer` | opus-4-6 | Read, Write, Bash, WebSearch, WebFetch | project | CI/CD, infrastructure, observability, incidents |
| `qa-engineer` | opus-4-6 | Read, Write, Bash, WebSearch, WebFetch | project | Test strategy, E2E scenarios, quality gate, sign-off |
| `dev-fullstack-1` | opus-4-6 | Read, Write, Edit, Bash, WebSearch, WebFetch | project | Full-stack implementation |
| `dev-fullstack-2` | opus-4-6 | Read, Write, Edit, Bash, WebSearch, WebFetch | project | Full-stack implementation (parallel) |
| `finops-engineer` | opus-4-6 | Read, Write, Bash, WebSearch, WebFetch | project | Cost monitoring, AI spend optimization, FinOps reporting |

### When to invoke each agent

| Situation | Agent |
|---|---|
| Define a new feature, write user story, prioritize backlog | `product-owner` |
| Research travel industry trends or competitor features | `product-owner` |
| Design traveler experience, user flows, screen specs | `ux-designer` |
| Create HTML/CSS prototype for validation | `ux-designer` |
| Design system architecture, evaluate tech trade-offs | `architect` |
| Write technical specification for a feature | `architect` |
| Design event tracking or analytics schema for a feature | `data-engineer` |
| Build or review ETL/ELT pipelines and data models | `data-engineer` |
| GDPR erasure pipeline or data anonymization | `data-engineer` |
| Break a spec into dev tasks, assign work, review PRs | `tech-lead` |
| Resolve a technical blocker or coordinate the crew | `tech-lead` |
| Review spec or code for security vulnerabilities | `security-specialist` |
| Check GDPR / PCI-DSS / LGPD compliance | `security-specialist` |
| Audit a new dependency for CVEs or license risk | `security-specialist` |
| Assess impact of a change before implementation | `release-manager` |
| Generate change log or release notes after a merge | `release-manager` |
| CI/CD pipeline design or infrastructure provisioning | `devops-engineer` |
| Set up monitoring, alerts, or observability for a feature | `devops-engineer` |
| Production incident diagnosis and resolution | `devops-engineer` |
| Define test strategy or write E2E scenarios | `qa-engineer` |
| Validate a completed feature before release | `qa-engineer` |
| Triage a bug and decide ship/hold | `qa-engineer` |
| Implement any backend or frontend feature | `dev-fullstack-1` or `dev-fullstack-2` |
| Monitor infra/AI costs, emit spending alerts | `finops-engineer` |
| Audit cost impact of a new feature or ADR | `finops-engineer` |
| Generate FinOps sprint report or cost projections | `finops-engineer` |

### Recommended workflow for a new feature

```
1.  product-owner      → write user story + acceptance criteria → docs/tasks.md
2.  ux-designer        → define user flows + UX spec + HTML prototype → docs/ux-patterns.md
3.  architect          → write technical spec (SPEC-XXX) → docs/
4.  data-engineer      → define event tracking + analytics schema → docs/data-architecture.md
5.  release-manager    → assess change impact (CIA-XXX) → docs/release-risk.md
6.  security-specialist → review spec for threats + compliance → docs/security.md
7.  devops-engineer    → provision infra + CI/CD pipeline for feature → docs/infrastructure.md
8.  tech-lead          → break spec into tasks, assign to devs → docs/tasks.md
9.  dev-fullstack-1 + dev-fullstack-2 → implement in parallel
10. qa-engineer        → run test strategy + E2E scenarios
11. security-specialist → audit PRs for vulnerabilities before merge
12. release-manager    → review breaking changes + generate CHANGELOG entry
13. tech-lead          → final review + quality gate → approve merge
14. qa-engineer        → QA sign-off (QA-REL-XXX)
15. devops-engineer    → deploy to production (canary) + monitor
16. architect          → update ADRs if architectural decisions were made
17. product-owner      → validate acceptance criteria are met
```

### Running Agent Teams (parallel collaboration)
For features requiring real-time coordination between agents:
```bash
# Enable experimental Agent Teams
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1

# Example prompt
"Create an agent team to implement [feature].
 - tech-lead: coordinate and approve the plan
 - dev-fullstack-1: implement backend
 - dev-fullstack-2: implement frontend
 Require plan approval before any code changes."
```

---

## 📋 Mandatory Sprint Review Protocol

At the end of every sprint, the following agents must perform a review **strictly within their own role**. This review is **mandatory before any sprint is marked as done. No exceptions.**

Reviews are conducted in parallel and documented in `docs/sprint-reviews/SPRINT-XXX-review.md`.

### Review Responsibilities

| Agent | Must Review |
|---|---|
| `architect` | System design decisions made during the sprint, component boundaries, scalability implications, any deviations from ADRs, and architectural debt introduced |
| `security-specialist` | Authentication and authorization implementations, data validation, secrets management, any new dependencies for CVEs, and security vulnerabilities introduced |
| `devops-engineer` | Infrastructure configs, environment variables, Docker and CI/CD settings, deployment pipeline changes, and environment parity between local/staging/production |
| `tech-lead` | Code quality, design patterns, technical debt, test coverage, and adherence to project conventions and Definition of Done |
| `release-manager` | Changelog completeness, version bump correctness, migration notes, breaking changes, and environment consistency — **in Sprint 1, pay special attention to differences caused by machine migration (configs, dependencies, .env files)** |

### Sprint Review Checklist

Before marking a sprint as done, confirm:

- [ ] `architect` review completed and documented
- [ ] `security-specialist` review completed and documented
- [ ] `devops-engineer` review completed and documented
- [ ] `tech-lead` review completed and documented
- [ ] `release-manager` review completed and documented
- [ ] All blockers raised during review are resolved or have an accepted mitigation
- [ ] `docs/sprint-reviews/SPRINT-XXX-review.md` is committed to the repository

---

## 🌐 Global Project Rules

- **Code language**: English (variables, functions, comments, commits)
- **Communication language**: Portuguese (team discussions, PR descriptions, docs)
- **Commits**: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`)
- **Branching**: always branch from `main` — never commit directly
- **Tests**: every new feature must include unit tests (coverage ≥ 80%)
- **Secrets**: never hardcode credentials — use environment variables only
- **Copyright**: only MIT, Apache 2.0, BSD, or ISC licensed dependencies
- **Bias**: all outputs must be inclusive, fair, and free of discriminatory logic
- **Privacy**: PII must be encrypted — never logged or exposed in API responses

---

## Agente FinOps — finops-engineer

### Adicionado ao Agent Team
O projeto agora conta com **12 agentes especializados**:

```
product-owner, ux-designer, architect, data-engineer, tech-lead,
security-specialist, release-manager, devops-engineer, qa-engineer,
dev-fullstack-1, dev-fullstack-2, **finops-engineer** (NOVO)
```

---

## Definição do Agente FinOps

```yaml
# .claude/agents/finops-engineer.md
name: finops-engineer
role: Financial Operations & Cost Optimization Engineer
reports_to: tech-lead
collaborates_with: [all agents]
memory_file: .claude/agent-memory/finops-engineer/MEMORY.md
activation: per-sprint + on-demand
```

---

## Como o Tech-Lead Orquestra o FinOps Engineer

### Invocação Padrão por Sprint

**Início de sprint (briefing):**
```
Invoke finops-engineer: sprint [N] kickoff briefing.
Review sprint backlog and estimate cost impact of planned features.
Alert all agents about FinOps considerations for this sprint.
```

**Durante o sprint (revisão de feature):**
```
Invoke finops-engineer: audit cost of [feature name] before implementation.
Brief dev-fullstack-[1/2] on token optimization requirements.
```

**Final do sprint (relatório):**
```
Invoke finops-engineer: generate sprint [N] FinOps report.
Update docs/finops/COST-LOG.md with actuals.
Update docs/cost-management.docx.
Provide executive summary for sprint review.
```

**Alerta de custo:**
```
Invoke finops-engineer: check all cost thresholds and emit alerts.
```

---

## Protocolo de Revisão de Custos por Sprint

O tech-lead DEVE incluir o finops-engineer nas seguintes etapas de cada sprint:

### 1. Sprint Planning (início)
- finops-engineer analisa backlog e estima impacto de custo de cada story
- Emite briefing para os agentes de desenvolvimento
- Identifica stories que requerem atenção especial de custo

### 2. Mid-Sprint Check (meio)
- finops-engineer verifica se custos estão dentro do esperado
- Alerta sobre qualquer anomalia identificada
- Sugere ajustes se necessário

### 3. Sprint Review (final)
- finops-engineer gera relatório completo do sprint
- Apresenta otimizações implementadas e economia gerada
- Atualiza documentação de custos
- Propõe ações para o próximo sprint

### 4. Cross-Sprint Learning
- finops-engineer documenta lições aprendidas
- Atualiza modelos de previsão com dados reais
- Educa agentes sobre novos padrões identificados

---

## Regra de Ouro — Todos os Agentes

**Antes de implementar qualquer feature que envolva:**
- Chamadas à API Anthropic
- Queries ao banco de dados em loop
- Operações de alto volume
- Novos serviços de terceiros

**→ Consultar ou notificar o finops-engineer.**

Esta regra deve ser seguida por todos os agentes. O tech-lead é responsável por garantir que o finops-engineer seja incluído no fluxo de decisão.

---

## Localização dos Arquivos FinOps

```
.claude/
  agents/
    finops-engineer.md          # Definição completa do agente
  agent-memory/
    finops-engineer/
      MEMORY.md                 # Memória persistente do agente

docs/
  finops/
    COST-LOG.md                 # Histórico de custos reais por sprint
  cost-management.docx          # Documento executivo de gestão de custos
```
