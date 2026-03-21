# Gamificacao Atlas PA — Prioridades e Plano de Waves

**Versao**: 1.0.0
**Data**: 2026-03-21
**Autor**: product-owner
**Status**: APROVADO PARA PLANEJAMENTO
**Spec principal**: `docs/specs/gamification/SPEC-PROD-GAMIFICATION.md`
**Economia**: `docs/specs/gamification/ATLAS-GAMIFICACAO-APROVADO.md`

---

## Resumo Executivo

O Atlas tem um backend de gamificacao completo (PointsEngine, PhaseEngine, badges, ranks) desde o Sprint 9, mas a camada de produto esta ausente: o usuario nao ve seu saldo, nao entende o sistema PA e nao sabe que esta ganhando e gastando pontos a cada acao.

Esta e uma lacuna critica pre-lancamento: um sistema de gamificacao que o usuario nao ve nao gera engajamento e nao gera receita.

O plano e entregar a gamificacao em 3 waves progressivas: MVP visivel (Sprint 35), experiencia completa (Sprint 36) e monetizacao (Sprint 37+).

---

## Contexto: O que ja existe no backend

| Componente | Status | Localizacao |
|---|---|---|
| PointsEngine (earn/spend/balance/history) | Completo | `src/lib/engines/points-engine.ts` |
| PhaseEngine (phase completion + rank + badge) | Completo | `src/lib/engines/phase-engine.ts` |
| WELCOME_BONUS (500 PA) | Implementado | `src/types/gamification.types.ts` |
| AI_COSTS (4 tipos) | Implementado | `src/types/gamification.types.ts` |
| EARNING_AMOUNTS (login, checklist, referral, review) | Implementado | `src/types/gamification.types.ts` |
| PROFILE_FIELD_POINTS (25 PA por campo) | Implementado | `src/types/gamification.types.ts` |
| PHASE_DEFINITIONS (8 fases com rewards e AI costs) | Implementado | `src/lib/engines/phase-config.ts` |
| Modelos Prisma (UserProgress, PointTransaction, UserBadge) | Implementado | schema.prisma |
| getTransactionHistory (paginado) | Implementado | PointsEngine |
| canAfford (verificacao de saldo) | Implementado | PointsEngine |

**O que falta: a camada de produto inteira.**

---

## Wave 1 — MVP Gamification (Sprint 35, Target: v0.30.0)

**Tema**: "PA Visivel — O usuario entende e confia no sistema"
**Budget estimado**: 24-32h
**Prerequisitos**: Sprint 34 completo (v0.29.0)

### Objetivo

Apos a Wave 1, qualquer usuario que abrir o Atlas deve:
1. Ver seu saldo PA no header imediatamente.
2. Receber o tutorial de boas-vindas no primeiro login.
3. Ser informado do custo ANTES de usar qualquer feature de IA.
4. Entender o que fazer quando o saldo e insuficiente.
5. Ter acesso a uma pagina explicando o sistema completo.

### Itens por Prioridade (Wave 1)

#### P0 — Nao negociavel

| Item | Spec | Esforco | Razao |
|---|---|---|---|
| Saldo PA no header | REQ-GAMI-001 | 6h | Sem isso, o sistema PA e invisivel — usuario nao sabe que tem 500 PA |
| Modal de confirmacao antes do gasto | REQ-GAMI-002 | 8h | Sem isso, PA e debitado silenciosamente — viola o principio de consentimento |
| Fluxo de saldo insuficiente | REQ-GAMI-003 | 6h | Sem isso, o usuario ve um erro enigmatico quando a IA falha por falta de PA |

#### P1 — Alta prioridade

| Item | Spec | Esforco | Razao |
|---|---|---|---|
| Tutorial de boas-vindas (3 passos) | REQ-GAMI-005 | 6h | Sem onboarding, usuarios novos nao entendem o que e PA nem que tem 500 |
| Pagina "Como Funciona o PA" | REQ-GAMI-004 | 4h | Transparencia legal e de produto — referenciada em todos os outros flows |

#### P2 — Desejavel na Wave 1

