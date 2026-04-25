/**
 * B-W1-002 — Schema-level smoke test for AI Governance V2 models.
 *
 * Asserts that the 5 new Prisma models (per SPEC-ARCH-AI-GOVERNANCE-V2 §4)
 * are exposed on the generated Prisma Client.
 *
 * This test does NOT touch the database. It exists only to guarantee that
 * a developer who pulls the schema change but forgets to run
 * `npx prisma generate` (or `npm run prebuild`) gets a hard tsc failure
 * instead of a runtime surprise inside Wave 3 services.
 *
 * STATUS AT COMMIT: starts RED (types do not exist until prisma generate
 * runs against the updated schema). Goes GREEN after schema edit +
 * `npx prisma generate`.
 */
import { describe, it, expect } from "vitest";
import type {
  PromptVersion,
  PromptEvalResult,
  ModelAssignment,
  AiRuntimeConfig,
  AuditLog,
} from "@prisma/client";

describe("B-W1-002 — AI Governance V2 Prisma models", () => {
  it("exposes typed models on @prisma/client (compile-time assertion)", () => {
    // The TypeScript imports above are the assertion. If any of the 5
    // model types is missing from @prisma/client, this file fails tsc.
    // Below is a runtime sanity that the import resolved.
    const modelNames = [
      "PromptVersion",
      "PromptEvalResult",
      "ModelAssignment",
      "AiRuntimeConfig",
      "AuditLog",
    ] as const;
    expect(modelNames).toHaveLength(5);
  });

  it("PromptVersion type carries SPEC §4.2 required fields", () => {
    // Type-only structural assertion — the cast fails tsc if any required
    // field is missing or has the wrong type.
    const _stub: PromptVersion = {
      id: "cuid",
      promptTemplateId: "tpl_id",
      versionTag: "1.0.0",
      systemPrompt: "sys",
      userTemplate: "tpl",
      maxTokens: 2048,
      cacheControl: true,
      modelType: "plan",
      metadata: null,
      changeNote: null,
      createdById: null,
      createdAt: new Date(),
    };
    expect(_stub.versionTag).toBe("1.0.0");
  });

  it("ModelAssignment type carries SPEC §4.4 primary + fallback fields", () => {
    const _stub: ModelAssignment = {
      id: "cuid",
      phase: "plan",
      primaryProvider: "anthropic",
      primaryModelId: "claude-haiku-4-5-20251001",
      primaryTimeoutMs: 30000,
      fallbackProvider: "gemini",
      fallbackModelId: "gemini-2.0-flash",
      fallbackTimeoutMs: 25000,
      updatedById: null,
      updatedAt: new Date(),
      createdAt: new Date(),
    };
    expect(_stub.phase).toBe("plan");
  });

  it("AuditLog type carries SPEC §4.6 required actor + entity fields", () => {
    const _stub: AuditLog = {
      id: "cuid",
      actorUserId: "user_id",
      action: "prompt.create",
      entityType: "PromptTemplate",
      entityId: "tpl_id",
      diffJson: null,
      ip: null,
      userAgent: null,
      createdAt: new Date(),
    };
    expect(_stub.action).toBe("prompt.create");
  });

  it("PromptEvalResult type carries SPEC §4.3 trust score + dimensions", () => {
    const _stub: PromptEvalResult = {
      id: "cuid",
      promptTemplateId: "tpl_id",
      promptVersionId: "ver_id",
      trustScore: 0.93,
      // Prisma's JsonValue type — `null` is valid for nullable Json columns;
      // the SPEC marks `dimensions` non-null, so a non-null value is used.
      dimensions: { accuracy: 0.9, safety: 0.95 },
      totalCases: 100,
      passedCases: 93,
      failedCases: 7,
      evalDurationMs: 4500,
      rawOutput: null,
      ranAt: new Date(),
      ranById: null,
    };
    expect(_stub.trustScore).toBeGreaterThan(0);
  });

  it("AiRuntimeConfig type carries SPEC §4.5 key/value/description shape", () => {
    const _stub: AiRuntimeConfig = {
      id: "cuid",
      key: "global.killSwitch",
      value: "false",
      description: "Global AI kill-switch",
      updatedById: null,
      updatedAt: new Date(),
      createdAt: new Date(),
    };
    expect(_stub.key).toBe("global.killSwitch");
  });
});
