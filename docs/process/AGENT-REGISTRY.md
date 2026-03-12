# Registro de Agentes — Atlas Travel Planner

**Documento**: PROC-AGEN-001
**Autor**: devops-engineer
**Data**: 2026-03-12
**Versao**: 1.0.0
**Status**: Draft — EDD+SDD Integration

---

## 1. Visao Geral

Este documento registra todos os 13 agentes especializados do Atlas Travel Planner, suas responsabilidades, bounded contexts, padroes de acesso e protocolos de interacao. Serve como fonte de verdade para descoberta de agentes, delegacao de tarefas e enforcement de least privilege.

---

## 2. Registro Completo de Agentes

### agent:product-owner

| Campo | Valor |
|-------|-------|
| **ID** | `agent:product-owner` |
| **Role** | Define o QUE e o PORQUE — backlog, user stories, prioridades |
| **Model** | `sonnet-4-6` |
| **Tools** | Read, WebSearch, WebFetch, Write |
| **Bounded Context** | `docs/tasks.md`, `docs/specs/SPEC-PROD-*`, user stories, backlog |
| **Eval Responsibilities** | Validacao de acceptance criteria pos-implementacao |
| **IAM (Least Privilege)** | READ: todo o repo. WRITE: `docs/tasks.md`, `docs/specs/SPEC-PROD-*`, `docs/sprint-reviews/`. SEM acesso a: `src/`, `.github/`, `prisma/` |
| **Memory File** | `.claude/agent-memory/product-owner/MEMORY.md` |
| **Definition File** | `.claude/agents/product-owner.md` |

---

### agent:ux-designer

| Campo | Valor |
|-------|-------|
| **ID** | `agent:ux-designer` |
| **Role** | Define COMO o viajante experimenta — flows, specs UX, prototipos |
| **Model** | `opus-4-6` |
| **Tools** | Read, Write, WebSearch, WebFetch |
| **Bounded Context** | `docs/ux-patterns.md`, `docs/specs/SPEC-UX-*`, prototipos HTML/CSS |
| **Eval Responsibilities** | Validacao de conformidade visual, acessibilidade WCAG 2.1 AA |
| **IAM (Least Privilege)** | READ: todo o repo. WRITE: `docs/ux-patterns.md`, `docs/specs/SPEC-UX-*`, `docs/sprint-reviews/`. SEM acesso de escrita a: `src/server/`, `prisma/`, `.github/` |
| **Memory File** | `.claude/agent-memory/ux-designer/MEMORY.md` |
| **Definition File** | `.claude/agents/ux-designer.md` |

---

### agent:architect

| Campo | Valor |
|-------|-------|
| **ID** | `agent:architect` |
| **Role** | Define COMO construir — specs tecnicas, ADRs, contratos de API |
| **Model** | `opus-4-6` |
| **Tools** | Read, Write, Bash, WebSearch, WebFetch |
| **Bounded Context** | `docs/architecture.md`, `docs/api.md`, `docs/specs/SPEC-ARCH-*`, ADRs |
| **Eval Responsibilities** | Validacao de design patterns, boundaries de componentes, escalabilidade |
| **IAM (Least Privilege)** | READ: todo o repo. WRITE: `docs/architecture.md`, `docs/api.md`, `docs/specs/SPEC-ARCH-*`, `docs/sprint-reviews/`. BASH: somente leitura (git log, git diff, npm list). SEM escrita em: `src/`, `.github/workflows/` |
| **Memory File** | `.claude/agent-memory/architect/MEMORY.md` |
| **Definition File** | `.claude/agents/architect.md` |

---

### agent:data-engineer

| Campo | Valor |
|-------|-------|
| **ID** | `agent:data-engineer` |
| **Role** | Modelos de dados, event tracking, pipelines de analytics, privacidade |
| **Model** | `opus-4-6` |
| **Tools** | Read, Write, Bash, WebSearch, WebFetch |
| **Bounded Context** | `docs/data-architecture.md`, `prisma/schema.prisma`, event schemas, analytics |
| **Eval Responsibilities** | Validacao de modelos de dados, compliance de PII, retention policies |
| **IAM (Least Privilege)** | READ: todo o repo. WRITE: `docs/data-architecture.md`, `prisma/schema.prisma`, `docs/specs/`. BASH: somente leitura. SEM escrita em: `src/components/`, `.github/` |
| **Memory File** | `.claude/agent-memory/data-engineer/MEMORY.md` |
| **Definition File** | `.claude/agents/data-engineer.md` |

