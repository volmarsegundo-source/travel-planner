# Sprint 17 -- Backlog Priorizado

> **Autor:** product-owner
> **Data:** 2026-03-09
> **Sprint anterior:** 16 (completo, mergeado em master, v0.10.0)
> **Capacidade Sprint 17:** ~40h (2 devs full-stack, ~20h cada)
> **Versao do produto:** 0.10.0 | **Testes:** 1142 passando, 0 falhas
> **Tema:** "Hardening & Production Readiness"

---

## 1. Sumario Executivo

O Sprint 16 entregou ganhos significativos em seguranca (injection guard, PII masker) e custo (prompt caching, token logging). O produto esta agora em v0.10.0 com 1142 testes e zero falhas -- um marco de estabilidade.

**Sprint 17 deve ser um sprint de hardening.** A justificativa:

1. **Divida tecnica acumulada desde o Sprint 6**: 4 itens P0 pendentes ha mais de 10 sprints (DT-004, IMP-001, IMP-002, SEC-S7-001). Carregar divida P0 por tanto tempo e um risco real -- qualquer desses itens pode causar bugs em producao ou vulnerabilidades exploraveis.

2. **Proximidade do lancamento**: O produto esta em v0.10.0. A meta e atingir v1.0 para lancamento. Entre aqui e la, precisamos de consolidacao, nao de features novas. O mercado de AI travel planners esta cada vez mais competitivo -- lancar com bugs conhecidos de navegacao (IMP-001/002) ou vulnerabilidades de mass assignment (DT-004) e inaceitavel.

3. **Temporada de viagens de verao**: Segundo dados da Amadeus e Deloitte, o planejamento de viagens de verao (hemisferio norte, junho-agosto) comeca em marco-abril. Se o Atlas pretende capturar essa janela para um lancamento beta, os proximos 2-3 sprints sao criticos. Hardening agora = lancamento mais seguro depois.

4. **Dados de custo finalmente disponiveis**: O Sprint 16 implementou token logging. Sprint 17 e o primeiro sprint onde o finops-engineer pode analisar dados reais. Adicionar o helper `calculateEstimatedCost` (DEBT-S16-001) fecha esse ciclo.

**Decisao estrategica: NÃO adicionar features de usuario neste sprint.** O proximo sprint de features sera o Sprint 18 (Budget/Expenses ou GeminiProvider para tier gratuito).

---

## 2. Contexto de Mercado

### Cenario Competitivo (marco 2026)

O mercado de AI travel planners esta em rapida consolidacao. Competidores notaveis:

| Competidor | Diferencial | Gap para Atlas |
|---|---|---|
| Mindtrip | Plan-and-book integrado, mapa interativo, calendario | Atlas nao tem booking -- foco em planejamento |
| Layla AI | Precos em tempo real, reserva direta | Atlas nao tem integracao de pricing |
| NXVoy Trips | Re-otimizacao de rotas em tempo real | Atlas nao tem otimizacao de rotas |
| Wonderplan | Itinerario personalizado por preferencias | Atlas tem travelStyle + AI -- competitivo |

**Posicionamento do Atlas:** O diferencial e a gamificacao (expedition mode) + privacidade (LGPD-first) + bilinguismo (pt-BR/EN). Nenhum competidor relevante atende o mercado brasileiro com AI em portugues.

### Tendencias Relevantes

- **42% dos viajantes usam AI para planejamento** (2025, crescendo). Confirmado por Deloitte e Simon-Kucher.
- **Gen Z e Millennials**: 60%+ usam AI para inspiracao de viagem. Sao o publico-alvo primario do Atlas.
- **Personalizacao como padrao**: Nao e mais diferencial -- e requisito basico. O expedition mode do Atlas e competitivo aqui.
- **Wellness e sustentabilidade**: 40% consideram viagens de bem-estar em 2026. Oportunidade para future feature.

### Implicacao para Sprint 17

Lancar com bugs de navegacao (links sem locale prefix) ou vulnerabilidades (mass assignment) destruiria a confianca dos early adopters. A prioridade e **qualidade sobre quantidade de features**.

