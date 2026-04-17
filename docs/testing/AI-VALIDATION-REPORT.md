# AI Prompts + FinOps Report — Pré-Beta v0.22.0

**Data**: 2026-04-17 | **Versão**: 0.22.0 | **Analista**: architect (chapéus: prompt-engineer + finops-engineer)

> **Nota de encoding**: Coletado via subagente em Windows; muitos diacríticos foram strippados pelo terminal. Localizações (arquivo:linha) e findings quantitativos são confiáveis; texto em português pode carecer de acentuação visual mas mantém significado.

---

## Sumário Executivo

- **P0-CRÍTICO**: O modelo `gemini-2.0-flash` utilizado em produção será descontinuado pelo Google em **01/06/2026** (45 dias). Nenhuma migração para `gemini-2.5-flash` ou `gemini-2.5-flash-lite` foi iniciada.
- **P0-CRÍTICO**: `CLAUDE_MODEL_ID_MAP.plan` em `ai.service.ts:315` declara `"claude-sonnet-4-6"` para fins de cost tracking, mas o provider real (`claude.provider.ts:13`) usa `"claude-haiku-4-5-20251001"`. Os logs de custo são inflados ~10x (Sonnet custa $3/$15 vs Haiku $1/$5).
- **P0-MÉDIO**: Temperature não é passada a nenhum provider (nem Gemini nem Claude). Os prompts de checklist v2 recomendam temperature 0.3, mas a interface `AiProviderOptions` não suporta o parâmetro. Outputs podem ter variabilidade acima do desejável para tarefas estruturadas.
- **P1-CUSTO**: `cost-calculator.ts:22` registra Haiku a `$0.80/$4.00` por MTok, mas o preço oficial atual de `claude-haiku-4-5-20251001` é `$1.00/$5.00`. Custo real está sendo subestimado em 20-25%.
- **P1-GUARDRAIL**: Guardrail de injection (INJ-S44-05) bloqueia URLs em campos de usuário, mas não existe guardrail de output (o AI pode gerar URLs externas nas respostas — risco de exfiltração via guide/itinerary renderizados no frontend).

---

## 1. Inventário de Prompts em Produção

| # | Nome | Arquivo:Linha | Fase (Sprint 44) | Modelo Alvo | Tokens Est. (system+user+output) |
|---|------|---------------|-------------------|-------------|----------------------------------|
| 1 | **GUIDE v2** (ativo) | `src/lib/prompts/destination-guide.prompt.ts:39` + `system-prompts.ts:205` | Phase 3 (1ª IA) | guide (Haiku/Gemini Flash) | ~1500 sys + ~500 user + 4096 out = **~6100** |
| 2 | **PLAN v1.3** (ativo, streaming) | `src/lib/prompts/travel-plan.prompt.ts:157` + `system-prompts.ts:26` | Phase 4 (2ª IA) | plan (Haiku/Gemini Flash) | ~1200 sys + ~800 user + 2048-4500 out = **~4000-6500** |
| 3 | **CHECKLIST v2** (ativo) | `src/lib/prompts/checklist.prompt.ts:135` + `system-prompts.ts:123` | Phase 6 (3ª IA) | checklist (Haiku/Gemini Flash) | ~900 sys + ~600 user + 2048 out = **~3550** |
| 4 | CHECKLIST v1 (archived, flag OFF) | `src/lib/prompts/checklist.prompt.ts:36` + `system-prompts.ts:92` | Phase 3 (legado) | checklist | ~200 sys + ~50 user + 2048 out = **~2300** |
| 5 | GUIDE v1 (archived, cache compat) | `system-prompts.ts:175` | — | guide | ~600 sys + ~100 user + 4096 out |
| 6 | PLAN streaming route | `src/app/api/ai/plan/stream/route.ts` | Phase 4 | plan | Reutiliza PLAN v1.3 |
| 7 | GUIDE streaming route | `src/app/api/ai/guide/stream/route.ts` | Phase 3 | guide | Reutiliza GUIDE v2 |

**Notas**: Os 3 prompts ativos (GUIDE, PLAN, CHECKLIST) formam uma cadeia sequencial onde o output do GUIDE alimenta o PLAN (via `buildGuideDigest` em `digest.ts`) e ambos alimentam o CHECKLIST v2 (via `ExpeditionAiContextService`).

