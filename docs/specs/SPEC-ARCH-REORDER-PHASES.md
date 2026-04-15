# SPEC-ARCH-REORDER-PHASES — Expedition Phase Reordering

**Spec ID**: SPEC-ARCH-REORDER-PHASES
**Sprint**: 44
**Related**: SPEC-PROD-REORDER-PHASES (pending), SPEC-UX-REORDER-PHASES (pending)
**Author**: architect
**Status**: Approved
**Version**: 1.0.0
**Last Updated**: 2026-04-15

> **PO decision (2026-04-15)**: Option D — in-place big-bang SQL migration,
> no shadow columns, no `phaseSchemaVersion`, no dual-write, no lazy
> migration. Rollback via DB snapshot + feature flag OFF. Beta dataset is
> small enough to make this the simplest, lowest-risk path.

---

## 1. Overview

Reorder the 6 active expedition phases so that AI generation flows in a
logical dependency chain: **Inspiration → Profile → Guide → Itinerary →
Logistics → Checklist**. Today the chain is Inspiration → Profile →
Checklist → Logistics → Guide → Itinerary, which forces the user to make
packing and logistics decisions before they have any AI-generated
knowledge about the destination.

The new chain lets each phase feed richer context into the next:
- Phase 3 (Guide) generates destination knowledge from Phase 1+2 only.
- Phase 4 (Itinerary) consumes the Guide to place activities.
- Phase 5 (Logistics) consumes Itinerary to pick transport/stays aligned with the plan.
- Phase 6 (Checklist) consumes Guide + Itinerary + Logistics to produce a
  tailored packing/preparation list instead of a generic template.

### Phase Mapping

| Old # | Old Name | New # | New Name | AI Input Depends On |
|---|---|---|---|---|
| 1 | A Inspiração | 1 | A Inspiração | — |
| 2 | O Perfil | 2 | O Perfil | P1 |
| 5 | Guia do Destino | **3** | Guia do Destino | P1, P2 |
| 6 | O Roteiro | **4** | O Roteiro | P1, P2, **P3 (Guide)** |
| 4 | A Logística | **5** | A Logística | P1, P2, P3, **P4 (Itinerary)** |
| 3 | O Preparo | **6** | O Preparo | P1–P5 (all) |

---

## 2. Dimensions

This spec follows the SDD 9-dimension template: Architecture, Data, API,
Business Logic, Security, Performance, Observability, Rollout,
Compatibility. Each section is numbered below.

---

## 3. Architecture — Engine Refactor

### 3.1 Affected engines

| File | Impact |
|---|---|
| `src/lib/engines/phase-config.ts` | **Data change** — reorder `PHASE_DEFINITIONS` array, update `nonBlocking` flags, update `aiCost` per phase, update `badgeKey`/`rankPromotion` per new position |
| `src/lib/engines/phase-navigation.engine.ts` | **Logic change** — update `NON_BLOCKING_PHASES` set, review `resolveAccess` rules |
| `src/lib/engines/phase-engine.ts` | **Logic change** — update prerequisite validations in `validatePhasePrerequisites` (new numbers), update `aiTypeMap` (`{3: ai_guide, 4: ai_itinerary, 5: ai_logistics, 6: ai_checklist}`) |
| `src/lib/engines/phase-completion.engine.ts` | **Re-key** — `evaluatePhaseN` functions and `PhaseDataSnapshot` keys are tied to semantics (guide, itinerary, checklist), not ordinal position → they must be re-wired so that snapshot key `phase3` evaluates guide data, `phase4` evaluates itinerary data, etc. |
| `src/lib/engines/checklist-engine.ts` | **Review** — any hardcoded `phaseNumber: 3` for required-checklist guards must become `phaseNumber: 6` |
| `src/lib/engines/next-steps-engine.ts` | **Review** — next-step recommendations must reflect new ordering |
| `src/lib/engines/points-engine.ts` | **No change** — points ledger is phase-agnostic |

### 3.2 `totalPhases` / `currentPhase` semantics

`TOTAL_ACTIVE_PHASES` (value: 6) **stays the same**. The user-visible
count of phases does not change; only their ordering does.
`Trip.currentPhase` remains `Int 1..6`.

**Public API of engines remains stable** — function signatures
(`completePhase(tripId, userId, phaseNumber, metadata)`,
`resolveAccess(...)`, `getPhaseDefinition(n)`, etc.) do not change. Only
the **semantic meaning** of the integer `phaseNumber` flips.

This is a deliberate trade-off (see ADR-029):
- **Pro**: minimal churn in call sites, server actions, client components.
- **Con**: any raw integer stored in the database (`expedition_phases.phaseNumber`,
  `trips.currentPhase`, `point_transactions.description`, analytics events)
  now means a different phase → **data migration mandatory**.

### 3.3 `nonBlocking` flags in new ordering

Old: phases 3 (Checklist) and 4 (Logistics) were `nonBlocking: true`
because users could advance without completing them (they are preparation,
not AI-generated destination content).

New ordering:
- **Phase 3 (Guide)**: `nonBlocking: false` — gateway for phases 4–6 that
  depend on Guide context for AI. User can still "advance without generating"
  (the guide is optional) — we keep this via the existing `advanceFromPhase()`
  path, but the phase itself is not flagged non-blocking because skipping
  it degrades all downstream AI quality.
  **Decision (see §14)**: keep `nonBlocking: false`, use `advanceFromPhase`
  to allow skipping without completion.
- **Phase 4 (Itinerary)**: `nonBlocking: false`. Itinerary is premium and
  acts as the hub the user will return to.
- **Phase 5 (Logistics)**: `nonBlocking: true`. Users can book transport/
  stays at any time, outside the linear flow.
- **Phase 6 (Checklist)**: `nonBlocking: true`. Packing is iterative.

```
NON_BLOCKING_PHASES (old) = { 3, 4 }
NON_BLOCKING_PHASES (new) = { 5, 6 }
```

### 3.4 Visual flow

