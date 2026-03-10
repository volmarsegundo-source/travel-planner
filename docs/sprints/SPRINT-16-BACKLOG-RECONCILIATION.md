# Sprint 16 -- Reconciliacao de Backlog

> **Autor:** product-owner
> **Data:** 2026-03-09
> **Sprint anterior:** 15 (completo, mergeado em master)
> **Capacidade Sprint 16:** ~40h (2 devs full-stack)
> **Versao do produto:** 0.9.0 | **Testes:** 750+

---

## Sumario Executivo (Briefing para Tech-Lead)

O Sprint 16 tem escopo definido: **Prompt Engineering e AI Guardrails**. O plano de 8 tarefas do tech-lead (T-S16-001 a T-S16-008, ~30h estimadas) esta aprovado pelo product-owner com os seguintes ajustes de prioridade:

**Decisoes de priorizacao:**

1. **T-S16-005 (PII masker) e T-S16-006 (integracao guards) sao as tarefas de maior urgencia de negocio.** A exposicao LGPD e um risco legal real -- `travelNotes` e um campo de texto livre onde usuarios brasileiros podem digitar CPF, email, telefone. A promocao de OPT-010 de P3 para P1 pelo tech-lead esta totalmente alinhada com a visao de produto ("Privacidade como diferencial").

2. **T-S16-002 (system prompts + cache_control) e a tarefa de maior impacto em custo.** Economia projetada de 40-60% em tokens de input para chamadas repetidas. Essencial para viabilizar o modelo freemium antes do lancamento.

3. **Todas as 8 tarefas cabem no sprint (~30h de ~40h).** Sobram ~10h de buffer para correcoes, code review e eventuais descobertas durante implementacao. Recomendo manter o buffer -- nao adicionar tarefas extras do backlog legado.

4. **OPT-006 (prompt versioning) e OPT-007 (XML-tagged prompts) ficam para Sprint 17.** Sao melhorias de qualidade que dependem de OPT-001 estar implementado primeiro.

5. **Debitos do backlog legado (Sprint 8) nao entram no Sprint 16.** Os itens pendentes de `docs/tasks.md` (DT-004, IMP-001, IMP-002, SEC-S7-001, RISK-013 etc.) devem ser revisados no Sprint 17 junto com as otimizacoes de prompt deferidas.

**Risco principal:** T-S16-004 (injection guard fixes) pode gerar false positives em producao. A decisao do tech-lead de manter padroes medium-confidence como WARN (sem bloqueio) e correta. Monitorar logs apos deploy para calibrar.

**Meta de qualidade:** +40 testes novos (790+ total). Cobertura >= 80% em todos os arquivos novos.

---

## Contexto de Produto

### Por que este sprint existe

O Sprint 15 introduziu o agente prompt-engineer que realizou o primeiro audit completo das chamadas AI do Atlas. O audit revelou 3 lacunas criticas:

| Lacuna | Risco | Tipo |
|---|---|---|
| Sem system prompt separado (OPT-001) | Custo alto desnecessario -- sem prompt caching | Financeiro |
| Sem deteccao de prompt injection (OPT-002) | Usuarios podem manipular comportamento da IA | Seguranca |
| PII enviado para API sem filtragem (OPT-010) | Violacao LGPD -- dados pessoais expostos a terceiros | Legal |

Estas lacunas existem desde o Sprint 8 (quando a integracao AI foi implementada). O Sprint 16 corrige todas elas.

### Alinhamento com visao de produto

| Principio do Produto | Como Sprint 16 atende |
|---|---|
| Privacidade como diferencial | PII masker garante que dados pessoais nunca saem do servidor |
| Trust signals visiveis | Guardrails de seguranca sao pre-requisito para confianca real |
| Freemium viavel | Prompt caching reduz custo em 40-60%, viabilizando tier gratuito |

### Personas impactadas

- **@leisure-solo, @leisure-family**: Principais usuarios de `travelNotes` -- campo onde PII pode ser digitado. Impacto direto de T-S16-005/006.
- **@business-traveler**: Potencial Premium tier -- custo otimizado (T-S16-002) viabiliza pricing competitivo.

---

## Backlog Priorizado -- Sprint 16

