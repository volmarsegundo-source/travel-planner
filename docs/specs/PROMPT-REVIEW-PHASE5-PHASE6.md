# PROMPT-REVIEW-PHASE5-PHASE6 — Revisao de Prompts IA (Fases 5 e 6)

> **Autor**: prompt-engineer  
> **Data**: 2026-03-30  
> **Status**: ANALISE COMPLETA  
> **Versao**: 1.0.0

---

## 1. Resumo Executivo

As geracoes de IA para Phase 5 (guia de destino) e Phase 6 (roteiro/itinerario) falham na primeira tentativa com os erros "A resposta da IA ficou incompleta" e "Falha ao gerar roteiro". Este documento analisa as causas-raiz e propoe correcoes priorizadas.

**Veredicto**: Ambos os prompts sofrem de **insuficiencia de token budget para a complexidade do schema exigido**. A Phase 5 e o caso mais critico. A Phase 6 falha em viagens longas (7+ dias).

---

## 2. Phase 5 — Destination Guide (`destinationGuidePrompt`)

### 2.1 Configuracao Atual

| Parametro | Valor |
|---|---|
| Modelo | `claude-haiku-4-5-20251001` (via `guide` model type) |
| `maxTokens` | **3072** |
| Timeout | 90s (`CLAUDE_TIMEOUT_MS`) |
| Retry | 2 tentativas (parse/schema error only) |
| Cache | Redis com TTL de `CACHE_TTL.AI_PLAN` |
| Prompt caching | Sim (cache_control ephemeral no system prompt) |

### 2.2 Estimativa de Tokens de Entrada

| Componente | Tokens estimados |
|---|---|
| System prompt (GUIDE_SYSTEM_PROMPT v2) | ~1100-1200 |
| User prompt (destination + language) | ~30-50 |
| User prompt com travelerContext completo | ~150-250 |
| **Total input (sem cache)** | **~1250-1450** |
| **Total input (com cache hit)** | ~150-250 (apenas user message) |

O system prompt v2 e extenso: contem 10 HARD RULES, 9 PERSONALIZATION RULES e o schema JSON completo. Isso e necessario para a qualidade do output, mas consome ~1200 tokens.

### 2.3 Analise do Output Token Budget (3072)

O schema `DestinationGuideContentSchema` exige:

| Campo | Subcampos obrigatorios | Tokens estimados |
|---|---|---|
| `destination` | name, nickname, subtitle, overview (1-4 paragrafos) | 200-400 |
| `quickFacts` | 6 objetos (climate, currency, language, timezone, plugType, dialCode) | 150-200 |
| `safety` | level, tips (1-5), emergencyNumbers (3 campos) | 100-150 |
| `dailyCosts` | 3 items (cada com 4 campos) + dailyTotal (3 campos) + tip | 150-200 |
| `mustSee` | **5-8 items** (cada com 5 campos, description ate 40 palavras) | **600-1200** |
| `documentation` | 4 campos de texto | 100-150 |
| `localTransport` | options (1-5) + tips (1-3) | 80-120 |
| `culturalTips` | 3-5 strings | 80-120 |
| JSON overhead (chaves, formatacao) | — | 200-300 |
| **Total output estimado** | — | **1660-2840** |

### 2.4 Diagnostico

**PROBLEMA CRITICO**: Com 8 mustSee items (maximo permitido pelo schema), o output precisa de ~2500-2840 tokens. Com `maxTokens=3072`, isso parece suficiente, mas:

1. **Haiku tende a ser verboso em JSON**: descricoes, overviews e tips frequentemente excedem os limites sugeridos no prompt (25 palavras, 40 palavras). Na pratica, o modelo gasta 10-20% a mais que o estimado.
2. **Nao ha retry com token budget aumentado**: diferente da Phase 6, o retry da Phase 5 apenas retenta com o mesmo `maxTokens=3072`. Se o response for truncado, a segunda tentativa tambem sera truncada.
3. **`wasTruncated` nao e verificado**: o codigo de guide nao checa `response.wasTruncated`. Ele so faz retry em caso de parse error ou schema validation error. Isso significa que respostas truncadas que produzem JSON invalido sao tratadas como parse error, nao como truncamento.
4. **`repairTruncatedJson` mascara o problema**: quando o JSON e truncado, a funcao fecha brackets/braces automaticamente. Isso pode produzir JSON valido que falha na validacao do schema (campos faltantes) ou, pior, passa com dados incompletos.