```
P1 Inspiration ──► P2 Profile ──► P3 Guide ──► P4 Itinerary ──► P5 Logistics ──► P6 Checklist
  (free)           (free)         (AI 50pts)   (AI 80pts)       (non-block)      (non-block, AI 30pts)
```

---

## 4. Data Model — Prisma Schema

### 4.1 Schema changes

**None.** Option D (PO decision) is a pure data remap — no new columns, no
discriminator, no shadow columns. `Trip.currentPhase` and
`ExpeditionPhase.phaseNumber` are updated in place.

Rationale: beta has a small dataset; rollback path is a **pre-migration DB
snapshot + feature flag OFF**, not a schema-level version flag. Keeping the
schema unchanged avoids follow-up drop-column migrations and eliminates an
entire class of dual-read code paths.

### 4.2 `ExpeditionPhase` table

No schema change. Rows continue to use `phaseNumber Int`. The **meaning**
of the integer flips: after migration, a row with `phaseNumber = 3` and
`status = 'completed'` means "Guide is done", not "Checklist is done".

`ExpeditionPhase.metadata` (JSON) is phase-specific and contains
phase-ordered fields (e.g., Phase 4 old metadata had `needsCarRental`,
`cnhResolved` — these belong to Logistics which is now Phase 5). The
migration must move metadata along with the row. See §5.

### 4.3 Other tables with phase coupling

| Table | Column | Coupling |
|---|---|---|
| `expedition_phases` | `phaseNumber Int` | Primary key (with `tripId`) — must be remapped |
| `trips` | `currentPhase Int` | Must be remapped |
| `point_transactions` | `description String` | Contains text like "Completed phase 3: O Preparo" — **historical record, do NOT rewrite** |
| `phase_checklist_items` | `phaseNumber Int` | Currently the required checklist lives under old phase 3; after reorder this moves to phase 6 |
| `admin_feedback` (per AdminFeedbackClient) | `currentPhase Int?` | Snapshot of currentPhase at feedback time — **historical, do NOT rewrite**. Admin UI interprets via `createdAt < DEPLOY_TS` convention (§13.4) |

---

## 5. Data Migration Plan — Option D (In-Place Big-Bang)

### 5.1 Strategy

**In-place big-bang SQL remap, no schema changes, rollback via DB
snapshot.** This is Option D as approved by the PO on 2026-04-15.

Rejected alternatives (for the record):

| Option | Why rejected |
|---|---|
| Lazy migration (migrate on access) | Dual-read logic everywhere; engines that query "all trips in phase 3" would mix Guide with Checklist; permanent tech debt |
| Dual-write (old + new columns) | 2× complexity in all code paths; only justified for >10k trips with active AI generation in flight |
| `phaseSchemaVersion` discriminator | Would require every engine and every analytics query to branch on version; overkill for the beta dataset; PO explicitly rejected |
| Shadow columns (`legacyPhaseNumber`) | Forces a second follow-up migration to drop them; rollback path is a DB snapshot anyway — shadow columns add no recovery value |

**Why Option D works here**: the Travel Planner is in **beta** with a
small production trip count. A pre-migration pg_dump + feature-flag-OFF
fallback is both simpler and safer than carrying a schema version forever.
The `UPDATE` window is O(tens of ms) and falls within a normal deploy.
We guard against partially-complete expeditions with a **pre-migration
audit SQL** (§5.3) and a re-coherence pass (§5.4).

### 5.2 Mapping function

```
old → new
 1    1
 2    2
 3    6   (Preparo/Checklist → now last)
 4    5   (Logística → now second-to-last)
 5    3   (Guia → now third)
 6    4   (Roteiro → now fourth)
```

**Safe pivot via negative offset**: because `(tripId, phaseNumber)` is
unique and the remap swaps values within a small range, a naive multi-step
UPDATE would collide. We pivot through **negative integers** (which no
real row ever holds) before writing final values:

```
Step A (old → negative):  3 → -3,  4 → -4
Step B (old → final):     5 → 3,   6 → 4
Step C (negative → final): -3 → 6, -4 → 5
```

### 5.3 Pre-migration audit (run on a transaction that ROLLBACKs)

Before the migration commit, run a read-only audit to surface trips whose
completion state would be logically incoherent after the remap (e.g., old
Phase 3 Checklist completed but old Phase 5 Guide not — after remap the
trip would have a completed Phase 6 without a Phase 3). The audit writes
to `docs/runbooks/phase-reorder-audit-2026-04-15.csv` and is reviewed by
product-owner + qa before the real migration runs.

```sql
-- Pre-migration audit: flag trips whose state will be incoherent post-remap
SELECT t.id, t."userId", t."currentPhase",
       bool_or(ep."phaseNumber" = 3 AND ep.status = 'completed') AS checklist_done,
       bool_or(ep."phaseNumber" = 5 AND ep.status = 'completed') AS guide_done,
       bool_or(ep."phaseNumber" = 6 AND ep.status = 'completed') AS itinerary_done
FROM trips t
JOIN expedition_phases ep ON ep."tripId" = t.id
GROUP BY t.id
HAVING bool_or(ep."phaseNumber" = 3 AND ep.status = 'completed')
   AND NOT (bool_or(ep."phaseNumber" = 5 AND ep.status = 'completed')
            AND bool_or(ep."phaseNumber" = 6 AND ep.status = 'completed'));
```

For any row returned, PO decides per-trip whether to:
1. Accept as legacy state + rely on the re-coherence pass (§5.4) to pull
   `currentPhase` back to the lowest incomplete phase.
2. Hand-fix (reset the offending phase to `pending` before migration).

### 5.4 `currentPhase` recomputation

For each trip, after rewriting `ExpeditionPhase.phaseNumber`, recompute
`Trip.currentPhase` as:

```
currentPhase = min(phaseNumber where expedition_phases.status = 'active')
            ?? (max(phaseNumber where status = 'completed') + 1, capped at 6)
            ?? 1
```

This ensures the trip points at a phase that is actually active/unlocked
after remap, not at a stale integer from the old layout.

### 5.5 SQL Migration (Option D — in-place big-bang, no shadow columns)

