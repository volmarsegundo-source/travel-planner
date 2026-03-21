# Technical Specification: Phase 6 Prompt Enrichment Architecture

**Spec ID**: SPEC-ARCH-021
**Related Stories**: SPEC-PROD-033 (IMP-005), TASK-S33-011, TASK-S33-012
**Author**: architect
**Status**: Draft
**Last Updated**: 2026-03-20

---

## 1. Overview

This spec defines the data collection, prompt assembly, and token budget management for enriching the Phase 6 itinerary generation prompt with all user data from Phases 1-5. Currently, the prompt receives destination, dates, style, budget, travelers, and travelNotes. After enrichment, it will include origin, passengers, preferences (10 categories), transport segments, accommodation details, mobility choices, checklist progress, and destination guide highlights -- enabling significantly more personalized itinerary generation.

## 2. Architecture Diagram

```
Phase 6 page.tsx (server component)
  |
  +---> db.trip.findFirst(tripId, userId)           -- Phase 1 data
  +---> db.expeditionPhase.findFirst(phase=2)       -- Phase 2 metadata
  +---> db.userProfile.findUnique(userId)            -- Preferences
  +---> db.phaseChecklistItem.findMany(tripId, p=3)  -- Phase 3 checklist
  +---> db.transportSegment.findMany(tripId)         -- Phase 4 transport
  +---> db.accommodation.findMany(tripId)            -- Phase 4 accommodation
  +---> db.destinationGuide.findUnique(tripId)       -- Phase 5 guide
  |
  v (parallel Promise.all -- 7 queries)
  |
  buildEnrichedContext(allData) --> EnrichedExpeditionContext
  |
  v
  Phase6Wizard (client component)
  |  props: { ...existing, enrichedContext }
  |
  v (on generate click)
  |
  POST /api/ai/plan/stream
    body: { ...existing, enrichedContext }
    |
    v
  buildEnrichedPromptSection(enrichedContext)
    |
    +---> estimateTokens(section) --> if > TOKEN_BUDGET_LIMIT
    |       then truncateByPriority(section, budget)
    |
    v
  travelPlanPrompt.buildUserPrompt(params)
    |
    v
  Claude API call
```

## 3. Data Model

### EnrichedExpeditionContext (extends ExpeditionContext)

```typescript
// src/types/ai.types.ts -- extend existing

export interface EnrichedExpeditionContext extends ExpeditionContext {
  // Phase 1 additions
  origin?: string;                    // City of origin
  durationDays?: number;              // Calculated from dates

  // Phase 2 additions (passengers)
  passengers?: {
    adults: number;
    children: number;
    childrenAges?: number[];          // Affects activity recommendations
    infants: number;
  };

  // User Preferences (from UserProfile.preferences JSON)
  preferences?: {
    travelPace?: string;              // "relaxed" | "moderate" | "intense"
    foodPreferences?: string[];       // ["vegetarian", "local_cuisine", ...]
    interests?: string[];             // ["history_museums", "nature_hiking", ...]
    budgetStyle?: string;             // "budget" | "moderate" | "luxury"
    fitnessLevel?: string;            // "low" | "moderate" | "high"
    wakePreference?: string;          // "early_bird" | "flexible" | "night_owl"
    connectivityNeeds?: string;       // "essential" | "occasional" | "digital_detox"
  };

  // Phase 3 (checklist summary)
  checklistSummary?: {
    totalItems: number;
    completedItems: number;
    categories: string[];             // ["DOCUMENTS", "HEALTH", ...]
  };

  // Phase 4 additions
  transport?: {
    segments: Array<{
      type: string;                   // "flight" | "bus" | "train" | ...
      departurePlace?: string;
      arrivalPlace?: string;
      departureAt?: string;           // ISO date string
      arrivalAt?: string;
      isReturn: boolean;
    }>;
  };

  accommodation?: {
    records: Array<{
      type: string;                   // "hotel" | "hostel" | "airbnb" | ...
      name?: string;
      checkIn?: string;
      checkOut?: string;
    }>;
  };

  mobility?: string[];                // ["walking", "bicycle", "public_transport"]

  // Phase 5 additions
  guideHighlights?: string[];         // Top 5 section titles from guide
}
```

**Security**: No sensitive data enters this context. Specifically excluded:
- `bookingCodeEnc` (encrypted booking codes) -- NEVER included
- `birthDate` -- NEVER included; age range derived on server, passed as string ("30-39")
- `passportNumberEnc`, `nationalIdEnc` -- NEVER included
- `userId` -- NEVER included

### No Schema Migration Required

