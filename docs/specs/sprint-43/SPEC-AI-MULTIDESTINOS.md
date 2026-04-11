# SPEC-AI-MULTIDESTINOS — Multi-City Guide + Integrated Plan

| Campo | Valor |
|---|---|
| **Spec ID** | SPEC-AI-043-001 |
| **Version** | 1.0.0 |
| **Status** | Draft |
| **Owner** | prompt-engineer |
| **Date** | 2026-04-10 |
| **Sprint** | 43 |
| **Related** | SPEC-PROD-043-001 (pricing), SPEC-ARCH-043-001 (Destination[] schema) |
| **Supersedes** | — |
| **Change history** | 1.0.0 (2026-04-10): Initial draft. |

---

## 1. Problem Statement

Os prompts atuais (`PLAN_SYSTEM_PROMPT`, `GUIDE_SYSTEM_PROMPT`) e suas rotinas de orquestração (`ai.service.ts::generateDestinationGuide`, `app/api/ai/plan/stream/route.ts`) assumem **uma única cidade por expedição**. O roadmap do Sprint 43 introduz expedições multi-destino: até **4 cidades** por viagem (1 para Free, até 4 para Premium), conectadas por dias de trânsito.

A generalização precisa preservar três invariantes operacionais que o Sprint 42 estabeleceu como não-negociáveis:

1. **Vercel Hobby 60s** — nenhum request pode exceder o timeout serverless.
2. **Custo marginal Gemini** — o delta de custo para N cidades tem que manter a margem >1.000% sobre a receita em PA.
3. **Streaming UX** — o usuário continua vendo os dias do plano aparecerem progressivamente, sem "tela branca" de 20+ segundos.

Além disso:

- O schema JSON do plano precisa expressar **coerência geográfica** (qual dia está em qual cidade) e **dias de trânsito** (transição entre cidades).
- Os guias de cidade não podem se contradizer (orçamentos divergentes, atrações duplicadas).
- A parelelização não pode explodir o rate limit do Gemini free tier (15 req/min).

Este documento é **apenas especificação** — nenhum arquivo de código é modificado.

---

## 2. Objetivos e Não-Objetivos

### 2.1 Objetivos

- **O1**: Permitir a geração de 1..4 guias de cidade em paralelo para uma mesma expedição, preservando a qualidade individual de cada guia.
- **O2**: Gerar **um único plano (itinerário)** que cubra toda a viagem multi-cidade, com dias de trânsito explícitos.
- **O3**: Manter tempo total de espera do usuário < 30s (bem abaixo de Vercel Hobby 60s).
- **O4**: Manter custo por expedição multi-cidade dentro da faixa de $0.005..$0.02 (Gemini primário).
- **O5**: Introduzir datasets de eval para 2, 3 e 4 cidades antes do rollout.

### 2.2 Não-Objetivos

- **NO1**: Streaming da Fase 5 (guias) — continua não-streaming; paralelismo resolve o custo de latência.
- **NO2**: Suporte a 5+ cidades — hard cap em 4 cidades (flag em Open Questions).
- **NO3**: Normalização de moedas cross-country (flag em Open Questions).
- **NO4**: Checklist multi-país (fica para SPEC-ARCH).

---

## 3. Decisões Travadas pelo Time (inputs)

| Decisão | Valor | Origem |
|---|---|---|
| Max cidades por expedição | 4 (1 Free, até 4 Premium) | product-owner |
| Guias por expedição | 1 por cidade, paralelizados | architect |
| Plano por expedição | 1 plano integrado (Phase 6) | architect |
| Custo PA por cidade extra | +30 PA guide + +15 PA plan = **+45 PA** | product-owner + finops |
| Provider primário | Gemini Flash | SPEC-ARCH + FinOps Sprint 42 |
| Provider fallback | Claude Haiku 4.5 | FinOps Sprint 42 |
| Provider premium opt-in | Claude Sonnet 4.6 | FinOps Sprint 42 |

---

## 4. Fase 5 — Guides (Alterações Mínimas)

### 4.1 Princípio de design

O `GUIDE_SYSTEM_PROMPT` atual é **city-agnostic**: recebe `<destination>` e gera um JSON estruturado. Esta natureza stateless é o que habilita paralelização trivial. A única extensão necessária é **informar ao modelo que esta cidade faz parte de uma expedição maior**, para que ele evite contradições e duplicações.

### 4.2 Mudanças no `destinationGuidePrompt.buildUserPrompt`

Adiciona-se um **bloco opcional `<trip_context>`** injetado antes de `<traveler_context>`. Este bloco carrega informação das cidades-irmãs, a ordem na expedição, e as dimensões compartilhadas (budget, pace, interests). O `GUIDE_SYSTEM_PROMPT` ganha 2 regras novas (§4.3).

Draft do XML:

```xml
<trip_context>
  <expedition_order current="2" total="4" />
  <nights_in_this_city>3</nights_in_this_city>
  <sibling_cities>
    <city order="1" name="Lisboa" country="PT" nights="3" />
    <city order="3" name="Sevilha" country="ES" nights="2" />
    <city order="4" name="Barcelona" country="ES" nights="4" />
  </sibling_cities>
  <shared>
    <budget amount="3500" currency="EUR" />
    <travel_pace>moderate</travel_pace>
    <interests>food, culture, architecture</interests>
  </shared>
  <constraints>
    <avoid_duplicating_attractions_with>Lisboa, Sevilha, Barcelona</avoid_duplicating_attractions_with>
    <currency_alignment>use EUR consistently across all sibling cities</currency_alignment>
  </constraints>
</trip_context>
```

### 4.3 Extensão do `GUIDE_SYSTEM_PROMPT`

Duas regras são **apensadas** à seção `HARD RULES` (11 e 12), sem reescrever o prompt existente:

```text
11. If a <trip_context> tag is present, this guide is one of several cities
    in a multi-city expedition. You MUST:
    (a) Avoid listing mustSee items that are clearly signature attractions
        of the sibling cities listed in <sibling_cities>.
    (b) Use the shared currency and budget tier consistently with siblings.
    (c) Calibrate mustSee count to nights_in_this_city: 1 night → 4 items,
        2 nights → 5 items, 3+ nights → 6-8 items (overriding travelPace rule
        when in conflict).
12. If <trip_context> is absent, treat the guide as a single-city expedition
    (current behavior, 100% backwards compatible).
```

### 4.4 Orquestração paralela

```text
cities = [{order, name, country, nights, lat, lng}, ...]  // 1..4
guides = Promise.all(cities.map(city =>
  generateDestinationGuide({
    destination: city.name,
    language,
    travelerContext,
    extraCategories,
    personalNotes,
    tripContext: {
      order: city.order,
      total: cities.length,
      nightsInThisCity: city.nights,
      siblings: cities.filter(c => c.order !== city.order),
      shared: { budget, currency, travelPace, interests }
    }
  })
))
```

### 4.5 Rate limit — Gemini free tier

- Gemini 2.0 Flash free tier: **15 req/min**
- 4 calls paralelas por usuário = 4 req em burst → **cabe com folga 11 req de margem**
- Haiku fallback: sem limite estrito de RPM em Tier 1; 4 calls simultâneas são suportadas
- Se múltiplos usuários disparam simultaneamente: ver §10 (observability) para alertas

### 4.6 Cache behavior

O cache atual em `ai.service.ts::generateDestinationGuide` usa `buildGuideCacheInput(destination, language, travelerContext)`. Para multi-cidade, o `tripContext` **NÃO deve** entrar no hash de cache do guide individual, porque isso eliminaria completamente o reuso entre expedições. **Proposta**: hash inclui `destination + language + travelerContext + shared-dimensions` (budget tier, pace, interests), mas NÃO inclui `siblings` nem `expedition_order`. Trade-off: 2 guias gerados em contextos de expedição diferentes podem ter pequenas diferenças não cacheadas. Aceitável.

---

## 5. Fase 6 — Plan (Mudanças Significativas)

### 5.1 Novo input shape

O schema de entrada em `travelPlanPrompt.buildUserPrompt` ganha um campo `destinations: Destination[]` (substitui o `destination: string` singular quando `destinations.length >= 2`; singular permanece para retro-compatibilidade).

```ts
type Destination = {
  order: number;          // 1-based
  city: string;
  country: string;
  countryCode: string;    // ISO-3166-1 alpha-2
  lat: number;
  lng: number;
  nights: number;         // integer >= 1
};
```

### 5.2 Semântica de "transit day"

Um **dia de trânsito** é um dia em que o viajante se move da cidade A para a cidade B. O modelo deve gerar:

- **manhã**: 1 atividade leve na cidade A (café, última foto, checkout)
- **tarde**: 1 atividade de "transit" (deslocamento físico entre cidades — avião, trem, ônibus, carro)
- **noite**: 1 atividade de chegada na cidade B (jantar, orientação, descanso)

Total: **3 atividades** no dia de trânsito (ver Open Question §16 sobre flexibilização 2-4).

### 5.3 Extensão do schema JSON do plano

Cada item em `days[]` ganha três campos:

```json
{
  "dayNumber": 4,
  "date": "2026-05-12",
  "theme": "Lisbon → Seville",
  "city": "Seville",
  "isTransit": true,
  "transitFrom": "Lisbon",
  "transitTo": "Seville",
  "activities": [ ... ]
}
```

Regras:
- Em dia não-trânsito: `city` = cidade onde o viajante está dormindo; `isTransit: false`; `transitFrom/transitTo` omitidos
- Em dia de trânsito: `city` = cidade de destino (onde dormirá); `isTransit: true`; `transitFrom` e `transitTo` obrigatórios
- O número de `days[]` deve ser igual ao total de noites + 1 (ou igual a `totalDays` calculado em `getDaysBetween`)
- A soma de `nights` das cidades + (N-1) dias de trânsito deve bater com `totalDays`; se não bater, o modelo ajusta as estadias, não corta o trânsito

