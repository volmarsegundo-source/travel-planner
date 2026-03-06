# Sprint 9 — Planejamento do Product Owner

**Versao**: 1.0.0
**Data**: 2026-03-05
**Autor**: product-owner
**Versao do produto**: 0.8.0 (469 testes, 0 falhas)
**Sprints concluidos**: 1 a 8
**Branch base**: `master` (pos-merge Sprint 8)
**Roadmap aprovado**: Sprint 9 = User Tier (Free/Premium) + Integracao Gemini Flash

---

## 1. Visao do Sprint 9 — "IA para Todos"

### 1.1 Tema

**Democratizacao do acesso a IA no Travel Planner.** O Sprint 8 conectou todas as features existentes end-to-end (Trip Hub, health check, debitos tecnicos). Agora, o Sprint 9 viabiliza o modelo de negocio freemium: usuarios gratuitos acessam a geracao de planos via Gemini Flash (custo zero para o projeto), enquanto usuarios premium mantem acesso ao Claude Sonnet (qualidade superior).

### 1.2 Objetivo

Implementar o conceito de **User Tier** (Free / Premium) no backend e frontend, integrar o **Google Gemini Flash** como provider de IA para o tier gratuito, e resolver dividas tecnicas de seguranca pendentes dos sprint reviews anteriores.

### 1.3 Valor para o Usuario

| Persona | Valor |
|---------|-------|
| @leisure-solo (novo usuario) | Pode gerar planos de viagem com IA **sem custo algum**, reduzindo a barreira de entrada a zero |
| @leisure-family (usuario recorrente) | Experimenta o produto gratuitamente e, se quiser qualidade superior, pode fazer upgrade para Premium |
| @business-traveler (exigente) | Mantem acesso ao Claude Sonnet com resultados mais detalhados e contextualizados |
| Proprietario do produto | Modelo freemium sustentavel: custo de IA do tier gratuito e ~55-63% menor que Claude; tier Premium gera receita |

### 1.4 Alinhamento Estrategico

A visao do produto e: *"Diga para onde vai e quando -- a IA monta seu plano e checklist em 60 segundos."* Ate o Sprint 8, isso so era possivel com `ANTHROPIC_API_KEY` configurada (custo por chamada). O Sprint 9 remove essa barreira: qualquer usuario cadastrado pode gerar planos imediatamente com Gemini Flash, e o projeto nao incorre custo ate atingir os limites do free tier Google (15 req/min, 1000 req/dia com Gemini 2.5 Flash).

---

## 2. User Stories Priorizadas

### 2.1 Scoring Matrix

| Item | Pain (30%) | Revenue (25%) | Effort inv. (20%) | Strategic (15%) | Competitive (10%) | Score |
|------|-----------|--------------|-------------------|----------------|-------------------|-------|
| US-112 (User Tier) | 4 (1.20) | 5 (1.25) | 3 (0.60) | 5 (0.75) | 5 (0.50) | **4.30** |
| US-113 (Gemini Provider) | 5 (1.50) | 5 (1.25) | 3 (0.60) | 5 (0.75) | 5 (0.50) | **4.60** |
| US-114 (Indicador de tier) | 3 (0.90) | 4 (1.00) | 4 (0.80) | 4 (0.60) | 4 (0.40) | **3.70** |
| DEBT-bundle (seguranca) | 4 (1.20) | 2 (0.50) | 4 (0.80) | 5 (0.75) | 2 (0.20) | **3.45** |

### 2.2 Ordem de Priorizacao

| # | Item | MoSCoW | Score | Justificativa |
|---|------|--------|-------|---------------|
| 1 | US-113: Integracao Gemini Flash | Must Have | 4.60 | Sem Gemini, nao ha tier gratuito. Bloqueante para o modelo freemium. |
| 2 | US-112: User Tier (Free/Premium) | Must Have | 4.30 | Define a infraestrutura de tiers que o provider factory consome. |
| 3 | US-114: Indicador de tier na UI | Should Have | 3.70 | O usuario precisa saber qual tier esta usando e o que ganha com upgrade. |
| 4 | Dividas tecnicas de seguranca | Should Have | 3.45 | FIND-S8-M-001/002/003 sao riscos medios que acumulam ha 1 sprint. |

---

### US-112: User Tier — Free e Premium

