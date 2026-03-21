---
spec-id: SPEC-AI-004
title: Sprint 33 — Phase 6 Prompt Enrichment with Phases 1-5 Context
version: 1.0.0
status: Draft
author: prompt-engineer
sprint: 33
reviewers: [tech-lead, finops-engineer, security-specialist]
---

# SPEC-AI-004 — Phase 6 Prompt Enrichment

**Versao**: 1.0.0
**Status**: Draft
**Autor**: prompt-engineer
**Data**: 2026-03-20
**Sprint**: 33
**Relacionado a**: SPRINT-33-PLAN
**Architecture Spec**: (pending)

---

## 1. Contexto

### Estado Atual do Prompt

O itinerario (Phase 6) e gerado pelo template `travelPlanPrompt` em `src/lib/prompts/travel-plan.prompt.ts` (v1.0.0). O system prompt reside em `src/lib/prompts/system-prompts.ts` (`PLAN_SYSTEM_PROMPT`).

**Dados atualmente incluidos no prompt:**
- Destination, dates, days (Phase 1)
- Travel style, budget, travelers count (Phase 1/2)
- Language
- Token budget
- Travel notes (free text, optional)
- Expedition context (optional): tripType, travelerType, accommodationStyle, travelPace, budget, destinationGuideContext

**Dados NAO incluidos no prompt (disponveis nas fases 1-5):**
- Origin city (Phase 1)
- Passenger breakdown: adults/children/infants (Phase 2)
- User preferences: 10 categorias de chip selection (Phase 2)
- Transport segments: type, from, to, dates (Phase 4)
- Accommodation details: name, location, check-in/check-out (Phase 4)
- Mobility preferences: selected transport modes (Phase 4)
- Checklist status: completed items, pending items (Phase 3)
- Guide highlights: sections with summaries (Phase 5)

### Oportunidade

Enriquecer o prompt com dados das fases 1-5 permite gerar itinerarios significativamente mais personalizados. Um itinerario que sabe que o usuario vai de Guarulhos para CDG, hospeda-se em hotel boutique em Montmartre, prefere gastronomia e arte, e viaja com 2 criancas pode produzir resultados dramaticamente melhores que um que conhece apenas "Paris, 5 dias, moderado".

---

## 2. Enrichment Plan

### 2.1. Dados a Incluir (por fase)

| Fase | Dado | Exemplo | Prioridade |
|------|------|---------|------------|
| Phase 1 | Origin city | "Sao Paulo, Brazil" | P1 |
| Phase 1 | Dates + destination | "Paris, 2026-07-15 to 2026-07-20" | P0 (ja incluso) |
| Phase 2 | Passenger breakdown | "2 adults, 1 child (8yo), 1 infant" | P1 |
| Phase 2 | Travel preferences | "cultural, gastronomic, adventure, photography" | P1 |
| Phase 2 | Traveler type | "family" | P1 (ja incluso via expeditionContext) |
| Phase 2 | Travel pace | "6/10" | P2 (ja incluso via expeditionContext) |
| Phase 3 | Checklist highlights | "Visa required: YES, Travel insurance: PENDING" | P3 |
| Phase 4 | Transport segments | "Flight GRU->CDG Jul 15, Flight CDG->GRU Jul 20" | P2 |
| Phase 4 | Accommodation | "Hotel Montmartre, check-in Jul 15, check-out Jul 20" | P2 |
| Phase 4 | Mobility preferences | "metro, walking, taxi" | P2 |
| Phase 5 | Guide highlights | "Best food: Le Marais. Safety: avoid pickpockets near Eiffel Tower" | P3 |

### 2.2. Dados a NAO Incluir (PII / irrelevantes)

| Dado | Razao para exclusao |
|------|---------------------|
| birthDate | PII — use age range instead |
| bookingCode (encrypted ou plain) | PII / sensitive — irrelevante para itinerario |
| Email, phone, document numbers | PII — nunca enviar para LLM |
| Password hash | Obvio — nunca |
| userId, tripId (internal IDs) | Internal — nao agrega valor ao prompt |

