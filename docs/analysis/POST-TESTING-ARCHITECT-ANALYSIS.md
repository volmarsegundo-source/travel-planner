# Post-Testing Architect Analysis — ITEM-1, ITEM-3, ITEM-8

**Author**: architect
**Date**: 2026-03-09
**Status**: Analysis (for planning session input)
**Version**: Atlas v0.11.0

---

## ITEM-1: Destination Search Performance + i18n

### Current State

The destination search lives in two files:
- **API route**: `src/app/api/destinations/search/route.ts` — server-side proxy to Nominatim
- **Client component**: `src/components/features/expedition/DestinationAutocomplete.tsx` — combobox with debounce

**Architecture flow**:
```
User types  -->  300ms debounce  -->  GET /api/destinations/search?q=...
                                         |
                                    auth check
                                    rate limit (1 req/sec/user)
                                    Redis cache lookup (key: dest:search:{q})
                                         |
                                    cache miss? --> Nominatim API
                                         |
                                    transform results --> cache 24h --> respond
```

### Root Causes of Slowness

1. **No locale in cache key or Nominatim request.** Nominatim supports an `accept-language` parameter that controls the language of results. Our current implementation sends no language preference, so results come back in the place's native language. A search for "Tokyo" returns Japanese characters in the display_name. This is both a UX problem AND a cache problem: if we add locale later, every cached entry must be invalidated because the cache key `dest:search:{q}` does not discriminate by locale.

2. **Rate limit is too aggressive for autocomplete.** 1 request per second per user means rapid typing triggers 429 errors. With 300ms debounce, a user can fire ~3 requests/second. The rate limiter rejects 2 of those.

3. **Nominatim latency.** Nominatim (public instance) has variable latency (200ms-1500ms). No timeout is set on the `fetch()` call, so a slow Nominatim response blocks the user.

4. **No deduplication of in-flight requests.** If the user types "Par", a request fires. If they continue typing to "Pari" before the response, a second request fires. The first result arrives and briefly shows results for "Par" before being replaced by "Pari" results. This is a race condition at the UI layer.

5. **Cache key normalization is minimal.** Only `toLowerCase()`. No trimming of extra spaces, no Unicode normalization. "São Paulo" vs "Sao Paulo" are separate cache entries even though Nominatim treats them equivalently.

### Recommended Architecture

#### A. Locale-Aware Nominatim Requests

Pass the user's locale to the API route via a query parameter, and forward it to Nominatim:

```
GET /api/destinations/search?q=tokyo&locale=pt-BR
```

Server-side changes to `route.ts`:
- Extract `locale` from query params (default: `pt-BR`)
- Validate locale against allowed list (`["pt-BR", "en"]`)
- Set `accept-language` parameter on the Nominatim URL: `url.searchParams.set("accept-language", locale)`
- Change cache key to include locale: `dest:search:${locale}:${normalized_q}`

Client-side changes to `DestinationAutocomplete.tsx`:
- Import `useLocale()` from `next-intl`
- Append `&locale=${locale}` to the fetch URL

This is a minimal change (under 10 lines of code across both files).

#### B. Improved Rate Limiting

Change from 1 req/sec to **10 req/min** per user for destination search. This is more appropriate for autocomplete patterns where bursts are expected but sustained volume is low. The key stays the same (`nominatim:{userId}`), only the window changes.

#### C. Fetch Timeout

Add an `AbortController` with a 3-second timeout on the Nominatim fetch. If it times out, return empty results gracefully (the cache miss is non-fatal).

```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 3000);
const response = await fetch(url.toString(), {
  headers: { "User-Agent": USER_AGENT },
  signal: controller.signal,
});
clearTimeout(timeout);
```

#### D. Client-Side Request Deduplication

The `DestinationAutocomplete` should use an `AbortController` to cancel the previous in-flight request when a new one fires. This eliminates the race condition where stale results flash briefly.

