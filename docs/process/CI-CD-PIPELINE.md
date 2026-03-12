# Pipeline CI/CD — Atlas Travel Planner

**Documento**: PROC-CICD-001
**Autor**: devops-engineer
**Data**: 2026-03-12
**Versao**: 1.0.0
**Status**: Draft — EDD+SDD Integration

---

## 1. Visao Geral

Este documento define o pipeline CI/CD completo do Atlas Travel Planner com gates de avaliacao (eval gates) integrados ao fluxo de entrega. O pipeline garante que todo codigo que chega a producao:

1. Passa por validacao de qualidade estatica (lint, types, build)
2. Passa por testes unitarios e de integracao com cobertura minima
3. Passa por eval gates de schema, i18n, seguranca e trust score
4. Recebe auditoria de conformidade contra specs SDD
5. E deployado progressivamente (canary) com rollback automatico

O pipeline evolui o CI/CD existente (INFRA-001) adicionando camadas de avaliacao para o processo EDD+SDD (Eval-Driven Development + Spec-Driven Development).

---

## 2. Arquitetura do Pipeline

```
                    DEVELOPER
                       |
                  git push / PR
                       |
           +-----------v-----------+
           |   STAGE 1: PRE-CHECK  |  < 3 min
           |   lint + type-check   |
           +-----------+-----------+
                       |
           +-----------v-----------+
           |   STAGE 2: BUILD      |  < 5 min
           |   next build          |
           |   (zero warnings)     |
           +-----------+-----------+
                       |
           +-----------v-----------+
           |   STAGE 3: TESTES     |  < 8 min
           |   vitest run          |
           |   coverage >= 80%     |
           +-----------+-----------+
                       |
     +-----------------v-----------------+
     |       STAGE 4: EVAL GATES         |  < 5 min
     |                                   |
     |  4a. Schema Validation (Zod)      |
     |  4b. i18n Completeness            |
     |  4c. Security (injection + PII)   |
     |  4d. Trust Score Composite        |
     |                                   |
     +-----------------+-----------------+
                       |
           +-----------v-----------+
           |   STAGE 5: QA AUDIT   |  < 3 min
           |   spec conformance    |
           +-----------+-----------+
                       |
           +-----------v-----------+
           |   STAGE 6: SAST +     |  < 5 min
           |   CONTAINER SCAN      |
           +-----------+-----------+
                       |
        +--------------v--------------+
        |   STAGE 7: DEPLOY STAGING   |  auto
        |   canary 5% -> 25% -> 100%  |
        +--------------+--------------+
                       |
              [APROVACAO MANUAL]
              tech-lead required
                       |
        +--------------v--------------+
        |   STAGE 8: DEPLOY PROD      |
        |   canary 5% -> 25% -> 100%  |
        +--------------+--------------+
                       |
           +-----------v-----------+
           |   STAGE 9: SMOKE +    |
           |   NOTIFY              |
           +-----------+-----------+
```

---

## 3. Detalhamento dos Stages

### Stage 1: Pre-check (Lint + Type Check)

**Objetivo**: Garantir qualidade de codigo antes de qualquer compilacao.

**Criterio de pass/fail**:
- ESLint: zero erros (warnings permitidos)
- TypeScript: `tsc --noEmit` com zero erros
- Tempo maximo: 3 minutos

```yaml
# Pseudocode — Stage 1
stage: pre-check
runs-on: ubuntu-latest
timeout: 180s  # 3 min hard limit
steps:
  - checkout
  - setup-node: 20.x (cache: npm)
  - run: npm ci
  - run: npm run lint
    fail-on: exit-code != 0
  - run: npx tsc --noEmit
    fail-on: exit-code != 0
```

**Bloqueio**: Qualquer erro de lint ou type impede avancar para stages seguintes.

---

### Stage 2: Build

**Objetivo**: Verificar que a aplicacao compila sem erros nem warnings.

