-- ─── SPRINT 44: Reverse Phase Reorder ───────────────────────────────────────
-- INVERSE of migrate-phase-reorder.sql.
-- Restores original order: 1→1, 2→2, 3→3, 4→4, 5→5, 6→6
-- after a forward migration: 1→1, 2→2, 3→6, 4→5, 5→3, 6→4.
--
-- WARNING: This reversal script exists for EMERGENCY use ONLY.
-- The preferred rollback strategy is restoring the pre-migration DB snapshot
-- (see SPEC-ARCH-REORDER-PHASES §5.6 and docs/runbooks/phase-reorder-rollback.md).
-- Use this script only if a DB snapshot is unavailable.
--
-- PRECONDITIONS:
--   1. Feature flag PHASE_REORDER_ENABLED is OFF in all app instances.
--   2. App in maintenance/read-only mode.
--   3. Review current DB state before running.
--
-- IDEMPOTENCY: NOT idempotent. Running twice double-swaps again.
--
-- Current (post-forward-migration) → Original mapping:
--   3 (Guide)      → 5
--   4 (Itinerary)  → 6
--   5 (Logistics)  → 4
--   6 (Checklist)  → 3
--
-- Spec ref: SPEC-ARCH-REORDER-PHASES §5.6

BEGIN;

-- ── Guard: ensure forward migration was applied ────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM _phase_reorder_migration LIMIT 1) THEN
    RAISE EXCEPTION
      'Cannot reverse: _phase_reorder_migration is empty. Forward migration may not have been applied.';
  END IF;
END;
$$;

-- ── Step 1: Reverse expedition_phases.phaseNumber via negative pivot ───────────
-- Post-forward state: 3=Guide, 4=Itinerary, 5=Logistics, 6=Checklist
-- Target (original): 3=Checklist, 4=Logistics, 5=Guide, 6=Itinerary

-- Move current 3 (Guide) and 4 (Itinerary) to negative to free the slots.
UPDATE expedition_phases
SET "phaseNumber" = -"phaseNumber"
WHERE "phaseNumber" IN (3, 4);

-- Write: current 5 (Logistics) → original 4; current 6 (Checklist) → original 3.
UPDATE expedition_phases
SET "phaseNumber" = CASE "phaseNumber"
  WHEN 5 THEN 4   -- Logistics → original Phase 4
  WHEN 6 THEN 3   -- Checklist → original Phase 3
  ELSE "phaseNumber"
END
WHERE "phaseNumber" IN (5, 6);

-- Resolve negatives: -3 (Guide) → original 5; -4 (Itinerary) → original 6.
UPDATE expedition_phases
SET "phaseNumber" = CASE "phaseNumber"
  WHEN -3 THEN 5  -- Guide      → original Phase 5
  WHEN -4 THEN 6  -- Itinerary  → original Phase 6
  ELSE "phaseNumber"
END
WHERE "phaseNumber" IN (-3, -4);

-- ── Step 2: Reverse phase_checklist_items.phaseNumber ─────────────────────────
-- Post-forward: checklist items are at phaseNumber=6; restore to 3.
UPDATE phase_checklist_items
SET "phaseNumber" = 3
WHERE "phaseNumber" = 6;

-- ── Step 3: Reverse trips.currentPhase via negative pivot ─────────────────────
UPDATE trips
SET "currentPhase" = -"currentPhase"
WHERE "currentPhase" IN (3, 4);

UPDATE trips
SET "currentPhase" = CASE "currentPhase"
  WHEN 5 THEN 4
  WHEN 6 THEN 3
  ELSE "currentPhase"
END
WHERE "currentPhase" IN (5, 6);

UPDATE trips
SET "currentPhase" = CASE "currentPhase"
  WHEN -3 THEN 5
  WHEN -4 THEN 6
  ELSE "currentPhase"
END
WHERE "currentPhase" IN (-3, -4);

-- ── Step 4: Remove migration record so forward migration can run again ─────────
TRUNCATE _phase_reorder_migration;

COMMIT;