```typescript
const abortRef = useRef<AbortController | null>(null);

const fetchResults = useCallback(async (query: string) => {
  abortRef.current?.abort();
  const controller = new AbortController();
  abortRef.current = controller;
  // pass { signal: controller.signal } to fetch
}, []);
```

#### E. Cache Key Normalization

Normalize the query before cache lookup:
```typescript
function normalizeCacheQuery(q: string): string {
  return q.trim().toLowerCase().normalize("NFC").replace(/\s+/g, " ");
}
```

#### F. NOT Recommended (for now)

- **Replacing Nominatim with a paid geocoding service** (Google Places, Mapbox Geocoding): premature for MVP. Nominatim is free and adequate with proper caching and timeout handling.
- **Pre-populating a local destinations database**: high maintenance, questionable value when Nominatim already covers global cities.
- **Client-side caching (TanStack Query)**: would add complexity and the server Redis cache already handles repeat queries across all users.

### Effort Estimate

Small change. Approximately 2-3 hours of implementation + tests. No schema migration needed. No new dependencies.

---

## ITEM-3: International Trip Detection + Transport

### Current State

**Trip classifier** (`src/lib/travel/trip-classifier.ts`):
- Pure function: `classifyTrip(originCountry, destinationCountry) -> TripType`
- 4 types: `domestic`, `mercosul`, `schengen`, `international`
- Hardcoded country lists (MERCOSUL_COUNTRIES, SCHENGEN_COUNTRIES)
- Comparison is case-insensitive
- Assumes origin is always Brazil (the Mercosul check is `origin === "brazil"`)

**UserProfile schema** (relevant fields):
- `country`: user's country (optional, VarChar 100)
- `city`: user's city (optional, VarChar 100)
- `address`: user's full address (optional, VarChar 300, encrypted at rest)

**Trip schema**:
- `destination`: free-text string (VarChar 150) -- this is the display name from Nominatim
- `tripType`: string (VarChar 20, default "international")
- No `originCountry` or `destinationCountry` fields
- No lat/lon stored

### Problem Analysis

1. **No structured origin.** The Trip model has no origin field. The classifier needs `originCountry` but currently, trips only store `destination` (which is a display_name string like "Paris, Ile-de-France, France").

2. **No structured country extraction.** The `destination` field contains a display_name, not a structured country. The classifier expects a country name, but there is no guaranteed way to extract "France" from "Paris, Ile-de-France, France" without parsing or storing the Nominatim `address.country` separately.

3. **User profile country is optional.** The user may not have filled their profile. The classifier cannot assume an origin.

4. **Brazil-centric logic.** The Mercosul check only works if origin is Brazil. A user from Argentina traveling to Uruguay would not be classified as `mercosul`.

5. **No transport mode concept.** The system has no model for how the user plans to travel (flight, train, bus, car, ship).

### Design Proposal

#### A. Structured Destination Data on Trip

Add two new columns to the Trip model to store structured geographic data extracted at trip creation time (from the Nominatim result that the DestinationAutocomplete already returns):

```prisma
model Trip {
  // ... existing fields ...
  destinationCountry  String?  @db.VarChar(100)
  destinationLat      Float?
  destinationLon      Float?
  originCountry       String?  @db.VarChar(100)
  originCity          String?  @db.VarChar(100)
  originLat           Float?
  originLon           Float?
}
```

**Why not a separate model?** This is 1:1 with Trip and only 6 fields. A separate `TripGeography` model adds a JOIN for every trip query with no real benefit. Keep it flat.

**Population strategy**:
- `destinationCountry`, `destinationLat`, `destinationLon`: captured from the Nominatim result when the user selects a destination in Phase 1. The `DestinationAutocomplete.onSelect` callback already provides `country`, `lat`, `lon`.
- `originCountry`, `originCity`, `originLat`, `originLon`: populated from the user's profile (`UserProfile.country`, `UserProfile.city`) at trip creation. If the user has no profile, leave null and ask them during Phase 2 (the Explorer phase already collects trip metadata).