**MoSCoW**: Must Have
**Business Value**: Habilita modelo freemium; base para toda monetizacao futura
**Effort**: M

#### User Story

> As a usuario do Travel Planner (@leisure-solo, @leisure-family),
> I want to ter um tier associado a minha conta (Free ou Premium),
> So that o sistema saiba qual provider de IA usar e quais limites aplicar a mim.

#### Contexto do Viajante

- **Pain point**: Hoje, todos os usuarios dependem de `ANTHROPIC_API_KEY` para gerar planos. Sem a chave, a IA nao funciona. Nao ha distincao entre quem paga e quem nao paga.
- **Workaround atual**: O operador do sistema precisa configurar e pagar pela API key Anthropic para todos os usuarios indistintamente.
- **Frequencia**: Impacta 100% dos novos cadastros que tentam gerar um plano pela primeira vez.

#### Criterios de Aceite

- [ ] AC-001: Modelo `User` no Prisma possui campo `tier` do tipo enum (`FREE`, `PREMIUM`) com default `FREE`
- [ ] AC-002: Migration Prisma criada e aplicavel sem perda de dados (todos os usuarios existentes recebem `FREE`)
- [ ] AC-003: O campo `tier` e exposto na sessao JWT (`session.user.tier`) via callback `jwt` e `session` do Auth.js
- [ ] AC-004: Server Action `getUserTier(userId)` retorna o tier do usuario autenticado (BOLA-safe)
- [ ] AC-005: A factory `getProvider()` em `ai.service.ts` aceita parametro `userTier` e retorna `GeminiProvider` para `FREE` ou `ClaudeProvider` para `PREMIUM`
- [ ] AC-006: Se `ANTHROPIC_API_KEY` nao estiver configurada e o usuario for `PREMIUM`, retornar erro claro `errors.premiumUnavailable` (graceful degradation)
- [ ] AC-007: Se `GOOGLE_AI_API_KEY` nao estiver configurada e o usuario for `FREE`, retornar erro claro `errors.freeUnavailable`
- [ ] AC-008: Rate limits diferenciados por tier: Free = 5 planos/hora + 3 checklists/hora; Premium = 10 planos/hora + 5 checklists/hora
- [ ] AC-009: Testes unitarios para a factory `getProvider(tier)` cobrindo: FREE -> Gemini, PREMIUM -> Claude, fallback quando key ausente
- [ ] AC-010: Campo `tier` nunca exposto em logs (PII policy — tratar como dado de assinatura)

#### Fora do Escopo (v1)

- Fluxo de upgrade Free -> Premium (Sprint 10+)
- Integracao com gateway de pagamento (Stripe, etc.)
- Trial period / tier temporario
- Tier `ENTERPRISE` ou `TEAM`

#### Metricas de Sucesso

- 100% dos novos usuarios recebem tier FREE automaticamente
- Factory retorna provider correto em 100% dos testes
- Zero erros de runtime por tier ausente na sessao

---

### US-113: Integracao Google Gemini Flash como AI Provider

**MoSCoW**: Must Have
**Business Value**: Reduz custo de IA para usuarios Free em ~55-63%; habilita operacao sem ANTHROPIC_API_KEY
**Effort**: L

#### User Story

> As a usuario do tier Free (@leisure-solo, @leisure-family),
> I want to gerar planos de viagem e checklists usando Gemini Flash,
> So that eu possa usar todas as features de IA sem que o projeto incorra custos com API paga.

#### Contexto do Viajante

- **Pain point**: Sem Gemini, o tier Free nao tem provider de IA. O usuario Free veria uma mensagem de erro ao tentar gerar planos.
- **Workaround atual**: Nenhum. Hoje so existe o ClaudeProvider.
- **Frequencia**: 100% dos usuarios Free ao tentarem gerar seu primeiro plano.

#### Criterios de Aceite