---

### agent:tech-lead

| Campo | Valor |
|-------|-------|
| **ID** | `agent:tech-lead` |
| **Role** | Orquestra execucao — planning, code review, quality gate |
| **Model** | `opus-4-6` |
| **Tools** | Read, Write, Edit, Bash, WebSearch, WebFetch |
| **Bounded Context** | Todo o repositorio (orquestrador). Foco: `docs/tasks.md`, code review, coordenacao |
| **Eval Responsibilities** | Quality gate final, aprovacao de merge, trust score validation |
| **IAM (Least Privilege)** | READ: todo o repo. WRITE: `docs/tasks.md`, `docs/sprint-reviews/`, code review comments. EDIT: qualquer arquivo (com justificativa). BASH: git commands, npm commands. APROVACAO: production deploy |
| **Memory File** | `.claude/agent-memory/tech-lead/MEMORY.md` |
| **Definition File** | `.claude/agents/tech-lead.md` |

---

### agent:security-specialist

| Campo | Valor |
|-------|-------|
| **ID** | `agent:security-specialist` |
| **Role** | Auditorias de seguranca, threat modeling, compliance GDPR/LGPD/PCI-DSS |
| **Model** | `opus-4-6` |
| **Tools** | Read, Write, Bash, WebSearch, WebFetch |
| **Bounded Context** | `docs/security.md`, `docs/specs/SPEC-SEC-*`, auditorias de dependencias, CSP |
| **Eval Responsibilities** | Eval gate 4c (Security), revisao de PRs com impacto de seguranca, guardrails |
| **IAM (Least Privilege)** | READ: todo o repo (incluindo secrets config, mas nao valores). WRITE: `docs/security.md`, `docs/specs/SPEC-SEC-*`, `docs/sprint-reviews/`. BASH: `npm audit`, `npx semgrep`, git commands. SEM escrita em: `src/` (apenas review) |
| **Memory File** | `.claude/agent-memory/security-specialist/MEMORY.md` |
| **Definition File** | `.claude/agents/security-specialist.md` |

---

### agent:release-manager

| Campo | Valor |
|-------|-------|
| **ID** | `agent:release-manager` |
| **Role** | Controle de impacto de mudancas, versionamento, changelogs |
| **Model** | `opus-4-6` |
| **Tools** | Read, Write, Bash, WebSearch, WebFetch |
| **Bounded Context** | `CHANGELOG.md`, `package.json` (version), `docs/release-risk.md`, migration notes |
| **Eval Responsibilities** | Breaking changes detection, version bump correctness, migration notes |
| **IAM (Least Privilege)** | READ: todo o repo. WRITE: `CHANGELOG.md`, `docs/release-risk.md`, `docs/sprint-reviews/`. BASH: git log, git diff, npm version. SEM escrita em: `src/`, `prisma/`, `.github/` |
| **Memory File** | `.claude/agent-memory/release-manager/MEMORY.md` |
| **Definition File** | `.claude/agents/release-manager.md` |

---

### agent:devops-engineer

| Campo | Valor |
|-------|-------|
| **ID** | `agent:devops-engineer` |
| **Role** | CI/CD, infraestrutura, observabilidade, incidentes |
| **Model** | `opus-4-6` |
| **Tools** | Read, Write, Bash, WebSearch, WebFetch |
| **Bounded Context** | `docs/infrastructure.md`, `docs/process/`, `docs/runbooks/`, `.github/workflows/`, `docker-compose.yml`, `Dockerfile` |
| **Eval Responsibilities** | Pipeline health, deployment safety, infra config validation, observability |
| **IAM (Least Privilege)** | READ: todo o repo. WRITE: `docs/infrastructure.md`, `docs/process/`, `docs/runbooks/`, `.github/workflows/`, `docker-compose.yml`, `Dockerfile`. BASH: docker, git, npm, kubectl commands. SEM escrita em: `src/` (exceto `src/lib/logger.ts` e health check) |
| **Memory File** | `.claude/agent-memory/devops-engineer/MEMORY.md` |
| **Definition File** | `.claude/agents/devops-engineer.md` |