---

## 3. Inventario Completo de Itens Pendentes

### 3.1 Divida Tecnica P0 (legada, Sprint 6-8)

| ID | Descricao | Origem | Sprints pendente |
|---|---|---|---|
| DT-004 | Mass assignment em `updateTrip` via spread | Sprint 2/architect | 15+ sprints |
| IMP-001 | `useRouter` wrong import em PlanGeneratorWizard | Sprint 8 | 9 sprints |
| IMP-002 | `Link` wrong import em TripCard | Sprint 8 | 9 sprints |
| SEC-S7-001 | OAuth tokens nao limpos na exclusao de conta | Sprint 7 | 10 sprints |

### 3.2 Divida Tecnica P1 (legada)

| ID | Descricao | Origem |
|---|---|---|
| RISK-013 / BUG-S7-001 | userId logado em texto claro | Sprint 7 |
| RISK-015 / BUG-S7-004 | Footer dead links /terms, /privacy, /support | Sprint 7 |
| BUG-S7-007 | Codigo duplicado entre error.tsx (app) e error.tsx (trip) | Sprint 7 |
| FIND-S8-M-001 | Zod validation server-side para travelStyle/budgetTotal/budgetCurrency | Sprint 8 |
| FIND-S8-M-003 | Anthropic singleton apiKey empty string edge case | Sprint 8 |
| DEBT-S8-001 | ADR-008 nao documentado | Sprint 8 |

### 3.3 Divida Tecnica (Sprint 16)

| ID | Descricao | Origem |
|---|---|---|
| DEBT-S16-001 | `calculateEstimatedCost()` helper nao implementado em logTokenUsage | Sprint 16 |
| DEBT-S16-002 | TripCard.tsx usa next/link (duplica IMP-002) | Sprint 16 |

### 3.4 Divida Tecnica (outros sprints)

| ID | Descricao | Origem |
|---|---|---|
| DEBT-S6-003 | Analytics events onboarding.completed/skipped nao implementados | Sprint 6 |
| DEBT-S6-004 | style-src 'unsafe-inline' em prod CSP | Sprint 6 |
| DEBT-S7-001 | LoginForm useSearchParams from next/navigation (excecao) | Sprint 7 |
| DEBT-S7-002 | AppError/TripError near-duplicate | Sprint 7 |
| DEBT-S7-003 | generate-test-plan.js e CommonJS | Sprint 7 |
| DEBT-S8-005 | eslint-disable em PlanGeneratorWizard | Sprint 8 |

### 3.5 Security Findings (Sprint 16 review -- nao bloqueantes)

| ID | Severidade | Descricao |
|---|---|---|
| SEC-S16-001 | MEDIUM | Cyrillic homoglyphs bypass NFKD |
| SEC-S16-003 | LOW | pt-BR "novas instrucoes:" regex impreciso |
| SEC-S16-004 | LOW | Faltam variantes pt-BR de prompt extraction |
| SEC-S16-005 | LOW | CPF regex captura non-CPF 11-digit numbers |
| SEC-S16-006 | LOW | Phone pattern cobre apenas formato BR |
| SEC-S16-007 | LOW | Passport pattern pode capturar booking refs |
| SEC-S16-009 | INFO | expeditionContext nao sanitizado |

### 3.6 Otimizacoes de Prompt (prompt-engineer)

| ID | Prioridade | Descricao | Status |
|---|---|---|---|
| OPT-006 | P1 | Prompt versioning | COMPLETO (Sprint 16 post) |
| OPT-007 | P2 | XML-tagged prompts | COMPLETO (Sprint 16 post) |
| OPT-008 | P2 | Output guardrails (hallucination bounds) | Pendente |
| OPT-009 | P3 | Batch API | Demotado -- volume insuficiente |
| OPT-011 | P3 | Circuit breaker para AI | Pendente |
| OPT-012 | P3 | Fallback chain (Sonnet -> Haiku -> cached -> static) | Pendente |

### 3.7 Itens P2 (baixa prioridade, legados)

