# Root Cause Analysis: Phase 6 Map Shows "Localizacoes nao disponiveis"

**RCA ID**: RCA-002
**Author**: architect
**Date**: 2026-03-30
**Status**: CONFIRMED
**Severity**: P2 -- feature completely non-functional (map never shows pins)

---

## 1. Symptom

The Leaflet map panel in Phase 6 (Itinerary) always displays "Localizacoes nao disponiveis para este dia" regardless of which day is selected or whether the itinerary was freshly generated or loaded from the database. The map container renders but never shows any pins.

---

## 2. Investigation Scope

| File | Purpose |
|---|---|
| `src/components/features/expedition/Phase6ItineraryV2.tsx` | Main Phase 6 component, MapPanel sub-component |
| `src/components/features/expedition/ItineraryMap.tsx` | Leaflet map with numbered pins |
| `src/lib/prompts/system-prompts.ts` | AI system prompt (JSON schema for itinerary) |
| `src/lib/prompts/travel-plan.prompt.ts` | User prompt builder |
| `src/server/services/itinerary-persistence.service.ts` | `persistItinerary()` -- saves AI output to DB |
| `prisma/schema.prisma` | `Activity` model definition |

---

## 3. Data Flow Analysis

```
AI Generation Request
  |
  v
PLAN_SYSTEM_PROMPT (system-prompts.ts line 15-48)
  |-- JSON schema defines: title, description, startTime, endTime,
  |   estimatedCost, activityType
  |-- *** NO coordinates field in schema ***
  |
  v
Claude generates JSON response
  |-- Activities have: title, description, startTime, endTime,
  |   estimatedCost, activityType
  |-- *** No lat/lng in response because not requested ***
  |
  v
parseItineraryJson() (itinerary-persistence.service.ts line 92)
  |-- DayActivitySchema validates: title, description, startTime,
  |   endTime, estimatedCost, activityType
  |-- *** No coordinates in Zod schema ***
  |
  v
persistItinerary() (itinerary-persistence.service.ts line 53)
  |-- tx.activity.createMany({ data: activities.map(...) })
  |-- Mapped fields: dayId, title, notes, startTime, endTime,
  |   orderIndex, activityType
  |-- *** No coordinates persisted ***
  |
  v
Phase 6 Page Load (server component fetches ItineraryDay + Activities)
  |
  v
convertToV2Days() (Phase6ItineraryV2.tsx line 305-339)
  |-- Maps DB activities to V2Activity objects
  |-- Line 323: coordinates: null   <--- HARDCODED NULL
  |
  v
MapPanel receives activities with coordinates: null
  |-- Line 1062-1063:
  |   const locations = activities.filter(
  |     (a) => a.coordinates?.lat != null && a.coordinates?.lng != null
  |   );
  |-- locations.length === 0 (always)
  |
  v
"Localizacoes nao disponiveis para este dia" rendered (line 1099-1103)
```

---

## 4. Root Cause: Three-Layer Absence of Coordinates

The map is non-functional due to a complete absence of coordinate data at every layer of the stack. This is not a bug in any single component -- it is a **missing feature** that was wired into the UI before the data pipeline existed.

### 4.1 Layer 1: AI Prompt Does Not Request Coordinates

The `PLAN_SYSTEM_PROMPT` (system-prompts.ts line 15-48) defines the JSON schema the AI must follow:

```json
{
  "activities": [
    {
      "title": "string",
      "description": "string",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "estimatedCost": number,
      "activityType": "SIGHTSEEING|FOOD|TRANSPORT|..."
    }
  ]
}
```

There is **no `latitude`/`longitude` or `coordinates` field** in this schema. The AI has no instruction to produce coordinates, so it never does.

### 4.2 Layer 2: Database Schema Has No Coordinate Columns

The `Activity` model in `prisma/schema.prisma` (lines 183-200):

```prisma
model Activity {
  id           String   @id @default(cuid())
  dayId        String
  title        String   @db.VarChar(200)
  notes        String?  @db.Text
  startTime    String?  @db.VarChar(5)
  endTime      String?  @db.VarChar(5)
  orderIndex   Int      @default(0)
  activityType String?  @db.VarChar(50)
  // ... timestamps and relation
}
```

There are **no `lat`/`lng`/`coordinates` columns**. Even if the AI returned coordinates, `persistItinerary()` would discard them because the Prisma schema has no fields to store them.

Note: The `Trip` model does have `destinationLat`/`destinationLon` (Sprint 29), but these are for the trip-level map pin on the Atlas page, not for per-activity pins.

### 4.3 Layer 3: Conversion Function Hardcodes null

Even if coordinates somehow existed in the DB response, `convertToV2Days()` at line 323 explicitly sets:

```typescript
coordinates: null,
```

This hardcoded `null` means coordinates from the DB would be ignored even if they were present.

### 4.4 Streaming Path Has Same Issue

The streaming flow (`/api/ai/plan/stream`) uses the same `persistItinerary()` function (line 230 of `route.ts`) and the same system prompt. The V2 component parses the stream for progress counting only -- actual data comes from the DB after `router.refresh()` at line 1286, which re-renders the server component and calls `convertToV2Days()` with the same `coordinates: null` hardcode.

---

## 5. Why the UI Was Built This Way

The `V2Activity` interface (line 242-253) does define an optional coordinates field:

```typescript
interface V2Activity {
  // ...
  coordinates?: { lat: number; lng: number } | null;
  // ...
}
```

