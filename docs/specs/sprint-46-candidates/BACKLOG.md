# Sprint 46 — Consolidated Backlog (Candidate)

**Status:** Draft — input to Sprint 46 planning (not Sprint 46 kickoff).
**Source:** Sprint 45 closure artifacts (`docs/sprint-reviews/sprint-45-review.md` §7).
**Author:** product-owner + tech-lead (orchestration).
**Date:** 2026-04-24.

---

## Prioritization rubric

- **P0** — blocks Beta launch or Prod promotion. None identified yet for Sprint 46.
- **P1** — closes Sprint 45 debt class that had a production incident impact.
- **P2** — structural improvement; no active incident but known debt.
- **P3** — cosmetic / ergonomic.

---

## P1 — Sprint 46 must-have

### B46-01 — `SPEC-SEC-AUDIT-001`: Security-spec "theater" audit

- **SPEC**: `docs/specs/sprint-46-candidates/SPEC-SEC-AUDIT-001.md`
- **Effort**: 6-10h
- **Trigger**: CSP nonce bug latent since Sprint 2; "security specs were treated as done because the header existed, not because the protection actually worked end-to-end."
- **Deliverable**: audit report walking every approved `SPEC-SEC-*` end-to-end + any SEC finding added to backlog.
- **Dependencies**: none.
- **Owner (proposed)**: architect → re-assigned to security-specialist.

### B46-02 — `SPEC-TEST-MOCK-ASSERTION-001`: Mock-behaviour assertions

- **SPEC**: `docs/specs/sprint-46-candidates/SPEC-TEST-MOCK-ASSERTION-001.md`
- **Effort**: 4-8h
- **Trigger**: Iter 7 tests passed 24/24 green while adapter-contract bug was latent since db73225. Structural gap: mocks asserted "was called" without checking that the call satisfied the downstream contract.
- **Deliverable**: review rule + lint/static-analysis checks flagging "mock-only" assertions.
- **Dependencies**: none (but B46-03 uses its output to audit existing tests).
- **Owner (proposed)**: architect → re-assigned to qa-engineer.

### B46-03 — `SPEC-PROCESS-RETROSPECTIVE-BUG-C`: process + adapter coverage

- **SPEC**: `docs/specs/sprint-46-candidates/SPEC-PROCESS-RETROSPECTIVE-BUG-C.md`
- **Effort**: TBD (multi-part: §2 retro, §3.1 adapter tests, §3.2 MSW OAuth stub, §3.3 retroactive audit). Estimate: 12-20h spread across two devs.
- **Trigger**: iter 1-5 shortcut debt + latent adapter-contract bug.
- **Deliverables**:
  - BUG-C retrospective doc at `docs/sprint-reviews/BUG-C-RETROSPECTIVE-2026-04-24.md`.
  - Crisis-governance minimum section added to `docs/specs/SDD-PROCESS.md`.
  - Adapter-integration tests for remaining Auth.js callbacks.
  - MSW OAuth harness + 5 target E2E scenarios (documented in SPEC §3.2).
  - Retroactive audit of pre-db73225 SPECs for similar gaps.
- **Dependencies**: B46-02 (review rule clarifies what "adapter-integration test" means in this codebase).
- **Owner (proposed)**: tech-lead (driver) + qa-engineer (adapter tests) + architect (retroactive audit).

### B46-04 — Rate-limit global fail-closed policy decision (ADR)

- **SPEC**: ADR to be authored (new).
- **Effort**: 2-4h (decision + doc; implementation is already gated by existing env flag `RATE_LIMIT_FAIL_CLOSED_ENABLED`).
- **Trigger**: Sprint 45 Wave 1 applied fail-closed only to register/pwd-reset; Wave 2B added destinations. Global policy undecided. Staging currently fail-open.
- **Deliverable**: ADR `docs/architecture/ADR-XXX-rate-limit-fail-closed-global.md` + Sentry alert precondition (>50 events/min) + env flip plan.
- **Dependencies**: B46-06 (Sentry forwarder enables the alert precondition).
- **Owner (proposed)**: security-specialist + devops-engineer.

### B46-05 — CI workflow fix: `project-bootstrap.test.ts:69`

