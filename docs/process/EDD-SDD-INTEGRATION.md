# Integracao EDD + SDD — Atlas Travel Planner

**Documento**: EDD-SDD-INTEGRATION
**Versao**: 1.0.0
**Autor**: tech-lead
**Data**: 2026-03-12
**Status**: Draft
**Aprovadores**: tech-lead, architect, qa-engineer

---

## 1. Resumo Executivo

Este documento define como Eval-Driven Development (EDD) se integra ao processo Spec-Driven Development (SDD) ja estabelecido no Atlas Travel Planner desde o Sprint 25. O EDD complementa o SDD adicionando uma camada de **validacao objetiva e mensuravel** ao ciclo de desenvolvimento.

- **SDD define O QUE construir** (specs sao a fonte de verdade para requisitos)
- **EDD define QUAO BEM foi construido** (evals sao a fonte de verdade para qualidade)
- **Juntos**: Specs -> Implementacao -> Evals -> Trust Score -> Release

O resultado e um pipeline onde nenhuma feature e lancada sem (1) conformidade com a spec aprovada e (2) aprovacao por metricas objetivas de qualidade.

---

## 2. Relacionamento SDD <-> EDD

### 2.1 Modelo Conceitual

```
  SDD (Requisitos)                    EDD (Qualidade)
  ================                    ================
  SPEC-PROD-XXX                       EVAL-XXX
  (O que construir)                   (Como medir se foi bem construido)
       |                                    |
       v                                    v
  Implementacao  -------- valida contra -------> Graders automatizados
       |                                          |
       v                                          v
  QA Conformance Audit                    Trust Score por feature
       |                                          |
       +------ ambos devem passar -------->  Release Gate
```

### 2.2 Fronteiras de Responsabilidade

| Aspecto | SDD (ja existente) | EDD (novo) |
|---------|-------------------|------------|
| Fonte de verdade | Specs em `docs/specs/` | Evals em `docs/evals/` |
| Pergunta que responde | "O que deve ser construido?" | "O resultado tem qualidade suficiente?" |
| Quem define | product-owner, ux-designer, architect | qa-engineer, prompt-engineer |
| Quem valida | qa-engineer (conformance audit) | Graders automatizados + LLM-as-judge |
| Gate de qualidade | tech-lead aprova PR | Trust score >= threshold |
| Escopo | Toda feature non-trivial | Features com AI, i18n, schemas validaveis |
| Artefato de saida | Spec aprovada (Markdown) | Dataset + grader + score |

### 2.3 Principio de Complementaridade

SDD e EDD nao sao alternativos — sao complementares:

- **SDD sem EDD**: sabemos o que construir, mas medimos qualidade manualmente (status atual)
- **EDD sem SDD**: medimos qualidade, mas sem referencia clara do que era esperado
- **SDD + EDD**: requisitos claros E validacao automatizada — ciclo completo

---

## 3. Workflow Integrado

### 3.1 Sequencia Completa (Nova Feature)

```
Passo  1: product-owner    --> SPEC-PROD-XXX (o que e por que)
Passo  2: qa-engineer      --> EVAL-XXX vinculada a spec (criterios de avaliacao)     [NOVO]
Passo  3: ux-designer      --> SPEC-UX-XXX (experiencia e fluxos)
Passo  4: architect        --> SPEC-ARCH-XXX (como construir)
Passo  5: prompt-engineer  --> Revisa evals relacionadas a AI (prompts de judge)       [NOVO]
Passo  6: security-spec.   --> SPEC-SEC-XXX (se necessario)
Passo  7: finops-engineer  --> Avaliacao de custo (inclui custo de evals)              [ATUALIZADO]
Passo  8: tech-lead        --> Aprova specs + criterios de eval                        [ATUALIZADO]
Passo  9: dev-fullstack-1/2 --> Implementam contra spec aprovada
Passo 10: Evals automatizadas rodam a cada commit                                     [NOVO]
Passo 11: qa-engineer      --> Valida: codigo conforme spec E evals passam             [ATUALIZADO]
Passo 12: Trust score calculado --> deve atingir threshold                              [NOVO]
Passo 13: release-manager  --> Gate de promocao baseado em trust score                 [ATUALIZADO]
Passo 14: devops-engineer  --> Deploy com observabilidade (inclui metricas de eval)    [ATUALIZADO]
```

### 3.2 Diferenca em Relacao ao Workflow SDD Atual