**Criterio de pass/fail**:
- `next build` exit code 0
- Zero warnings no output (tratados como erros via `eslint.ignoreDuringBuilds: false`)
- Build artifacts gerados corretamente

```yaml
# Pseudocode — Stage 2
stage: build
runs-on: ubuntu-latest
needs: [pre-check]
timeout: 300s  # 5 min
env:
  # Variaveis minimas para build (sem secrets reais)
  DATABASE_URL: "postgresql://fake:fake@localhost:5432/fake"
  NEXTAUTH_SECRET: "build_only_not_real_secret_32chars_min"
  NEXTAUTH_URL: "http://localhost:3000"
  NEXT_PUBLIC_APP_URL: "http://localhost:3000"
  NEXT_PUBLIC_MAPBOX_TOKEN: "pk.build_placeholder"
steps:
  - checkout
  - setup-node: 20.x (cache: npm)
  - run: npm ci
  - run: npx prisma generate
  - run: npm run build
    fail-on: exit-code != 0 OR output contains "warning"
  - artifact: upload .next/ build output
```

**Nota de seguranca**: Variaveis de build sao placeholders. Nenhum secret real e usado neste stage.

---

### Stage 3: Testes Unitarios e de Integracao

**Objetivo**: Validar logica de negocio, servicos e schemas com cobertura minima.

**Criterio de pass/fail**:
- 100% dos testes passam
- Cobertura de linhas >= 80%
- Nenhuma regressao no total de testes (contagem nao pode diminuir vs. branch base)

```yaml
# Pseudocode — Stage 3
stage: tests
runs-on: ubuntu-latest
needs: [pre-check]  # paralelo com build
timeout: 480s  # 8 min
services:
  postgres: postgres:16-alpine (health-check enabled)
  redis: redis:7-alpine (health-check enabled)
env:
  DATABASE_URL: postgresql://travel_planner:ci_password@localhost:5432/test
  REDIS_URL: redis://localhost:6379
  NODE_ENV: test
  # ... demais env vars para teste
steps:
  - checkout
  - setup-node: 20.x (cache: npm)
  - run: npm ci
  - run: npx prisma migrate deploy
  - run: npm run test:coverage -- --reporter=verbose
    fail-on: exit-code != 0
  - run: check-coverage-threshold 80%
    fail-on: coverage < 80%
  - run: check-test-count-regression
    description: |
      Compara contagem de testes com branch base.
      Se testes foram removidos sem justificativa, bloqueia.
    fail-on: test_count < base_branch_test_count
  - artifact: upload coverage/
```

**Metricas emitidas**:
- `test.count`: numero total de testes executados
- `test.passed`: numero de testes que passaram
- `test.coverage.lines`: percentual de cobertura de linhas
- `test.duration_ms`: tempo total de execucao

---

### Stage 4: Eval Gates

Os eval gates sao o diferencial do pipeline EDD+SDD. Cada gate valida um aspecto especifico da qualidade alem dos testes tradicionais.

#### 4a. Schema Validation (Zod Graders)

**Objetivo**: Verificar que todos os schemas Zod de output de IA estao sincronizados com os tipos TypeScript e que os graders de avaliacao validam outputs reais.

**Criterio de pass/fail**:
- Todos os schemas em `src/lib/validations/` compilam sem erros
- Schemas de output de IA (`itinerary.schema.ts`, `checklist.schema.ts`) parsam exemplos de fixture
- Nenhum schema usa `.passthrough()` (seguranca — SEC-005)

```yaml
# Pseudocode — Eval Gate 4a
stage: eval-schema
runs-on: ubuntu-latest
needs: [tests]
timeout: 120s  # 2 min
steps:
  - checkout
  - setup-node: 20.x
  - run: npm ci
  - run: npx ts-node scripts/eval/schema-validation.ts
    description: |
      1. Importa todos os schemas de src/lib/validations/
      2. Parsea fixtures de teste em tests/fixtures/ai-outputs/
      3. Verifica que nenhum schema usa .passthrough()
      4. Reporta cobertura de campos validados
    fail-on: any schema parse failure OR passthrough detected
    output:
      eval_score: 0.0-1.0  # ratio de schemas validos / total schemas
      schemas_checked: N
      schemas_failed: [list]
```