- **SPEC**: none (fix-only).
- **Effort**: 30 min.
- **Trigger**: test asserts `.env.local` exists on the runner (gitignored). Fails identically across every Sprint 45 commit. Blocks CI signal clarity.
- **Deliverable**: test gates on presence of `.env.local` OR runs only locally (skip on CI).
- **Dependencies**: none.
- **Owner (proposed)**: devops-engineer.

### B46-06 — `SPEC-OBSERVABILITY-SENTRY-001`: Forward Server Action errors to Sentry

- **SPEC**: `docs/specs/sprint-46-candidates/SPEC-OBSERVABILITY-SENTRY-001.md`
- **Effort**: 3-5h
- **Trigger**: BUG-B and BUG-C were diagnosed "only after PO copied Vercel logs into the conversation." `logger.error` is stdout-only.
- **Deliverable**: `@sentry/nextjs` forwarder wiring + dashboard config.
- **Dependencies**: none (but unblocks B46-04 alert precondition).
- **Owner (proposed)**: devops-engineer.

### B46-07 — EDD Eval Gates: exit-code bug

- **SPEC**: none (fix-only).
- **Effort**: 1-2h.
- **Trigger**: `npm run eval:gate` exits 1 after writing `eval-report.json` even on pass. Pre-existing infra issue.
- **Deliverable**: script exit code reflects actual pass/fail.
- **Dependencies**: none.
- **Owner (proposed)**: qa-engineer + devops-engineer.

### B46-08 — Redis Staging provider decision

- **SPEC**: none (decision + ops).
- **Effort**: 2-4h (provision + env config + smoke).
- **Trigger**: Redis Staging offline for the entire Sprint 45 window. Rate-limit flowed fail-open; cache misses on session-dependent flows.
- **Options**: Upstash paid / Vercel KV / self-hosted.
- **Deliverable**: provider chosen, Staging Redis online, smoke test green.
- **Dependencies**: none.
- **Owner (proposed)**: devops-engineer + finops-engineer (cost delta).

---

## P2 — Sprint 46 should-have

### B46-09 — SMTP / Resend config for Beta password reset

- **SPEC**: referenced in `6560858` (Resend recommendation).
- **Effort**: 2-4h (provision + env + smoke).
- **Trigger**: Forgot-password flow shipped in Sprint 45 (`d717ce9`); email dispatch still via console fallback on Staging.
- **Dependencies**: none.
- **Owner (proposed)**: devops-engineer.

### B46-10 — `sanitizeCallbackUrl` consistency

- **SPEC**: TBD (small fix-only).
- **Effort**: 30 min + tests.
- **Trigger**: Iter 8 security audit §9 — helper doesn't reject `..` or mid-path `\`; layout is stricter. Layout is outer boundary so non-blocking, but inconsistency is a tripwire.
- **Deliverable**: extend `src/lib/validation/safe-redirect.ts` helper; update `src/lib/validation/__tests__/safe-redirect.test.ts`.
- **Dependencies**: none.
- **Owner (proposed)**: dev-fullstack-1 or -2.

### B46-11 — F-01: `/expedition` vs `/expeditions` in `PROTECTED_PATH_SEGMENTS`

- **SPEC**: none (fix-only).
- **Effort**: 15 min.
- **Trigger**: Iter 7 security audit §7 F-01 (LOW).
- **Deliverable**: middleware segment list updated.
- **Dependencies**: none.
- **Owner (proposed)**: dev-fullstack-1 or -2.

### B46-12 — F-02: `canUseAI(null)` permissive default

- **SPEC**: TBD (P2 tracked in iter 7 security audit §7).
- **Effort**: 2-3h including test scenarios.
- **Trigger**: Iter 7 security audit F-02 (MEDIUM). Legacy permissive default bypasses the age gate for a user without a `UserProfile` row via direct API call. Layout makes it unreachable via UI, but theoretical bypass remains.
- **Deliverable**: `canUseAI(null)` returns `false`; callers that rely on permissive default identified and updated.
- **Dependencies**: none.
- **Owner (proposed)**: security-specialist + dev-fullstack.

### B46-13 — Playwright E2E: age-gate + OAuth flow