All data already exists in the database. This spec only reads existing fields.

## 4. API Contract

### Endpoint: POST /api/ai/plan/stream (modified)

**Request body** (additions to existing schema):

```typescript
// Extend existing PlanStreamSchema
{
  // ... existing fields unchanged ...
  enrichedContext?: {
    origin?: string;
    durationDays?: number;
    passengers?: { adults: number; children: number; childrenAges?: number[]; infants: number };
    preferences?: {
      travelPace?: string;
      foodPreferences?: string[];
      interests?: string[];
      budgetStyle?: string;
      fitnessLevel?: string;
      wakePreference?: string;
      connectivityNeeds?: string;
    };
    checklistSummary?: { totalItems: number; completedItems: number; categories: string[] };
    transport?: { segments: Array<{ type: string; departurePlace?: string; arrivalPlace?: string; departureAt?: string; arrivalAt?: string; isReturn: boolean }> };
    accommodation?: { records: Array<{ type: string; name?: string; checkIn?: string; checkOut?: string }> };
    mobility?: string[];
    guideHighlights?: string[];
  }
}
```

**Validation**: All fields in `enrichedContext` are optional. Zod schema uses `.optional()` on every field. Missing data is omitted from the prompt -- never replaced with defaults (AC-016).

## 5. Business Logic

### Step 1: Data Collection (server component, page.tsx)

Execute 7 parallel queries in `Promise.all`:

```typescript
const [trip, phase2, profile, checklist, transport, accommodations, guide] =
  await Promise.all([
    db.trip.findFirst({ where: { id: tripId, userId, deletedAt: null }, select: { ... } }),
    db.expeditionPhase.findFirst({ where: { tripId, phaseNumber: 2 }, select: { metadata: true, status: true } }),
    db.userProfile.findUnique({ where: { userId }, select: { preferences: true } }),
    db.phaseChecklistItem.findMany({ where: { tripId, phaseNumber: 3 }, select: { completed: true, required: true, itemKey: true } }),
    db.transportSegment.findMany({ where: { tripId }, orderBy: { segmentOrder: "asc" }, select: { transportType: true, departurePlace: true, arrivalPlace: true, departureAt: true, arrivalAt: true, isReturn: true } }),
    db.accommodation.findMany({ where: { tripId }, orderBy: { orderIndex: "asc" }, select: { accommodationType: true, name: true, checkIn: true, checkOut: true } }),
    db.destinationGuide.findUnique({ where: { tripId }, select: { content: true } }),
  ]);
```

**BOLA**: The trip query includes `userId` in the WHERE clause. All other queries use `tripId` which is already user-scoped.

### Step 2: Context Assembly

```typescript
// src/lib/prompts/enriched-context.builder.ts

export function buildEnrichedContext(
  trip: TripData,
  phase2: Phase2Data | null,
  profile: ProfileData | null,
  checklist: ChecklistData[],
  transport: TransportData[],
  accommodations: AccommodationData[],
  guide: GuideData | null,
): EnrichedExpeditionContext;
```

Assembly rules:
- Each field is included ONLY if the source data is non-null and non-empty
- Preferences are extracted from `profile.preferences` JSON, validated against `PreferencesSchema`
- Transport segments omit `bookingCodeEnc` (security)
- Accommodation records omit `bookingCodeEnc` and `address` (security, irrelevant to prompt)
- Guide highlights: extract top 5 section titles from `DestinationGuideContent`
- Checklist: only include completed item count and category names, not individual item labels

### Step 3: Token Budget Calculation

```typescript
// src/lib/prompts/token-estimator.ts

const CHARS_PER_TOKEN = 4;              // Conservative estimate for Claude
const MAX_ENRICHED_CONTEXT_TOKENS = 800; // Budget for enriched section

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function isWithinBudget(text: string, budget: number): boolean {
  return estimateTokens(text) <= budget;
}
```

**Token budget analysis** (estimates based on real data patterns):

| Section | Typical Chars | Estimated Tokens | Priority |
|---------|--------------|-----------------|----------|
| Origin + duration | 60 | 15 | 1 (structural) |
| Passengers | 80 | 20 | 1 (structural) |
| Transport (2 segments) | 200 | 50 | 2 (logistics) |
| Accommodation (1 record) | 100 | 25 | 2 (logistics) |
| Mobility | 60 | 15 | 2 (logistics) |
| Preferences (all 7 categories) | 300 | 75 | 3 (personalization) |
| Checklist summary | 80 | 20 | 4 (context) |
| Guide highlights (5 items) | 200 | 50 | 4 (context) |
| **Total (typical full expedition)** | **~1080** | **~270** | -- |