O workflow SDD existente (SDD-PROCESS.md, Secao 5) tem 11 passos. O workflow integrado adiciona:

| Passo SDD Original | Mudanca com EDD |
|--------------------|-----------------|
| Step 1: SPEC-PROD | Sem mudanca |
| (novo) Step 2 | qa-engineer cria EVAL-XXX vinculada a spec |
| Step 2-4: UX/ARCH/DATA | Sem mudanca (renumerados para 3-4) |
| (novo) Step 5 | prompt-engineer revisa evals de AI |
| Step 5-6: Security/FinOps | FinOps agora inclui custo de evals |
| Step 7: tech-lead aprova | Agora aprova specs + criterios de eval |
| Step 8: Implementacao | Sem mudanca |
| (novo) Step 10 | Evals automatizadas em cada commit |
| Step 9: QA | Agora valida conformance + evals |
| (novo) Step 12 | Trust score calculado |
| Step 10: release-manager | Agora usa trust score como gate |
| Step 11: Desvio protocol | Sem mudanca (continua stop-update-approve-resume) |

---

## 4. Definition of Ready (DoR) — Atualizada

### 4.1 DoR Anterior (SDD-only)

- [ ] Spec aprovada pelo tech-lead
- [ ] Todas as specs dependentes aprovadas (PROD + ARCH + UX + SEC conforme tamanho)

### 4.2 DoR Atualizada (SDD + EDD)

- [ ] Spec aprovada pelo tech-lead
- [ ] Todas as specs dependentes aprovadas (PROD + ARCH + UX + SEC conforme tamanho)
- [ ] **Criterios de avaliacao definidos (EVAL-XXX criada pelo qa-engineer)** [NOVO]
- [ ] **Eval dataset existe (se feature envolve AI)** [NOVO]
- [ ] **Prompt-engineer revisou evals de AI (se aplicavel)** [NOVO]

### 4.3 Quando Eval Dataset e Obrigatorio

| Tipo de Feature | Eval Dataset Obrigatorio? | Justificativa |
|-----------------|--------------------------|---------------|
| Feature com geracao de AI (itinerario, guia, checklist) | Sim | Output nao-deterministico requer golden sets |
| Feature com schemas validaveis (formularios, APIs) | Sim (schema validation) | Grader programatico barato e eficaz |
| Feature com i18n | Sim (completeness check) | Garantir cobertura de traducoes |
| Feature de UI pura (sem AI, sem i18n) | Nao | Testes unitarios/E2E sao suficientes |
| Correcao de bug (XS/S) | Nao | Coberta por spec existente |

---

## 5. Definition of Done (DoD) — Atualizada

### 5.1 DoD Anterior (SDD-only)

- [ ] Codigo corresponde a spec aprovada
- [ ] QA conformance audit passou
- [ ] Code review aprovado pelo tech-lead
- [ ] Cobertura de testes >= 80%
- [ ] Security checklist passou
- [ ] Merge via PR (sem commits diretos em main)

### 5.2 DoD Atualizada (SDD + EDD)

- [ ] Codigo corresponde a spec aprovada
- [ ] QA conformance audit passou
- [ ] Code review aprovado pelo tech-lead
- [ ] Cobertura de testes >= 80%
- [ ] Security checklist passou
- [ ] **Todas as evals aplicaveis passam** [NOVO]
- [ ] **Trust score >= threshold definido** [NOVO]
- [ ] Merge via PR (sem commits diretos em main)

---

## 6. Matriz de Responsabilidades EDD por Agente