**Privacy**: lat/lon are approximate (city-level). No home address coordinates are stored. The `UserProfile.address` field (which is encrypted) is never copied to Trip.

#### B. Improved Trip Classifier

Refactor `classifyTrip` to:
1. Accept origin country (not assume Brazil)
2. Be bidirectional for Mercosul (any Mercosul country to any Mercosul country)
3. Accept country codes (ISO 3166-1 alpha-2) instead of display names to avoid localization issues

```typescript
export function classifyTrip(
  originCountryCode: string,
  destinationCountryCode: string
): TripType {
  if (originCountryCode === destinationCountryCode) return "domestic";

  const isMercosulOrigin = MERCOSUL_CODES.includes(originCountryCode);
  const isMercosulDest = MERCOSUL_CODES.includes(destinationCountryCode);
  if (isMercosulOrigin && isMercosulDest) return "mercosul";

  if (SCHENGEN_CODES.includes(destinationCountryCode)) return "schengen";

  return "international";
}
```

This requires storing country codes, not just names. Nominatim returns `address.country_code` (ISO 3166-1 alpha-2, lowercase). We should capture this at search time and store it.

**Schema addition**:
```prisma
destinationCountryCode  String?  @db.VarChar(2)
originCountryCode       String?  @db.VarChar(2)
```

And update the search route to return `countryCode` from Nominatim's response.

#### C. Transport Mode Recommendation

Transport mode is a **derived suggestion**, not user-committed data (in MVP). The user may override it. The recommendation engine should be a pure function:

```typescript
export type TransportMode = "flight" | "train" | "bus" | "car" | "ferry";

export interface TransportRecommendation {
  primary: TransportMode;
  alternatives: TransportMode[];
  estimatedDistanceKm: number;
  reasoning: string; // i18n key
}

export function recommendTransport(
  originLat: number, originLon: number,
  destLat: number, destLon: number,
  tripType: TripType
): TransportRecommendation { ... }
```

**Heuristic rules** (no external API needed):
- Distance < 300 km: primary = `car`, alternatives = `bus`, `train`
- Distance 300-800 km: primary = `bus` or `train` (depending on continent/region), alternatives = `flight`, `car`
- Distance > 800 km + same continent: primary = `flight`, alternatives = `train` (if Europe)
- Distance > 800 km + different continent: primary = `flight`, alternatives = `ferry` (if applicable routes exist)
- Island destinations: always include `flight` + `ferry`

Distance calculation: Haversine formula (pure math, no API). Already well-known, ~10 lines of code.

**Where to place this**: `src/lib/travel/transport-recommender.ts` (isomorphic, pure function).

#### D. Integration with Expedition Phases

Transport recommendation fits naturally into **Phase 2 (O Explorador)** — the phase where the user defines trip details. The Phase2Wizard already collects metadata. We add:
1. Auto-populate origin from profile (if available)
2. Show transport recommendation based on origin/destination
3. Let user confirm or override the transport mode
4. Store the chosen transport mode on the Trip (new field: `transportMode String? @db.VarChar(20)`)

This enriches Phase 3 (A Rota / checklist) because the checklist rules can vary by transport mode (e.g., "check flight baggage limits" vs. "check car insurance for border crossing").

#### E. Schema Changes Summary

New Trip fields (single migration):
```
destinationCountry      String?  @db.VarChar(100)
destinationCountryCode  String?  @db.VarChar(2)
destinationLat          Float?
destinationLon          Float?
originCountry           String?  @db.VarChar(100)
originCountryCode       String?  @db.VarChar(2)
originCity              String?  @db.VarChar(100)
originLat               Float?
originLon               Float?
transportMode           String?  @db.VarChar(20)
```

