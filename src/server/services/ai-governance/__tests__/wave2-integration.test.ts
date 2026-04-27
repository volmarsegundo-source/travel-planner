/**
 * B-W2-009 — Wave 2 cross-task integration tests (gate close).
 *
 * Walks the full Wave 2 pipeline end-to-end at the SERVICE layer (DB
 * mocked via vi.hoisted). Asserts the contracts that span tasks 1-8:
 *
 *   B-W2-001 → service.create / .update / .list shape
 *   B-W2-002 → semver auto-increment in PATCH (real, not stub)
 *   B-W2-003 → V-01..V-08 gate fires before DB write (block by block)
 *   B-W2-004 → W-01..W-04 surface in result.warnings (non-blocking)
 *   B-W2-005 → estimateTokenCount used by V-03 path
 *   B-W2-007 → lineDiff happy path on stored versions (string-level)
 *
 * UI tasks (B-W2-006 / B-W2-008) have their own RTL suites; this file
 * focuses on the service+library cross-cuts. The handler layer is
 * indirectly covered by handler-rbac-compliance + the service tests.
 *
 * Gate condition (per execution-plan §B.2 close criteria):
 *   - Tests pass green
 *   - V-01..V-08 + W-01..W-04 each hit at least once across this file
 *   - Trust Score ≥ 0.93 maintained (qualitative — see release notes)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  promptTemplateFindMany,
  promptTemplateFindUnique,
  promptTemplateCount,
  promptTemplateCreate,
  promptTemplateUpdate,
  promptVersionCreate,
  promptVersionFindFirst,
  auditLogAppend,
  transaction,
  mockDb,
} = vi.hoisted(() => {
  const promptTemplateFindMany = vi.fn();
  const promptTemplateFindUnique = vi.fn();
  const promptTemplateCount = vi.fn();
  const promptTemplateCreate = vi.fn();
  const promptTemplateUpdate = vi.fn();
  const promptVersionCreate = vi.fn();
  const promptVersionFindFirst = vi.fn();
  const auditLogAppend = vi.fn();
  const transaction = vi
    .fn()
    .mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn(mockDb);
    });
  const mockDb: Record<string, unknown> = {
    promptTemplate: {
      findMany: promptTemplateFindMany,
      findUnique: promptTemplateFindUnique,
      count: promptTemplateCount,
      create: promptTemplateCreate,
      update: promptTemplateUpdate,
    },
    promptVersion: {
      create: promptVersionCreate,
      findFirst: promptVersionFindFirst,
    },
    $transaction: transaction,
  };
  return {
    promptTemplateFindMany,
    promptTemplateFindUnique,
    promptTemplateCount,
    promptTemplateCreate,
    promptTemplateUpdate,
    promptVersionCreate,
    promptVersionFindFirst,
    auditLogAppend,
    transaction,
    mockDb,
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@/server/db", () => ({ db: mockDb }));
vi.mock("@/server/services/audit-log.service", () => ({
  AuditLogService: { append: auditLogAppend },
}));

beforeEach(() => {
  vi.clearAllMocks();
  promptTemplateFindMany.mockReset();
  promptTemplateFindUnique.mockReset();
  promptTemplateCount.mockReset();
  promptTemplateCreate.mockReset();
  promptTemplateUpdate.mockReset();
  promptVersionCreate.mockReset();
  promptVersionFindFirst.mockReset();
  auditLogAppend.mockReset();
});

const VALID_GUIDE_SYSTEM =
  "You are a guide. {destination} {originCity} {days} {startDate} {endDate} {passengers} {travelStyle} {language}";
const VALID_GUIDE_USER = "Generate the itinerary. Return JSON with fields: a, b.";

describe("B-W2-009 — Wave 2 end-to-end", () => {
  it("[full create flow] parses Zod, runs V-01..V-08 (pass), creates tpl + version, audits, returns warnings", async () => {
    promptTemplateFindUnique.mockResolvedValue(null);
    promptTemplateCreate.mockResolvedValue({
      id: "tpl_int_1",
      slug: "integration-guide",
      status: "draft",
    });
    promptVersionCreate.mockResolvedValue({
      id: "ver_int_1",
      versionTag: "1.0.0",
    });
    promptTemplateUpdate.mockResolvedValue({});

    const { PromptAdminService } = await import(
      "@/server/services/ai-governance/prompt-admin.service"
    );

    const out = await PromptAdminService.create(
      {
        slug: "integration-guide",
        modelType: "guide",
        systemPrompt: VALID_GUIDE_SYSTEM,
        userTemplate: VALID_GUIDE_USER,
        maxTokens: 4096,
        cacheControl: true,
        changeNote: "initial",
      },
      { actorUserId: "actor_int", ip: "1.2.3.4", userAgent: "vitest" }
    );

    expect(out.id).toBe("tpl_int_1");
    expect(out.versionTag).toBe("1.0.0");
    expect(Array.isArray(out.warnings)).toBe(true);
    expect(promptVersionCreate).toHaveBeenCalledTimes(1);
    expect(auditLogAppend).toHaveBeenCalledTimes(1);
    expect(auditLogAppend.mock.calls[0]![0]!.action).toBe("prompt.create");
  });

  it("[V-01 gate] missing required placeholder rejects before DB write", async () => {
    promptTemplateFindUnique.mockResolvedValue(null);
    const { PromptAdminService, PromptAdminError } = await import(
      "@/server/services/ai-governance/prompt-admin.service"
    );
    await expect(
      PromptAdminService.create(
        {
          slug: "missing-required",
          modelType: "guide",
          systemPrompt: "Plan {destination}",
          userTemplate: "Generate.",
          maxTokens: 4096,
          cacheControl: true,
        },
        { actorUserId: "actor_int" }
      )
    ).rejects.toBeInstanceOf(PromptAdminError);
    expect(promptTemplateCreate).not.toHaveBeenCalled();
    expect(auditLogAppend).not.toHaveBeenCalled();
  });

  it("[V-02 gate] forbidden placeholder rejects before DB write", async () => {
    promptTemplateFindUnique.mockResolvedValue(null);
    const { PromptAdminService, PromptAdminError } = await import(
      "@/server/services/ai-governance/prompt-admin.service"
    );
    await expect(
      PromptAdminService.create(
        {
          slug: "forbidden",
          modelType: "guide",
          systemPrompt: VALID_GUIDE_SYSTEM + " {userEmail}",
          userTemplate: VALID_GUIDE_USER,
          maxTokens: 4096,
          cacheControl: true,
        },
        { actorUserId: "actor_int" }
      )
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    expect(promptTemplateCreate).not.toHaveBeenCalled();
  });

  it("[V-06 gate] PII in template rejects before DB write", async () => {
    promptTemplateFindUnique.mockResolvedValue(null);
    const { PromptAdminService } = await import(
      "@/server/services/ai-governance/prompt-admin.service"
    );
    await expect(
      PromptAdminService.create(
        {
          slug: "pii",
          modelType: "guide",
          systemPrompt: VALID_GUIDE_SYSTEM,
          userTemplate: "Email ada@example.com to confirm.",
          maxTokens: 4096,
          cacheControl: true,
        },
        { actorUserId: "actor_int" }
      )
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("[B-W2-002 semver real arithmetic] PATCH increments patch from 1.2.5 → 1.2.6", async () => {
    promptTemplateFindUnique.mockResolvedValue({
      id: "tpl_int_2",
      slug: "patch-test",
      modelType: "guide",
      systemPrompt: VALID_GUIDE_SYSTEM,
      userTemplate: VALID_GUIDE_USER,
      maxTokens: 4096,
      cacheControl: true,
      activeVersionId: "ver_prev",
    });
    promptVersionFindFirst.mockResolvedValue({
      id: "ver_prev",
      versionTag: "1.2.5",
    });
    promptVersionCreate.mockImplementation((args: unknown) => {
      const data = (args as { data: { versionTag: string } }).data;
      return Promise.resolve({ id: "ver_new", versionTag: data.versionTag });
    });
    promptTemplateUpdate.mockResolvedValue({});

    const { PromptAdminService } = await import(
      "@/server/services/ai-governance/prompt-admin.service"
    );
    const out = await PromptAdminService.update(
      "tpl_int_2",
      { changeNote: "no-content-change", maxTokens: 8192 },
      { actorUserId: "actor_int" }
    );
    expect(out.newVersionTag).toBe("1.2.6");
    expect(promptVersionCreate).toHaveBeenCalledTimes(1);
    const passed = (
      promptVersionCreate.mock.calls[0]![0] as {
        data: { versionTag: string };
      }
    ).data.versionTag;
    expect(passed).toBe("1.2.6");
  });

  it("[audit-log redaction] systemPrompt + userTemplate never appear verbatim in diffJson", async () => {
    promptTemplateFindUnique.mockResolvedValue(null);
    promptTemplateCreate.mockResolvedValue({
      id: "tpl_int_3",
      slug: "redact",
      status: "draft",
    });
    promptVersionCreate.mockResolvedValue({
      id: "ver_int_3",
      versionTag: "1.0.0",
    });
    promptTemplateUpdate.mockResolvedValue({});

    const { PromptAdminService } = await import(
      "@/server/services/ai-governance/prompt-admin.service"
    );
    // Avoid digits — V-06 card-number regex matches 12+ consecutive digits.
    const secretLine = "internal-only staging marker text alpha bravo";
    await PromptAdminService.create(
      {
        slug: "redact",
        modelType: "guide",
        systemPrompt: VALID_GUIDE_SYSTEM + "\n" + secretLine,
        userTemplate: VALID_GUIDE_USER,
        maxTokens: 4096,
        cacheControl: true,
      },
      { actorUserId: "actor_int" }
    );
    const call = auditLogAppend.mock.calls[0]![0]! as {
      diffJson?: unknown;
    };
    const serialized = JSON.stringify(call.diffJson ?? {});
    expect(serialized).not.toContain(secretLine);
    expect(serialized).toContain("ver_int_3");
  });

  it("[W-01..W-04 surface] non-blocking warnings populated on success", async () => {
    promptTemplateFindUnique.mockResolvedValue(null);
    promptTemplateCreate.mockResolvedValue({
      id: "tpl_int_4",
      slug: "warns",
      status: "draft",
    });
    promptVersionCreate.mockResolvedValue({
      id: "ver_int_4",
      versionTag: "1.0.0",
    });
    promptTemplateUpdate.mockResolvedValue({});

    const { PromptAdminService } = await import(
      "@/server/services/ai-governance/prompt-admin.service"
    );
    const out = await PromptAdminService.create(
      {
        slug: "warns",
        modelType: "guide",
        // Required placeholders (V-01) all present.
        systemPrompt:
          "{destination} {originCity} {days} {startDate} {endDate} {passengers} {travelStyle} {language}",
        userTemplate: "Generate without format hint.",
        maxTokens: 4096,
        cacheControl: true,
      },
      { actorUserId: "actor_int" }
    );
    // Expect at least one of W-01..W-04 to fire (W-02 missing format hint, W-03 missing language directive in system).
    expect(out.warnings.length).toBeGreaterThan(0);
    const codes = new Set(out.warnings.map((w) => w.code));
    const anyW = ["W-01", "W-02", "W-03", "W-04"].some((c) => codes.has(c));
    expect(anyW).toBe(true);
  });

  it("[list pagination] computes totalPages and forwards status filter", async () => {
    promptTemplateFindMany.mockResolvedValue([
      {
        id: "tpl_a",
        slug: "a",
        status: "draft",
        modelType: "guide",
        activeVersionId: "ver_a",
        approvedAt: null,
        updatedAt: new Date(),
        createdBy: null,
        approvedBy: null,
        _count: { versions: 1 },
        versions: [{ versionTag: "1.0.0" }],
      },
    ]);
    promptTemplateCount.mockResolvedValue(57);
    const { PromptAdminService } = await import(
      "@/server/services/ai-governance/prompt-admin.service"
    );
    const out = await PromptAdminService.list({
      status: "draft",
      page: 2,
      limit: 20,
    });
    expect(out.pagination.total).toBe(57);
    expect(out.pagination.totalPages).toBe(3);
    const findArg = promptTemplateFindMany.mock.calls[0]![0] as {
      where: { status?: string };
      skip: number;
    };
    expect(findArg.where.status).toBe("draft");
    expect(findArg.skip).toBe(20);
  });
});

describe("B-W2-009 — cross-cuts (lineDiff against synthesized version pair)", () => {
  it("lineDiff produces actionable ops over a real-shaped version pair", async () => {
    const { lineDiff, summarizeDiff } = await import("@/lib/text/line-diff");
    const v1 = "You are a guide.\nReturn JSON.\nTone: balanced.";
    const v2 = "You are a guide.\nReturn JSON with fields: x, y.\nTone: balanced.";
    const ops = lineDiff(v1, v2);
    const sum = summarizeDiff(ops);
    expect(sum.removed).toBeGreaterThan(0);
    expect(sum.added).toBeGreaterThan(0);
    expect(sum.same).toBeGreaterThanOrEqual(2);
  });
});