### 5.4 Novo `PLAN_SYSTEM_PROMPT` (draft completo)

```text
You are a professional travel planner. Your task is to create a day-by-day
travel itinerary as a single valid JSON object. The itinerary may span one
or multiple cities (up to 4), with transit days between cities.

IMPORTANT CONSTRAINTS:
- Keep each activity description to 1 short sentence (max 15 words).
- Plan 3-5 activities per NON-TRANSIT day. For trips longer than 10 days,
  plan 3 activities per day.
- TRANSIT DAYS must contain exactly 3 activities: morning (in origin city),
  afternoon (physical transit between cities), evening (arrival in destination).
- Keep tips to 3-5 items max, each under 15 words.
- Do NOT include markdown, code fences, or any text outside the JSON.
- Respond ONLY with the JSON structure specified below.

MULTI-CITY RULES (apply when more than one destination is present):
1. The itinerary MUST follow the order specified in <destinations>. Never
   reorder cities.
2. The number of days in each city MUST match the <nights> value specified
   for that city, plus one transit day when moving to the next city.
3. A transit day belongs to the DESTINATION city (the city where the traveler
   will sleep that night), and its "city" field is the destination city.
4. The first day is never a transit day. The last day is never a transit day.
5. Transit day themes MUST follow the pattern "<origin> → <destination>".
6. When generating transit afternoon activities, INFER travel mode from the
   <transport> tag if present; otherwise default to flight for international
   hops >500km, train for hops <500km within the same country.
7. Currency: use the single currency specified in <budget>. Do not mix
   currencies across cities even if they span different countries.
8. Budget estimates: distribute the total budget proportionally to the
   nights in each city, reserving ~5% of the total budget for transit days.

JSON SCHEMA:
{
  "destination": "string (comma-separated city list, e.g. 'Lisbon, Seville, Barcelona')",
  "totalDays": number,
  "estimatedBudgetUsed": number,
  "currency": "string",
  "days": [
    {
      "dayNumber": number,
      "date": "YYYY-MM-DD",
      "theme": "string (max 6 words)",
      "city": "string (city where traveler sleeps that night)",
      "isTransit": boolean,
      "transitFrom": "string (only if isTransit=true)",
      "transitTo": "string (only if isTransit=true)",
      "activities": [
        {
          "title": "string (max 8 words)",
          "description": "string (max 15 words)",
          "startTime": "HH:MM",
          "endTime": "HH:MM",
          "estimatedCost": number,
          "activityType": "SIGHTSEEING|FOOD|TRANSPORT|ACCOMMODATION|LEISURE|SHOPPING",
          "latitude": number,
          "longitude": number
        }
      ]
    }
  ],
  "tips": ["string (max 15 words each)"]
}
```

### 5.5 Exemplo de user prompt — 4 cidades, 14 dias

```xml
<trip>
  <language>Brazilian Portuguese</language>
  <start_date>2026-05-09</start_date>
  <end_date>2026-05-22</end_date>
  <total_days>14</total_days>
  <travelers>
    <adults>2</adults>
    <children>0</children>
  </travelers>
  <travel_style>comfortable</travel_style>
  <budget amount="4800" currency="EUR" />
  <destinations>
    <city order="1" name="Lisbon"    country="Portugal" nights="3" lat="38.7223" lng="-9.1393" />
    <city order="2" name="Seville"   country="Spain"    nights="2" lat="37.3891" lng="-5.9845" />
    <city order="3" name="Barcelona" country="Spain"    nights="4" lat="41.3851" lng="2.1734"  />
    <city order="4" name="Rome"      country="Italy"    nights="2" lat="41.9028" lng="12.4964" />
  </destinations>
  <transport>
    <segment from="Lisbon"    to="Seville"   mode="train" />
    <segment from="Seville"   to="Barcelona" mode="flight" />
    <segment from="Barcelona" to="Rome"      mode="flight" />
  </transport>
  <interests>food, architecture, history</interests>
</trip>

Generate a 14-day itinerary. Expected day distribution:
- Days 1-3: Lisbon (3 nights)
- Day 4:    Lisbon → Seville (transit)
- Days 5-6: Seville (2 nights)
- Day 7:    Seville → Barcelona (transit)
- Days 8-11: Barcelona (4 nights)
- Day 12:   Barcelona → Rome (transit)
- Days 13-14: Rome (2 nights)
```

Observação: o modelo recebe o cronograma explícito no bloco de texto livre. Isso reduz em ~80% a chance de o modelo calcular mal a aritmética de dias/noites. É mais barato (em tokens) do que deixar o modelo inferir.

---

## 6. Análise de Orçamento de Tokens