New field on DestinationAutocomplete result type:
```
countryCode: string | null  // from Nominatim address.country_code
```

UserProfile change: add `countryCode` (VarChar 2) alongside existing `country` for consistency.

#### F. NOT Recommended (for now)

- **Google Flights / Skyscanner API integration**: premature, adds cost and API key management for MVP
- **Multi-leg trip support**: Phase 2+ feature, not MVP
- **Real-time transport pricing**: requires paid APIs, out of scope
- **Multi-city itinerary with different transport between legs**: interesting but complex, defer to post-MVP

### Effort Estimate

Medium change. Approximately 1-2 sprints depending on scope.
- Migration + classifier refactor: 1 sprint
- Transport recommender + Phase 2 integration: 1 sprint (can be deferred)

### ADR Recommendation

**ADR-009: Structured Geography on Trip Model** should be written if this moves forward. Key decision: flat fields on Trip vs. separate TripGeography model. Recommendation is flat fields (simpler, no JOIN overhead, 1:1 relationship).

---

## ITEM-8: Dashboard Phase System Architecture

### Current State

**Phase definitions** (`src/lib/engines/phase-config.ts`):
- 8 phases defined as `PHASE_DEFINITIONS` array
- Each phase has: `phaseNumber`, `name`, `nameKey`, `isFree`, `pointsReward`, `aiCost`, `badgeKey`, `rankPromotion`, `nonBlocking`
- The config is purely about gamification (points, badges, ranks) -- it says nothing about what tools/features each phase contains

**Implemented phase pages**:
- Phase 1: `/expedition/[tripId]` (main page, Phase1Wizard)
- Phase 2: `/expedition/[tripId]/phase-2` (Phase2Wizard)
- Phase 3: `/expedition/[tripId]/phase-3` (Phase3Wizard)
- Phase 4: `/expedition/[tripId]/phase-4` (Phase4Wizard)
- Phase 5: `/expedition/[tripId]/phase-5` (Phase5Wizard -- DestinationGuide)
- Phase 6: `/expedition/[tripId]/phase-6` (Phase6Wizard -- ItineraryPlan)
- Phase 7: **NO page exists**
- Phase 8: **NO page exists**

**Dashboard** (`AtlasDashboard.tsx` + `ExpeditionCard.tsx`):
- Shows expedition cards with progress bars
- Shortcut badges for checklist (Phase 5+) and itinerary (if generated)
- No phase-level tool listing or "coming soon" indicators

### Phase-Tools Inventory

Based on code inspection, here is the complete mapping of all 8 phases to their tools/features:

| Phase | Name | Tools/Features | Implementation Status |
|---|---|---|---|
| 1 - O Chamado | Trip Creation | Destination autocomplete, trip title, dates, cover emoji/gradient | IMPLEMENTED (Phase1Wizard) |
| 2 - O Explorador | Trip Details | Travel style, budget range, companion info, trip metadata | IMPLEMENTED (Phase2Wizard) |
| 3 - A Rota | Documents Checklist | Passport, visa, insurance, vaccines, emergency contacts, currency | IMPLEMENTED (Phase3Wizard) |
| 4 - O Abrigo | Accommodation + Connectivity | Accommodation type selection, connectivity option (eSIM/roaming/etc) | IMPLEMENTED (Phase4Wizard) |
| 5 - O Mapa dos Dias | Destination Guide (AI) | AI-generated destination guide with sections, viewed tracking | IMPLEMENTED (Phase5Wizard + DestinationGuideWizard) |
| 6 - O Tesouro | Itinerary Plan (AI) | AI-generated day-by-day itinerary | IMPLEMENTED (Phase6Wizard) |
| 7 - A Expedicao | Trip Execution | Real-time trip tracking, daily journal, expense tracking, photo log | NOT IMPLEMENTED |
| 8 - O Legado | Trip Review | Trip summary, rating, public sharing, review for community | NOT IMPLEMENTED |

