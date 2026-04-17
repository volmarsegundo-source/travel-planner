# SPEC-RELEASE-AI-GOVERNANCE-V2: Plano de Release — Central de Governanca de IA

**Version**: 1.0.0
**Status**: Draft
**Author**: release-manager
**Reviewers**: tech-lead, product-owner, architect, devops-engineer, qa-engineer
**Created**: 2026-04-17
**Last Updated**: 2026-04-17
**Sprint**: 45
**Feature Flag**: `AI_GOVERNANCE_V2` (env-only, default OFF)

---

## 1. Sumario Executivo

A Central de Governanca de IA (Sprint 45) introduz uma aba administrativa em `/admin` para controle de modelos, gestao de prompts com ciclo de vida (draft, eval, aprovacao, rollback), curadoria de outputs e audit log. Todas as configuracoes propagam em tempo real via polling ao banco de dados, eliminando a necessidade de redeploy para alteracoes de prompts ou modelos.

A mudanca e **inteiramente aditiva** e protegida pela feature flag `AI_GOVERNANCE_V2` (default OFF). Nao ha breaking changes internos ou externos. O rollout segue 3 fases ao longo de 3 semanas, com criterios go/no-go rigidos em cada transicao.

**Versao atual**: v0.59.0 (package.json)
**Versao alvo (merge)**: v0.60.0 (MINOR — flag OFF, codigo dormente)
**Versao alvo (producao)**: v0.62.0 (MINOR — flag ON 100%)

---

## 2. Change Impact Assessment (CIA-009)

### Assessment ID: CIA-009
### Related Spec: SPEC-PROD-AI-GOVERNANCE-V2, SPEC-ARCH-AI-GOVERNANCE-V2, SPEC-UX-AI-GOVERNANCE-V2, SPEC-AI-AI-GOVERNANCE-V2, SPEC-QA-AI-GOVERNANCE-V2, SPEC-EVALS-V1
### Analyst: release-manager
### Date: 2026-04-17
### Verdict: ✅ Non-Breaking (aditivo com feature flag)

---

### 2.1 Resumo da Mudanca

Adiciona ao painel admin (`/admin`) uma Central de Governanca de IA composta por: (1) gestao de model assignments por tipo de prompt, (2) editor de prompt templates com ciclo de vida completo, (3) curadoria de outputs gerados, (4) audit log de todas as alteracoes. As configuracoes de modelo e prompt passam a ser lidas do banco de dados em tempo real (polling), com fallback para valores hardcoded quando o DB esta indisponivel ou a flag esta OFF.

### 2.2 Classificacao de Breaking Changes

#### Mudancas de Contrato API

| Tipo | Mudanca | Breaking? | Razao |
|---|---|---|---|
| Endpoints adicionados | `GET/PUT /api/admin/ai/models`, `GET/POST/PUT /api/admin/ai/prompts`, `GET /api/admin/ai/audit-log` | ✅ Nao | Aditivo — endpoints novos, nenhum existente alterado |
| Tabelas adicionadas | `ModelAssignment`, `PromptTemplate`, `PromptVersion`, `AiAuditLog`, `AiOutputCuration` | ✅ Nao | Aditivo — nenhuma tabela existente modificada |
| Comportamento alterado | `ai.service.ts` le modelo/prompt do DB antes do hardcoded | ✅ Nao | Com flag OFF, path existente permanece inalterado |
| Comportamento alterado | Polling DB adiciona 5-20ms a latencia AI | ✅ Nao | Aditivo — dentro da tolerancia (baseline + 50ms) |
| Campo adicionado | `User.aiPermissions` (JSON, nullable) | ✅ Nao | Aditivo — nullable, sem impacto em queries existentes |

#### Mudancas de Schema de Banco de Dados

| Mudanca | Breaking? | Migracao Necessaria? |
|---|---|---|
| 5 tabelas novas (ModelAssignment, PromptTemplate, PromptVersion, AiAuditLog, AiOutputCuration) | ✅ Nao | Sim — migration `up` cria tabelas, `down` remove (exceto AiAuditLog que e preservada) |
| Seed de ModelAssignment com configs hardcoded atuais | ✅ Nao | Sim — seed idempotente |
| Coluna nullable `User.aiPermissions` | ✅ Nao | Sim — `ALTER TABLE ADD COLUMN ... NULL` |

### 2.3 Consumidores Afetados