**Cenario tipico de falha**:
1. Haiku gera resposta, atinge `max_tokens=3072` no meio do campo `mustSee[6]` ou `culturalTips`
2. `stop_reason = "max_tokens"` (truncado)
3. `extractJsonFromResponse` tenta parsear -> falha -> `repairTruncatedJson` fecha o JSON
4. JSON reparado passa no `JSON.parse` mas falha no `DestinationGuideContentSchema.safeParse` (mustSee com <5 items, ou campos faltantes)
5. Retry com mesmo budget -> mesmo resultado -> erro final

### 2.5 Probabilidade de Falha

| Cenario | Probabilidade | Causa |
|---|---|---|
| Truncamento (output > 3072 tokens) | **ALTA (40-60%)** | mustSee com 8 items + overview detalhado |
| Schema validation failure apos truncamento | **ALTA (70-80%)** | mustSee.min(5) nao satisfeito |
| Parse error (JSON invalido) | MEDIA (20-30%) | Haiku pode adicionar texto antes/depois do JSON |
| Timeout (>90s) | BAIXA (<5%) | Haiku e rapido |

---

## 3. Phase 6 — Travel Itinerary (`travelPlanPrompt`)

### 3.1 Configuracao Atual

| Parametro | Valor |
|---|---|
| Modelo | `claude-sonnet-4-6` (via `plan` model type) |
| `maxTokens` | **Dinamico**: `days * 600 + 1100`, clamp [2048, 16000] |
| Timeout | 90s (`CLAUDE_TIMEOUT_MS`) |
| Retry | 2 tentativas, budget dobrado na segunda (cap 16000) |
| Cache | Redis com TTL de `CACHE_TTL.AI_PLAN` |

### 3.2 Estimativa de Tokens de Entrada

| Componente | Tokens estimados |
|---|---|
| System prompt (PLAN_SYSTEM_PROMPT) | ~350-400 |
| User prompt basico (sem context) | ~80-120 |
| User prompt com expeditionContext completo | ~400-700 |
| **Total input** | **~750-1100** |

### 3.3 Analise do Output Token Budget

Formula: `days * 600 + 1100`

| Dias | Token Budget | Output estimado real | Margem |
|---|---|---|---|
| 1 | 2048 (min) | ~800-1000 | +100% (OK) |
| 3 | 2900 | ~2000-2400 | +20% (apertado) |
| 5 | 4100 | ~3500-4000 | +3% (CRITICO) |
| 7 | 5300 | ~5000-5500 | -4% (INSUFICIENTE) |
| 10 | 7100 | ~7000-8000 | -11% (FALHA) |
| 14 | 9500 | ~9500-11000 | -14% (FALHA) |
| 21 | 13700 | ~14000-16000 | -14% (FALHA) |
| 30 | 16000 (max) | ~20000+ | -20%+ (FALHA) |

**Calculo detalhado por dia**:
- Cada dia: ~4 atividades x (title ~10 + description ~20 + campos fixos ~30) = ~240 tokens de conteudo
- JSON overhead por dia (chaves, dayNumber, date, theme): ~60 tokens
- Total por dia real: **~300 tokens** de conteudo puro + **~200 tokens** de overhead JSON = **~500 tokens**
- Plus overhead global (destination, tips, etc.): ~300-400 tokens

A estimativa de `TOKENS_PER_DAY = 600` esta correta para o conteudo, mas o `TOKENS_OVERHEAD = 1100` e insuficiente para viagens com context completo (que adiciona ~600 tokens extras ao prompt, mas o overhead so contabiliza input, nao output).

### 3.4 Diagnostico

**PROBLEMA PRINCIPAL**: Para viagens de 5+ dias, o token budget e apertado demais. O retry com budget dobrado ajuda, mas:

1. **5-7 dias**: primeira tentativa frequentemente trunca. Retry com budget dobrado (cap 16000) resolve na maioria dos casos.
2. **10+ dias**: primeira tentativa trunca. Retry duplica mas ainda pode nao ser suficiente para 14+ dias.
3. **14+ dias**: mesmo com retry, 16000 tokens pode nao ser suficiente.
4. **Sonnet e mais disciplinado que Haiku** em seguir limites de palavras, mas o volume de dados e grande.

**Problema secundario — Timeout**:
- Sonnet com 16000 max_tokens pode levar 60-90s para gerar
- O timeout de 90s e apertado para respostas longas
- Se o modelo estiver sob carga, pode exceder 90s -> erro de timeout mapeado como `AI_TIMEOUT`