- [ ] AC-001: Dependencia `@google/genai` instalada (SDK oficial Google Gen AI, versao estavel >= 1.x)
- [ ] AC-002: Classe `GeminiProvider` implementa a interface `AiProvider` existente (name, generateResponse)
- [ ] AC-003: Modelo usado para planos: `gemini-2.5-flash` (ou `gemini-2.0-flash` se 2.5 nao estiver disponivel)
- [ ] AC-004: Modelo usado para checklists: `gemini-2.5-flash` (mesmo modelo, custo menor que Claude Haiku)
- [ ] AC-005: Timeout de 90 segundos (mesmo que ClaudeProvider)
- [ ] AC-006: Mapeamento de erros Gemini para AppError: autenticacao (401), rate limit (429), modelo nao encontrado (404), timeout (504)
- [ ] AC-007: Response inclui `inputTokens` e `outputTokens` (Gemini retorna `usageMetadata`)
- [ ] AC-008: Deteccao de truncamento: verificar se `finishReason === "MAX_TOKENS"` e setar `wasTruncated = true`
- [ ] AC-009: `GOOGLE_AI_API_KEY` validada em `env.ts` com `z.string().optional()` (ja existe, verificar prefixo se aplicavel)
- [ ] AC-010: GeminiProvider usa singleton pattern (mesmo approach que ClaudeProvider com `globalThis`)
- [ ] AC-011: Testes unitarios isolados para GeminiProvider (mock do SDK, cenarios de sucesso, erro, truncamento)
- [ ] AC-012: Testes de integracao: factory retorna GeminiProvider para FREE, gera plano com mock, valida schema Zod do output
- [ ] AC-013: Cache key permanece o mesmo independente do provider (mesma logica de hash por destination+style+budget+days+language)
- [ ] AC-014: Se Gemini retornar JSON dentro de code fences ou com texto extra, `extractJsonFromResponse` existente deve funcionar (verificar compatibilidade)

#### Decisoes Tecnicas (para validacao pelo architect)

1. **SDK**: Usar `@google/genai` (novo SDK, GA desde maio 2025) em vez do legado `@google/generative-ai`
2. **Modelo**: Gemini 2.5 Flash (preco: $0.30/M input, $2.50/M output) vs Claude Sonnet ($3/M input, $15/M output) = **~90% economia em input, ~83% em output** para o tier Free
3. **Free tier Google**: 15 req/min, 1000 req/dia com Gemini 2.5 Flash -- suficiente para MVP alpha/beta
4. **Privacidade**: No free tier Google, prompts **podem ser usados para melhoria do modelo**. Isso deve ser informado ao usuario Free nos termos de uso. Para Premium (Claude), prompts nao sao usados para treinamento.

#### Fora do Escopo (v1)

- Streaming de resposta (SSE/WebSocket)
- Prompt caching Gemini (context caching)
- Fallback automatico Gemini -> Claude em caso de erro
- A/B testing entre providers

#### Metricas de Sucesso

- Gemini gera planos validados pelo schema Zod existente em >= 95% das chamadas
- Tempo medio de geracao com Gemini <= 30 segundos (Flash e mais rapido que Sonnet)
- Zero chamadas a Anthropic API para usuarios do tier Free

---

### US-114: Indicador de Tier na Interface do Usuario

**MoSCoW**: Should Have
**Business Value**: Transparencia com o usuario; prepara o terreno para upgrade flow
**Effort**: S

#### User Story

> As a usuario autenticado (@leisure-solo, @leisure-family, @business-traveler),
> I want to ver claramente qual tier estou usando (Free ou Premium) e qual IA gera meus planos,
> So that eu entenda o valor do upgrade e saiba o que esperar da qualidade da geracao.

#### Contexto do Viajante

- **Pain point**: Se o usuario nao sabe que esta no tier Free, pode se frustrar com a qualidade dos planos gerados pelo Gemini sem entender que existe opcao melhor.
- **Workaround atual**: Nenhum. Nao existe indicacao de tier na UI.
- **Frequencia**: Visivel em toda sessao autenticada.

#### Criterios de Aceite

- [ ] AC-001: Badge de tier visivel na pagina de perfil (/account): "Free" com icone ou "Premium" com icone
- [ ] AC-002: Badge de tier visivel no UserMenu dropdown (ao lado do nome)
- [ ] AC-003: Na tela de geracao de plano (/generate), texto informativo: "Seu plano sera gerado por [Gemini Flash / Claude Sonnet]" com icone do provider
- [ ] AC-004: Para tier Free, CTA discreto (nao invasivo) sugerindo upgrade: "Quer planos mais detalhados? Saiba mais sobre o Premium" (link para pagina futura -- pode apontar para /account por enquanto)
- [ ] AC-005: Textos via i18n (PT-BR e EN) -- namespace `tier`
- [ ] AC-006: Badge estilizado de forma distinta: Free = cinza/neutro, Premium = dourado/destaque
- [ ] AC-007: WCAG 2.1 AA: badge com contraste adequado, aria-label descritivo
- [ ] AC-008: Mobile 375px: badge nao quebra layout da navbar ou perfil