Migration filename:
`prisma/migrations/20260415_phase_reorder_sprint44/migration.sql`

```sql
-- ─── SPRINT 44: Phase Reorder (Option D — in-place big-bang) ──────────────
-- Reorder expedition phases so AI dependency chain is coherent:
--   1 Inspiration → 2 Profile → 3 Guide → 4 Itinerary → 5 Logistics → 6 Checklist
-- Old → New mapping: 1→1, 2→2, 3→6, 4→5, 5→3, 6→4
-- Pivot via NEGATIVE offset to avoid collisions on (tripId, phaseNumber) unique.
-- Rollback strategy: pre-migration pg_dump + feature flag OFF (no shadow columns).
-- Spec: SPEC-ARCH-REORDER-PHASES (Approved 2026-04-15)

BEGIN;

-- 1) Remap expedition_phases.phaseNumber via negative pivot.
--    Because (tripId, phaseNumber) is unique, we first move the values that
--    need to be OVERWRITTEN by another (3 and 4) into negative slots,
--    then write the final values for 5 and 6, then resolve the negatives.
UPDATE expedition_phases
SET "phaseNumber" = -"phaseNumber"
WHERE "phaseNumber" IN (3, 4);
-- After step 1: old 3 rows now at -3, old 4 rows at -4.
-- Slots 3 and 4 are free for the incoming 5→3 and 6→4 writes.

UPDATE expedition_phases
SET "phaseNumber" = CASE "phaseNumber"
  WHEN 5 THEN 3   -- old 5 Guide     → new 3
  WHEN 6 THEN 4   -- old 6 Itinerary → new 4
  ELSE "phaseNumber"
END
WHERE "phaseNumber" IN (5, 6);
-- After step 2: slots 5 and 6 are free.

UPDATE expedition_phases
SET "phaseNumber" = CASE "phaseNumber"
  WHEN -3 THEN 6  -- old 3 Checklist  → new 6
  WHEN -4 THEN 5  -- old 4 Logistics  → new 5
  ELSE "phaseNumber"
END
WHERE "phaseNumber" IN (-3, -4);

-- 2) Remap phase_checklist_items.phaseNumber (old 3 → new 6).
--    No pivot needed — only one source value.
UPDATE phase_checklist_items
SET "phaseNumber" = 6
WHERE "phaseNumber" = 3;

-- 3) Recompute trips.currentPhase via the same negative pivot.
UPDATE trips
SET "currentPhase" = -"currentPhase"
WHERE "currentPhase" IN (3, 4);

UPDATE trips
SET "currentPhase" = CASE "currentPhase"
  WHEN 5 THEN 3
  WHEN 6 THEN 4
  ELSE "currentPhase"
END
WHERE "currentPhase" IN (5, 6);

UPDATE trips
SET "currentPhase" = CASE "currentPhase"
  WHEN -3 THEN 6
  WHEN -4 THEN 5
  ELSE "currentPhase"
END
WHERE "currentPhase" IN (-3, -4);

-- 4) Re-coherence pass: for trips whose new currentPhase points at a phase
--    that is LOCKED (because a downstream phase was completed before its
--    upstream dependency), pull currentPhase back to the lowest
--    non-completed phase. Surfaces pre-audited incoherent trips (§5.3).
UPDATE trips t
SET "currentPhase" = COALESCE(
  (SELECT MIN(ep."phaseNumber")
   FROM expedition_phases ep
   WHERE ep."tripId" = t.id AND ep."status" != 'completed'),
  1
)
WHERE t.id IN (
  SELECT "tripId" FROM expedition_phases
  WHERE "status" = 'locked' AND "phaseNumber" < (
    SELECT MAX("phaseNumber") FROM expedition_phases ep2
    WHERE ep2."tripId" = expedition_phases."tripId" AND ep2."status" = 'completed'
  )
);

-- 5) Re-lock/unlock expedition_phases to match the new currentPhase.
--    Set status = 'active' for phaseNumber = trip.currentPhase where stale
--    'locked' flags remain (e.g., new phase 3 Guide was locked under old
--    layout because it was old phase 5).
UPDATE expedition_phases ep
SET "status" = 'active'
FROM trips t
WHERE ep."tripId" = t.id
  AND ep."phaseNumber" = t."currentPhase"
  AND ep."status" = 'locked';

COMMIT;
```

### 5.6 Rollback strategy — DB snapshot + feature flag OFF

**No rollback SQL**. Option D treats rollback as a **disaster-recovery
restore**, not a reversible migration:

1. **Before running the migration**, devops takes a full `pg_dump` of the
   production DB (runbook: `docs/runbooks/phase-reorder-rollback.md`).
2. Snapshot is stored in the standard backup bucket with a 30-day retention.
3. If the migration goes wrong:
   - **First response**: flip `PHASE_REORDER_ENABLED=off` so the app stops
     exercising new-layout engine code against the remapped data. This
     buys time for diagnosis without touching the DB.
   - **If data corruption is confirmed**: restore from the pre-migration
     snapshot. The feature flag OFF ensures the restored v1 data is
     interpreted by v1 engine code.
4. Acceptable data loss window: any expedition mutations that happened
   between migration-commit and snapshot-restore are lost. This is
   acceptable in beta (low traffic, PO accepts).

Because Option D writes no schema changes and no shadow columns, there
is nothing to "drop later" — the follow-up migration list for Sprint 45
is empty for this work.

### 5.7 Migration runtime & safety

- **Expected size**: low thousands of trips × 6 phases = tens of thousands
  of rows. PostgreSQL completes in < 5 seconds on Railway-class hardware.
- **Lock behavior**: `UPDATE` takes a ROW EXCLUSIVE lock on affected rows.
  App must be placed in **read-only maintenance mode for 30–60s** during
  the deploy window (devops-engineer wires in existing maintenance banner).
- **Idempotency**: the migration is **not idempotent by design** — running
  it twice would double-swap values. Prisma's `_prisma_migrations` table
  prevents re-execution automatically. Devops must verify the migration is
  recorded before flipping the feature flag to `on`.