| ID | Descricao | Origem |
|---|---|---|
| RISK-014 / BUG-S7-002 | "Portugues (Brasil)" sem acento no ProfileForm | Sprint 7 |
| RISK-016 / BUG-S7-006 | aria-label="Loading" hardcoded em ingles | Sprint 7 |
| BUG-S7-005 | "Traveler" hardcoded como fallback | Sprint 7 |
| BUG-S7-003 | Sem teste para DeleteAccountSection wrapper | Sprint 7 |
| FIND-S8-L-002 | GOOGLE_AI_API_KEY sem prefix validation | Sprint 8 |

---

## 4. Deduplicacao

Os seguintes itens foram identificados como duplicatas ou ja resolvidos:

| Item | Status | Nota |
|---|---|---|
| DEBT-S16-002 (TripCard next/link) | Duplica IMP-002 | Tratar como item unico |
| OPT-006 (prompt versioning) | COMPLETO | Implementado pos-Sprint 16 |
| OPT-007 (XML-tagged prompts) | COMPLETO | Implementado pos-Sprint 16 |
| FIND-S8-M-002 (travelNotes injection) | RESOLVIDO Sprint 16 | T-S16-004 + T-S16-006 |
| OPT-S8-005 (token usage not logged) | RESOLVIDO Sprint 16 | T-S16-003 |
| OPT-S8-001 (travelNotes nao normalizado) | PARCIALMENTE RESOLVIDO | NFKD normalization implementada |

---

## 5. Backlog Priorizado -- Sprint 17

### Scoring Matrix

Cada item pontuado de 1-5 nos criterios com pesos:
- Dor do viajante: 30%
- Impacto em receita: 25%
- Esforco inverso: 20%
- Alinhamento estrategico: 15%
- Diferencial competitivo: 10%

---

### P0 -- MUST DO (total estimado: ~24h)

#### T-S17-001: DT-004 -- Corrigir mass assignment em updateTrip
**Estimativa:** 3h | **Dev:** dev-fullstack-1
**Score:** 4.40

| Criterio | Nota | Ponderado |
|---|---|---|
| Dor | 5 (vulnerabilidade ativa) | 1.50 |
| Receita | 4 (bloqueante para producao) | 1.00 |
| Esforco inv. | 4 (whitelist simples) | 0.80 |
| Estrategia | 4 (prerequisito lancamento) | 0.60 |
| Diferencial | 5 (seguranca como diferencial) | 0.50 |

**Descricao:** Adicionar whitelist explicita de campos permitidos no `updateTrip` Server Action. Atualmente usa spread (`...data`) que permite que qualquer campo do modelo Trip seja alterado pelo cliente, incluindo `userId`, `deletedAt`, `expeditionMode`, etc.

**Criterios de Aceite:**
- [ ] Apenas campos permitidos (`title`, `destination`, `startDate`, `endDate`, `travelStyle`, `budgetTotal`, `budgetCurrency`, `travelers`, `coverEmoji`, `travelNotes`) sao aceitos
- [ ] Campos nao permitidos no payload sao silenciosamente ignorados (nao erro)
- [ ] Testes unitarios cobrindo tentativa de alterar `userId`, `deletedAt`, `expeditionMode`
- [ ] Coverage >= 80% no arquivo modificado

---

#### T-S17-002: SEC-S7-001 -- Limpar OAuth tokens na exclusao de conta
**Estimativa:** 3h | **Dev:** dev-fullstack-1
**Score:** 4.35

| Criterio | Nota | Ponderado |
|---|---|---|
| Dor | 5 (LGPD compliance) | 1.50 |
| Receita | 4 (bloqueante legal) | 1.00 |
| Esforco inv. | 4 (transacao Prisma) | 0.80 |
| Estrategia | 4 (privacidade como diferencial) | 0.60 |
| Diferencial | 4 (LGPD-first) | 0.40 |

**Descricao:** Ao excluir conta, a transacao Prisma deve incluir `tx.account.deleteMany({ where: { userId } })` e `tx.session.deleteMany({ where: { userId } })` para compliance LGPD total.

