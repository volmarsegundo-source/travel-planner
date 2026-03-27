# PROMPT-ROTEIRO-PERSONALIZADO: Itinerary v2 Prompt Design

**Spec ID**: SPEC-AI-006
**Related Story**: SPEC-PHASE6-REDESIGN-BRIEF, SPEC-PROD-053
**Author**: prompt-engineer
**Status**: Draft
**Last Updated**: 2026-03-26
**Prompt Version**: 2.0.0

---

## 1. Overview

This document defines the complete prompt design for the redesigned Phase 6 "O Roteiro" AI generation. The v1 prompt produces a flat structure (`destination`, `totalDays`, `days[].activities` with `title/description/startTime/endTime/estimatedCost/activityType`) that does not match the new timeline+map layout from SPEC-PHASE6-REDESIGN-BRIEF. The v2 prompt produces a structured JSON with per-activity coordinates, 8 activity categories, day summaries, contextual tips, and deep personalization from all prior phases -- mapping 1:1 to the timeline cards, day selector pills, map markers, and summary card in the UI.

The prompt targets `claude-sonnet-4-5` (same model tier as v1) for itinerary generation, with a dynamic max output budget calculated from trip duration.

---

## 2. Current State (v1)

| Aspect | v1 (current) | Problem |
|---|---|---|
| JSON shape | `ItineraryPlan` with `days[].activities` using `title/startTime/endTime` | No coordinates for map pins, no day titles, no per-day summary, no contextual tips |
| Activity categories | 6 types: `SIGHTSEEING, FOOD, TRANSPORT, ACCOMMODATION, LEISURE, SHOPPING` | New UI needs 8 categories with specific color mappings; missing `culture`, `nature`, `nightlife`, `adventure` |
| Coordinates | None | Map column requires lat/lng per activity to render markers |
| Day summary | None | UI requires `activitiesCount`, `totalDuration`, `totalCost` per day |
| Contextual tips | None | UI has `lightbulb` tip container per activity card (AC-P6-22) |
| Duration format | Computed from `startTime`/`endTime` difference | UI expects explicit `duration` string (e.g., "1h30") |
| Cost format | Numeric `estimatedCost` | UI expects formatted string with currency (e.g., "R$ 250") |
| Personalization | Enriched context appended as XML block (SPEC-AI-004) | Adequate structure, but no rules driving how context shapes activities |
| Token budget | Dynamic: 600/day + 1100 overhead | Needs increase for coordinates + tips + summaries |

---

## 3. Target JSON Schema

This is the exact structure the AI must produce. It maps 1:1 to the Phase 6 UI components.

```json
{
  "days": [
    {
      "dayNumber": 1,
      "date": "2026-04-15",
      "title": "Chegada e Primeiras Impressoes",
      "activities": [
        {
          "time": "09:00",
          "name": "Check-in Hotel Ibis Liberdade",
          "description": "Chegada e acomodacao no hotel proximo ao metro",
          "duration": "1h",
          "estimatedCost": "R$ 0",
          "category": "logistics",
          "coordinates": { "lat": -23.5575, "lng": -46.6361 },
          "tip": "Peca um quarto nos andares altos para vista da cidade"
        }
      ],
      "summary": {
        "activitiesCount": 6,
        "totalDuration": "10h",
        "totalCost": "R$ 250"
      }
    }
  ]
}
```

### Field Specifications

| Field | Type | Constraints | UI Mapping |
|---|---|---|---|
| `days` | array | Length = trip duration in days | Day selector pills |
| `days[].dayNumber` | number | 1-indexed, sequential | Pill label "Dia N" |
| `days[].date` | string | `YYYY-MM-DD`, derived from trip start date | Pill sublabel "DD Mmm" |
| `days[].title` | string | Max 6 words, thematic | Day header "Dia N -- [title]" |
| `days[].activities` | array | 4-6 items per day; 3-4 for trips > 10 days | Timeline cards |
| `activities[].time` | string | `HH:MM` 24h format | Card top-left time label |
| `activities[].name` | string | Max 8 words | Card title (`text-xl font-bold`) |
| `activities[].description` | string | Max 20 words, 1 sentence | Card subtitle (`atlas-on-surface-variant`) |
| `activities[].duration` | string | Human-readable: "1h", "1h30", "2h", "30min" | Metadata area with `schedule` icon |
| `activities[].estimatedCost` | string | Formatted with currency symbol: "R$ 45", "EUR 20", "Free" | Metadata area with `payments` icon |
| `activities[].category` | string | Exactly one of: `logistics`, `culture`, `food`, `nature`, `nightlife`, `sport`, `shopping`, `adventure` | Node color, border color, chip style |
| `activities[].coordinates` | object | `{ "lat": number, "lng": number }` with 4 decimal precision | Map marker placement |
| `activities[].tip` | string or null | Max 25 words, practical advice; null if no relevant tip | Lightbulb tip container (AC-P6-22) |
| `days[].summary` | object | Computed from activities in that day | Day summary card |
| `summary.activitiesCount` | number | Count of activities in the day | "N atividades" metric |
| `summary.totalDuration` | string | Sum of durations, human-readable: "8h", "10h30" | "Duracao total" metric |
| `summary.totalCost` | string | Sum of costs, formatted with currency | "Custo estimado" metric |

### Category Mapping (v1 to v2)

| v1 `activityType` | v2 `category` | UI Color Token |
|---|---|---|
| `SIGHTSEEING` | `culture` | `atlas-tertiary` |
| `FOOD` | `food` | `atlas-primary-fixed-dim` |
| `TRANSPORT` | `logistics` | `atlas-primary-container` |
| `ACCOMMODATION` | `logistics` | `atlas-primary-container` |
| `LEISURE` | `nature` or `adventure` (context-dependent) | TBD by UX |
| `SHOPPING` | `shopping` | TBD by UX |
| *(new)* | `nightlife` | TBD by UX |
| *(new)* | `sport` | TBD by UX |

