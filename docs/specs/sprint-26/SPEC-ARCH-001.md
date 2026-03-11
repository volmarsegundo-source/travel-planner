# SPEC-ARCH-001: Itinerary DnD Time Auto-Adjustment

**Version**: 1.0.0
**Status**: Draft
**Author**: architect
**Reviewers**: [tech-lead, security-specialist, qa-engineer]
**Product Spec**: SPEC-PROD-001 (AC deferred: BUG-P1-009)
**UX Spec**: N/A (behavior is algorithmic, not visual)
**Created**: 2026-03-11
**Last Updated**: 2026-03-11

---

## 1. Overview

When users drag-and-drop activities within a day in Phase 6 "O Roteiro", the current implementation reorders `orderIndex` values but preserves the original `startTime` and `endTime` on each activity. This means that after a swap, activity times no longer reflect the visual order -- an activity displayed first may show a later time than the activity below it. This spec defines the algorithm and data flow for automatically recalculating activity times after a reorder operation, preserving each activity's duration while shifting start/end times sequentially based on the new order.

The fix is client-first: recalculate times on the client immediately after drag-end for instant visual feedback, then persist the updated times (along with the new order) to the server via the existing debounced action.

---

## 2. Architecture Decision Records

### ADR-013: Client-Side Time Recalculation with Server Persistence

- **Status**: Proposed
- **Context**: When activities are reordered via DnD, their times must be recalculated. This can happen client-side (instant feedback, no round-trip), server-side (authoritative but introduces latency), or both. The itinerary editor already uses optimistic updates for reorder (updates local state immediately, debounces server sync at 800ms). Time recalculation fits naturally into this existing pattern.
- **Decision**: Recalculate times client-side in the `handleDragEnd` handler, immediately after `arrayMove`. Persist the recalculated times to the server alongside the new `orderIndex` values in the same debounced `reorderActivitiesAction` call. The server action will validate that times are well-formed but will NOT re-run the algorithm -- it trusts the client-calculated values after validation.
- **Consequences**:
  - **Positive**: Zero additional latency for the user. No new server round-trip. Reuses existing debounce pattern. Simple to implement and test.
  - **Negative**: If a client bug produces bad times, the server will persist them. Mitigated by Zod validation on the server (reject malformed HH:MM values, reject endTime < startTime).
  - **Risk**: If the client and server have different time assumptions (e.g., timezone), times could drift. Mitigated by using only HH:MM strings with no timezone component (current data model already stores VarChar(5)).
- **Alternatives Considered**:
  - Server-only recalculation: Would add 800ms+ latency to visual update. Users would see stale times until server responds. Rejected for poor UX.
  - Dual calculation (client + server verification): Adds complexity. The server would need the same algorithm. Rejected as over-engineering for this use case -- Zod validation is sufficient.

---

## 3. System Design

### Component Diagram

```
User drags activity B above activity A in Day 1
            |
            v
  ItineraryEditor.handleDragEnd()
            |
            v
  1. arrayMove(activities, oldIndex, newIndex)
  2. recalculateActivityTimes(reorderedActivities, dayStartTime)
            |
            v
  Optimistic state update: setDays(...)
            |
            v
  Debounced (800ms): reorderActivitiesAction(tripId, payload)
            |
            v
  TripService.reorderActivities(tripId, userId, activities)
            |
            v
  Prisma $transaction: update orderIndex + startTime + endTime per activity
```

### Data Flow