| Item | Spec | Esforco | Razao |
|---|---|---|---|
| Tooltip de custo in-line nos botoes de IA | REQ-GAMI-002 (complementar) | 2h | Reduz abandono no modal de confirmacao — usuario ja sabe o custo antes de clicar |

**Total estimado Wave 1**: 30-32h

### Criterios de GO/NO-GO para Wave 1

- [ ] Saldo PA visivel no header em 100% das paginas autenticadas
- [ ] Nenhum PA debitado sem modal de confirmacao
- [ ] Fluxo de saldo insuficiente testado manualmente (happy path + edge case zero saldo)
- [ ] Tutorial exibido no primeiro login e marcado como visto corretamente
- [ ] Pagina "Como Funciona o PA" com todos os valores consistentes com ATLAS-GAMIFICACAO-APROVADO.md
- [ ] Pass rate manual >= 95% nos cenarios de gamificacao
- [ ] Zero P0 bugs relacionados a debito incorreto de PA

### Ordem de Sacrificio (Wave 1)

Se o budget for insuficiente:
1. Primeiro a sair: Tooltip in-line (P2) — a informacao ainda aparece no modal
2. Segundo a sair: Tutorial de boas-vindas (P1 parcial) — pode ser entregue sem animacoes
3. Terceiro a sair: Pagina "Como Funciona" pode ser entregue como pagina simples sem design elaborado
4. NUNCA sacrificar: Saldo no header, modal de confirmacao, fluxo de saldo insuficiente

---

## Wave 2 — Full Gamification (Sprint 36, Target: v0.31.0)

**Tema**: "PA Engajante — Badges, conquistas e historico visivel"
**Budget estimado**: 28-36h
**Prerequisito**: Wave 1 completa e estavel

### Objetivo

Apos a Wave 2, o usuario deve:
1. Ver sua colecao de badges conquistados e os que pode conquistar.
2. Receber celebracao visual quando conquista um badge ou sobe de rank.
3. Ter acesso ao historico completo de suas transacoes PA.
4. Poder indicar amigos e acompanhar suas indicacoes.

### Itens por Prioridade (Wave 2)

#### P0 — Nao negociavel

| Item | Spec | Esforco | Razao |
|---|---|---|---|
| Grade de badges em "Meu Atlas" | REQ-GAMI-006 | 10h | Badges existem mas sao 100% invisiveis ao usuario — sem visibilidade, nao ha motivacao |
| Historico de transacoes PA | REQ-GAMI-008 | 8h | Usuario precisa auditar seus proprios PA — transparencia e confianca |

#### P1 — Alta prioridade

| Item | Spec | Esforco | Razao |
|---|---|---|---|
| Toast de conquista de badge | REQ-GAMI-007 | 4h | Sem feedback de conquista, badges sao descobertos ao acaso na grade |
| Toast de rank-up | REQ-GAMI-007 | 2h | Celebracao de progressao — retencao |

#### P2 — Desejavel

| Item | Spec | Esforco | Razao |
|---|---|---|---|
| Animacao de level-up | REQ-GAMI-009 | 4h | Experiencia premium — pode ser adiado sem impacto funcional |
| Sistema de indicacao (referral) | REQ-GAMI-010 | 8h | Alto impacto em aquisicao de usuarios — mas complexidade tecnica (anti-fraude) |

**Total estimado Wave 2**: 28-36h (sem referral: 20-28h)

### Criterios de GO/NO-GO para Wave 2

- [ ] Grade de badges exibindo todos os 8 badges ativos (excluindo `host` legado)
- [ ] Badge `identity_explorer` com progresso numerico correto
- [ ] Toast de conquista exibido em <= 500ms apos o evento
- [ ] Historico paginado com descricoes legivel em linguagem natural
- [ ] Animacoes respeitam `prefers-reduced-motion`
- [ ] Zero regressoes nos criterios de GO/NO-GO da Wave 1

### Ordem de Sacrificio (Wave 2)

1. Primeiro a sair: Animacao de level-up (Could Have — apenas visual)
2. Segundo a sair: Sistema de referral (complexidade alta — pode ir para Sprint 38)
3. NUNCA sacrificar: Grade de badges e historico de transacoes

---

## Wave 3 — Monetizacao (Sprint 37+, Target: v0.32.0+)

