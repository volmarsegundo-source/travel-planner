---
name: Sprint 33 Plan
description: Sprint 33 planning state -- data integrity, UX foundation, summary redesign, prompt enrichment, social login
type: project
---

Sprint 33 planned on 2026-03-20. Theme: "Data Integrity + UX Foundation + Social Login".

**Why:** v0.27.1 testing revealed stale DB data (currentPhase=7) from before FIX-02. Code fixes are all effective but existing expedition records need migration. Additionally, stakeholder requested UX improvements (IMP-001 through IMP-006).

**How to apply:** Track A (data integrity) MUST complete before any testing. Tracks B-E can proceed in parallel after Track A.

Key findings:
- TASK-S33-001 (migration script) and TASK-S33-002 (defensive guard clamp) already implemented during planning
- Google OAuth provider already configured in auth.config.ts and auth.ts -- social login is mostly UI work
- Phase 4 mandatory validation must NOT block non-blocking skip (advanceFromPhase)
- Token budget analysis needed before shipping enriched Phase 6 prompt

5 tracks, 15 tasks, ~32h total (16h per dev). Target: v0.28.0.