### 6.1 Baseline Sprint 42 (1 cidade, 7 dias)

| Métrica | Valor |
|---|---:|
| Input (sys + user) | ~1.400 tok |
| Output médio | ~6.500 tok |
| `MAX_PLAN_TOKENS` clamp | 8.000 tok |

Fonte: `docs/finops/SPRINT-42-FINOPS-REVIEW.md` §1.2.

### 6.2 Projeção multi-cidade — mesma duração

A intuição importante: **com total_days constante, o output fica aproximadamente constante**. Dias de trânsito "substituem" dias normais, e dias de trânsito têm menos atividades (3 vs 3-5). O output TENDE a diminuir ligeiramente em itinerários multi-cidade de mesma duração.

| Cenário | total_days | Cidades | Transit days | Activity count | Output estimado |
|---|---:|---:|---:|---:|---:|
| Baseline single-city | 7 | 1 | 0 | 28 (7×4) | ~6.500 tok |
| Multi 2 cidades | 7 | 2 | 1 | 6×4 + 1×3 = 27 | ~6.400 tok |
| Multi 3 cidades | 10 | 3 | 2 | 8×4 + 2×3 = 38 | ~8.600 tok ⚠️ |
| Multi 4 cidades | 14 | 4 | 3 | 11×4 + 3×3 = 53 | ~11.500 tok ⚠️ |

**Alerta**: para viagens **longas + multi-cidade**, o output ultrapassa o clamp de 8.000. Duas opções:

- **Opção A (recomendada)**: manter `MAX_PLAN_TOKENS = 8000` e a regra existente "trips longer than 10 days → 3 activities per day". Isso derruba o output projetado de 14 dias para ~8.100 tok (no limite).
- **Opção B**: relaxar clamp para 10.000 apenas para multi-cidade longas — mas arrisca exceder 60s na streaming.

**Decisão deste spec**: Opção A. Mantém clamp=8000. Adiciona **drift warning em observability**: se output > 7.800 tokens em >5% das gerações, acionar prompt-engineer para avaliar reduzir atividades por dia.

### 6.3 Crescimento do input

| Bloco | Single-city | Multi-city (4) |
|---|---:|---:|
| SYSTEM_PROMPT | ~300 tok | ~450 tok (+150 MULTI-CITY RULES) |
| User: trip meta | ~400 tok | ~400 tok |
| User: destinations list | ~50 tok | ~250 tok (4 cidades × ~50) |
| User: transport segments | ~0 tok | ~100 tok |
| User: expected distribution hint | ~100 tok | ~200 tok |
| User: traveler context | ~550 tok | ~550 tok |
| **Total input** | **~1.400 tok** | **~1.950 tok** (cresce +40%) |

Observação: cresce menos que o output absoluto, o que é bom economicamente (input Gemini é $0.10/MTok; output é $0.40/MTok).

---

## 7. Custo por Provider — Tabela

Assumindo 4 cidades, 14 dias, ~1.950 tok input, ~8.000 tok output plan, ~3.500 tok output/guide, ~1.300 tok input/guide.

| Componente | Calls | Input total | Output total | Sonnet 4.6 | Haiku 4.5 | Gemini Flash |
|---|---:|---:|---:|---:|---:|---:|
| Checklist (1 call, sem mudança) | 1 | 400 | 1.200 | $0.0192 | $0.0051 | $0.00052 |
| Guides (4 calls, paralelo) | 4 | 5.200 | 14.000 | $0.2256 | $0.0601 | $0.00612 |
| Plan (1 call, multi-cidade) | 1 | 1.950 | 8.000 | $0.1259 | $0.0336 | $0.00339 |
| **Total 4-city expedition** | 6 | 7.550 | 23.200 | **$0.3707** | **$0.0988** | **$0.01003** |
| **Baseline 1-city expedition** | 3 | 3.100 | 11.200 | $0.1773 | $0.0472 | $0.00479 |
| **Delta absoluto** | +3 | +4.450 | +12.000 | +$0.1934 | +$0.0516 | +$0.00524 |
| **Delta percentual** | +100% | +143% | +107% | +109% | +109% | +109% |

### 7.1 Cost per extra city

| Provider | Custo por cidade extra |
|---|---:|
| Gemini Flash | **$0.00175** |
| Haiku 4.5 | **$0.0172** |
| Sonnet 4.6 | **$0.0645** |

Observação: Gemini é o único cenário em que **4 cidades custam menos que 1 guia Haiku isolado** — confirma definição da Sprint 42 de Gemini como primário.

---

## 8. Receita vs Custo — Expedição 4 Cidades

### 8.1 Custo em PA

Base 1 cidade: **160 PA** (30 checklist + 50 guide + 80 plan) — Atlas §11.2
Extras 3 cidades: **3 × 45 PA = 135 PA**
**Total 4 cidades: 295 PA**

### 8.2 Receita

- Média ponderada: **$0,00489/PA** (FinOps Sprint 42 §2.1)
- Receita: **295 PA × $0,00489 = $1,443**