**Conclusion**: A fully populated enriched context uses ~270 tokens. The 800-token budget provides a 3x safety margin. Even worst-case scenarios (10 transport segments, 5 accommodations, all preferences) should stay under 600 tokens.

### Step 4: Truncation Strategy (fallback)

If the enriched section exceeds `MAX_ENRICHED_CONTEXT_TOKENS`:

1. **Priority 1 (keep always)**: origin, duration, passengers -- structural data critical to itinerary shape
2. **Priority 2 (keep if budget allows)**: transport, accommodation, mobility -- logistics that affect day planning
3. **Priority 3 (truncate first)**: preferences -- still valuable but less critical than logistics
4. **Priority 4 (drop first)**: checklist summary, guide highlights -- supplementary context

Truncation implementation:
```typescript
export function truncateByPriority(
  context: EnrichedExpeditionContext,
  maxTokens: number
): EnrichedExpeditionContext;
```

Removes fields from priority 4 downward until the rendered section fits within budget. Logs a warning when truncation occurs.

### Step 5: Prompt Template Update

Extend `buildExpeditionSection` in `travel-plan.prompt.ts` to render the new fields:

```xml
<expedition-context>
  <trip-type>Trip type: international</trip-type>
  <traveler-type>Traveler type: leisure_solo</traveler-type>
  <origin>Origin city: Sao Paulo, Brazil</origin>
  <passengers>Passengers: 2 adults, 1 child (age 8)</passengers>
  <transport>
    <segment>Flight: GRU -> LIS, departs 2026-04-10, arrives 2026-04-11</segment>
    <segment>Flight: LIS -> GRU, departs 2026-04-20 (return)</segment>
  </transport>
  <accommodation>Hotel "Pestana Palace" check-in 2026-04-11, check-out 2026-04-20</accommodation>
  <mobility>Local mobility: walking, public transport, taxi</mobility>
  <preferences>
    Travel pace: relaxed | Food: vegetarian, local cuisine | Interests: history, museums, architecture | Wake: early bird
  </preferences>
  <checklist-status>Checklist: 8/12 items completed (DOCUMENTS, HEALTH, CURRENCY)</checklist-status>
  <destination-insights>Guide highlights: timezone, currency, language, safety tips, local customs</destination-insights>
</expedition-context>
```

## 6. External Integrations

### Anthropic Claude API

- **Model**: claude-sonnet (existing -- no change)
- **Token impact**: +270 tokens typical, +600 worst-case in prompt. Current baseline prompt is ~400-500 tokens. Enriched total: ~700-1100 tokens.
- **Cost impact**: At $3/MTok input for Sonnet, worst case adds $0.0018 per generation. At 1000 generations/month: +$1.80/month. Negligible.
- **Context window**: 200K tokens. Enriched prompt uses < 0.6% of window. No risk.

### Failure handling

- If any of the 7 parallel queries fails, catch the error and omit that section from the enriched context. The generation proceeds with available data.
- If ALL enrichment queries fail, fall back to the existing (non-enriched) prompt. Log error, do not block generation (AC-017).

## 7. Security Considerations

- **PII exclusion**: `birthDate`, `passportNumberEnc`, `nationalIdEnc`, `bookingCodeEnc`, `address` are NEVER included in the prompt. Age is derived as a range ("30-39") on the server only.
- **User ID exclusion**: Neither `userId` nor `email` is sent in the prompt (AC from SPEC-PROD-033 constraint).
- **Prompt injection**: `enrichedContext` fields are structural data (enums, dates, short strings). The existing `sanitizeForPrompt` and `maskPII` guards in the stream route apply to `travelNotes` (free-text). Enriched context fields do not need the same treatment because they are system-generated from DB, not user-typed prose. However, accommodation `name` is user-provided and MUST be sanitized.
- **Output guardrails**: Existing output safety guardrails remain in effect.
- **BOLA**: Trip query includes `userId` in WHERE; all related queries use the BOLA-verified `tripId`.

## 8. Performance Requirements

| Metric | Target | Approach |
|--------|--------|----------|
| Data collection (7 queries) | < 500ms (AC from SPEC-PROD-033) | Promise.all parallel execution |
| Context assembly | < 10ms | In-memory mapping, no I/O |
| Token estimation | < 1ms | Character count / 4 |
| Total page.tsx server time | < 800ms | Queries already run for Phase 6 page; enrichment adds ~200ms overhead |

**Database**: All 7 queries use indexed fields (`tripId`, `userId`). No new indexes required.

## 9. Testing Strategy

### Unit Tests

