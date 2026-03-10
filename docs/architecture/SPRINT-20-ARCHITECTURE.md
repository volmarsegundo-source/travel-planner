# Sprint 20 Architecture Document

**Author:** architect
**Date:** 2026-03-10
**Status:** Draft (pending tech-lead review)
**Related Items:** ITEM-A, ITEM-C, ITEM-D, ITEM-E (from SPRINT-20-BACKLOG-SEEDS.md)
**Product Spec:** docs/product/TRANSPORT-PHASE-SPEC.md

---

## Table of Contents

1. [ITEM-C: Profile <-> Phase 1 Data Flow](#item-c-profile--phase-1-data-flow)
2. [ITEM-D: Passenger Data Model](#item-d-passenger-data-model)
3. [ITEM-E: Transport & Accommodation Data Model](#item-e-transport--accommodation-data-model)
4. [ITEM-A: Preferences Data Model](#item-a-preferences-data-model)
5. [Migration Strategy](#migration-strategy)
6. [ADR Decisions](#adr-decisions)

---

## ITEM-C: Profile <-> Phase 1 Data Flow

### Current State

Phase 1 wizard (`Phase1Wizard.tsx`) has 4 steps:

```
Step 1: Destination  -->  Step 2: Dates  -->  Step 3: About You  -->  Step 4: Confirmation
```

- Step 3 collects: birthDate, phone, country, city, bio
- These are sent as `profileFields` to `createExpeditionAction`
- `createExpeditionAction` calls `ProfileService.saveAndAwardProfileFields()` AFTER trip creation
- Fields are always re-asked even if already saved in UserProfile

### New Step Order

```
Step 1: Personal Info  -->  Step 2: Destination  -->  Step 3: Dates  -->  Step 4: Travel Style  -->  Step 5: Confirmation
```

Step 4 ("Travel Style") is a new step for preferences (see ITEM-A). If product decides to defer preferences to a later sprint, the order becomes 4 steps:

```
Step 1: Personal Info  -->  Step 2: Destination  -->  Step 3: Dates  -->  Step 4: Confirmation
```

### Data Flow Diagram

```
                                    SERVER (page.tsx)
                                    ================
                                    1. auth() -> userId
                                    2. db.userProfile.findUnique({ where: { userId } })
                                    3. Select PHASE_1_PROFILE_FIELDS
                                    4. Pass as props to Phase1Wizard

    +----------------------------------------------------------+
    | Phase1Wizard (client component)                          |
    |                                                          |
    | Props received:                                          |
    |   initialProfile: { birthDate, phone, country, city,     |
    |                      bio } | null                        |
    |                                                          |
    | On mount:                                                |
    |   profileComplete = ALL 5 fields non-null in             |
    |                     initialProfile                       |
    |                                                          |
    |   IF profileComplete:                                    |
    |     startStep = 2 (skip to Destination)                  |
    |     Show "Welcome back! Using your saved profile."       |
    |                                                          |
    |   ELSE IF initialProfile has SOME fields:                |
    |     startStep = 1 (Personal Info)                        |
    |     Pre-populate filled fields from initialProfile       |
    |     User can edit/complete remaining fields              |
    |                                                          |
    |   ELSE (no profile):                                     |
    |     startStep = 1 (Personal Info)                        |
    |     All fields empty                                     |
    |                                                          |
    +----------------------------------------------------------+

    Step 1: Personal Info
    =====================
    Fields: birthDate, phone, country, city, bio
    Pre-populated from: initialProfile (if available)
    "Already filled" detection: field !== null in initialProfile
    Validation: all optional (user can skip)
    On "Next": move to Step 2 (no save yet)

    Step 2: Destination
    ===================
    Fields: destination (+ DestinationAutocomplete)
    New: origin field (pre-populated from profile.city + profile.country)
    Trip-level data (not profile)

    Step 3: Dates
    =============
    Fields: startDate, endDate, flexibleDates
    Trip-level data (not profile)

    Step 4 (or 5): Confirmation
    ===========================
    Shows summary of ALL data
    On submit:
      1. createExpeditionAction({
           destination, origin, startDate, endDate, flexibleDates,
           profileFields: { birthDate, phone, country, city, bio }
         })
      2. Server-side: create Trip first, then
         ProfileService.saveAndAwardProfileFields() (existing, idempotent)
      3. Points awarded ONLY for newly-saved fields (existing behavior)

    Profile editable later:
    =======================
    /account -> ProfileAccordion -> updateProfileFieldAction()
    (existing, no changes needed)
```

### Profile-Level vs Trip-Level Fields

| Field | Level | Stored In | Persists Across Trips |
|---|---|---|---|
| birthDate | Profile | UserProfile.birthDate | Yes |
| phone | Profile | UserProfile.phone | Yes |
| country | Profile | UserProfile.country | Yes |
| city | Profile | UserProfile.city | Yes |
| bio | Profile | UserProfile.bio | Yes |
| destination | Trip | Trip.destination | No |
| origin | Trip | Trip.origin (NEW) | No (pre-populated from profile) |
| startDate | Trip | Trip.startDate | No |
| endDate | Trip | Trip.endDate | No |
| flexibleDates | Trip | Not persisted (confirmation UX only) | No |

### "Already Filled" Detection Logic

The server component (page.tsx) loads profile and passes it as a serializable prop:

```typescript
// In page.tsx (server component)
const profile = await db.userProfile.findUnique({
  where: { userId },
  select: {
    birthDate: true,
    phone: true,
    country: true,
    city: true,
    bio: true,
  },
});

const PHASE_1_PROFILE_FIELDS = ['birthDate', 'phone', 'country', 'city', 'bio'] as const;

const allFilled = PHASE_1_PROFILE_FIELDS.every(
  (field) => profile?.[field] != null
);

// Serialize dates for client
const initialProfile = profile ? {
  birthDate: profile.birthDate?.toISOString().split('T')[0] ?? null,
  phone: profile.phone,
  country: profile.country,
  city: profile.city,
  bio: profile.bio,
} : null;

return <Phase1Wizard
  initialProfile={initialProfile}
  skipPersonalInfo={allFilled}
  passportExpiry={...}
  userCountry={profile?.country ?? undefined}
/>;
```

### Key Design Decisions

1. **Profile loaded server-side, not client-side.** Avoids an extra API call and loading spinner. The page.tsx already has auth context.

2. **"Skip" not "hide".** When profile is complete, the personal info step is skipped (startStep = 2) but the user can navigate back to Step 1 via the back button to edit. This prevents a "how do I change my info?" confusion.

3. **Save happens at confirmation, not per-step.** Consistent with current behavior. No partial saves during wizard navigation. If the user abandons the wizard, no profile data is altered.

4. **Origin field pre-populated from profile.** `Trip.origin` is new (see ITEM-E). When `profile.city` and `profile.country` exist, origin defaults to `"{city}, {country}"`. Editable by the user.

5. **No new API endpoints needed.** Profile loading uses direct Prisma query in server component. Profile saving uses existing `ProfileService.saveAndAwardProfileFields()`.

---

## ITEM-D: Passenger Data Model

### Current State

Trip model has a single field:

```prisma
// Not present in current schema — travelers field was mentioned
// but does NOT exist in the actual Prisma schema as of v0.13.0
```

After inspecting the schema, the `travelers: Int` field does **not** exist in the current Prisma schema. This means we are adding passenger data from scratch, with no backward compatibility concern.

### Options Evaluated

| Criterion | A: Flat fields on Trip | B: TripPassenger model | C: JSON on Trip |
|---|---|---|---|
| Query by passenger type | Yes (simple WHERE) | Yes (JOIN required) | No (JSON ops) |
| Prisma migration | Simple ALTER TABLE | New table | Simple ALTER TABLE |
| Type safety | Full (typed fields) | Full (typed model) | Partial (Zod at runtime) |
| Schema complexity | Low (4 fields + 1 JSON) | Medium (new model + relation) | Low (1 field) |
| Index support | Native columns | Native columns | PostgreSQL JSONB ops |
| Typical query pattern | "show trip details" | Rarely queried independently | "show trip details" |
| Max entities | 1 per trip (counts only) | N per trip | 1 per trip |
| UI complexity | Simple form | CRUD for N passengers | Simple form |

### Recommendation: Option A (Flat Fields on Trip)

**Rationale:**

Passenger breakdown is a **property of the trip**, not independent entities. We do not need to model individual passengers (names, documents, seats). We need counts by age category to inform AI prompts and checklist rules. This is fundamentally a "how many of each type" question, not a "who are they" question.

Option B (normalized model) is over-engineering for counts. Option C (JSON) loses type safety and indexability for no benefit over flat fields.

### Prisma Schema

```prisma
model Trip {
  // ... existing fields ...

  // Passenger breakdown (Sprint 20)
  adultsCount     Int       @default(1)
  childrenCount   Int       @default(0)
  infantsCount    Int       @default(0)
  childrenAges    Int[]     @default([])
  // Note: no seniorsCount in v1 — airline systems don't distinguish seniors
  // from adults for booking purposes. If needed later, add as additive migration.

  // ... existing relations ...
}
```

### Design Notes

1. **`adultsCount` defaults to 1** because every trip has at least one adult traveler (the creator).

2. **`childrenAges` is `Int[]`** (PostgreSQL native integer array). This is needed because airline rules differ by age (under 2 = infant on lap, 2-11 = child seat, etc.). Prisma 7 supports `Int[]` natively on PostgreSQL. Length must match `childrenCount` — validated in Zod schema, not database constraint.

3. **No `seniorsCount`** in v1. Airlines and transport operators do not universally distinguish seniors from adults for pricing or booking. If senior discounts become relevant (train operators in Europe), we add the field in a future additive migration.

4. **No `infantsCount` on lap vs seat distinction.** This level of detail is for booking engines, not trip planners. We track count only.

5. **Computed `totalTravelers`**: The application layer computes `adultsCount + childrenCount + infantsCount` where needed. No stored computed column.

### Zod Validation Schema

```typescript
export const PassengerBreakdownSchema = z.object({
  adultsCount: z.number().int().min(1).max(9).default(1),
  childrenCount: z.number().int().min(0).max(9).default(0),
  infantsCount: z.number().int().min(0).max(4).default(0),
  childrenAges: z.array(z.number().int().min(0).max(17)).max(9).default([]),
}).refine(
  (data) => data.childrenAges.length === data.childrenCount,
  { message: "childrenAges length must match childrenCount", path: ["childrenAges"] }
).refine(
  (data) => data.infantsCount <= data.adultsCount,
  { message: "infantsCount cannot exceed adultsCount", path: ["infantsCount"] }
);
```

### Impact on Existing Code

- `createExpeditionAction`: accept optional passenger fields; default to `adultsCount: 1` if not provided
- Phase 1 wizard: add passenger step or integrate into confirmation step (UX decision)
- AI prompt enrichment: include passenger breakdown in itinerary/checklist prompts
- `TRIP_SELECT`: add passenger fields to selection set
- No backward compatibility issue (new fields with defaults)

---

## ITEM-E: Transport & Accommodation Data Model

### Overview

Phase 4 ("A Logistica", formerly "O Abrigo") needs three data domains:

1. **Transport segments** (origin to destination, connections, return)
2. **Accommodations** (hotels, hostels, etc.)
3. **Local mobility** preferences (multi-select)
4. **Trip origin** field

### E.1: Origin Field on Trip

```prisma
model Trip {
  // ... existing fields ...
  origin          String?    @db.VarChar(150)
  // ... rest ...
}
```

**Design decisions:**

- `String?` (nullable) for backward compatibility with existing trips. New trips will have it pre-populated from profile.
- Same `VarChar(150)` as `destination` for consistency.
- Pre-populated in Phase 1 from `UserProfile.city + ", " + UserProfile.country` when available.
- Used by `classifyTrip()` which currently receives `originCountry` and `destinationCountry` as parameters. The `origin` field stores the full location string; country extraction continues to happen at the autocomplete level (via `DestinationAutocomplete` which returns `{ displayName, country }`).

### E.2: TransportSegment Model

```prisma
model TransportSegment {
  id              String    @id @default(cuid())
  tripId          String
  segmentOrder    Int       @default(0)

  // Type
  transportType   String    @db.VarChar(20)
  // Values: "flight" | "bus" | "train" | "car" | "ferry" | "other"

  // Route
  departurePlace  String?   @db.VarChar(150)
  arrivalPlace    String?   @db.VarChar(150)

  // Times
  departureAt     DateTime?
  arrivalAt       DateTime?

  // Details
  provider        String?   @db.VarChar(100)
  bookingCodeEnc  String?   @db.Text
  // ^^ Encrypted via AES-256-GCM (src/lib/crypto.ts) — booking codes are sensitive
  estimatedCost   Decimal?  @db.Decimal(10, 2)
  currency        String?   @db.VarChar(3)
  // ^^ ISO 4217 (BRL, EUR, USD)
  notes           String?   @db.VarChar(500)

  // Trip direction
  isReturn        Boolean   @default(false)

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  trip Trip @relation(fields: [tripId], references: [id], onDelete: Cascade)

  @@index([tripId, segmentOrder])
  @@index([tripId, isReturn])
  @@map("transport_segments")
}
```

**Design decisions:**

1. **`transportType` as String, not Prisma enum.** Consistent with gamification pattern (ADR-008 pending) where we use string columns for extensible value sets. Validation happens in Zod schema.

2. **`segmentOrder` for multi-leg trips.** Supports A->B->C->A by ordering segments. Outbound: `isReturn: false, segmentOrder: 0, 1, 2`. Return: `isReturn: true, segmentOrder: 0, 1`.

3. **`bookingCodeEnc` encrypted.** Per product spec, booking codes (localizadores) are sensitive data. Same pattern as `passportNumberEnc` in UserProfile.

4. **`Decimal(10,2)` for cost.** Prisma maps to PostgreSQL `NUMERIC(10,2)`. Avoids floating-point precision issues with currency. Max 99,999,999.99 which covers any reasonable transport cost.

5. **`departureAt` / `arrivalAt` as `DateTime?`** (not separate date + time strings). Full timestamp allows the AI to reason about "flight arrives at 14:00, so skip morning activities on Day 1." Nullable because the user might not know exact times yet.

6. **`onDelete: Cascade`** from Trip. When a trip is soft-deleted (or hard-deleted in test cleanup), segments are removed. Transport segments are trip-derived data, not user-owned entities that need soft delete.

7. **No hard cap on segments in schema.** Business rule enforced in service layer: `MAX_TRANSPORT_SEGMENTS = 10` per trip (generous enough for multi-leg international with connections).

### E.3: Accommodation Model

```prisma
model Accommodation {
  id              String    @id @default(cuid())
  tripId          String

  // Type
  accommodationType String  @db.VarChar(20)
  // Values: "hotel" | "hostel" | "airbnb" | "friends_house" | "camping" | "other"

  // Details
  name            String?   @db.VarChar(150)
  address         String?   @db.VarChar(300)
  bookingCodeEnc  String?   @db.Text
  // ^^ Encrypted (same as TransportSegment)

  // Dates
  checkIn         DateTime?
  checkOut        DateTime?

  // Cost
  estimatedCost   Decimal?  @db.Decimal(10, 2)
  currency        String?   @db.VarChar(3)

  notes           String?   @db.VarChar(500)
  orderIndex      Int       @default(0)

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  trip Trip @relation(fields: [tripId], references: [id], onDelete: Cascade)

  @@index([tripId, orderIndex])
  @@map("accommodations")
}
```

**Design decisions:**

1. **Separate model, not JSON in ExpeditionPhase.metadata.** The product spec suggests this as an option but recommends separate entities "if there is need to query/filter." We will need to query accommodations to feed AI prompts (address for proximity-based itinerary suggestions) and to display them on the trip dashboard. Structured models are the right choice.

2. **`orderIndex` for multi-accommodation trips.** User in Rome for 3 nights then Florence for 4 nights = 2 accommodations, ordered.

3. **`MAX_ACCOMMODATIONS = 5` per trip** (business rule in service layer, per product spec).

4. **`checkIn` / `checkOut` as `DateTime?`** not `Date`. Even though the product spec says "Date", storing as DateTime gives us optionality for check-in times if needed later, and Prisma handles timezone serialization consistently.

### E.4: Local Mobility on Trip

```prisma
model Trip {
  // ... existing fields ...
  localMobility   String[]  @default([])
  // Values: "public_transit" | "taxi_rideshare" | "walking" | "bicycle" |
  //         "private_transfer" | "car_rental" | "other"
}
```

**Design decisions:**

1. **`String[]` (PostgreSQL text array) on Trip, not separate model.** Local mobility is a simple multi-select with no additional metadata per option. A separate model would be over-normalized for what is essentially a tag list.

2. **String array, not enum array.** Consistent with our pattern of using strings for extensible value sets. Zod validates allowed values at the application layer.

3. **When `"car_rental"` is selected**, the existing car rental / CNH flow is activated. This replaces the current Phase 4 binary question of `needsCarRental: boolean`.

### E.5: Updated Trip Model (relations)

Add to the Trip model:

```prisma
model Trip {
  // ... existing fields ...

  // Sprint 20 additions
  origin          String?    @db.VarChar(150)
  adultsCount     Int        @default(1)
  childrenCount   Int        @default(0)
  infantsCount    Int        @default(0)
  childrenAges    Int[]      @default([])
  localMobility   String[]   @default([])

  // New relations
  transportSegments TransportSegment[]
  accommodations    Accommodation[]

  // ... existing relations ...
}
```

### E.6: Phase 4 Metadata Evolution

Currently, Phase 4 stores `{ needsCarRental, cnhResolved }` in `ExpeditionPhase.metadata` (JSON). With the expanded Phase 4, the metadata evolves to:

```typescript
interface Phase4Metadata {
  // Section A: Transport — data in TransportSegment model (not here)
  transportSectionStarted: boolean;

  // Section B: Accommodation — data in Accommodation model (not here)
  accommodationSectionStarted: boolean;

  // Section C: Local Mobility — stored in Trip.localMobility (not here)
  mobilitySectionStarted: boolean;

  // Legacy CNH fields (kept for backward compat)
  needsCarRental?: boolean;
  cnhResolved?: boolean;
}
```

The actual data lives in the proper models. The metadata tracks which sections the user has started (for UX state and phase completion logic).

### E.7: Phase Completion Logic Change

Current: Phase 4 completes when `needsCarRental` question is answered.
New: Phase 4 completes when **at least 1 section has data** (per product spec).

```
Phase 4 completion check:
  hasTransport = TransportSegment.count({ where: { tripId } }) > 0
  hasAccommodation = Accommodation.count({ where: { tripId } }) > 0
  hasMobility = Trip.localMobility.length > 0

  prerequisitesMet = hasTransport || hasAccommodation || hasMobility
```

Phase 4 remains `nonBlocking: true` so the user can always skip.

### E.8: Multi-City Trip Support

The TransportSegment model naturally supports multi-city trips:

```
Example: Sao Paulo -> Roma -> Florenca -> Veneza -> Sao Paulo

Segment 0 (outbound): GRU -> FCO, flight, isReturn: false
Segment 1 (inter-city): Roma -> Florenca, train, isReturn: false
Segment 2 (inter-city): Florenca -> Veneza, train, isReturn: false
Segment 3 (return): Veneza -> GRU, flight, isReturn: true
```

The `isReturn` flag helps the AI distinguish "getting there" from "coming back" when building the itinerary. Inter-city segments have `isReturn: false` because they are part of the forward journey.

---

## ITEM-A: Preferences Data Model

### Current State

UserProfile has two preference-adjacent fields: `dietaryRestrictions` (VarChar 300) and `accessibility` (VarChar 300). These are free-text fields, not structured categories.

### Requirement

Store 8-10 preference categories with multiple selections each. Examples:
- Travel style: adventure, relaxation, culture, nightlife, nature, gastronomy
- Accommodation preference: budget, mid-range, luxury
- Pace: relaxed, moderate, intensive
- Food: vegetarian, vegan, halal, kosher, gluten-free, no restrictions
- Activities: museums, hiking, beaches, shopping, photography, live music
- Budget level: backpacker, comfort, premium, luxury
- Wake-up preference: early bird, flexible, night owl
- Group dynamic: solo, couple, family, friends

### Options Evaluated

| Criterion | A: JSON on UserProfile | B: UserPreference model | C: Enum arrays on UserProfile |
|---|---|---|---|
| Query by preference | JSONB operators (possible but verbose) | Simple WHERE on category+value | PostgreSQL array contains |
| Schema flexibility | High (add categories without migration) | High (rows are data) | Low (new column per category) |
| Type safety | Zod runtime validation | Prisma model + Zod | Prisma enum + Zod |
| Migration cost | 1 column addition | New table + relation | 8-10 column additions |
| Read performance | Single row read (JSON field) | JOIN or separate query | Single row read |
| Index support | GIN index on JSONB | Composite index (userId, category) | GIN on each array |
| AI prompt construction | Parse JSON, iterate categories | Query + group by category | Read columns directly |

### Recommendation: Option A (JSON Field on UserProfile)

**Rationale:**

1. **Preferences are always read and written as a unit.** When the wizard collects preferences, it saves all categories at once. When the AI prompt is constructed, it reads all preferences at once. There is no use case for "find all users who prefer hiking" (that would be analytics, not application logic).

2. **Categories will evolve frequently.** Adding a new preference category should not require a database migration. JSON gives us this flexibility.

3. **Single-row read with profile.** Preferences are loaded alongside other profile fields in the same query. No JOIN needed.

4. **Type safety via Zod.** The JSON structure is validated at write time and typed at read time using a Zod schema. This is the same pattern used by `DestinationGuide.content` and `ExpeditionPhase.metadata`.

### Prisma Schema

```prisma
model UserProfile {
  // ... existing fields ...

  // Preferences (Sprint 20)
  preferences     Json?     @default("{}")
  // Structure validated by PreferencesSchema (Zod)

  // ... rest ...
}
```

### JSON Structure (Zod Schema)

```typescript
export const PreferencesSchema = z.object({
  travelStyle: z.array(z.enum([
    "adventure", "relaxation", "culture", "nightlife",
    "nature", "gastronomy", "photography", "spiritual",
  ])).default([]),

  accommodationPreference: z.array(z.enum([
    "budget", "mid_range", "luxury", "unique",
  ])).default([]),

  pace: z.enum([
    "relaxed", "moderate", "intensive",
  ]).nullable().default(null),

  dietaryPreferences: z.array(z.enum([
    "vegetarian", "vegan", "halal", "kosher",
    "gluten_free", "no_restrictions",
  ])).default([]),

  activities: z.array(z.enum([
    "museums", "hiking", "beaches", "shopping",
    "photography", "live_music", "sports", "wellness",
  ])).default([]),

  budgetLevel: z.enum([
    "backpacker", "comfort", "premium", "luxury",
  ]).nullable().default(null),

  wakeUpPreference: z.enum([
    "early_bird", "flexible", "night_owl",
  ]).nullable().default(null),

  groupDynamic: z.enum([
    "solo", "couple", "family", "friends", "group",
  ]).nullable().default(null),
}).default({});

export type UserPreferences = z.infer<typeof PreferencesSchema>;
```

### Design Notes

1. **Multi-select categories use arrays** (travelStyle, activities, dietaryPreferences, accommodationPreference). Single-select categories use nullable scalars (pace, budgetLevel, wakeUpPreference, groupDynamic).

2. **`dietaryRestrictions` field migration.** The existing `UserProfile.dietaryRestrictions` (free-text VarChar) will remain for now. The new `preferences.dietaryPreferences` structured field supersedes it for AI prompt construction. A future migration can copy existing free-text data into the structured field. No breaking change.

3. **`accessibility` field stays as free-text.** Accessibility needs are too diverse to enumerate. The free-text field remains the right choice.

4. **Preferences affect AI prompts, not application logic.** Preferences are injected into itinerary/guide generation prompts. They do not gate features or change routing. This reinforces the JSON approach: we need flexible read, not structured query.

5. **Points for preferences.** Add new entries to `PROFILE_FIELD_POINTS` for preference completion. Award once when any preference category is first saved. Example: `preferences: 50` points (single award for filling the preferences section, not per-category).

---

## Migration Strategy

### Migration Order (all additive, no breaking changes)

All changes can be delivered in a single migration or split for clarity:

```
Migration 1: add_trip_origin_and_passengers
  - Trip: add origin (String?, VarChar 150)
  - Trip: add adultsCount (Int, default 1)
  - Trip: add childrenCount (Int, default 0)
  - Trip: add infantsCount (Int, default 0)
  - Trip: add childrenAges (Int[], default [])
  - Trip: add localMobility (String[], default [])
  - Index: trips(origin) — optional, only if we query by origin

Migration 2: add_transport_and_accommodation
  - Create TransportSegment table
  - Create Accommodation table
  - Indexes as defined above

Migration 3: add_user_preferences
  - UserProfile: add preferences (Json?, default "{}")
```

### Why 3 Migrations

1. **Trip schema changes** are self-contained and can ship first (enables Phase 1 reorder + passenger breakdown).
2. **Transport/Accommodation models** are new tables with no dependencies on migration 1 (could be parallel, but sequential is safer for review).
3. **Preferences** are a UserProfile change, independent of Trip changes.

### Backward Compatibility

- All new Trip fields have defaults. Existing trips remain valid.
- `origin` is nullable. Existing trips will have `origin: null`. The UI prompts the user to fill it when accessing Phase 4 (per product spec AC-004 of US-118).
- New relations (TransportSegment, Accommodation) are optional. Existing trips have zero segments/accommodations.
- Preferences JSON defaults to `"{}"`. Existing profiles are unaffected.

### Data Backfill (optional, post-migration)

For existing trips where the user has a profile with city + country:

```sql
UPDATE trips t
SET origin = CONCAT(up.city, ', ', up.country)
FROM user_profiles up
WHERE t.user_id = up.user_id
  AND t.origin IS NULL
  AND up.city IS NOT NULL
  AND up.country IS NOT NULL;
```

This is optional and can be run as a one-off script. Not part of the Prisma migration.

---

## ADR Decisions

### ADR-009: Passenger Data as Flat Fields on Trip (Not Normalized)

**Date:** 2026-03-10
**Status:** Proposed
**Deciders:** architect (pending tech-lead review)

#### Context

Sprint 20 requires passenger breakdown by age category (adults, children, infants). The current Trip model has no passenger information. We need to choose between flat fields on Trip, a normalized TripPassenger model, or a JSON field.

#### Options Considered

| Option | Pros | Cons |
|---|---|---|
| A: Flat fields on Trip | Simple queries, type-safe, one read | Not extensible to named passengers |
| B: TripPassenger model | Normalized, extensible to individual passengers | Over-engineered for counts, extra JOINs |
| C: JSON on Trip | Flexible | No type safety in DB, no indexing |

#### Decision

Option A: Flat fields (`adultsCount`, `childrenCount`, `infantsCount`, `childrenAges: Int[]`).

We model passenger counts, not individual passengers. The trip planner does not need to know passenger names, documents, or seat assignments. It needs category counts to inform AI prompts ("family with 2 children ages 5 and 8" produces different itinerary suggestions than "solo adult").

#### Consequences

**Positive:** Simple schema, no JOINs, full type safety, defaults make existing data compatible.
**Negative:** If we ever need to model individual passengers (names, documents for visa applications), we will need a new model. This is explicitly out of scope for MVP.
**Risks:** None for current requirements.

---

### ADR-010: Transport/Accommodation as Separate Models (Not ExpeditionPhase.metadata JSON)

**Date:** 2026-03-10
**Status:** Proposed
**Deciders:** architect (pending tech-lead review)

#### Context

Phase 4 expansion adds transport segments and accommodations. The product spec suggests using `ExpeditionPhase.metadata` (JSON) as an option for MVP. We need to decide between JSON in metadata vs. proper Prisma models.

#### Options Considered

| Option | Pros | Cons |
|---|---|---|
| A: JSON in metadata | No migration for new tables, fast to implement | No referential integrity, no type safety in DB, hard to query |
| B: Separate models | Type-safe, queryable, proper relations, cascade delete | More schema, 1 additional migration |

#### Decision

Option B: Separate `TransportSegment` and `Accommodation` models.

Transport segments feed directly into AI itinerary generation (arrival time determines Day 1 activities). Accommodation addresses feed into proximity-based suggestions. Both need to be reliably queryable, not buried in untyped JSON. The cost of two additional tables is trivial compared to the debugging cost of JSON schema drift.

`ExpeditionPhase.metadata` continues to track UX state (which sections the user has started) but not the actual transport/accommodation data.

#### Consequences

**Positive:** Referential integrity, cascade deletes, queryable for AI prompts, consistent with ItineraryDay/Activity pattern.
**Negative:** One additional migration file.
**Risks:** None significant.

---

### ADR-011: User Preferences as JSON on UserProfile (Not Normalized)

**Date:** 2026-03-10
**Status:** Proposed
**Deciders:** architect (pending tech-lead review)

#### Context

Sprint 20 adds 8-10 preference categories with multi-select options. We need to store them in a way that is easy to read for AI prompts and easy to extend without migrations.

#### Options Considered

| Option | Pros | Cons |
|---|---|---|
| A: JSON on UserProfile | No migration for new categories, single read, flexible | No DB-level type safety, JSONB query syntax for analytics |
| B: UserPreference model (rows) | Normalized, indexable per category | Many rows per user, JOIN for every profile read |
| C: Enum arrays per column | DB-level type safety | Migration per new category, many columns |

#### Decision

Option A: JSON field `preferences` on UserProfile with Zod validation.

Preferences are always read as a complete set (for AI prompt construction) and written as a complete set (wizard submits all categories at once). There is no application-level need to query "all users who like hiking." Adding new preference categories requires only a Zod schema update, not a database migration.

This is consistent with our existing pattern: `DestinationGuide.content` (JSON), `ExpeditionPhase.metadata` (JSON).

#### Consequences

**Positive:** Zero-migration category additions, single-row reads, proven pattern in codebase.
**Negative:** Analytics queries on preferences require JSONB operators. If analytics becomes important, extract to a materialized view or event stream.
**Risks:** JSON schema drift if Zod validation is bypassed. Mitigation: all writes go through `ProfileService` which validates with Zod.

---

### ADR-012: Phase 4 Rename from "O Abrigo" to "A Logistica"

**Date:** 2026-03-10
**Status:** Proposed
**Deciders:** architect (pending product-owner + tech-lead review)

#### Context

Phase 4 was "O Abrigo" (The Shelter) covering only car rental / CNH questions. The product spec expands it to cover transport, accommodation, and local mobility. The name "O Abrigo" does not communicate transport.

#### Decision

Rename Phase 4 to "A Logistica" (The Logistics). Update:
- `phase-config.ts`: `name: "A Logistica"`, `nameKey: "phases.theLogistics"`
- `BadgeKey`: add `"logistics_master"` (keep `"host"` as deprecated alias for backward compat)
- i18n files: add new keys, keep old keys for any legacy references

#### Consequences

**Positive:** Name accurately reflects expanded scope. No data migration needed (phase names are in code, not database).
**Negative:** Badge `"host"` in existing UserBadge rows becomes semantically incorrect. Not breaking (badge display uses the key to look up i18n label, so we update the label).
**Risks:** None significant.

---

## Complete Prisma Schema Diff (Sprint 20)

For reference, the complete set of schema changes:

```prisma
// ─── Trip (modified) ──────────────────────────────────────────────────────────

model Trip {
  // ... existing fields unchanged ...

+ origin          String?    @db.VarChar(150)
+ adultsCount     Int        @default(1)
+ childrenCount   Int        @default(0)
+ infantsCount    Int        @default(0)
+ childrenAges    Int[]      @default([])
+ localMobility   String[]   @default([])

  // New relations
+ transportSegments TransportSegment[]
+ accommodations    Accommodation[]

  // ... existing relations unchanged ...
}

// ─── TransportSegment (new) ────────────────────────────────────────────────

+model TransportSegment {
+  id              String    @id @default(cuid())
+  tripId          String
+  segmentOrder    Int       @default(0)
+  transportType   String    @db.VarChar(20)
+  departurePlace  String?   @db.VarChar(150)
+  arrivalPlace    String?   @db.VarChar(150)
+  departureAt     DateTime?
+  arrivalAt       DateTime?
+  provider        String?   @db.VarChar(100)
+  bookingCodeEnc  String?   @db.Text
+  estimatedCost   Decimal?  @db.Decimal(10, 2)
+  currency        String?   @db.VarChar(3)
+  notes           String?   @db.VarChar(500)
+  isReturn        Boolean   @default(false)
+  createdAt       DateTime  @default(now())
+  updatedAt       DateTime  @updatedAt
+
+  trip Trip @relation(fields: [tripId], references: [id], onDelete: Cascade)
+
+  @@index([tripId, segmentOrder])
+  @@index([tripId, isReturn])
+  @@map("transport_segments")
+}

// ─── Accommodation (new) ───────────────────────────────────────────────────

+model Accommodation {
+  id                String    @id @default(cuid())
+  tripId            String
+  accommodationType String    @db.VarChar(20)
+  name              String?   @db.VarChar(150)
+  address           String?   @db.VarChar(300)
+  bookingCodeEnc    String?   @db.Text
+  checkIn           DateTime?
+  checkOut          DateTime?
+  estimatedCost     Decimal?  @db.Decimal(10, 2)
+  currency          String?   @db.VarChar(3)
+  notes             String?   @db.VarChar(500)
+  orderIndex        Int       @default(0)
+  createdAt         DateTime  @default(now())
+  updatedAt         DateTime  @updatedAt
+
+  trip Trip @relation(fields: [tripId], references: [id], onDelete: Cascade)
+
+  @@index([tripId, orderIndex])
+  @@map("accommodations")
+}

// ─── UserProfile (modified) ────────────────────────────────────────────────

model UserProfile {
  // ... existing fields unchanged ...

+ preferences     Json?     @default("{}")
}
```

---

## Open Questions

- [ ] **Q1:** Does the product owner want Travel Style (preferences) as a step inside Phase 1 wizard, or as a separate dedicated flow (e.g., after onboarding, or in Phase 2)?
- [ ] **Q2:** Should `seniorsCount` be added in v1? European train operators (Trenitalia, Renfe) have senior discounts. Recommendation: defer to v1.1.
- [ ] **Q3:** Confirm Phase 4 rename: "A Logistica" vs. alternatives ("O Porto", "A Base"). Needs product-owner sign-off.
- [ ] **Q4:** Should the data backfill SQL (origin from profile) be automated in the migration or manual?
- [ ] **Q5:** Maximum transport segments per trip: 10 sufficient? Product spec says "N registros" without cap.

---

> Status: Draft -- pending tech-lead and product-owner review before marking as Approved.