- **Negative pivot safety**: all three UPDATE passes target disjoint value
  sets, so a partial failure leaves values in a negative-slot state that
  is visibly invalid (no production code writes negative phase numbers).
  If the transaction aborts mid-way, the `BEGIN/COMMIT` wrapper rolls back
  cleanly.

---

## 6. API Routes & Endpoints per Phase

### 6.1 Current → New ownership table

| Route | Owned by Old Phase | Owned by New Phase | Rename? |
|---|---|---|---|
| `/api/ai/guide/stream` | 5 | **3** | **No** — URL stays as `/api/ai/guide/stream`. Phase ownership is metadata only |
| `/api/ai/plan/stream` | 6 | **4** | **No** — stays as `/api/ai/plan/stream` |
| Server actions: `togglePhase3ItemAction` (checklist) | 3 | **6** | **Rename to `togglePhase6ItemAction`** (or better, `toggleChecklistItemAction`) — see §6.2 |
| Server actions: `updatePhase1Action`, `updatePhase2Action` | 1,2 | 1,2 | No change |
| Server actions for transport/accommodation | 4 | **5** | Names like `saveTransportAction` are already phase-agnostic ✓ |
| Server actions for guide generation | 5 | **3** | `generateGuideAction` — already phase-agnostic ✓ |
| Server actions for itinerary generation | 6 | **4** | `generateTravelPlanAction` — already phase-agnostic ✓ |
| Client routes `/expedition/{id}/phase-N` | N | N | **No rename** — the URL path uses the new N directly. User with bookmark to old `/phase-3` (Checklist) is redirected — see §6.3 |

### 6.2 Server action naming rule

**Rename server actions that embed phase numbers** to be feature-named, not
phase-numbered. This decouples actions from the phase ordering and prevents
future reorder pain.

| Old name | New name |
|---|---|
| `togglePhase3ItemAction` | `toggleChecklistItemAction` |
| `syncPhase6CompletionAction` | `syncItineraryCompletionAction` (old 6 → new 4 — note the semantic change!) |

**Exception**: actions that are literally per-phase metadata updates
(e.g., `updatePhase1Action` for Personal Info) keep their names because
Phase 1 is a stable "data collection" slot regardless of ordering.

### 6.3 Route-level backward compatibility

Users may have bookmarks to `/expedition/{id}/phase-5` (old Guide). In the
new layout, phase-5 is Logistics. We have two choices:

| Option | Behavior |
|---|---|
| **A. Literal URL** | `/phase-5` shows the new Phase 5 (Logistics). Bookmarks break silently. |
| **B. Redirect via query** | Accept `?legacy=1` in the URL and remap client-side. Adds complexity for a single-session concern. |
| **C. No action** | Accept bookmark breakage — release notes call it out. |

**Recommendation**: **Option C**. Phase URLs are not shareable/SEO-relevant
assets; internal bookmarks will settle within one session. Release manager
adds a note in the changelog. (Open Question §14.2.)

### 6.4 Analytics event names

Existing analytics events emit `phase: 3` (integer). After migration, new
events will also emit `phase: 3` but the integer means a different thing.

**Mitigation (Option D)**: because there is no `phaseSchemaVersion`
column, data-engineer partitions historical vs new events by **event
timestamp vs migration timestamp** (`DEPLOY_TS`). All events with
`ts < DEPLOY_TS` use the v1 phase→label map; all events with `ts >=
DEPLOY_TS` use the v2 map. A warehouse view `phases_normalized` exposes
a stable `phase_key` string (`inspiration | profile | guide | itinerary |
logistics | checklist`) computed from `(phase, ts)`. See §13.

---

## 7. Navigation Middleware & Phase Gate

### 7.1 Access guard

`src/lib/guards/phase-access-guard.ts` (server) and
`phase-navigation.engine.ts` (isomorphic) use integer phase numbers and
the `NON_BLOCKING_PHASES` set. Changes:

1. **`NON_BLOCKING_PHASES`**: update from `{3, 4}` to `{5, 6}`.
2. **`resolveAccess()`**: no logic change — rules are expressed in terms of
   "completed", "current", "locked", and "non-blocking", all of which are
   derived from data, not hardcoded phase numbers.
3. **`phase-access-guard.ts`**: if it hardcodes "phase 3 is the checklist
   gate", rewrite to delegate to `evaluatePhase6Completion()`.

### 7.2 Prerequisite validation

`PhaseEngine.validatePhasePrerequisites()` currently has hardcoded logic
per phase number. Rewrite:

| Old | New |
|---|---|
| `phaseNumber === 3` → check required checklist done | `phaseNumber === 6` → check required checklist done |
| `phaseNumber === 4` → check CNH if car rental | `phaseNumber === 5` → check CNH if car rental |
| `phaseNumber === 5` → no-op (guide optional) | `phaseNumber === 3` → no-op (guide optional) |

### 7.3 Phase completion engine re-key

`PhaseDataSnapshot` field names (`phase1`, `phase2`, ..., `phase6`) in
`phase-completion.engine.ts` must be re-bound:

- `phase3` key (old: required-checklist stats) → now holds **Guide** stats
  (`hasGuide`).
- `phase4` key (old: logistics stats) → now holds **Itinerary** stats
  (`itineraryDayCount`).
- `phase5` key (old: guide) → now holds **Logistics**
  (transport/accommodation/mobility).
- `phase6` key (old: itinerary) → now holds **Checklist** (required-done stats).

This is a pure rename within the engine — no API change — but **all call
sites that construct a snapshot must be updated** (see `src/server/services/
phase-completion.service.ts`).

**Preferred**: rename the snapshot keys to feature names
(`guide`, `itinerary`, `logistics`, `checklist`) to decouple from ordinal
position entirely. Mark as a follow-up refactor to avoid scope creep in
Sprint 44.

---

## 8. Admin Panel Impact

Files under `src/app/[locale]/(app)/admin/`:

| File | Impact | Action |
|---|---|---|
| `admin/feedback/AdminFeedbackClient.tsx` | Displays `currentPhase: number` from snapshot at feedback time | Must interpret phase label via **event timestamp vs `DEPLOY_TS`** — feedback created before deploy uses v1 labels, after deploy uses v2. Helper: `getPhaseLabel(phase, createdAt)` |
| `admin/analytics/*` | Phase funnel / drop-off charts | **Data-engineer handoff**: all aggregations partitioned by `event.ts < DEPLOY_TS`. Cross-era aggregation must use the stable `phase_key` string (not integer) |
| `admin/ai-governance/*` | AI cost per phase | `aiSpendType` strings (`ai_guide`, `ai_itinerary`, `ai_checklist`) are semantically stable regardless of ordering ⇒ **always aggregate by `aiSpendType`, never by phase number** |
| `admin/dashboard/page.tsx` | Top-level KPIs | Audit for phase-number constants |

The pragmatic choice: wherever admin panels show "Phase N", always render
the phase **name** (via `getPhaseDefinition(n).nameKey`) rather than the
raw integer, and qualify historical data via `createdAt < DEPLOY_TS`.

---

## 9. Data Model Coherence & FK Constraints

### 9.1 Current relations (`Trip` has-many)

```
Trip
├── ExpeditionPhase[]       (phase 1..6, always 6 rows)
├── DestinationGuide?       (old Phase 5, new Phase 3)
├── ItineraryPlan?          (old Phase 6, new Phase 4)
├── TransportSegment[]      (old Phase 4, new Phase 5)
├── Accommodation[]         (old Phase 4, new Phase 5)
├── ChecklistItem[]         (legacy, app-wide)
├── PhaseChecklistItem[]    (phase-gated, old Phase 3, new Phase 6)
└── ItineraryDay[] / Activity[]  (old Phase 6, new Phase 4)
```

### 9.2 No FK changes needed

None of these relations encode `phaseNumber` in the foreign key.
`DestinationGuide` belongs to `Trip` directly, not "Trip phase 5". Same
for `ItineraryPlan`, `TransportSegment`, `Accommodation`. **No FK
migration required.**

The only table that stores phase numbers is `PhaseChecklistItem`
(`phaseNumber Int`), and we remap its values in §5.5 step 4.

### 9.3 New creation-order constraint

In the **new** flow, data gets created in this order:
1. `Trip` + `ExpeditionPhase[]` (Phase 1 initialization)
2. `UserProfile` updates (Phase 2)
3. `DestinationGuide` (Phase 3)
4. `ItineraryPlan`, `ItineraryDay[]`, `Activity[]` (Phase 4)
5. `TransportSegment[]`, `Accommodation[]` (Phase 5)
6. `PhaseChecklistItem[]` (Phase 6)

No DB-level constraint enforces this order — we rely on the navigation
guard + `validatePhasePrerequisites` at the application layer. **Do not
add a FK from `ItineraryPlan` → `DestinationGuide`.** The AI agent can
still produce a useful itinerary without a guide in edge cases, and a hard
FK would block revisits.

---

## 10. AI Dependency Chain — Context Assembly

### 10.1 Current state

Each AI generation endpoint assembles its own prompt context ad-hoc. Phase 5
(old) `generateGuideAction` reads `trip` + `userProfile` + `preferences`.
Phase 6 (old) `generateTravelPlanAction` does the same, plus any existing
`ItineraryPlan` for regeneration.

### 10.2 New shared service: `ExpeditionAiContextService`

Introduce a server-only service that assembles a **canonical AI context
object** containing everything produced by prior phases. The service is
the **single entry point** every AI generation call must use — prompt
templates never touch Prisma directly, and digest helpers are never
called from route handlers.

**File layout (aligned with architect + prompt-engineer)**:

| File | Role |
|---|---|
| `src/server/services/expedition-ai-context.service.ts` | **Service** — assembles `ExpeditionAiContext` from DB, applies BOLA checks, returns a frozen DTO. Only consumer of the digest helpers below |
| `src/lib/prompts/digest.ts` | **Helper** — pure functions like `digestGuide(guide)`, `digestItinerary(plan)`, `digestLogistics(transport, accommodations, mobility)` that reduce DB rows into the token-bounded summaries injected into prompts |

**Consumption rule**: digest helpers in `src/lib/prompts/digest.ts` are
**internal implementation detail** of `ExpeditionAiContextService`. Route
handlers, AI provider calls, and wizard components must not import from
`digest.ts` directly — they call `ExpeditionAiContextService.assemble()`
and receive an already-digested DTO. This keeps token-budget enforcement,
BOLA authorization, and the PII-filter pass in one place.

```ts
// src/server/services/expedition-ai-context.service.ts  (new)
import "server-only";
import { digestGuide, digestItinerary, digestLogistics } from "@/lib/prompts/digest";

export interface ExpeditionAiContext {
  // Always present
  trip: TripCore;
  profile: UserProfileCore;
  preferences: PreferencesCore;

  // Filled in as prior phases complete
  guide?: DestinationGuideSummary;   // Phase 3 output (via digestGuide)
  itinerary?: ItinerarySummary;      // Phase 4 output (via digestItinerary)
  logistics?: {                      // Phase 5 output (via digestLogistics)
    transport: TransportSummary[];
    accommodations: AccommodationSummary[];
    mobility: string[];
  };
}

export class ExpeditionAiContextService {
  static async assemble(tripId: string, userId: string): Promise<ExpeditionAiContext>;
}
```

Each phase's AI generation then requests the context and slices what it
needs:

| Phase | Required context slice | Prompt budget estimate |
|---|---|---|
| 3 Guide | `trip, profile, preferences` | ~800 tokens input |
| 4 Itinerary | `trip, profile, preferences, guide?` | ~1,600 tokens input |
| 5 Logistics | No AI generation (user data entry) | — |
| 6 Checklist | `trip, profile, preferences, guide?, itinerary?, logistics?` | ~2,400 tokens input |

### 10.3 Prompt context budget for Phase 6

With Guide + Itinerary + Logistics as input, Phase 6's prompt input grows
substantially. Strategy:

1. **Summarize, don't dump.** Pass `guide.summary` (1 paragraph), not the
   full guide. Pass `itinerary.dayCount` + `itinerary.activitySummary`, not
   every activity.