```
CLIENT (ItineraryEditor.tsx)
  |
  | 1. DragEndEvent fires
  | 2. Find day, compute oldIndex/newIndex
  | 3. arrayMove() -> reordered array
  | 4. recalculateActivityTimes() -> array with new start/end times
  |    Input:  [{id, title, startTime: "10:00", endTime: "12:00", orderIndex: 0}, ...]
  |    Output: [{id, title, startTime: "09:00", endTime: "11:00", orderIndex: 0}, ...]
  | 5. Optimistic setDays(prev => ...)
  | 6. Debounce 800ms -> build payload [{id, orderIndex, startTime, endTime}, ...]
  |
  v
SERVER (itinerary.actions.ts -> trip.service.ts)
  |
  | 7. Auth check (session.user.id)
  | 8. BOLA check (trip.userId === session.user.id)
  | 9. Zod validate each {id, orderIndex, startTime?, endTime?}
  | 10. Prisma $transaction: update all activities
  |
  v
DATABASE (activities table)
  | orderIndex, startTime, endTime updated atomically
```

### API Contracts

#### Modified Action: `reorderActivitiesAction`

The existing action at `src/server/actions/itinerary.actions.ts` currently accepts `{ id: string; orderIndex: number }[]`. It will be extended to also accept optional `startTime` and `endTime` fields.

**Current signature:**
```typescript
reorderActivitiesAction(
  tripId: string,
  activities: { id: string; orderIndex: number }[]
): Promise<ActionResult>
```

**New signature:**
```typescript
reorderActivitiesAction(
  tripId: string,
  activities: {
    id: string;
    orderIndex: number;
    startTime?: string | null;
    endTime?: string | null;
  }[]
): Promise<ActionResult>
```

**Validation schema (new):**
```typescript
const ReorderPayloadSchema = z.array(
  z.object({
    id: z.string().min(1),
    orderIndex: z.number().int().min(0),
    startTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
    endTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  })
).min(1).max(50);
```

**Constraints:**
- Max 50 activities per reorder call (defensive limit; UI caps at ~20 per day)
- startTime/endTime are optional -- if omitted, the server preserves existing values (backward compatible)
- Auth: required (session)
- BOLA: trip must belong to authenticated user
- Rate limiting: not required (debounced at 800ms on client, low frequency)

---

## 4. Data Model

No schema changes required. The existing `Activity` model already stores `startTime` and `endTime` as `VarChar(5)` nullable strings.

```prisma
model Activity {
  id           String   @id @default(cuid())
  dayId        String
  title        String   @db.VarChar(200)
  notes        String?  @db.Text
  startTime    String?  @db.VarChar(5)   // "HH:MM" format
  endTime      String?  @db.VarChar(5)   // "HH:MM" format
  orderIndex   Int      @default(0)
  activityType String?  @db.VarChar(50)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  day          ItineraryDay @relation(fields: [dayId], references: [id], onDelete: Cascade)
  @@index([dayId, orderIndex])
  @@map("activities")
}
```

**No migration needed.** Existing columns are reused. The change is purely in the values written to `startTime` and `endTime` after reorder.

---

## 5. Vendor Dependencies

| Vendor | Service Used | Abstraction Layer | Exit Strategy |
|--------|-------------|-------------------|---------------|
| @dnd-kit | Drag-and-drop UI | Already used; DndContext/useSortable | Replace with native HTML Drag API or react-beautiful-dnd. Algorithm is vendor-independent. |

The time recalculation algorithm has zero vendor dependencies -- it is a pure function operating on plain objects.

---

## 6. Constraints (MANDATORY)

### Architectural Boundaries

- The recalculation function MUST be a pure, side-effect-free utility function. It MUST NOT access React state, the DOM, or any external service.
- The function MUST be isomorphic (usable on both client and server) even though it will initially only be called client-side. This enables future server-side validation if needed.
- The function MUST NOT introduce a new dependency. Standard JavaScript Date/string operations only.
- Cross-day drag (moving an activity from Day 1 to Day 2) is NOT supported by this spec. The existing `handleDragEnd` already rejects cross-day drags. This spec does not change that behavior.

### Performance Budgets

- Recalculation for 20 activities: < 50ms (O(n) algorithm, trivially met)
- No additional network requests beyond the existing debounced reorder call
- Bundle size impact: < 1 kB (single utility function)
- No token budget (no AI involvement)

### Security Requirements

