# PROMPT-GUIA-DESTINO-PERSONALIZADO: Destination Guide v2 Prompt Design

**Spec ID**: SPEC-AI-005
**Related Story**: SPEC-PROD-PHASE5-REDESIGN
**Author**: prompt-engineer
**Status**: Draft
**Last Updated**: 2026-03-26
**Prompt Version**: 2.0.0

---

## 1. Overview

This document defines the complete prompt design for the redesigned Phase 5 "Guia do Destino" AI generation. The v1 prompt produces a 10-section flat structure (`timezone`, `currency`, `language`, etc.) that does not match the new bento-grid layout from SPEC-PROD-PHASE5-REDESIGN. The v2 prompt produces a structured JSON with 7 top-level keys (`destination`, `quickFacts`, `safety`, `dailyCosts`, `mustSee`, `documentation`, `localTransport`, `culturalTips`) that map 1:1 to the UI cards, and is deeply personalized using the `GuideTravelerContext` from Phases 1-4.

The prompt targets `claude-haiku-4-5` (same model as v1) to keep costs low, with a max output budget of 4096 tokens.

---

## 2. Current State (v1)

| Aspect | v1 (current) | Problem |
|---|---|---|
| JSON shape | 10 flat `GuideSectionData` objects | Does not map to bento-grid cards |
| Personalization | Appended as plain text, no structured instructions | AI may ignore context |
| Cost data | None | New design requires a cost comparison table |
| Attractions | None | New design requires a "must-see" carousel |
| Schema enforcement | Loose (generic `GuideSectionSchema` repeated) | No per-field validation |
| Token usage | ~2000-2500 output tokens | Adequate, but wastes tokens on sections the UI no longer needs |

---

## 3. System Prompt

The system prompt is the **cacheable** part. It defines the AI's role, output format, and hard constraints. It MUST be stable across requests to maximize Anthropic prompt caching hit rate.

```
You are a professional travel guide writer. You create comprehensive, practical destination guides as structured JSON.

HARD RULES:
1. Respond ONLY with a single valid JSON object. No markdown, no code fences, no text before or after.
2. All text content must be in the language specified by the user.
3. Currency values in dailyCosts must use the LOCAL currency of the destination with the symbol (e.g., "€15", "US$30", "R$80").
4. The safety.level field must be exactly one of: "safe", "moderate", "caution".
5. Each mustSee item's category must be exactly one of: "nature", "culture", "food", "nightlife", "sport", "adventure".
6. mustSee must contain 5-8 items.
7. quickFacts must contain exactly 6 keys: climate, currency, language, timezone, plugType, dialCode.
8. dailyCosts.items must contain exactly 3 rows: "Refeicao" (or "Meal"), "Transporte" (or "Transport"), "Hospedagem" (or "Accommodation").
9. Keep all string values concise: tips max 25 words each, descriptions max 40 words each.
10. Do NOT invent emergency numbers. If unsure, use "112" (EU) or "911" (Americas) as appropriate.

PERSONALIZATION RULES:
- When travelerType is "family", prioritize kid-friendly attractions, safety tips for children, and family meal costs.
- When travelerType is "solo", include social/meetup tips and solo-safe areas.
- When travelerType is "couple", include romantic spots and couple-oriented activities.
- When interests are provided, ensure at least 3 of the mustSee items match those interests.
- When budget is "economic" or "budget", emphasize the budget column in dailyCosts and add money-saving tips.
- When budget is "luxury" or "comfortable", emphasize premium options and exclusive experiences.
- When dietaryRestrictions are provided, include a relevant tip in culturalTips about finding suitable food.
- When fitnessLevel is "low", avoid suggesting strenuous hikes or long walks in mustSee without noting the difficulty.
- When travelPace is provided, adjust mustSee count: relaxed=5, moderate=6-7, intense=8.

JSON SCHEMA:
{
  "destination": {
    "name": "string (city/region name)",
    "nickname": "string (poetic 3-6 word nickname, e.g. 'A Cidade das Sete Colinas')",
    "subtitle": "string (1 sentence hook, max 20 words)",
    "overview": ["paragraph1 (3-4 sentences)", "paragraph2 (3-4 sentences)"]
  },
  "quickFacts": {
    "climate": { "label": "string", "value": "string (temperature range for travel period)" },
    "currency": { "label": "string", "value": "string (name + symbol)" },
    "language": { "label": "string", "value": "string" },
    "timezone": { "label": "string", "value": "string (UTC offset)" },
    "plugType": { "label": "string", "value": "string (type + voltage)" },
    "dialCode": { "label": "string", "value": "string (e.g. +351)" }
  },
  "safety": {
    "level": "safe|moderate|caution",
    "tips": ["string (max 5 tips)"],
    "emergencyNumbers": {
      "police": "string",
      "ambulance": "string",
      "tourist": "string (or null if none)"
    }
  },
  "dailyCosts": {
    "items": [
      {
        "category": "string",
        "budget": "string (local currency + range)",
        "mid": "string",
        "premium": "string"
      }
    ],
    "dailyTotal": {
      "budget": "string",
      "mid": "string",
      "premium": "string"
    },
    "tip": "string (one money-saving tip, max 30 words)"
  },
  "mustSee": [
    {
      "name": "string",
      "category": "nature|culture|food|nightlife|sport|adventure",
      "estimatedTime": "string (e.g. '2-3h')",
      "costRange": "string (local currency, e.g. '€0-15')",
      "description": "string (1-2 sentences, max 40 words)"
    }
  ],
  "documentation": {
    "passport": "string (requirement for most nationalities)",
    "visa": "string (general visa info)",
    "vaccines": "string (recommended/required)",
    "insurance": "string (recommendation)"
  },
  "localTransport": {
    "options": ["string (transport option, max 3-5 items)"],
    "tips": ["string (practical tip, max 3 items)"]
  },
  "culturalTips": ["string (3-5 cultural etiquette tips, max 25 words each)"]
}
```