**Tema**: "PA Monetizavel — O usuario pode comprar PA quando quiser"
**Budget estimado**: 40-60h (dependente do gateway de pagamento escolhido)
**Prerequisito**: Wave 1 + Wave 2 completas; Gateway de pagamento contratado; security-specialist review aprovado

### Bloqueadores Conhecidos (devem ser resolvidos antes de iniciar Sprint 37)

| Bloqueador | Responsavel | Status |
|---|---|---|
| Escolha do gateway de pagamento | product-owner + CTO | PENDENTE |
| PCI-DSS scope review | security-specialist | Nao iniciado |
| Admin role no sistema de autorizacao | architect | Nao iniciado |
| Politica de reembolso legal (CDC) | juridico/PO | Nao iniciado |

### Itens por Prioridade (Wave 3)

#### P0 — Nao negociavel

| Item | Spec | Esforco | Razao |
|---|---|---|---|
| Pagina de compra de pacotes PA | REQ-GAMI-011 | 16h | Monetizacao — razao de ser da Wave 3 |
| Integracao com gateway de pagamento | REQ-GAMI-011 | 16h | Dependencia critica |
| Webhook de confirmacao de pagamento | REQ-GAMI-011 | 8h | PA so e creditado apos confirmacao do gateway — nao antes |

#### P1 — Alta prioridade

| Item | Spec | Esforco | Razao |
|---|---|---|---|
| Dashboard admin de PA | REQ-GAMI-012 | 12h | Gestao da economia PA pelo PO — necessario apos lancamento |

#### P2 — Desejavel

| Item | Spec | Esforco | Razao |
|---|---|---|---|
| Relatorio de receita PA | REQ-GAMI-013 | 8h | Business intelligence — pode usar ferramenta externa inicialmente |

**Total estimado Wave 3**: 40-60h (excluindo relatorio)

### Criterios de GO/NO-GO para Wave 3

- [ ] Pagamento testado em sandbox (sucesso, falha, timeout, chargeback)
- [ ] PA nunca creditado antes da confirmacao do gateway
- [ ] Dados de cartao nunca chegam aos servidores do Atlas
- [ ] security-specialist aprovou a integracao
- [ ] Politica de reembolso implementada e documentada na UI
- [ ] Admin dashboard acessivel apenas por usuarios ADMIN
- [ ] Zero regressoes nos criterios de GO/NO-GO das Waves 1 e 2

---

## Scorecard de Prioridade — MoSCoW por Item

| Item | Wave | MoSCoW | Pain (30%) | Revenue (25%) | Effort inv (20%) | Align (15%) | Diff (10%) | Score |
|---|---|---|---|---|---|---|---|---|
| Saldo PA no header | 1 | Must | 5 | 4 | 5 | 5 | 4 | 4.70 |
| Modal confirmacao PA | 1 | Must | 5 | 5 | 4 | 5 | 5 | 4.80 |
| Fluxo saldo insuficiente | 1 | Must | 5 | 5 | 4 | 5 | 4 | 4.70 |
| Tutorial boas-vindas | 1 | Must | 4 | 4 | 4 | 5 | 3 | 4.05 |
| Pagina "Como Funciona" | 1 | Must | 3 | 3 | 5 | 5 | 2 | 3.65 |
| Grade de badges | 2 | Should | 4 | 3 | 3 | 5 | 4 | 3.75 |
| Toast de conquista | 2 | Should | 3 | 3 | 4 | 4 | 3 | 3.35 |
| Historico de transacoes | 2 | Should | 4 | 2 | 3 | 5 | 3 | 3.50 |
| Animacao level-up | 2 | Could | 2 | 2 | 3 | 3 | 3 | 2.55 |
| Sistema de referral | 2 | Could | 3 | 5 | 2 | 4 | 4 | 3.65 |
| Compra de pacotes PA | 3 | Must | 4 | 5 | 2 | 5 | 5 | 4.20 |
| Dashboard admin PA | 3 | Should | 3 | 4 | 2 | 5 | 3 | 3.45 |
| Relatorio de receita | 3 | Could | 2 | 4 | 2 | 4 | 2 | 2.90 |

---

## Dependencias entre Times

### product-owner deve aprovar antes de cada wave iniciar

