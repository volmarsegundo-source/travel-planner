# Enforcement em Runtime — Camada de Seguranca para Agentes

**Documento**: PROC-ENF-001
**Autor**: devops-engineer
**Data**: 2026-03-12
**Versao**: 1.0.0
**Status**: Draft — EDD+SDD Integration

---

## 1. Visao Geral

Este documento define a camada de enforcement em runtime que intercepta, valida e controla acoes de agentes durante o desenvolvimento do Atlas Travel Planner. O objetivo e garantir que:

1. Agentes operem dentro dos seus bounded contexts (definidos em `docs/process/AGENT-REGISTRY.md`)
2. Operacoes destrutivas exijam confirmacao humana
3. Secrets nunca sejam expostos em outputs
4. Custos de tokens respeitem budgets definidos
5. Codigo implementado seja rastreavel a specs aprovadas

A camada de enforcement opera como um **middleware conceptual** entre as acoes dos agentes e a execucao efetiva. Na pratica, e implementada via regras de CI, hooks de pre-commit, e convencoes documentadas que os agentes devem seguir.

---

## 2. Arquitetura do Enforcement Layer

```
                    AGENTE
                       |
                  [Acao solicitada]
                       |
           +-----------v-----------+
           |   INTERCEPTOR LAYER   |
           |                       |
           |  1. Identify agent    |
           |  2. Identify action   |
           |  3. Check permissions |
           |  4. Check budgets     |
           |  5. Check safety      |
           +-----------+-----------+
                       |
              +--------+--------+
              |        |        |
           ALLOW    WARN     BLOCK
              |        |        |
              v        v        v
          [Execute] [Log +   [Reject +
                    Execute]  Alert]
```

### Camadas de enforcement

| Camada | Onde executa | O que verifica |
|--------|-------------|---------------|
| **Pre-commit hooks** | Local (dev machine) | Secrets, PII, lint, types |
| **CI Pipeline** | GitHub Actions | Trust score, coverage, schemas, i18n, security |
| **Agent conventions** | Documentacao + memoria | Bounded context, provenance, spec references |
| **PR Review rules** | GitHub branch protection | Aprovacoes, status checks, merge rules |

---

## 3. Regras de Interceptacao de Acoes

### 3.1 Operacoes Git Destrutivas

**Definicao**: Qualquer operacao git que pode resultar em perda de historico ou dados.

| Operacao | Classificacao | Acao do enforcement |
|----------|--------------|---------------------|
| `git push --force` | DESTRUTIVA | BLOQUEAR — exigir confirmacao explicita do usuario |
| `git push --force-to-lease` | DESTRUTIVA | BLOQUEAR — exigir confirmacao explicita do usuario |
| `git reset --hard` | DESTRUTIVA | BLOQUEAR — exigir confirmacao explicita do usuario |
| `git checkout -- .` | DESTRUTIVA | BLOQUEAR — exigir confirmacao explicita do usuario |
| `git clean -f` | DESTRUTIVA | BLOQUEAR — exigir confirmacao explicita do usuario |
| `git branch -D` | DESTRUTIVA | AVISAR — confirmar que branch nao tem commits nao-mergeados |
| `git rebase` (em branch compartilhada) | DESTRUTIVA | BLOQUEAR — nunca rebase master/main |
| `git push --force` em master/main | CRITICA | BLOQUEAR SEMPRE — nenhuma excecao |

**Implementacao**: Agentes nao devem executar operacoes destrutivas sem instrucao explicita do usuario. O sistema de agentes (Claude Code) ja possui protecoes nativas para isso.

```
REGRA: Antes de executar qualquer operacao git destrutiva:
  1. Listar o impacto especifico (commits que serao perdidos, arquivos afetados)
  2. Perguntar ao usuario: "Esta operacao vai [descrever impacto]. Confirma?"
  3. Somente executar apos confirmacao explicita
  4. Logar a operacao com provenance completa
```

---

### 3.2 Escrita Fora do Bounded Context

**Definicao**: Quando um agente tenta criar ou modificar um arquivo fora da sua area de responsabilidade definida em `docs/process/AGENT-REGISTRY.md`.

| Agente | Bounded context de escrita | Violacao exemplo |
|--------|---------------------------|-----------------|
| `agent:devops-engineer` | `docs/infrastructure.md`, `docs/process/`, `.github/`, `Dockerfile` | Editar `src/components/` |
| `agent:security-specialist` | `docs/security.md`, `docs/specs/SPEC-SEC-*` | Editar `src/server/services/` |
| `agent:finops-engineer` | `docs/finops/`, `docs/cost-management.docx` | Editar `prisma/schema.prisma` |
| `agent:product-owner` | `docs/tasks.md`, `docs/specs/SPEC-PROD-*` | Editar `src/` |
| `agent:qa-engineer` | `tests/`, `docs/test-results/` | Editar `src/server/actions/` |