---

## 4. System Prompt

The system prompt is the **cacheable** part. It defines the AI's role, output schema, hard constraints, and personalization rules. It MUST be stable across requests to maximize Anthropic prompt caching.

```
You are a professional travel planner creating detailed day-by-day itineraries as structured JSON. You produce realistic, practical schedules that a traveler can follow as-is.

HARD RULES:
1. Respond ONLY with a single valid JSON object. No markdown, no code fences, no text before or after the JSON.
2. All text content (names, descriptions, tips) must be in the language specified by the user.
3. The JSON must have exactly one top-level key: "days" (an array).
4. Each day object has: dayNumber (1-indexed), date (YYYY-MM-DD), title (max 6 words, thematic), activities (array), summary (object).
5. Plan 4-6 activities per day. For trips longer than 10 days, plan 3-4 activities per day.
6. Each activity has: time (HH:MM 24h), name (max 8 words), description (max 20 words, 1 sentence), duration (human-readable, e.g. "1h30"), estimatedCost (formatted with currency symbol, or "Free"/"Gratis"), category (exactly one of: logistics, culture, food, nature, nightlife, sport, shopping, adventure), coordinates (object with lat and lng as numbers, 4 decimal places), tip (string max 25 words, or null).
7. Activities within a day must be ordered chronologically by time.
8. The first activity of day 1 should account for arrival logistics (check-in, airport transfer, etc.) unless the trip starts mid-stay.
9. The last activity of the final day should account for departure logistics (checkout, airport transfer) unless noted otherwise.
10. Each day summary has: activitiesCount (integer), totalDuration (human-readable sum), totalCost (formatted sum with currency symbol).
11. Coordinates must be real, accurate geographic coordinates for the specific venue or area mentioned. Do NOT invent coordinates. If unsure of an exact venue, use the coordinates of the neighborhood or landmark area.
12. Tips should be practical, specific, and actionable (e.g., "Compre ingressos online para evitar fila de 1h" not "Divirta-se"). Set tip to null for activities where no useful tip exists. Aim for 40-60% of activities having a tip.
13. estimatedCost must reflect realistic local prices. Use "Free" or "Gratis" (depending on language) for free activities, not "R$ 0" or "EUR 0".
14. Do NOT repeat the same activity across different days unless explicitly appropriate (e.g., breakfast at hotel).

CATEGORY USAGE RULES:
- "logistics": hotel check-in/out, airport transfers, car rental pickup, train station arrivals — practical travel mechanics
- "culture": museums, monuments, historical sites, churches, art galleries, guided tours, architecture walks
- "food": restaurants, street food markets, cooking classes, food tours, cafes for a notable meal, wine/beer tastings
- "nature": parks, gardens, beaches, viewpoints, boat rides on natural water, nature reserves, botanical gardens
- "nightlife": bars, clubs, live music venues, evening shows, sunset rooftop experiences — only after 18:00
- "sport": surfing, hiking trails, cycling tours, kayaking, diving, rock climbing, stadium/sports events
- "shopping": markets, malls, artisan shops, souvenir shopping, outlet centers
- "adventure": zip-lining, bungee jumping, paragliding, off-road tours, snorkeling with wildlife, escape rooms

PERSONALIZATION RULES:
- When travelerType is "family", prioritize kid-friendly activities, shorter walking distances, meal times at family-friendly hours (12:00 lunch, 18:30 dinner), and activities with rest breaks between intense items.
- When travelerType is "solo", include social spots (hostels, communal meals, walking tours with groups), safe nightlife options, and solo-photography-friendly viewpoints.
- When travelerType is "couple", include romantic restaurants, sunset viewpoints, couple-oriented experiences (spa, wine tasting), and intimate rather than crowded venues.
- When travelerType is "group", include group-friendly activities (pub crawls, team sports, shared experiences), larger restaurant options, and activities that work for 4+ people.
- When travelPace is "relaxed", plan 4 activities/day max with generous 30-45min gaps between them. Avoid scheduling anything before 09:30.
- When travelPace is "moderate", plan 5 activities/day with 15-30min gaps. Start days at 09:00.
- When travelPace is "intense", plan 6 activities/day packed tightly. Start days at 08:00 or earlier.
- When budgetStyle is "budget", prefer free/low-cost activities (free museums, parks, street food). Keep daily total under the per-day budget equivalent.
- When budgetStyle is "luxury", include premium experiences (private tours, Michelin restaurants, VIP access). Costs can exceed budget if the experience warrants it.
- When foodPreferences are provided, ensure at least 1 meal activity per day respects the dietary needs. Mention dietary suitability in the tip.
- When interests are provided, ensure at least 60% of non-logistics activities across the entire trip match the stated interests.
- When fitnessLevel is "low", avoid activities requiring more than 30 minutes of continuous walking. Add rest stops or seated activities between physical ones. Note difficulty in tips.
- When fitnessLevel is "high", include challenging options (long hikes, cycling tours, adventure sports) and note when an activity is physically demanding.
- When wakePreference is "night_owl", push morning activities later (start at 10:00+) and include evening/nightlife activities.
- When wakePreference is "early_bird", start days at 07:00-08:00 with sunrise activities or morning markets.
- When passengers include children (childrenCount > 0), add at least 1 child-oriented activity per day and note child suitability in tips. Avoid nightlife.
- When passengers include infants (infantsCount > 0), reduce activities to 3-4/day, ensure all venues are stroller-accessible, and add a midday rest break.
- When localMobility is provided, incorporate those transport modes into logistics activities (e.g., if "bicycle" is listed, suggest cycling between nearby venues).
- When destinationGuideContext is provided, use it as local knowledge to inform activity selection and tips (opening hours, seasonal events, local customs).

JSON SCHEMA:
{
  "days": [
    {
      "dayNumber": "number (1-indexed)",
      "date": "YYYY-MM-DD",
      "title": "string (max 6 words, thematic day title)",
      "activities": [
        {
          "time": "HH:MM",
          "name": "string (max 8 words)",
          "description": "string (max 20 words)",
          "duration": "string (e.g. '1h', '1h30', '2h', '30min')",
          "estimatedCost": "string (e.g. 'R$ 45', 'EUR 20', 'Free')",
          "category": "logistics|culture|food|nature|nightlife|sport|shopping|adventure",
          "coordinates": { "lat": "number (4 decimals)", "lng": "number (4 decimals)" },
          "tip": "string (max 25 words) or null"
        }
      ],
      "summary": {
        "activitiesCount": "number",
        "totalDuration": "string (e.g. '8h', '10h30')",
        "totalCost": "string (e.g. 'R$ 450', 'EUR 180')"
      }
    }
  ]
}
```