### 8.3 Margem

| Provider | Custo | Receita | Margem $ | Margem % |
|---|---:|---:|---:|---:|
| Gemini Flash | $0,01003 | $1,443 | $1,433 | **14.287 %** |
| Haiku 4.5 | $0,0988 | $1,443 | $1,344 | **1.360 %** |
| Sonnet 4.6 | $0,3707 | $1,443 | $1,072 | **289 %** |

A meta de 100% de margem bruta (Atlas §11.2) continua **atendida por ordem de grandeza** com Gemini, e com folga saudável mesmo no pior cenário (Sonnet). Consistente com a política definida na Sprint 42.

---

## 9. Reconciliação dos 45 PA por Cidade Extra

### 9.1 Delta real de custo

Do §7 (Gemini Flash): custo por cidade extra ≈ **$0,00175** ≈ **0,36 PA** (usando $0,00489/PA).

### 9.2 Margem de segurança embutida no +45 PA

| Provider | Custo real/cidade | Equivalente PA | Markup no +45 PA |
|---|---:|---:|---:|
| Gemini Flash | $0.00175 | 0.36 PA | **125×** |
| Haiku 4.5 | $0.0172 | 3.5 PA | **12,9×** |
| Sonnet 4.6 | $0.0645 | 13.2 PA | **3,4×** |

### 9.3 Por que o markup é saudável (e não exagerado)

Três razões:

1. **Absorve regenerações**: um usuário que regenera o plano 2-3× em um dia de ansiedade ainda rende lucro. Custo de regen não-rateado é um risco conhecido (FinOps §9.4).
2. **Absorve overhead de eval**: o `prompt-engineer` roda evals sobre ~1% do tráfego real; esse custo sombra é diluído no markup.
3. **Preserva estabilidade de pricing**: se amanhã o team precisar pular de Gemini para Haiku (provider outage, qualidade), os 45 PA continuam cobrindo. **Não precisamos reajustar pacotes.**

### 9.4 Decomposição 30 guide + 15 plan

- **+30 PA guide**: justifica-se porque guide é onde o custo marginal real cresce (4× chamadas). +30 PA × $0,00489 = $0,147 de receita cobrindo $0,00153 (Gemini) de custo — **96× markup**.
- **+15 PA plan**: justifica-se porque o plan cresce apenas ~10% em input; não há 2ª chamada. +15 PA × $0,00489 = $0,073 cobrindo ~$0,0003 de custo marginal — **240× markup**.

A divisão **reflete corretamente** onde o custo realmente escala (multiplicação de calls em guide) vs onde é marginal (crescimento leve em plan).

---

## 10. Qualidade — Riscos e Mitigações

### 10.1 Risco de incoerência entre guias paralelos

**Sintomas esperados**:
- Faixas de preço para refeição divergentes entre cidades próximas (Sevilha "€10-15" vs Barcelona "€25-30" sem justificativa)
- Atrações duplicadas quando cidades são geograficamente próximas (p.ex. "Alhambra" listada em guide de Granada E de Córdoba)
- Nível de safety inconsistente entre cidades vizinhas
- Currency drift: moedas diferentes em países diferentes quebrando a comparabilidade

### 10.2 Mitigações aplicadas

| Mitigação | Implementação | Esperado |
|---|---|---|
| Shared context injection | `<shared>` no `<trip_context>` com budget, pace, interests, currency | Currency consistency, budget tier alignment |
| Anti-duplication instruction | Regra 11(a) no system prompt + `<avoid_duplicating_attractions_with>` | Zero sobreposição de signature attractions |
| Currency pinning | Regra 8 do novo PLAN_SYSTEM_PROMPT + `<currency_alignment>` no guide | Moeda única em toda a expedição |
| Proportional mustSee count | Regra 11(c) — count baseado em nights_in_this_city | Cidades de 1 noite não recebem 8 atrações inúteis |
| Eval golden outputs | 3 cenários (2/3/4 cidades) com assertions de coerência | Catch de drift antes do deploy |

### 10.3 Qualidade do dia de trânsito

O modelo precisa inferir o **tempo de trajeto** corretamente:
- Voo Lisboa→Barcelona: ~2h30 + aeroporto → dia de trânsito realista
- Trem Madri→Sevilha: ~2h45 → dia com mais tempo livre
- Ônibus Dubrovnik→Split: ~4h → atividades limitadas no destino

**Mitigação**: o bloco `<transport>` injetado no user prompt da Fase 6 informa explicitamente o modo de transporte declarado pelo usuário na Fase 4. O modelo não precisa adivinhar.

### 10.4 Avaliação qualitativa mínima antes do rollout

- 3 cenários em `tests/evals/scenarios/`:
  - `multi-city-2-iberia.json` (Lisboa + Sevilha, 6 dias)
  - `multi-city-3-italy.json` (Roma + Florença + Veneza, 9 dias)
  - `multi-city-4-europe.json` (Lisboa + Sevilha + Barcelona + Roma, 14 dias)