### System Prompt Token Count Estimate

The system prompt above is approximately **750-800 tokens**. With Anthropic prompt caching enabled (`cache_control: { type: "ephemeral" }` on the system message), after the first cold call the system prompt will be served from cache at 90% discount for subsequent requests within the 5-minute TTL window.

---

## 4. User Prompt Template

The user prompt is the **dynamic** part, built per-request from `GuideParams` + `GuideTravelerContext`. It uses XML tags for clear section delineation, which Claude models parse more reliably than plain-text headers.

```typescript
buildUserPrompt(params: GuideParams): string {
  const lang = params.language === "pt-BR" ? "Brazilian Portuguese" : "English";
  const lines: string[] = [];

  lines.push(`<destination>${params.destination}</destination>`);
  lines.push(`<language>${lang}</language>`);

  const ctx = params.travelerContext;
  if (ctx) {
    lines.push("");
    lines.push("<traveler_context>");

    // Trip timing — critical for climate, seasonal attractions, costs
    if (ctx.startDate && ctx.endDate) {
      lines.push(`  <dates>${ctx.startDate} to ${ctx.endDate}</dates>`);
    }

    // Group composition — drives tone, attraction selection, safety emphasis
    if (ctx.travelers) {
      lines.push(`  <group_size>${ctx.travelers}</group_size>`);
    }
    if (ctx.travelerType) {
      lines.push(`  <traveler_type>${ctx.travelerType}</traveler_type>`);
    }

    // Preferences — drives personalization depth
    if (ctx.travelPace) {
      lines.push(`  <pace>${ctx.travelPace}</pace>`);
    }
    if (ctx.budget && ctx.budgetCurrency) {
      lines.push(`  <budget amount="${ctx.budget}" currency="${ctx.budgetCurrency}" />`);
    }
    if (ctx.accommodationStyle) {
      lines.push(`  <accommodation_style>${ctx.accommodationStyle}</accommodation_style>`);
    }
    if (ctx.dietaryRestrictions) {
      lines.push(`  <dietary>${ctx.dietaryRestrictions}</dietary>`);
    }
    if (ctx.interests && ctx.interests.length > 0) {
      lines.push(`  <interests>${ctx.interests.join(", ")}</interests>`);
    }
    if (ctx.fitnessLevel) {
      lines.push(`  <fitness>${ctx.fitnessLevel}</fitness>`);
    }

    // Logistics — for transport section personalization
    if (ctx.transportTypes && ctx.transportTypes.length > 0) {
      lines.push(`  <booked_transport>${ctx.transportTypes.join(", ")}</booked_transport>`);
    }
    if (ctx.tripType) {
      lines.push(`  <trip_type>${ctx.tripType}</trip_type>`);
    }

    lines.push("</traveler_context>");
  }

  return lines.join("\n");
}
```