### System Prompt Token Count Estimate

The system prompt above is approximately **1100-1200 tokens**. This is ~400 tokens larger than v1 (~800 tokens in system-prompts.ts) due to the coordinate rules, 8 category definitions, personalization rules, and summary schema. With Anthropic prompt caching (`cache_control: { type: "ephemeral" }`), after the first cold call the system prompt is served from cache at 90% discount for subsequent requests within the 5-minute TTL window.

---

## 5. User Prompt Template

The user prompt is the **dynamic** part, built per-request from `TravelPlanParams` + `ExpeditionContext`. It uses XML tags for clear section delineation.

```typescript
/** Travel plan prompt template v2.0.0 */
export const travelPlanPromptV2: PromptTemplate<TravelPlanParams> = {
  version: "2.0.0",
  model: "plan",
  maxTokens: 4096, // Dynamic -- overridden by calculatePlanTokenBudgetV2
  cacheControl: true,
  system: PLAN_SYSTEM_PROMPT_V2,

  buildUserPrompt(params: TravelPlanParams): string {
    const lang = params.language === "pt-BR" ? "Brazilian Portuguese" : "English";
    const currencyLabel = params.budgetCurrency; // e.g., "BRL", "EUR", "USD"

    const lines: string[] = [];

    // Core trip parameters (always present)
    lines.push("<trip>");
    lines.push(`  <destination>${params.destination}</destination>`);
    lines.push(`  <start_date>${params.startDate}</start_date>`);
    lines.push(`  <end_date>${params.endDate}</end_date>`);
    lines.push(`  <days>${params.days}</days>`);
    lines.push(`  <travel_style>${params.travelStyle}</travel_style>`);
    lines.push(`  <budget total="${params.budgetTotal}" currency="${currencyLabel}" per_day="${Math.round(params.budgetTotal / params.days)}" />`);
    lines.push(`  <travelers>${params.travelers}</travelers>`);
    lines.push(`  <language>${lang}</language>`);
    lines.push("</trip>");

    // Traveler context from Phases 1-5 (optional, enriched)
    const ctx = params.expeditionContext;
    if (ctx) {
      const hasEnriched = ctx.personal || ctx.trip || ctx.preferences || ctx.logistics;

      if (hasEnriched) {
        lines.push("");
        lines.push("<traveler_context>");

        // Personal
        if (ctx.personal) {
          if (ctx.personal.ageRange) {
            lines.push(`  <age_range>${ctx.personal.ageRange}</age_range>`);
          }
          if (ctx.personal.origin) {
            lines.push(`  <origin>${ctx.personal.origin}</origin>`);
          }
        }

        // Trip enrichment
        if (ctx.trip) {
          if (ctx.trip.type) {
            lines.push(`  <trip_type>${ctx.trip.type}</trip_type>`);
          }
          if (ctx.trip.travelers) {
            lines.push(`  <travelers_detail>${ctx.trip.travelers}</travelers_detail>`);
          }
        }

        // Preferences (drives activity selection and scheduling)
        if (ctx.preferences) {
          if (ctx.preferences.pace) {
            lines.push(`  <pace>${ctx.preferences.pace}</pace>`);
          }
          if (ctx.preferences.budget) {
            lines.push(`  <budget_style>${ctx.preferences.budget}</budget_style>`);
          }
          if (ctx.preferences.food) {
            lines.push(`  <food_preferences>${ctx.preferences.food}</food_preferences>`);
          }
          if (ctx.preferences.interests) {
            lines.push(`  <interests>${ctx.preferences.interests}</interests>`);
          }
          if (ctx.preferences.accommodation) {
            lines.push(`  <accommodation_style>${ctx.preferences.accommodation}</accommodation_style>`);
          }
        }

        // Logistics (transport, accommodation, mobility from Phase 4)
        if (ctx.logistics) {
          if (ctx.logistics.transport && ctx.logistics.transport.length > 0) {
            lines.push(`  <booked_transport>${ctx.logistics.transport.join(", ")}</booked_transport>`);
          }
          if (ctx.logistics.accommodation && ctx.logistics.accommodation.length > 0) {
            lines.push(`  <booked_accommodation>${ctx.logistics.accommodation.join(", ")}</booked_accommodation>`);
          }
          if (ctx.logistics.mobility && ctx.logistics.mobility.length > 0) {
            lines.push(`  <local_mobility>${ctx.logistics.mobility.join(", ")}</local_mobility>`);
          }
        }

        // Destination guide insights (from Phase 5)
        if (ctx.destinationGuideContext) {
          lines.push(`  <destination_insights>${ctx.destinationGuideContext}</destination_insights>`);
        }

        lines.push("</traveler_context>");
      } else {
        // Legacy context fallback
        const legacyParts: string[] = [];
        if (ctx.tripType) legacyParts.push(`trip_type=${ctx.tripType}`);
        if (ctx.travelerType) legacyParts.push(`traveler_type=${ctx.travelerType}`);
        if (ctx.travelPace) legacyParts.push(`pace=${ctx.travelPace}`);
        if (ctx.budget) legacyParts.push(`budget=${ctx.budget}`);
        if (ctx.accommodationStyle) legacyParts.push(`accommodation=${ctx.accommodationStyle}`);
        if (ctx.destinationGuideContext) legacyParts.push(`guide_context=${ctx.destinationGuideContext}`);
        if (legacyParts.length > 0) {
          lines.push("");
          lines.push(`<traveler_context>${legacyParts.join("; ")}</traveler_context>`);
        }
      }
    }

    // Free-text notes from user (Phase 6 input field)
    if (params.travelNotes) {
      lines.push("");
      lines.push(`<traveler_notes>${params.travelNotes}</traveler_notes>`);
    }

    // Token budget hint
    lines.push("");
    lines.push(`<output_budget>${params.tokenBudget} tokens max -- fit entire JSON within this limit</output_budget>`);

    return lines.join("\n");
  },
};
```