**Criterios de Aceite:**
- [ ] Transacao de exclusao inclui deleteMany para accounts e sessions
- [ ] Testes unitarios verificando que accounts e sessions sao removidas
- [ ] Nenhum token OAuth orfao permanece apos exclusao
- [ ] Auditoria confirma que PII e eliminada ou anonimizada

---

#### T-S17-003: IMP-001 + IMP-002 -- Corrigir imports de navegacao
**Estimativa:** 2h | **Dev:** dev-fullstack-2
**Score:** 4.10

| Criterio | Nota | Ponderado |
|---|---|---|
| Dor | 4 (links quebrados sem locale) | 1.20 |
| Receita | 4 (UX degradada) | 1.00 |
| Esforco inv. | 5 (substituicao simples) | 1.00 |
| Estrategia | 3 (i18n correto) | 0.45 |
| Diferencial | 4 (bilinguismo pt-BR/EN) | 0.40 |

**Descricao:** Corrigir 3 imports incorretos:
- `PlanGeneratorWizard.tsx`: `useRouter` de `next/navigation` -> `@/i18n/navigation`
- `TripCard.tsx`: `Link` de `next/link` -> `@/i18n/navigation`
- `TrustSignals.tsx`: `Link` de `next/link` -> `@/i18n/navigation` (DT-010 do security-specialist)

**Criterios de Aceite:**
- [ ] Zero imports de `next/navigation` ou `next/link` em componentes (exceto middleware.ts e i18n config)
- [ ] Testes existentes continuam passando
- [ ] Verificacao com grep confirma conformidade
- [ ] Testes adicionais para navegacao com locale prefix

---

#### T-S17-004: RISK-013 -- Hash userId em logs de profile update
**Estimativa:** 1h | **Dev:** dev-fullstack-2
**Score:** 3.95

| Criterio | Nota | Ponderado |
|---|---|---|
| Dor | 4 (PII em logs) | 1.20 |
| Receita | 4 (LGPD) | 1.00 |
| Esforco inv. | 5 (uma linha) | 1.00 |
| Estrategia | 3 (compliance) | 0.45 |
| Diferencial | 3 | 0.30 |

**Descricao:** Em `updateUserProfileAction`, substituir log de `userId` em texto claro por hash, seguindo o padrao ja implementado em `deleteUserAccountAction`.

**Criterios de Aceite:**
- [ ] userId nunca aparece em texto claro em nenhum log de server actions
- [ ] Auditoria com grep em todos os logger.info/warn/error confirma zero PII

---

#### T-S17-005: FIND-S8-M-001 -- Zod validation server-side para AI params
**Estimativa:** 3h | **Dev:** dev-fullstack-1
**Score:** 3.85

| Criterio | Nota | Ponderado |
|---|---|---|
| Dor | 4 (validacao incompleta) | 1.20 |
| Receita | 3 (previne erros) | 0.75 |
| Esforco inv. | 4 (schemas existem client-side) | 0.80 |
| Estrategia | 4 (defense in depth) | 0.60 |
| Diferencial | 5 (seguranca) | 0.50 |

**Descricao:** Adicionar validacao Zod server-side para `travelStyle`, `budgetTotal`, `budgetCurrency` nos Server Actions de AI. Atualmente apenas validacao client-side existe.

**Criterios de Aceite:**
- [ ] Schema Zod server-side valida travelStyle (enum), budgetTotal (positivo), budgetCurrency (ISO 4217)
- [ ] Valores invalidos retornam erro amigavel (nao crash)
- [ ] Testes cobrindo valores fora do range

---

#### T-S17-006: DEBT-S16-001 -- Helper calculateEstimatedCost em logTokenUsage
**Estimativa:** 2h | **Dev:** dev-fullstack-2
**Score:** 3.80

| Criterio | Nota | Ponderado |
|---|---|---|
| Dor | 3 (finops sem dados de custo) | 0.90 |
| Receita | 4 (otimizacao de custos) | 1.00 |
| Esforco inv. | 5 (calculo simples) | 1.00 |
| Estrategia | 3 (finops enablement) | 0.45 |
| Diferencial | 4 (transparencia de custos) | 0.40 |