#### Fora do Escopo (v1)

- Pagina de comparacao de tiers (Free vs Premium)
- Botao funcional de upgrade (depende de integracao com pagamento)
- Animacoes ou gamificacao de tier

#### Metricas de Sucesso

- 100% dos usuarios veem o badge de tier em /account e no UserMenu
- CTA de upgrade visivel em >= 80% das sessoes de usuarios Free na tela de geracao

---

## 3. Dividas Tecnicas a Resolver neste Sprint

### 3.1 Dividas de Seguranca (provenientes do Sprint 8 review)

| ID | Descricao | Severidade | Effort | Justificativa para entrar no Sprint 9 |
|----|-----------|-----------|--------|---------------------------------------|
| FIND-S8-M-001 | Falta validacao Zod server-side para `travelStyle`, `budgetTotal`, `budgetCurrency` no action | Media | S | O `generateTravelPlanAction` recebe esses campos do client sem validacao Zod no server. Com Gemini adicionado, o risco dobra (dois providers recebendo input nao validado). |
| FIND-S8-M-002 | `travelNotes` interpolado no prompt sem defesa contra prompt injection | Media | S | O `travelNotes` do usuario e inserido diretamente no prompt. Com dois providers, o vetor de ataque se amplia. Mitigacao: separar system message de user message. |
| FIND-S8-M-003 | Singleton Anthropic com `apiKey: ""` quando env ausente | Media | XS | `getAnthropic()` cria instancia com string vazia se key nao existe. Com o tier system, isso so deve ocorrer para Premium sem key -- deve ser guard clause antes de criar singleton. |
| FIND-S8-L-002 | `GOOGLE_AI_API_KEY` sem validacao de prefixo em env.ts | Baixa | XS | Agora que Gemini sera usado em producao, validar que a key tem formato esperado. |

### 3.2 Dividas Arquiteturais

| ID | Descricao | Effort | Justificativa |
|----|-----------|--------|---------------|
| DEBT-S8-001 | ADR-008 nao documentado (AI Provider Abstraction pattern) | XS | O pattern existe desde Sprint 8 mas nao esta documentado em `docs/architecture.md`. Com GeminiProvider adicionado, a ADR precisa existir. |
| DT-S8-002 | `getProvider()` nao recebe `userTier` | S | Ja planejado para Sprint 9 (faz parte de US-112). |

### 3.3 Dividas de Observabilidade

| ID | Descricao | Effort | Justificativa |
|----|-----------|--------|---------------|
| OPT-S8-005 | Logar token usage do provider response | XS | `AiProviderResponse` ja retorna `inputTokens`/`outputTokens`. Falta logar no `ai.service.ts`. Essencial para FinOps com dois providers. |
| OPT-S8-001 | Normalizar travelNotes antes do hash (cache key) | XS | Melhoria de cache hit rate estimada em +5-10%. Trivial de implementar junto com as outras mudancas no ai.service.ts. |

### 3.4 Resumo de Dividas

| Categoria | Quantidade | Effort total |
|-----------|-----------|-------------|
| Seguranca | 4 itens | S + S + XS + XS = ~M |
| Arquitetura | 2 itens | XS + S (absorvido em US-112) |
| Observabilidade | 2 itens | XS + XS |
| **Total** | **8 itens** | **~L** |

---

## 4. O Que NAO Entra no Sprint 9 — e Por Que