### Architecture Recommendation: Config-Driven Phase-Tools Registry

The phase-config currently only describes gamification metadata. I recommend extending it with a **tools registry** that describes what each phase offers. This should be config-driven, not hardcoded into components, because:

1. The dashboard needs to render phase details without importing each wizard
2. "Coming soon" status must be deterministic and centrally managed
3. Future features (transport recommender, budget tracker, etc.) slot into existing phases
4. i18n keys for tool names/descriptions should be in one place

#### Proposed Extension to PhaseDefinition

Add a `tools` array to the existing `PhaseDefinition` type:

```typescript
export interface PhaseTool {
  key: string;              // unique identifier (e.g., "destination_autocomplete")
  nameKey: string;          // i18n key for display name
  descriptionKey: string;   // i18n key for short description
  icon: string;             // emoji or icon name
  status: "available" | "coming_soon" | "premium";
  route?: string;           // relative route suffix (e.g., "/phase-3")
}

export interface PhaseDefinition {
  // ... existing fields ...
  tools: readonly PhaseTool[];
}
```

#### Updated PHASE_DEFINITIONS (proposed)

```typescript
export const PHASE_DEFINITIONS: readonly PhaseDefinition[] = [
  {
    phaseNumber: 1,
    name: "O Chamado",
    nameKey: "phases.theCalling",
    isFree: true,
    pointsReward: 100,
    aiCost: 0,
    badgeKey: "first_step",
    rankPromotion: null,
    nonBlocking: false,
    tools: [
      {
        key: "destination_search",
        nameKey: "tools.destinationSearch",
        descriptionKey: "tools.destinationSearchDesc",
        icon: "search",
        status: "available",
      },
      {
        key: "trip_dates",
        nameKey: "tools.tripDates",
        descriptionKey: "tools.tripDatesDesc",
        icon: "calendar",
        status: "available",
      },
      {
        key: "cover_customization",
        nameKey: "tools.coverCustomization",
        descriptionKey: "tools.coverCustomizationDesc",
        icon: "palette",
        status: "available",
      },
    ],
  },
  {
    phaseNumber: 2,
    name: "O Explorador",
    nameKey: "phases.theExplorer",
    tools: [
      {
        key: "travel_style",
        nameKey: "tools.travelStyle",
        descriptionKey: "tools.travelStyleDesc",
        icon: "compass",
        status: "available",
      },
      {
        key: "budget_range",
        nameKey: "tools.budgetRange",
        descriptionKey: "tools.budgetRangeDesc",
        icon: "wallet",
        status: "available",
      },
      {
        key: "transport_mode",
        nameKey: "tools.transportMode",
        descriptionKey: "tools.transportModeDesc",
        icon: "plane",
        status: "coming_soon",  // ties into ITEM-3
      },
    ],
    // ... gamification fields ...
  },
  {
    phaseNumber: 3,
    name: "A Rota",
    nameKey: "phases.theRoute",
    tools: [
      {
        key: "document_checklist",
        nameKey: "tools.documentChecklist",
        descriptionKey: "tools.documentChecklistDesc",
        icon: "clipboard",
        status: "available",
      },
      {
        key: "visa_advisor",
        nameKey: "tools.visaAdvisor",
        descriptionKey: "tools.visaAdvisorDesc",
        icon: "shield",
        status: "coming_soon",
      },
    ],
    // ...
  },
  {
    phaseNumber: 4,
    name: "O Abrigo",
    nameKey: "phases.theShelter",
    tools: [
      {
        key: "accommodation_picker",
        nameKey: "tools.accommodationPicker",
        descriptionKey: "tools.accommodationPickerDesc",
        icon: "home",
        status: "available",
      },
      {
        key: "connectivity_setup",
        nameKey: "tools.connectivitySetup",
        descriptionKey: "tools.connectivitySetupDesc",
        icon: "wifi",
        status: "available",
      },
      {
        key: "booking_links",
        nameKey: "tools.bookingLinks",
        descriptionKey: "tools.bookingLinksDesc",
        icon: "link",
        status: "coming_soon",
      },
    ],
    // ...
  },
  {
    phaseNumber: 5,
    name: "O Mapa dos Dias",
    nameKey: "phases.theDayMap",
    tools: [
      {
        key: "destination_guide_ai",
        nameKey: "tools.destinationGuide",
        descriptionKey: "tools.destinationGuideDesc",
        icon: "book",
        status: "available",
      },
      {
        key: "local_tips",
        nameKey: "tools.localTips",
        descriptionKey: "tools.localTipsDesc",
        icon: "lightbulb",
        status: "coming_soon",
      },
    ],
    // ...
  },
  {
    phaseNumber: 6,
    name: "O Tesouro",
    nameKey: "phases.theTreasure",
    tools: [
      {
        key: "itinerary_ai",
        nameKey: "tools.itineraryAi",
        descriptionKey: "tools.itineraryAiDesc",
        icon: "map",
        status: "available",
      },
      {
        key: "budget_tracker",
        nameKey: "tools.budgetTracker",
        descriptionKey: "tools.budgetTrackerDesc",
        icon: "calculator",
        status: "coming_soon",
      },
    ],
    // ...
  },
  {
    phaseNumber: 7,
    name: "A Expedição",
    nameKey: "phases.theExpedition",
    tools: [
      {
        key: "trip_journal",
        nameKey: "tools.tripJournal",
        descriptionKey: "tools.tripJournalDesc",
        icon: "pencil",
        status: "coming_soon",
      },
      {
        key: "expense_tracker",
        nameKey: "tools.expenseTracker",
        descriptionKey: "tools.expenseTrackerDesc",
        icon: "receipt",
        status: "coming_soon",
      },
      {
        key: "photo_log",
        nameKey: "tools.photoLog",
        descriptionKey: "tools.photoLogDesc",
        icon: "camera",
        status: "coming_soon",
      },
      {
        key: "live_map",
        nameKey: "tools.liveMap",
        descriptionKey: "tools.liveMapDesc",
        icon: "navigation",
        status: "coming_soon",
      },
    ],
    // ...
  },
  {
    phaseNumber: 8,
    name: "O Legado",
    nameKey: "phases.theLegacy",
    tools: [
      {
        key: "trip_summary",
        nameKey: "tools.tripSummary",
        descriptionKey: "tools.tripSummaryDesc",
        icon: "trophy",
        status: "coming_soon",
      },
      {
        key: "trip_rating",
        nameKey: "tools.tripRating",
        descriptionKey: "tools.tripRatingDesc",
        icon: "star",
        status: "coming_soon",
      },
      {
        key: "public_sharing",
        nameKey: "tools.publicSharing",
        descriptionKey: "tools.publicSharingDesc",
        icon: "share",
        status: "coming_soon",
      },
    ],
    // ...
  },
];
```