- Auth model: unchanged. Session required for `reorderActivitiesAction`.
- Input validation: Zod schema validates HH:MM format on server. Rejects values like "25:00" or "ab:cd".
- BOLA prevention: existing `verifyTripOwnership` in `TripService.reorderActivities` is preserved.
- No PII involved in time data.

### Scalability

- Max 20 activities per day (practical limit based on itinerary generation)
- Max 30 days per trip (practical limit)
- Algorithm is O(n) per day -- no scalability concern

---

## 7. Implementation Guide

### Time Recalculation Algorithm

#### Pseudocode

```
FUNCTION recalculateActivityTimes(
  activities: Activity[],         // already reordered by new position
  dayStartTime: string = "09:00"  // configurable default start-of-day
) -> Activity[]

  currentTime = parseTime(dayStartTime)   // e.g., 540 (minutes since midnight)

  FOR EACH activity IN activities (ordered by new position):
    duration = computeDuration(activity.startTime, activity.endTime)

    IF duration <= 0 OR activity.startTime IS NULL OR activity.endTime IS NULL:
      // Activity has no valid time range -- assign a default 1-hour slot
      duration = 60

    activity.startTime = formatTime(currentTime)        // "HH:MM"
    activity.endTime   = formatTime(currentTime + duration)  // "HH:MM"
    currentTime        = currentTime + duration          // next activity starts where this one ends

  RETURN activities
END FUNCTION

FUNCTION computeDuration(startTime: string | null, endTime: string | null) -> number (minutes)
  IF startTime IS NULL OR endTime IS NULL:
    RETURN 0

  startMinutes = parseTime(startTime)   // "09:00" -> 540
  endMinutes   = parseTime(endTime)     // "10:30" -> 630

  IF endMinutes <= startMinutes:
    // Edge case: overnight activity (e.g., 23:00 - 01:00) or invalid range
    // Treat as 1 hour default to avoid negative/zero durations
    RETURN 60

  RETURN endMinutes - startMinutes      // e.g., 90 minutes
END FUNCTION

FUNCTION parseTime(timeStr: string) -> number (minutes since midnight)
  [hours, minutes] = timeStr.split(":").map(Number)
  RETURN hours * 60 + minutes
END FUNCTION

FUNCTION formatTime(totalMinutes: number) -> string ("HH:MM")
  // Clamp to 23:59 to prevent times from wrapping past midnight
  clamped = MIN(totalMinutes, 23 * 60 + 59)
  hours   = FLOOR(clamped / 60)
  minutes = clamped % 60
  RETURN padStart(hours, 2, "0") + ":" + padStart(minutes, 2, "0")
END FUNCTION
```

#### Edge Cases

| Edge Case | Behavior |
|-----------|----------|
| Activity with no startTime/endTime (null) | Assigned 60-minute default duration |
| Activity with endTime <= startTime (e.g., "23:00"-"01:00") | Duration forced to 60 minutes |
| Activities that would extend past midnight (23:59) | endTime clamped to "23:59"; subsequent activities also clamped. A warning indicator should be shown in UI (future UX enhancement, not in this spec) |
| Zero-duration activity (startTime === endTime) | Duration forced to 60 minutes |
| Single activity in a day | Recalculated to start at dayStartTime |
| All activities have null times | Each gets 60-minute slots starting at dayStartTime: 09:00-10:00, 10:00-11:00, etc. |
| Day start time configuration | Default "09:00". Can be overridden per-day in the future (not in this spec) |

#### Worked Example

**Before reorder (original order):**
```
Position 0: "Visit Museum"     09:00 - 11:00  (duration: 120 min)
Position 1: "Lunch at Cafe"    11:00 - 12:00  (duration:  60 min)
Position 2: "Walking Tour"     14:00 - 16:30  (duration: 150 min)
```

**User drags "Walking Tour" to Position 0:**
```
After arrayMove: ["Walking Tour", "Visit Museum", "Lunch at Cafe"]
```