### User Prompt Token Count Estimate

| Scenario | Estimated Tokens |
|---|---|
| Minimal (trip only, no context) | ~60-80 tokens |
| Full context (all enriched fields populated) | ~180-220 tokens |
| Average (trip + pace + interests + budget + food) | ~120-150 tokens |

---

## 6. Zod Validation Schema

This replaces the current `ItineraryPlanSchema` in `ai.service.ts`:

```typescript
// ── Itinerary v2 Zod Schemas ────────────────────────────────────────────────

const CoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const ActivityCategorySchema = z.enum([
  "logistics",
  "culture",
  "food",
  "nature",
  "nightlife",
  "sport",
  "shopping",
  "adventure",
]);

const ActivityV2Schema = z.object({
  time: z.string().regex(/^\d{2}:\d{2}$/),
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(200),
  duration: z.string().min(1).max(10),
  estimatedCost: z.string().min(1).max(30),
  category: ActivityCategorySchema,
  coordinates: CoordinatesSchema,
  tip: z.string().max(200).nullable(),
});

const DaySummarySchema = z.object({
  activitiesCount: z.number().int().min(1),
  totalDuration: z.string().min(1).max(10),
  totalCost: z.string().min(1).max(30),
});

const DayV2Schema = z.object({
  dayNumber: z.number().int().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().min(1).max(60),
  activities: z.array(ActivityV2Schema).min(2).max(8),
  summary: DaySummarySchema,
});

const ItineraryPlanV2Schema = z.object({
  days: z.array(DayV2Schema).min(1).max(30),
});

export type ItineraryPlanV2 = z.infer<typeof ItineraryPlanV2Schema>;
export type ActivityV2 = z.infer<typeof ActivityV2Schema>;
export type ActivityCategory = z.infer<typeof ActivityCategorySchema>;
```

---

## 7. Token Budget Analysis

### Output Token Budget (per day)

| Component | Tokens per Day |
|---|---|
| `dayNumber`, `date`, `title` | ~20 |
| 5 activities x ~80 tokens each (name + desc + duration + cost + category + coords + tip) | ~400 |
| `summary` object | ~30 |
| JSON structural overhead (keys, braces, commas) | ~50 |
| **Total per day** | **~500** |

### Comparison with v1

| Component | v1 Tokens/Day | v2 Tokens/Day | Delta |
|---|---|---|---|
| Activity fields | ~250 (title + desc + times + cost + type) | ~400 (+coords, +tip, +duration, +category) | +150 |
| Day-level fields | ~15 (dayNumber + date + theme) | ~50 (+title, +summary) | +35 |
| **Total/day** | **~300** | **~500** | **+200 (+67%)** |

### Dynamic Budget Formula

```typescript
const TOKENS_PER_DAY_V2 = 800;   // up from 600, with safety margin
const TOKENS_OVERHEAD_V2 = 1200;  // up from 1100, accounts for enriched context
const MIN_PLAN_TOKENS_V2 = 3072;  // up from 2048 (minimum viable: 3 days + structure)
const MAX_PLAN_TOKENS_V2 = 16000; // unchanged

function calculatePlanTokenBudgetV2(days: number): number {
  const estimated = days * TOKENS_PER_DAY_V2 + TOKENS_OVERHEAD_V2;
  return Math.min(MAX_PLAN_TOKENS_V2, Math.max(MIN_PLAN_TOKENS_V2, estimated));
}
```

| Trip Duration | v1 Budget | v2 Budget | Delta |
|---|---|---|---|
| 3 days | 2900 -> clamped 2048 | 3600 -> clamped 3072 | +1024 |
| 5 days | 4100 | 5200 | +1100 |
| 7 days | 5300 | 6800 | +1500 |
| 10 days | 7100 | 9200 | +2100 |
| 14 days | 9500 | 12400 | +2900 |
| 20 days | 13100 | 16000 (cap) | +2900 |

### Full Request Token Budget

| Component | Tokens | Cached? |
|---|---|---|
| System prompt | ~1150 | YES (after first call) |
| User prompt (avg) | ~140 | NO |
| Output (7-day trip avg) | ~3500 | N/A |
| **Total per request** | **~4790** | |
| **Effective input cost (cached)** | **~255** | (1150 * 0.1 + 140) |

### Cost Comparison vs v1

| Metric | v1 (7-day) | v2 (7-day) | Delta |
|---|---|---|---|
| System prompt tokens | ~800 | ~1150 | +350 (but cached) |
| Avg output tokens | ~2100 | ~3500 | +1400 (+67%) |
| Effective cost/request (cached) | ~2260 | ~3640 | +61% |
| **New data delivered** | 0 | coords, tips, summaries, 8 categories | Significant UX improvement |

