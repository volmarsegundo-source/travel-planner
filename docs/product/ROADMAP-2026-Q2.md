# Travel Planner (Atlas) -- Roadmap Q2 2026

**Autor:** product-owner
**Data:** 2026-03-10
**Versao do produto:** 0.15.1 (pos Sprint 22-S -- Estabilizacao)
**Sprints concluidos:** 21 sprints de features + 1 sprint de estabilizacao (22-S)
**Testes:** 1575 passando, 0 falhas, build limpo
**Staging:** travel-planner-eight-navy.vercel.app
**Status:** Testes manuais em staging pendentes

---

## A) Inventario Completo de Itens Pendentes

### A.1 Fonte: Sprint 22 Backlog Seeds (`docs/sprints/SPRINT-22-BACKLOG-SEEDS.md`)

| ID | Descricao | Prioridade | Sprint Origem | Status |
|---|---|---|---|---|
| SEED-S22-001 | AI itinerario usa dados de transporte (horarios voo/hotel no roteiro) | P1 | Sprint 21 deferral | Pendente |
| SEED-S22-002 | Sugestoes de transporte por IA (ex: "considere Japan Rail Pass") | P1 | Novo | Pendente |
| SEED-S22-003 | Rate limiting em transport/accommodation actions (30 req/min) | P1 | SEC-S21-OBS-002 | Pendente |
| SEED-S22-004 | Validacao server-side passenger cap na Phase 2 action | P1 | Defense in depth | Pendente |
| SEED-S22-005 | Extracao de componente base RecordListStep (reducao ~40% duplicacao) | P2 | TECH-S21-OBS-002 | Pendente |
| SEED-S22-006 | Memoizacao de tab content no Phase4Wizard | P2 | TECH-S21-OBS-001 | Pendente |
| SEED-S22-007 | Loading states (skeleton) para Phase4Wizard tabs | P2 | Novo | Pendente |
| SEED-S22-008 | Logica de completude da Phase 4 (exigir 1+ transport segment) | P2 | Novo | Pendente |
| SEED-S22-009 | Sumario de custos no tab Transport (custo total logistica) | P2 | Novo | Pendente |
| SEED-S22-010 | Fix footer links /terms, /privacy, /support (404) | P3 | BUG-S7-004 | Pendente (desde Sprint 7) |
| SEED-S22-011 | Acessibilidade: aria-label "Loading" hardcoded em ingles | P3 | BUG-S7-006 | Pendente (desde Sprint 7) |

### A.2 Fonte: TRANSPORT-PHASE-SPEC.md -- User Stories Pendentes

| US | Descricao | MoSCoW | Score | Sprint Planejado | Status |
|---|---|---|---|---|---|
| US-115 | Registro de transporte principal | Must Have | 3.70 | Sprint 21 | DONE |
| US-116 | Registro de hospedagem | Must Have | 3.10 | Sprint 21 | DONE |
| US-117 | Selecao de mobilidade local | Should Have | 3.10 | Sprint 21 | DONE |
| US-118 | Campo origin no Trip | Must Have | 3.65 | Sprint 21 | DONE |
| US-119 | Estimativa de custo de transporte por IA | Could Have | 3.30 | Sprint 22 | Pendente |
| US-120 | Guia do destino em cards visiveis | Must Have | 3.20 | Sprint 19 | DONE |
| US-121 | Categorias expandidas do guia (10 categorias) | Should Have | 3.10 | Sprint 19 | DONE |
| US-122 | Chat IA sobre o destino (Premium) | Could Have | 3.65 | Futuro | Pendente |

### A.3 Fonte: Tech-Lead Memory -- Debito Tecnico Acumulado

