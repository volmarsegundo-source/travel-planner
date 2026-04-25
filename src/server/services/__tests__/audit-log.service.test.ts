/**
 * B-W1-004 — AuditLogService unit tests.
 *
 * Asserts append-only surface + correct DB call shape per
 * SPEC-ARCH-AI-GOVERNANCE-V2 §4.6 (immutable model) + §5.5
 * (audit log read API, future Wave 2+).
 *
 * STATUS AT COMMIT: starts RED until service file is created.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { auditLogCreate, mockDb } = vi.hoisted(() => {
  const auditLogCreate = vi.fn().mockResolvedValue({
    id: "fake_cuid",
    actorUserId: "actor_user_id",
    action: "prompt.create",
    entityType: "PromptTemplate",
    entityId: "tpl_id",
    diffJson: null,
    ip: null,
    userAgent: null,
    createdAt: new Date(),
  });
  return {
    auditLogCreate,
    mockDb: { auditLog: { create: auditLogCreate } },
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@/server/db", () => ({ db: mockDb }));

describe("B-W1-004 — AuditLogService", () => {
  beforeEach(() => {
    auditLogCreate.mockClear();
  });

  it("exposes only an append method (append-only surface per SPEC §4.6)", async () => {
    const mod = await import("@/server/services/audit-log.service");
    expect(mod.AuditLogService).toBeDefined();
    expect(typeof mod.AuditLogService.append).toBe("function");
    // Disallowed surface — prove these are absent.
    expect(
      (mod.AuditLogService as unknown as Record<string, unknown>).update
    ).toBeUndefined();
    expect(
      (mod.AuditLogService as unknown as Record<string, unknown>).delete
    ).toBeUndefined();
    expect(
      (mod.AuditLogService as unknown as Record<string, unknown>).clear
    ).toBeUndefined();
  });

  it("append() forwards required fields to db.auditLog.create", async () => {
    const { AuditLogService } = await import(
      "@/server/services/audit-log.service"
    );
    await AuditLogService.append({
      actorUserId: "actor_user_id",
      action: "prompt.create",
      entityType: "PromptTemplate",
      entityId: "tpl_id",
    });

    expect(auditLogCreate).toHaveBeenCalledTimes(1);
    const arg = auditLogCreate.mock.calls[0]![0] as { data: Record<string, unknown> };
    expect(arg.data).toMatchObject({
      actorUserId: "actor_user_id",
      action: "prompt.create",
      entityType: "PromptTemplate",
      entityId: "tpl_id",
    });
  });

  it("append() persists optional ip and userAgent verbatim when provided", async () => {
    const { AuditLogService } = await import(
      "@/server/services/audit-log.service"
    );
    await AuditLogService.append({
      actorUserId: "u",
      action: "model.update",
      entityType: "ModelAssignment",
      entityId: "ma_id",
      ip: "1.2.3.4",
      userAgent: "Mozilla/5.0",
    });

    const arg = auditLogCreate.mock.calls[0]![0] as { data: Record<string, unknown> };
    expect(arg.data.ip).toBe("1.2.3.4");
    expect(arg.data.userAgent).toBe("Mozilla/5.0");
  });

  it("append() omits ip and userAgent when caller does not supply them", async () => {
    const { AuditLogService } = await import(
      "@/server/services/audit-log.service"
    );
    await AuditLogService.append({
      actorUserId: "u",
      action: "config.update",
      entityType: "AiRuntimeConfig",
      entityId: "cfg_id",
    });

    const arg = auditLogCreate.mock.calls[0]![0] as { data: Record<string, unknown> };
    // Either undefined or null is acceptable — the schema allows both.
    expect(arg.data.ip ?? null).toBeNull();
    expect(arg.data.userAgent ?? null).toBeNull();
  });

  it("append() forwards diffJson as a Prisma JSON value", async () => {
    const { AuditLogService } = await import(
      "@/server/services/audit-log.service"
    );
    const diff = {
      before: { value: "x", n: 1 },
      after: { value: "y", n: 2 },
    };
    await AuditLogService.append({
      actorUserId: "u",
      action: "config.update",
      entityType: "AiRuntimeConfig",
      entityId: "cfg_id",
      diffJson: diff,
    });

    const arg = auditLogCreate.mock.calls[0]![0] as {
      data: { diffJson: unknown };
    };
    expect(arg.data.diffJson).toEqual(diff);
  });

  it("append() returns the created row from the DB", async () => {
    const { AuditLogService } = await import(
      "@/server/services/audit-log.service"
    );
    const result = await AuditLogService.append({
      actorUserId: "u",
      action: "prompt.create",
      entityType: "PromptTemplate",
      entityId: "tpl_id",
    });
    expect(result.id).toBe("fake_cuid");
  });
});