**Descricao:** Implementar `calculateEstimatedCost(model, inputTokens, outputTokens)` que retorna custo estimado em USD. Integrar no `logTokenUsage()` existente.

Tabela de precos:
- Sonnet: $3.00/M input, $15.00/M output
- Haiku: $0.25/M input, $1.25/M output
- Com cache: aplicar desconto de 50% no input (estimate conservador)

**Criterios de Aceite:**
- [ ] Helper retorna custo estimado em USD com 6 casas decimais
- [ ] Log estruturado inclui campo `estimatedCostUsd`
- [ ] Testes unitarios cobrindo Sonnet, Haiku, e com/sem cache
- [ ] finops-engineer pode calcular custo total por sprint a partir dos logs

---

#### T-S17-007: RISK-015 -- Resolver footer dead links
**Estimativa:** 4h | **Dev:** dev-fullstack-2
**Score:** 3.65

| Criterio | Nota | Ponderado |
|---|---|---|
| Dor | 3 (UX quebrada) | 0.90 |
| Receita | 3 (confianca do usuario) | 0.75 |
| Esforco inv. | 3 (3 paginas estaticas) | 0.60 |
| Estrategia | 4 (trust signals, LGPD) | 0.60 |
| Diferencial | 4 (compliance) | 0.40 |

**Descricao:** Criar paginas minimas para `/terms`, `/privacy` e `/support`. Para MVP, podem ser paginas estaticas com conteudo placeholder estruturado. A pagina `/privacy` e particularmente importante para LGPD compliance (disclosure de uso de Google AI no tier gratuito).

**Criterios de Aceite:**
- [ ] /terms, /privacy, /support retornam 200 (nao 404)
- [ ] Paginas com layout consistente (Header + Footer)
- [ ] Conteudo bilíngue (pt-BR + EN via i18n)
- [ ] /privacy inclui disclosure sobre uso de AI providers e dados
- [ ] Links no Footer apontam corretamente para as paginas

---

#### T-S17-008: SEC-S16-001 -- Transliteracao de homoglyphs Cyrilicos
**Estimativa:** 3h | **Dev:** dev-fullstack-1
**Score:** 3.60

| Criterio | Nota | Ponderado |
|---|---|---|
| Dor | 3 (bypass de seguranca) | 0.90 |
| Receita | 3 (previne ataques) | 0.75 |
| Esforco inv. | 4 (lookup table) | 0.80 |
| Estrategia | 4 (defense in depth) | 0.60 |
| Diferencial | 5 (seguranca avancada) | 0.50 |

**Descricao:** Adicionar step de transliteracao Cyrilico-para-Latin no `normalizeText()` do injection guard. Mapeamento dos ~30 homoglyphs mais comuns (a, e, o, p, c, etc.). Resolve SEC-S16-001 (MEDIUM).

**Criterios de Aceite:**
- [ ] "ignоrе previous instructions" (com Cyrilicos) e detectado
- [ ] Texto em Cyrilico real (ex: nomes russos em travelNotes) nao gera false positive
- [ ] Testes cobrindo homoglyphs comuns e textos legitimos em Cyrilico
- [ ] Cobertura >= 80% no injection-guard.ts atualizado

---

#### T-S17-009: FIND-S8-M-003 -- Anthropic singleton com apiKey vazia
**Estimativa:** 1h | **Dev:** dev-fullstack-1
**Score:** 3.40

| Criterio | Nota | Ponderado |
|---|---|---|
| Dor | 3 | 0.90 |
| Receita | 3 | 0.75 |
| Esforco inv. | 5 (validacao simples) | 1.00 |
| Estrategia | 3 | 0.45 |
| Diferencial | 3 | 0.30 |

**Descricao:** Adicionar validacao no singleton factory para rejeitar `ANTHROPIC_API_KEY` vazia (string vazia vs undefined). Atualmente `env.ts` marca como optional, mas o singleton aceita string vazia.

