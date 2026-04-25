# Sprint 46 — Definition of Done scenarios
# Source: docs/sprint-planning/sprint-46-planning.md §10
# Author: qa-engineer
# Created: 2026-04-24
#
# Scenarios cover: 3 core SPECs + V2 Waves 1-2 + pre-Beta ADR + Sprint Zero
# items + cross-cutting governance. Applicability per scenario (A/B/C/D)
# noted inline per block.

Feature: Sprint 46 Central Governança IA + V2 Foundation

  Background:
    Given Sprint 46 scope follows one of scenarios A/B/C/D (PO decides)
    And the chosen scenario determines which scenarios below are in scope

  # ─────────────────────────────────────────────────────────────────────
  # Applicable to ALL scenarios (A / B / C / D)
  # ─────────────────────────────────────────────────────────────────────

  Scenario: Sprint 46 closes with SPEC-SEC-AUDIT-001 complete
    Given Sprint 46 scope includes SPEC-SEC-AUDIT-001
    When Sprint 46 closing review happens
    Then all security audit findings are documented
    And at least 1 anti-pattern is removed from the codebase
    And the SPEC file shows v1.0.0 → v1.1.0 change history

  Scenario: Sprint 46 closes with SPEC-TEST-MOCK-ASSERTION-001 complete
    Given Sprint 46 scope includes SPEC-TEST-MOCK-ASSERTION-001
    When Sprint 46 closing review happens
    Then all critical mock assertions added or documented as deferred
    And drift prevention pattern applied to at least 3 test files

  Scenario: Sprint 46 closes with SPEC-OBSERVABILITY-SENTRY-001 complete
    Given Sprint 46 scope includes SPEC-OBSERVABILITY-SENTRY-001
    When Sprint 46 closing review happens
    Then Server Action errors forward to Sentry
    And middleware errors forward to Sentry
    And FinOps confirms cost projection within estimate

  # ─────────────────────────────────────────────────────────────────────
  # V2-specific (scenarios B / C / D — NOT A)
  # ─────────────────────────────────────────────────────────────────────

  Scenario: V2 Wave 1 (foundation) completes with acceptance criteria met
    Given Sprint 46 scope includes V2 Wave 1
    When V2 Wave 1 deliverables are reviewed
    Then all acceptance criteria in SPEC-ARCH-AI-GOVERNANCE-V2 Wave 1 are checked
    And Trust Score for Wave 1 items ≥ 0.90
    And no regression in pre-existing tests
    And feature flag AI_GOVERNANCE_V2 toggles the admin/ia tab correctly

  Scenario: V2 Wave 2 completes with acceptance criteria met
    Given Sprint 46 scope includes V2 Wave 2
    When V2 Wave 2 deliverables are reviewed
    Then all acceptance criteria in SPEC-ARCH-AI-GOVERNANCE-V2 Wave 2 are checked
    And integration with Wave 1 validated end-to-end
    And Trust Score for Wave 2 items ≥ 0.90
    And Draft → Gate ≥ 0.80 → Active promotion path is the only path to production prompts

  # ─────────────────────────────────────────────────────────────────────
  # Pre-Beta specific (scenario C, or D-sprint-46 depending on final scope)
  # ─────────────────────────────────────────────────────────────────────

  Scenario: Gemini timeout ADR documented and implemented
    Given Gemini timeout configuration decision is in scope
    When the ADR is reviewed
    Then trade-offs are documented for both options from RISK-ASSESSMENT-EDGE-RUNTIME.md
    And implementation matches the ADR decision
    And test coverage proves timeout behaviour end-to-end
    And Phase 5 and Phase 6 generations complete under the Vercel Hobby 60s limit in staging smoke

  # ─────────────────────────────────────────────────────────────────────
  # Sprint Zero prerequisites (if pre-Beta items enter scope)
  # ─────────────────────────────────────────────────────────────────────

  Scenario: Profit scoring rules scope defined before implementation
    Given Profit scoring rules remains unlocated across docs/
    When Sprint 46 or Sprint Zero runs the scope-definition task
    Then a new SPEC-PROFIT-SCORING-001 exists with 9 dimensions filled
    And PO signs off on scope before implementation starts

  Scenario: Dynamic ranking scope defined before implementation
    Given Dynamic ranking full infra remains unlocated across docs/
    When Sprint 46 or Sprint Zero runs the scope-definition task
    Then a new SPEC-DYNAMIC-RANKING-001 exists with 9 dimensions filled
    And infra architecture reviewed by tech-lead + architect

  # ─────────────────────────────────────────────────────────────────────
  # Cross-cutting governance (ALL scenarios)
  # ─────────────────────────────────────────────────────────────────────

  Scenario: Sprint 46 closes without governance shortcuts
    Given Sprint 46 has N committed items
    When Sprint 46 closing review happens
    Then every committed item has a corresponding SPEC reference
    And every code change has a matching BDD scenario OR a documented exception
    And every code change has test coverage OR a documented exception
    And Trust Score composite ≥ 0.93 (no regression from Sprint 45 closing)

  Scenario: Sprint 46 retrospective captures all debt items with 5-agent independent format
    Given Sprint 45 retrospective flagged single-author bias (memo L-02)
    And Sprint 46 execution plan §9 mandates a 5-agent independent-input format
    When Sprint 46 retrospective runs
    Then 5 input files exist at docs/sprint-reviews/sprint-46-retro-inputs/ for: product-owner, tech-lead, qa-engineer, security-specialist, architect
    And each input was committed BEFORE any cross-reading among agents
    And Start/Stop/Continue items include specific code/commit/SPEC references
    And divergences between agents are explicitly noted in the synthesis doc (not hidden)
    And no debt discovered during the sprint is left undocumented
    And the synthesis is PO-signed on Day 15 after a review loop where all 5 agents can add/contest/confirm

  # ─────────────────────────────────────────────────────────────────────
  # Infra gates (scenarios B / C / D depending on scope)
  # ─────────────────────────────────────────────────────────────────────

  Scenario: Redis Staging provider decision shipped before production AI traffic
    Given B46-08 is in Sprint 46 scope
    When the decision is reviewed
    Then the provider (Upstash / Vercel KV / self-hosted) is chosen with written rationale
    And Staging Redis passes a smoke test (connect + set/get round-trip)
    And cost delta documented in FinOps record

  Scenario: CI infrastructure fails loudly, not silently
    Given B46-05 and B46-07 are in Sprint 46 scope
    When CI runs on Sprint 46 commits
    Then project-bootstrap.test.ts does not fail on missing .env.local on CI runners
    And EDD Eval Gates exits 0 on pass, 1 only on real failure
    And any remaining silent failure is documented explicitly as "accepted debt"

  # ─────────────────────────────────────────────────────────────────────
  # Added at Sprint 46 Kickoff (2026-04-24) — Wave-specific acceptance
  # Covers DoD for B-W1-*, B-W2-*, C-01, C-02 per execution plan §9
  # ─────────────────────────────────────────────────────────────────────

  Scenario: V2 Wave 1 end-to-end acceptance
    Given AI_GOVERNANCE_V2 feature flag is defined in env.ts
    And migration 20260417000001_ai_governance_v2 has been applied in staging
    When the flag is toggled OFF
    Then the /admin/ia route returns 404 and the IA tab is not visible
    When the flag is toggled ON for a user with role admin-ai
    Then the /admin/ia route loads the 4-tab shell (Dashboard, Prompts, Modelos, Outputs)
    And GET /api/health/ai-config returns status "healthy"
    When the migration is reverted in staging
    Then the 5 new tables (PromptVersion, PromptEvalResult, ModelAssignment, AiRuntimeConfig, AuditLog) are dropped cleanly
    And the revert does not break any pre-Sprint-46 functionality

  Scenario: V2 Wave 1 RBAC guards admin-ai routes
    Given a user does NOT have the admin-ai role
    When the user sends GET /api/admin/ai/prompts
    Then the server returns 403 Forbidden
    And no prompt data is leaked in the response body
    When the user attempts to navigate to /admin/ia in the browser
    Then they receive a 403 page

  Scenario: V2 Wave 2 prompt editor validations block critical inputs
    Given AI_GOVERNANCE_V2 flag is ON and admin-ai-approver is logged in
    When the admin submits a prompt draft containing "{userEmail}" as a placeholder
    Then validation V-02 blocks the save with message "Placeholder proibido"
    When the admin submits a prompt draft containing a literal email "ada@example.com"
    Then validation V-06 blocks the save with message "PII detectada"
    When the admin submits a prompt draft containing an Anthropic API key "sk-ant-..."
    Then validation V-05 blocks the save
    When the admin submits a valid draft
    Then a new PromptVersion row is created
    And its version number is a semver patch bump of the previous active version
    And an AuditLog row records the create with actor userId + timestamp

  Scenario: V2 Wave 2 immutable versioning
    Given a PromptTemplate has 3 historical PromptVersion rows
    When the admin edits and saves a new draft
    Then a 4th PromptVersion row is created
    And the previous 3 versions remain readable byte-for-byte
    And no UPDATE is issued against the historical rows

  Scenario: V2 Wave 2 diff viewer renders side-by-side
    Given a PromptTemplate has 2 PromptVersion rows (v1.0.0 and v1.0.1)
    When the admin opens the diff viewer for those versions
    Then the UI renders both versions side-by-side
    And character-level additions and deletions are visually highlighted
    And token-count estimate is shown for each version (heuristic ceil(chars/3.5))

  Scenario: CI bootstrap test passes without .env.local on a clean runner
    Given a GitHub Actions runner without any .env.local file
    When CI runs tests/unit/scripts/project-bootstrap.test.ts
    Then the test passes
    And the assertion comment documents the CI-vs-local-dev distinction

  Scenario: EDD Eval Gates exits with correct code
    Given npm run eval produces a passing eval-report.json
    When npm run eval:gate is invoked
    Then the process exits with code 0
    And eval-report.json remains on disk for downstream inspection
    Given npm run eval produces a failing eval-report.json (score < threshold)
    When npm run eval:gate is invoked
    Then the process exits with code 1
    And the failure reason is logged to stderr

  # ─────────────────────────────────────────────────────────────────────
  # Added at Sprint 46 Kickoff Close (2026-04-24) — 3 PO decisions
  # Covers: C-04 early-gate semantics, Approach 1 Profit/Ranking gate
  # ─────────────────────────────────────────────────────────────────────

  Scenario: C-04 Gemini ADR acts as hard gate on Day 3 before Wave 2 API work starts
    Given Sprint 46 Week 1 is in progress
    And C-04 Gemini ADR is drafted by tech-lead + architect on Days 1-2
    When Day 3 ends
    Then the ADR is published at docs/architecture/ADR-XXX-gemini-timeout.md
    And PO has signed off on the chosen direction (Edge migration OR Claude fallback)
    And architect confirmed schema-compat implications for PromptVersion + AiConfigResolver inline in the ADR
    When dev-fullstack-1 starts B-W2-001 on Day 6
    Then any schema changes the ADR required are already reflected in the Prisma migration from Wave 1
    And no mid-sprint Wave 2 rework is needed due to C-04

  Scenario: Approach 1 Sprint Zero parallel gate to Sprint 47
    Given PO chose Approach 1 for Profit Scoring and Dynamic Ranking
    And Sprint 46 Week 3 Day 14 has arrived
    When the Sprint Zero parallel SPECs are reviewed
    Then SPEC-PROFIT-SCORING-001 is in Approved status at docs/specs/sprint-46-parallel/
    And SPEC-DYNAMIC-RANKING-001 is in Approved status at docs/specs/sprint-46-parallel/
    And both SPECs have all 9 dimensions filled
    And tech-lead and architect signed off inline
    # Fallback paths if not met:
    #   Fallback A: Sprint 47 absorbs remaining work in "Sprint Zero Mini" Days 1-3
    #   Fallback B: SPECs deferred post-Beta entirely (original Approach 3)
    #   Both are pre-approved by PO — no new decision required

  Scenario: Approach 1 load signal on Week 2 check — fallback triggers without guilt
    Given PO chose Approach 1 at Sprint 46 kickoff
    When Sprint 46 Week 2 Day 10 check happens
    And PO reports actual SPEC writing time exceeded 1 day (was planned 0.5 day/week)
    Then the team recognises this as signal to escalate
    And PO may invoke Fallback A (Sprint 47 Sprint Zero Mini) OR Fallback B (post-Beta deferral)
    And neither fallback requires a new PO decision round
    And the synthesis in sprint-46-retrospective.md records the invocation + rationale

  # ─────────────────────────────────────────────────────────────────────
  # Added at Sprint 46 Day 1 (2026-04-24) — C-04 ADR-0036 acceptance
  # ─────────────────────────────────────────────────────────────────────

  Scenario: ADR-0036 Gemini timeout env override resolves with default
    Given ADR-0036 is in "Accepted" state
    And GEMINI_TIMEOUT_MS env var is NOT set
    When the Gemini provider module loads
    Then the resolved timeout value is 30000 (default per ADR-028 + ADR-0036)
    And no warn log is emitted

  Scenario: ADR-0036 env override within bounds is honored
    Given ADR-0036 is "Accepted"
    And GEMINI_TIMEOUT_MS is set to "25000" in the environment
    When the Gemini provider module loads
    Then the resolved timeout value is 25000
    And no warn log is emitted

  Scenario: ADR-0036 invalid env value falls back with warn log
    Given ADR-0036 is "Accepted"
    And GEMINI_TIMEOUT_MS is set to "not-a-number" OR "100000" (above MAX) OR "1000" (below MIN)
    When the Gemini provider module loads
    Then the resolved timeout value is 30000 (fallback default)
    And a structured warn log "ai.provider.gemini.timeout.envInvalid" is emitted
    And the log includes the raw value + the fallback value

  Scenario: ADR-0036 Gemini request honors the resolved timeout
    Given the resolved GEMINI_TIMEOUT_MS is 30000
    When a Gemini API call takes longer than 30000 ms
    Then the request aborts via AbortSignal.timeout(30000)
    And the AbortError is mapped to AppError("AI_TIMEOUT", 504) per existing mapError
    And the FallbackProvider retries the call on Anthropic (if AI_FALLBACK_PROVIDER=anthropic)
    And the user receives a graceful error message (no PII leak)

  # ─────────────────────────────────────────────────────────────────────
  # Added at Sprint 46 Day 2 (2026-04-24) — B-W1-001 feature flag
  # SPEC-OPS-AI-GOVERNANCE-V2 §2.1-2.2
  # ─────────────────────────────────────────────────────────────────────

  Scenario: B-W1-001 feature flag defaults to OFF when env var is unset
    Given the env var AI_GOVERNANCE_V2 is NOT set
    When the application bootstraps and parses env via @t3-oss/env-nextjs
    Then env.AI_GOVERNANCE_V2 resolves to boolean false
    And isAiGovernanceV2Enabled() returns false

  Scenario: B-W1-001 feature flag enabled when env var is "true"
    Given AI_GOVERNANCE_V2="true" is set in the environment
    When the application bootstraps
    Then env.AI_GOVERNANCE_V2 resolves to boolean true
    And isAiGovernanceV2Enabled() returns true

  Scenario: B-W1-001 feature flag disabled when env var is "false"
    Given AI_GOVERNANCE_V2="false" is set in the environment
    When the application bootstraps
    Then env.AI_GOVERNANCE_V2 resolves to boolean false
    And isAiGovernanceV2Enabled() returns false

  Scenario: B-W1-001 feature flag rejects invalid env values at boot
    Given AI_GOVERNANCE_V2="yes" (or any value other than "true"/"false") is set
    When the application bootstraps
    Then @t3-oss/env-nextjs validation FAILS at boot
    And the helper isAiGovernanceV2Enabled() never executes
    # Per SPEC-OPS-V2 §2.1: enum(["true","false"]) is strict — invalid values
    # crash app at boot to surface misconfiguration loudly. This is the
    # OPPOSITE of the ADR-0036 graceful-fallback contract because feature
    # flags are admin-only ON/OFF and ambiguity is a deploy-time bug.

  Scenario: B-W1-001 helper is server-only (no client exposure)
    Given the helper file at src/lib/flags/ai-governance.ts
    When client-side code attempts to import it
    Then the import fails (server-only marker)
    And the env var has NO NEXT_PUBLIC_ prefix
    # Per SPEC-OPS-V2 §2.2: admin-only feature; no client targeting needed

  # ─────────────────────────────────────────────────────────────────────
  # Added at Sprint 46 Day 2 cont. (2026-04-24) — B-W1-002 migration
  # SPEC-ARCH-AI-GOVERNANCE-V2 §4 + §8
  # ─────────────────────────────────────────────────────────────────────

  Scenario: B-W1-002 migration applies cleanly on a fresh database
    Given a database without migration 20260424120000_ai_governance_v2
    When the migration is applied via prisma migrate deploy
    Then 5 new tables exist: prompt_versions, prompt_eval_results, model_assignments, ai_runtime_configs, audit_logs
    And prompt_templates table has 5 new columns: status, activeVersionId, createdById, approvedById, approvedAt
    And ai_interaction_logs table has 2 new columns: curationStatus, curationNotes
    And all FK constraints reference existing tables (users, prompt_templates, prompt_versions)
    And all indexes are created per SPEC-ARCH §4
    # User runs locally: npx prisma migrate dev (against Docker Postgres)
    # CI runs on Vercel deploy: npx prisma migrate deploy

  Scenario: B-W1-002 migration revert removes only the new objects
    Given migration 20260424120000_ai_governance_v2 has been applied
    When the operator runs the SPEC-ARCH §8.4 downgrade SQL
    Then the 5 new tables are dropped
    And the 7 new columns are removed (5 on prompt_templates + 2 on ai_interaction_logs)
    And no pre-Sprint-46 tables, columns, or rows are affected
    And AiKillSwitch model is intact (Wave 3 will migrate it; out of scope here)

  Scenario: B-W1-002 migration is FK-safe — child rows enforce parent existence
    Given the migration is applied
    When code attempts to insert a PromptVersion with an unknown promptTemplateId
    Then the insert fails with a foreign-key violation
    When code attempts to insert an AuditLog with an unknown actorUserId
    Then the insert fails with a foreign-key violation
    When code attempts to insert a PromptEvalResult with an unknown promptVersionId
    Then the insert fails with a foreign-key violation

  Scenario: B-W1-002 cascade rules match SPEC-ARCH §4
    Given the migration is applied
    When a PromptTemplate row is deleted
    Then its child PromptVersion + PromptEvalResult rows cascade-delete
    When a User row is deleted
    Then its AuditLog rows cascade-delete (actor FK is required; cascade)
    And its PromptTemplate.createdById / approvedById become null (SetNull)
    And its PromptVersion.createdById become null (SetNull)
    And its ModelAssignment.updatedById become null (SetNull)

  Scenario: B-W1-002 generates Prisma client types for the 5 new models
    Given the schema includes the 5 new models
    When npx prisma generate runs
    Then @prisma/client exports types named PromptVersion, PromptEvalResult, ModelAssignment, AiRuntimeConfig, AuditLog
    And db.promptVersion.findMany() compiles without TS error
    And db.modelAssignment.findUnique({where:{phase:"plan"}}) compiles
    And db.auditLog.create({data:{actorUserId, action, entityType, entityId}}) compiles

  Scenario: B-W1-002 no behaviour change at deploy (default-OFF flag still gates UI)
    Given the migration is applied AND AI_GOVERNANCE_V2 is unset (default OFF)
    When users browse the application
    Then the admin/ia tab remains hidden
    And no AI provider config reads from the new ModelAssignment table
    And no PromptVersion lookup occurs in the AI hot path
    # Wave 3 (S47) wires the lookups; Wave 1 only ships the storage layer.

  # ─────────────────────────────────────────────────────────────────────
  # Added at Sprint 46 Day 2 cont. (2026-04-24) — R-01-A + R-02-B + R-03-A
  # PO-approved recommendations from sprint-46-pendentes-recommendations.md
  # ─────────────────────────────────────────────────────────────────────

  Scenario: R-02-B cost model heuristic documented in SPEC-PROFIT-SCORING-001
    Given the admin dashboard uses AI_COST_PER_PA_CENTS = 1 as platform-cost heuristic
    And cost-calculator.ts uses MODEL_PRICING per-token as technical source of truth
    When SPEC-PROFIT-SCORING-001 §4 is reviewed
    Then the heuristic is explicitly documented as intentional design
    And the empirical 66x divergence (heuristic vs raw provider cost) is acknowledged
    And the rationale (platform overhead capture) is recorded
    And §4.4 explicitly rejects R-02-A (replace) and R-02-C (lower retroactively)
    And §4.5 lists the 4 future revisitation triggers

  Scenario: R-03-A PO weekly allocation reduced for Sprint Zero parallel
    Given execution-plan §6.3 prescribes PO Approach 1 cadence
    When R-03-A is applied
    Then the table reads 0.3 day/week (down from 0.5)
    And total Sprint 46 PO commitment is ~1 day (down from 2)
    And the rationale references reduced scope from the corrected grounding (ghost ranks 4→2; heuristic intentional, not a bug)

  Scenario: R-01-A B47-RANK-FILL added to Sprint 47 BACKLOG
    Given Dynamic Ranking has 2 unreachable ranks (navegador, lendario)
    When Sprint 47 BACKLOG is updated per R-01-A
    Then docs/specs/sprint-47-candidates/BACKLOG.md contains B47-RANK-FILL
    And the entry has a 4-6h estimate and P2 priority
    And acceptance criteria require 2 phase milestones added to phase-config.ts (PO chooses which phases)

  Scenario: R-02-B B47-COST-TILE added to Sprint 47 BACKLOG
    Given the cost model uses an intentional heuristic
    When Sprint 47 BACKLOG is updated per R-02-B
    Then docs/specs/sprint-47-candidates/BACKLOG.md contains B47-COST-TILE
    And the entry has a 4-6h estimate and P2 priority
    And acceptance criteria require a transparency tile alongside the heuristic display
    And the tile sources actual provider cost from AiInteractionLog.estimatedCostUsd

  # ─────────────────────────────────────────────────────────────────────
  # Added at Sprint 46 Day 2-3 (2026-04-24) — B-W1-003 seed defaults
  # SPEC-ARCH-AI-GOVERNANCE-V2 §5.3.1 + §8.3
  # ─────────────────────────────────────────────────────────────────────

  Scenario: B-W1-003 seed populates ModelAssignment defaults per SPEC §8.3
    Given a database where the V2 migration has been applied (B-W1-002)
    And model_assignments table is empty
    When the seed function seedAiGovernanceV2Defaults() runs
    Then exactly 3 model_assignments rows exist (plan, checklist, guide)
    And the plan row has primary anthropic claude-haiku-4-5-20251001 with timeout 30000
    And the plan row has fallback gemini gemini-2.0-flash with timeout 25000
    And the checklist row has primary anthropic claude-haiku-4-5-20251001 with timeout 20000
    And the checklist row has no fallback
    And the guide row has primary anthropic claude-haiku-4-5-20251001 with timeout 25000
    And the guide row has no fallback

  Scenario: B-W1-003 seed populates AiRuntimeConfig defaults per SPEC §5.3.1
    Given a database where the V2 migration has been applied
    And ai_runtime_configs table is empty
    When the seed function seedAiGovernanceV2Defaults() runs
    Then exactly 13 ai_runtime_configs rows exist
    And the 3 maxTokens keys exist with values 2048, 2048, 4096 for plan/checklist/guide
    And the 3 temperature keys exist with values 0.7, 0.3, 0.7 for plan/checklist/guide
    And the 4 killSwitch keys exist with value false (global, plan, checklist, guide)
    And the 3 rateLimitPerHour keys exist with values 10, 5, 5 for plan/checklist/guide
    And every value column is JSON-encoded string (per schema VarChar/Text contract)

  Scenario: B-W1-003 seed is idempotent — second run does not duplicate
    Given seedAiGovernanceV2Defaults() has run once
    And model_assignments has 3 rows + ai_runtime_configs has 13 rows
    When seedAiGovernanceV2Defaults() runs a second time
    Then row counts remain at 3 + 13 (no duplicates)
    And no FK or unique-constraint violations occur
    And updatedAt fields update (last-write-wins semantics on upsert)

  Scenario: B-W1-003 seed runs unconditionally regardless of feature flag state
    Given AI_GOVERNANCE_V2 is set to "false" or unset
    When npx prisma db seed is invoked
    Then seedAiGovernanceV2Defaults() still executes
    And the 16 rows (3 + 13) are populated
    # The flag gates runtime UI/API consumers, NOT the data layer.
    # Wave 3 (S47) reads from these tables only when flag is ON.

  Scenario: B-W1-003 seed values match SPEC §5.3.1 + §8.3 verbatim
    Given the SPEC declares specific defaults
    When the seeded rows are inspected
    Then every value matches the SPEC byte-for-byte
    And any divergence is treated as spec-drift (P0 bug)

  # ─────────────────────────────────────────────────────────────────────
  # Added at Sprint 46 Day 3 (2026-04-25) — B-W1-004 AuditLogService
  # SPEC-ARCH-AI-GOVERNANCE-V2 §4.6 + §5.5
  # ─────────────────────────────────────────────────────────────────────

  Scenario: B-W1-004 AuditLogService.append creates an audit_logs row
    Given a user with id "actor_user_id" exists
    When AuditLogService.append({ actorUserId, action, entityType, entityId, diffJson }) runs
    Then exactly one audit_logs row is created
    And the row carries actorUserId, action, entityType, entityId, diffJson, createdAt verbatim
    And the row id is a generated cuid

  Scenario: B-W1-004 service is append-only (no update/delete exposed)
    Given the SPEC §4.6 declares AuditLog is immutable
    When the AuditLogService surface is inspected
    Then only an `append` method is exported
    And no `update`, `delete`, or `clear` method exists
    And the underlying schema has no updatedAt column (per migration 20260424120000)

  Scenario: B-W1-004 append accepts optional ip + userAgent metadata
    Given the SPEC §4.6 schema includes nullable ip and userAgent
    When AuditLogService.append is invoked without ip or userAgent
    Then the row is created with ip=null and userAgent=null
    When AuditLogService.append is invoked with ip="1.2.3.4" and userAgent="Mozilla/5.0"
    Then those values are persisted verbatim

  Scenario: B-W1-004 append serializes diffJson as JSON value
    Given diffJson is { before: { value: "x" }, after: { value: "y" } }
    When AuditLogService.append is invoked
    Then the underlying upsert receives diffJson as a Prisma JSON value
    And re-reading the row deserializes back to the original shape

  # ─────────────────────────────────────────────────────────────────────
  # Added at Sprint 46 Day 3 (2026-04-25) — B-W1-005 RBAC middleware
  # SPEC-ARCH-AI-GOVERNANCE-V2 §7.7 (RBAC matrix)
  # ─────────────────────────────────────────────────────────────────────

  Scenario: B-W1-005 admin role accesses /admin/ia (backward compat)
    Given a user with role "admin"
    When the user navigates to /admin/ia
    Then the middleware allows the request to proceed (no redirect)

  Scenario: B-W1-005 admin-ai role accesses /admin/ia (new SPEC §7.7)
    Given a user with role "admin-ai"
    When the user navigates to /admin/ia
    Then the middleware allows the request to proceed (no redirect)

  Scenario: B-W1-005 admin-ai-approver role accesses /admin/ia (superset)
    Given a user with role "admin-ai-approver"
    When the user navigates to /admin/ia
    Then the middleware allows the request to proceed (no redirect)

  Scenario: B-W1-005 regular user denied /admin/ia
    Given a user with role "user"
    When the user navigates to /admin/ia
    Then the middleware redirects to /expeditions

  Scenario: B-W1-005 admin-ai role denied other /admin/* routes
    Given a user with role "admin-ai" (NOT admin)
    When the user navigates to /admin/dashboard
    Then the middleware redirects to /expeditions
    # admin-ai is scoped to /admin/ia only; broad /admin/* stays admin-only.

  Scenario: B-W1-005 RBAC helper hasAiGovernanceAccess is permissive across the 3 roles
    Given the helper hasAiGovernanceAccess(role) is called
    When role is "admin", "admin-ai", or "admin-ai-approver"
    Then it returns true
    When role is "user", "moderator", null, or undefined
    Then it returns false

  Scenario: B-W1-005 RBAC helper hasAiGovernanceApproverAccess is stricter
    Given the helper hasAiGovernanceApproverAccess(role) is called
    When role is "admin" or "admin-ai-approver"
    Then it returns true
    When role is "admin-ai" (read-only)
    Then it returns false

  # ─────────────────────────────────────────────────────────────────────
  # B47-MW-PURE-FN — Sprint 46 (P1 from batch-review synthesis §10.3)
  # Extract middleware/layout RBAC decision into a pure function so it
  # can be unit-tested independently of NextAuth's auth() HOF wrapper.
  # ─────────────────────────────────────────────────────────────────────

  Scenario: B47-MW-PURE-FN decideAdminAccess allows admin on any /admin/* path
    Given the helper decideAdminAccess(pathname, role) is called
    When pathname is "/en/admin/dashboard" and role is "admin"
    Then it returns "allow"
    When pathname is "/pt/admin/ia" and role is "admin"
    Then it returns "allow"

  Scenario: B47-MW-PURE-FN decideAdminAccess allows admin-ai only on /admin/ia
    Given the helper decideAdminAccess(pathname, role) is called
    When pathname is "/en/admin/ia" and role is "admin-ai"
    Then it returns "allow"
    When pathname is "/en/admin/dashboard" and role is "admin-ai"
    Then it returns "deny"
    # admin-ai is scoped to /admin/ia per SPEC-ARCH-AI-GOVERNANCE-V2 §7.7.

  Scenario: B47-MW-PURE-FN decideAdminAccess allows admin-ai-approver only on /admin/ia
    Given the helper decideAdminAccess(pathname, role) is called
    When pathname is "/en/admin/ia/prompts" and role is "admin-ai-approver"
    Then it returns "allow"
    When pathname is "/en/admin/users" and role is "admin-ai-approver"
    Then it returns "deny"

  Scenario: B47-MW-PURE-FN decideAdminAccess denies regular user on any /admin/* path
    Given the helper decideAdminAccess(pathname, role) is called
    When pathname is "/en/admin/ia" and role is "user"
    Then it returns "deny"
    When pathname is "/en/admin/dashboard" and role is "user"
    Then it returns "deny"

  Scenario: B47-MW-PURE-FN decideAdminAccess denies null/undefined/non-string role defensively
    Given the helper decideAdminAccess(pathname, role) is called
    When pathname is "/en/admin/ia" and role is null
    Then it returns "deny"
    When pathname is "/en/admin/dashboard" and role is undefined
    Then it returns "deny"
    When role is a non-string value
    Then it returns "deny"

  Scenario: B47-MW-PURE-FN decideAdminAccess on non-admin path is structurally allow
    Given the helper decideAdminAccess(pathname, role) is called
    When pathname is "/en/expeditions" and role is "user"
    Then it returns "allow"
    # Pure function is intended to be called only from /admin/* gates;
    # returning "allow" for non-admin paths matches the caller's expectation
    # that gating is opt-in (caller decides whether to invoke the helper).

  Scenario: B47-MW-PURE-FN middleware delegates RBAC decision to decideAdminAccess
    Given the middleware processes a request to "/en/admin/ia"
    When the helper decideAdminAccess returns "deny"
    Then the middleware redirects to /expeditions
    And the inline RBAC logic at middleware.ts is removed

  Scenario: B47-MW-PURE-FN admin layout delegates RBAC decision to decideAdminAccess
    Given the admin layout server component runs for "/en/admin/ia"
    When the helper decideAdminAccess returns "deny"
    Then the layout redirects to /expeditions
    And the inline RBAC logic at admin/layout.tsx is removed

  # ─────────────────────────────────────────────────────────────────────
  # B47-API-RBAC-CONVENTION — Sprint 46 (P1 from batch-review §10.3)
  # Mandatory RBAC convention for /api/admin/ai/* handlers. Middleware
  # skips /api/* (line 45 of middleware.ts), so handlers must self-gate.
  # The convention is two HOF wrappers + a compliance test that fails CI
  # if any /api/admin/ai/** route ships without one of the wrappers.
  # ─────────────────────────────────────────────────────────────────────

  Scenario: B47-API-RBAC-CONVENTION withAiGovernanceAccess returns 401 when no session
    Given a route handler wrapped with withAiGovernanceAccess
    When the request has no authenticated session
    Then the wrapped handler returns 401 Unauthorized
    And the inner handler is NOT invoked

  Scenario: B47-API-RBAC-CONVENTION withAiGovernanceAccess returns 403 for unqualified roles
    Given a route handler wrapped with withAiGovernanceAccess
    When the request has a session with role "user"
    Then the wrapped handler returns 403 Forbidden
    And the inner handler is NOT invoked

  Scenario: B47-API-RBAC-CONVENTION withAiGovernanceAccess passes through for admin-ai
    Given a route handler wrapped with withAiGovernanceAccess
    When the request has a session with role "admin-ai"
    Then the inner handler is invoked
    And the inner handler receives an auth context with userId and role

  Scenario: B47-API-RBAC-CONVENTION withAiGovernanceApproverAccess DENIES admin-ai
    Given a route handler wrapped with withAiGovernanceApproverAccess
    When the request has a session with role "admin-ai"
    Then the wrapped handler returns 403 Forbidden
    # admin-ai is read+edit only per SPEC §7.7 — promote requires the
    # stricter wrapper; admin-ai must NOT call promote endpoints.

  Scenario: B47-API-RBAC-CONVENTION withAiGovernanceApproverAccess allows admin-ai-approver
    Given a route handler wrapped with withAiGovernanceApproverAccess
    When the request has a session with role "admin-ai-approver"
    Then the inner handler is invoked

  Scenario: B47-API-RBAC-CONVENTION compliance test enumerates admin/ai handlers
    Given the compliance test scans src/app/api/admin/ai/**/*.ts
    When any route file does NOT import withAiGovernanceAccess or withAiGovernanceApproverAccess
    Then the compliance test fails with a clear error naming the file
    # Lint-rule equivalent: prevents Wave 2 handlers from shipping unprotected.

  Scenario: B47-API-RBAC-CONVENTION wrapper is defensive on DB lookup failure
    Given a route handler wrapped with withAiGovernanceAccess
    When the DB lookup for the user role throws an error
    Then the wrapped handler returns 503 (or 500) — not 200 with the inner handler invoked
    # Fail-closed: if we cannot determine the role, deny access.

  Scenario: B47-API-RBAC-CONVENTION wrapper does not introduce regression for unwrapped handlers
    Given the existing /api/admin/export-csv route (admin-only, not in /admin/ai/*)
    When the wrapper is added to the codebase
    Then the existing route continues to operate via its inline auth check
    # The convention applies only to /api/admin/ai/**; other admin routes
    # keep their existing pattern.