#### How the Dashboard Uses This

The `ExpeditionCard` or a new `PhaseToolsList` component can import `PHASE_DEFINITIONS` (it is already isomorphic, no `server-only` import) and render tool badges:

```tsx
function PhaseToolsBadges({ phaseNumber }: { phaseNumber: number }) {
  const phase = getPhaseDefinition(phaseNumber as PhaseNumber);
  if (!phase) return null;

  return (
    <div className="flex gap-1.5 flex-wrap">
      {phase.tools.map((tool) => (
        <span
          key={tool.key}
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs",
            tool.status === "available"
              ? "bg-atlas-teal/10 text-atlas-teal"
              : "bg-muted text-muted-foreground opacity-60"
          )}
        >
          {tool.status === "coming_soon" && "🔒 "}
          {t(tool.nameKey)}
        </span>
      ))}
    </div>
  );
}
```

#### Why Config-Driven over Component-Driven

| Aspect | Config-Driven | Component-Driven |
|---|---|---|
| Adding a new tool | Add entry to array | Create component + wire routing |
| "Coming soon" management | Change `status` field | Conditionally render placeholder |
| Dashboard rendering | Map over tools array | Import each phase component |
| i18n | All keys in one place | Scattered across components |
| Type safety | Single `PhaseTool` type | Each component defines own props |
| Testability | Unit test the config | Must render each component |