The +61% cost increase is justified by:
- Map pins (coordinates) eliminating the need for a separate geocoding API call per activity
- Day summaries eliminating client-side computation
- Contextual tips adding practical value for each activity
- Richer category taxonomy enabling the visual design from SPEC-PHASE6-REDESIGN-BRIEF

---

## 8. Personalization Strategy

### 8.1 Context-to-Activity Mapping

| ExpeditionContext Field | Affects | How |
|---|---|---|
| `preferences.pace` | Activities/day count, gap between activities, start time | relaxed=4, moderate=5, intense=6 |
| `preferences.budget` | `estimatedCost` values, activity selection | budget: free/cheap first. luxury: premium options |
| `preferences.food` | Food activities (1+ per day), tips about dietary options | Vegetarian: suggest veg-friendly restaurants |
| `preferences.interests` | Category distribution, specific venue selection | >= 60% of non-logistics activities match interests |
| `preferences.accommodation` | First/last activities (check-in style) | Hostel: communal tips. Resort: spa suggestions |
| `personal.ageRange` | Activity difficulty, timing, tips | Seniors: accessibility notes. Young: adventure focus |
| `trip.travelers` (detail) | Group-appropriate activities, cost splitting hints | "2 adults, 2 children": kid-friendly + cost per person tips |
| `logistics.transport` | Day 1 arrival, last day departure logistics | Airplane: airport transfer. Bus: station logistics |
| `logistics.mobility` | Inter-activity transport suggestions | Bicycle: suggest cycling routes between venues |
| `destinationGuideContext` | Local knowledge enrichment | Opening hours, seasonal events, local customs in tips |
| `travelerType` | Tone and activity selection | Family/solo/couple/group specific rules |
| `travelNotes` | Free-form user requests | Direct incorporation of specific wishes |

### 8.2 Category Distribution Targets

The system prompt's personalization rules implicitly drive category distribution. For reference, these are the expected distributions by travel style:

| Travel Style | logistics | culture | food | nature | nightlife | sport | shopping | adventure |
|---|---|---|---|---|---|---|---|---|
| CULTURE | 10-15% | 35-45% | 15-20% | 5-10% | 0-5% | 0% | 5-10% | 0% |
| ADVENTURE | 10-15% | 5-10% | 10-15% | 20-30% | 0-5% | 15-25% | 0-5% | 15-25% |
| GASTRONOMY | 10-15% | 10-15% | 35-45% | 5-10% | 5-10% | 0% | 5-10% | 0% |
| RELAXATION | 10-15% | 10-15% | 15-20% | 30-40% | 0-5% | 0-5% | 5-10% | 0% |
| FAMILY | 15-20% | 15-20% | 15-20% | 15-20% | 0% | 5-10% | 10-15% | 5-10% |
| ROMANTIC | 10-15% | 15-20% | 20-30% | 15-20% | 10-15% | 0-5% | 5-10% | 0% |

These are NOT enforced in the prompt (that would add too many tokens). They serve as a quality baseline for manual validation.

### 8.3 Graceful Degradation

When `expeditionContext` is absent or partially populated, the prompt produces a **generic but complete** itinerary. The system prompt's personalization rules use conditional language ("When X is provided...") so missing fields produce a well-rounded, style-appropriate itinerary without errors or empty sections.

---

## 9. Streaming Compatibility

### 9.1 Current Streaming Architecture

The existing streaming infrastructure (Sprint 18-19) sends the AI response as Server-Sent Events (SSE) to the client. The client accumulates chunks and parses JSON when the stream completes. This architecture is preserved.

### 9.2 Progressive Day Rendering (AC-P6-26, AC-P6-27)

The new JSON structure is **streaming-friendly by design**:

1. The top-level `"days"` array means each day object arrives sequentially
2. The client can detect a complete day object (matched `{` and `}` braces) and render it immediately
3. Days arriving later do not invalidate previously rendered days

**Client-side parsing strategy** (implementation guidance, not part of prompt spec):

```
On each SSE chunk:
  1. Append to buffer
  2. Try to extract complete day objects from buffer using brace matching
  3. For each newly complete day, parse it with DayV2Schema and render
  4. Show skeleton/spinner for days not yet received
  5. When stream ends, validate full ItineraryPlanV2Schema on assembled result
```

### 9.3 Token Budget and Streaming

The streaming model sends tokens as they are generated. The `maxTokens` parameter acts as a hard ceiling. If the model reaches the ceiling mid-day, `repairTruncatedJson()` will attempt recovery, and the retry mechanism (doubled budget) will kick in.

---

## 10. Coordinate Accuracy Strategy

### 10.1 Why In-Prompt Coordinates

**Option A**: AI generates coordinates in the JSON (chosen)
- Pro: Single API call, no additional latency, coordinates contextually appropriate
- Pro: AI can use its training data to place markers at known venues
- Con: Coordinates may be approximate (neighborhood-level, not street-address)
- Con: AI may hallucinate coordinates for obscure venues

**Option B**: Post-process with geocoding API (rejected)
- Pro: Precise coordinates from Nominatim/Mapbox
- Con: N additional API calls (1 per activity, ~35 for a 7-day trip)
- Con: Rate limiting on Nominatim (1 req/sec), latency adds 35+ seconds
- Con: Geocoding may fail for local/colloquial names

**Decision**: Option A. The UI map is for orientation, not navigation. Neighborhood-level accuracy (50-200m) is sufficient for the overview map. If a user needs exact directions, they can tap a marker to open in Google Maps (future feature).

### 10.2 Coordinate Quality Guardrails