---

## 3. Token Budget Analysis

### 3.1. Estimativa de Tokens Adicionais

| Componente | Tokens Estimados | Notas |
|-----------|-----------------|-------|
| Origin city | ~10 | "Origin: Sao Paulo, Brazil" |
| Passenger breakdown | ~20 | "Travelers: 2 adults, 1 child (8), 1 infant" |
| Preferences (10 categories, avg 3 each) | ~100 | XML tags + comma-separated values |
| Transport segments (avg 2) | ~80 | "Flight GRU->CDG Jul 15 dep 08:30 arr 20:45" x2 |
| Accommodation (avg 1-2) | ~60 | "Hotel Montmartre, Montmartre, Jul 15 - Jul 20" x1 |
| Mobility preferences | ~20 | "Preferred mobility: metro, walking, taxi" |
| Checklist highlights (key items only) | ~50 | "Visa: required. Insurance: pending. Vaccination: done." |
| Guide highlights (top 3 sections) | ~120 | Summaries from guide sections |
| XML structure overhead | ~40 | Tags, labels, formatting |
| **Total adicional** | **~500-600** | Conservative estimate |

### 3.2. Token Budget Total (apos enrichment)

| Componente | Tokens Antes | Tokens Depois | Delta |
|-----------|-------------|--------------|-------|
| System prompt (PLAN_SYSTEM_PROMPT) | ~350 | ~350 | 0 |
| User prompt (base) | ~150 | ~150 | 0 |
| User prompt (enrichment) | ~100 (expeditionContext) | ~600-700 | +500-600 |
| **Total input** | **~600** | **~1,100-1,200** | **+500-600** |
| Output (itinerary JSON) | ~2,000-4,000 | ~2,000-4,000 | 0 |
| **Total request** | **~2,600-4,600** | **~3,100-5,200** | **+500-600** |

### 3.3. Cost Impact

| Metrica | Antes | Depois | Delta |
|---------|-------|--------|-------|
| Input tokens / request | ~600 | ~1,200 | +600 |
| Input cost / request (Sonnet @ $3/M input) | $0.0018 | $0.0036 | +$0.0018 |
| Output tokens / request (unchanged) | ~3,000 | ~3,000 | 0 |
| Output cost / request (Sonnet @ $15/M output) | $0.045 | $0.045 | 0 |
| **Total cost / request** | **$0.047** | **$0.049** | **+$0.002** |
| Monthly impact (100 requests/mo) | $4.70 | $4.90 | +$0.20 |

**Conclusao: impacto de custo negligivel.** O aumento de ~600 tokens de input representa +$0.002/request. A ~100 requests/mes, o custo adicional e ~$0.20/mes.

---

## 4. Priority Strategy (Token Budget Overflow)

Se o token budget total ultrapassa o limite configurado (ex: trips longas com muitos segments), aplicar truncamento na seguinte ordem de prioridade (manter os mais importantes, truncar os menos importantes primeiro):

| Prioridade | Componente | Acao em overflow |
|-----------|-----------|-----------------|
| **P0** | Dates + destination + origin | Sempre incluir — base do itinerario |
| **P1** | Preferences + passenger breakdown | Incluir ate 80 tokens — truncar categorias menos selecionadas |
| **P2** | Logistics (transport + accommodation + mobility) | Incluir ate 120 tokens — resumir em 1 linha por segment |
| **P3** | Guide highlights | Incluir ate 80 tokens — apenas top 3 sections por relevancia |
| **P4** | Checklist status | Incluir ate 30 tokens — apenas items pending de alta prioridade |
| **Drop** | Travel notes (free text) | Truncar a 50 tokens se overflow |

### Implementacao do truncamento