| Agente | Responsabilidade EDD | Artefatos que Produz/Mantem |
|--------|---------------------|-----------------------------|
| **product-owner** | Define criterios de sucesso que mapeiam para metricas de eval | Success criteria em SPEC-PROD-XXX |
| **ux-designer** | Define criterios de eval de UX (task completion, error rate) | UX eval criteria em SPEC-UX-XXX |
| **architect** | Define criterios de performance (response time, token budget) | Performance budgets em SPEC-ARCH-XXX |
| **qa-engineer** | Cria e mantem eval datasets + graders. Dono do framework EDD | `docs/evals/datasets/`, `docs/evals/graders/`, EVAL-DRIVEN-DEVELOPMENT.md |
| **prompt-engineer** | Projeta prompts de LLM-as-judge, otimiza custo de evals | Prompts de avaliacao em graders |
| **security-specialist** | Mantem datasets de injection resistance + PII leak detection | `docs/evals/datasets/injection-*.json`, `docs/evals/datasets/pii-*.json` |
| **finops-engineer** | Monitora custo de execucao de evals, define token budgets | Relatorios de custo de eval em COST-LOG.md |
| **devops-engineer** | Integra eval gates na pipeline CI/CD, configura observabilidade | CI-CD-PIPELINE.md, OBSERVABILITY.md |
| **tech-lead** | Aprova criterios de eval, monitora trust scores, gate final | Aprovacao em EVAL-XXX, revisao de trust scores |
| **dev-fullstack-1/2** | Escrevem codigo que passa nas evals, reportam falhas | Codigo + testes que satisfazem graders |
| **release-manager** | Gate de release baseado em trust score threshold | Release notes com trust scores |
| **data-engineer** | Projeta pipelines de dados de eval e analytics | Eval data pipelines, dashboards analiticos |

---

## 7. Referencia Cruzada de Deliverables

Todos os documentos listados abaixo estao sendo criados em paralelo como parte da iniciativa EDD+SDD (Sprint 30).

### 7.1 Documentos de Processo (tech-lead)

| Documento | Caminho | Autor | Descricao |
|-----------|---------|-------|-----------|
| Este documento | `docs/process/EDD-SDD-INTEGRATION.md` | tech-lead | Master integration document |
| Adoption Checklist | `docs/process/ADOPTION-CHECKLIST.md` | tech-lead | Checklist pratica de adocao por fase |

### 7.2 Auditoria e Arquitetura (architect)

| Documento | Caminho | Autor | Descricao |
|-----------|---------|-------|-----------|
| Current State Audit | `docs/process/CURRENT-STATE-AUDIT.md` | architect | Auditoria do estado atual SDD/EDD/CI |
| Genesis Spec | `docs/specs/GENESIS-SPEC.md` | architect | Especificacao fundacional do projeto |
| AS-IS Architecture | `docs/architecture/AS-IS.md` | architect | Arquitetura atual do sistema |
| TO-BE Architecture | `docs/architecture/TO-BE.md` | architect | Arquitetura alvo com EDD integrado |
| SDD Process (atualizado) | `docs/specs/SDD-PROCESS.md` | architect + tech-lead | Processo SDD com secao EDD |

### 7.3 DevOps e Infraestrutura (devops-engineer)

| Documento | Caminho | Autor | Descricao |
|-----------|---------|-------|-----------|
| CI/CD Pipeline | `docs/process/CI-CD-PIPELINE.md` | devops-engineer | Pipeline com eval gates |
| Agent Registry | `docs/process/AGENT-REGISTRY.md` | devops-engineer | Registro formal dos 13 agentes |
| Observability | `docs/process/OBSERVABILITY.md` | devops-engineer | Metricas, alertas, dashboards |
| Runtime Enforcement | `docs/process/RUNTIME-ENFORCEMENT.md` | devops-engineer | Guardrails automatizados de agentes |

### 7.4 Framework EDD (qa-engineer)

| Documento | Caminho | Autor | Descricao |
|-----------|---------|-------|-----------|
| EDD Framework | `docs/process/EVAL-DRIVEN-DEVELOPMENT.md` | qa-engineer | Definicao completa do framework EDD |
| Eval Template | `docs/process/templates/EVAL-TEMPLATE.md` | qa-engineer | Template para criar EVAL-XXX |
| Trust Score | `docs/process/TRUST-SCORE.md` | qa-engineer | Formula e thresholds de trust score |

### 7.5 Eval Datasets (qa-engineer)

| Dataset | Caminho | Descricao |
|---------|---------|-----------|
| Itinerary Golden Set | `docs/evals/datasets/itinerary-golden-set.json` | Inputs/outputs esperados para geracao de itinerario |
| Guide Quality Set | `docs/evals/datasets/guide-quality-set.json` | Inputs/outputs esperados para guia de destino |
| Injection Resistance | `docs/evals/datasets/injection-resistance.json` | Tentativas de prompt injection com respostas esperadas |
| i18n Completeness | `docs/evals/datasets/i18n-completeness.json` | Chaves de traducao que devem existir em todos os locales |

### 7.6 Grader Templates (dev-fullstack-1)