### User Prompt Token Count Estimate

| Scenario | Estimated Tokens |
|---|---|
| Minimal (destination + language only) | ~20 tokens |
| Full context (all fields populated) | ~120-150 tokens |
| Average (dates + type + interests + budget) | ~70-90 tokens |

---

## 5. Expected JSON Response Schema (Zod)

This replaces the current `DestinationGuideContentSchema` in `ai.service.ts`:

```typescript
const QuickFactSchema = z.object({
  label: z.string(),
  value: z.string(),
});

const SafetySchema = z.object({
  level: z.enum(["safe", "moderate", "caution"]),
  tips: z.array(z.string()).min(1).max(5),
  emergencyNumbers: z.object({
    police: z.string(),
    ambulance: z.string(),
    tourist: z.string().nullable(),
  }),
});

const CostItemSchema = z.object({
  category: z.string(),
  budget: z.string(),
  mid: z.string(),
  premium: z.string(),
});

const DailyCostsSchema = z.object({
  items: z.array(CostItemSchema).min(3).max(3),
  dailyTotal: z.object({
    budget: z.string(),
    mid: z.string(),
    premium: z.string(),
  }),
  tip: z.string().optional(),
});

const MustSeeItemSchema = z.object({
  name: z.string(),
  category: z.enum(["nature", "culture", "food", "nightlife", "sport", "adventure"]),
  estimatedTime: z.string(),
  costRange: z.string(),
  description: z.string(),
});

const DocumentationSchema = z.object({
  passport: z.string(),
  visa: z.string(),
  vaccines: z.string(),
  insurance: z.string(),
});

const LocalTransportSchema = z.object({
  options: z.array(z.string()).min(1).max(5),
  tips: z.array(z.string()).min(1).max(3),
});

const DestinationGuideV2Schema = z.object({
  destination: z.object({
    name: z.string(),
    nickname: z.string(),
    subtitle: z.string(),
    overview: z.array(z.string()).min(1).max(4),
  }),
  quickFacts: z.object({
    climate: QuickFactSchema,
    currency: QuickFactSchema,
    language: QuickFactSchema,
    timezone: QuickFactSchema,
    plugType: QuickFactSchema,
    dialCode: QuickFactSchema,
  }),
  safety: SafetySchema,
  dailyCosts: DailyCostsSchema,
  mustSee: z.array(MustSeeItemSchema).min(5).max(8),
  documentation: DocumentationSchema,
  localTransport: LocalTransportSchema,
  culturalTips: z.array(z.string()).min(3).max(5),
});
```

---

## 6. Token Budget Analysis

### Output Token Budget

| Section | Estimated Tokens |
|---|---|
| `destination` (name, nickname, subtitle, 2 overview paragraphs) | 250-350 |
| `quickFacts` (6 label/value pairs) | 80-120 |
| `safety` (level, 3-5 tips, 3 emergency numbers) | 100-150 |
| `dailyCosts` (3 items x 4 fields + total + tip) | 120-160 |
| `mustSee` (6 items avg x 5 fields each) | 350-500 |
| `documentation` (4 fields) | 60-100 |
| `localTransport` (options + tips) | 60-100 |
| `culturalTips` (4 tips avg) | 60-80 |
| JSON structural overhead (keys, braces, commas) | 150-200 |
| **Total estimated output** | **1230-1760 tokens** |

### Full Request Token Budget

| Component | Tokens | Cached? |
|---|---|---|
| System prompt | ~800 | YES (after first call) |
| User prompt (avg) | ~80 | NO |
| Output (avg) | ~1500 | N/A |
| **Total per request** | **~2380** | |
| **Effective input cost (cached)** | **~160** | (800 * 0.1 + 80) |

### Recommendation: `maxTokens: 3072`

The v1 prompt uses 4096 but the v2 output is more constrained. Setting `maxTokens: 3072` provides ~2x headroom over the average output (1500 tokens) while preventing runaway generation. If truncation occurs, the existing retry mechanism in `callProviderForPlan` logic should be adapted for guides (see Implementation Notes).

### Cost Comparison vs v1