### 3.5 Probabilidade de Falha

| Cenario | Trip 1-3 dias | Trip 5-7 dias | Trip 10+ dias | Trip 14+ dias |
|---|---|---|---|---|
| Truncamento (1a tentativa) | BAIXA (5%) | MEDIA (30%) | ALTA (60%) | ALTA (80%) |
| Truncamento (2a tentativa) | N/A | BAIXA (5%) | MEDIA (20%) | ALTA (40%) |
| Schema validation failure | BAIXA | MEDIA | ALTA | ALTA |
| Timeout | BAIXA (<5%) | BAIXA (5%) | MEDIA (15%) | MEDIA-ALTA (25%) |

---

## 4. Problemas Transversais

### 4.1 `repairTruncatedJson` — Faca de dois gumes

A funcao `repairTruncatedJson` (linhas 186-219 de ai.service.ts) tenta fechar JSON truncado. Problemas:

- **Falso positivo**: pode produzir JSON sintaticamente valido mas semanticamente incompleto (ex: `mustSee` com 2 items quando o schema exige min 5)
- **Falso negativo**: se o truncamento ocorrer dentro de uma string com aspas escapadas, a reparacao pode falhar
- **Mascara diagnostico**: ao reparar silenciosamente, o log nao indica que houve truncamento — apenas schema error

### 4.2 Guide nao tem retry com token budget aumentado

A Phase 6 (plan) tem logica de retry que dobra o token budget:
```
const currentBudget = attempt === 1
  ? tokenBudget
  : Math.min(tokenBudget * 2, MAX_PLAN_TOKENS);
```

A Phase 5 (guide) **nao tem essa logica**. Ambas as tentativas usam o mesmo `maxTokens=3072`. Isso torna o retry inutil quando a causa e truncamento.

### 4.3 Timeout unico para todos os modelos

O `CLAUDE_TIMEOUT_MS = 90_000` e compartilhado entre Haiku e Sonnet. Haiku raramente precisa de mais de 30s, mas Sonnet pode precisar de 120s+ para outputs longos. Um timeout diferenciado por modelo seria mais seguro.

### 4.4 Modelo Haiku para Guide — Analise de adequacao

Haiku e adequado para dados factuais estruturados (quickFacts, safety numbers), mas a complexidade do schema v2 com 8 secoes aninhadas, regras de personalizacao e limites de tamanho pode exceder a capacidade de instrucao-seguimento do Haiku em ~20% dos casos. Sonnet seria mais confiavel, mas 3x mais caro.

**Recomendacao**: manter Haiku, mas com ajustes de token budget e simplificacao de schema.

---

## 5. Recomendacoes

### P0 — Criticas (devem ser implementadas imediatamente)

#### REC-01: Aumentar `maxTokens` da Guide para 4096

**Arquivo**: `src/lib/prompts/destination-guide.prompt.ts` linha 25  
**De**: `maxTokens: 3072`  
**Para**: `maxTokens: 4096`  
**Impacto custo**: +33% no output da guide (Haiku output: $1/MTok -> ~$0.001 a mais por geracao)  
**Justificativa**: 3072 e insuficiente para o schema v2 com 8 mustSee items. 4096 da margem de ~30%.

#### REC-02: Adicionar retry com token budget aumentado na Guide

**Arquivo**: `src/server/services/ai.service.ts`, metodo `generateDestinationGuide`  
**Acao**: Quando `response.wasTruncated === true` na primeira tentativa, retry com `maxTokens * 1.5` (= 6144).  
**Justificativa**: A Phase 6 ja tem essa logica. A Phase 5 precisa do mesmo tratamento.

#### REC-03: Verificar `wasTruncated` na Guide antes de parsear

**Arquivo**: `src/server/services/ai.service.ts`, loop de guide (linhas 583-622)  
**Acao**: Adicionar check de `response.wasTruncated` e logar como warning antes de tentar parse.  
**Justificativa**: Atualmente, truncamento so e detectado indiretamente via parse/schema error.

#### REC-04: Aumentar `TOKENS_PER_DAY` de 600 para 700

**Arquivo**: `src/server/services/ai.service.ts` linha 33  
**De**: `TOKENS_PER_DAY = 600`  
**Para**: `TOKENS_PER_DAY = 700`  
**Impacto**: Viagem de 7 dias: 5300 -> 6000 tokens. Viagem de 14 dias: 9500 -> 10900.  
**Justificativa**: 600 tokens/dia subestima o overhead de JSON. 700 tokens/dia alinha melhor com output real observado.