| Item | Razao para exclusao |
|------|---------------------|
| **Upgrade Flow (Free -> Premium)** | Requer integracao com gateway de pagamento (Stripe ou similar). Complexidade PCI-DSS. Sprint 10+ conforme roadmap. |
| **US-009: Orcamento por categoria** | Era o tema original do Sprint 9 no roadmap de Janeiro. Repriorizado: o modelo freemium e mais urgente para viabilidade do produto. Orcamento vai para Sprint 10 ou 11. |
| **US-011: Registrar gasto** | Depende de US-009 (orcamento). Segue junto. |
| **US-012: Dashboard planejado vs. gasto** | Depende de US-009 e US-011. |
| **US-013: Alertas de estouro** | Depende de todo o bloco financeiro. |
| **US-010: Links para passagens/hotel** | Feature complementar, nao bloqueante. Pode entrar em Sprint 10+ junto com orcamento. |
| **US-014: Ajustar plano on-the-go** | Otimizacao mobile. O editor de itinerario ja funciona em mobile. Polimento futuro. |
| **OPT-S8-003: Prompt caching Anthropic** | Economia de ~40% em input tokens do Claude. Valioso, mas so afeta tier Premium. Pode entrar como otimizacao posterior. |
| **Fallback Gemini -> Claude** | Complexidade de orquestracao. Se Gemini falhar, o usuario Free ve mensagem de erro e tenta novamente. Resilience pattern pode vir em Sprint 10+. |
| **A/B testing entre providers** | Requer infraestrutura de feature flags. Nao temos PostHog configurado. Sprint futuro. |
| **Streaming de resposta (SSE)** | Melhoria de UX significativa, mas complexidade de implementacao alta (Next.js Server Components + streaming). Deferred. |
| **BUG-S7-004: Footer links 404** | Se nao foi resolvido no Sprint 8, verificar. Se ainda pendente, e P2 e pode esperar Sprint 10. |
| **FIND-S8-L-001: TripUpdateSchema sem refine endDate >= startDate** | Baixa severidade. Backlog geral. |

### Justificativa da Reprioracao (Orcamento -> Tiers)

O roadmap original de Janeiro previa Sprint 9 = Orcamento + Gastos. A reprioracao se justifica por tres razoes:

1. **Viabilidade economica**: Sem modelo freemium, cada usuario custa ~$0.01-0.03 por geracao de plano (Claude). Com 100 usuarios gerando 3 planos cada = ~$9/mes so em IA. Com Gemini Flash no free tier, esse custo vai a ~$0 (dentro do free tier Google).

2. **Barreira de entrada**: Sem `ANTHROPIC_API_KEY`, a IA simplesmente nao funciona. O Sprint 8 tornou a key opcional no build, mas a IA continua inacessivel sem key. O Gemini Flash resolve isso: `GOOGLE_AI_API_KEY` no free tier e gratuita e nao tem custo por chamada.

3. **Competitividade**: Concorrentes como Wanderlust, TripPlanner AI e Mindtrip oferecem tier gratuito com IA. Sem free tier, o Travel Planner perde na fase de aquisicao.

O bloco financeiro (US-009, US-011, US-012, US-013) se move para **Sprint 10**, mantendo a visao do roadmap intacta com 1 sprint de atraso.

---

## 5. Riscos e Dependencias

### 5.1 Riscos

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| **R-001**: Gemini Flash gera JSON invalido ou com formato diferente do esperado pelo schema Zod | Media | Alto | Testar extensivamente com prompts reais. `extractJsonFromResponse` ja lida com code fences e JSON parcial. Adicionar testes especificos para output Gemini. |
| **R-002**: Free tier Google com rate limits insuficientes apos reducao de Dec 2025 | Media | Medio | Rate limits atuais: 15 req/min, 1000 req/dia. Cache Redis 24h mitiga volume. Monitorar 429s. Se necessario, migrar para pay-as-you-go ($0.30/M tokens). |
| **R-003**: Privacidade: Google pode usar prompts do free tier para treinamento | Baixa | Medio | Documentar nos termos de uso. Nao enviar PII nos prompts (ja nao enviamos). Tier Premium usa Claude (sem treinamento em dados). |
| **R-004**: Qualidade do Gemini Flash inferior ao Claude Sonnet para itinerarios | Media | Medio | Esperado e aceito. O tier Free oferece qualidade "boa o suficiente". Usuarios que desejam qualidade superior fazem upgrade. |
| **R-005**: Migration Prisma com novo enum `UserTier` falha em ambientes existentes | Baixa | Alto | Default `FREE` garante que todos os usuarios existentes recebem tier automaticamente. Testar migration em banco de dev antes de aplicar. |
| **R-006**: JWT token size aumenta com campo `tier` | Baixa | Baixo | Um campo enum adiciona ~20 bytes ao JWT. Impacto negligivel. |
| **R-007**: Dependencia `@google/genai` com vulnerabilidades ou instabilidade | Baixa | Medio | SDK esta em GA desde maio 2025 (versao 1.x). Auditar com `npm audit` antes de instalar. Fixar versao no package.json (sem caret). |