| Metric | v1 | v2 | Delta |
|---|---|---|---|
| System prompt tokens | ~400 | ~800 | +400 (but cached) |
| Avg output tokens | ~2200 | ~1500 | -700 (-32%) |
| Effective cost per request (cached) | ~2640 tokens | ~1660 tokens | -37% |
| Personalization quality | Low (ignored context) | High (structured rules) | Significant improvement |

---

## 7. Personalization Strategy

### 7.1 Context-to-Section Mapping

| GuideTravelerContext Field | Affects Section(s) | How |
|---|---|---|
| `startDate` / `endDate` | `quickFacts.climate`, `mustSee`, `culturalTips` | Seasonal temperature, seasonal events, seasonal warnings |
| `travelers` | `dailyCosts` | Per-person vs per-group cost framing |
| `travelerType` | `mustSee`, `safety`, `culturalTips`, tone | Family: kid-friendly. Solo: safety + social. Couple: romantic. |
| `travelPace` | `mustSee` count | relaxed=5, moderate=6-7, intense=8 |
| `budget` / `budgetCurrency` | `dailyCosts.tip`, `mustSee.costRange` emphasis | Budget: free/cheap options first. Luxury: exclusive experiences. |
| `accommodationStyle` | `dailyCosts` (accommodation row) | Hostel vs hotel vs resort price ranges |
| `dietaryRestrictions` | `culturalTips`, `dailyCosts` (meal row) | Specific food-finding advice |
| `interests` | `mustSee` (>= 3 items match) | Direct interest mapping |
| `fitnessLevel` | `mustSee` descriptions | Low: note difficulty. High: suggest challenging options. |
| `transportTypes` | `localTransport` | Adapt tips to what they already booked |
| `tripType` | `documentation` | International: visa/passport emphasis. Domestic: simplified. |

### 7.2 Graceful Degradation

When `travelerContext` is absent or partially populated, the prompt produces a **generic but complete** guide. The system prompt's personalization rules use conditional language ("When X is provided...") so missing fields do not cause errors or empty sections.

### 7.3 Tone Adaptation

The system prompt does not explicitly instruct tone per traveler type to save tokens. Instead, the personalization rules implicitly shift tone by changing content selection:
- **Family**: safety-focused content selection naturally produces a cautious, reassuring tone
- **Solo**: social/adventure content selection naturally produces an energetic, encouraging tone
- **Couple**: romantic spot selection naturally produces an intimate, curated tone
- **Group**: logistics-focused content naturally produces a practical, organized tone

---

## 8. Error Handling

### 8.1 JSON Parse Failure

The existing `extractJsonFromResponse()` in `ai.service.ts` handles:
1. Direct `JSON.parse` attempt
2. Extraction from markdown code fences
3. Substring extraction between first `{` and last `}`
4. Truncated JSON repair via `repairTruncatedJson()`

No changes needed to this pipeline. The v2 schema is flat enough that truncation repair will succeed in most cases (the deepest nesting is 2 levels).

### 8.2 Zod Validation Failure

When `DestinationGuideV2Schema.safeParse()` fails:

1. **Log** the Zod error with field paths (existing pattern in `ai.service.ts`)
2. **Throw** `AppError("AI_SCHEMA_ERROR", "errors.aiSchemaError", 502)`
3. **Do NOT retry** — schema errors indicate a prompt/model mismatch, not a transient failure. Retrying wastes tokens.

### 8.3 Partial Schema Recovery (Future Enhancement)

For a future iteration, consider a `safeParseWithDefaults()` that:
- Accepts the raw JSON even if some sections fail validation
- Fills failed sections with `null`
- Lets the UI render available sections with a "partial guide" banner

This is NOT in scope for v2 launch but should be tracked as a backlog item.

### 8.4 Truncation Handling

If `response.wasTruncated === true`:
- The `mustSee` array is most likely to be incomplete (last section in the JSON)
- The `repairTruncatedJson()` function will close open brackets
- Zod validation will catch if `mustSee` has fewer than 5 items
- Recommendation: add a retry path for guides similar to the plan retry (double `maxTokens` on second attempt, capped at 4096)

---

## 9. Cache Key Strategy

The current cache key includes `contextHash = JSON.stringify(travelerContext)`. This is correct but has a subtle issue: field ordering in the context object may vary, producing different hashes for identical contexts.

Recommendation: sort the context fields before hashing, or build a deterministic cache string:

```typescript
function buildGuideCacheInput(params: GuideParams): string {
  const parts = [params.destination, params.language];
  const ctx = params.travelerContext;
  if (ctx) {
    // Fixed order for deterministic hashing
    parts.push(
      ctx.startDate ?? "",
      ctx.endDate ?? "",
      String(ctx.travelers ?? ""),
      ctx.travelerType ?? "",
      String(ctx.travelPace ?? ""),
      String(ctx.budget ?? ""),
      ctx.budgetCurrency ?? "",
      ctx.accommodationStyle ?? "",
      ctx.dietaryRestrictions ?? "",
      (ctx.interests ?? []).sort().join(","),
      ctx.fitnessLevel ?? "",
      (ctx.transportTypes ?? []).sort().join(","),
      ctx.tripType ?? "",
    );
  }
  return parts.join(":");
}
```

---

## 10. Migration Path (v1 to v2)

### 10.1 Schema Coexistence

During migration, both the v1 `DestinationGuideContent` type and v2 `DestinationGuideContentV2` type will exist. The `generateDestinationGuide` method should accept a `version` parameter (defaulting to `"v2"`).

### 10.2 Existing Cached Guides

Cached guides in Redis have the v1 shape. Options:

| Option | Effort | Risk |
|---|---|---|
| A. Flush all guide cache keys on deploy | Low | Brief cache miss spike |
| B. Version the cache key prefix (`guide:v2:`) | Low | Clean separation, no data loss |
| C. Transform v1 cached data to v2 shape at read time | High | Complex, fragile |

**Recommendation**: Option B. Change `CacheKeys.aiGuide()` to include a version prefix. Old v1 keys expire naturally via TTL.

### 10.3 Persisted Guide Content

If guide content is persisted in the database (`Trip.guideContent` or `DestinationGuide.content`), existing records have the v1 shape. The UI component should detect the shape (check for `destination` key presence) and render v1 data in a fallback layout, or trigger re-generation.

---

## 11. Full Prompt Example (Rendered)

### System Message (cached)
```
You are a professional travel guide writer. You create comprehensive, practical destination guides as structured JSON.

HARD RULES:
1. Respond ONLY with a single valid JSON object. No markdown, no code fences, no text before or after.
2. All text content must be in the language specified by the user.
[... full system prompt as defined in Section 3 ...]
```

### User Message (dynamic)
```
<destination>Lisboa, Portugal</destination>
<language>Brazilian Portuguese</language>

<traveler_context>
  <dates>2026-06-15 to 2026-06-22</dates>
  <group_size>4</group_size>
  <traveler_type>family</traveler_type>
  <pace>relaxed</pace>
  <budget amount="8000" currency="BRL" />
  <accommodation_style>hotel</accommodation_style>
  <dietary>gluten_free</dietary>
  <interests>history_museums, gastronomy, beaches</interests>
  <fitness>moderate</fitness>
  <booked_transport>airplane</booked_transport>
  <trip_type>international</trip_type>
</traveler_context>
```