- Para cada cenário, golden output com assertions:
  1. Nenhuma atração duplicada entre guides
  2. Variância de daily budget < 30% entre cidades do mesmo tier
  3. `city` do plan alinha com nights declarados no input (100%)
  4. Dias de trânsito presentes conforme esperado (N-1 para N cidades)
  5. `totalDays` do plan = soma de nights + dias de trânsito

---

## 11. Streaming Behavior

### 11.1 Fase 5 — Guides

- **NOT streaming**. Continua usando `generateResponse` (blocking).
- 4 calls em paralelo via `Promise.all`.
- Latência esperada: ~5-8s por call no Gemini (6-9s no Haiku fallback).
- Wall-clock time ≈ latência do call mais lento ≈ **~8-10s para 4 cidades**.
- UX: single loading state com barra "Gerando guias para 4 cidades..."; progresso incremental opcional via `Promise.allSettled` + SSE downgrade (Open Question).

### 11.2 Fase 6 — Plan

- **Streaming preservado**. Rota `POST /api/ai/plan/stream` permanece SSE.
- Cada `day` aparece progressivamente conforme o modelo gera.
- Dias de trânsito aparecem no meio do stream, exatamente como dias normais.
- Latência esperada: ~15-18s full stream para 14 dias multi-cidade (Gemini Flash), consistente com baseline de 7 dias single-city (~13-15s).

### 11.3 Budget total de tempo

| Fase | Tempo |
|---|---:|
| Fase 3 — Checklist (já existe) | ~3-5s |
| Fase 5 — 4 guides paralelos | ~8-10s |
| Fase 6 — Plan streaming (14 dias) | ~15-18s |
| **Pior caso soma** | **~33s** |

Bem abaixo de Vercel Hobby 60s. Inclusive, por serem rotas diferentes, as fases 5 e 6 **não compartilham** o orçamento de 60s — cada uma tem seu próprio timeout.

---

## 12. Fallback Behavior

### 12.1 Falha parcial de guides

```text
Para cada cidade i em 1..N:
  try {
    guides[i] = await generateDestinationGuide(city_i)
  } catch (err) {
    // retry uma vez
    try {
      guides[i] = await generateDestinationGuide(city_i)
    } catch (err2) {
      guides[i] = { error: true, city: city_i.name }
    }
  }
```

- Se 1 de N guides falha após 1 retry: **continuar a expedição**. UI mostra "Guia de Sevilha indisponível — [Tentar novamente]" apenas para a cidade afetada. As outras 3 cidades permanecem utilizáveis.
- Não cobra PA do usuário por guides que falharam definitivamente.
- `AI_FALLBACK_PROVIDER` (Haiku) ativa automaticamente via `FallbackProvider` chain existente — nenhuma mudança necessária.

### 12.2 Falha do plan

- Mesmo padrão atual da rota streaming: `parseItineraryJson` falha → retry não-streaming (`retryProvider.generateResponse`) → se falha, mid-flight recovery já implementado (`ai.stream.recovery`).
- Multi-cidade **não altera** essa lógica de fallback. O schema enriquecido (campos `city`, `isTransit`) pode falhar validação Zod em casos edge — nesse caso, retry com prompt reforçado.

### 12.3 Rollback global

Se a % de erros em guides paralelos > 5% em uma janela de 1h, **feature flag** desliga automaticamente o modo multi-cidade e força single-city (cidade com maior número de nights). Ver §15 rollout plan.

---

## 13. Prompt Caching — Oportunidades

### 13.1 Anthropic (Haiku fallback)

O `GUIDE_SYSTEM_PROMPT` é **identical across all 4 parallel guide calls**. Com `cache_control: ephemeral` já ativo em `claude.provider.ts:59`:

- Call 1 (Haiku): paga preço normal pelos ~450 tokens de system prompt
- Calls 2, 3, 4: pagam cache read (90% desconto) pelos mesmos 450 tokens
- **Savings por expedição multi-cidade no fallback Haiku**: 3 × 450 × $0.8/MTok × 0.9 = **~$0.00097**

Pequeno mas **zero custo de implementação** — já funciona out of the box.

### 13.2 Gemini

Gemini 2.0 Flash **não suporta** prompt caching hoje. Nenhuma otimização possível neste eixo para o caminho primário.

### 13.3 Haiku fallback 4-call multi-city — savings total

| Componente | Sem cache | Com cache | Savings |
|---|---:|---:|---:|
| Guide inputs (4×1.300 tok) | $0.00416 | $0.00148 | $0.00268 |
| Guide outputs (4×3.500 tok) | $0.056 | $0.056 | — |
| **Totais guides** | $0.06016 | $0.05748 | **$0.00268** |