| ID | Descricao | Severidade | Sprint Origem | Status |
|---|---|---|---|---|
| DEBT-S6-003 | Analytics events onboarding.completed/skipped nao implementados | Media | Sprint 6 | Pendente |
| DEBT-S6-004 | style-src 'unsafe-inline' no CSP de producao (limitacao Tailwind) | Media | Sprint 6 | Pendente (aceito) |
| DEBT-S7-001 | LoginForm useSearchParams de next/navigation (excecao documentada) | Baixa | Sprint 7 | Aceito |
| DEBT-S7-002 | AppError/TripError near-duplicate -- refatorar para ErrorBoundaryCard compartilhado | Baixa | Sprint 7 | Pendente |
| DEBT-S7-003 | generate-test-plan.js e CommonJS -- converter para TypeScript | Baixa | Sprint 7 | Pendente |
| DEBT-S8-005 | eslint-disable @typescript-eslint/no-explicit-any em PlanGeneratorWizard | Baixa | Sprint 8 | Pendente |
| DEBT-S18-002 | account.actions.ts tem duas funcoes hashUserId (local + importada) | Baixa | Sprint 18 | Pendente |
| DT-S9-001 | spendPoints sem $transaction (TOCTOU race condition) | Alto | Sprint 9 | Pendente |
| DT-S15-001 | getOrCreateItineraryPlan race condition (sem upsert/P2002 catch) | Baixa | Sprint 15 | Pendente |
| DT-S15-005 | recordGeneration catch block vazio engole erros silenciosamente | Medio | Sprint 15 | Pendente |
| DT-010 | TrustSignals.tsx usa next/link ao inves de @/i18n/navigation | Medio | Sprint 6 | Pendente |
| -- | ExpeditionHubPage "coming soon" usa cores hardcoded (gray) | Baixa | Sprint 20 | Pendente |

### A.4 Fonte: Security Specialist Memory -- Findings Ativos

| ID | Descricao | Severidade | Status |
|---|---|---|---|
| DT-010 | TrustSignals.tsx usa next/link incorreto | Media | Pendente |
| -- | Redis singleton nao persistido em globalThis em producao (connection leak risk) | Media | Pendente |
| SEC-S17-001 | Computed property name em profile.actions.ts upsert | Baixa | Pendente (mitigado por validacao) |
| SEC-S17-002 | Controlled spread em profile.service.ts upsert create | Baixa | Pendente (mitigado) |
| SEC-S16-003 a 007 | Regex refinements, phone pattern gaps, passport false positives | Baixa | Pendente |

### A.5 Fonte: Prompt Engineer Memory -- Otimizacoes Pendentes

| ID | Descricao | Economia Estimada | Status |
|---|---|---|---|
| OPT-002 | Integrar injection-guard.ts nas actions (guardrail) | Seguranca | Pendente |
| OPT-008 | Output guardrails (hallucination bounds) | Qualidade | Pendente |

### A.6 Fonte: FinOps Engineer Memory -- Otimizacoes Pendentes

| ID | Descricao | Economia Estimada | Status |
|---|---|---|---|
| OPT-001 | Prompt caching no system prompt base | 40-60% tokens repetidos | Pendente |
| OPT-002 | Batch API para checklists assincronos | 50% custo batch ops | Pendente |
| OPT-003 | Roteamento Haiku/Sonnet por complexidade | 30-40% custo total IA | Pendente |
| OPT-004 | Dashboard de custos in-app (/admin/costs) | Visibilidade | Pendente |
| OPT-S8-001 | Normalizar travelNotes antes do hash (cache hit rate) | +5-10% cache hits | Pendente |

### A.7 Fonte: Decisoes de Produto Abertas

| Questao | Responsavel | Sprint Previsto |
|---|---|---|
| Email notifications: provider nao escolhido (necessario para delete account) | architect + devops | Sprint 23+ |
| Analytics platform: PostHog self-hosted e candidato (GDPR) | architect + data-engineer | Sprint 24+ |
| Payment gateway: nao escolhido (necessario para Premium upgrade) | architect + security | Futuro |
| Google AI free tier privacy disclosure nos termos de uso | product-owner + legal | Pre-beta |
| GeminiProvider: implementacao planejada mas nao iniciada | dev + finops | Sprint 23+ |
| Testes manuais em staging | qa-engineer | Imediato |

---

## B) Roadmap -- Proximos 4 Sprints

### Sprint 22: "Inteligencia Logistica" (AI + Transport Integration + Security Hardening)