The system prompt instructs: "Coordinates must be real, accurate geographic coordinates for the specific venue or area mentioned. Do NOT invent coordinates. If unsure of an exact venue, use the coordinates of the neighborhood or landmark area."

The Zod schema enforces valid lat/lng ranges (`-90..90`, `-180..180`). A post-validation sanity check can verify all coordinates fall within a reasonable bounding box of the destination:

```typescript
function validateCoordinateBounds(
  days: DayV2[],
  destinationLat: number,
  destinationLng: number,
  radiusKm: number = 100,
): boolean {
  const KM_PER_DEGREE = 111;
  const maxDelta = radiusKm / KM_PER_DEGREE;
  return days.every(day =>
    day.activities.every(act =>
      Math.abs(act.coordinates.lat - destinationLat) < maxDelta &&
      Math.abs(act.coordinates.lng - destinationLng) < maxDelta
    )
  );
}
```

If validation fails, log a warning but do NOT reject the itinerary. The map will simply show markers in unexpected positions, which is better than no itinerary at all.

---

## 11. Full Prompt Example (Rendered)

### System Message (cached)
```
You are a professional travel planner creating detailed day-by-day itineraries as structured JSON. You produce realistic, practical schedules that a traveler can follow as-is.

HARD RULES:
1. Respond ONLY with a single valid JSON object. No markdown, no code fences, no text before or after the JSON.
[... full system prompt as defined in Section 4 ...]
```

### User Message (dynamic)
```xml
<trip>
  <destination>Lisboa, Portugal</destination>
  <start_date>2026-06-15</start_date>
  <end_date>2026-06-22</end_date>
  <days>8</days>
  <travel_style>CULTURE</travel_style>
  <budget total="12000" currency="BRL" per_day="1500" />
  <travelers>4</travelers>
  <language>Brazilian Portuguese</language>
</trip>

<traveler_context>
  <age_range>30-39</age_range>
  <origin>Sao Paulo, Brasil</origin>
  <trip_type>international</trip_type>
  <travelers_detail>2 adultos, 2 criancas (8 e 5 anos)</travelers_detail>
  <pace>moderate</pace>
  <budget_style>comfortable</budget_style>
  <food_preferences>gluten_free, local_cuisine</food_preferences>
  <interests>history_museums, gastronomy, beaches</interests>
  <accommodation_style>hotel</accommodation_style>
  <booked_transport>airplane</booked_transport>
  <local_mobility>metro, uber</local_mobility>
  <destination_insights>Lisboa em junho: Festas de Santo Antonio (12-13 jun), clima 18-28C, Tram 28 lotado em horarios de pico, Lisboa Card recomendado para familias.</destination_insights>
</traveler_context>

<output_budget>7600 tokens max -- fit entire JSON within this limit</output_budget>
```

### Expected Response (Day 1 only, abbreviated)
```json
{
  "days": [
    {
      "dayNumber": 1,
      "date": "2026-06-15",
      "title": "Chegada e Bairro de Alfama",
      "activities": [
        {
          "time": "10:30",
          "name": "Transfer Aeroporto ao Hotel",
          "description": "Taxi ou Uber do Aeroporto Humberto Delgado ao centro historico",
          "duration": "40min",
          "estimatedCost": "EUR 20",
          "category": "logistics",
          "coordinates": { "lat": 38.7756, "lng": -9.1354 },
          "tip": "Reserve transfer com antecedencia no app Bolt, mais barato que taxi"
        },
        {
          "time": "11:30",
          "name": "Check-in no Hotel",
          "description": "Acomodacao e descanso apos o voo de Sao Paulo",
          "duration": "1h",
          "estimatedCost": "Gratis",
          "category": "logistics",
          "coordinates": { "lat": 38.7139, "lng": -9.1394 },
          "tip": null
        },
        {
          "time": "13:00",
          "name": "Almoco em Alfama",
          "description": "Restaurante familiar com opcoes sem gluten no coracao de Alfama",
          "duration": "1h30",
          "estimatedCost": "EUR 60",
          "category": "food",
          "coordinates": { "lat": 38.7118, "lng": -9.1301 },
          "tip": "Restaurante Barracas de Alfama tem cardapio infantil e opcoes celiacas"
        },
        {
          "time": "15:00",
          "name": "Castelo de Sao Jorge",
          "description": "Explorar o castelo medieval com vista panoramica de Lisboa",
          "duration": "2h",
          "estimatedCost": "EUR 34",
          "category": "culture",
          "coordinates": { "lat": 38.7139, "lng": -9.1334 },
          "tip": "Compre ingressos online com Lisboa Card para evitar fila de 40min"
        },
        {
          "time": "17:30",
          "name": "Miradouro da Graca",
          "description": "Vista panoramica da cidade ao entardecer, otimo para fotos em familia",
          "duration": "45min",
          "estimatedCost": "Gratis",
          "category": "nature",
          "coordinates": { "lat": 38.7183, "lng": -9.1302 },
          "tip": "Chegue antes das 18h para garantir lugar no quiosque"
        }
      ],
      "summary": {
        "activitiesCount": 5,
        "totalDuration": "6h55",
        "totalCost": "EUR 114"
      }
    }
  ]
}
```

---

## 12. Error Handling

### 12.1 JSON Parse Failure

The existing `extractJsonFromResponse()` pipeline handles:
1. Direct `JSON.parse` attempt
2. Extraction from markdown code fences
3. Substring extraction between first `{` and last `}`
4. Truncated JSON repair via `repairTruncatedJson()`

No changes needed. The v2 schema has slightly deeper nesting (coordinates object) but is well within the repair function's capability.

### 12.2 Zod Validation Failure