### 5.2 Dependencias

| Dependencia | Tipo | Status | Impacto se falhar |
|-------------|------|--------|-------------------|
| `@google/genai` SDK (npm) | Externa | Disponivel (v1.44.0) | Bloqueante para US-113 |
| `GOOGLE_AI_API_KEY` no `.env.local` | Configuracao | Preparada desde Sprint 8 (campo no env.ts) | Bloqueante para testes manuais do Gemini |
| Free tier Google AI | Servico externo | Ativo (com rate limits reduzidos desde Dec 2025) | Nao bloqueante para dev (pay-as-you-go disponivel) |
| Prisma migration (campo `tier`) | Interna | A criar | Bloqueante para US-112 |
| Interface `AiProvider` (Sprint 8) | Interna | Pronta | Base para GeminiProvider |
| `extractJsonFromResponse` (ai.service.ts) | Interna | Pronta | Reusar para output do Gemini |

### 5.3 Dependencias entre User Stories

```
US-112 (User Tier) ─────────────────────────────┐
  |                                               |
  v                                               |
US-113 (Gemini Provider) ──> Depende de US-112   |
  |                          (factory precisa     |
  |                           do parametro tier)  |
  v                                               |
US-114 (Indicador UI) ──> Depende de US-112      |
                          (precisa de             |
                           session.user.tier)     |
                                                  |
DEBT-bundle (seguranca) ──> Independente ────────┘──> T-QA (QA final)
```

---

## 6. Estimativa de Tarefas

### 6.1 Tarefas Detalhadas

| # | Task | Story/Debt | Tipo | Dev | Effort | Prioridade |
|---|------|-----------|------|-----|--------|-----------|
| T-082 | Prisma: enum `UserTier`, campo `tier` no User, migration | US-112 | Backend | dev-fullstack-1 | S | P0 |
| T-083 | Auth.js: expor `tier` na sessao JWT (callbacks jwt + session) | US-112 | Backend | dev-fullstack-1 | S | P0 |
| T-084 | Factory `getProvider(tier)` + rate limits diferenciados por tier | US-112 | Backend | dev-fullstack-1 | M | P0 |
| T-085 | `GeminiProvider` — implementar interface `AiProvider` com `@google/genai` | US-113 | Backend | dev-fullstack-1 | L | P0 |
| T-086 | Testes unitarios GeminiProvider (mock SDK, sucesso, erro, truncamento) | US-113 | Teste | dev-fullstack-1 | M | P0 |
| T-087 | Testes integracao: factory + provider + schema validation end-to-end (mock) | US-112/113 | Teste | dev-fullstack-1 | M | P0 |
| T-088 | Badge de tier na UI: /account, UserMenu, /generate | US-114 | Frontend | dev-fullstack-2 | S | P1 |
| T-089 | Chaves i18n namespace `tier` (PT-BR e EN) + CTA upgrade discreto | US-114 | Frontend | dev-fullstack-2 | XS | P1 |
| T-090 | Zod validation completa no `generateTravelPlanAction` (travelStyle, budgetTotal, budgetCurrency) | FIND-S8-M-001 | Debt | dev-fullstack-2 | S | P1 |
| T-091 | Prompt injection defense: separar system message de user message em ambos os providers | FIND-S8-M-002 | Debt | dev-fullstack-1 | S | P1 |
| T-092 | Guard clause no singleton Anthropic (nao criar com apiKey vazia) | FIND-S8-M-003 | Debt | dev-fullstack-2 | XS | P1 |
| T-093 | Validacao de prefixo GOOGLE_AI_API_KEY em env.ts (se aplicavel) + ADR-008 | FIND-S8-L-002 + DEBT-S8-001 | Debt | dev-fullstack-2 | XS | P2 |
| T-094 | Logar token usage (inputTokens, outputTokens, provider name) no ai.service.ts | OPT-S8-005 | Debt | dev-fullstack-2 | XS | P2 |
| T-095 | Normalizar travelNotes antes do hash (trim, lowercase, remove extra spaces) | OPT-S8-001 | Debt | dev-fullstack-2 | XS | P2 |
| T-096 | QA e validacao final Sprint 9 | ALL | QA | qa-engineer | L | P0 |

### 6.2 Resumo de Esforco