**Objetivo:** Conectar os dados de transporte/hospedagem ao motor de IA para que itinerarios respeitem horarios de voo e localizacao de hotel. Fechar gaps de seguranca na nova camada de transporte.

**Capacidade:** ~40h (2 devs x ~20h)

**Entregaveis Principais:**

| # | Item | Fonte | Estimativa | Dev |
|---|---|---|---|---|
| 1 | SEED-S22-001: AI itinerario usa dados de transporte | Sprint 21 deferral | 5h | dev-fullstack-1 |
| 2 | SEED-S22-003: Rate limiting em transport/accommodation actions | SEC-S21-OBS-002 | 1h | dev-fullstack-1 |
| 3 | SEED-S22-004: Passenger cap server-side validation | Defense in depth | 0.5h | dev-fullstack-1 |
| 4 | SEED-S22-008: Phase 4 completion logic (exigir 1+ transport) | UX completude | 2h | dev-fullstack-1 |
| 5 | SEED-S22-005: RecordListStep base component extraction | TECH-S21-OBS-002 | 3.5h | dev-fullstack-2 |
| 6 | SEED-S22-006: Tab memoization Phase4Wizard | TECH-S21-OBS-001 | 0.5h | dev-fullstack-2 |
| 7 | SEED-S22-007: Loading states (skeleton) Phase4Wizard | UX polish | 1.5h | dev-fullstack-2 |
| 8 | SEED-S22-009: Sumario de custos de transporte | UX value | 1.5h | dev-fullstack-2 |
| 9 | SEED-S22-010: Fix footer links (/terms, /privacy, /support) | BUG-S7-004 | 2h | dev-fullstack-2 |
| 10 | SEED-S22-011: Accessibility i18n (aria-label Loading) | BUG-S7-006 | 1h | dev-fullstack-1 |
| 11 | DT-S9-001: spendPoints $transaction (TOCTOU fix) | Divida alta | 1.5h | dev-fullstack-1 |
| -- | Testes + code review + buffer | -- | 9.5h | ambos |
| **Total** | | | **30h + 10h buffer (25%)** | |

**Dependencias:**
- SEED-S22-001 requer consulta ao prompt-engineer e finops-engineer (protocolo do projeto)
- Sprint 21 mergeado (confirmado: v0.15.0 no master)

**Riscos:**
- SEED-S22-001 (AI integration) pode exigir ajuste fino nos prompts que consome mais tempo que estimado. Mitigacao: limitar v1 a "respeitar horario de chegada/partida" sem otimizacao completa de mobilidade.

**Ordem de sacrificio:** SEED-S22-009 -> SEED-S22-010 -> SEED-S22-005

---

### Sprint 23: "Freemium + GeminiProvider" (Monetizacao + Custos)

**Objetivo:** Implementar o GeminiProvider para Free tier (economia de ~83% em IA), paginas legais obrigatorias, e preparacao para beta launch.

**Capacidade:** ~40h

**Entregaveis Principais:**

| # | Item | Fonte | Estimativa | Prioridade |
|---|---|---|---|---|
| 1 | GeminiProvider: implementacao completa com factory getProvider() | ADR decisao Sprint 8 | 8h | P0 |
| 2 | User tier routing: Free -> Gemini Flash, Premium -> Claude Sonnet | Modelo freemium | 3h | P0 |
| 3 | Paginas legais: /terms, /privacy (conteudo real, LGPD compliance) | Pre-beta blocker | 6h | P0 |
| 4 | US-119: Estimativa de custo de transporte por IA (Gemini Flash) | TRANSPORT-PHASE-SPEC | 4h | P1 |
| 5 | Google AI free tier privacy disclosure nos termos de uso | Decisao aberta | 1h | P1 |
| 6 | OPT-002: Integrar injection-guard.ts nas AI actions | Prompt engineer | 2h | P1 |
| 7 | DT-S15-005: recordGeneration catch block vazio | Divida media | 1h | P2 |
| 8 | DT-010: TrustSignals.tsx fix next/link import | Divida media | 0.5h | P2 |
| 9 | Redis singleton globalThis persistence fix | Security finding | 1h | P2 |
| 10 | DEBT-S6-003: Analytics events onboarding.completed/skipped | Divida media | 2h | P2 |
| -- | Testes + buffer | -- | 11.5h | -- |
| **Total** | | | **40h** | |