- Wave 1: Aprovacao do documento `ATLAS-GAMIFICACAO-APROVADO.md` (feito nesta sessao)
- Wave 2: Revisao do resultado da Wave 1 e metricas de engajamento
- Wave 3: Escolha do gateway de pagamento + aprovacao da politica de reembolso

### security-specialist deve revisar

- Wave 1: Atomicidade das transacoes PA (verificar que rollback funciona corretamente)
- Wave 3: Integracao de pagamento (PCI-DSS scope, nenhum dado de cartao nos servidores)

### finops-engineer deve ser consultado

- Antes da Wave 1: Estimar impacto de custo do saldo PA em cache Redis (TTL 30s)
- Antes da Wave 3: Estimar custos de gateway de pagamento por transacao

### prompt-engineer deve ser consultado

- Wave 1: Garantir que o modal de confirmacao nao adiciona latencia perceptivel antes da chamada de IA
- Verificar que o fluxo de estorno de PA por falha de IA esta correto no prompt flow

---

## Metricas de Acompanhamento por Wave

### Wave 1 — Metricas de Visibilidade

| Metrica | Target | Ferramenta |
|---|---|---|
| % de usuarios que viram o tutorial | >= 85% dos novos usuarios | Analytics |
| % de usuarios que completaram o tutorial | >= 70% dos que iniciaram | Analytics |
| Taxa de abandono no modal de confirmacao | <= 25% | Analytics |
| Erros INSUFFICIENT_POINTS no servidor | <= 1% das chamadas de IA | Monitoring |

### Wave 2 — Metricas de Engajamento

| Metrica | Target | Ferramenta |
|---|---|---|
| % de usuarios que acessaram "Meu Atlas" badges | >= 40% dos ativos | Analytics |
| % de usuarios com pelo menos 1 badge | >= 70% dos ativos | DB query |
| Usuarios que atingiram rank Explorer | >= 40% apos 30 dias | DB query |

### Wave 3 — Metricas de Monetizacao

| Metrica | Target | Ferramenta |
|---|---|---|
| Conversao insuficiente -> compra | >= 5% | Analytics |
| Ticket medio por compra | >= R$ 29,90 (pacote Navegador) | Payment analytics |
| Churn de usuarios pagantes | <= 20% mensal | Analytics |

---

## Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|---|---|---|---|
| WELCOME_BONUS de 500 PA e muito generoso — usuario nunca compra PA | Media | Alto | Monitorar taxa de conversao apos Wave 3. Se > 90% dos usuarios nunca ficam com saldo negativo, revisar o bonus (com aviso previo de 30 dias). |
| Modal de confirmacao gera friccao e reduz uso de IA | Media | Medio | A/B test na Wave 2: testar "nao mostrar novamente por 7 dias" para usuarios com historico de confirmacao. |
| Anti-fraude do referral e mais complexo que estimado | Alta | Medio | Mover referral para Sprint 38 se necessario. A economia PA funciona sem referral. |
| Gateway de pagamento nao escolhido antes do Sprint 37 | Media | Alto | Se nao escolhido ate Sprint 36 inicio, adiar Wave 3 para Sprint 38. Nao iniciar integracao sem contrato assinado. |
| Usuarios nao entendem a diferenca entre totalPoints (rank) e availablePoints (gasto) | Alta | Medio | Comunicacao clara na pagina "Como Funciona" e no historico: separar "pontos de progresso" de "PA disponivel". |

---

## Proximo Passo Imediato

Antes de iniciar o Sprint 35, o tech-lead deve:

1. Confirmar que o backend de gamificacao esta 100% funcional em staging (PointsEngine, PhaseEngine, WELCOME_BONUS credito no registro).
2. Verificar se o modal system atual (Sprint 34) suporta os modais de confirmacao PA ou se precisa ser extendido.
3. Consultar o finops-engineer sobre custo do cache de saldo PA no Redis.
4. Criar tarefas no backlog de desenvolvimento referenciando REQ-GAMI-001 a REQ-GAMI-005.

---

## Historico de Revisoes

| Versao | Data | Autor | Descricao |
|---|---|---|---|
| 1.0.0 | 2026-03-21 | product-owner | Documento inicial — 3 waves definidas |
