/**
 * AuditLogService — append-only writes to the audit_logs table.
 *
 * SPEC-ARCH-AI-GOVERNANCE-V2 §4.6 declares AuditLog as IMMUTABLE
 * (no updatedAt; no UPDATE / DELETE permitted). This service deliberately
 * exposes only `append` so call sites cannot accidentally mutate or delete
 * audit history. Read APIs (Wave 2+ admin UI) consume `db.auditLog.findMany`
 * directly through their own service layer.
 *
 * Spec refs:
 *   - §4.6 — AuditLog model (cascade on actor user delete; LGPD intent)
 *   - §5.5 — read API contract for Wave 2+ admin UI
 *   - §7.7 — RBAC for audit log read (admin role only; not admin-ai)
 *
 * B-W1-004 — Sprint 46 Day 3.
 */
import "server-only";
import { Prisma } from "@prisma/client";
import type { AuditLog } from "@prisma/client";
import { db } from "@/server/db";

/**
 * Input shape for an audit-log entry. Mirrors the SPEC §4.6 schema.
 *
 *   - `action` is a free-form string but conventionally follows
 *     dot-notation: "prompt.create" | "prompt.promote" | "model.update" |
 *     "config.update" | "killswitch.toggle" | etc.
 *   - `entityType` is the Prisma model name being acted on:
 *     "PromptTemplate" | "PromptVersion" | "ModelAssignment" |
 *     "AiRuntimeConfig" | "AiKillSwitch".
 *   - `diffJson` SHOULD carry { before, after } for update actions; null for
 *     create/delete actions. Caller decides redaction (e.g. systemPrompt is
 *     replaced with `[REDACTED — see PromptVersion ${id}]` per SPEC §7.4).
 */
export interface AuditLogAppendInput {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  diffJson?: Prisma.InputJsonValue | null;
  ip?: string | null;
  userAgent?: string | null;
}

export class AuditLogService {
  /**
   * Append a new audit log entry. Returns the created row.
   *
   * Idempotency: NOT idempotent at the service level — every call inserts
   * a new row (id = fresh cuid). Caller is responsible for not double-firing.
   *
   * Failure: errors propagate. Audit log writes are part of the trust
   * boundary; silent fallback would defeat the purpose. Caller should
   * wrap in try/catch only when the audit failure is genuinely
   * non-fatal (rare).
   */
  static async append(input: AuditLogAppendInput): Promise<AuditLog> {
    return db.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        diffJson: input.diffJson ?? Prisma.JsonNull,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  }
}