**Limites de custo**: Este gate nao consome tokens de IA. Executa validacao local com fixtures estaticas.

---

#### 4b. i18n Completeness

**Objetivo**: Garantir que todas as chaves de traducao existem em todos os locales suportados (en.json, pt-BR.json).

**Criterio de pass/fail**:
- Todas as chaves presentes em `en.json` devem existir em `pt-BR.json` e vice-versa
- Nenhuma chave vazia ("") em qualquer locale
- Nenhuma chave orfao (presente no JSON mas nao referenciada no codigo)

```yaml
# Pseudocode — Eval Gate 4b
stage: eval-i18n
runs-on: ubuntu-latest
needs: [tests]
timeout: 120s  # 2 min
steps:
  - checkout
  - setup-node: 20.x
  - run: npm ci
  - run: npm run i18n:check
    description: |
      Script existente (Sprint 4) que verifica:
      1. Chaves ausentes entre locales
      2. Chaves vazias
      3. Chaves orfaos (opcional — warning, nao bloqueio)
    fail-on: missing keys OR empty values
    output:
      eval_score: 0.0-1.0  # ratio de chaves completas / total chaves
      missing_keys: [list]
      empty_keys: [list]
      orphan_keys: [list]  # warning only
```

**Nota**: O script `npm run i18n:check` ja existe desde o Sprint 4. Este gate formaliza sua execucao como bloqueio no pipeline.

---

#### 4c. Security Eval (Injection + PII)

**Objetivo**: Detectar proativamente vulnerabilidades de injecao e vazamento de PII em outputs, logs e respostas de API.

**Criterio de pass/fail**:
- Zero deteccoes de PII em outputs de log (scan de `console.log`, `logger.*`)
- Zero padroes de injecao SQL/NoSQL em inputs nao sanitizados
- Zero secrets hardcoded detectados (complementa Semgrep SAST)
- Todos os Server Actions comecam com `await auth()`

```yaml
# Pseudocode — Eval Gate 4c
stage: eval-security
runs-on: ubuntu-latest
needs: [tests]
timeout: 180s  # 3 min
steps:
  - checkout
  - run: npx semgrep --config p/secrets p/owasp-top-ten --error
    fail-on: any finding
  - run: npx ts-node scripts/eval/pii-scan.ts
    description: |
      Escaneia todos os arquivos em src/ por padroes de PII em logs:
      - email em console.log / logger.*
      - userId combinado com dados de viagem
      - campos de senha / token em logs
    fail-on: pii_leaks > 0
  - run: npx ts-node scripts/eval/auth-first-check.ts
    description: |
      Verifica que todos os Server Actions em src/server/actions/
      chamam await auth() antes de qualquer outro statement.
    fail-on: actions_without_auth_first > 0
    output:
      eval_score: 0.0-1.0
      pii_leaks_found: N
      injection_patterns_found: N
      actions_without_auth: [list]
```

**Limites de custo**: Zero tokens de IA. Analise estatica pura.

---

#### 4d. Trust Score Composite

**Objetivo**: Calcular um score de confianca composto que agrega todos os eval gates anteriores. O trust score determina se o build pode avancar para staging ou producao.

**Formula do Trust Score**:

```
trust_score = (
  schema_score     * 0.20 +
  i18n_score       * 0.15 +
  security_score   * 0.25 +
  test_coverage    * 0.20 +
  build_success    * 0.10 +
  spec_conformance * 0.10
)
```

**Thresholds**:

| Destino | Trust Score Minimo | Acao se abaixo |
|---------|-------------------|----------------|
| Staging | >= 0.80 | Bloqueia deploy para staging |
| Production | >= 0.90 | Bloqueia deploy para producao |
| Merge em master | >= 0.80 | Bloqueia merge do PR |

```yaml
# Pseudocode — Eval Gate 4d
stage: eval-trust-score
runs-on: ubuntu-latest
needs: [eval-schema, eval-i18n, eval-security, tests, build]
timeout: 60s  # 1 min (apenas calculo)
steps:
  - run: npx ts-node scripts/eval/trust-score.ts
    inputs:
      schema_score: ${{ needs.eval-schema.outputs.eval_score }}
      i18n_score: ${{ needs.eval-i18n.outputs.eval_score }}
      security_score: ${{ needs.eval-security.outputs.eval_score }}
      test_coverage: ${{ needs.tests.outputs.coverage_pct }}
      build_success: ${{ needs.build.result == 'success' ? 1.0 : 0.0 }}
      spec_conformance: ${{ needs.qa-audit.outputs.conformance_score }}
    output:
      trust_score: 0.0-1.0
      breakdown: { schema, i18n, security, tests, build, spec }
      eligible_for_staging: boolean  # trust_score >= 0.80
      eligible_for_production: boolean  # trust_score >= 0.90
    fail-on: trust_score < 0.80
  - run: emit-metric trust_score=$trust_score
    description: Emite metrica para dashboard de observabilidade
```

**Rollback trigger**: Se o trust score de um build em staging cair abaixo de 0.80 (medido pos-deploy via smoke tests), o deploy e automaticamente revertido.

---

### Stage 5: QA Audit (Conformidade com Specs)

**Objetivo**: Verificar que o codigo implementa corretamente as specs SDD referenciadas.

**Criterio de pass/fail**:
- Todo commit de feature/fix referencia um spec ID no message (`feat(SPEC-XXX):`)
- PR description contem conformance statement
- Arquivos modificados estao dentro do bounded context do spec referenciado

```yaml
# Pseudocode — Stage 5
stage: qa-audit
runs-on: ubuntu-latest
needs: [tests]
timeout: 180s  # 3 min
steps:
  - checkout
  - run: npx ts-node scripts/eval/spec-conformance.ts
    description: |
      1. Extrai spec IDs dos commit messages no PR
      2. Verifica que cada spec referenciado existe em docs/specs/
      3. Verifica que arquivos modificados estao no bounded context do spec
      4. Calcula conformance score
    output:
      conformance_score: 0.0-1.0
      specs_referenced: [SPEC-XXX, ...]
      specs_missing: [list]  # commits sem spec ref
      out_of_scope_files: [list]  # arquivos fora do bounded context
    fail-on: |
      conformance_score < 0.70
      OR (is_feature_commit AND no_spec_reference)
```

**Nota**: Commits de tipo `chore:`, `docs:`, `test:` nao exigem spec reference. Apenas `feat:` e `fix:` exigem.

---

### Stage 6: SAST + Container Scan

**Objetivo**: Analise de seguranca estatica e scan de vulnerabilidades no container Docker.

Este stage ja esta definido em detalhes em `docs/infrastructure.md` (INFRA-001). Resumo:

```yaml
# Pseudocode — Stage 6
stage: security-scan
runs-on: ubuntu-latest
needs: [build, eval-trust-score]
timeout: 600s  # 10 min (docker build + trivy)
steps:
  - run: docker build -t travel-planner:$SHA .
  - run: trivy image travel-planner:$SHA
    severity: CRITICAL,HIGH
    fail-on: any unfixed CRITICAL or HIGH CVE
  - run: npm audit --audit-level=high
    fail-on: exit-code != 0
  - artifact: upload trivy SARIF to GitHub Security tab
```

---

### Stage 7: Deploy Staging

**Objetivo**: Deploy progressivo (canary) para ambiente de staging.

**Criterio de entrada**: Trust score >= 0.80