---

### agent:qa-engineer

| Campo | Valor |
|-------|-------|
| **ID** | `agent:qa-engineer` |
| **Role** | Estrategia de testes, cenarios E2E, quality gate, sign-off de release |
| **Model** | `opus-4-6` |
| **Tools** | Read, Write, Bash, WebSearch, WebFetch |
| **Bounded Context** | `tests/`, `playwright.config.ts`, `vitest.config.ts`, `docs/test-results/`, test plans |
| **Eval Responsibilities** | Test coverage, test count regression, E2E scenario coverage, QA sign-off |
| **IAM (Least Privilege)** | READ: todo o repo. WRITE: `tests/`, `docs/test-results/`, `docs/sprint-reviews/`. BASH: npm test, npx playwright, git diff. SEM escrita em: `src/` (exceto fixtures de teste) |
| **Memory File** | `.claude/agent-memory/qa-engineer/MEMORY.md` |
| **Definition File** | `.claude/agents/qa-engineer.md` |

---

### agent:dev-fullstack-1

| Campo | Valor |
|-------|-------|
| **ID** | `agent:dev-fullstack-1` |
| **Role** | Implementacao full-stack de features |
| **Model** | `opus-4-6` |
| **Tools** | Read, Write, Edit, Bash, WebSearch, WebFetch |
| **Bounded Context** | `src/`, `tests/`, `prisma/`, `messages/` — implementacao conforme specs |
| **Eval Responsibilities** | Nenhuma (executor, nao avaliador). Sujeito a avaliacao dos demais agentes |
| **IAM (Least Privilege)** | READ: todo o repo. WRITE/EDIT: `src/`, `tests/`, `prisma/`, `messages/`, `public/`. BASH: npm, npx prisma, git commands. SEM escrita em: `docs/` (exceto `docs/specs/` para status updates), `.github/workflows/`, `Dockerfile` |
| **Memory File** | `.claude/agent-memory/dev-fullstack-1/MEMORY.md` |
| **Definition File** | `.claude/agents/dev-fullstack-1.md` |

---

### agent:dev-fullstack-2

| Campo | Valor |
|-------|-------|
| **ID** | `agent:dev-fullstack-2` |
| **Role** | Implementacao full-stack de features (paralelo com dev-fullstack-1) |
| **Model** | `opus-4-6` |
| **Tools** | Read, Write, Edit, Bash, WebSearch, WebFetch |
| **Bounded Context** | `src/`, `tests/`, `prisma/`, `messages/` — implementacao conforme specs |
| **Eval Responsibilities** | Nenhuma (executor, nao avaliador). Sujeito a avaliacao dos demais agentes |
| **IAM (Least Privilege)** | Identico a `agent:dev-fullstack-1` |
| **Memory File** | `.claude/agent-memory/dev-fullstack-2/MEMORY.md` |
| **Definition File** | `.claude/agents/dev-fullstack-2.md` |

---

### agent:finops-engineer

| Campo | Valor |
|-------|-------|
| **ID** | `agent:finops-engineer` |
| **Role** | Monitoramento de custos, otimizacao de gastos com IA, relatorios FinOps |
| **Model** | `opus-4-6` |
| **Tools** | Read, Write, Bash, WebSearch, WebFetch |
| **Bounded Context** | `docs/finops/`, `docs/cost-management.docx`, budgets de tokens, free tier monitoring |
| **Eval Responsibilities** | Budget de tokens por eval run, cost impact assessment de features |
| **IAM (Least Privilege)** | READ: todo o repo. WRITE: `docs/finops/`, `docs/cost-management.docx`, `docs/sprint-reviews/`. BASH: somente leitura (npm list, git log). SEM escrita em: `src/`, `.github/`, `prisma/` |
| **Memory File** | `.claude/agent-memory/finops-engineer/MEMORY.md` |
| **Definition File** | `.claude/agents/finops-engineer.md` |

---

### agent:prompt-engineer

