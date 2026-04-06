-- CreateTable
CREATE TABLE "prompt_templates" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "version" VARCHAR(20) NOT NULL,
    "modelType" VARCHAR(20) NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "userTemplate" TEXT NOT NULL,
    "maxTokens" INTEGER NOT NULL DEFAULT 2048,
    "cacheControl" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "prompt_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_interaction_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phase" VARCHAR(20) NOT NULL,
    "provider" VARCHAR(20) NOT NULL,
    "model" VARCHAR(50) NOT NULL,
    "promptSlug" VARCHAR(50),
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheReadTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheWriteTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL,
    "errorCode" VARCHAR(50),
    "cacheHit" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_interaction_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_kill_switches" (
    "id" TEXT NOT NULL,
    "phase" VARCHAR(20) NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reason" VARCHAR(500),
    "updatedBy" VARCHAR(100),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_kill_switches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "prompt_templates_slug_key" ON "prompt_templates"("slug");
CREATE INDEX "prompt_templates_slug_isActive_idx" ON "prompt_templates"("slug", "isActive");

CREATE INDEX "ai_interaction_logs_phase_createdAt_idx" ON "ai_interaction_logs"("phase", "createdAt");
CREATE INDEX "ai_interaction_logs_userId_createdAt_idx" ON "ai_interaction_logs"("userId", "createdAt");
CREATE INDEX "ai_interaction_logs_status_createdAt_idx" ON "ai_interaction_logs"("status", "createdAt");
CREATE INDEX "ai_interaction_logs_createdAt_idx" ON "ai_interaction_logs"("createdAt");

CREATE UNIQUE INDEX "ai_kill_switches_phase_key" ON "ai_kill_switches"("phase");