**After recalculateActivityTimes (dayStartTime = "09:00"):**
```
Position 0: "Walking Tour"     09:00 - 11:30  (duration: 150 min, preserved)
Position 1: "Visit Museum"     11:30 - 13:30  (duration: 120 min, preserved)
Position 2: "Lunch at Cafe"    13:30 - 14:30  (duration:  60 min, preserved)
```

Note: Durations are preserved. Start times shift sequentially. The gap that existed between "Lunch" and "Walking Tour" (12:00-14:00) is collapsed. This is the intended behavior -- the user chose a new order, and times adjust to be sequential.

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/lib/utils/time-recalculation.ts` | **Create** | Pure utility: `recalculateActivityTimes`, `computeDuration`, `parseTime`, `formatTime`. Isomorphic (no "server-only" or "use client" directive). |
| `src/lib/utils/time-recalculation.test.ts` | **Create** | Unit tests for all edge cases documented above. |
| `src/components/features/itinerary/ItineraryEditor.tsx` | **Modify** | In `handleDragEnd`: after `arrayMove`, call `recalculateActivityTimes` on the reordered activities. Update the debounced payload to include `startTime` and `endTime`. |
| `src/server/actions/itinerary.actions.ts` | **Modify** | Add `ReorderPayloadSchema` with optional `startTime`/`endTime`. Validate input with Zod. Pass new fields to `TripService.reorderActivities`. |
| `src/server/services/trip.service.ts` | **Modify** | In `reorderActivities`: accept optional `startTime`/`endTime` per activity. Include them in the Prisma `$transaction` update (only when provided). |

### Migration Strategy

No database migration required. The existing `startTime` and `endTime` columns on `Activity` are already nullable VarChar(5). The change is purely in application logic.

---

## 8. Testing Strategy

### Unit Tests (src/lib/utils/time-recalculation.test.ts)

| Test Case | Description |
|-----------|-------------|
| Basic reorder (2 activities swapped) | Durations preserved, times shifted |
| Three activities, middle moved to top | All three get correct sequential times |
| Activity with null startTime/endTime | Gets 60-minute default |
| Activity with endTime < startTime | Duration forced to 60 min |
| Activity with startTime === endTime | Duration forced to 60 min |
| Activities extending past midnight | Times clamped to 23:59 |
| Single activity | Starts at dayStartTime |
| Empty array | Returns empty array |
| All null times | Sequential 60-min slots from dayStartTime |
| Custom dayStartTime | Respects provided start time |
| 20 activities (performance) | Completes in < 50ms |

### Integration Tests

| Test Case | Description |
|-----------|-------------|
| `reorderActivitiesAction` with times | Server action accepts and persists startTime/endTime |
| `reorderActivitiesAction` without times | Backward compatible -- omitted times are not overwritten |
| `reorderActivitiesAction` with invalid times | Zod rejects "25:00", "ab:cd", etc. |
| BOLA: reorder on another user's trip | Returns error, no data modified |

### E2E Tests (Playwright, future)

| Test Case | Description |
|-----------|-------------|
| Drag activity B above A | Verify displayed times update correctly |
| Drag activity to last position | Verify all times shift |
| Add activity after reorder | New activity gets correct next time slot |

---

## 9. Open Questions

- [ ] **Q1**: Should we add a small gap (e.g., 15 minutes) between activities to represent transit/buffer time? Currently the algorithm packs activities back-to-back. The product owner should decide. If yes, a `GAP_MINUTES` constant can be added to the algorithm trivially.
- [ ] **Q2**: Should the day start time ("09:00") be configurable per day or per trip? Currently hardcoded. Deferring to a future spec unless the product owner requests it for Sprint 26.
- [ ] **Q3**: When activities extend past midnight (e.g., a 14-hour itinerary starting at 09:00 reaches 23:00+), should we show a visual warning? Currently we just clamp. A UX decision is needed for future enhancement.

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-11 | architect | Initial draft for Sprint 26, addressing BUG-P1-009 |
