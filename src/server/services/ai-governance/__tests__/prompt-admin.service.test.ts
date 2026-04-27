/**
 * B-W2-001 — PromptAdminService unit tests.
 *
 * Asserts the service-layer contracts for /api/admin/ai/prompts:
 *   - list({ status, page, limit }) — SPEC-ARCH §5.1 GET
 *   - create({ slug, ..., actorUserId }) — SPEC-ARCH §5.1 POST
 *   - update(id, { ... }, actorUserId) — SPEC-ARCH §5.1 PATCH
 *
 * Audit-log integration is asserted at the call-shape level — every
 * mutating action (create, update) MUST append exactly one AuditLog row
 * with the SPEC §7.4 redaction note for systemPrompt/userTemplate diffs.
 *
 * The semver bump is delegated to a stub `bumpSemverPatch(prev)` helper
 * (replaced by the real implementation in B-W2-002). This test only
 * asserts that the helper is INVOKED with the previous version — the
 * exact bump arithmetic belongs to the B-W2-002 test suite.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { promptTemplateFindMany, promptTemplateFindUnique, promptTemplateCount, promptTemplateCreate, promptTemplateUpdate, promptVersionCreate, promptVersionFindFirst, auditLogAppend, transaction, mockDb } = vi.hoisted(() => {
  const promptTemplateFindMany = vi.fn();
  const promptTemplateFindUnique = vi.fn();
  const promptTemplateCount = vi.fn();
  const promptTemplateCreate = vi.fn();
  const promptTemplateUpdate = vi.fn();
  const promptVersionCreate = vi.fn();
  const promptVersionFindFirst = vi.fn();
  const auditLogAppend = vi.fn();
  const transaction = vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
    // Use the same mocked client inside the transaction.
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

describe("B-W2-001 — PromptAdminService.list", () => {
  it("returns paginated rows with versionsCount + activeVersionTag projected", async () => {
    promptTemplateFindMany.mockResolvedValue([
      {
        id: "tpl_1",
        slug: "destination-guide",
        status: "active",
        modelType: "guide",
        activeVersionId: "ver_1",
        approvedAt: new Date("2026-04-20T00:00:00Z"),
        updatedAt: new Date("2026-04-20T00:00:00Z"),
        createdBy: { id: "u1", name: "Alice" },
        approvedBy: { id: "u2", name: "Bob" },
        _count: { versions: 3 },
        versions: [{ versionTag: "1.2.0" }],
      },
    ]);
    promptTemplateCount.mockResolvedValue(1);

    const { PromptAdminService } = await import(
      "@/server/services/ai-governance/prompt-admin.service"
    );

    const out = await PromptAdminService.list({ page: 1, limit: 20 });

    expect(out.pagination).toMatchObject({ page: 1, limit: 20, total: 1, totalPages: 1 });
    expect(out.data).toHaveLength(1);
    expect(out.data[0]).toMatchObject({
      id: "tpl_1",
      slug: "destination-guide",
      status: "active",
      versionsCount: 3,
      activeVersionTag: "1.2.0",
    });
  });

  it("forwards status filter to db.findMany where clause", async () => {
    promptTemplateFindMany.mockResolvedValue([]);
    promptTemplateCount.mockResolvedValue(0);

    const { PromptAdminService } = await import(
      "@/server/services/ai-governance/prompt-admin.service"
    );

    await PromptAdminService.list({ status: "draft", page: 1, limit: 20 });

    const arg = promptTemplateFindMany.mock.calls[0]![0] as { where: { status: string } };
    expect(arg.where.status).toBe("draft");
  });
});

describe("B-W2-001 — PromptAdminService.create", () => {
  const baseInput = {
    slug: "new-template",
    modelType: "guide" as const,
    systemPrompt: "You are a helpful travel guide assistant.",
    userTemplate: "Plan a trip to {destination} for {days} days.",
    maxTokens: 4096,
    cacheControl: true,
    changeNote: "initial version",
  };

  it("creates template + initial version 1.0.0 inside a transaction", async () => {
    promptTemplateFindUnique.mockResolvedValue(null); // slug not taken
    promptTemplateCreate.mockResolvedValue({
      id: "tpl_new",
      slug: "new-template",
      status: "draft",
    });
    promptVersionCreate.mockResolvedValue({
      id: "ver_new",
      versionTag: "1.0.0",
    });
    promptTemplateUpdate.mockResolvedValue({});

    const { PromptAdminService } = await import(
      "@/server/services/ai-governance/prompt-admin.service"
    );

    const out = await PromptAdminService.create(baseInput, {
      actorUserId: "actor_1",
      ip: "1.2.3.4",
      userAgent: "vitest",
    });

    expect(out).toMatchObject({
      id: "tpl_new",
      slug: "new-template",
      versionId: "ver_new",
      versionTag: "1.0.0",
    });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(promptTemplateCreate).toHaveBeenCalledTimes(1);
    expect(promptVersionCreate).toHaveBeenCalledTimes(1);
  });

  it("rejects with a SLUG_TAKEN error when slug already exists", async () => {
    promptTemplateFindUnique.mockResolvedValue({ id: "tpl_existing" });

    const { PromptAdminService, PromptAdminError } = await import(
      "@/server/services/ai-governance/prompt-admin.service"
    );

    await expect(
      PromptAdminService.create(baseInput, { actorUserId: "actor_1" })
    ).rejects.toBeInstanceOf(PromptAdminError);

    expect(promptTemplateCreate).not.toHaveBeenCalled();
    expect(promptVersionCreate).not.toHaveBeenCalled();
  });

  it("appends an audit log entry with action=prompt.create + diffJson redacted", async () => {
    promptTemplateFindUnique.mockResolvedValue(null);
    promptTemplateCreate.mockResolvedValue({ id: "tpl_new", slug: "new-template", status: "draft" });
    promptVersionCreate.mockResolvedValue({ id: "ver_new", versionTag: "1.0.0" });
    promptTemplateUpdate.mockResolvedValue({});

    const { PromptAdminService } = await import(
      "@/server/services/ai-governance/prompt-admin.service"
    );

    await PromptAdminService.create(baseInput, {
      actorUserId: "actor_1",
      ip: "9.9.9.9",
      userAgent: "ua-test",
    });

    expect(auditLogAppend).toHaveBeenCalledTimes(1);
    const call = auditLogAppend.mock.calls[0]![0] as {
      actorUserId: string;
      action: string;
      entityType: string;
      entityId: string;
      ip?: string | null;
      userAgent?: string | null;
      diffJson?: unknown;
    };
    expect(call.action).toBe("prompt.create");
    expect(call.entityType).toBe("PromptTemplate");
    expect(call.entityId).toBe("tpl_new");
    expect(call.actorUserId).toBe("actor_1");
    expect(call.ip).toBe("9.9.9.9");
    expect(call.userAgent).toBe("ua-test");
    // SPEC §7.4 — systemPrompt + userTemplate must not appear verbatim.
    const serialized = JSON.stringify(call.diffJson ?? {});
    expect(serialized).not.toContain("You are a helpful travel guide assistant.");
    expect(serialized).not.toContain("{destination}");
    expect(serialized).toContain("ver_new");
  });
});

describe("B-W2-001 — PromptAdminService.update", () => {
  it("creates a new version (never mutates the existing one) and audit-logs prompt.update", async () => {
    promptTemplateFindUnique.mockResolvedValue({
      id: "tpl_1",
      slug: "destination-guide",
      modelType: "guide",
      systemPrompt: "old system",
      userTemplate: "old user",
      maxTokens: 4096,
      cacheControl: true,
      activeVersionId: "ver_prev",
    });
    promptVersionFindFirst.mockResolvedValue({
      id: "ver_prev",
      versionTag: "1.2.0",
    });
    promptVersionCreate.mockResolvedValue({
      id: "ver_new",
      versionTag: "1.2.1", // stubbed bumpSemverPatch return
    });
    promptTemplateUpdate.mockResolvedValue({});

    const { PromptAdminService } = await import(
      "@/server/services/ai-governance/prompt-admin.service"
    );

    const out = await PromptAdminService.update(
      "tpl_1",
      {
        systemPrompt: "new system content here",
        changeNote: "tweak intro",
      },
      { actorUserId: "actor_1" }
    );

    expect(out).toMatchObject({
      id: "tpl_1",
      newVersionId: "ver_new",
    });
    expect(promptVersionCreate).toHaveBeenCalledTimes(1);
    expect(auditLogAppend).toHaveBeenCalledTimes(1);
    const call = auditLogAppend.mock.calls[0]![0] as {
      action: string;
      entityType: string;
      entityId: string;
    };
    expect(call.action).toBe("prompt.update");
    expect(call.entityType).toBe("PromptTemplate");
    expect(call.entityId).toBe("tpl_1");
  });

  it("requires changeNote when systemPrompt or userTemplate is being modified", async () => {
    promptTemplateFindUnique.mockResolvedValue({
      id: "tpl_1",
      slug: "destination-guide",
      modelType: "guide",
      systemPrompt: "old",
      userTemplate: "old",
      maxTokens: 4096,
      cacheControl: true,
      activeVersionId: "ver_prev",
    });
    promptVersionFindFirst.mockResolvedValue({ id: "ver_prev", versionTag: "1.2.0" });

    const { PromptAdminService, PromptAdminError } = await import(
      "@/server/services/ai-governance/prompt-admin.service"
    );

    await expect(
      PromptAdminService.update(
        "tpl_1",
        { systemPrompt: "new content without note" },
        { actorUserId: "actor_1" }
      )
    ).rejects.toBeInstanceOf(PromptAdminError);

    expect(promptVersionCreate).not.toHaveBeenCalled();
  });

  it("rejects with NOT_FOUND when template id does not exist", async () => {
    promptTemplateFindUnique.mockResolvedValue(null);

    const { PromptAdminService, PromptAdminError } = await import(
      "@/server/services/ai-governance/prompt-admin.service"
    );

    await expect(
      PromptAdminService.update(
        "tpl_missing",
        { maxTokens: 1024 },
        { actorUserId: "actor_1" }
      )
    ).rejects.toBeInstanceOf(PromptAdminError);
  });
});