| Consumidor | Tipo | Impacto | Acao Necessaria |
|---|---|---|---|
| Frontend Admin (`/admin`) | Interno | Nova aba de Governanca de IA adicionada ao layout admin. Condicional a flag. | Nenhuma — aba aparece automaticamente quando flag ON |
| Backend AI Routes (`ai.service.ts`) | Interno | Novo path de leitura de config do DB antes do hardcoded. Com flag OFF, path original permanece. | Nenhuma enquanto flag OFF |
| CI/CD Pipeline | Interno | Nova migration Prisma a ser aplicada. Novos testes a serem executados. | Pipeline ja suporta migrations automaticas |
| `dev-fullstack-1` (backend AI) | Interno | Precisa entender o novo fluxo de resolucao de modelo/prompt (DB -> fallback hardcoded) | Revisar SPEC-ARCH-AI-GOVERNANCE-V2 |
| `dev-fullstack-2` (frontend admin) | Interno | Implementar nova aba no painel admin | Revisar SPEC-UX-AI-GOVERNANCE-V2 |
| API externa / mobile | Externo | Nenhum impacto — nao ha API publica afetada | Nenhuma |
| Viajante final | Externo | Nenhum impacto direto — qualidade dos outputs pode melhorar apos curadoria | Nenhuma comunicacao necessaria |

### 2.4 Nivel de Risco

**Risco Geral**: 🟠 Medio

**Racional**: Embora a mudanca seja aditiva e protegida por flag, o polling ao DB no path critico de geracao de IA introduz um ponto de falha novo. A mitigacao (fallback hardcoded) reduz o risco, mas exige validacao cuidadosa de latencia e resiliencia em staging.

---

## 3. Versionamento SemVer (Pre-1.0)

### 3.1 Tabela de Versoes

| Versao | Tipo | Data Alvo | Conteudo | Criterio de Promocao |
|---|---|---|---|---|
| **v0.60.0** | MINOR | 2026-04-27 (Semana 1) | Merge com flag OFF. Codigo dormente. Migration aplicada. Seed de ModelAssignment com configs atuais. | Build passa, testes passam, zero regressoes |
| **v0.61.0** | MINOR | 2026-05-04 (Semana 2) | Flag ON em staging. Validacao 48h. Canary prod 10% admins. | 0 P0, latencia p90 AI <= baseline + 50ms, Trust Score >= 0.85 |
| **v0.62.0** | MINOR | 2026-05-11 (Semana 3) | Flag ON 100% producao. Rollout completo para todos os admins. | 0 P0/P1 em 48h canary, audit log funcional, runbook pronto |
| **v0.63.0** | MINOR/PATCH | 2026-05-25 (Semana 5+) | Cleanup: remocao do fallback hardcoded path (se decidido pelo architect/tech-lead) | Confianca >= 2 semanas com flag ON, zero incidentes |

### 3.2 Racional SemVer

- **MINOR** (nao MAJOR): todas as mudancas sao aditivas — nenhum contrato existente e violado, nenhuma interface publica e alterada. Pre-1.0, MINOR indica nova funcionalidade backward-compatible.
- **Nao PATCH**: nao e correcao de bug; e funcionalidade nova substancial.
- **1.0.0 nao se aplica**: API publica ainda nao estavel.

---

## 4. Plano de Rollout (3 Fases)

### Fase A — Staging (Semana 1: 2026-04-20 a 2026-04-27)

**Objetivo**: Validar que codigo dormente nao causa regressoes e que o sistema funciona corretamente com flag ON em ambiente controlado.

**Etapas**:
1. Deploy v0.60.0 com `AI_GOVERNANCE_V2=false` em staging
2. Rodar suite de testes completa (unit + E2E existentes)
3. Validar que geracao de IA funciona identicamente ao baseline (latencia, qualidade, custo)
4. Flip `AI_GOVERNANCE_V2=true` em staging
5. Rodar E2E completo conforme SPEC-QA-AI-GOVERNANCE-V2
6. Teste de propagacao real-time: alterar modelo via admin, validar que proxima geracao usa novo modelo
7. Teste de resiliencia: simular DB indisponivel, validar fallback hardcoded
8. Teste de audit log: validar que todas as operacoes geram entrada no log

**Criterios Go/No-Go para Fase B**:
- [ ] 0 bugs P0 abertos
- [ ] Latencia p90 de chamadas AI <= baseline + 50ms
- [ ] Trust Score gate funcional (SPEC-EVALS-V1 baseline >= 0.85)
- [ ] Todos os cenarios criticos do SPEC-QA-AI-GOVERNANCE-V2 PASS
- [ ] Teste de rollback executado com sucesso (flag OFF restaura comportamento v1)
- [ ] Audit log registrando corretamente por >= 24h

### Fase B — Canary Producao (Semana 2: 2026-04-28 a 2026-05-04)