| Campo | Valor |
|-------|-------|
| **ID** | `agent:prompt-engineer` |
| **Role** | Design de prompts, otimizacao de tokens, guardrails de IA |
| **Model** | `sonnet-4-6` |
| **Tools** | Read, Write, WebSearch, WebFetch |
| **Bounded Context** | `src/lib/prompts/`, `docs/specs/SPEC-AI-*`, guardrails, templates de prompt |
| **Eval Responsibilities** | Prompt regression testing, token usage optimization, guardrail validation |
| **IAM (Least Privilege)** | READ: todo o repo. WRITE: `src/lib/prompts/`, `docs/specs/SPEC-AI-*`, `docs/sprint-reviews/`. SEM acesso a: `prisma/`, `.github/`, `Dockerfile`, dados de usuario |
| **Memory File** | `.claude/agent-memory/prompt-engineer/MEMORY.md` |
| **Definition File** | `.claude/agents/prompt-engineer.md` |

---

## 3. Protocolo de Descoberta de Agentes

### Como agentes encontram uns aos outros

Os agentes se descobrem atraves da configuracao em `CLAUDE.md` na raiz do projeto. Este arquivo e a fonte de verdade para:

1. **Lista de agentes disponíveis** — tabela com ID, model, tools
2. **Quando invocar cada agente** — tabela de situacao → agente
3. **Workflow recomendado** — sequencia de invocacao para features novas

```
Protocolo de descoberta:

1. Agente recebe tarefa do usuario ou do tech-lead
2. Le CLAUDE.md para identificar quais agentes sao relevantes
3. Le docs/process/AGENT-REGISTRY.md (este documento) para:
   - Verificar bounded context do agente alvo
   - Confirmar IAM/permissoes
   - Localizar memory file para contexto historico
4. Invoca agente via prompt do usuario ou Agent Teams
```

### Nao existe service discovery automatico

Os agentes nao possuem um registry centralizado em runtime. A descoberta e baseada em documentacao estatica. Isso e intencional:

- **Simplicidade**: sem infraestrutura adicional para manter
- **Auditabilidade**: todas as interacoes sao rastreiaveis via git history
- **Seguranca**: nenhum agente pode invocar outro sem a intermediacao do usuario ou tech-lead

---

## 4. Ciclo de Vida de Tokens

### Sessao por conversa

Cada agente opera dentro de uma sessao de conversa unica. Nao existem tokens persistentes entre conversas.

```
Inicio da conversa
    |
    v
[Agente carrega contexto]
    - CLAUDE.md (instrucoes globais)
    - MEMORY.md do agente (memoria persistente)
    - Arquivos relevantes do repo (via Read)
    |
    v
[Agente executa tarefas]
    - Usa tools conforme IAM
    - Emite logs estruturados
    - Respeita bounded context
    |
    v
[Agente salva memoria]
    - Atualiza MEMORY.md se aprendeu algo relevante
    - Nao persiste tokens de sessao
    |
    v
Fim da conversa
    - Sessao destruida
    - Nenhum token persiste
    - Contexto reconstruido na proxima conversa
```

### Implicacoes de seguranca

- **Nenhum token de agente e armazenado** — zero risco de token leakage entre sessoes
- **Contexto e reconstruido a cada conversa** — garante que o agente sempre opera com informacao atualizada
- **Memoria persistente e seletiva** — apenas informacoes relevantes para conversas futuras sao salvas em MEMORY.md

---

## 5. Matriz de Interacao entre Agentes

A tabela abaixo define quais agentes interagem e em quais situacoes. A seta indica direcao da invocacao (quem chama quem).

```
                    PO   UX   ARCH  DATA  TL   SEC   RM   DEV  QA   FIN  PROMPT
product-owner  PO  --   ->   ->    .     ->   .     .    .    .    .    .
ux-designer    UX  <-   --   ->    .     ->   .     .    .    .    .    .
architect     ARCH  <-   <-   --   ->    ->   ->    .    .    .    .    .
data-engineer DATA  .    .    <-   --    ->   ->    .    .    .    .    .
tech-lead      TL  <-   <-   <-   <-    --   ->    ->   ->   ->   ->   ->
security      SEC   .    .    <-   <-    <-   --    .    .    .    .    <->
release-mgr    RM   .    .    .    .     <-   .     --   .    .    .    .
devops        DEV   .    .    .    .     <-   .     .    --   .    .    .
qa-engineer    QA   .    .    .    .     <-   .     .    .    --   .    .
finops        FIN   .    .    .    .     <-   .     .    .    .    --   <->
prompt-eng   PRMT   .    .    .    .     <-   <->   .    .    .   <->   --

Legenda:
  ->  : invoca (este agente chama o outro)
  <-  : e invocado por (o outro chama este agente)
  <-> : interacao bidirecional
  .   : sem interacao direta (passa pelo tech-lead)
  --  : self
```