### Tarefas Aprovadas (8 tarefas, ~30h)

Prioridade determinada pela matriz: Severidade da dor (30%) + Impacto em receita (25%) + Esforco inverso (20%) + Alinhamento estrategico (15%) + Diferencial competitivo (10%).

| Rank | Task | Descricao | Dev | Estimativa | Score | Racional |
|---|---|---|---|---|---|---|
| 1 | T-S16-005 | PII masker pre-API (CPF, email, telefone, cartao, passaporte) | dev-2 | M (~4h) | 4.35 | LGPD compliance -- risco legal ativo. travelNotes pode conter dados pessoais enviados direto para Anthropic API. |
| 2 | T-S16-004 | Injection guard fixes (pt-BR, NFKD, system: regex refinado) | dev-2 | M (~4h) | 4.10 | Seguranca -- guard existe mas tem lacunas (sem pt-BR, false positives). Pre-requisito para T-S16-006. |
| 3 | T-S16-006 | Integrar guards nas ai.actions.ts + expedition.actions.ts | dev-2 | M (~4h) | 4.05 | Sem integracao, T-S16-004 e T-S16-005 sao codigo morto. Fecha o ciclo de seguranca. |
| 4 | T-S16-002 | System prompts separados + cache_control nas 3 chamadas AI | dev-1 | L (~8h) | 3.95 | Maior impacto financeiro -- economia 40-60% em input tokens. Pre-requisito para prompt caching funcionar. |
| 5 | T-S16-001 | Expandir model type para "plan"\|"checklist"\|"guide" | dev-1 | S (~2h) | 3.60 | Bug de classificacao -- guide usa "checklist" por conveniencia. Pre-requisito para T-S16-002. |
| 6 | T-S16-003 | Token usage structured logging | dev-1 | S (~2h) | 3.50 | Visibilidade de custos para finops-engineer. Sem logging, nao ha como medir economia de OPT-001. |
| 7 | T-S16-008 | Testes de integracao para fluxo completo de sanitizacao | dev-1 ou dev-2 | M (~4h) | 3.40 | Valida que todo o pipeline funciona end-to-end. Essencial para confianca no deploy. |
| 8 | T-S16-007 | Reduzir MIN_PLAN_TOKENS 4096->2048 | dev-1 | S (~2h) | 3.15 | Economia modesta em trips curtas. Trivial (1 constante). |

### Detalhamento da Pontuacao

| Task | Dor (30%) | Receita (25%) | Esforco inv. (20%) | Estrategia (15%) | Diferencial (10%) | Total |
|---|---|---|---|---|---|---|
| T-S16-005 | 5 (1.50) | 4 (1.00) | 3 (0.60) | 5 (0.75) | 5 (0.50) | **4.35** |
| T-S16-004 | 4 (1.20) | 4 (1.00) | 3 (0.60) | 5 (0.75) | 5 (0.50) | **4.05** |
| T-S16-006 | 4 (1.20) | 4 (1.00) | 3 (0.60) | 5 (0.75) | 5 (0.50) | **4.05** |
| T-S16-002 | 3 (0.90) | 5 (1.25) | 2 (0.40) | 5 (0.75) | 4 (0.40) | **3.70** |
| T-S16-001 | 3 (0.90) | 3 (0.75) | 4 (0.80) | 4 (0.60) | 3 (0.30) | **3.35** |
| T-S16-003 | 3 (0.90) | 4 (1.00) | 4 (0.80) | 3 (0.45) | 3 (0.30) | **3.45** |
| T-S16-008 | 3 (0.90) | 3 (0.75) | 3 (0.60) | 4 (0.60) | 3 (0.30) | **3.15** |
| T-S16-007 | 2 (0.60) | 3 (0.75) | 5 (1.00) | 3 (0.45) | 2 (0.20) | **3.00** |

> Nota: A ordem final (Rank) ajusta o score bruto considerando dependencias tecnicas. T-S16-001 precisa ser feito antes de T-S16-002, mesmo tendo score menor.

---

## Distribuicao por Desenvolvedor

### dev-fullstack-1 (~14h)