**Criterios de Aceite:**
- [ ] Factory lanca erro explicito se apiKey e string vazia
- [ ] Teste cobrindo cenario

---

### Resumo P0

| Task | Descricao | Dev | Horas | Score |
|---|---|---|---|---|
| T-S17-001 | Mass assignment fix (DT-004) | dev-1 | 3h | 4.40 |
| T-S17-002 | OAuth cleanup na exclusao (SEC-S7-001) | dev-1 | 3h | 4.35 |
| T-S17-003 | Wrong imports fix (IMP-001/002/DT-010) | dev-2 | 2h | 4.10 |
| T-S17-004 | Hash userId em logs (RISK-013) | dev-2 | 1h | 3.95 |
| T-S17-005 | Zod server-side AI params (FIND-S8-M-001) | dev-1 | 3h | 3.85 |
| T-S17-006 | calculateEstimatedCost helper (DEBT-S16-001) | dev-2 | 2h | 3.80 |
| T-S17-007 | Footer dead links (RISK-015) | dev-2 | 4h | 3.65 |
| T-S17-008 | Cyrillic homoglyphs (SEC-S16-001) | dev-1 | 3h | 3.60 |
| T-S17-009 | Anthropic apiKey vazia (FIND-S8-M-003) | dev-1 | 1h | 3.40 |
| **TOTAL P0** | | | **22h** | |

---

### P1 -- SHOULD DO (stretch goals, ~10h)

| Task | Descricao | Dev | Horas | Score | Racional |
|---|---|---|---|---|---|
| T-S17-010 | BUG-S7-007: ErrorCard reutilizavel | dev-1 ou dev-2 | 2h | 3.20 | Elimina duplicacao entre 2 error.tsx |
| T-S17-011 | DEBT-S6-004: CSP sem unsafe-inline | dev-1 | 3h | 3.10 | Requisito de seguranca para producao |
| T-S17-012 | DEBT-S8-001: Documentar ADR-008 | dev-1 ou dev-2 | 1h | 2.90 | Documentacao arquitetural |
| T-S17-013 | DEBT-S7-002: Unificar AppError/TripError | dev-2 | 2h | 2.85 | Elimina near-duplicate |
| T-S17-014 | OPT-008: Output guardrails basicos | dev-1 ou dev-2 | 3h | 2.80 | Validacao de bounds em estimativas de custo |

---

### P2 -- OVERFLOW para Sprint 18

| ID | Descricao | Racional para deferimento |
|---|---|---|
| DEBT-S6-003 | Analytics events | Depende de analytics provider (nao escolhido) |
| DEBT-S7-001 | LoginForm useSearchParams | Excecao documentada, sem impacto funcional |
| DEBT-S7-003 | generate-test-plan.js CommonJS | Funciona, apenas debt estetico |
| DEBT-S8-005 | eslint-disable em PlanGeneratorWizard | Low risk, corrigir junto com refactor futuro |
| SEC-S16-003..007 | Regex refinements (LOW) | Monitorar em producao antes de refinar |
| SEC-S16-009 | expeditionContext sanitization | Risco muito baixo (enums + AI-generated content) |
| OPT-009 | Batch API | Volume insuficiente (P3) |
| OPT-011 | Circuit breaker | Nice-to-have, cache mitiga parcialmente |
| OPT-012 | Fallback chain | Depende de OPT-011 |
| FIND-S8-L-002 | GOOGLE_AI_API_KEY validation | GeminiProvider nao implementado ainda |
| BUG-S7-002..006 | i18n polishing (P2) | Nao criticos para lancamento |

---

## 6. Distribuicao por Desenvolvedor

### dev-fullstack-1 (~13h P0 + 3h stretch)

| Ordem | Task | Estimativa | Dependencia |
|---|---|---|---|
| 1 | T-S17-001 (mass assignment fix) | 3h | Nenhuma |
| 2 | T-S17-002 (OAuth cleanup) | 3h | Nenhuma |
| 3 | T-S17-005 (Zod server-side) | 3h | Nenhuma |
| 4 | T-S17-008 (Cyrillic homoglyphs) | 3h | Nenhuma |
| 5 | T-S17-009 (apiKey vazia) | 1h | Nenhuma |
| stretch | T-S17-011 (CSP unsafe-inline) | 3h | Nenhuma |