**Dependencias:**
- GeminiProvider requer GOOGLE_AI_API_KEY configurada no env (ja preparada em env.ts)
- Paginas legais requerem revisao juridica do conteudo LGPD/GDPR
- Prompt engineer e finops engineer devem validar prompts para Gemini Flash

**Riscos:**
- Qualidade das respostas Gemini Flash pode ser inferior ao Claude em cenarios complexos (viagens multi-cidade, idiomas misturados). Mitigacao: testes A/B com prompts ajustados.
- Paginas legais podem exigir consultoria juridica externa. Mitigacao: usar templates padrao LGPD como base.

**Marco:** Ao final do Sprint 23, o produto pode aceitar usuarios Free tier sem custo de IA significativo.

---

### Sprint 24: "Beta Launch Readiness" (Analytics + Monitoring + Quality Gate)

**Objetivo:** Preparar o produto para beta fechado com 50-100 usuarios convidados. Implementar analytics minimo, monitoramento de custos, e testes manuais completos.

**Capacidade:** ~40h

**Entregaveis Principais:**

| # | Item | Fonte | Estimativa | Prioridade |
|---|---|---|---|---|
| 1 | PostHog self-hosted: integracao basica (page views, events) | Decisao aberta | 6h | P0 |
| 2 | Instrumentacao de analytics events essenciais (user.registered, ai.plan.generated, onboarding.completed, expense.created) | Metricas MVP | 4h | P0 |
| 3 | OPT-005/OPT-001: Prompt caching Anthropic + token usage logging | FinOps pendente | 4h | P0 |
| 4 | Testes manuais completos em staging (178 cenarios) | qa-engineer | 8h | P0 |
| 5 | SEED-S22-002: AI transport suggestions (Gemini Flash) | Sprint 22 seeds | 3h | P1 |
| 6 | OPT-008: Output guardrails (hallucination bounds) | Prompt engineer | 3h | P1 |
| 7 | US-122: Chat IA sobre destino -- discovery + prototype (scope v1) | Premium feature | 4h | P2 |
| 8 | Debitos menores restantes (DEBT-S7-002, DEBT-S7-003, DEBT-S8-005) | Divida acumulada | 3h | P3 |
| -- | Buffer | -- | 5h | -- |
| **Total** | | | **40h** | |

**Dependencias:**
- PostHog self-hosted requer decisao de hosting (devops-engineer)
- Testes manuais requerem staging atualizado com v0.15.1
- US-122 discovery depende do architect para definir infraestrutura de chat

**Marco:** Ao final do Sprint 24, o produto esta pronto para beta fechado com analytics, monitoramento de custos, e qualidade validada.

---

### Sprint 25: "Beta Launch + Premium Foundations" (Usuarios Reais + Monetizacao)

**Objetivo:** Lancar beta fechado (50-100 usuarios convidados). Iniciar implementacao de US-122 (Chat IA Premium). Coletar feedback real para iterar.

**Capacidade:** ~40h

**Entregaveis Principais:**

| # | Item | Fonte | Estimativa | Prioridade |
|---|---|---|---|---|
| 1 | US-122: Chat IA sobre destino (Premium) -- implementacao v1 | TRANSPORT-PHASE-SPEC | 16h | P0 |
| 2 | Premium upgrade flow (UI de upgrade, sem payment gateway ainda) | Modelo freemium | 4h | P1 |
| 3 | Email notification provider setup (Resend ja configurado) | Decisao aberta | 3h | P1 |
| 4 | Feedback in-app (NPS survey apos 7 dias) | Metricas MVP | 3h | P1 |
| 5 | Clickable progress bar + phase labels (T-S19-011/012) | Divida desde S19 | 3h | P2 |
| 6 | Correcoes baseadas em feedback do beta | -- | 6h | P1 |
| -- | Buffer | -- | 5h | -- |
| **Total** | | | **40h** | |

