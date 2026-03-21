# Cost-Per-Generation Report

> **Autor**: prompt-engineer
> **Data**: 2026-03-21
> **Versao**: 1.1.0
> **Base**: Codigo-fonte real (`ai.service.ts`, `claude.provider.ts`, `cost-calculator.ts`, prompts `v1.x`)

---

## 1. Model Usage Summary

| Feature | Model | Max Tokens (output) | System Prompt (tokens est.) | User Prompt (tokens est.) | Total Input (tokens est.) | Output (tokens est.) | Cost/Call (sem cache) | Cost/Call (com cache) |
|---------|-------|--------------------:|---------------------------:|-------------------------:|-------------------------:|---------------------:|----------------------:|----------------------:|
| Checklist (Phase 3) | claude-haiku-4-5-20251001 | 2 048 | ~180 | ~30 | **~210** | **~800** | **$0.003 368** | **$0.003 225** |
| Guide (Phase 5) | claude-haiku-4-5-20251001 | 4 096 | ~420 | ~15 | **~435** | **~2 500** | **$0.010 348** | **$0.010 012** |
| Itinerary (Phase 6) | claude-sonnet-4-6 | 2 048-16 000 (dinamico) | ~450 | ~250 (basico) / ~850 (enriquecido) | **~700-1 300** | **~3 500** (7 dias) | **$0.056 400** | **$0.055 050** |

### Detalhamento das estimativas de tokens

**Checklist (Phase 3)**
- System prompt: `CHECKLIST_SYSTEM_PROMPT` = ~720 chars = ~180 tokens
- User prompt: destino + mes + viajantes + idioma = ~120 chars = ~30 tokens
- Output tipico: 5 categorias x 2-3 items = ~3200 chars = ~800 tokens
- `maxTokens`: 2 048 (fixo)

**Guide (Phase 5)**
- System prompt: `GUIDE_SYSTEM_PROMPT` = ~1680 chars = ~420 tokens (inclui schema JSON completo com 10 secoes)
- User prompt: destino + idioma = ~60 chars = ~15 tokens
- Output tipico: 10 secoes com title/icon/summary/tips/details = ~10000 chars = ~2500 tokens
- `maxTokens`: 4 096 (fixo)

**Itinerary (Phase 6)**
- System prompt: `PLAN_SYSTEM_PROMPT` = ~1800 chars = ~450 tokens (inclui schema JSON completo)
- User prompt basico: destino/datas/estilo/orcamento = ~1000 chars = ~250 tokens
- User prompt enriquecido (SPEC-AI-004): +~600 tokens de `traveler_context` XML = ~850 tokens total
- Output tipico (7 dias, 4 atividades/dia): ~14000 chars = ~3500 tokens
- `maxTokens`: dinamico via `calculatePlanTokenBudget()` = `days * 600 + 1100`, min 2048, max 16000
- Retry com dobro de budget se truncado (max 2 tentativas)

### PA Cost Mapping (fonte: `gamification.types.ts` AI_COSTS)

| Feature | PA Cost | USD Infra Cost | PA/USD Rate |
|---------|--------:|---------------:|------------:|
| Checklist (Phase 3, `ai_route`) | 30 PA | $0.005 | $0.000167/PA |
| Guide (Phase 5, `ai_accommodation`) | 50 PA | $0.015 | $0.000300/PA |
| Itinerary (Phase 6, `ai_itinerary`) | 80 PA | $0.060 | $0.000750/PA |
| Regenerar | mesmo custo da geracao original | mesmo custo | — |
| **Total por expedicao** | **160 PA** | **$0.080** | **$0.000500/PA** |

> **Nota**: A taxa media ponderada e $0.000500/PA. Itinerarios subsidiam checklist/guide via taxa fixa.

---

## 2. Cost Per Full Expedition (todas as 3 features AI)

Uma expedicao completa aciona 3 chamadas AI em sequencia (Phases 3, 5, 6).

### Cenario: Viagem de 7 dias (caso tipico)

| Feature | Modelo | Input Tokens | Output Tokens | Custo (sem cache) | Custo (com cache) |
|---------|--------|-------------:|--------------:|-------------------:|------------------:|
| Checklist | Haiku 4.5 | 210 | 800 | $0.003 368 | $0.003 225 |
| Guide | Haiku 4.5 | 435 | 2 500 | $0.010 348 | $0.010 012 |
| Itinerary | Sonnet 4.6 | 1 300 | 3 500 | $0.056 400 | $0.055 050 |
| **TOTAL** | | **1 945** | **6 800** | **$0.070 116** | **$0.068 287** |

### Cenario: Viagem curta (3 dias)