```yaml
# Pseudocode — Stage 7
stage: deploy-staging
runs-on: ubuntu-latest
needs: [security-scan, eval-trust-score]
if: needs.eval-trust-score.outputs.eligible_for_staging == 'true'
environment: staging
timeout: 600s  # 10 min
steps:
  - run: vercel deploy --prebuilt
    target: staging
  - run: npm run test:smoke -- --base-url=$STAGING_URL
    description: Smoke tests contra staging
    fail-on: any critical path failure
  - run: check-trust-score-post-deploy
    description: |
      Mede trust score pos-deploy:
      - Health check 200 OK
      - Error rate < 1%
      - Latency P95 < 3s
    fail-on: post_deploy_trust_score < 0.80
    rollback-on-failure: vercel rollback --target=staging
```

**Canary progression em staging**:
1. 5% do trafego por 5 minutos — monitora error rate
2. 25% do trafego por 5 minutos — monitora latencia P95
3. 100% do trafego — smoke tests completos

**Rollback automatico**: Se error rate > 5% ou latencia P95 > 5s durante qualquer fase do canary, reverte para versao anterior automaticamente.

---

### Stage 8: Deploy Production

**Objetivo**: Deploy progressivo para producao com aprovacao manual obrigatoria.

**Criterio de entrada**:
- Trust score >= 0.90
- Staging deploy bem-sucedido
- Aprovacao manual do tech-lead (GitHub Environment protection rule)

```yaml
# Pseudocode — Stage 8
stage: deploy-production
runs-on: ubuntu-latest
needs: [deploy-staging]
if: needs.eval-trust-score.outputs.eligible_for_production == 'true'
environment:
  name: production
  # Requer aprovacao manual do tech-lead
steps:
  - run: vercel deploy --prebuilt --prod
  - run: npm run test:smoke -- --base-url=$PRODUCTION_URL
    fail-on: any critical path failure
  - rollback-on-failure: vercel rollback --prod
```

**Canary progression em producao**:
1. 5% do trafego por 15 minutos — monitora error rate + trust score
2. 25% do trafego por 15 minutos — monitora latencia P95 + health checks
3. 100% do trafego — smoke tests + notificacao de sucesso

---

### Stage 9: Smoke Tests + Notificacao

```yaml
# Pseudocode — Stage 9
stage: post-deploy
runs-on: ubuntu-latest
needs: [deploy-production]
steps:
  - run: npm run test:smoke -- --base-url=$PRODUCTION_URL
    description: |
      Testes criticos contra producao:
      - GET /api/v1/health -> 200
      - Auth flow (login + session)
      - Criacao de viagem
      - Busca de destinos
  - run: notify-slack
    payload: |
      Deploy v$VERSION para producao concluido.
      Trust Score: $TRUST_SCORE
      Commit: $SHA
      Autor: $AUTHOR
  - run: emit-deploy-metric
    description: Emite metrica de deploy para dashboard
```

---

## 4. Regras de Promocao de Ambiente

```
                    dev (local)
                       |
                       | git push to feature branch
                       | PR para master
                       |
               [CI Pipeline completo]
               [Trust Score >= 0.80]
                       |
                       v
                   staging
                       |
                       | Canary 5% -> 25% -> 100%
                       | Smoke tests pass
                       | Error rate < 1%
                       |
              [APROVACAO MANUAL]
              [Trust Score >= 0.90]
                       |
                       v
                  production
                       |
                       | Canary 5% -> 25% -> 100%
                       | Smoke tests pass
                       | Monitoria 15 min por fase
```

### Regras inegociaveis

1. **Nenhum deploy direto para producao** — todo codigo passa por staging primeiro
2. **Nenhum deploy sem trust score** — o trust score e calculado e registrado para cada build
3. **Nenhum bypass de eval gates** — mesmo para hotfixes, os eval gates executam (com timeout reduzido)
4. **Aprovacao manual para producao** — nenhum workflow automatico faz deploy para producao sem intervencao humana