**Dependencias:**
- Beta launch requer testes manuais concluidos (Sprint 24)
- US-122 requer spec tecnico do architect (WebSocket vs polling, limites de contexto)
- Payment gateway continua diferido; Premium upgrade usa flag manual no DB

**Marco:** Produto em uso real por 50-100 usuarios. Primeiros dados de NPS, retencao D7, e custo real de IA por usuario.

---

## C) Avaliacao de Prontidao do MVP

### C.1 Percentual de Conclusao do MVP

**Features Core (jornada de 8 fases):**

| Fase | Nome | Status | Observacao |
|---|---|---|---|
| Fase 1 | O Ponto de Partida | COMPLETA | Reordenada Sprint 20, origin field Sprint 21 |
| Fase 2 | O Explorador | COMPLETA | Preferences 10 cats, passengers airline-style |
| Fase 3 | A Rota (Checklist) | COMPLETA | AI-generated, 10 categorias |
| Fase 4 | A Logistica | COMPLETA | Transport + Accommodation + Mobility (Sprint 21) |
| Fase 5 | O Mapa dos Dias (Guia) | COMPLETA | 10 categorias em cards (Sprint 19) |
| Fase 6 | O Tesouro (Itinerario) | 90% | AI streaming funcional; FALTA integracao com dados de transporte |
| Fase 7 | O Orcamento | COMPLETA | Budget tracking implementado |
| Fase 8 | A Partida | COMPLETA | Final review e conclusao |

**Infraestrutura:**

| Componente | Status | Observacao |
|---|---|---|
| Autenticacao (Auth.js v5) | COMPLETA | Credentials + Google OAuth |
| Gamificacao (Atlas engine) | COMPLETA | Pontos, badges, fases |
| AI Provider (Claude) | COMPLETA | Sonnet + Haiku |
| AI Provider (Gemini -- Free tier) | NAO IMPLEMENTADO | Bloqueio para economia de custos |
| i18n (PT-BR + EN) | COMPLETA | next-intl |
| Perfil progressivo | COMPLETO | 10 categorias preferencias |
| Dashboard | COMPLETO | Cards, progress bar, ferramentas |
| Paginas legais (/terms, /privacy) | NAO IMPLEMENTADO | Bloqueio para beta |
| Analytics | NAO IMPLEMENTADO | Bloqueio para metricas |
| Monitoramento de custos | NAO IMPLEMENTADO | Risco financeiro |

**Estimativa geral de conclusao do MVP: ~78%**

As features core estao substancialmente completas (7 de 8 fases 100%, 1 fase a 90%). O que falta e predominantemente infraestrutura de suporte: GeminiProvider (custo), analytics (metricas), paginas legais (compliance), e testes manuais (qualidade).

### C.2 O Que Bloqueia o Beta Launch

| Bloqueio | Tipo | Sprint Previsto | Justificativa |
|---|---|---|---|
| GeminiProvider para Free tier | Custo | Sprint 23 | Sem Gemini, cada usuario Free custa ~$0.056/request em Claude. Com 100 usuarios Free, custo mensal de IA: ~$112. Insustentavel. |
| Paginas legais (/terms, /privacy) | Compliance | Sprint 23 | LGPD exige politica de privacidade acessivel ANTES do cadastro. Sem isso, o produto nao pode aceitar dados pessoais de brasileiros. |
| Google AI privacy disclosure | Compliance | Sprint 23 | Free tier do Google pode usar prompts para treinamento. Deve ser divulgado nos termos. |
| Testes manuais em staging | Qualidade | Sprint 24 | 1575 testes automatizados nao substituem validacao humana. 178 cenarios manuais pendentes. |
| Analytics minimo | Metricas | Sprint 24 | Sem analytics, nao e possivel medir nenhuma metrica de sucesso do MVP (NPS, retencao, aha moment). |

### C.3 Caminho Critico para v1.0