- **SPEC**: covered by `SPEC-PROCESS-RETROSPECTIVE-BUG-C` §3.2.
- **Effort**: 6-10h (mostly MSW harness; scenarios themselves are thin once stub is up).
- **Deliverable**: 5 target E2E scenarios documented in SPEC §3.2.
- **Dependencies**: **B46-03** (this is part of that SPEC's scope; splitting for visibility).
- **Owner (proposed)**: qa-engineer.

### B46-14 — `SPEC-TESTS-BRANCHES-80-001`: restore 80% branches coverage

- **SPEC**: TBD (new).
- **Effort**: 2-4h (close the 1.01 pp gap from Wave 2.8b).
- **Trigger**: `f913769` temporarily lowered threshold to 78% to unblock CI.
- **Deliverable**: coverage ≥ 80% branches; threshold restored.
- **Dependencies**: none (but B46-15 may help).
- **Owner (proposed)**: qa-engineer.

### B46-15 — `SPEC-TESTS-COVERAGE-FLAKY-001`: fix 2 slow coverage-mode tests

- **SPEC**: referenced in `docs/specs/sprint-45/FLAKY-TESTS-COVERAGE-MODE-2026-04-20.md`.
- **Effort**: 3-5h.
- **Trigger**: 2 slow tests flake in coverage mode (confirmed during Wave 2.8b).
- **Dependencies**: none.
- **Owner (proposed)**: qa-engineer.

### B46-16 — 4 S44 injection-resistance failures (IR-024 Cyrillic homoglyph)

- **SPEC**: TBD — SPEC location unknown, referenced in user context but I could not locate a source doc.
- **Effort**: TBD.
- **Trigger**: flagged during Sprint 44 injection-resistance eval runs.
- **Dependencies**: likely blocked on locating the source doc first.
- **Owner (proposed)**: security-specialist.

---

## P3 — Nice-to-have

### B46-17 — Layout query coalescing

- **SPEC**: TBD (micro-optimization).
- **Effort**: 1-2h.
- **Trigger**: Iter 7 plan §5 R1 — `(app)/layout.tsx` does 3+ sequential `db` calls (`auth`, `subscription`, `userProfile`, `progress`). Could coalesce via `include`.
- **Dependencies**: none.
- **Owner (proposed)**: dev-fullstack.

### B46-18 — Clean up "diagnostic debt" (lingering observability comments)

- **SPEC**: none (hygiene).
- **Effort**: 30 min.
- **Trigger**: iter 8 commit comment in middleware still references "Iter 8 removes them" for diagnostic logs — confirm nothing lingering.
- **Dependencies**: none.
- **Owner (proposed)**: dev-fullstack.

---

## Pre-Beta blockers (source-doc location unknown)

These items were named in the Sprint 45 Review request but I could not locate the source tracking doc during grounding. Before they can be backlogged formally, need to **find or create** the source doc:

- Profit scoring rules — status unknown.
- Gemini primary no-timeout — status unknown.
- Dynamic ranking — status unknown.
- 6 AI Governance items (Prompt Registry, Policy Engine, Cost Dashboard, FinOps Alerts, Observability, Output Validation) — status unknown.

**Recommended Sprint 46 kickoff action**: product-owner locates or creates the consolidated pre-Beta tracker doc. Items above then split into P0/P1 per Beta-blocker severity.

---

## Sequencing proposal

Week 1 of Sprint 46:
1. **B46-05 + B46-07** in parallel (trivial CI unblockers) — 2h total.
2. **B46-06 (Sentry forwarder)** — 3-5h. Unblocks B46-04.
3. **B46-08 (Redis provider)** — 2-4h. Unblocks test flows.
4. **B46-02 (mock-assertion rule)** — 4-8h. Unblocks B46-03.

Week 2:
5. **B46-01 (SEC audit)** — 6-10h.
6. **B46-03 (process retro + adapter tests + MSW OAuth)** — 12-20h spread.
7. **B46-04 (fail-closed ADR)** — 2-4h. Requires B46-06.
8. **B46-13 (age-gate E2E)** — emerges from B46-03.

P2 / P3 items slot in as capacity allows.

---

## Conflict check (grounded)

- No contradictions found between candidate SPECs and shipped Sprint 45 artifacts.
- `SPEC-AUTH-AGE-002` v2.0.2 (shipped) does not conflict with any Sprint 46 candidate.
- Sprint 46 candidates are additive, not reverting.

---

## Input to Sprint 46 planning

This backlog is input — not a commitment. Effort estimates are author-provided, not independently validated. Sprint 46 planning will:
- Sequence items by dependency.
- Commit to subset based on capacity.
- Create missing source docs (pre-Beta blockers §7.5 of review).