Ordem de magnitude: ~0.3% de savings. **Imaterial**, mas habilitado gratuitamente. Mantém a política da Sprint 42 de "cache ativo por default, monitorar efeitos".

---

## 14. Eval Dataset Updates

### 14.1 Novos cenários

Adicionar em `tests/evals/scenarios/`:

| Arquivo | Cidades | Duração | País(es) | Finalidade |
|---|---|---:|---|---|
| `multi-city-2-iberia.json` | Lisboa → Sevilha | 6 dias | PT + ES | Smoke test multi-país + same currency |
| `multi-city-3-italy.json` | Roma → Florença → Veneza | 9 dias | IT | Trip única-país, trem |
| `multi-city-4-europe.json` | Lisboa → Sevilha → Barcelona → Roma | 14 dias | PT+ES+IT | Extremo — misto de trem e voo |

### 14.2 Métricas de qualidade (graders)

| Métrica | Tipo | Threshold |
|---|---|---:|
| Transit coherence (dias de trânsito presentes na posição correta) | Rule-based | 100% |
| Budget consistency (CV do daily_total entre cidades) | Numeric | < 0.30 |
| Zero duplicate attractions (inter-guide) | Rule-based | 100% |
| City-date alignment (cada `day.city` corresponde ao intervalo correto) | Rule-based | 100% |
| Currency consistency | Rule-based | 100% |
| LLM-as-judge overall quality | Qualitative (Sonnet judge) | ≥ 0.85 |

### 14.3 Trust score gate

- Trust score combinado dos 3 cenários multi-cidade: **≥ 0.85**
- Integração no `npm run eval:gate` — bloqueia merge no master se < 0.85
- Baseline registrado em `tests/evals/baselines/multi-city-v1.json`
- Drift alert: se score cair > 10% vs baseline → playbook `drift-detected.md`

---

## 15. Observability

### 15.1 Métricas novas

| Métrica | Descrição | Location |
|---|---|---|
| `ai.guide.city.latency` | Latência por cidade individual no `Promise.all` | `generateDestinationGuide` wrapper |
| `ai.guide.parallel.count` | Número de cidades processadas em paralelo | Orquestrador |
| `ai.guide.parallel.failures` | Contagem de falhas por expedição (0..4) | Orquestrador |
| `ai.plan.cityCount` | Tag com N cidades no log existente `ai.stream.tokens.usage` | `plan/stream/route.ts` |
| `ai.plan.transit.days.count` | Número de dias de trânsito no output | Pós-parse |
| `ai.plan.output.tokens.drift` | Alerta quando output > 7.800 tok | Stream callback |

### 15.2 Sentry breadcrumbs

Adicionar breadcrumbs estruturados por cidade:

```text
guide.city[1].started  — { city: "Lisboa", order: 1, total: 4 }
guide.city[1].completed — { city: "Lisboa", latencyMs: 6230, outputTokens: 3612 }
guide.city[2].started  — ...
```

Facilita debug quando 1 de 4 cidades falha lentamente.

### 15.3 Admin dashboard

Adicionar widget no admin analytics:

- **Custo médio por expedição multi-cidade, por provider e por N** (1/2/3/4 cidades)
- Baseline comparativo com single-city
- Alerta visual se custo médio > $0.015 (Gemini) ou > $0.15 (Haiku) por 24h

### 15.4 Drift warnings

Warning estruturado emitido em `ai.service.ts::generateDestinationGuide` quando:
- Output > 7.800 tokens (clamp iminente)
- Latência guide > 15s (degradação Gemini)
- Latência plan > 40s (Vercel timeout iminente)

---

## 16. Effort Estimate (AI/prompt engineering only)

| Tarefa | Horas | Owner |
|---|---:|---|
| Rewrite `PLAN_SYSTEM_PROMPT` com regras multi-city | 2h | prompt-engineer |
| Iteração + 3 rodadas de test prompts manuais | 1h | prompt-engineer |
| Extend `GUIDE_SYSTEM_PROMPT` (regras 11 + 12) | 0.5h | prompt-engineer |
| `buildUserPrompt` — bloco `<trip_context>` | 0.5h | prompt-engineer |
| Wrapper paralelo em `ai.service.ts` (orquestração Promise.all + per-city retry) | 3h | dev + prompt-engineer pair |
| Eval dataset — 3 cenários + golden outputs | 4h | qa-engineer + prompt-engineer |
| Graders custom (duplicate detection, currency consistency) | 2h | qa-engineer |
| QA iteration + trust score gate ajuste | 2h | qa-engineer |
| **Total** | **~15h** | |

**Nota**: esta é a fatia de **AI/prompt only**. Trabalho de front-end (renderizar dias de trânsito, multi-guide tabs) e schema Prisma (se houver) são cobertos por SPEC-ARCH-043-001 e ficam **fora** desta estimativa.

---

## 17. Open Questions