2. **Priority truncation**: if total > 2,500 tokens, drop in this order:
   preferences detail → logistics detail → itinerary activity list.
3. **Token budget enforced by prompt-engineer** — cross-ref to Sprint 33
   SPEC-ARCH-021 which already defined a 800-token budget for
   phase-enriched prompts; reuse that approach.

**finops-engineer + prompt-engineer handoff required**: new Phase 6 AI
cost estimate must be computed against the larger context. Old Phase 3
(Checklist) had `aiCost: 30` — we project new Phase 6 will cost ~2× due to
larger prompt.

### 10.4 Graceful degradation

When the user skips Phase 3 (Guide) via `advanceFromPhase`, `guide` is
absent from the context. The Itinerary and Checklist prompts must handle
the absence gracefully — prompt-engineer updates templates to say
*"If guide data is absent, infer from destination name and profile"*.

---

## 11. Feature Flag: `PHASE_REORDER_ENABLED`

### 11.1 Architectural shape — env-only, boolean semantics

Add to `src/lib/env.ts`:

```ts
PHASE_REORDER_ENABLED: z.coerce.boolean().default(false),
```

**Env-only** — no DB-backed flag, no per-user flag, no LaunchDarkly
integration. This is a one-way kill switch, not an A/B test.

Two states:

| State | Behavior |
|---|---|
| `false` (default) | Engines use **old layout**. New-layout code paths are dead code at runtime. Safe to deploy without running the migration. |
| `true` | Engines use **new layout**. Requires that the migration SQL (§5.5) has already been applied to the DB. |

### 11.2 Deploy choreography

- **Day 1** — deploy code with `PHASE_REORDER_ENABLED=false`. New code
  is inert; old layout remains in effect. Smoke test prod.
- **Day 1 + Nh (low-traffic window)** — devops takes `pg_dump` snapshot,
  applies migration SQL (§5.5), flips env var to `true`, restarts app.
- **If rollback needed within minutes**: flip env var to `false` — app
  stops exercising new-layout code against remapped data. Note: data in
  the DB is already remapped, so phases 3–6 will now **appear wrong to
  v1 engines**. This is why `false` alone is not a full rollback — a DB
  restore from snapshot is still required to reach a fully coherent v1
  state. The env flag only buys diagnostic time.
- **Full rollback** = restore from pg_dump + flag `false`. See §5.6.

### 11.3 Non-blocking roadmap note

Phase reorder is an architectural change, but **the user-facing roadmap
is not blocked on it**. If Sprint 44 has to slip the full rollout, the
feature flag stays `false` and downstream sprints continue on the old
layout without merge conflicts (new-layout code is gated at the engine
entry points, not sprinkled through wizards).

### 11.4 Per-user flag?

Not supported. Phase reordering is a global UX change. A per-user flag
would fork analytics and create inconsistent admin dashboards.

---

## 12. ADRs to Write

| ADR | Title | Status |
|---|---|---|
| ADR-029 | Phase Reorder Strategy — Semantic Remap Without Engine API Break | Proposed |
| ADR-030 | In-Place Big-Bang SQL Migration with DB-Snapshot Rollback (Option D) | Proposed |
| ADR-032 | `ExpeditionAiContextService` as Shared Prompt Context Assembler | Proposed |

**Removed**: ADR-031 (`phaseSchemaVersion` discriminator) — superseded by
PO decision on 2026-04-15 to adopt Option D. No discriminator column is
added; rollback uses a DB snapshot instead.

### ADR-030 (draft body)

**Status**: Proposed
**Context**: Sprint 44 needs to remap phase numbers across
`expedition_phases`, `trips.currentPhase`, and `phase_checklist_items`
to match a new AI-dependency-ordered layout.

**Decision**: Adopt **Option D — in-place big-bang SQL migration with
DB-snapshot rollback**. No shadow columns, no `phaseSchemaVersion`
discriminator, no dual-write, no lazy migration. A single transactional
UPDATE remaps all rows using a negative-offset pivot to avoid
`(tripId, phaseNumber)` unique-key collisions. Rollback is a `pg_dump`
restore paired with `PHASE_REORDER_ENABLED=false`.

**Consequences**:
- **Positive**: minimal schema churn (zero new columns); no follow-up
  drop-column migration in Sprint 45; engine code has exactly one layout
  to reason about; analytics partitioning uses event timestamps (a
  pre-existing dimension) rather than a new column.
- **Negative**: rollback is disaster-recovery-grade (lose any mutations
  between migration and restore), not reversible via SQL. This is
  explicitly acceptable given beta-stage traffic volumes.
- **Risks**: the negative-offset pivot must be run inside a single
  transaction; a mid-transaction crash that leaves negative phase numbers
  in the DB would break reads. Mitigated by wrapping in `BEGIN/COMMIT`
  and verifying row counts after each step in the runbook.

(Note: ADR numbering verified against `docs/architecture.md` — last accepted
is ADR-007. Proposed ADRs 008–028 may be stacking; architect must verify
the next available number at write-time and renumber if needed.)

---

## 13. Backward Compatibility — Analytics & Historical Data

### 13.1 The problem

Pre-Sprint-44 analytics events carry `phase: 3` meaning "Checklist".
Post-Sprint-44 events carry `phase: 3` meaning "Guide". Naïve aggregation
produces garbage.

### 13.2 Fix: partition by event timestamp vs `DEPLOY_TS`

Coordinate with **data-engineer**:

1. Record the exact migration commit timestamp as `DEPLOY_TS` in the
   warehouse config (single constant, no schema change).
2. Every event with `event.ts < DEPLOY_TS` uses the **v1 phase→label**
   map (`3 → checklist`, `4 → logistics`, `5 → guide`, `6 → itinerary`).
3. Every event with `event.ts >= DEPLOY_TS` uses the **v2 phase→label**
   map (`3 → guide`, `4 → itinerary`, `5 → logistics`, `6 → checklist`).