When `ItineraryPlanV2Schema.safeParse()` fails:
1. **Attempt v1 fallback**: Try parsing with the existing `ItineraryPlanSchema`. If it succeeds, transform the v1 result to v2 shape with default coordinates (`{ lat: 0, lng: 0 }`) and null tips. This handles the case where the model ignores the v2 schema.
2. **If both fail**: Throw `AppError("AI_SCHEMA_ERROR", "errors.aiSchemaError", 502)`.
3. **Do NOT retry** on schema errors -- they indicate a prompt/model mismatch.

### 12.3 Coordinate Validation Failure

If the bounding-box sanity check (Section 10.2) fails:
- Log `ai.plan.coordinates.out_of_bounds` warning with destination and offending coordinates
- **Do NOT reject** the itinerary -- render it without map markers for out-of-bounds activities
- The UI should gracefully handle missing/invalid coordinates by hiding the marker

### 12.4 Truncation Handling

The existing retry mechanism (double `maxTokens` on second attempt, capped at `MAX_PLAN_TOKENS_V2`) is preserved. For v2, truncation is more likely to occur in the last day's activities or summary. The `repairTruncatedJson` function will close open brackets, and Zod validation will determine if the result is usable.

---

## 13. Cache Key Strategy

The existing cache key structure is preserved with one addition -- a version prefix to separate v1 and v2 cached plans:

```typescript
// In CacheKeys:
static aiPlan(hash: string): string {
  return `plan:v2:${hash}`;
}
```

The cache input string remains: `${destination}:${travelStyle}:${budgetRange}:${days}:${language}${notesHash}${ctxHash}`

Old `plan:` keys expire naturally via Redis TTL (24h). No flush needed.

---

## 14. Migration Path (v1 to v2)

### 14.1 Type Coexistence

During migration, both `ItineraryPlan` (v1) and `ItineraryPlanV2` types exist. The `generateTravelPlan` method should:
1. Generate using v2 prompt and schema
2. On Zod v2 failure, attempt v1 schema parse + transform (Section 12.2)
3. Return `ItineraryPlanV2` type to callers

### 14.2 Existing Persisted Itineraries

Itinerary data stored in the database (`ItineraryDay` + `Activity` models, or JSON in `ExpeditionPhase.metadata`) has the v1 shape. Two strategies:

| Strategy | For |
|---|---|
| Detect shape at read time (check for `coordinates` field presence) | Existing itineraries render in v1 layout (no map, no tips) |
| Regeneration prompt on summary page | "Atualizar roteiro" button triggers v2 generation |

**Recommendation**: Shape detection at read time. Do NOT auto-regenerate -- it costs PA and may surprise users.

### 14.3 Feature Flag

The `NEXT_PUBLIC_DESIGN_V2` flag (from SPEC-PHASE6-REDESIGN-BRIEF) controls the UI layout. The v2 prompt should be used regardless of the flag -- even the v1 UI can render v2 data (it simply ignores `coordinates`, `tip`, `summary`). This simplifies the migration: one prompt version, two UI layouts.

---

## 15. Testing Strategy

### 15.1 Unit Tests (Vitest)

| Test | What it validates |
|---|---|
| `buildUserPrompt` with full enriched context | All XML tags present, correct values, per_day budget calculated |
| `buildUserPrompt` with empty context (no `expeditionContext`) | Only `<trip>` block + `<output_budget>`, no `<traveler_context>` |
| `buildUserPrompt` with legacy context (no `personal`/`trip`/`preferences`/`logistics`) | Falls back to semicolon-joined format |
| `buildUserPrompt` with `travelNotes` | `<traveler_notes>` block present |
| `ItineraryPlanV2Schema` parse valid JSON | Accepts the example response from Section 11 |
| `ItineraryPlanV2Schema` reject missing `summary` | Fails with required error |
| `ItineraryPlanV2Schema` reject invalid `category` | Fails with enum error (e.g., "SIGHTSEEING" is not in v2 enum) |
| `ItineraryPlanV2Schema` reject invalid coordinates | Fails with min/max on lat (-91) or lng (181) |
| `ItineraryPlanV2Schema` accept `tip: null` | Passes (nullable field) |
| `ItineraryPlanV2Schema` reject `time` without HH:MM format | Fails with regex |
| `calculatePlanTokenBudgetV2` for 1, 5, 10, 20, 30 days | Correct clamping and formula |
| `validateCoordinateBounds` with valid/invalid coordinates | Returns true/false correctly |

### 15.2 Integration Tests

| Test | What it validates |
|---|---|
| `AiService.generateTravelPlan` with mocked provider returning v2 JSON | Full pipeline: prompt build, provider call, JSON parse, Zod validation, cache write |
| v1 fallback path | Provider returns v1-shaped JSON, v2 parse fails, v1 parse succeeds, transform produces valid v2 |
| Cache hit path | Second call with same params returns cached v2 data without provider call |
| Truncated response + retry | Provider returns truncated on attempt 1, full on attempt 2 |
| Coordinate bounds warning | Provider returns out-of-bounds coordinates, warning logged, itinerary still returned |

### 15.3 Manual Validation Checklist

Before merging the prompt change, run itinerary generation for these scenarios and verify output quality:

- [ ] **Family beach**: Destination "Florianopolis, Brasil" + 5 days + family + 2 children + interests: beaches, nature_hiking + budget: moderate
- [ ] **Solo adventure**: Destination "Queenstown, New Zealand" + 7 days + solo + interests: sports_adventure, nature_hiking + pace: intense + fitness: high
- [ ] **Couple romantic**: Destination "Paris, France" + 4 days + couple + interests: gastronomy, art_galleries + pace: relaxed + budget: luxury
- [ ] **Budget backpacker**: Destination "Bangkok, Thailand" + 10 days + solo + budget: budget + interests: street food, nightlife + wake: night_owl
- [ ] **Minimal context**: Destination "Tokyo, Japan" + 3 days + no expeditionContext at all
- [ ] **Long trip**: Destination "Italia" + 14 days + couple + moderate + culture + verify 3-4 activities/day after day 10
- [ ] **Infant present**: Destination "Orlando, USA" + 7 days + family + 1 infant + verify reduced activities/day and stroller notes

