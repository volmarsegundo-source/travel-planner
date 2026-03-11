# SPEC-PROD-004: Itinerary Time Auto-Adjustment on Reorder

**Version**: 1.0.0
**Status**: Draft
**Author**: product-owner
**Reviewers**: [tech-lead, ux-designer, architect]
**Created**: 2026-03-11
**Last Updated**: 2026-03-11

---

## 1. Problem Statement

Phase 6 "O Roteiro" (Itinerary) supports drag-and-drop reordering of daily activities. However, when a user reorders activities, the time slots remain unchanged. This creates illogical itineraries: for example, dragging a "9:00 AM - Museum visit" below a "2:00 PM - Lunch" results in the museum visit still showing 9:00 AM even though it is now scheduled after lunch.

This was identified as BUG-P1-009 during Sprint 25 triage and deferred from SPEC-PROD-001 (Out of Scope, line: "Phase 6 drag-and-drop time adjustment"). It is now the primary Phase 6 improvement for Sprint 26.

**Evidence**: Observed during v0.17.0 and v0.18.0 manual testing. When activities are reordered via drag-and-drop, time values are static. The AI generates activities with time slots based on a logical sequence; reordering breaks that sequence without adjusting times.

**Affected users**: All personas who reach Phase 6 (@leisure-solo, @leisure-family, @business-traveler). Every user who customizes their itinerary by reordering activities encounters this inconsistency.

## 2. User Story

As a traveler (any persona),
I want the activity times to automatically adjust when I reorder activities in my daily itinerary,
so that my itinerary always shows a coherent, chronologically correct schedule regardless of how I rearrange the activities.

### Traveler Context

- **Pain point**: Travelers frequently want to customize AI-generated itineraries to match their personal rhythm (e.g., moving a morning beach visit to afternoon). Currently, reordering only changes visual position but times remain static, making the itinerary misleading and requiring mental recalculation.
- **Current workaround**: None. Users cannot edit individual activity times. They reorder activities but must mentally ignore the displayed times, which defeats the purpose of having a structured itinerary.
- **Frequency**: Every trip that reaches Phase 6. Itinerary customization is one of the most common user actions in travel planning apps.

## 3. Acceptance Criteria

### Time Auto-Adjustment

- [ ] AC-001: Given a day has N activities with assigned time slots, when the user reorders any activity via drag-and-drop, then ALL activity time slots for that day MUST be recalculated to maintain chronological order with the same relative durations and gaps.
- [ ] AC-002: The recalculation MUST preserve each activity's duration. If "Museum visit" was 2 hours (9:00-11:00) and is moved to position 3, it must remain 2 hours at its new time slot.
- [ ] AC-003: The recalculation MUST preserve reasonable gaps between activities. The gap between consecutive activities (travel time, rest) MUST be maintained from the original schedule. If the original had a 30-minute gap between activities 2 and 3, that gap is preserved in the new order.
- [ ] AC-004: The first activity of the day MUST retain the original day start time (e.g., if the day originally started at 9:00, the new first activity starts at 9:00 regardless of which activity is now first).

### Visual Feedback

- [ ] AC-005: When activities are reordered, the updated times MUST be displayed immediately (within 500ms of the drop action). No page reload or manual refresh required.
- [ ] AC-006: Activities whose times changed as a result of reordering SHOULD display a brief visual indicator (e.g., subtle highlight or animation) to draw attention to the time change. The indicator should be temporary (auto-dismiss after 2-3 seconds).

### Edge Cases

- [ ] AC-007: Given a day has only 1 activity, drag-and-drop reordering MUST be disabled or have no effect (there is nothing to reorder).
- [ ] AC-008: Given activities are reordered such that the last activity would extend past midnight (e.g., a late activity moved to end of a packed day), the system MUST display a warning indicating the day plan exceeds typical hours but MUST NOT prevent the reorder.
- [ ] AC-009: Given the user reorders activities and then navigates away from Phase 6 and returns, the reordered sequence and adjusted times MUST be persisted and displayed correctly.

### Data Persistence