- `enriched-context.builder.ts`: full data produces all fields; partial data omits missing fields; null data returns empty context; security fields (bookingCode, birthDate) never appear
- `token-estimator.ts`: known string -> expected token count; boundary cases
- `truncateByPriority`: removes priority 4 first, then 3; priority 1 fields always survive
- `buildExpeditionSection` (updated): renders XML tags correctly for all new fields; omits empty tags

### Integration Tests

- Phase 6 page.tsx: mock DB returns full data -> enrichedContext passed to wizard with all fields
- Phase 6 page.tsx: mock DB returns partial data -> enrichedContext omits missing sections
- Stream route: enriched context included in prompt -> verify XML structure in built prompt

### E2E Tests

- Generate itinerary with full Phase 1-5 data -> verify itinerary mentions origin, accommodation name, and food preferences
- Generate itinerary with minimal data (only destination + dates) -> verify no errors, generic itinerary produced

### EDD Eval Criteria

| Eval ID | Dimension | Criterion | Pass Threshold |
|---------|-----------|-----------|----------------|
| EDD-021-01 | Security | bookingCodeEnc, birthDate, passportNumberEnc, userId NEVER appear in prompt text | 100% |
| EDD-021-02 | Correctness | All 8 data categories from AC-001 through AC-008 are included when data exists | 100% |
| EDD-021-03 | Correctness | Missing data fields produce no XML tags (not empty tags, not null values) | 100% |
| EDD-021-04 | Performance | Data collection via Promise.all completes in < 500ms (measured in test) | 95th percentile |
| EDD-021-05 | Token Budget | Enriched section stays within MAX_ENRICHED_CONTEXT_TOKENS for typical data | 100% |
| EDD-021-06 | Fallback | If all enrichment queries fail, generation proceeds with baseline prompt | 100% |
| EDD-021-07 | Sanitization | Accommodation name field is sanitized before prompt inclusion | 100% |

## 10. Implementation Notes for Developers

1. **Reuse `ExpeditionSummaryService` query pattern** -- the 7 parallel queries closely mirror `getExpeditionSummary`. Consider extracting a shared data-fetching layer if duplication is excessive. However, do NOT reuse the service directly because: (a) the select clauses differ (summary masks booking codes, enrichment excludes them entirely), and (b) enrichment needs transport dates which summary does not fetch.

2. **Do NOT add preferences to TravelPlanParams directly** -- use the `expeditionContext` extension point that already exists in the type. The `EnrichedExpeditionContext extends ExpeditionContext` pattern keeps backward compatibility.

3. **Accommodation name sanitization**: Apply `sanitizeForPrompt(name, "accommodationName", 100)` before including in the context. This is the only user-typed field in the enrichment data.

4. **Children ages**: The `passengers.childrenAges` field from Trip.passengers JSON contains individual ages. Include them in the prompt as "child (age 8), child (age 12)" so the AI can suggest age-appropriate activities (AC-013).

5. **Date formatting**: Transport and accommodation dates should be formatted as `YYYY-MM-DD` in the prompt (ISO format, human-readable). Do NOT include time zones.

6. **Prompt-engineer review required**: After implementation, the prompt-engineer must review the enriched prompt template for optimization opportunities (token compression, instruction clarity). Tag SPEC-AI for review.

## 11. Open Questions

- [ ] OQ-1: Should the pre-generation summary (AC-014) be a separate component or integrated into Phase6Wizard? Recommendation: separate `PromptContextPreview` component rendered above the generate button.
- [ ] OQ-2: Should guide `viewedSections` (sections the user actually opened) influence the prompt, or all generated sections? Recommendation: include all generated sections to give AI maximum context; viewed sections can be a future refinement.
- [ ] OQ-3: Coordinate with prompt-engineer on exact XML tag names and ordering preferences.

## 12. Definition of Done

- [ ] All AC from SPEC-PROD-033 are met (AC-001 through AC-017)
- [ ] Unit test coverage >= 80% on enriched-context.builder, token-estimator, truncation logic
- [ ] Security: no PII/secrets in prompt verified by dedicated test
- [ ] Token budget analysis documented in TOKEN-BUDGET-ANALYSIS.md
- [ ] Prompt-engineer has reviewed enriched prompt template
- [ ] Performance: data collection < 500ms verified
- [ ] Fallback: generation works with zero enrichment data
- [ ] EDD eval criteria EDD-021-01 through EDD-021-07 pass

> Draft -- pending tech-lead and prompt-engineer review

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-20 | architect | Initial draft -- Sprint 33 Phase 6 prompt enrichment architecture |