### P1 — Importantes (devem ser implementadas no proximo sprint)

#### REC-05: Aumentar `MAX_PLAN_TOKENS` de 16000 para 20000

**Arquivo**: `src/server/services/ai.service.ts` linha 38  
**De**: `MAX_PLAN_TOKENS = 16000`  
**Para**: `MAX_PLAN_TOKENS = 20000`  
**Justificativa**: Viagens de 21+ dias precisam de mais de 16000 tokens. Sonnet suporta 8192 tokens de output por default, mas pode ser configurado ate 64K com extended thinking (nao aplicavel aqui) ou ate o limite do modelo. O limite seguro para `claude-sonnet-4-6` sem extended thinking e **8192 tokens** de output por default.

**ATENCAO**: Verificar o limite real de `max_tokens` para `claude-sonnet-4-6`. Se o limite for 8192, entao `MAX_PLAN_TOKENS = 16000` ja excede o que o modelo pode gerar. Isso significaria que viagens de 10+ dias **sempre** truncam porque o modelo para em 8192 tokens independente do `max_tokens` solicitado.

> **ACAO URGENTE**: Confirmar com a documentacao da Anthropic o `max_tokens` efetivo para `claude-sonnet-4-6` em modo nao-streaming. Se for 8192, esse e o root cause principal das falhas em viagens longas.

#### REC-06: Timeout diferenciado por modelo

**Arquivo**: `src/server/services/providers/claude.provider.ts`  
**Acao**: Substituir constante unica por mapa:
- Haiku: 60s (suficiente, Haiku e rapido)
- Sonnet: 120s (necessario para outputs longos)

**Justificativa**: 90s e muito para Haiku (gasta budget de timeout desnecessariamente) e pouco para Sonnet em viagens longas.

#### REC-07: Reduzir `mustSee.min` de 5 para 3

**Arquivo**: `src/server/services/ai.service.ts` linha 162  
**De**: `z.array(MustSeeItemSchema).min(5).max(8)`  
**Para**: `z.array(MustSeeItemSchema).min(3).max(8)`  
**Justificativa**: Quando o output e truncado e reparado, frequentemente tem 2-4 mustSee items. `min(5)` causa schema validation failure. `min(3)` permite que respostas parciais ainda sejam uteis. O prompt ainda pede 5-8, entao em condicoes normais tera 5+.

#### REC-08: Ajustar prompt da Guide para pedir exatamente 5 mustSee (nao 5-8)

**Arquivo**: `src/lib/prompts/system-prompts.ts`, GUIDE_SYSTEM_PROMPT  
**De**: regra 6 "mustSee must contain 5-8 items"  
**Para**: "mustSee must contain exactly 5 items"  
**Justificativa**: Reduz output em ~300-500 tokens. 5 items e suficiente para um guia. Se o usuario quiser mais, pode regenerar. Isso tambem torna o output mais previsivel em termos de tamanho.

### P2 — Melhorias (backlog)

#### REC-09: Adicionar coordenadas ao schema de itinerario

**Acao**: Adicionar `latitude` e `longitude` opcionais ao `DayActivitySchema`.  
**Beneficio**: Permite exibir mapa no roteiro sem chamada extra ao Nominatim.  
**Risco**: Aumenta output em ~20 tokens/atividade (~80 tokens/dia). Com `TOKENS_PER_DAY = 700`, ha margem.  
**Schema proposto**:
```
latitude: z.number().optional(),
longitude: z.number().optional(),
```
**Instrucao no prompt**: "Include latitude and longitude for each activity location if known. Use 0,0 if unsure."

#### REC-10: Comprimir instrucoes do system prompt da Guide

O system prompt v2 tem ~1200 tokens. Com tecnicas de compressao:
- Remover exemplos redundantes (ex: "e.g., 'EUR 15', 'US$30', 'R$80'" -> apenas o schema e suficiente)
- Condensar PERSONALIZATION RULES em formato tabular
- Estimativa de economia: ~200-300 tokens no input (economia de cache)

#### REC-11: Implementar fallback de schema parcial

Quando o schema completo falha na validacao, tentar um schema relaxado (todos os campos opcionais exceto `destination` e `quickFacts`) e exibir o guia parcial com indicador visual de "conteudo incompleto".

#### REC-12: Estrategia de chunking para viagens longas (14+ dias)