4. Data warehouse introduces a view `phases_normalized` that computes a
   stable `phase_key` string (`inspiration | profile | guide | itinerary
   | logistics | checklist`) from `(phase, ts, DEPLOY_TS)`, and all
   dashboards migrate to querying `phase_key` instead of raw `phase`.

### 13.3 `PointTransaction.description` strings

These contain `"Completed phase 3: O Preparo"` as free text. **Do not
rewrite them** — they are a historical audit trail. The admin UI rendering
these strings must continue to show them verbatim.

New transactions (post-migration) will say `"Completed phase 6: O Preparo"`.
This is correct — it's the new ordering.

### 13.4 `AdminFeedback.currentPhase`

Historical feedback snapshots show the user's phase at submit-time. Render
via `getPhaseLabel(phase, createdAt)` where the helper returns the v1 or
v2 label based on `createdAt < DEPLOY_TS`. No schema change — the
comparison uses the existing `createdAt` column.

---

## 14. PO Decisions (resolved 2026-04-15) + Remaining Open Questions

### 14.1 Resolved

1. **Skipped Guide → Checklist quality** — **DECIDED: allow, degrade
   gracefully**. Prompt template handles absent Guide via fallback phrase.
   Do not block.

2. **Bookmark compatibility** — **DECIDED: literal URL** (new Phase 5 =
   Logistics). Release-manager documents in changelog.

3. **Phase 6 AI cost** — **DECIDED: PA (Pontos de Aventura) are now
   content-based, not position-based**:
   - Guide content produced → **50 PA**
   - Itinerary content produced → **80 PA**
   - Checklist content produced → **30 PA**

   This removes all coupling between point cost and phase number. Even
   if phases are reordered again in the future, the ledger logic follows
   the content type via `aiSpendType`, not the integer position.
   finops-engineer and prompt-engineer still own the token-budget review
   for the enriched Phase 6 prompt (§10.3).

4. **Badges and rank promotions** — **DECIDED: associate by content, not
   phase number**:
   - Badge `detalhista` (formerly `host` / `logistics_master`) is bound
     to the **"Logística"** phase name — it triggers when the Logistics
     content is completed, regardless of whether Logistics is phase 4 or
     phase 5 in the ordering.
   - Rank `capitao` is bound to **Guide content** (AI-generated
     destination knowledge), not to any phase number. In the new layout
     this means the rank triggers at new Phase 3 completion.
   - Implementation: `phase-config.ts` records `badgeKey` and
     `rankPromotion` on the **phase definition keyed by its stable
     semantic name**, and the engine reads the promotion from the
     completed phase's definition rather than from `phaseNumber === N`
     constants.

5. **Non-blocking flags** — **DECIDED: `{5, 6}` non-blocking**. Guide
   stays blocking-but-skippable via `advanceFromPhase()`.

### 14.2 Still open (non-blocking for merge)

1. **Legacy partially-complete expeditions — banner copy**: what does the
   UI show a user whose old Phase 3 (Checklist) was done but old Phase 5
   (Guide) was not? See §5.3.
   - Owner: product-owner + ux-designer.
   - **Not a merge blocker** — the pre-migration audit (§5.3) lets the
     PO inspect real trips and decide on concrete copy during
     implementation week.

---

## 15. Impacted Files (inventory)

### Engines (`src/lib/engines/`)
- `phase-config.ts` — reorder PHASE_DEFINITIONS, update nonBlocking/badges/costs
- `phase-navigation.engine.ts` — update NON_BLOCKING_PHASES set
- `phase-engine.ts` — update `validatePhasePrerequisites`, `aiTypeMap`
- `phase-completion.engine.ts` — re-key PhaseDataSnapshot (preferred:
  rename keys to feature names)
- `checklist-engine.ts` — update any hardcoded phase 3 references to 6
- `next-steps-engine.ts` — audit for phase-number constants

### Prisma
- `prisma/schema.prisma` — **no schema changes** (Option D)
- `prisma/migrations/20260415_phase_reorder_sprint44/migration.sql` (NEW — data-only remap)

### Services (`src/server/services/`)
- `expedition-ai-context.service.ts` (NEW) — AI context assembler; sole consumer of digest helpers
- `phase-completion.service.ts` — update snapshot construction
- `ai.service.ts` / provider calls — consume `ExpeditionAiContextService` (never import digest helpers directly)
- `expedition-summary.service.ts` — audit for phase-number constants
- `trip.service.ts` — audit for phase-number constants

### Prompt helpers (`src/lib/prompts/`)
- `digest.ts` (NEW) — `digestGuide`, `digestItinerary`, `digestLogistics` pure functions, consumed only by `ExpeditionAiContextService`

### Actions (`src/server/actions/`)
- Rename `togglePhase3ItemAction` → `toggleChecklistItemAction`
- Rename `syncPhase6CompletionAction` → `syncItineraryCompletionAction`
- Audit all `*Phase{N}*Action` for misaligned numbers

### Routes
- `/api/ai/guide/stream` — no rename; prerequisite check uses new context
- `/api/ai/plan/stream` — no rename; prerequisite check uses new context
- `src/app/[locale]/(app)/expedition/[tripId]/phase-{1..6}/page.tsx` — the
  file paths stay; the **content** of each directory is swapped to match
  the new phase meaning. (E.g., `phase-3/page.tsx` is rewritten to host
  the Guide wizard instead of the Checklist wizard.)

### Admin
- `src/app/[locale]/(app)/admin/feedback/AdminFeedbackClient.tsx` —
  phase label via `getPhaseLabel(phase, schemaVersion)`
- `src/app/[locale]/(app)/admin/analytics/*` — all phase queries version-qualified
- `src/app/[locale]/(app)/admin/ai-governance/*` — aggregate by `aiSpendType`,
  not phase number
- `src/app/[locale]/(app)/admin/dashboard/page.tsx` — audit

### i18n
- `messages/{pt,en}.json` — reorder phase labels. Keys
  (`phases.theCalling`, `phases.theExplorer`, etc.) stay stable because
  they are semantic, not ordinal.

---

## 16. Risk Register (data migration)

| # | Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|---|
| R1 | Migration runs on partially-complete expedition and produces a logically incoherent state (completed Checklist without Guide) | **HIGH** | Medium | **Pre-migration audit SQL (§5.3)** surfaces incoherent trips BEFORE commit; PO reviews audit output; §5.5 re-coherence pass pulls `currentPhase` back to lowest incomplete phase; graceful degradation in AI prompts |
| R2 | Two deploys (code + migration) run out of order → code expects new layout but DB is still old | **HIGH** | Medium | Deploy code with `PHASE_REORDER_ENABLED=false`; snapshot + migrate DB; then flip flag `true` — devops runbook |
| R4 | `PhaseChecklistItem` rows orphaned if checklist feature-gates on old phase 3 elsewhere | MEDIUM | Low | Grep all `phaseNumber: 3` constants pre-deploy |
| R5 | Analytics dashboards break silently for 1 sprint | MEDIUM | High | Coordinate with data-engineer in Sprint 44 kickoff; partition by `event.ts < DEPLOY_TS` and migrate dashboards to stable `phase_key` strings (§13) |
| R6 | Phase 6 AI context exceeds token budget → cost blow-up or truncation bugs | MEDIUM | Medium | prompt-engineer reviews before merge; finops-engineer monitors post-deploy |
| R7 | `expedition_phases` unique constraint collision during UPDATE | MEDIUM | Low | Negative-offset pivot in migration SQL (§5.5 step 1) |
| R8 | Users with browser tab open at `/phase-3` pre-migration, form submits post-migration → action for Checklist hits new Guide phase gate | LOW | Medium | Actions now feature-named (§6.2); phase-number mismatch surfaces as validation error, not data corruption |
| R9 | `PointTransaction` historical strings confuse admin staff reading old transactions | LOW | High | Accept — document in admin runbook |
| R10 | Rank `capitao` / badge `detalhista` associated with content, not ordinal position — existing users who earned them keep them; future users earn them on the same content type | LOW | Low | PO decision (§14.1.4); badges/ranks keyed by phase definition, not by `phaseNumber === N` constants |

**Removed**: R3 ("rollback mixed traffic") — not applicable under Option
D, because there is no mixed-version state. Rollback is a full DB
snapshot restore + flag OFF, which returns the system to a single
coherent v1 state.

---

## 17. Rollout Plan

1. **Sprint 44 Day 1** — architect spec approved; ADRs 029, 030, 032 written.
2. **Sprint 44 Day 2–3** — dev implements engine changes behind `PHASE_REORDER_ENABLED=false`.
3. **Sprint 44 Day 4** — qa runs full E2E on staging with flag `true` +
   migration applied to a staging DB clone. Pre-migration audit (§5.3)
   run against a prod-data snapshot; PO reviews output.
4. **Sprint 44 Day 5** — devops deploys code to prod with flag `false`.
   Smoke test: new code runs, no migration yet → existing users unaffected.
5. **Sprint 44 Day 5 + Nh (low-traffic window)** — devops takes `pg_dump`,
   runs migration SQL (§5.5) in prod with maintenance banner, flips flag
   to `true`, restarts app.
6. **Sprint 44 Day 6–7** — qa + data-engineer verify analytics & admin
   dashboards using `phase_key` warehouse view. devops monitors Phase 6
   AI cost and token usage.
7. **Sprint 45** — **no follow-up migration** (no shadow columns to drop).
   Only outstanding work is analytics dashboard cleanup if any survived
   on raw `phase` integers.

---

## 18. Definition of Done

- [ ] `phase-config.ts` reordered; badge `detalhista` and rank `capitao` keyed by phase **definition** (not by phase number); tests updated
- [ ] `phase-navigation.engine.ts` `NON_BLOCKING_PHASES = {5, 6}`; tests updated
- [ ] `phase-engine.ts` `validatePhasePrerequisites` + `aiTypeMap` updated
- [ ] `phase-completion.engine.ts` snapshot keys remapped (or renamed to feature names — preferred)
- [ ] `ExpeditionAiContextService` implemented + unit-tested
- [ ] `src/lib/prompts/digest.ts` helpers implemented + unit-tested; only consumed by `ExpeditionAiContextService`
- [ ] PA ledger costs **content-based**: Guide=50, Itinerary=80, Checklist=30 (no coupling to phase number)
- [ ] Migration SQL (§5.5) reviewed by devops + security; runbook includes pg_dump step
- [ ] Pre-migration audit SQL (§5.3) executed against prod snapshot; PO reviews output
- [ ] Prisma schema is **unchanged** (no `phaseSchemaVersion` column)
- [ ] Feature flag `PHASE_REORDER_ENABLED` (boolean env-only) wired in env validation
- [ ] Server actions renamed to feature names (not phase numbers)
- [ ] Admin feedback rendering uses `getPhaseLabel(phase, createdAt)` with `DEPLOY_TS` comparison
- [ ] Analytics dashboards migrated to `phase_key` warehouse view — data-engineer sign-off
- [ ] ADRs 029, 030, 032 drafted and tech-lead-approved
- [ ] Staging deploy executed with migration; qa sign-off (roadmap is **non-blocking** — if Sprint 44 slips, flag stays `false` and downstream sprints proceed)
- [ ] finops-engineer signed off on Phase 6 AI cost envelope
- [ ] release-manager generated CHANGELOG entry with breaking-change banner
- [ ] Rollback runbook in `docs/runbooks/phase-reorder-rollback.md` (pg_dump + flag OFF)

---

## 19. Cross-reference — SPEC-RELEASE

A parallel SPEC-RELEASE update is being prepared by release-manager to
reflect Option D (no `phaseSchemaVersion`, no shadow columns, rollback
via DB snapshot). Any inconsistency between that document and this spec
should be resolved in favor of Option D as approved on 2026-04-15.

---

> ✅ **Ready for Development** — PO decisions of 2026-04-15 resolve all
> merge-blocking open questions. Remaining item §14.2.1 (banner copy for
> legacy partially-complete expeditions) is owned by product-owner +
> ux-designer and can be finalized during implementation week without
> blocking engineering work.