### dev-fullstack-2 (~9h P0 + 4h stretch)

| Ordem | Task | Estimativa | Dependencia |
|---|---|---|---|
| 1 | T-S17-003 (wrong imports) | 2h | Nenhuma |
| 2 | T-S17-004 (hash userId) | 1h | Nenhuma |
| 3 | T-S17-006 (calculateEstimatedCost) | 2h | Nenhuma |
| 4 | T-S17-007 (footer pages) | 4h | Nenhuma |
| stretch | T-S17-010 (ErrorCard) | 2h | Nenhuma |
| stretch | T-S17-013 (AppError/TripError) | 2h | Nenhuma |

### Cronograma Sugerido

| Dia | dev-fullstack-1 | dev-fullstack-2 |
|---|---|---|
| 1 | T-S17-001 (mass assignment) | T-S17-003 (imports) + T-S17-004 (userId hash) |
| 2 | T-S17-002 (OAuth) | T-S17-006 (cost helper) + inicio T-S17-007 |
| 3 | T-S17-005 (Zod) | T-S17-007 (footer pages conclusao) |
| 4 | T-S17-008 (Cyrillic) + T-S17-009 (apiKey) | Stretch: T-S17-010 + T-S17-013 |
| 5 | Stretch: T-S17-011 (CSP) + code review | Buffer + code review cruzado |

---

## 7. Verificacao de Capacidade

| Metrica | Valor |
|---|---|
| Capacidade total | ~40h |
| P0 total estimado | ~22h |
| P1 stretch estimado | ~10h |
| Buffer (code review, descobertas) | ~8h |
| **Utilizacao P0** | **55%** |
| **Utilizacao P0+P1** | **80%** |

A carga P0 esta confortavel (22h de 40h = 55%). Isso e intencional: sprints de hardening descobrem problemas adicionais durante a correcao. O buffer de 18h absorve isso. Se tudo correr bem, 3-4 itens P1 podem ser completados.

---

## 8. Criterios de Aceite do Sprint 17 (Product Owner)

- [ ] Zero itens P0 pendentes de Sprints anteriores (DT-004, IMP-001, IMP-002, SEC-S7-001 todos resolvidos)
- [ ] Zero PII em texto claro em logs (RISK-013 resolvido)
- [ ] Footer links funcionais com conteudo minimo (/terms, /privacy, /support)
- [ ] `calculateEstimatedCost` integrado em logTokenUsage (finops habilitado)
- [ ] Homoglyphs Cyrilicos detectados pelo injection guard
- [ ] Zod validation server-side nos AI action params
- [ ] Zero testes quebrados (regressao zero)
- [ ] >= 30 novos testes (1170+ total)
- [ ] Cobertura >= 80% em todos os arquivos modificados

---

## 9. Metricas de Sucesso Pos-Sprint

| Metrica | Baseline (Sprint 16) | Meta (Sprint 17+) | Como medir |
|---|---|---|---|
| Itens P0 pendentes | 4 | 0 | Contagem em tasks.md |
| Testes totais | 1142 | 1170+ | `npm run test` |
| PII em logs | Presente (RISK-013) | Zero | grep em server actions |
| Footer links 404 | 3 paginas | 0 | curl /terms, /privacy, /support |
| Custo estimado por chamada AI | Nao calculado | Calculado e logado | Logs `estimatedCostUsd` |
| Divida tecnica P0 acumulada | 4 itens | 0 itens | Inventario de backlog |

---

## 10. Briefing para Tech-Lead

**Contexto:** Sprint de hardening com foco em resolver TODA a divida P0 acumulada. Nenhuma feature nova.

**Prioridade de code review:** Os PRs de T-S17-001 (mass assignment) e T-S17-002 (OAuth cleanup) devem ser revisados com atencao especial -- sao correcoes de seguranca. Solicitar review do security-specialist para ambos.