| Feature | Input | Output | Custo (sem cache) |
|---------|------:|-------:|-------------------:|
| Checklist | 210 | 800 | $0.003 368 |
| Guide | 435 | 2 500 | $0.010 348 |
| Itinerary | 1 300 | 1 800 | $0.030 900 |
| **TOTAL** | **1 945** | **5 100** | **$0.044 616** |

### Cenario: Viagem longa (14 dias)

| Feature | Input | Output | Custo (sem cache) |
|---------|------:|-------:|-------------------:|
| Checklist | 210 | 800 | $0.003 368 |
| Guide | 435 | 2 500 | $0.010 348 |
| Itinerary | 1 300 | 7 000 | $0.108 900 |
| **TOTAL** | **1 945** | **10 300** | **$0.122 616** |

### Distribuicao de custo por feature

O **Itinerary (Sonnet)** domina o custo: ~80% do total por expedicao. Checklist e Guide (ambos Haiku) sao marginais.

---

## 3. Prompt Caching Opportunity

### Status atual: JA IMPLEMENTADO

O `ClaudeProvider` ja aplica `cache_control: { type: "ephemeral" }` em todos os system prompts (linhas 50-58 de `claude.provider.ts`). Isso significa:

- **System prompts sao cacheados** automaticamente pela Anthropic
- Cache hit: **90% de desconto** no input price para tokens do system prompt
- Cache write: **25% de premium** na primeira chamada (amortizado rapidamente)

### Economia estimada por cache

| Feature | System Prompt Tokens | Economia por cache hit | % do input total |
|---------|---------------------:|-----------------------:|-----------------:|
| Checklist | 180 | $0.000 130 | ~86% do input |
| Guide | 420 | $0.000 302 | ~97% do input |
| Itinerary | 450 | $0.001 215 | ~35-64% do input |

**Economia total por expedicao (com cache hit)**: ~$0.001 647 = ~2.3% do custo total

O cache e mais efetivo para Checklist e Guide porque o system prompt representa a maior parte do input. Para Itinerary, o user prompt enriquecido (traveler_context) domina o input e nao e cacheavel.

### Oportunidade adicional: Cache do traveler_context

O `traveler_context` XML (~600 tokens) poderia ser movido para um segundo bloco de system prompt com `cache_control` se o mesmo usuario gerar multiplos itinerarios. Economia potencial: ~$0.001 620/chamada adicional.

---

## 4. Model Selection Recommendations

### Status atual (ja otimizado)

| Feature | Modelo atual | Justificativa |
|---------|-------------|---------------|
| Checklist | Haiku 4.5 | Correto. Output estruturado simples, nao requer raciocinio complexo |
| Guide | Haiku 4.5 | Correto. Dados fatuais estruturados em 10 secoes. Comentario no codigo confirma decisao intencional |
| Itinerary | Sonnet 4.6 | Correto. Requer raciocinio sobre orcamento, logistica, otimizacao de rotas |

### Recomendacoes

1. **Manter configuracao atual** — a selecao de modelos ja esta otimizada. Haiku onde possivel, Sonnet apenas onde necessario.

2. **NAO usar Opus** — nenhuma feature justifica o custo de Opus ($15/$75 por M tokens). O Sonnet atende o itinerario com qualidade suficiente.

3. **Considerar Haiku para itinerarios curtos (1-3 dias)** — viagens de 1-3 dias com orcamento definido sao simples o suficiente para Haiku. Economia: ~$0.027/chamada (reduzir de ~$0.031 para ~$0.004). Requer teste A/B para validar qualidade.

4. **Future: modelo por tier de usuario** — o codigo ja prepara isso com `getProvider()` factory (comentario no Sprint 9). Free tier poderia usar Haiku para tudo; premium manteria Sonnet para itinerarios.

---

## 5. Token Optimization Recommendations

### OPT-001: Comprimir PLAN_SYSTEM_PROMPT (impacto baixo)
- O schema JSON no system prompt (~250 tokens) poderia ser reduzido com notacao abreviada
- Economia: ~100 tokens/chamada = ~$0.000 300/chamada (Sonnet)
- **Prioridade: BAIXA** — system prompt e cacheado

### OPT-002: Limitar tips no output do itinerario
- Atualmente: 3-5 tips (ja otimizado no prompt com "max 15 words each")
- Sem acao necessaria

### OPT-003: Reduzir `details` no Guide
- O campo `details` (2-4 sentencas) em 6 das 10 secoes adiciona ~600 tokens de output
- Se removido, output cairia de ~2500 para ~1900 tokens
- Economia: ~$0.002 400/chamada (Haiku output)
- **Prioridade: MEDIA** — avaliar se UX usa o campo `details` efetivamente