```
function buildEnrichedContext(data, availableBudget):
  sections = []
  remaining = availableBudget

  // P0: Always include (cost: ~30 tokens)
  sections.push(buildDatesDestination(data))   // ~30 tokens
  remaining -= 30

  // P1: Include if budget allows (cost: ~120 tokens)
  if remaining > 120:
    sections.push(buildPreferencesPassengers(data))
    remaining -= tokenCount(sections.last)

  // P2: Include if budget allows (cost: ~160 tokens)
  if remaining > 160:
    sections.push(buildLogistics(data))
    remaining -= tokenCount(sections.last)
  elif remaining > 40:
    sections.push(buildLogisticsSummary(data))  // 1-line summary
    remaining -= tokenCount(sections.last)

  // P3: Include if budget allows (cost: ~120 tokens)
  if remaining > 120:
    sections.push(buildGuideHighlights(data))
    remaining -= tokenCount(sections.last)

  // P4: Include if budget allows (cost: ~50 tokens)
  if remaining > 50:
    sections.push(buildChecklistHighlights(data))

  return sections.join("\n")
```

---

## 5. Prompt Structure Recommendation

### 5.1. Recommended Structure

```
[System Prompt]
  Role definition + JSON schema + constraints
  (unchanged — PLAN_SYSTEM_PROMPT)

[User Message]
  Trip details:                          <- existing base params
  - Destination: Paris, France
  - Dates: 2026-07-15 to 2026-07-19 (5 days)
  - Travel style: moderate
  - Budget: 3000 USD
  - Travelers: 4 person(s)
  - Language: pt-BR
  - Token budget: 1800

  Expedition context:                    <- enriched context (NEW)
  <expedition-context>
    <origin>Sao Paulo, Brazil</origin>
    <passengers>2 adults, 1 child (8yo), 1 infant</passengers>
    <preferences>cultural, gastronomic, adventure, photography</preferences>
    <traveler-type>family</traveler-type>
    <pace>6/10</pace>
    <accommodation>Hotel Montmartre, Montmartre district</accommodation>
    <transport>
      Flight GRU->CDG Jul 15 dep 08:30
      Flight CDG->GRU Jul 19 dep 22:15
    </transport>
    <mobility>metro, walking</mobility>
    <guide-highlights>
      Best food areas: Le Marais, Montmartre.
      Safety: watch for pickpockets near tourist spots.
      Transport: Metro Line 12 connects major attractions.
    </guide-highlights>
    <checklist-alerts>Visa: not required. Travel insurance: pending.</checklist-alerts>
  </expedition-context>

  Additional traveler notes: ...         <- existing optional field
```

### 5.2. XML Tag Justification

O uso de XML tags (`<expedition-context>`, `<origin>`, etc.) segue as melhores praticas para Claude:
- Delimitacao clara de secoes para melhor instruction-following
- Permite referencia explicita no system prompt: "Use the `<expedition-context>` section to personalize..."
- Compativel com o padrao ja usado em `buildExpeditionSection()` do template atual

### 5.3. Modificacoes no Template

O template `travelPlanPrompt` em `src/lib/prompts/travel-plan.prompt.ts` precisa:

1. **Expandir `ExpeditionContext` type** em `src/types/ai.types.ts`:
   - Adicionar: `origin`, `passengers`, `preferences`, `transportSummary`, `accommodationSummary`, `mobilityModes`, `guideHighlights`, `checklistAlerts`
2. **Expandir `buildExpeditionSection()`** para incluir novos campos
3. **Adicionar funcao `buildEnrichedContext()`** com logica de truncamento por prioridade
4. **NAO alterar o system prompt** — apenas o user prompt muda
5. **NAO alterar o modelo** — continua usando Sonnet para itinerarios

---

## 6. Guardrails

### Input Guardrails
- [x] PII masking: `birthDate`, `bookingCode`, `email` NUNCA incluidos no prompt
- [x] Prompt injection: todos os campos de usuario passam por `sanitizeForPrompt()` antes de inclusao
- [x] Input length: cada secao do enriched context tem limite hard de tokens (definido na priority table)
- [x] Zod validation: `ExpeditionContext` expandido validado por Zod antes de construcao do prompt

