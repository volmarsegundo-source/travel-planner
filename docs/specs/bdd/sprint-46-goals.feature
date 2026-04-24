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

  Scenario: Sprint 46 retrospective captures all debt items
    Given Sprint 45 retrospective flagged single-author bias
    When Sprint 46 retrospective runs
    Then at least 3 agents contributed input independently
    And Start/Stop/Continue items include specific code/commit references
    And no debt discovered during the sprint is left undocumented

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