Config-driven wins on every dimension for the dashboard use case. The actual wizard components (Phase1Wizard, etc.) remain component-driven because they have complex interactive logic. The registry is only for metadata and discovery.

#### Handling Unimplemented Phases

For Phase 7 and Phase 8 which have no page yet:

1. The expedition main page (`/expedition/[tripId]`) should show all 8 phases in a vertical timeline
2. Phases 1-6 link to their respective `/phase-N` routes
3. Phase 7-8 show a "coming soon" state with a lock icon and the tool preview badges
4. The `PhaseDefinition.tools` array with `status: "coming_soon"` provides the content
5. No dead links: phases without routes render as non-clickable cards

This is better than hiding unimplemented phases because it:
- Shows the user the full journey ahead (motivation)
- Sets expectations about what is coming
- Avoids confusion when phase numbers jump from 6 to "complete"

---

## ADR Recommendations

### ADR-009: Structured Geography on Trip Model (NEW)

**Trigger**: ITEM-3 analysis
**Decision needed**: Whether to store `destinationCountry`, `destinationCountryCode`, lat/lon, and origin fields as flat columns on Trip, or as a separate `TripGeography` model.
**Recommendation**: Flat columns. The data is 1:1 with Trip, always needed when rendering trip cards, and only 10 fields. A JOIN is unnecessary overhead.

### ADR-010: Phase-Tools Registry Pattern (NEW)

**Trigger**: ITEM-8 analysis
**Decision needed**: Whether phase tool metadata lives in the existing `phase-config.ts` (extended) or in a separate `phase-tools.ts` config file.
**Recommendation**: Extend `phase-config.ts`. Splitting creates a maintenance burden where phase definitions and their tools drift apart. A single source of truth for "what is a phase and what does it contain" is more maintainable.

### ADR-008: Engines Convention (STILL PENDING from Sprint 9)

This analysis reinforces the need to resolve ADR-008. The `phase-config.ts` file lives in `src/lib/engines/` but is effectively a config file, not an engine. If we extend it with tools metadata, the `engines/` directory name becomes even more misleading. Consider renaming to `src/lib/expedition/` or `src/lib/atlas/` to better reflect the domain.

---

## Summary of Recommendations

| Item | Priority | Effort | Sprint Estimate |
|---|---|---|---|
| ITEM-1: Add locale to Nominatim requests + cache key | HIGH | Small | 0.5 sprint |
| ITEM-1: Fix rate limit (1/sec -> 10/min) | HIGH | Trivial | Same sprint |
| ITEM-1: Add fetch timeout + client AbortController | MEDIUM | Small | Same sprint |
| ITEM-3: Add structured geo fields to Trip | HIGH | Medium | 1 sprint |
| ITEM-3: Refactor classifier to use country codes | HIGH | Small | Same sprint |
| ITEM-3: Transport recommender (Haversine + heuristics) | LOW | Medium | Defer to post-MVP |
| ITEM-8: Extend PhaseDefinition with tools registry | MEDIUM | Small | 1 sprint |
| ITEM-8: Dashboard phase-tools rendering | MEDIUM | Small | Same sprint |
| ITEM-8: Phase 7/8 "coming soon" UI | LOW | Small | Same sprint |

All ITEM-1 changes can ship in a single sprint. ITEM-3 core (geo fields + classifier) is one sprint; transport recommender is deferrable. ITEM-8 is one sprint.

---

> Analysis complete. Ready for planning session review.