### Output Guardrails
- [x] Response validada contra schema Zod existente (sem alteracoes no formato de saida)
- [x] Structured output parsing com fallback para malformed responses (existente)

### Systemic Guardrails
- [x] Rate limiting existente: Redis lock NX+EX 300s por tripId (sem alteracoes)
- [x] Cost cap: ~$0.05/request (within budget)
- [x] Token usage logging: `logTokenUsage` em `ai.service.ts` (existente, sem alteracoes)

---

## 7. Testing Requirements

### Unit Tests

| ID | Cenario | Expected |
|----|---------|----------|
| UT-AI-001 | `buildEnrichedContext` com dados completos de fases 1-5 | Retorna string XML com todas as secoes |
| UT-AI-002 | `buildEnrichedContext` com fases parciais (Phase 4 vazio) | Omite secao de transport/accommodation |
| UT-AI-003 | `buildEnrichedContext` com budget overflow | Trunca secoes de menor prioridade |
| UT-AI-004 | `buildEnrichedContext` sanitiza inputs (injection attempt) | Caracteres perigosos escapados |
| UT-AI-005 | `buildEnrichedContext` nunca inclui birthDate/bookingCode | Campos PII ausentes da saida |
| UT-AI-006 | Token count estimation vs actual (within 10% margin) | Estimativa proxima do real |
| UT-AI-007 | `buildExpeditionSection` backward compatible (sem enrichment) | Output identico ao v1.0.0 quando nao ha dados extras |
| UT-AI-008 | `buildPreferencesPassengers` formata categorias corretamente | "cultural, gastronomic, adventure" (comma-separated) |
| UT-AI-009 | `buildLogisticsSummary` trunca transport segments > 3 | Apenas primeiros 3 segments incluidos |
| UT-AI-010 | `buildGuideHighlights` seleciona top 3 secoes por relevancia | Inclui safety, food, transport (mais uteis para itinerario) |

### Integration Tests

| ID | Cenario | Expected |
|----|---------|----------|
| IT-AI-001 | `travelPlanPrompt.buildUserPrompt` com enriched context | Prompt inclui `<expedition-context>` com dados de fases 1-5 |
| IT-AI-002 | End-to-end via `ai.service.ts` com mocked provider e enriched context | Provider recebe prompt enriquecido, response parseada corretamente |
| IT-AI-003 | Context collection: `getExpeditionContextForPrompt(tripId, userId)` retorna dados corretos | Dados de todas as fases agregados, PII filtrada |

---

## 8. Implementation Notes

### Context Collection Service

Criar funcao `getExpeditionContextForPrompt(tripId: string, userId: string)` em `src/server/services/expedition-context.service.ts`:

1. Carregar trip com relacoes (phases 1-5 data)
2. Verificar BOLA (`trip.userId === userId`)
3. Construir `EnrichedExpeditionContext` com dados de cada fase
4. Aplicar PII filtering (remover birthDate, bookingCode, etc.)
5. Aplicar `sanitizeForPrompt()` em todos os campos de texto livre
6. Retornar context pronto para inclusao no prompt

### Backward Compatibility

- Se `enrichedContext` estiver vazio ou undefined, o prompt deve ser identico ao v1.0.0
- O `expeditionContext` existente continua funcional — o enrichment e um superset
- Nenhuma alteracao no system prompt garante que respostas cached continuam validas

---

## 9. Open Questions

- [ ] Incluir `checklistAlerts` apenas para items de alta prioridade pendentes, ou todos os items?
- [ ] Limite de tokens para guide highlights: 80 tokens (top 3 sections) ou 120 tokens (top 5)?
- [ ] Medir impacto real na qualidade do itinerario via eval framework antes de produzir recomendacoes finais

---

## Change History

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-20 | prompt-engineer | Documento inicial — enrichment plan, token budget, priority strategy, prompt structure |