### Regras de interacao

1. **tech-lead e o hub central** — todos os agentes reportam ao tech-lead. Nenhum agente de implementacao (dev-fullstack-1/2) se comunica diretamente com agentes de spec (PO, UX, architect) sem intermediacao do tech-lead.

2. **security-specialist tem veto** — pode bloquear qualquer acao de qualquer agente se identificar risco de seguranca. Co-possui guardrails com prompt-engineer.

3. **finops-engineer deve ser consultado** antes de qualquer feature que envolva chamadas de IA, queries em loop, ou novos servicos de terceiros (regra de ouro do CLAUDE.md).

4. **prompt-engineer e finops-engineer interagem bidirecionalmente** — compartilham dados de token usage e otimizacao de custos.

5. **Agentes de implementacao (dev-fullstack-1/2) nao revisam** — sao revisados pelos demais. Nunca devem auto-aprovar PRs.

---

## 6. Bounded Context por Tipo de Spec

| Tipo de Spec | Agente Responsavel | Agentes Revisores |
|-------------|-------------------|-------------------|
| SPEC-PROD-* | product-owner | tech-lead, architect |
| SPEC-UX-* | ux-designer | tech-lead, product-owner |
| SPEC-ARCH-* | architect | tech-lead, security-specialist, devops-engineer |
| SPEC-SEC-* | security-specialist | tech-lead, architect |
| SPEC-AI-* | prompt-engineer | tech-lead, finops-engineer, security-specialist |
| SPEC-DATA-* | data-engineer | tech-lead, architect, security-specialist |

---

## 7. Alertas de Violacao de Bounded Context

Quando um agente tenta escrever fora do seu bounded context, as seguintes acoes sao tomadas:

| Severidade | Condicao | Acao |
|-----------|---------|------|
| WARNING | Agente escreve em arquivo fora do bounded context | Log + notificacao ao tech-lead |
| BLOCK | dev-fullstack escreve em `.github/workflows/` | Operacao bloqueada + alerta |
| BLOCK | Qualquer agente escreve em `.env*` | Operacao bloqueada + alerta P0 |
| BLOCK | Agente sem permissao Bash executa comando destrutivo | Operacao bloqueada + alerta |
| INFO | Agente le arquivo fora do bounded context | Log apenas (leitura e permitida para todos) |

Detalhes de enforcement em `docs/process/RUNTIME-ENFORCEMENT.md`.

---

## 8. Resumo de Acesso por Diretorio

| Diretorio | Escrita permitida para |
|-----------|----------------------|
| `src/` | dev-fullstack-1, dev-fullstack-2, tech-lead |
| `src/lib/prompts/` | prompt-engineer, dev-fullstack-1/2 |
| `tests/` | qa-engineer, dev-fullstack-1/2, tech-lead |
| `prisma/` | data-engineer, dev-fullstack-1/2 |
| `docs/specs/SPEC-PROD-*` | product-owner |
| `docs/specs/SPEC-UX-*` | ux-designer |
| `docs/specs/SPEC-ARCH-*` | architect |
| `docs/specs/SPEC-SEC-*` | security-specialist |
| `docs/specs/SPEC-AI-*` | prompt-engineer |
| `docs/infrastructure.md` | devops-engineer |
| `docs/process/` | devops-engineer |
| `docs/runbooks/` | devops-engineer |
| `docs/security.md` | security-specialist |
| `docs/finops/` | finops-engineer |
| `.github/workflows/` | devops-engineer |
| `Dockerfile` | devops-engineer |
| `docker-compose.yml` | devops-engineer |
| `CHANGELOG.md` | release-manager |
| `messages/` | dev-fullstack-1/2, ux-designer |

---

## Historico de Revisoes

| Versao | Data | Autor | Mudancas |
|--------|------|-------|----------|
| 1.0.0 | 2026-03-12 | devops-engineer | Registro inicial — 13 agentes, IAM, bounded contexts, matriz de interacao |