**Dependencias:** Nenhuma tarefa tem dependencia entre si neste sprint. Todos os itens podem ser desenvolvidos em paralelo. Isso facilita a distribuicao e permite re-priorizar se algum item tomar mais tempo que o esperado.

**Versao:** Bump para v0.11.0 ao final do sprint (incremento minor -- correcoes de seguranca + novas funcionalidades menores como footer pages).

**Branch:** `feat/sprint-17`

**Meta de testes:** +30 (1170+ total). Nenhum sprint deve regredir em testes.

---

## 11. Briefing para Prompt-Engineer

**Status:** OPT-006 e OPT-007 ja completos. Parabens.

**Sprint 17 impacto:** T-S17-008 (Cyrillic homoglyphs) modifica `injection-guard.ts`. O prompt-engineer deve revisar a implementacao para garantir que a transliteracao nao interfere com o pipeline de normalizacao existente.

**Proximo passo:** OPT-008 (output guardrails) esta como P1 stretch. Se houver capacidade, seria bom ter um spec inicial do prompt-engineer definindo:
- Quais campos da resposta AI devem ter bounds check
- Ranges aceitaveis para estimativas de custo (ex: custo diario entre $10 e $5000)
- Como tratar violacoes (rejeitar resposta inteira vs. truncar valor)

**Sprint 18 outlook:** Se OPT-008 nao entrar no Sprint 17, sera P0 no Sprint 18 junto com potencialmente GeminiProvider.

---

## 12. Briefing para FinOps-Engineer

**Marco importante:** Sprint 16 implementou token logging (OPT-003). Sprint 17 adiciona `calculateEstimatedCost` (T-S17-006). Apos Sprint 17, o finops-engineer tera dados de custo estimado em USD por chamada AI nos logs estruturados.

**Acao pos-Sprint 17:** Gerar primeiro relatorio de custos AI reais baseado em logs (mesmo que em ambiente de desenvolvimento). Atualizar projecoes em `docs/finops/COST-LOG.md`.

**Dados de pricing para T-S17-006:**
- Claude Sonnet 4: $3.00/M input, $15.00/M output
- Claude Haiku 4.5: $0.25/M input, $1.25/M output
- Com prompt caching: ~50% desconto em cached input tokens (estimativa conservadora)

---

## 13. Visao Adiante -- Sprint 18+

Com a divida P0 zerada apos Sprint 17, o Sprint 18 pode finalmente focar em features de usuario:

| Candidato | Tipo | Impacto |
|---|---|---|
| GeminiProvider (tier gratuito) | Feature | Habilita modelo freemium -- usuarios free usam Gemini Flash |
| Budget/Expenses tracker | Feature | Diferencial vs competidores (Wonderplan, Layla nao tem) |
| OPT-008: Output guardrails | Qualidade | Melhora confiabilidade das estimativas de custo |
| LGPD full compliance | Legal | Consentimento, termos de uso, privacy policy completa |
| Analytics integration | Produto | PostHog para metricas de uso -- prerequisito para decisoes data-driven |

A ordem recomendada: GeminiProvider (habilita lancamento freemium) > LGPD full compliance (requisito legal) > Budget tracker (diferencial de produto).

---

*Backlog elaborado pelo product-owner em 2026-03-09 com base em inventario completo de divida tecnica, security review Sprint 16, optimization backlog do prompt-engineer, e analise de mercado.*

Sources de mercado:
- [Amadeus Travel Trends 2026](https://amadeus.com/en/newsroom/press-releases/amadeus-travel-trends-2026)
- [Deloitte 2026 Travel Industry Outlook](https://www.deloitte.com/us/en/insights/industry/transportation/travel-hospitality-industry-outlook.html)
- [Simon-Kucher: Gen Z and AI Redefine Global Travel](https://www.simon-kucher.com/en/who-we-are/newsroom/gen-z-and-ai-redefine-global-travel-2026-marks-new-era-digital-discovery-and-rising-demand)
- [Best AI Trip Planner 2026](https://blog.searchspot.ai/best-ai-trip-planner-2026/)