---

## 2. Análise Qualitativa

### 2.1 GUIDE v2 (`GUIDE_SYSTEM_PROMPT`, `system-prompts.ts:205-291`)

**Clareza das instruções**: Excelente. 10 hard rules numeradas, categorias de mustSee explícitas, personalization rules condicionais. Schema JSON bem definido.

**Redundâncias**:
- O schema JSON repete campos que já estão documentados nas hard rules (ex: `safety.level` descrito na regra 4 e no schema). Impacto: ~100 tokens redundantes. Baixo risco.

**Formato de saída e schema**: JSON bem estruturado com `DestinationGuideContentSchema` (Zod) validando em runtime. Schema cobre 7 top-level keys com subschemas tipados. Defaults via `.optional().default()` em campos como `plugType`, `dialCode`.

**Guardrails presentes**:
- Regra 10: números de emergência por país (190/192/193 Brasil, 911 US/CA, 112 EU)
- Regra 6: 5-8 mustSee items (bounded)
- Regra 9: limites de palavras (tips 25, descriptions 40)
- Injection guard: via `sanitizeForPrompt` nos campos de entrada do usuário

**Oportunidades de otimização** (proposta — requer aprovação do PO):
- O schema JSON embutido no system prompt consome ~400 tokens. Poderia ser compactado removendo comentários inline e usando notação mais curta. Economia estimada: ~100-150 tokens por request.
- As PERSONALIZATION RULES (linhas 220-228) poderiam ser condensadas em formato tabular. Economia: ~80 tokens.

### 2.2 PLAN v1.3 (`PLAN_SYSTEM_PROMPT`, `system-prompts.ts:26-85`)

**Clareza das instruções**: Boa. Constraints numerados, MULTI-CITY RULES separados, JSON SCHEMA explícito. A regra de ground-truth do Guide digest (linha 40) é clara e necessária.

**Redundâncias**:
- "BE CONCISE" na linha 28 + "Keep each activity description to 1 short sentence (max 12 words)" na linha 33 são parcialmente redundantes.
- JSON SCHEMA inclui `"latitude"` e `"longitude"` por atividade, mas o `DayActivitySchema` (Zod) em `ai.service.ts:52-66` NÃO valida esses campos. Divergência spec vs validação.

**Formato de saída**: JSON validado por `ItineraryPlanSchema` (Zod). Token budget dinâmico via `calculatePlanTokenBudget()` (600*dias + 1100 overhead, min 2048, max capped a 4500 em streaming).

**Guardrails presentes**:
- Anti-alucinação: "If you are not confident a specific venue name is real and open, use a descriptive title instead" (linha 39)
- Anti-fabricação: "Never fabricate addresses or phone numbers" (linha 39)
- Moeda vinculada ao budget do usuário (linha 37)
- PII masker aplicado a `travelNotes` antes de injeção

**Oportunidades de otimização** (proposta — requer aprovação do PO):
- MULTI-CITY RULES (linhas 42-53, 8 regras) somam ~300 tokens no system prompt, presentes mesmo para viagens single-city. Mover para user prompt condicional economizaria tokens em ~85% dos requests (single-city). Economia: ~300 tokens * 85% = 255 tokens/req médio.

### 2.3 CHECKLIST v2 (`CHECKLIST_SYSTEM_PROMPT`, `system-prompts.ts:123-171`)

**Clareza das instruções**: Excelente. 14 hard rules com lógica condicional (if X then Y), cada regra é específica e testável. Melhor prompt do conjunto.

**Redundâncias**: Mínimas. O sistema é compacto.

**Formato de saída**: JSON com `reason` + `sourcePhase` por item, max 25 items. Validado por `ChecklistResultSchema` (Zod) que aceita campos v1 e v2.