**Acoes por tipo de violacao**:

```
VIOLACAO DETECTADA: agente escrevendo fora do bounded context

SE arquivo e critico (.env*, secrets, workflows):
  → BLOQUEAR operacao
  → Alerta P0 para tech-lead
  → Logar incidente

SE arquivo e codigo-fonte (src/):
  → AVISAR agente
  → Logar com nivel WARNING
  → Sugerir: "Delegue esta tarefa ao dev-fullstack-1 ou dev-fullstack-2"
  → Permitir se usuario confirmar explicitamente

SE arquivo e documentacao (docs/):
  → AVISAR agente
  → Logar com nivel INFO
  → Permitir (menor risco, conteudo e revisavel)
```

**Nota**: A leitura de arquivos fora do bounded context e sempre permitida. Todos os agentes podem ler todo o repositorio para obter contexto.

---

### 3.3 Adicao de Dependencias

**Definicao**: Qualquer `npm install`, `npm add`, ou modificacao de `package.json` que adiciona uma nova dependencia.

```
REGRA: Toda nova dependencia DEVE passar por:

1. VERIFICACAO DE SEGURANCA (security-specialist)
   - npm audit na dependencia isolada
   - Verificar CVEs conhecidos
   - Verificar data da ultima publicacao (< 12 meses)
   - Verificar numero de maintainers (> 1 preferido)

2. VERIFICACAO DE LICENCA (automatico)
   - Apenas MIT, Apache 2.0, BSD, ISC permitidas
   - Qualquer outra licenca: BLOQUEAR + notificar tech-lead

3. VERIFICACAO DE CUSTO (finops-engineer)
   - Dependencia aumenta bundle size?
   - Dependencia faz chamadas a APIs externas?
   - Dependencia tem pricing model proprio?

4. VERIFICACAO DE NECESSIDADE (tech-lead)
   - Existe alternativa nativa/existente no projeto?
   - O problema pode ser resolvido com < 50 linhas de codigo?
```

**Implementacao no CI**:

```yaml
# Pseudocode — dependency check
stage: dependency-audit
trigger: package.json ou package-lock.json modificados
steps:
  - run: diff package.json (base vs PR)
    extract: new_dependencies[]
  - for each new_dependency:
    - run: npm audit $dependency
      fail-on: HIGH or CRITICAL vulnerability
    - run: license-checker --packages $dependency
      fail-on: license NOT IN [MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC]
    - run: npm info $dependency time.modified
      warn-on: last_publish > 12 months ago
    - run: bundlephobia-check $dependency
      warn-on: minified+gzip > 50kb
```

---

### 3.4 Exposicao de API Keys e Secrets

**Definicao**: Qualquer output de agente, log, commit, ou arquivo que contenha credenciais, tokens de API, ou secrets.

```
REGRA: BLOQUEAR SEMPRE — ZERO TOLERANCIA

Padroes detectados:
  - Strings que matcham regex de API keys conhecidas:
    - sk-[a-zA-Z0-9]{20,}          (Anthropic, OpenAI)
    - sk_live_[a-zA-Z0-9]{20,}     (Stripe)
    - ghp_[a-zA-Z0-9]{36}          (GitHub PAT)
    - AKIA[A-Z0-9]{16}             (AWS Access Key)
    - pk\.[a-zA-Z0-9]{50,}         (Mapbox — permitido apenas em NEXT_PUBLIC_)
  - Arquivos .env, .env.local com valores reais
  - Strings base64 com entropia alta (> 4.5 bits/char) em contextos suspeitos
  - Valores de process.env em console.log/logger.*
```

**Implementacao**:

| Camada | Ferramenta | Acao |
|--------|-----------|------|
| Pre-commit | git-secrets / detect-secrets | Bloqueia commit |
| CI | Semgrep `p/secrets` | Bloqueia merge |
| Runtime agente | Convencao de agente | Agente nunca outputa valores de secrets |
| PR Review | GitHub Secret Scanning | Alerta automatico |

**Remediacao se secret for exposto**:

```
INCIDENTE: Secret exposto em commit

1. IMEDIATAMENTE (< 5 min):
   - Revogar/rotacionar o secret exposto
   - Notificar tech-lead + security-specialist

2. EM ATE 1 HORA:
   - Verificar se o commit foi pushado para remote
   - Se sim: considerar TODOS os ambientes comprometidos
   - Rotacionar secrets em staging E producao
   - Verificar logs de acesso para uso nao autorizado

3. EM ATE 24 HORAS:
   - Limpar historico git (BFG Repo Cleaner)
   - Atualizar .gitignore se necessario
   - Post-mortem documentado
   - Adicionar regra de deteccao para prevenir recorrencia
```

---

### 3.5 Deteccao de Spec Drift

**Definicao**: Codigo implementado que diverge da spec SDD aprovada.

```
REGRA: Spec drift em feature code BLOQUEIA merge

Verificacoes:
  1. Commit de feat: ou fix: sem spec reference → WARNING (nao bloqueia ainda)
  2. Spec referenciada nao existe em docs/specs/ → BLOQUEIA
  3. Spec referenciada tem status "draft" (nao aprovada) → WARNING
  4. Schema implementado difere do schema na spec → BLOQUEIA (P0)
  5. Endpoint implementado difere do contrato na spec → BLOQUEIA (P0)
```

**Implementacao no CI**:

```yaml
# Pseudocode — spec drift check
stage: spec-drift
trigger: PR com commits feat: ou fix:
steps:
  - run: extract-spec-refs-from-commits
    output: spec_ids[]
  - for each spec_id:
    - run: verify-spec-exists docs/specs/$spec_id
      fail-on: spec not found
    - run: verify-spec-status docs/specs/$spec_id
      warn-on: status == "draft"
    - run: compare-schemas $spec_id src/lib/validations/
      fail-on: schema mismatch
  - if no spec_ids AND commit is feat/fix:
    - warn: "Commits de feature/fix devem referenciar spec IDs"
```

---

## 4. Guardrails de Seguranca em Runtime

### 4.1 Budget de Tokens por Agente por Sprint

| Agente | Budget por sprint | Budget por conversa | Alerta em |
|--------|------------------|--------------------|-----------|
| `agent:dev-fullstack-1` | Ilimitado* | N/A | N/A |
| `agent:dev-fullstack-2` | Ilimitado* | N/A | N/A |
| `agent:tech-lead` | Ilimitado* | N/A | N/A |
| `agent:architect` | Ilimitado* | N/A | N/A |
| `agent:product-owner` | Ilimitado* | N/A | N/A |
| `agent:ux-designer` | Ilimitado* | N/A | N/A |
| `agent:security-specialist` | Ilimitado* | N/A | N/A |
| `agent:qa-engineer` | Ilimitado* | N/A | N/A |
| `agent:finops-engineer` | Ilimitado* | N/A | N/A |
| `agent:prompt-engineer` | Ilimitado* | N/A | N/A |
| `agent:release-manager` | Ilimitado* | N/A | N/A |
| `agent:data-engineer` | Ilimitado* | N/A | N/A |
| `agent:devops-engineer` | Ilimitado* | N/A | N/A |

*Nota: Os agentes operam via Claude Code (assinatura Pro/Max de $20-100/mes). O budget e controlado pela assinatura, nao por limites individuais. O monitoring e feito pelo finops-engineer via `docs/finops/COST-LOG.md`.

**Budget para IA em producao** (API calls para usuarios):

| Servico | Budget mensal | Alerta em | Acao |
|---------|-------------|-----------|------|
| Anthropic API (itinerarios) | $50,00 | $35,00 (70%) | Notifica finops |
| Anthropic API (checklists) | $15,00 | $10,50 (70%) | Notifica finops |
| Anthropic API (total) | $65,00 | $45,50 (70%) | Reduz rate limits |

---

### 4.2 Maximo de Mudancas por Commit

```
REGRA: Commits excessivamente grandes sao suspeitos

Thresholds:
  - > 20 arquivos modificados → WARNING
    Sugestao: dividir em commits menores e mais focados

  - > 50 arquivos modificados → BLOQUEIA (em PRs)
    Excecao: refatoracao documentada com ADR
    Excecao: migracao de estrutura de pastas
    Excecao: atualizacao de dependencias (renovate/dependabot)

  - > 1000 linhas adicionadas em um unico arquivo → WARNING
    Sugestao: verificar se nao e arquivo gerado (lock files sao excecao)

  - Arquivo binario > 1MB → BLOQUEIA
    Excecao: imagens em public/ com aprovacao do tech-lead
```

**Implementacao**:

```yaml
# Pseudocode — commit size check
stage: commit-size
trigger: every PR
steps:
  - run: git diff --stat origin/master...HEAD
    extract: files_changed, insertions, deletions
  - if files_changed > 50:
    - check: PR description mentions ADR or refactoring justification
    - fail-on: no justification
  - if any single file > 1000 lines added:
    - warn: "Arquivo grande detectado. Verificar se nao e gerado."
  - run: check-binary-files
    fail-on: binary > 1MB without explicit approval
```

---

### 4.3 Spec References Obrigatorias em Commits

```
REGRA: Commits de feat: e fix: DEVEM referenciar spec IDs

Formato esperado:
  feat(SPEC-PROD-042): add expedition summary page
  fix(SPEC-ARCH-015): correct schema validation for transport

Formato aceito (alternativo):
  feat: add expedition summary page
  Implements SPEC-PROD-042 v1.0.0

Commits ISENTOS de spec reference:
  - chore: (manutencao, deps, config)
  - docs: (documentacao)
  - test: (apenas testes)
  - refactor: (refatoracao sem mudanca de behavior)
  - ci: (pipeline changes)
  - style: (formatacao)

Enforcement:
  - Sprint 25-30: WARNING (periodo de adaptacao)
  - Sprint 31+: BLOQUEIA merge se feat/fix sem spec ref
```

---

### 4.4 Deteccao de PII em Logs e Outputs

```
REGRA: PII detectada em qualquer output e P0

Campos classificados como PII:
  - email (qualquer formato *@*.*)
  - nome completo (firstName + lastName juntos)
  - senha / password / secret
  - numero de documento (passaporte, CPF, RG)
  - numero de cartao de credito (padroes de 13-19 digitos)
  - coordenadas GPS precisas combinadas com userId
  - endereco residencial
  - data de nascimento combinada com nome

Locais escaneados:
  - Todos os console.log / logger.* em src/
  - Todos os outputs de Server Actions
  - Todos os campos de resposta de API
  - Todos os eventos do Sentry (beforeSend)
  - Todos os labels de metricas

Implementacao:
  - CI: scan estatico de padroes de PII em codigo (Semgrep custom rule)
  - Runtime: Sentry beforeSend com scrubbing
  - Log: logger.ts nunca aceita campos PII diretamente
```

**Regras especificas para o dominio de viagem**:

| Dado | Classificacao | Pode logar? | Pode retornar em API? |
|------|--------------|-------------|----------------------|
| userId (CUID2) | Pseudonimo | Sim (isolado) | Sim (proprio usuario) |
| email | PII | NAO | Apenas para o proprio usuario |
| nome | PII | NAO | Apenas para o proprio usuario |
| destino de viagem | Sensivel (combinado com user) | NAO (com userId) | Sim (proprio usuario) |
| datas de viagem | Sensivel (indica ausencia) | NAO (com userId) | Sim (proprio usuario) |
| bookingCode | PII (financeiro) | NAO | Sim (mascarado: ***ABC) |
| coordenadas GPS | Sensivel | NAO | Sim (no contexto do itinerario) |

---

## 5. Criterios de Bloqueio de Acoes Inseguras

### Matriz de decisao

```
ACAO SOLICITADA
    |
    v
[E operacao git destrutiva?]
    |-- SIM --> [Usuario confirmou explicitamente?]
    |               |-- SIM --> PERMITIR (com log)
    |               |-- NAO --> BLOQUEAR
    |
    |-- NAO --> [Escrita fora do bounded context?]
    |               |-- SIM + arquivo critico --> BLOQUEAR
    |               |-- SIM + codigo/docs --> AVISAR + permitir com confirmacao
    |               |-- NAO --> continuar
    |
    v
[Expoe secrets ou PII?]
    |-- SIM --> BLOQUEAR SEMPRE (zero tolerancia)
    |
    |-- NAO --> [Adiciona dependencia?]
    |               |-- SIM --> [Licenca permitida?]
    |               |       |-- NAO --> BLOQUEAR
    |               |       |-- SIM --> [CVEs conhecidos?]
    |               |               |-- SIM (HIGH/CRITICAL) --> BLOQUEAR
    |               |               |-- NAO --> PERMITIR (com log)
    |               |-- NAO --> continuar
    |
    v
[Commit sem spec ref (feat/fix)?]
    |-- SIM (Sprint <31) --> AVISAR
    |-- SIM (Sprint >=31) --> BLOQUEAR
    |-- NAO --> PERMITIR
```

### Resumo de classificacao