| Grader | Caminho | Descricao |
|--------|---------|-----------|
| Schema Validation | `docs/evals/graders/schema-validation.ts` | Valida output contra Zod schema |
| LLM Judge Itinerary | `docs/evals/graders/llm-judge-itinerary.ts` | LLM-as-judge para qualidade de itinerario |
| Token Budget | `docs/evals/graders/token-budget.ts` | Verifica se geracao respeita orcamento de tokens |
| i18n Completeness | `docs/evals/graders/i18n-completeness.ts` | Verifica cobertura de traducoes |

---

## 8. Plano de Rollout

### 8.1 Cronograma por Sprint

```
Sprint 30 (Atual)    Sprint 31           Sprint 32           Sprint 33
================     ================    ================    ================
Documentacao         Integracao          Automacao           Producao

- Todos os docs      - Graders como      - Trust score       - EDD+SDD full
  de processo          Vitest tests        automatizado       integration
- Primeiros eval     - i18n grader em    - CI gates ativos   - Monitoring com
  datasets             npm run test        (fail < 0.8)       drift detection
- Templates de       - Schema grader     - Injection eval    - Auto-remediation
  grader               em AI tests         em todo PR          playbooks
- Trust score        - Token budget      - LLM-as-judge     - Quarterly trust
  formula definida     no AI service       por sprint          score review
- SDD-PROCESS.md     - Eval results
  atualizado           em log estruturado
- Agents briefed
```

### 8.2 Criterios de Transicao entre Fases

| De -> Para | Criterio de Transicao |
|------------|----------------------|
| Sprint 30 -> 31 | Todos os docs commitados, pelo menos 1 eval dataset com dados reais, trust score formula aprovada |
| Sprint 31 -> 32 | >= 2 graders integrados ao test suite, eval results logados em formato estruturado |
| Sprint 32 -> 33 | Trust score calculado automaticamente, CI gate ativo sem falsos positivos por 1 sprint |
| Sprint 33 -> BAU | Nenhum incidente causado por eval gate, drift detection funcionando, primeiro quarterly review concluido |

### 8.3 Riscos do Rollout

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|---------------|---------|-----------|
| LLM-as-judge com custo elevado | Media | Alto | Rodar apenas por sprint (nao por commit); token budget rigido |
| Falsos positivos no CI gate | Alta (inicial) | Medio | Sprint 32 roda em modo warning-only antes de blocking |
| Resistencia a adocao | Baixa | Medio | Rollout gradual; mostrar valor em Sprint 31 antes de gates |
| Eval datasets desatualizados | Media | Alto | qa-engineer revisa datasets a cada sprint; semver em datasets |

---

## 9. Metricas de Sucesso da Iniciativa

| Metrica | Baseline (Sprint 29) | Target (Sprint 33) |
|---------|---------------------|---------------------|
| Eval datasets existentes | 0 | >= 4 (itinerario, guia, injection, i18n) |
| Graders automatizados | 0 | >= 4 |
| Trust score calculado automaticamente | Nao | Sim |
| CI gates com eval | 0 | >= 2 (schema validation, i18n) |
| Tempo medio para detectar drift | Manual (dias) | Automatizado (por commit) |
| Specs com criterios de eval vinculados | 0% | >= 50% das specs ativas |

---

## 10. Glossario

| Termo | Definicao |
|-------|-----------|
| **SDD** | Spec-Driven Development — processo onde specs sao a fonte de verdade para requisitos |
| **EDD** | Eval-Driven Development — processo onde avaliacoes automatizadas medem qualidade objetivamente |
| **Eval** | Uma avaliacao automatizada que testa a qualidade de um output (deterministico ou AI) |
| **Grader** | Codigo que executa uma eval e produz um score (0.0 a 1.0) |
| **Dataset** | Conjunto de inputs com outputs esperados usado por graders |
| **Trust Score** | Metrica agregada de qualidade por feature, calculada a partir de multiplos graders |
| **Golden Set** | Dataset curado manualmente com exemplos de alta qualidade |
| **LLM-as-Judge** | Tecnica onde um LLM avalia o output de outro LLM contra criterios definidos |
| **Drift Detection** | Processo automatizado que detecta quando outputs divergem do baseline esperado |
| **Conformance Audit** | Validacao de QA que confirma que codigo corresponde a spec aprovada |

---

## Change History

| Versao | Data | Autor | Mudanca |
|--------|------|-------|---------|
| 1.0.0 | 2026-03-12 | tech-lead | Documento inicial — integracao EDD+SDD |