---

## 5. Limites de Custo para Eval Runs

| Gate | Tokens de IA | Custo maximo/run | Custo maximo/sprint |
|------|-------------|-----------------|-------------------|
| Schema Validation | 0 | $0,00 | $0,00 |
| i18n Completeness | 0 | $0,00 | $0,00 |
| Security Scan | 0 | $0,00 | $0,00 |
| Trust Score | 0 | $0,00 | $0,00 |
| QA Audit | 0 | $0,00 | $0,00 |

**Nota**: Todos os eval gates do MVP sao baseados em analise estatica — zero consumo de tokens de IA. Eval gates que consomem IA (ex: grading de output semantico) serao adicionados em fases futuras com budget dedicado, sujeito a aprovacao do finops-engineer.

**Budget futuro para eval com IA**:

| Gate | Budget por run | Budget por sprint (10 runs) |
|------|---------------|---------------------------|
| Semantic output grading | $0,10 | $1,00 |
| Prompt regression testing | $0,25 | $2,50 |
| AI guardrail validation | $0,05 | $0,50 |
| **Total futuro** | **$0,40** | **$4,00** |

Referencia: `docs/finops/COST-LOG.md` — budget de desenvolvimento por sprint e ~$20-100.

---

## 6. Triggers de Rollback

### Rollback automatico (sem intervencao humana)

| Trigger | Threshold | Tempo de deteccao | Acao |
|---------|-----------|-------------------|------|
| Trust score pos-deploy | < 0.80 (staging) / < 0.90 (prod) | 1 min | Revert para versao anterior |
| Error rate spike | > 5% de respostas 5xx | 5 min | Revert + alerta P0 |
| Health check failure | /api/v1/health retorna 503 | 3 checks consecutivos (15s) | Revert + alerta P0 |
| Latencia P95 | > 5s por 5 min | 5 min | Revert + alerta P1 |

### Rollback manual (tech-lead decide)

| Trigger | Threshold | Acao |
|---------|-----------|------|
| Test count regression | Testes removidos sem justificativa | Bloqueia merge |
| Coverage drop | < 80% | Bloqueia merge |
| Spec drift detectado | Codigo diverge de spec aprovada | Bloqueia merge + notifica architect |
| CVE critico em dependencia | Trivy ou npm audit detecta | Bloqueia deploy |

---

## 7. Mapa de Dependencia entre Stages

```
pre-check
    |
    +----> build --------+
    |                     |
    +----> tests --------+--> eval-gates --> trust-score --> security-scan
    |                     |                      |
    +----> sast ----------+                      |
                                                 |
                                     deploy-staging --> [manual] --> deploy-prod --> notify
```

Stages `build`, `tests` e `sast` executam em paralelo apos `pre-check`, reduzindo o tempo total do pipeline.

---

## 8. Hotfix Pipeline

Para correcoes criticas em producao, existe um pipeline acelerado:

```yaml
# Hotfix pipeline — tempo maximo: 15 min
trigger: branch hotfix/*
stages:
  - pre-check (lint + types)      # 2 min
  - tests (only affected suites)  # 3 min
  - eval-gates (security only)    # 2 min
  - trust-score (threshold 0.85)  # 1 min — threshold reduzido
  - deploy-staging                # 3 min
  - [MANUAL APPROVAL]
  - deploy-production             # 3 min
  - smoke-tests                   # 1 min
```

**Restricoes do hotfix pipeline**:
- Apenas branches `hotfix/*` disparam este pipeline
- Obrigatorio post-mortem em 48h apos hotfix
- Trust score minimo 0.85 (nao 0.90) para producao
- Tech-lead E security-specialist devem aprovar

---

## Historico de Revisoes

| Versao | Data | Autor | Mudancas |
|--------|------|-------|----------|
| 1.0.0 | 2026-03-12 | devops-engineer | Documento inicial — pipeline EDD+SDD com eval gates |