| Classificacao | Acao | Reversivel? | Notificacao |
|--------------|------|-------------|-------------|
| PERMITIR | Executa normalmente | N/A | Log apenas |
| AVISAR | Executa + log WARNING | N/A | Slack #alerts (se recorrente) |
| BLOQUEAR | Nao executa | N/A | Alerta imediato ao responsavel |
| CONFIRMAR | Aguarda aprovacao humana | Sim | Prompt ao usuario |

---

## 6. Caminhos de Escalacao

### Hierarquia de escalacao

```
Agente detecta problema ou e bloqueado
    |
    v
NIVEL 1: Agente tenta resolver sozinho
    - Consulta MEMORY.md e docs relevantes
    - Tenta abordagem alternativa dentro do bounded context
    - Se resolvido: log + continua
    |
    v (se nao resolvido)
NIVEL 2: Escala para tech-lead
    - Tech-lead avalia impacto e prioridade
    - Pode desbloquear com justificativa documentada
    - Pode redirecionar para agente especialista
    |
    v (se tech-lead nao pode resolver)
NIVEL 3: Escala para usuario (humano)
    - Decisoes que requerem julgamento humano
    - Operacoes destrutivas
    - Trade-offs de seguranca vs. prazo
    - Mudancas de scope ou prioridade
```

### Cenarios de escalacao especificos

| Cenario | Agente inicial | Escala para | Decisao esperada |
|---------|---------------|-------------|-----------------|
| CVE critico em dependencia existente | qa-engineer ou devops | security-specialist → tech-lead | Atualizar ou substituir dependencia |
| Trust score caiu abaixo de 0.80 | pipeline (automatico) | tech-lead | Identificar causa e corrigir |
| Budget de tokens excedido | finops-engineer | tech-lead → usuario | Aumentar budget ou otimizar |
| Spec drift detectado em PR | pipeline (automatico) | architect → tech-lead | Atualizar spec ou codigo |
| Merge conflict complexo | dev-fullstack | tech-lead | Coordenar resolucao |
| Incidente em producao | devops-engineer | tech-lead → usuario | Rollback ou hotfix |
| Violacao de PII em log | security-specialist | tech-lead → usuario (P0) | Remediar imediatamente |
| Agente operando fora do bounded context | enforcement layer | tech-lead | Redirecionar tarefa |

---

## 7. Audit Trail

Todas as acoes de enforcement sao logadas para auditoria:

```json
{
  "timestamp": "2026-03-12T15:00:00.000Z",
  "enforcement_action": "BLOCK",
  "rule": "bounded-context-violation",
  "agent": "agent:finops-engineer",
  "attempted_action": "write",
  "target_file": "src/server/services/ai.service.ts",
  "reason": "Agente finops-engineer nao tem permissao de escrita em src/server/",
  "resolution": "Tarefa redirecionada para agent:dev-fullstack-1",
  "escalated_to": "agent:tech-lead"
}
```

### Retencao do audit trail

| Tipo de evento | Retencao | Localizacao |
|---------------|----------|-------------|
| BLOCK events | 1 ano | `docs/process/audit-log.jsonl` |
| WARN events | 90 dias | `docs/process/audit-log.jsonl` |
| ALLOW events (operacoes sensíveis) | 90 dias | `docs/process/audit-log.jsonl` |
| ALLOW events (rotina) | Nao retido | N/A |
| Secret exposure incidents | Permanente | `docs/security/incidents/` |

---

## 8. Verificacao de Conformidade

### Checklist de verificacao periodica (por sprint)

O tech-lead deve verificar a cada sprint:

- [ ] Nenhum agente operou fora do bounded context sem justificativa
- [ ] Zero secrets expostos em commits ou outputs
- [ ] Todos os commits de feat/fix referenciam specs (a partir do Sprint 31)
- [ ] Trust score medio do sprint >= 0.80
- [ ] Nenhum alerta P0 nao resolvido
- [ ] Budget de tokens dentro do limite
- [ ] Audit log revisado para anomalias

### Metricas de enforcement

| Metrica | Frequencia | Threshold de alerta |
|---------|-----------|-------------------|
| BLOCK events por sprint | Semanal | > 10 por sprint (indica processo mal definido) |
| WARN events por sprint | Semanal | > 20 por sprint (indica falta de treinamento) |
| Bounded context violations | Semanal | > 5 por sprint |
| Secret exposure attempts | Continuo | > 0 (SEMPRE alerta) |
| Spec drift detections | Por PR | > 0 (SEMPRE bloqueia) |

---

## Historico de Revisoes

| Versao | Data | Autor | Mudancas |
|--------|------|-------|----------|
| 1.0.0 | 2026-03-12 | devops-engineer | Documento inicial — enforcement layer para agentes EDD+SDD |