| Effort | Quantidade | Peso |
|--------|-----------|------|
| XS | 5 | 5 x 0.5 = 2.5 |
| S | 5 | 5 x 1 = 5 |
| M | 3 | 3 x 2 = 6 |
| L | 2 | 2 x 4 = 8 |
| XL | 0 | 0 |
| **Total ponderado** | **15 tarefas** | **21.5 pontos** |

**Duracao estimada**: 5-7 dias (1 semana + buffer de 2 dias)

**Capacidade da equipe**: 2 full-stack devs + 1 QA = ~30 pontos/semana
**Ocupacao estimada**: 21.5/30 = 71.7% (margem saudavel para code review e imprevistos)

### 6.3 Mapa de Dependencias

```
T-082 (Prisma tier enum) ──> T-083 (JWT session) ──> T-084 (Factory + rate limits)
                                                            |
                                                            v
                                                      T-085 (GeminiProvider)
                                                            |
                                                            v
                                                      T-086 (Testes GeminiProvider)
                                                            |
                                                            v
                                                      T-087 (Testes integracao)
                                                            |
T-090 (Zod validation) ──────────────────────────────────────|
T-091 (Prompt injection) ────────────────────────────────────|
T-092 (Anthropic guard) ─────────────────────────────────────|
T-093 (env.ts + ADR-008) ───────────────────────────────────|
T-094 (Token logging) ──────────────────────────────────────|
T-095 (Normalize notes) ───────────────────────────────────|
                                                            |
T-088 (Badge UI) ──> T-089 (i18n tier) ─────────────────────|
                                                            |
                                                            v
                                                      T-096 (QA final)
```

### 6.4 Cronograma de Execucao Proposto

```
Dia 1:  [dev-fullstack-1] T-082 (Prisma migration) + T-083 (JWT session)
        [dev-fullstack-2] T-090 (Zod validation) + T-092 (Anthropic guard) + T-093 (env.ts + ADR)

Dia 2:  [dev-fullstack-1] T-084 (Factory getProvider(tier) + rate limits)
        [dev-fullstack-2] T-091 (Prompt injection defense) + T-094 (Token logging) + T-095 (Normalize notes)

Dia 3:  [dev-fullstack-1] T-085 (GeminiProvider — implementacao principal)
        [dev-fullstack-2] T-088 (Badge tier UI) + T-089 (i18n namespace tier)

Dia 4:  [dev-fullstack-1] T-086 (Testes GeminiProvider) + T-087 (Testes integracao)
        [dev-fullstack-2] Code review + suporte a testes

Dia 5:  [qa-engineer]     T-096 (QA final — fluxo Free + Premium com mocks)
        [dev-fullstack-1]  Suporte a QA + fixes
        [dev-fullstack-2]  Suporte a QA + fixes

Buffer: Dia 6-7 para imprevistos, fixes de QA, ou complexidade inesperada do SDK Gemini
```

### 6.5 Paralelismo

- **Dia 1**: dev-fullstack-1 trabalha no backend (Prisma, JWT) enquanto dev-fullstack-2 resolve dividas tecnicas (Zod, Anthropic guard, env.ts). **Sem dependencia cruzada**.
- **Dia 2**: dev-fullstack-1 precisa de T-082/T-083 prontos para T-084. dev-fullstack-2 continua dividas independentes. **Sequencial para dev-1, paralelo para dev-2**.
- **Dia 3**: T-085 (GeminiProvider) depende de T-084 (factory). T-088 (UI) depende de T-083 (session.user.tier). **Ambos podem iniciar no dia 3**.
- **Dia 4-5**: Testes e QA. **Bloqueados por implementacao**.

---

## 7. Definition of Done — Sprint 9