### Expected Response (abbreviated)
```json
{
  "destination": {
    "name": "Lisboa",
    "nickname": "A Cidade das Sete Colinas",
    "subtitle": "Uma capital europeia onde historia milenar encontra gastronomia inovadora e praias douradas a poucos minutos do centro.",
    "overview": [
      "Lisboa e uma das capitais mais antigas da Europa, com mais de 3.000 anos de historia visivel em cada esquina. Dos azulejos do bairro de Alfama aos miradores que revelam o Tejo, a cidade convida a explorar sem pressa. Para familias, o ritmo acolhedor e a seguranca fazem de Lisboa um destino ideal.",
      "Em junho, a cidade ganha vida com as Festas dos Santos Populares, especialmente Santo Antonio em 12 de junho. As temperaturas ficam entre 18 e 28 graus, perfeitas para caminhar. Para quem tem restricoes alimentares, Lisboa surpreende com uma cena crescente de opcoes sem gluten."
    ]
  },
  "quickFacts": {
    "climate": { "label": "Clima", "value": "18-28 C (junho)" },
    "currency": { "label": "Moeda", "value": "Euro (EUR)" },
    "language": { "label": "Idioma", "value": "Portugues" },
    "timezone": { "label": "Fuso Horario", "value": "UTC+1 (WEST em junho)" },
    "plugType": { "label": "Tomada", "value": "Tipo F (230V)" },
    "dialCode": { "label": "DDI", "value": "+351" }
  },
  "safety": {
    "level": "safe",
    "tips": [
      "Lisboa e segura para familias; cuidado com carteiristas no Tram 28 e areas turisticas.",
      "Calcadas de paralelepiedo podem ser escorregadias; use sapatos confortaveis para criancas.",
      "Evite deixar pertences visiveis no carro, especialmente em zonas de praia."
    ],
    "emergencyNumbers": { "police": "112", "ambulance": "112", "tourist": "+351 213 421 634" }
  },
  "dailyCosts": {
    "items": [
      { "category": "Refeicao", "budget": "EUR 10-18", "mid": "EUR 25-40", "premium": "EUR 60+" },
      { "category": "Transporte", "budget": "EUR 3-7", "mid": "EUR 15-25", "premium": "EUR 40+" },
      { "category": "Hospedagem", "budget": "EUR 50-80", "mid": "EUR 120-180", "premium": "EUR 250+" }
    ],
    "dailyTotal": { "budget": "EUR 63-105", "mid": "EUR 160-245", "premium": "EUR 350+" },
    "tip": "Compre o Lisboa Card (familia) para transporte ilimitado e entrada gratuita em mais de 30 museus."
  },
  "mustSee": [
    {
      "name": "Oceanario de Lisboa",
      "category": "nature",
      "estimatedTime": "2-3h",
      "costRange": "EUR 0-25 (criancas desconto)",
      "description": "Um dos maiores aquarios da Europa, fascinante para todas as idades. Lontras e tubaroes encantam as criancas."
    }
  ],
  "documentation": {
    "passport": "Passaporte valido com minimo 6 meses de validade. Brasileiros nao precisam de visto para ate 90 dias.",
    "visa": "Isento para brasileiros (turismo ate 90 dias no Espaco Schengen).",
    "vaccines": "Nenhuma vacina obrigatoria. COVID-19 recomendada.",
    "insurance": "Seguro viagem obrigatorio para entrada no Espaco Schengen. Cobertura minima EUR 30.000."
  },
  "localTransport": {
    "options": [
      "Metro de Lisboa (4 linhas, cobre o centro)",
      "Tram 28 (turistico, mas lotado — evite com carrinho de bebe)",
      "Uber/Bolt (economico e pratico com criancas)",
      "Comboio para Sintra e Cascais (40 min)"
    ],
    "tips": [
      "O cartao Viva Viagem e recarregavel e funciona em metro, onibus e trem.",
      "Taxis do aeroporto tem tarifa fixa para o centro (~EUR 20).",
      "Com criancas, prefira Uber ao Tram 28 nos horarios de pico."
    ]
  },
  "culturalTips": [
    "Cumprimente com dois beijos no rosto (amigos/conhecidos). Aperto de mao em contextos formais.",
    "Gorjeta nao e obrigatoria, mas 5-10% e apreciado em restaurantes.",
    "Restaurantes sem gluten: procure o selo 'Sem Gluten' ou pergunte por 'opcoes celiacas'.",
    "O almoco e a refeicao principal (12h30-14h). Muitos restaurantes fecham entre 15h e 19h.",
    "Filas em pastelerias famosas (como Pasteis de Belem) sao normais; a fila anda rapido."
  ]
}
```

---

## 12. Testing Strategy

### 12.1 Unit Tests (Vitest)

| Test | What it validates |
|---|---|
| `buildUserPrompt` with full context | All XML tags present, correct values |
| `buildUserPrompt` with empty context | Only destination + language, no `<traveler_context>` block |
| `buildUserPrompt` with partial context | Only populated fields appear |
| `DestinationGuideV2Schema` parse valid JSON | Accepts the example response from Section 11 |
| `DestinationGuideV2Schema` reject missing `mustSee` | Fails with min(5) error |
| `DestinationGuideV2Schema` reject invalid `safety.level` | Fails with enum error |
| `DestinationGuideV2Schema` reject missing `quickFacts` keys | Fails with required error |
| `buildGuideCacheInput` determinism | Same context in different field order produces same hash |

### 12.2 Integration Tests

| Test | What it validates |
|---|---|
| `AiService.generateDestinationGuide` with mocked provider | Full pipeline: prompt build, provider call, JSON parse, Zod validation, cache write |
| Cache hit path | Second call with same params returns cached data without provider call |
| Truncated response recovery | Provider returns truncated JSON, `repairTruncatedJson` fixes it, Zod passes |
| Schema failure path | Provider returns invalid JSON shape, throws `AI_SCHEMA_ERROR` |