```
Sprint 22: AI + Transport integration + security gaps
    |
    v
Sprint 23: GeminiProvider + paginas legais (BLOQUEIOS REMOVIDOS)
    |
    v
Sprint 24: Analytics + testes manuais + monitoring (BETA READY)
    |
    v
Sprint 25: Beta launch (50-100 usuarios) + US-122 Premium chat
    |
    v
Sprint 26-28: Iteracao baseada em feedback + payment gateway + v1.0
```

**Estimativa para v1.0 GA (General Availability):** Sprint 28 (~6-8 semanas a partir de agora), assumindo sprints de ~1 semana cada.

### C.4 Inventario de Divida Tecnica

| Severidade | Quantidade | Itens Notaveis |
|---|---|---|
| Alta | 1 | DT-S9-001 (spendPoints TOCTOU race) -- programado Sprint 22 |
| Media | 5 | DT-S15-005 (catch vazio), DT-010 (TrustSignals link), Redis globalThis, DEBT-S6-003 (analytics events), DEBT-S6-004 (CSP unsafe-inline) |
| Baixa | 8 | DEBT-S7-002/003, DEBT-S8-005, DEBT-S18-002, DT-S15-001/004, SEC-S16/S17 findings |
| Info/Aceita | 3 | DEBT-S7-001 (excecao documentada), DEBT-S6-004 (limitacao Tailwind), SEC-S17-001/002 (mitigados) |

**Total: 17 itens de divida tecnica acumulada em 21 sprints.** A maior parte e de baixa severidade. O unico item de alta severidade (DT-S9-001) esta programado para Sprint 22.

---

## D) Solicitacoes de Stakeholder Diferidas

| Solicitacao | Sprint Original | Diferido Para | Razao |
|---|---|---|---|
| US-122: Chat IA sobre destino (Premium) | Spec Sprint 17 | Sprint 25 | Requer infraestrutura de chat (WebSocket/polling), gestao de contexto de conversacao, e limites de tokens. Alta complexidade. |
| US-119: Estimativa de custo transporte por IA | Sprint 22 (plan) | Sprint 23 | Depende de GeminiProvider para Free tier. Faz sentido implementar junto com o provider. |
| Progress bar clicavel (T-S19-011) | Sprint 19 | Sprint 25 | P2 -- diferido 3 vezes. UX nice-to-have, nao bloqueante. |
| Progress bar labels (T-S19-012) | Sprint 19 | Sprint 25 | P2 -- acompanha T-S19-011. |
| Dashboard de custos in-app (/admin/costs) | Sprint 4 (finops) | Sprint 24+ | Requer tabela cost_snapshots + cron job. Necessario para monitoring, nao para usuarios finais. |
| Busca de voos em tempo real (GDS/NDC) | TRANSPORT-PHASE-SPEC | Pos-v1.0 | PCI-DSS scope, complexidade de integracao GDS, custo de licenciamento. Explicitamente fora do MVP. |
| Import automatico de reservas via email | TRANSPORT-PHASE-SPEC | Pos-v1.0 | Requer email parsing, OAuth com provedores de email. Complexidade alta, valor incremental. |
| Guia offline (download PDF) | TRANSPORT-PHASE-SPEC | Pos-v1.0 | Feature Premium futura. |
| Historico de chat persistente | US-122 scope | Pos-v1.0 | v1 do chat nao persiste historico entre sessoes. |
| Payment gateway (Stripe) | Sprint 10+ (plan) | Pos-beta | PCI-DSS scoping exercise necessario. Decisao de provider pendente. |
| B2B travel agents / multi-tenancy | Security doc | Pos-v1.0 | Requer redesign completo de autorizacao (RBAC, organizationId). |
| Shared itinerary collaboration | Security doc | Pos-v1.0 | Requer modelo de permissoes por trip por usuario. |
| Mobile app nativo | CLAUDE.md | Pos-v1.0 | Fora do escopo MVP. Web responsivo e suficiente. |

---

## E) Recomendacoes Estrategicas para Q2 2026

### E.1 Prioridade Absoluta: Remover Bloqueios de Beta

O produto tem ~78% do MVP implementado em termos de features, mas tem 0% de preparacao operacional para usuarios reais. A prioridade do Q2 deve ser transformar um produto tecnicamente funcional em um produto lancavel:

1. **Sprint 22-23:** Fechar todos os bloqueios de compliance e custo (GeminiProvider, paginas legais, privacy disclosure).
2. **Sprint 24:** Validar qualidade com testes manuais e instrumentar analytics.
3. **Sprint 25:** Lancar beta com 50-100 usuarios e iniciar ciclo de feedback.

### E.2 Economia de Custos: GeminiProvider e Critico

Com a arquitetura atual (100% Claude), o custo de IA por 1.000 usuarios Free seria ~$112/mes. Com GeminiProvider (Free tier do Google), esse custo cai para ~$19/mes (reducao de ~83%). O GeminiProvider nao e apenas uma feature -- e uma condicao de viabilidade financeira do modelo freemium. Deve ser a primeira implementacao do Sprint 23.

### E.3 US-122 (Chat IA Premium) como Diferencial de Conversao

O Chat IA sobre destino (score 3.65) e a feature Premium com maior potencial de conversao. Dados de mercado (Skift 2025) indicam que viajantes fazem 20-30 buscas sobre o destino durante o planejamento. Capturar essas buscas dentro do app com IA contextualizada e um diferencial significativo vs. Google/ChatGPT. Recomendo priorizar a implementacao no Sprint 25, logo apos o beta launch, para testar a hipotese de conversao com usuarios reais.

### E.4 Divida Tecnica: Manter Sob Controle

Com 17 itens de divida acumulada em 21 sprints, a taxa e saudavel (~0.8 itens/sprint). O item critico (DT-S9-001, spendPoints race condition) esta programado para Sprint 22. Recomendo nao adiar novamente -- e o unico item de severidade alta e pode causar inconsistencia em pontos de gamificacao em producao.

### E.5 Preparacao para v1.0

O caminho de beta para v1.0 GA depende de tres fatores:

1. **Dados reais de custo:** Somente com usuarios reais poderemos validar as projecoes de custo de IA e ajustar o modelo freemium.
2. **Feedback de NPS:** A meta de NPS >= 50 precisa ser medida e iterada. Se o NPS estiver abaixo de 50, priorizar melhorias de UX antes de GA.
3. **Payment gateway:** Para monetizar Premium, precisamos de Stripe (ou similar). O scoping PCI-DSS deve comecar no Sprint 26 para estar pronto ate o Sprint 28.

### E.6 Tendencias de Mercado a Considerar

O mercado de travel planning com IA esta em rapida evolucao (Mindtrip, Layla AI, Google Canvas). Nosso diferencial competitivo principal e a gamificacao (Atlas engine) + planejamento estruturado em 8 fases. Recomendo:

- **Nao competir em busca de voos em tempo real** (custo proibitivo, GDS licensing complexo)
- **Investir em personalizacao** (preferencias estruturadas ja implementadas, agora falta usa-las efetivamente nos prompts de IA)
- **Preparar suporte a viagens multi-cidade** (tendencia crescente pos-pandemia, ja suportado parcialmente pelo modelo N-transport-segments)

---

## Resumo Visual do Roadmap

```
Mar 2026                                                           Mai 2026
  |                                                                     |
  Sprint 22          Sprint 23          Sprint 24          Sprint 25
  [AI Transport]     [GeminiProvider]   [Beta Ready]       [BETA LAUNCH]
  [Security]         [Paginas Legais]   [Analytics]        [US-122 Chat]
  [Code Quality]     [US-119 Cost]      [Testes Manuais]   [Feedback Loop]
  |                  |                  |                  |
  v0.16.0            v0.17.0            v0.18.0            v1.0-beta
                                        ^
                                        |
                                    BETA READY
                                    (bloqueios removidos)
```

---

*Roadmap elaborado pelo product-owner em 2026-03-10 com base em: Sprint 22 backlog seeds, Sprint 21 backlog seeds, Sprint 20 backlog e review, TRANSPORT-PHASE-SPEC.md, security.md, COST-LOG.md, e memorias persistentes de todos os agentes (tech-lead, architect, security-specialist, finops-engineer, prompt-engineer).*