| Ordem | Task | Estimativa | Dependencia |
|---|---|---|---|
| 1 | T-S16-001 (model type fix) | S (~2h) | Nenhuma |
| 2 | T-S16-002 (system prompts + cache) | L (~8h) | T-S16-001 |
| 3 | T-S16-003 (token logging) | S (~2h) | T-S16-002 |
| 4 | T-S16-007 (min_tokens) | S (~2h) | Nenhuma |

### dev-fullstack-2 (~16h)

| Ordem | Task | Estimativa | Dependencia |
|---|---|---|---|
| 1 | T-S16-004 (injection guard fixes) | M (~4h) | Nenhuma |
| 2 | T-S16-005 (PII masker) | M (~4h) | Nenhuma (paralelo com T-S16-004) |
| 3 | T-S16-006 (integrar nas actions) | M (~4h) | T-S16-004, T-S16-005 |
| 4 | T-S16-008 (testes integracao) | M (~4h) | T-S16-004, T-S16-005, T-S16-006 |

### Cronograma Sugerido

| Dia | dev-fullstack-1 | dev-fullstack-2 |
|---|---|---|
| 1 | T-S16-001 + inicio T-S16-002 | T-S16-004 |
| 2 | T-S16-002 (continuacao) | T-S16-005 |
| 3 | T-S16-002 (conclusao) + T-S16-003 | T-S16-006 |
| 4 | T-S16-007 + buffer/review | T-S16-008 |
| 5 | Buffer + code review cruzado | Buffer + code review cruzado |

---

## Itens Deferidos para Sprint 17 (Overflow)

### Do Backlog de Otimizacao (prompt-engineer)

| Item | Prioridade | Justificativa para deferimento |
|---|---|---|
| OPT-006 (prompt versioning) | P1 | Depende de OPT-001 (T-S16-002) estar implementado. Mais facil versionar prompts ja extraidos. |
| OPT-007 (XML-tagged prompts) | P2 | Requer testes A/B de qualidade. Depende de OPT-006 estar feito. |
| OPT-008 (output guardrails/hallucination bounds) | P2 | Importante para qualidade mas nao critico. Requer definicao de ranges aceitaveis. |
| OPT-009 (Batch API) | P3 | Rebaixado pelo tech-lead. Volume insuficiente para justificar re-arquitetura async. |
| OPT-011 (circuit breaker) | P3 | Nice-to-have. Cache Redis 24h ja mitiga parcialmente. |
| OPT-012 (fallback chain) | P3 | Depende de OPT-011. Backlog futuro. |

### Do Backlog Legado (docs/tasks.md -- Sprint 8 debitos)

| Item | Prioridade Original | Justificativa para deferimento |
|---|---|---|
| DT-004 (mass assignment updateTrip) | P0 | Importante mas nao relacionado ao tema do Sprint 16. Avaliar para Sprint 17. |
| IMP-001 (useRouter wrong import PlanGenerator) | P0 | Bug de navegacao -- importante mas nao agravado pelo Sprint 16. Sprint 17. |
| IMP-002 (Link wrong import TripCard) | P0 | Idem IMP-001. |
| SEC-S7-001 (OAuth tokens na exclusao) | P0 | Seguranca importante. Candidato forte para Sprint 17. |
| RISK-013 / BUG-S7-001 (userId em log) | P1 | Parcialmente mitigado por T-S16-003 (novo logging sem PII). Revisar Sprint 17. |
| RISK-015 / BUG-S7-004 (footer dead links) | P1 | UX issue. Nao critico para MVP. |
| BUG-S7-007 (codigo duplicado error.tsx) | P1 | Tech debt. Nao urgente. |
| RISK-014, RISK-016, BUG-S7-005, BUG-S7-006 | P2 | Baixa prioridade. i18n polishing. |
| BUG-S7-003 (teste DeleteAccountSection) | P2 | Cobertura de teste. Sprint 17. |

### Debitos Historicos (Sprint 8)