- [ ] AC-010: The reordered activity sequence and recalculated times MUST be persisted to the data store. The persisted data MUST reflect the user's custom order, not the original AI-generated order.
- [ ] AC-011: If the user regenerates the itinerary (triggers a new AI generation), the custom reordering MUST be discarded and replaced by the new AI-generated sequence. The user MUST be warned before regeneration that custom changes will be lost.

### Multi-Day Scope

- [ ] AC-012: Time auto-adjustment applies ONLY within a single day. Reordering does NOT move activities between days. Each day's schedule is independent.
- [ ] AC-013: If the itinerary has multiple days, reordering activities in Day 2 MUST NOT affect the times in Day 1 or Day 3.

## 4. Scope

### In Scope

- Auto-recalculation of time slots when activities are reordered within a day
- Preservation of activity durations and inter-activity gaps
- Visual feedback on time changes after reorder
- Persistence of reordered schedule
- Edge case handling (single activity, overflow past midnight)
- Warning before AI regeneration overwrites custom order

### Out of Scope

- Manual time editing (typing a specific time for an activity) -- deferred to future sprint
- Moving activities between days (cross-day drag-and-drop)
- Adding or removing activities from the itinerary (existing functionality, unchanged)
- Changing activity durations after reorder
- Integration with external calendar apps
- Time zone handling (all times are in destination local time, already the case)

## 5. Constraints (MANDATORY)

### Security

- Reorder operations MUST validate trip ownership (BOLA prevention). A user MUST NOT be able to reorder activities on another user's trip.
- Time recalculation MUST happen server-side or be validated server-side after client-side preview. The client may show optimistic updates, but the persisted times must be server-validated.

### Accessibility

- WCAG 2.1 AA compliance minimum.
- Drag-and-drop MUST have a keyboard-accessible alternative (e.g., move up/move down buttons or arrow key controls).
- The keyboard alternative MUST trigger the same time auto-adjustment as drag-and-drop.
- Screen readers MUST announce the new time after an activity is moved (e.g., "Museum visit moved to 2:00 PM - 4:00 PM").
- The visual highlight for changed times MUST NOT rely on color alone (use motion, border, or icon in addition to color).

### Performance

- Time recalculation for a single day (up to 10 activities) MUST complete in under 100ms (client-side calculation).
- The visual update after drop MUST appear within 500ms.
- Data persistence of the reordered schedule MUST complete within 2 seconds.

### Architectural Boundaries

- This spec does NOT define the drag-and-drop interaction mechanism (touch, mouse, keyboard). That belongs to SPEC-UX.
- This spec does NOT define the time recalculation algorithm. That belongs to SPEC-ARCH.
- This spec does NOT change the AI itinerary generation prompt or model. The auto-adjustment is a client/server-side post-processing step, not an AI feature.
- Maximum activities per day is defined by the existing itinerary model (currently up to 10 per day).

## 6. Success Metrics

- **Time coherence**: 100% of reordered itineraries display chronologically correct times after reorder. Measured by QA conformance audit.
- **Reorder completion rate**: >= 95% of drag-and-drop reorder attempts result in successful time adjustment (no errors, no stuck states). Measured by error tracking.
- **User satisfaction**: Reduction in "illogical itinerary" feedback by 100% (this is currently a known complaint). Measured by user feedback post-beta.
- **Persistence accuracy**: 100% of reordered schedules persist correctly across page refreshes and navigation. Measured by automated tests.

## 7. Dependencies

- SPEC-PROD-001 (Expedition Navigation): Phase 6 navigation must work correctly (AC-017 "Complete Expedition" is related but independent).
- Existing drag-and-drop reorder functionality in Phase 6 must be operational (it is -- the issue is only that times do not adjust).
- Itinerary data model must support storing both the original AI-generated order and the user-customized order. If the current model does not support this, a SPEC-ARCH is needed.

## 8. Vendor Independence

- This spec describes WHAT the feature does, not HOW it is implemented.
- Must NOT reference specific libraries, frameworks, or vendor products.
- Implementation details belong in the corresponding SPEC-ARCH document.

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-11 | product-owner | Initial draft for Sprint 26. Deferred from SPEC-PROD-001 (BUG-P1-009) |
| 1.0.1 | 2026-03-11 | tech-lead | Noted: remains Draft for Sprint 27. No stakeholder decisions directly affect this spec. |