### OQ-1 — Sequential Haiku vs parallel Gemini no fallback
Deveríamos **sequenciar** as calls no fallback Haiku para aproveitar 100% do prompt caching (máxima economia), ou paralelizar também no Haiku para preservar UX uniforme? **Trade-off**:
- Sequential Haiku: +30s wall-clock, economiza ~$0.002
- Parallel Haiku: mesmo ~10s de wall-clock, perde caching parcial

**Recomendação**: paralelizar sempre, manter caching ativo (ele pega nas subsequentes dentro dos ~5min de TTL). **Pedir validação do prompt-engineer + finops.**

### OQ-2 — Transit day: 3 exato ou 2-4 flexível?
Forçar 3 atividades engessa o modelo. Permitir 2-4 oferece flexibilidade (p.ex. voo longo pode justificar apenas 1 manhã + 1 chegada). **Risco**: modelo pode "economizar" atividades em dias de trânsito curtos. **Recomendação**: forçar 3 na v1.0, relaxar na v1.1 se eval mostrar output mecânico.

### OQ-3 — Hard cap de 4 cidades?
Decisão atual: 4. Produto já quer 5-6 para tier Ambassador? **Flag para product-owner**. Se sim, avaliar impacto de token budget em §6.2 Cenário 5/6 cidades (output provavelmente > 10k, quebra streaming).

### OQ-4 — Currency normalization
Trip cross-country (Lisboa + Londres + Paris): EUR + GBP + EUR. O prompt atual **força currency única** (§5.4 regra 7). Alternativas:
- Força EUR (o que está no spec) — simples, mas impreciso para Londres
- Permite multi-currency com conversão no prompt — ambíguo, pode confundir modelo
- Post-processing: converter tudo via taxa fixa no backend — mais robusto, fora do prompt
**Recomendação**: v1.0 força currency única. v1.1 avaliar post-processing.

### OQ-5 — Per-country checklist items
Para expedições multi-país, o checklist precisa cobrir visto/vacina por país, não só pelo primeiro destino. **Isto NÃO é escopo de SPEC-AI**, mas é um follow-up crítico para `architect` e `product-owner`. Flagged.

---

## 18. Rollout Plan

| Fase | Gate | Critério | Ação |
|---|---|---|---|
| 1. Eval | `npm run eval:gate` | Trust score ≥ 0.85 em 3 cenários multi-cidade | Merge na master |
| 2. Canary | Feature flag `multi_city_enabled` | Rollout para 10% dos usuários Premium | 48h observação |
| 3. Observação | Dashboards + alertas | Error rate < 2%, P95 latência < 35s, custo médio Gemini < $0.012 | OK → próxima fase |
| 4. Gradual | Feature flag | 10% → 25% → 50% | 24h entre cada degrau |
| 5. Full rollout | Feature flag | 100% Premium + 1 cidade free (sem mudança perceptível) | Monitor 7 dias |
| 6. Retro | Sprint 44 review | Finops review pós-rollout, eval re-run | Atualiza baseline |

### 18.1 Kill switch

Feature flag `multi_city_enabled` controlado por env var + Redis override. Desligar imediatamente se:
- Error rate > 5% em janela de 1h
- P95 latência > 50s em janela de 1h
- Custo diário Gemini > $5 (sinal de bug de loop)
- Trust score eval scheduled < 0.75

---

## 19. Dependencies

| Spec | Relação |
|---|---|
| **SPEC-PROD-043-001** | Define pricing +45 PA e tier Premium (1→4 cidades). Este spec **consome** os valores. |
| **SPEC-ARCH-043-001** | Define `Destination[]` no Prisma schema, migração de `Trip.destination:string` para `Trip.destinations:Destination[]`. Este spec **depende** desse schema para orquestrar o input. |
| **SPEC-UX-043-001** (futuro) | UI para seleção de múltiplas cidades e renderização de dias de trânsito. Não bloqueia este spec, mas bloqueia rollout. |
| **Atlas §11.2** | Tabela de custos atualizada pós-Sprint 42 — fonte para §7-8 deste spec. |
| **FinOps Sprint 42 Review** | Baseline de custos por provider. |
| **ADR-028** | Vercel Hobby 60s constraint — condiciona §6 e §11. |

---

## 20. Sign-off

| Papel | Responsabilidade | Status |
|---|---|---|
| prompt-engineer | Autor principal, dona dos prompts | ✍️ Draft |
| architect | Valida schema `Destination[]` + integração com SPEC-ARCH-043 | ⏳ |
| finops-engineer | Valida §7, §8, §9 e ceilings | ⏳ |
| qa-engineer | Valida §14 (eval dataset) + graders custom | ⏳ |
| security-specialist | Valida que `<trip_context>` não introduz vetor de prompt injection via sibling cities | ⏳ |
| tech-lead | Aprova esforço §16 e rollout §18 | ⏳ |
| product-owner | Valida OQ-3 (hard cap 4 cidades) | ⏳ |

---

*Fim do SPEC-AI-043-001 v1.0.0.*