**Objetivo**: Validar em producao real com subset controlado de admins.

**Etapas**:
1. Deploy v0.61.0 com `AI_GOVERNANCE_V2=true` em producao
2. Acesso restrito a 10% dos admins (via role `admin-canary` ou header)
3. Monitoramento ativo 48h: Sentry errors, latencia AI, volume de audit log, custo
4. Canal de feedback dedicado (Slack #ai-governance-canary)
5. Runbook de suporte ativo para incidentes

**Criterios de Promocao para Fase C**:
- [ ] 0 bugs P0/P1 em 48h de operacao
- [ ] Latencia p90 estavel (sem degradacao progressiva)
- [ ] Volume de audit log dentro do projetado (sem crescimento anomalo)
- [ ] Custo de polling DB dentro do estimado
- [ ] Feedback qualitativo positivo dos admins canary

### Fase C — Rollout Completo (Semana 3: 2026-05-05 a 2026-05-11)

**Objetivo**: Liberar para 100% dos admins com comunicacao e suporte.

**Etapas**:
1. Comunicacao pre-flip: email + Slack para todos os admins (ver Secao 7)
2. Flip `AI_GOVERNANCE_V2=true` para 100% admins
3. Deploy v0.62.0
4. Monitoramento intensivo 48h
5. Runbook de suporte ativo
6. Coleta de metricas: adocao (% admins que acessaram a aba), operacoes realizadas, prompts editados

---

## 5. Plano de Rollback

### 5.1 Rollback Rapido (< 5 minutos)

**Procedimento**: Alterar `AI_GOVERNANCE_V2=false` na variavel de ambiente e redeploy.

**Efeito**: O codigo v1 (hardcoded) volta a ser o path ativo. A aba de Governanca some do admin. Nenhum dado e perdido — as tabelas novas permanecem intactas, apenas nao sao consultadas.

**Limitacao**: Prompts e modelos editados via Central ficam orfaos (armazenados mas nao utilizados). Quando a flag for reativada, as configuracoes voltam a valer.

### 5.2 Rollback de Migracao

**Procedimento**: Script `down` da migration Prisma.

**Regras**:
- `AiAuditLog` **NAO e removida** pelo script `down` — tabela de auditoria e preservada por design (compliance)
- `ModelAssignment`, `PromptTemplate`, `PromptVersion`, `AiOutputCuration` sao removidas pelo `down`
- Constraints adicionadas em `PromptTemplate` (se houver FK para tabelas existentes) sao removidas
- Coluna `User.aiPermissions` e removida

**Requisito**: Teste de rollback de migracao obrigatorio em staging antes de qualquer deploy em producao.

### 5.3 Rollback Pos-Migracao com Dados

Se admins ja editaram prompts/modelos via Central e um rollback e necessario:
1. Flag OFF (rollback rapido) — dados ficam no DB mas nao sao usados
2. Se necessario reverter migracao: exportar `AiAuditLog` antes, executar `down`, reimportar audit log
3. Comunicar admins afetados sobre perda de configuracoes customizadas

---

## 6. Riscos

| Risk ID | Severidade | Descricao | Mitigacao | Owner | Prazo |
|---|---|---|---|---|---|
| R1 | MEDIO | **Polling DB vira gargalo em escala** — cada chamada AI faz query ao DB para resolver modelo/prompt, adicionando 5-20ms. Em escala, pode sobrecarregar pool de conexoes. | Migration path documentado: (1) Redis cache com TTL 60s, (2) in-memory cache com TTL 30s. Implementar quando p99 > 50ms. | architect | Monitorar pos-flip |
| R2 | MEDIO | **Admin promove prompt ruim apesar do eval gate** — eval gate valida metricas quantitativas mas nao captura todos os cenarios de qualidade. | Rollback 1-click no admin + alerta Sentry em qualquer promocao + curadoria de outputs permite revisao humana posterior. | prompt-engineer | Pre-flip |
| R3 | BAIXO | **Kill-switch ativado por engano** — admin desativa modelo/prompt acidentalmente. | Modal de confirmacao obrigatorio + alerta imediato no Slack/Sentry + rollback 1-click. | ux-designer | Pre-flip |
| R4 | BAIXO | **Audit log cresce rapido** — cada operacao gera entrada, volume pode ser significativo com muitos admins. | Retention policy 180 dias com archive para S3 cold storage. Implementar no cleanup (v0.63.0). | devops-engineer | v0.63.0 |
| R5 | MEDIO | **DB indisponivel durante geracao AI** — polling falha e fallback hardcoded ativa. Se fallback estiver desatualizado (admin mudou config via Central), usuario recebe output com config antiga. | Aceitar como comportamento esperado. Documentar na admin UI: "Em caso de indisponibilidade do banco, configuracoes anteriores ao ultimo deploy serao utilizadas temporariamente." | architect | Pre-flip |
| R6 | BAIXO | **Dessincronia entre RISK-017** — package.json (0.59.0) e git tag (v0.58.0) ja estao dessincronizados. Bump para v0.60.0 deve alinhar ambos. | Ao criar v0.60.0, garantir que tag git e package.json estejam alinhados. Resolver RISK-017 neste bump. | release-manager | v0.60.0 |

---

## 7. Comunicacao

### 7.1 Admins Existentes

**Pre-flip (T-7 dias da Fase C)**:
- Email com subject: "Nova Central de Governanca de IA — disponivel em [data]"
- Conteudo: o que e a Central, o que muda na rotina do admin, link para guia de onboarding
- Canal Slack #ai-governance para duvidas

**Dia do flip (T-0)**:
- Email de confirmacao: "Central de Governanca de IA esta ativa"
- Link direto para a aba no admin
- Runbook de suporte ativo por 48h

### 7.2 Viajante Final

**Nenhuma comunicacao** — as mudancas sao transparentes ao usuario final. A qualidade dos outputs pode melhorar progressivamente conforme admins refinam prompts, mas isso nao requer notificacao.

### 7.3 Changelog

Entradas devem ser adicionadas para:

**v0.60.0 (merge, flag OFF)**:

```markdown
## [0.60.0] — 2026-04-27

### Added
- [SPEC-PROD-AI-GOVERNANCE-V2] Central de Governanca de IA — gestao de modelos, prompts, curadoria e audit log (feature flag `AI_GOVERNANCE_V2`, default OFF)
- [SPEC-PROD-AI-GOVERNANCE-V2] Tabelas de dados: ModelAssignment, PromptTemplate, PromptVersion, AiAuditLog, AiOutputCuration
- [SPEC-PROD-AI-GOVERNANCE-V2] Seed automatico de ModelAssignment com configuracoes atuais hardcoded

### Changed
- [SPEC-PROD-AI-GOVERNANCE-V2] ai.service.ts: path condicional para leitura de modelo/prompt do DB (ativo apenas com flag ON)
```

**v0.62.0 (producao, flag ON)**:

```markdown
## [0.62.0] — 2026-05-11

### Changed
- [SPEC-PROD-AI-GOVERNANCE-V2] Feature flag `AI_GOVERNANCE_V2` ativada em producao — Central de Governanca de IA disponivel para todos os administradores
- [SPEC-PROD-AI-GOVERNANCE-V2] Configuracoes de modelo e prompt agora propagam em tempo real via banco de dados
```

---

## 8. Guia de Migracao para Admins

### 8.1 Como Editar Seu Primeiro Prompt

1. Acesse `/admin` e clique na aba **Governanca de IA**
2. Na secao **Prompt Templates**, localize o prompt que deseja editar (ex: "Guia de Destino")
3. Clique em **Editar** — uma nova versao (draft) sera criada automaticamente
4. Modifique o texto do prompt no editor
5. Clique em **Rodar Eval** — o sistema executara o SPEC-EVALS-V1 com o prompt modificado
6. Se o Trust Score >= 0.85, o botao **Promover** sera habilitado
7. Clique em **Promover** para ativar o prompt em producao (propagacao imediata, sem redeploy)

### 8.2 Onde Encontrar o Audit Log

- `/admin` > aba **Governanca de IA** > secao **Audit Log**
- Filtros disponiveis: por usuario, por tipo de operacao, por data
- Cada entrada mostra: quem, o que, quando, valor anterior e valor novo

### 8.3 Como Reverter uma Mudanca

1. No Audit Log, localize a entrada da mudanca que deseja reverter
2. Clique em **Reverter** — o sistema restaura a versao anterior do prompt/modelo
3. A reversao e registrada no audit log como uma nova entrada
4. Alternativa: na lista de versoes do prompt, clique em qualquer versao anterior para ativa-la

### 8.4 Como Rodar Eval Antes de Promover

1. No editor de prompt, clique em **Rodar Eval**
2. O sistema executa o Promptfoo com o dataset configurado (conforme SPEC-EVALS-V1)
3. Resultado: Trust Score por dimensao (qualidade, seguranca, i18n, custo)
4. Se alguma dimensao estiver abaixo do threshold, o prompt nao pode ser promovido
5. Revise e ajuste o prompt ate atingir o gate

---

## 9. Criterios Go/No-Go para Producao

Todos os criterios abaixo devem ser atendidos antes do flip em producao (Fase C):

| # | Criterio | Spec de Referencia | Owner |
|---|---|---|---|
| 1 | Trust Score baseline >= 0.85 em todos os prompts existentes | SPEC-EVALS-V1 | qa-engineer |
| 2 | Todos os cenarios criticos PASS no SPEC-QA-AI-GOVERNANCE-V2 | SPEC-QA-AI-GOVERNANCE-V2 | qa-engineer |
| 3 | Review de arquitetura aprovada | SPEC-ARCH-AI-GOVERNANCE-V2 | architect, tech-lead |
| 4 | Review de seguranca aprovada | SPEC-SEC-AI-GOVERNANCE-V2 (pendente) | security-specialist |
| 5 | Zero CVE em dependencias novas | — | security-specialist |
| 6 | Audit log testado e auditado por >= 24h em staging | SPEC-QA-AI-GOVERNANCE-V2 | qa-engineer |
| 7 | Runbook de incident response pronto | — | devops-engineer |
| 8 | Cenarios cobertos no runbook: DB down, Promptfoo fail, kill-switch preso, rollback de prompt | — | devops-engineer |
| 9 | Teste de rollback (flag OFF) executado com sucesso em staging | — | release-manager |
| 10 | 0 P0/P1 abertos apos 48h de canary (Fase B) | — | qa-engineer |
| 11 | Latencia p90 AI <= baseline + 50ms | — | devops-engineer |

---

## 10. Dependencias de Outras Specs

| Spec ID | Titulo | Status | Dependencia |
|---|---|---|---|
| SPEC-PROD-AI-GOVERNANCE-V2 | Central de Governanca de IA — Requisitos de Produto | Draft | Define funcionalidades, personas, acceptance criteria |
| SPEC-ARCH-AI-GOVERNANCE-V2 | Arquitetura da Central de Governanca de IA | Pendente | Define schema, endpoints, polling strategy, fallback |
| SPEC-UX-AI-GOVERNANCE-V2 | UX da Central de Governanca de IA | Pendente | Define layout, fluxos, componentes da aba admin |
| SPEC-AI-AI-GOVERNANCE-V2 | Impacto AI da Central de Governanca | Pendente | Avalia impacto em prompts existentes e custo |
| SPEC-QA-AI-GOVERNANCE-V2 | Estrategia de Testes — Central de Governanca | Pendente | Define cenarios criticos, datasets, criterios de aceitacao |
| SPEC-SEC-AI-GOVERNANCE-V2 | Revisao de Seguranca — Central de Governanca | Pendente | Valida RBAC, audit log, injection prevention |
| SPEC-EVALS-V1 | Metodologia de Avaliacao Continua com Promptfoo | Proposed | Baseline de Trust Score, framework de eval gate |
| ATLAS-SPEC-016-v2 | AI Governance Framework | Existente | Framework conceitual de governanca de IA |

**Bloqueadores**: SPEC-ARCH-AI-GOVERNANCE-V2 e SPEC-SEC-AI-GOVERNANCE-V2 devem estar aprovados antes do inicio da implementacao. SPEC-QA-AI-GOVERNANCE-V2 deve estar aprovado antes do inicio da Fase A.

---

## 11. Release Checklist (derivado de TEMPLATE-RELEASE-CHECKLIST.md)

### Pre-Release (v0.60.0)
- [ ] Todas as specs para Sprint 45 em status "Implemented"
- [ ] QA spec conformance audit passed
- [ ] Security review completada e aprovada
- [ ] 0 P0/P1 spec drift items abertos
- [ ] Todos os commits referenciam spec IDs
- [ ] Entradas de changelog referenciam spec IDs
- [ ] Version bump segue semver (MINOR — v0.59.0 -> v0.60.0)
- [ ] Build passa
- [ ] Todos os testes passam
- [ ] Lint limpo
- [ ] RISK-017 resolvido (package.json alinhado com tag git)

### Post-Release (v0.60.0)
- [ ] Tag criada (v0.60.0)
- [ ] Tag pushed to origin
- [ ] Sprint review document committed
- [ ] Spec status tracker atualizado
- [ ] Agent memories atualizados

### Post-Flip Producao (v0.62.0)
- [ ] Comunicacao enviada aos admins (T-7 e T-0)
- [ ] Runbook de suporte ativo
- [ ] Monitoramento 48h concluido
- [ ] Metricas de adocao coletadas
- [ ] Changelog v0.62.0 publicado

---

## 12. Change History

| Data | Versao Spec | Mudanca | Autor |
|---|---|---|---|
| 2026-04-17 | 1.0.0 | Criacao inicial do plano de release | release-manager |