- [ ] Modelo `User` possui campo `tier` (enum `FREE`/`PREMIUM`, default `FREE`)
- [ ] Migration Prisma aplicada sem perda de dados
- [ ] `session.user.tier` disponivel em toda a aplicacao (JWT callback)
- [ ] `getProvider("FREE")` retorna `GeminiProvider`
- [ ] `getProvider("PREMIUM")` retorna `ClaudeProvider`
- [ ] `GeminiProvider` implementa `AiProvider` com `@google/genai`
- [ ] Gemini gera planos e checklists validados pelo schema Zod existente
- [ ] Rate limits diferenciados: Free 5 planos/h, Premium 10 planos/h
- [ ] Badge de tier visivel em /account, UserMenu e /generate
- [ ] CTA de upgrade discreto para usuarios Free na tela de geracao
- [ ] Validacao Zod completa no `generateTravelPlanAction` (travelStyle, budgetTotal, budgetCurrency)
- [ ] Prompt injection mitigado: system message separada de user message
- [ ] Singleton Anthropic nao cria instancia com apiKey vazia
- [ ] Token usage logado para ambos os providers (inputTokens, outputTokens, provider name)
- [ ] ADR-008 documentado em `docs/architecture.md`
- [ ] Todos os textos do namespace `tier` traduzidos em PT-BR e EN
- [ ] WCAG 2.1 AA validado nos novos elementos de UI
- [ ] Mobile 375px responsivo nos novos elementos
- [ ] Total de testes >= 510 passando, 0 falhas
- [ ] Build limpo (`npm run build` sem erros)
- [ ] Sprint review executada por 6 agentes

---

## 8. Impacto no Roadmap pos-Sprint 9

### 8.1 Roadmap Atualizado

| Sprint | Tema | Duracao | Resultado |
|--------|------|---------|-----------|
| ~~9 (original)~~ | ~~Orcamento + Gastos~~ | ~~2 semanas~~ | ~~Beta publico~~ |
| **9 (novo)** | **IA para Todos — User Tier + Gemini** | **1 semana** | **Freemium funcional** |
| **10** | **Upgrade Flow + Orcamento + Gastos** | **2 semanas** | **Beta publico** |
| **11** | **LGPD completa + Security Audit + Deploy** | **2 semanas** | **Producao** |

### 8.2 Justificativa do Impacto

O Sprint original 10 ("O App e Confiavel") agora se torna Sprint 11. Isso adiciona ~1 semana ao roadmap total, mas:

1. O produto ganha **viabilidade economica imediata** com tier Free
2. O alpha testing (pos-Sprint 8) pode acontecer **sem custo de API** para o operador
3. A estrategia de aquisicao (marketing, landing page) pode destacar "Gratis para comecar"

### 8.3 IDs para Continuidade

- Proximo User Story ID disponivel: **US-115**
- Proximo Task ID disponivel: **T-097**

---

## 9. Dados de Mercado (Pesquisa)

### 9.1 Precos Gemini Flash (marco 2026)

| Modelo | Input (por 1M tokens) | Output (por 1M tokens) | Free Tier |
|--------|----------------------|------------------------|-----------|
| Gemini 2.5 Flash | $0.30 | $2.50 | 15 req/min, 1000 req/dia |
| Gemini 2.5 Flash-Lite | $0.10 | $0.40 | Similar |
| Claude Sonnet 4 | $3.00 | $15.00 | N/A |
| Claude Haiku 4.5 | ~$0.25 | ~$1.25 | N/A |

**Economia projetada para tier Free**: 90% em input tokens, 83% em output tokens vs Claude Sonnet.

### 9.2 SDK Recomendado

O SDK `@google/genai` (npm: v1.44.0) e o recomendado pelo Google desde maio 2025. O SDK antigo `@google/generative-ai` esta em modo de manutencao e nao recebe features do Gemini 2.0+.

### 9.3 Consideracao de Privacidade

No free tier do Google AI, prompts podem ser usados para melhoria do modelo. Isso deve ser documentado nos termos de uso do Travel Planner. Para o tier Premium (Claude), Anthropic nao usa prompts de API para treinamento.

**Fontes**:
- [Google AI for Developers — Gemini Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Google Gen AI SDK (npm)](https://www.npmjs.com/package/@google/genai)
- [Google Gen AI SDK (GitHub)](https://github.com/googleapis/js-genai)
- [Gemini API Free Tier Guide](https://blog.laozhang.ai/en/posts/gemini-api-free-tier)

---

> **Proximo Passo**: O tech-lead deve iniciar o Sprint 9 criando a branch `feat/sprint-9` a partir de master. A primeira tarefa e T-082 (Prisma migration para enum UserTier) porque todas as outras tarefas dependem dela. Em paralelo, dev-fullstack-2 pode iniciar as dividas tecnicas (T-090 a T-095) que nao dependem do campo tier. O architect deve validar a decisao de usar `@google/genai` vs `@google/generative-ai` e documentar em ADR-008.

---

*Documento gerado pelo product-owner em 2026-03-05*
*Proxima revisao: apos Sprint 9 review*
