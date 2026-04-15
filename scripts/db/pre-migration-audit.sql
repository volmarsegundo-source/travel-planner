-- ─── Pre-Migration Audit — Phase Reorder Sprint 44 ──────────────────────────
-- Read-only diagnostic. Run INSIDE a transaction that you ROLLBACK.
-- Surfaces trips whose completion state would be logically incoherent after
-- the phase remap: old 3→6, old 4→5, old 5→3, old 6→4.
--
-- Incoherent = old Phase 3 (Checklist) is completed but old Phase 5 (Guide)
-- is NOT completed, because after the remap the trip would have a completed
-- Phase 6 (Checklist) without a completed Phase 3 (Guide).
--
-- Review output with PO and QA before running migrate-phase-reorder.sql.
-- Spec ref: SPEC-ARCH-REORDER-PHASES §5.3
-- Usage:
--   BEGIN;
--   \i scripts/db/pre-migration-audit.sql
--   ROLLBACK;

SELECT
  t.id                AS trip_id,
  t."userId"          AS user_id,
  t."currentPhase"    AS current_phase,
  t."destination"     AS destination,
  bool_or(ep."phaseNumber" = 3 AND ep.status = 'completed') AS old_checklist_done,
  bool_or(ep."phaseNumber" = 4 AND ep.status = 'completed') AS old_logistics_done,
  bool_or(ep."phaseNumber" = 5 AND ep.status = 'completed') AS old_guide_done,
  bool_or(ep."phaseNumber" = 6 AND ep.status = 'completed') AS old_itinerary_done,
  -- Post-remap: these phase states will be semantically swapped
  -- A completed old-3 becomes completed new-6 (Checklist last)
  -- If old-5 (Guide, new-3) was NOT done, trip will have completed Checklist
  -- without completed Guide — logically incoherent.
  'INCOHERENT: old Checklist done without old Guide done' AS reason
FROM trips t
JOIN expedition_phases ep ON ep."tripId" = t.id
WHERE t."deletedAt" IS NULL
GROUP BY t.id, t."userId", t."currentPhase", t."destination"
HAVING
  bool_or(ep."phaseNumber" = 3 AND ep.status = 'completed')
  AND NOT (
    bool_or(ep."phaseNumber" = 5 AND ep.status = 'completed')
    AND bool_or(ep."phaseNumber" = 6 AND ep.status = 'completed')
  )

UNION ALL

SELECT
  t.id                AS trip_id,
  t."userId"          AS user_id,
  t."currentPhase"    AS current_phase,
  t."destination"     AS destination,
  bool_or(ep."phaseNumber" = 3 AND ep.status = 'completed') AS old_checklist_done,
  bool_or(ep."phaseNumber" = 4 AND ep.status = 'completed') AS old_logistics_done,
  bool_or(ep."phaseNumber" = 5 AND ep.status = 'completed') AS old_guide_done,
  bool_or(ep."phaseNumber" = 6 AND ep.status = 'completed') AS old_itinerary_done,
  'WARNING: old Logistics done without old Itinerary done' AS reason
FROM trips t
JOIN expedition_phases ep ON ep."tripId" = t.id
WHERE t."deletedAt" IS NULL
GROUP BY t.id, t."userId", t."currentPhase", t."destination"
HAVING
  bool_or(ep."phaseNumber" = 4 AND ep.status = 'completed')
  AND NOT bool_or(ep."phaseNumber" = 6 AND ep.status = 'completed')

ORDER BY trip_id, reason;

-- Summary counts
SELECT
  COUNT(*) FILTER (
    WHERE bool_or(ep."phaseNumber" = 3 AND ep.status = 'completed')
      AND NOT bool_or(ep."phaseNumber" = 5 AND ep.status = 'completed')
  ) AS incoherent_trips,
  COUNT(DISTINCT t.id)  AS total_active_trips
FROM trips t
JOIN expedition_phases ep ON ep."tripId" = t.id
WHERE t."deletedAt" IS NULL
GROUP BY ()
;