And `MapPanel` (line 1055-1108) and `ItineraryMap.tsx` are fully functional components that correctly render pins when given activities with coordinates. The UI layer is **complete and correct** -- it simply never receives coordinate data.

This suggests the map was built as a UI scaffold expecting a data pipeline that was never implemented. The `coordinates: null` in `convertToV2Days()` is a placeholder, not a bug in the usual sense.

---

## 6. Impact Assessment

| Aspect | Status |
|---|---|
| ItineraryMap component | Fully functional (tested with mock data) |
| MapPanel filter logic | Correct (filters for non-null lat/lng) |
| "No locations" message | Correct fallback behavior |
| AI prompt | Missing coordinate fields |
| Zod validation schema | Missing coordinate fields |
| Prisma Activity model | Missing coordinate columns |
| persistItinerary() | Missing coordinate mapping |
| convertToV2Days() | Hardcoded null coordinates |

---

## 7. Recommended Fix

This requires changes at all three layers. There are two approaches:

### Option A: AI-Generated Coordinates (Simpler, Less Accurate)

Add coordinates to the AI prompt schema and let Claude generate approximate lat/lng for each activity based on the destination and activity name.

**Changes required:**

1. **system-prompts.ts** -- Add coordinates to the activity schema:
   ```
   "latitude": number (approximate),
   "longitude": number (approximate)
   ```

2. **itinerary-persistence.service.ts** -- Add lat/lng to DayActivitySchema (Zod) and persist them.

3. **prisma/schema.prisma** -- Add `latitude Float?` and `longitude Float?` to the Activity model. Migration required.

4. **persistItinerary()** -- Map `latitude`/`longitude` from the AI response to the DB fields.

5. **convertToV2Days()** -- Read lat/lng from DB activity and construct `{ lat, lng }` instead of hardcoding null.

**Pros**: Single source (AI), no external API calls, works offline.
**Cons**: AI-generated coordinates are approximate (could be off by hundreds of meters). Claude may hallucinate coordinates for fictional or renamed locations.

### Option B: Geocoding Service (More Accurate, More Complex)

After the AI generates the itinerary, geocode each activity name + destination using a geocoding API (Nominatim, Mapbox Geocoding v6).

**Changes required:**

All of Option A's DB/schema changes, plus:

1. A post-generation geocoding step that batch-geocodes activity titles against the destination.
2. Rate limiting and caching for the geocoding API.
3. Graceful degradation (some activities may not geocode successfully).

**Pros**: Accurate real-world coordinates.
**Cons**: External API dependency, latency (adds seconds to generation), rate limit concerns, some activities (e.g., "Lunch at local restaurant") may not geocode well.

### Option C: Hybrid (Recommended)

1. Add coordinates to the AI prompt (Option A) for immediate results.
2. Mark AI-generated coordinates as `source: "ai"`.
3. In a future sprint, add optional geocoding enrichment (Option B) that overwrites AI coordinates with verified ones.
4. The `source` field lets the UI distinguish approximate vs. verified pins (e.g., dashed circle for AI, solid pin for geocoded).

### Migration Plan

```
1. Prisma migration: add_activity_coordinates
   - Activity.latitude  Float?
   - Activity.longitude  Float?
   - Activity.coordinateSource  String? @db.VarChar(10)  -- "ai" | "geocoded"

2. Update PLAN_SYSTEM_PROMPT to include latitude/longitude in activity schema

3. Update DayActivitySchema (Zod) to accept optional latitude/longitude

4. Update persistItinerary() to map coordinates

5. Update convertToV2Days() to read coordinates from DB

6. No changes needed to ItineraryMap.tsx or MapPanel -- they already work
```

---

## 8. Token Budget Consideration

Adding `"latitude": number, "longitude": number` to each activity in the AI response adds approximately 30-40 tokens per activity. For a 7-day trip with 4 activities per day, that is ~840-1120 extra tokens. The current `maxTokens` is 2048 (dynamically overridden by `calculatePlanTokenBudget`). This may need a modest increase to avoid truncation on longer trips.

The prompt-engineer and finops-engineer should be consulted on the token budget impact before implementation.

---

## 9. Affected Files (for implementation)

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add lat/lng/source to Activity model |
| `src/lib/prompts/system-prompts.ts` | Add coordinates to PLAN_SYSTEM_PROMPT schema |
| `src/server/services/itinerary-persistence.service.ts` | Update Zod schema + persistItinerary mapping |
| `src/components/features/expedition/Phase6ItineraryV2.tsx` | Update `convertToV2Days()` to read lat/lng |
| `src/server/services/ai.service.ts` | Possibly increase token budget calculation |

No changes needed to:
- `src/components/features/expedition/ItineraryMap.tsx` (already works)
- `src/lib/prompts/travel-plan.prompt.ts` (user prompt does not define schema)

---

## 10. Severity Assessment

- **Impact**: P2 -- a visible feature (map panel) is entirely non-functional
- **User effect**: Map panel is decorative only; shows "no locations" message permanently
- **Workaround**: None -- the feature cannot work without data pipeline changes
- **Fix complexity**: Medium (8-12 hours including migration, prompt update, testing)
- **Regression risk**: Low for Option A (additive changes); Medium for Option B (new external dependency)
- **Dependencies**: prompt-engineer (token budget), finops-engineer (cost of extra tokens per generation)