### OPT-004: Dynamic maxTokens para Guide
- Atualmente fixo em 4 096, mas output tipico usa ~2 500
- Reduzir para 3 072 evitaria output excessivo em edge cases
- **Prioridade: BAIXA** — maxTokens nao afeta custo diretamente, apenas limita

### OPT-005: JA IMPLEMENTADO
- `MIN_PLAN_TOKENS` reduzido de 4096 para 2048 para viagens curtas
- Retry com dobro de budget apenas se truncado

### OPT-006: Cache Redis ja implementado
- Todas as 3 features usam cache Redis (TTL: `CACHE_TTL.AI_PLAN`)
- Checklist usa mes em vez de data exata para melhor reuso
- Plan usa bucket de orcamento (nearest 500) para melhor reuso
- **Cache hit = custo zero** — esta e a maior otimizacao existente

---

## 6. Monthly Cost Projections

### Premissas
- Mix de viagens: 60% curtas (3d), 30% medias (7d), 10% longas (14d)
- Custo medio por expedicao (sem cache): **$0.063** (media ponderada)
- Cache hit rate estimado: **40%** (mesmo destino/mes = cache hit para checklist e guide)
- Custo medio efetivo por expedicao: **$0.046** (com cache Redis + prompt cache)

### Pricing utilizado (conforme `cost-calculator.ts`)

| Modelo | Input/M tokens | Output/M tokens |
|--------|---------------:|----------------:|
| claude-haiku-4-5-20251001 | $0.80 | $4.00 |
| claude-sonnet-4-6 | $3.00 | $15.00 |

> **Nota**: Os precos no codigo ($0.80/$4.00 para Haiku) diferem ligeiramente do briefing ($1.00/$5.00). Este relatorio usa os precos do codigo como fonte da verdade. Se os precos oficiais mudaram, atualizar `src/lib/cost-calculator.ts`.

### Projecoes

| Metrica | 100 usuarios | 500 usuarios | 1 000 usuarios |
|---------|-------------:|-------------:|---------------:|
| Expedicoes/mes (1.5 per user) | 150 | 750 | 1 500 |
| Chamadas AI unicas (sem cache) | 450 | 2 250 | 4 500 |
| Chamadas AI reais (com cache) | 270 | 1 350 | 2 700 |
| **Custo mensal bruto** | **$9.45** | **$47.25** | **$94.50** |
| **Custo mensal efetivo (com cache)** | **$6.90** | **$34.50** | **$69.00** |
| Custo por usuario/mes | $0.069 | $0.069 | $0.069 |

### Worst case (sem cache, todas viagens longas de 14 dias)

| Metrica | 100 usuarios | 500 usuarios | 1 000 usuarios |
|---------|-------------:|-------------:|---------------:|
| **Custo mensal** | **$18.39** | **$91.96** | **$183.92** |

### Breakdown por modelo

Em operacao normal (cenario medio):
- **Sonnet 4.6 (itinerario)**: ~80% do custo total (~$55.20/mes para 1000 usuarios)
- **Haiku 4.5 (checklist + guide)**: ~20% do custo total (~$13.80/mes para 1000 usuarios)

---

## 7. Resumo Executivo

| Indicador | Valor |
|-----------|-------|
| Custo medio por expedicao | **$0.046** (com cache) / **$0.063** (sem cache) |
| Feature mais cara | Itinerary (Sonnet) — 80% do custo |
| Otimizacao de modelo | Ja otimizado (Haiku onde possivel) |
| Prompt caching | Ja implementado (system prompts) |
| Redis caching | Ja implementado (cache hit = $0) |
| Custo mensal 1000 usuarios | **~$69** (cenario tipico) |
| Maior risco de custo | Retry de itinerarios truncados (2x budget) |
| Proxima otimizacao recomendada | Haiku para itinerarios curtos (1-3 dias) — requer teste A/B |

### Acoes recomendadas (priorizadas)

1. **[BAIXO ESFORCO]** Validar precos em `cost-calculator.ts` contra tabela oficial Anthropic atual
2. **[MEDIO ESFORCO]** Implementar A/B test: Haiku vs Sonnet para itinerarios curtos (1-3 dias)
3. **[MEDIO ESFORCO]** Avaliar uso real do campo `details` no Guide; remover se subutilizado
4. **[FUTURO]** Implementar modelo por tier (free = Haiku all, premium = Sonnet itinerary)
5. **[MONITORAR]** Taxa de retry por truncamento — se > 10%, investigar prompts mais concisos