| Item | Status |
|---|---|
| FIND-S8-M-002 (travelNotes prompt injection) | **Resolvido por T-S16-004 + T-S16-006** |
| OPT-S8-005 (token usage not logged) | **Resolvido por T-S16-003** |
| FIND-S8-M-001 (Zod validation server-side) | Pendente -- Sprint 17 |
| FIND-S8-M-003 (Anthropic singleton apiKey) | Pendente -- verificar se ainda relevante |
| FIND-S8-L-002 (GOOGLE_AI_API_KEY validation) | Pendente -- Sprint 17 |
| DEBT-S8-001 (ADR-008 nao documentado) | Pendente -- Sprint 17 |
| OPT-S8-001 (travelNotes nao normalizado antes hash) | Parcialmente resolvido por T-S16-004 (NFKD normalization) |

---

## Analise de Risco do Sprint 16

| Risco | Probabilidade | Impacto | Mitigacao |
|---|---|---|---|
| False positives no injection guard bloqueiam usuarios legitimos | Media | Alto | Padroes medium-confidence ficam como WARN (nao bloqueiam). Teste com 20+ frases reais de viagem em pt-BR e en. |
| PII masker remove conteudo legitimo (ex: numero de voo parece telefone) | Baixa | Medio | Regex conservativo -- mascarar apenas padroes inequivocos (CPF, email, cartao). Testar com inputs reais. |
| System prompt + cache_control quebra respostas existentes | Baixa | Alto | Separacao cuidadosa: system prompt = instrucoes fixas, user message = dados dinamicos. Testes de regressao obrigatorios. |
| Estimativa de T-S16-002 subestimada (L = 8h para 3 chamadas AI) | Media | Medio | Buffer de 10h no sprint. Se necessario, concluir token logging (T-S16-003) no Sprint 17. |

---

## Criterios de Aceite do Sprint 16 (Product Owner)

- [ ] Nenhum PII (CPF, email, telefone, cartao, passaporte) e enviado para API Anthropic
- [ ] Injection guard detecta padroes em portugues e ingles sem false positives em frases comuns de viagem
- [ ] System prompt separado com cache_control em todas as 3 chamadas AI (plan, checklist, guide)
- [ ] Token usage logado de forma estruturada apos cada chamada AI (campos: feature, model, inputTokens, outputTokens, estimatedCostUsd)
- [ ] Destination guide usa model type "guide" (nao "checklist") -- tipagem correta
- [ ] Zero testes existentes quebrados (regressao zero)
- [ ] >= 40 novos testes (790+ total)
- [ ] Cobertura >= 80% em todos os arquivos novos/modificados

---

## Metricas de Sucesso Pos-Sprint

| Metrica | Baseline (Sprint 15) | Meta (Sprint 16+) | Como medir |
|---|---|---|---|
| Custo medio por chamada AI (input) | Desconhecido (sem logging) | -40% apos prompt caching | Logs `ai.tokens.usage` |
| PII em chamadas API | Desconhecido (sem masking) | Zero | Auditoria de logs |
| Injection attempts detectados | Zero (sem guard) | 100% high-confidence | Logs `prompt.injection.detected` |
| False positives rate | N/A | < 1% | Logs `prompt.injection.warn` vs total |
| Testes totais | 750+ | 790+ | `npm run test` |

---

## Recomendacao para Sprint 17

Com base nos itens deferidos, recomendo o seguinte tema para Sprint 17:

**"Tech Debt Consolidation + Prompt Quality"**

1. **P0 legados**: DT-004 (mass assignment), IMP-001/002 (wrong imports), SEC-S7-001 (OAuth cleanup)
2. **OPT-006**: Prompt versioning (extrair prompts para `src/lib/prompts/` como constantes)
3. **OPT-007**: XML-tagged prompts (melhorar qualidade de resposta da IA)
4. **FIND-S8-M-001**: Zod validation server-side para travelStyle/budgetTotal/budgetCurrency
5. **Inicio de OPT-008**: Output guardrails (hallucination bounds para estimativas de custo)

Essa sequencia garante que primeiro consolidamos seguranca e correcoes, depois melhoramos qualidade das respostas AI -- preparando o terreno para o lancamento MVP.

> Proximo passo: Tech-lead deve validar este plano, confirmar a distribuicao por desenvolvedor e abrir a branch `feat/sprint-16`. O security-specialist deve ser notificado para revisar T-S16-004 (injection guard) e T-S16-005 (PII masker) durante o sprint.