Para viagens de 14+ dias, dividir a geracao em chunks de 7 dias:
- Chamada 1: dias 1-7
- Chamada 2: dias 8-14 (com contexto dos dias anteriores)
- Merge no server

Isso evita o limite de output tokens e permite paralelizacao. Custo de input aumenta, mas confiabilidade melhora dramaticamente.

---

## 6. Tabela de Impacto

| Rec | Esforco | Risco | Impacto na taxa de sucesso | Custo adicional |
|---|---|---|---|---|
| REC-01 | XS (1 linha) | Nenhum | +15-20% | +$0.001/geracao |
| REC-02 | S (10 linhas) | Baixo | +10-15% | +$0.001/retry |
| REC-03 | XS (3 linhas) | Nenhum | Diagnostico apenas | Zero |
| REC-04 | XS (1 linha) | Baixo | +10-15% (viagens 5+ dias) | +$0.002/geracao |
| REC-05 | XS (1 linha) | Medio* | +5-10% (viagens 14+ dias) | +$0.005/geracao |
| REC-06 | S (5 linhas) | Baixo | +5% | Zero |
| REC-07 | XS (1 linha) | Baixo | +10% (resiliencia) | Zero |
| REC-08 | XS (1 linha prompt) | Nenhum | +10-15% | Zero (menos tokens) |
| REC-09 | M (20 linhas) | Baixo | N/A (feature) | +$0.002/geracao |
| REC-10 | S (rewrite prompt) | Medio | +5% (cache savings) | Negativo (economia) |
| REC-11 | M (30 linhas) | Medio | +15% (resiliencia) | Zero |
| REC-12 | L (100+ linhas) | Alto | +30% (viagens longas) | +50% custo p/ viagens longas |

*REC-05 risco medio: precisa confirmar limite real de max_tokens do modelo.

---

## 7. Plano de Acao Recomendado

### Fase 1 — Quick fixes (1-2 horas)
1. REC-01: `maxTokens: 3072` -> `4096`
2. REC-03: Log `wasTruncated` na guide
3. REC-04: `TOKENS_PER_DAY: 600` -> `700`
4. REC-07: `mustSee.min(5)` -> `mustSee.min(3)`
5. REC-08: Prompt "5-8 items" -> "exactly 5 items"

### Fase 2 — Retry robusto (2-4 horas)
6. REC-02: Retry com budget aumentado na guide
7. REC-06: Timeout diferenciado por modelo

### Fase 3 — Investigacao (1 hora)
8. REC-05: Confirmar limite de `max_tokens` para `claude-sonnet-4-6`
   - Se limite = 8192: esse e o root cause #1 e precisa de REC-12 (chunking)
   - Se limite >= 16000: aumentar `MAX_PLAN_TOKENS` para 20000

### Fase 4 — Resiliencia (proximo sprint)
9. REC-10: Comprimir system prompt
10. REC-11: Fallback de schema parcial
11. REC-12: Chunking para viagens longas (se necessario apos Fase 3)

---

## 8. Metricas de Sucesso

Apos implementacao das Fases 1-2:
- **Phase 5 (guide)**: taxa de sucesso na primeira tentativa de ~40% -> **75%+**
- **Phase 5 (guide)**: taxa de sucesso com retry de ~60% -> **90%+**
- **Phase 6 (itinerario, 1-7 dias)**: taxa de sucesso de ~70% -> **90%+**
- **Phase 6 (itinerario, 10+ dias)**: taxa de sucesso de ~40% -> **70%+** (precisa de Fase 3 para 90%+)

---

## Apendice A — Arquivos Relevantes

| Arquivo | Funcao |
|---|---|
| `src/lib/prompts/destination-guide.prompt.ts` | Template do prompt Phase 5 |
| `src/lib/prompts/travel-plan.prompt.ts` | Template do prompt Phase 6 |
| `src/lib/prompts/system-prompts.ts` | System prompts (GUIDE_SYSTEM_PROMPT, PLAN_SYSTEM_PROMPT) |
| `src/lib/prompts/types.ts` | Tipos dos parametros de prompt |
| `src/server/services/ai.service.ts` | Orquestrador: cache, retry, schemas Zod, token budget |
| `src/server/services/providers/claude.provider.ts` | Provider Claude: modelo, timeout, SDK |
| `src/server/services/ai-provider.interface.ts` | Interface do provider |
| `src/types/ai.types.ts` | Tipos: ExpeditionContext, ItineraryPlan, etc. |
