-- B-W1-002 — AI Governance V2 storage layer.
-- SPEC-ARCH-AI-GOVERNANCE-V2 §4 + §8.
-- Sprint 46 Wave 1 Day 2.
--
-- Order (per SPEC §8.2):
--   1. Add columns to prompt_templates
--   2. Add columns to ai_interaction_logs
--   3. Create prompt_versions
--   4. Create prompt_eval_results
--   5. Create model_assignments
--   6. Create ai_runtime_configs
--   7. Create audit_logs
--
-- All tables created with FK constraints + indexes per SPEC §4.
-- AiKillSwitch is intentionally NOT migrated to AiRuntimeConfig here
-- (per SPEC-TECHLEAD INC-09 — that move belongs to Wave 3 in S47).
--
-- Downgrade SQL: see SPEC-ARCH §8.4 (matches the inverse of the steps below).

-- ─── 1. prompt_templates: add columns ────────────────────────────────────────

ALTER TABLE "prompt_templates"
  ADD COLUMN "status" VARCHAR(20) NOT NULL DEFAULT 'active',
  ADD COLUMN "activeVersionId" VARCHAR(30),
  ADD COLUMN "createdById" TEXT,
  ADD COLUMN "approvedById" TEXT,
  ADD COLUMN "approvedAt" TIMESTAMP(3);

CREATE INDEX "prompt_templates_status_idx" ON "prompt_templates"("status");

ALTER TABLE "prompt_templates"
  ADD CONSTRAINT "prompt_templates_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "prompt_templates"
  ADD CONSTRAINT "prompt_templates_approvedById_fkey"
    FOREIGN KEY ("approvedById") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── 2. ai_interaction_logs: add columns ─────────────────────────────────────

ALTER TABLE "ai_interaction_logs"
  ADD COLUMN "curationStatus" VARCHAR(30) NOT NULL DEFAULT 'none',
  ADD COLUMN "curationNotes" TEXT;

-- ─── 3. prompt_versions ──────────────────────────────────────────────────────

CREATE TABLE "prompt_versions" (
  "id"               TEXT        NOT NULL,
  "promptTemplateId" TEXT        NOT NULL,
  "versionTag"       VARCHAR(20) NOT NULL,
  "systemPrompt"     TEXT        NOT NULL,
  "userTemplate"     TEXT        NOT NULL,
  "maxTokens"        INTEGER     NOT NULL DEFAULT 2048,
  "cacheControl"     BOOLEAN     NOT NULL DEFAULT true,
  "modelType"        VARCHAR(20) NOT NULL,
  "metadata"         JSONB,
  "changeNote"       VARCHAR(500),
  "createdById"      TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "prompt_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "prompt_versions_promptTemplateId_versionTag_key"
  ON "prompt_versions"("promptTemplateId", "versionTag");

CREATE INDEX "prompt_versions_promptTemplateId_createdAt_idx"
  ON "prompt_versions"("promptTemplateId", "createdAt");

ALTER TABLE "prompt_versions"
  ADD CONSTRAINT "prompt_versions_promptTemplateId_fkey"
    FOREIGN KEY ("promptTemplateId") REFERENCES "prompt_templates"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "prompt_versions"
  ADD CONSTRAINT "prompt_versions_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── 4. prompt_eval_results ──────────────────────────────────────────────────

CREATE TABLE "prompt_eval_results" (
  "id"               TEXT             NOT NULL,
  "promptTemplateId" TEXT             NOT NULL,
  "promptVersionId"  TEXT             NOT NULL,
  "trustScore"       DOUBLE PRECISION NOT NULL,
  "dimensions"       JSONB            NOT NULL,
  "totalCases"       INTEGER          NOT NULL DEFAULT 0,
  "passedCases"      INTEGER          NOT NULL DEFAULT 0,
  "failedCases"      INTEGER          NOT NULL DEFAULT 0,
  "evalDurationMs"   INTEGER          NOT NULL DEFAULT 0,
  "rawOutput"        JSONB,
  "ranAt"            TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ranById"          TEXT,

  CONSTRAINT "prompt_eval_results_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "prompt_eval_results_promptTemplateId_ranAt_idx"
  ON "prompt_eval_results"("promptTemplateId", "ranAt");

CREATE INDEX "prompt_eval_results_promptVersionId_idx"
  ON "prompt_eval_results"("promptVersionId");

CREATE INDEX "prompt_eval_results_trustScore_idx"
  ON "prompt_eval_results"("trustScore");

ALTER TABLE "prompt_eval_results"
  ADD CONSTRAINT "prompt_eval_results_promptTemplateId_fkey"
    FOREIGN KEY ("promptTemplateId") REFERENCES "prompt_templates"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "prompt_eval_results"
  ADD CONSTRAINT "prompt_eval_results_promptVersionId_fkey"
    FOREIGN KEY ("promptVersionId") REFERENCES "prompt_versions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "prompt_eval_results"
  ADD CONSTRAINT "prompt_eval_results_ranById_fkey"
    FOREIGN KEY ("ranById") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── 5. model_assignments ────────────────────────────────────────────────────

CREATE TABLE "model_assignments" (
  "id"                TEXT        NOT NULL,
  "phase"             VARCHAR(20) NOT NULL,
  "primaryProvider"   VARCHAR(20) NOT NULL,
  "primaryModelId"    VARCHAR(80) NOT NULL,
  "primaryTimeoutMs"  INTEGER     NOT NULL DEFAULT 30000,
  "fallbackProvider"  VARCHAR(20),
  "fallbackModelId"   VARCHAR(80),
  "fallbackTimeoutMs" INTEGER,
  "updatedById"       TEXT,
  "updatedAt"         TIMESTAMP(3) NOT NULL,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "model_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "model_assignments_phase_key" ON "model_assignments"("phase");

ALTER TABLE "model_assignments"
  ADD CONSTRAINT "model_assignments_updatedById_fkey"
    FOREIGN KEY ("updatedById") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── 6. ai_runtime_configs ───────────────────────────────────────────────────

CREATE TABLE "ai_runtime_configs" (
  "id"          TEXT        NOT NULL,
  "key"         VARCHAR(50) NOT NULL,
  "value"       TEXT        NOT NULL,
  "description" VARCHAR(300),
  "updatedById" TEXT,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ai_runtime_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_runtime_configs_key_key" ON "ai_runtime_configs"("key");
CREATE INDEX "ai_runtime_configs_key_idx" ON "ai_runtime_configs"("key");

ALTER TABLE "ai_runtime_configs"
  ADD CONSTRAINT "ai_runtime_configs_updatedById_fkey"
    FOREIGN KEY ("updatedById") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── 7. audit_logs ───────────────────────────────────────────────────────────

CREATE TABLE "audit_logs" (
  "id"          TEXT         NOT NULL,
  "actorUserId" TEXT         NOT NULL,
  "action"      VARCHAR(50)  NOT NULL,
  "entityType"  VARCHAR(30)  NOT NULL,
  "entityId"    VARCHAR(30)  NOT NULL,
  "diffJson"    JSONB,
  "ip"          VARCHAR(45),
  "userAgent"   VARCHAR(500),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_actorUserId_createdAt_idx"
  ON "audit_logs"("actorUserId", "createdAt");

CREATE INDEX "audit_logs_entityType_entityId_createdAt_idx"
  ON "audit_logs"("entityType", "entityId", "createdAt");

CREATE INDEX "audit_logs_action_createdAt_idx"
  ON "audit_logs"("action", "createdAt");

CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