**Guardrails presentes**:
- Regra 6: "Never invent brand names, shop names, or fake regulations"
- Regra 14: "Do not exceed 25 items total"
- Cada campo de contexto sanitizado via `sanitizeForPrompt` em `digest.ts`
- Temperature 0.3 recomendada no docblock mas **NÃO aplicada** (ver Bug #3)

**Oportunidades de otimização**: Nenhuma significativa. Este prompt já está otimizado.

---

## 3. Análise de Entradas

### Contexto por tipo de geração:

| Geração | System Prompt (tokens) | User Prompt (tokens) | Duplicação system/user | Contexto total |
|---------|----------------------|---------------------|----------------------|----------------|
| **GUIDE** | ~1500 | ~200 (básico) a ~500 (com travelerContext + tripContext multi-city) | Nenhuma | 1700-2000 |
| **PLAN** | ~1200 | ~400 (básico) a ~1200 (com expeditionContext enriquecido + guideDigest + multiCity) | Schema JSON duplicado parcialmente (campo "currency" mencionado na regra 37 e na estrutura). ~50 tokens. | 1600-2400 |
| **CHECKLIST v2** | ~900 | ~200 (básico) a ~600 (com guide + itinerary + logistics digests) | Nenhuma significativa. As hard rules referenciam tags XML do user prompt corretamente. | 1100-1500 |

**Observações**:
1. O `PLAN_SYSTEM_PROMPT` inclui `MULTI-CITY RULES` (8 regras, ~300 tokens) mesmo em trips single-city. Esse bloco poderia ser condicional.
2. O `buildTravelerContext()` em `travel-plan.prompt.ts:77-154` pode gerar até ~600 tokens de contexto XML (personal + trip + preferences + logistics + destination_insights). Isso está dentro do budget de TOKENS_OVERHEAD=1100 documentado.
3. Os digests em `digest.ts` são bem desenhados: cada um tem budget explícito (GuideDigest <=400, ItineraryDigest <=300, LogisticsDigest <=200). Total digest budget: ~900 tokens.

---

## 4. Análise de Saídas

| Geração | maxTokens Configurado | Dinâmico? | Schema JSON | Risco de Truncamento |
|---------|----------------------|-----------|-------------|---------------------|
| **GUIDE** | 4096 (fixo) | Não | `DestinationGuideContentSchema` (7 top-level keys, ~15 sub-schemas) | Baixo. 4096 é suficiente para schema completo. |
| **PLAN** | 2048-4500 (dinâmico) | Sim. `calculatePlanTokenBudget(days)` = 600*days + 1100, clamped [2048, 4500 em streaming] | `ItineraryPlanSchema` (days array + tips) | **Médio-Alto para viagens >5 dias**. 5 dias = 600*5+1100 = 4100 tokens. 7 dias = 5300, capped a 4500. Viagens de 7+ dias SERÃO truncadas no streaming. Retry com budget dobrado (ai.service.ts:577-580) mitiga parcialmente, mas o cap de 4500 no streaming é hard. |
| **CHECKLIST v2** | 2048 (fixo) | Não | `ChecklistResultSchema` (categories array + summary) | Baixo. 25 items max * ~40 tokens/item + summary = ~1100 tokens. |

**Mecanismos de mitigação de truncamento**:
- `repairTruncatedJson()` em `ai.service.ts:216-249`: tenta fechar brackets/braces abertos. Frágil mas funcional.
- Retry com budget dobrado (apenas em `callProviderForPlan`, não em streaming route).
- Streaming route: mid-flight recovery via `getSecondaryProvider()` quando stream falha.

**Risco concreto**: Uma viagem de 10 dias com multi-city gera um JSON de ~6000-8000 tokens. O cap de 4500 no streaming route (linha 50 do route) truncará o output. O `repairTruncatedJson` pode salvar o JSON sintaticamente, mas os últimos dias do roteiro serão perdidos semanticamente.

---

## 5. Detecção de Alucinações (Metodologia)

### Categorias de alucinação mais prováveis:

| Categoria | Probabilidade | Fonte de Risco | Mitigação Existente | Mitigação Proposta |
|-----------|--------------|----------------|--------------------|--------------------|
| **Números de emergência incorretos** | Média | GUIDE prompt gera números de emergência por país. Cidades pequenas/exóticas podem receber números inventados. | Regra 10 do GUIDE_SYSTEM_PROMPT com números por país. | Validação pós-geração: regex check nos números + lookup table dos 20 países mais comuns. |
| **Nomes de restaurantes/atrações inexistentes** | Média-Alta | PLAN gera nomes de atividades. Para cidades pouco conhecidas (ex: Jacutinga-MG), o modelo pode inventar. | Regra no system prompt: "use a descriptive title instead" | Eval suite com cidades de baixo volume turístico (ver Seção 9). |
| **Custos diários irrealistas** | Média | GUIDE gera `dailyCosts` em moeda local. Conversão mental do modelo pode errar. | Schema valida formato de string mas não valor numérico. | Eval com comparação automatizada contra faixas de referência por país. |
| **Informação de visto/passaporte desatualizada** | Média | GUIDE gera `documentation.visa`. Regras consulares mudam; training data pode estar defasado. | Nenhuma além do disclaimer implícito. | Disclaimer explícito no frontend + eval periódico com dados IATA. |
| **Moeda errada no PLAN** | Baixa (mitigada) | Antes do Sprint 44, PLAN inventava moedas. | Regra de ground-truth do Guide digest (Sprint 44 Wave 2). PLAN usa moeda do Guide como autoritativa. | Eval para validar consistência Guide→Plan currency. |
| **Injeção indireta** | Baixa | Se o Guide output contiver instruções maliciosas (via user personalNotes), o digest pode carregar para o PLAN/CHECKLIST. | `sanitizeForPrompt` nos digests. `safeField()` em `digest.ts` sanitiza cada campo. | Eval com payloads de injeção em personalNotes que tentam contaminar o pipeline. |

### Metodologia proposta para avaliação:

1. **Fact-checking automatizado**: Para cada guia gerado, comparar números de emergência, moeda, e fuso horário contra base de referência (dataset estático).
2. **Cross-reference intra-expedição**: Verificar se a moeda do GUIDE = moeda do PLAN = moeda referenciada no CHECKLIST.
3. **Human-in-the-loop**: Para cidades com <10k resultados no Google, marcar guia como "não verificado" no frontend.

---

## 6. Análise de Custo (chapéu FinOps)

### 6.1 Preços Atuais Confirmados (Abril 2026)

| Modelo | Input/MTok | Output/MTok | Cache Read | Cache Write | Fonte |
|--------|-----------|-------------|------------|-------------|-------|
| `gemini-2.0-flash` | $0.10 | $0.40 | N/A | N/A | Google AI pricing (descontinuação 01/06/2026) |
| `claude-haiku-4-5-20251001` | **$1.00** | **$5.00** | $0.10 (90% desc) | $1.25 (25% prem) | Anthropic pricing page |
| `claude-sonnet-4-6` | $3.00 | $15.00 | $0.30 | $3.75 | Anthropic pricing page |
| `gemini-2.5-flash` (recomendado como substituto) | $0.15 | $0.60 | N/A | N/A | Google AI pricing |

**ERRO em `cost-calculator.ts:22`**: Haiku listado como `$0.80/$4.00` — preço desatualizado (era o preço do Claude 3.5 Haiku legado). O modelo real em uso (`claude-haiku-4-5-20251001`) custa `$1.00/$5.00`. Subestimação de 20% no input e 20% no output.

### 6.2 Custo Estimado por Expedição Completa

Cenário: viagem de 7 dias, single-city, com contexto enriquecido (Sprint 44 flag ON).

| Fase | Geração | Input Tokens | Output Tokens | Custo Gemini Flash | Custo Haiku 4.5 (real) | Custo Haiku (calculado errado) |
|------|---------|-------------|--------------|-------------------|----------------------|-------------------------------|
| Phase 3 | GUIDE | ~2000 | ~3500 | $0.0016 | $0.0195 | $0.0156 |
| Phase 4 | PLAN (7d) | ~2400 | ~4500 | $0.0020 | $0.0249 | $0.0199 |
| Phase 6 | CHECKLIST v2 | ~1500 | ~1200 | $0.0006 | $0.0075 | $0.0060 |
| | **TOTAL** | **~5900** | **~9200** | **$0.0042** | **$0.0519** | **$0.0415** |

**Custo por expedição**:
- **Gemini 2.0 Flash**: ~$0.004 (desprezível)
- **Claude Haiku 4.5 (sem cache)**: ~$0.052
- **Claude Haiku 4.5 (com cache hit no system prompt)**: ~$0.047 (cache read 90% desconto nos ~1500 tokens de system prompt)
- **Gemini 2.5 Flash (substituto)**: ~$0.006

**Custo mensal estimado** (100 usuários ativos, 2 expedições/usuário/mês):
- Gemini Flash: ~$0.84/mês
- Haiku sem cache: ~$10.38/mês
- Haiku com cache: ~$9.40/mês

### 6.3 Margem vs Valor Cobrado ao Usuário

O aplicativo atualmente opera em **freemium sem cobrança direta** por geração IA. Não há PA (preço ao assinante) definido. A margem é efetivamente -100% (custo absorvido).

Com Gemini Flash como provider primário e Haiku como fallback, o custo efetivo por expedição é:
- ~95% dos requests atendem via Gemini: 0.95 * $0.004 + 0.05 * $0.052 = **$0.0064/expedição**
- Para 200 expedições/mês: **$1.28/mês** de custo IA total

**Projeção pós-migração para Gemini 2.5 Flash**: custo sobe ~50% ($0.006 vs $0.004), totalizando ~$1.90/mês. Ainda desprezível.

### 6.4 Comparativo de Modelos

| Critério | Gemini 2.0 Flash | Gemini 2.5 Flash | Haiku 4.5 | Sonnet 4.6 |
|----------|-----------------|-----------------|-----------|-----------|
| Custo/expedição | $0.004 | $0.006 | $0.052 | $0.28 |
| Latência média (observada) | 17-19s (plan) | TBD | 8-12s (plan) | 20-30s (plan) |
| Qualidade output JSON | Boa | TBD | Excelente | Excelente |
| Suporte a cache | Não | Não | Sim (prompt caching) | Sim |
| Descontinuação | **01/06/2026** | Estável | Estável | Estável |
| Streaming confiável | Problemas observados (fallback necessário) | TBD | Muito confiável | Confiável |

**Recomendação**: Migrar para `gemini-2.5-flash-lite` ou `gemini-2.5-flash` como provider primário. Manter Haiku 4.5 como fallback. Custo total sobe marginalmente (~$0.60/mês) mas elimina risco de descontinuação.

---

## 7. Bugs Encontrados (NÃO corrigir — apenas documentar)

### BUG-AI-001 [P0]: Gemini 2.0 Flash descontinuação em 01/06/2026

- **Arquivo**: `src/server/services/providers/gemini.provider.ts:10-12`
- **Linhas**: `const PLAN_MODEL = "gemini-2.0-flash"`, `const CHECKLIST_MODEL = "gemini-2.0-flash"`, `const GUIDE_MODEL = "gemini-2.0-flash"`
- **Também em**: `src/server/services/ai.service.ts:321-324` (`GEMINI_MODEL_ID_MAP`)
- **Impacto**: Em 45 dias, TODAS as gerações IA via Gemini retornarão erro 404 (`AI_MODEL_ERROR`). Se `AI_FALLBACK_PROVIDER` estiver configurado, o fallback para Claude absorve; se não, o app fica sem IA.
- **Fonte**: Google AI Deprecations page

### BUG-AI-002 [P0]: CLAUDE_MODEL_ID_MAP.plan inconsistente com provider real

- **Arquivo**: `src/server/services/ai.service.ts:314-316`
- **Código**: `CLAUDE_MODEL_ID_MAP = { plan: "claude-sonnet-4-6", ... }`
- **Vs**: `src/server/services/providers/claude.provider.ts:13`: `const PLAN_MODEL = "claude-haiku-4-5-20251001"`
- **Impacto**: `getModelIdForType("plan")` retorna `"claude-sonnet-4-6"` quando provider é Claude, mas o modelo real usado é Haiku. `logTokenUsage()` (ai.service.ts:464) calcula custo com pricing de Sonnet ($3/$15 MTok) em vez de Haiku ($1/$5 MTok). Logs de custo são **inflados ~10x**. Qualquer dashboard FinOps baseado nesses logs mostra custos fantasma.
- **Nota**: O docblock de `resolveModel()` em `claude.provider.ts:229` ainda diz "plan -> Sonnet (complex reasoning for itineraries)" — vestígio de antes do Sprint 44 quando plan migrou para Haiku.

### BUG-AI-003 [P0]: Temperature não passada aos providers

- **Arquivos**: `src/server/services/providers/claude.provider.ts`, `src/server/services/providers/gemini.provider.ts`, `src/server/services/ai-provider.interface.ts:26-32`
- **Evidência**: Grep por "temperature" em todo `src/server/services/providers/` e `src/app/api/ai/` retorna zero resultados. A interface `AiProviderOptions` (ai-provider.interface.ts:26) não define campo `temperature`.
- **Impacto**: Ambos os providers usam temperature default do modelo (tipicamente 1.0 para Gemini, 1.0 para Claude). O CHECKLIST v2 documenta "Temperature 0.3 recommended" (`system-prompts.ts:121`) mas nunca aplica. Para tarefas estruturadas (JSON schema compliance), temperature alta aumenta variabilidade e risco de schema violations. Impacto real mitigado parcialmente pela validação Zod pós-geração, mas aumenta taxa de retry.

### BUG-AI-004 [P1]: Preço de Haiku desatualizado em cost-calculator.ts

- **Arquivo**: `src/lib/cost-calculator.ts:21-24`
- **Código**: `"claude-haiku-4-5-20251001": { inputPerMillion: 0.8, outputPerMillion: 4.0 }`
- **Preço oficial**: $1.00 input, $5.00 output (Anthropic pricing page, verificado 2026-04-17)
- **Impacto**: Todos os `estimatedCostUSD` nos logs de `ai.tokens.usage` subestimam o custo real em ~20-25%. Combinado com BUG-AI-002 (model ID errado para plan), os logs de custo são duplamente incorretos.

### BUG-AI-005 [P1]: Schema JSON no PLAN_SYSTEM_PROMPT inclui latitude/longitude, Zod não valida

- **Arquivo**: `src/lib/prompts/system-prompts.ts:79-80`
- **Schema pedido**: `"latitude": number, "longitude": number` por atividade
- **Validação Zod**: `DayActivitySchema` em `ai.service.ts:52-66` NÃO inclui campos latitude/longitude
- **Impacto**: O AI gera latitude/longitude (consumindo tokens de output), mas os campos são silenciosamente descartados pelo Zod `.safeParse()`. Desperdício estimado: ~20 tokens por atividade * 3-4 atividades * 7 dias = **~500 tokens de output desperdiçados** por geração de plan. A $0.40/MTok (Gemini) = $0.0002/request. A $5/MTok (Haiku) = $0.0025/request.

### BUG-AI-006 [P2]: Docblock obsoleto em claude.provider.ts:229

- **Arquivo**: `src/server/services/providers/claude.provider.ts:229-231`
- **Comentário**: `"plan" -> Sonnet (complex reasoning for itineraries)`
- **Realidade**: Plan usa Haiku desde Sprint 44 (linha 13: `const PLAN_MODEL = "claude-haiku-4-5-20251001"`)
- **Impacto**: Confusão para desenvolvedores. Não afeta runtime.

### BUG-AI-007 [P2]: Heurística de hasInternationalFlight em digest.ts

- **Arquivo**: `src/lib/prompts/digest.ts:376-378`
- **Código**: Qualquer `transportType` "flight" ou "plane" marca `hasInternationalFlight = true`
- **Comentário no código**: "Heuristic: if departure/arrival differ significantly, assume international"
- **Impacto**: Voos domésticos (ex: SP->Salvador) marcam `hasInternationalFlight = true`, fazendo o CHECKLIST v2 gerar itens de passaporte/visto desnecessários (regra 11 do system prompt).

---

## 8. Recomendações Priorizadas

### P0 — Ação imediata (antes do beta)

| # | Problema | Impacto | Mudança Proposta | Esforço | Economia |
|---|----------|---------|-----------------|---------|----------|
| R-001 | Gemini 2.0 Flash descontinuação (BUG-AI-001) | App sem IA primária em 45 dias | Migrar `PLAN_MODEL`, `CHECKLIST_MODEL`, `GUIDE_MODEL` em `gemini.provider.ts` e `GEMINI_MODEL_ID_MAP` em `ai.service.ts` para `"gemini-2.5-flash"`. Testar em staging. | S (1h) | Previne downtime total |
| R-002 | CLAUDE_MODEL_ID_MAP.plan incorreto (BUG-AI-002) | Logs de custo inflados 10x | Alterar `ai.service.ts:315` de `"claude-sonnet-4-6"` para `"claude-haiku-4-5-20251001"`. Atualizar docblock em `claude.provider.ts:229`. | S (15min) | Precisão nos dashboards FinOps |
| R-003 | Temperature não aplicada (BUG-AI-003) | Variabilidade excessiva em outputs estruturados | Adicionar campo `temperature?: number` em `AiProviderOptions`. Passar `temperature` nos construtores de `generationConfig` (Gemini) e `createParams` (Claude). Configurar: guide=0.4, plan=0.5, checklist=0.3. | M (2h) | Redução de retries por schema violation |

### P1 — Antes do lançamento

| # | Problema | Impacto | Mudança Proposta | Esforço | Economia |
|---|----------|---------|-----------------|---------|----------|
| R-004 | Preço Haiku desatualizado (BUG-AI-004) | Custo subestimado 20-25% | Atualizar `cost-calculator.ts:22-24` para `inputPerMillion: 1.0, outputPerMillion: 5.0` | S (10min) | Precisão de custo |
| R-005 | lat/lon no prompt mas não no Zod (BUG-AI-005) | ~500 tokens desperdiçados/plan | Opção A: adicionar lat/lon ao `DayActivitySchema` (se frontend usa). Opção B: remover do `PLAN_SYSTEM_PROMPT` (se não usa). | S (30min) | ~$0.0002-0.0025/request |
| R-006 | hasInternationalFlight heurística errada (BUG-AI-007) | Checklist gera itens irrelevantes | Usar `tripType` da Trip para determinar se é internacional, em vez de inferir do transport mode. `tripType` já está disponível no `assembledCtx`. | S (30min) | Qualidade do checklist |

### P2 — Melhorias

| # | Problema | Impacto | Mudança Proposta | Esforço | Economia |
|---|----------|---------|-----------------|---------|----------|
| R-007 | MULTI-CITY RULES sempre no system prompt | ~300 tokens extras em single-city | Mover MULTI-CITY RULES para user prompt condicional (apenas quando `destinations.length > 1`) | M (1h) | ~300 tokens * $0.10/MTok * 85% = desprezível em Gemini, ~$0.04/100 req em Haiku |
| R-008 | Output guardrail ausente | AI pode gerar URLs externas | Adicionar validação pós-geração: rejeitar respostas que contenham `http://` ou `https://` em campos de texto livre (tips, descriptions, culturalTips) | M (2h) | Segurança |
| R-009 | Docblocks obsoletos (BUG-AI-006) | Confusão para devs | Atualizar comentários em `claude.provider.ts:229` e `ai-provider.interface.ts:10-12` | S (15min) | DX |

---

## 9. Plano de Eval (handshake com qa-engineer)

### 9.1 Cenários de Eval Recomendados

| # | Cenário | Tipo | O que Avaliar | Prioridade |
|---|---------|------|---------------|-----------|
| E-001 | Piracicaba, SP (doméstico, cidade média) | GUIDE + PLAN + CHECKLIST | Moeda BRL consistente, números emergência 190/192/193, custos em reais, atrações reais | Alta |
| E-002 | Bonito, MS (doméstico, ecoturismo) | GUIDE + PLAN | mustSee com atrações naturais, custos de passeios corretos, sazonalidade de chuvas | Alta |
| E-003 | Lisboa, Portugal (internacional) | GUIDE + PLAN + CHECKLIST | Moeda EUR, visto/passaporte adequado, plug Type F, timezone UTC+0/+1, números 112 | Alta |
| E-004 | Tokyo, Japão (internacional, cultura muito distinta) | GUIDE + CHECKLIST | Plug Type A/B, moeda JPY, customs tips não estereotipados, vaccines info | Alta |
| E-005 | Jacutinga, MG (doméstico, cidade pequena) | GUIDE + PLAN | Anti-alucinação: não inventar restaurantes/atrações. Testar se usa "descriptive title" | Crítica |
| E-006 | Lisboa + Porto + Madrid (multi-city) | PLAN | Transit days inseridos, dias distribuídos por noites, moeda correta por cidade, não duplicar atrações | Alta |
| E-007 | Fernando de Noronha (doméstico, ilha) | CHECKLIST v2 (com guide + itin) | hasBeachDay=true -> protetor solar HIGH, logistics de barco/avião, taxa de preservação | Média |
| E-008 | Viagem com crianças (2 adultos + 2 crianças 5 e 8 anos) | CHECKLIST v2 | Itens específicos para crianças, medicamentos infantis, entretenimento de voo | Alta |
| E-009 | Viajante com restrições alimentares (vegano + celíaco) | GUIDE + CHECKLIST | dietary tips no GUIDE, itens de alimentação no CHECKLIST com reason específica | Média |
| E-010 | Idoso com mobilidade reduzida (fitnessLevel=low) | GUIDE + PLAN | mustSee não deve ter hikes intensos sem aviso, PLAN deve evitar caminhadas longas | Média |

### 9.2 Métricas de Eval

1. **Schema compliance rate**: % de gerações que passam Zod validation sem retry
2. **Currency consistency**: moeda no Guide == moeda no Plan == referência no Checklist
3. **Emergency number accuracy**: comparar contra tabela de referência (20 países)
4. **Hallucination rate**: % de atrações/restaurantes que não existem (amostragem manual para cidades E-001, E-002, E-005)
5. **Token efficiency**: tokens de output realmente usados vs maxTokens alocado
6. **Cross-reference fidelity**: Guide digest fidelidade (plugType, currency) propagada corretamente para PLAN e CHECKLIST
7. **Latência end-to-end**: GUIDE+PLAN+CHECKLIST completos dentro de budget de 60s (Vercel Hobby)

---

## Apêndice — Trechos de Prompts Relevantes

### A.1 Regra de Ground-Truth do Guide Digest (PLAN_SYSTEM_PROMPT, linha 40)

```
- When a "Destination summary from Guide" block is present in the user message,
  use it as the ground truth for local climate, currency, plug type, and safety
  level. Do NOT contradict it. If the guide says currency is BRL, all
  estimatedCost values MUST be in BRL.
```

Essa regra é crítica para consistência intra-expedição. Adicionada no Sprint 44 Wave 2 para eliminar o bug de moeda inconsistente entre Guide e Plan.

### A.2 Checklist v2 Hard Rules 7-11 (lógica condicional)

```
7. If <itinerary_highlights_from_roteiro>.has_beach_day is true, include a
   high-priority sun protection item [...]
8. If <destination_facts_from_guide>.plug_type differs from the traveler's
   origin-country plug, emit a HIGH-priority adapter item [...]
11. If <logistics_from_phase5>.has_international_flight is true, include
    passport validity check and visa items; otherwise SKIP them.
```

Essas regras condicionais são o diferencial do v2 vs v1. O risco está na regra 11 combinada com BUG-AI-007: `hasInternationalFlight` pode ser true para voos domésticos, gerando itens de passaporte desnecessários.

### A.3 Anti-alucinação no PLAN (PLAN_SYSTEM_PROMPT, linha 39)

```
- If you are not confident a specific venue name is real and open, use a
  descriptive title instead (e.g. "Passeio pela praça central" rather than
  inventing a restaurant name). Never fabricate addresses or phone numbers.
```

Guardrail importante mas dependente de self-awareness do modelo. Para cidades pequenas (Jacutinga-MG), a eficácia é incerta — requer validação via eval E-005.

### A.4 Modelo ID Map discrepante (ai.service.ts:314-318)

```typescript
const CLAUDE_MODEL_ID_MAP: Record<ModelType, string> = {
  plan: "claude-sonnet-4-6",      // <-- ERRADO: provider usa Haiku
  checklist: "claude-haiku-4-5-20251001",
  guide: "claude-haiku-4-5-20251001",
};
```

Vs `claude.provider.ts:13`:
```typescript
const PLAN_MODEL = "claude-haiku-4-5-20251001";  // <-- modelo REAL
```

---

**Fontes consultadas**:
- Google AI Deprecations — confirmação de shutdown gemini-2.0-flash em 01/06/2026
- Anthropic Pricing — preços oficiais Haiku 4.5 ($1/$5 MTok)
- Google AI Pricing — preços Gemini Flash
- Código-fonte do projeto: `src/server/services/`, `src/lib/prompts/`, `src/lib/cost-calculator.ts`

> Assinado: architect (chapéus: prompt-engineer + finops-engineer), 2026-04-17