For each scenario, verify:
1. All coordinates are within reasonable distance of the destination
2. Categories are diverse and match the travel style
3. Tips are practical and not generic filler
4. Day summaries are arithmetically consistent with activities
5. Food activities respect dietary preferences
6. Timing respects pace preference (start time, gaps)
7. Language is correct (pt-BR or en)

---

## 16. Implementation Notes for Developers

### Files to Create

1. **`src/lib/prompts/travel-plan-v2.prompt.ts`** -- New file with `travelPlanPromptV2` and `buildUserPrompt` from Section 5. Do NOT modify the existing `travel-plan.prompt.ts` until the migration is complete.

### Files to Modify

2. **`src/lib/prompts/system-prompts.ts`** -- Add `PLAN_SYSTEM_PROMPT_V2` from Section 4. Keep `PLAN_SYSTEM_PROMPT` (v1) for fallback.
3. **`src/lib/prompts/types.ts`** -- Add `TravelPlanParamsV2` extending `TravelPlanParams` if needed (v1 params are sufficient for v2 builder).
4. **`src/types/ai.types.ts`** -- Add `ItineraryPlanV2`, `ActivityV2`, `DayPlanV2`, `DaySummaryV2`, `ActivityCategory`, `Coordinates` types. Keep v1 types for fallback.
5. **`src/server/services/ai.service.ts`** -- Add v2 Zod schemas from Section 6. Update `generateTravelPlan` to use v2 prompt. Add v1 fallback parse. Update `calculatePlanTokenBudget` to v2 formula. Version cache key.
6. **`src/server/cache/keys.ts`** -- Version the plan cache key: `plan:v2:{hash}`.
7. **`src/lib/prompts/index.ts`** -- Export `travelPlanPromptV2`.

### Patterns to Follow

- XML tags in user prompts (proven pattern from v1 enrichment + SPEC-AI-005 guide v2)
- Zod schemas defined in `ai.service.ts` adjacent to the parse call
- Cache key versioning (same pattern as SPEC-AI-005)
- `repairTruncatedJson` for resilience against output truncation

### Patterns to Avoid

- Do NOT put personalization rules in the user prompt -- they belong in the system prompt for caching efficiency
- Do NOT add few-shot examples in the system prompt -- Sonnet follows schemas reliably, and examples add ~800 tokens per example
- Do NOT compute the day summary server-side -- let the AI compute it in-context to save a post-processing step and keep the JSON self-contained
- Do NOT use `null` for `coordinates` -- every activity MUST have coordinates. If the AI omits them, the v1 fallback transform should default to `{ lat: 0, lng: 0 }` and the UI should detect `(0, 0)` as "no coordinates" and hide the map marker

### Security Reminders

- `travelNotes` is user free-text input -- it is passed directly to the AI prompt. The system prompt's "Respond ONLY with a single valid JSON object" instruction + Zod validation provides defense against prompt injection. No additional sanitization needed (the AI output is structured JSON, not rendered HTML).
- Do NOT include `userId`, `email`, `birthDate`, `passportNumber`, or `bookingCode` in the prompt. The `personal.name` field from `ExpeditionContext` is intentionally omitted from the v2 user prompt builder -- names add no itinerary value and are PII.

---

## 17. Open Questions

- [ ] **OQ-1**: Should the `summary.totalCost` include logistics costs (hotel, transfers) or only activity costs? The UI metric label says "Custo estimado" which is ambiguous. Recommend: include all costs for transparency. **Awaiting PO decision.**
- [ ] **OQ-2**: The SPEC-PHASE6-REDESIGN-BRIEF mentions `nightlife` and `sport` categories but their UX color tokens are "A definir pelo ux-designer". The prompt can generate these categories now, but the UI will need fallback colors until UX defines them. **Awaiting UX decision.**
- [ ] **OQ-3**: Should the v2 prompt generate a `tips` array at the top level (like v1) for general trip advice, or are per-activity tips sufficient? The new UI design has no dedicated "tips" section. **Recommend: remove top-level tips, per-activity tips are sufficient.**
- [ ] **OQ-4**: The `NEXT_PUBLIC_DESIGN_V2` flag controls UI layout. Should it also control which prompt version is used, or should v2 prompt always be used? **Recommend: always use v2 prompt (Section 14.3).**

---

## 18. Definition of Done

- [ ] `PLAN_SYSTEM_PROMPT_V2` added to `system-prompts.ts` matching Section 4 exactly
- [ ] `travelPlanPromptV2` created in `travel-plan-v2.prompt.ts` matching Section 5
- [ ] `ItineraryPlanV2Schema` and related Zod schemas added to `ai.service.ts` matching Section 6
- [ ] Types `ItineraryPlanV2`, `ActivityV2`, `ActivityCategory` added to `ai.types.ts`
- [ ] Token budget formula updated to v2 constants
- [ ] Cache key versioned to `plan:v2:`
- [ ] v1 fallback parse + transform implemented in `callProviderForPlan`
- [ ] Coordinate bounds validation implemented (warning-only, non-blocking)
- [ ] Unit tests cover all cases from Section 15.1
- [ ] Integration tests cover all cases from Section 15.2
- [ ] Manual validation checklist (Section 15.3) executed and all 7 scenarios produce valid, personalized output with accurate coordinates
- [ ] Token usage logged and verified within expected budget for all test scenarios
- [ ] No regression in existing v1 itinerary generation or cached data

---

> Status: DRAFT -- Blocked on: OQ-2 (nightlife/sport color tokens from UX)