### 12.3 Manual Validation Checklist

Before merging the prompt change, run the guide generation for these scenarios and verify output quality:

- [ ] Destination: "Tokyo, Japan" + language: pt-BR + travelerType: solo + interests: nightlife, gastronomy
- [ ] Destination: "Orlando, USA" + language: pt-BR + travelerType: family + interests: nature_hiking
- [ ] Destination: "Paris, France" + language: en + travelerType: couple + budget: luxury
- [ ] Destination: "Florianopolis, Brasil" + language: pt-BR + tripType: domestic (should simplify documentation)
- [ ] Destination: "Marrakech, Morocco" + language: pt-BR + safety should be "moderate" or "caution"
- [ ] Minimal context: only destination + language (no travelerContext at all)

---

## 13. Implementation Notes for Developers

### Files to Modify

1. **`src/lib/prompts/system-prompts.ts`** — Replace `GUIDE_SYSTEM_PROMPT` with the v2 system prompt from Section 3
2. **`src/lib/prompts/destination-guide.prompt.ts`** — Replace `buildUserPrompt` with the v2 builder from Section 4. Update `maxTokens` to 3072. Bump `version` to `"2.0.0"`.
3. **`src/server/services/ai.service.ts`** — Replace `DestinationGuideContentSchema` with the Zod schemas from Section 5. Update `buildGuideCacheInput` for deterministic hashing (Section 9). Add retry-on-truncation logic for guides.
4. **`src/types/ai.types.ts`** — Add `DestinationGuideContentV2` type (inferred from Zod schema). Keep `DestinationGuideContent` as deprecated alias during migration.
5. **`src/server/cache/keys.ts`** — Version the guide cache key: `guide:v2:{hash}` instead of `guide:{hash}`.

### Patterns to Follow

- Use XML tags in user prompts (proven pattern from `travel-plan.prompt.ts` enrichment in Sprint 33)
- Zod schemas defined adjacent to the parse call (existing pattern in `ai.service.ts`)
- Cache key versioning (new pattern, document in ADR if adopted broadly)

### Patterns to Avoid

- Do NOT put personalization rules in the user prompt. They belong in the system prompt for caching.
- Do NOT use few-shot examples in the system prompt. Haiku follows schemas reliably without them, and examples add ~500 tokens of uncacheable noise.
- Do NOT add `heroImageQuery` to the AI-generated JSON. Image queries are a UI concern and should be derived from `destination.name` by the component, not the AI.

### Open Questions

- [ ] **OQ-1**: Should `documentation` be personalized by origin country? The current `GuideTravelerContext` does not include origin, but `UserProfile` has it. Adding origin would improve visa/passport accuracy but increases context size by ~10 tokens.
- [ ] **OQ-2**: The SPEC-PROD-PHASE5-REDESIGN schema includes `costs.items[].label` as a single string (e.g., "Refeicao (Economica)") while this spec uses a 3-column budget/mid/premium split. Confirm the UI will use the 3-column layout from the Stitch export, not the flat label+range from the PO spec.
- [ ] **OQ-3**: Should the `emergencyNumbers.tourist` field be nullable or should we instruct the AI to return "N/A" as a string? Nullable is cleaner for the UI but requires the component to handle null rendering.

---

## 14. Definition of Done

- [ ] System prompt updated in `system-prompts.ts` matching Section 3 exactly
- [ ] User prompt builder updated in `destination-guide.prompt.ts` matching Section 4
- [ ] Zod schema updated in `ai.service.ts` matching Section 5
- [ ] Types updated in `ai.types.ts` with `DestinationGuideContentV2`
- [ ] Cache key versioned to `guide:v2:`
- [ ] Unit tests cover all cases from Section 12.1
- [ ] Integration tests cover all cases from Section 12.2
- [ ] Manual validation checklist (Section 12.3) executed and all 6 scenarios produce valid, personalized output
- [ ] Token usage logged and verified under 3072 max output tokens for all test scenarios
- [ ] No regression in existing guide generation flow (v1 cached data gracefully handled)

> Status: DRAFT -- Blocked on: OQ-2 (cost table column layout confirmation from PO/UX)
