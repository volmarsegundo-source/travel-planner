/**
 * PromptAdminService — service layer for /api/admin/ai/prompts CRUD.
 *
 * SPEC-ARCH-AI-GOVERNANCE-V2 §5.1 — endpoint contracts.
 * SPEC-AI-GOVERNANCE-V2 §3.3 — every save creates an audit log entry.
 * SPEC-ARCH-AI-GOVERNANCE-V2 §7.4 — diff redaction (systemPrompt/userTemplate
 * never appear verbatim in audit_logs.diffJson; the version id is the
 * pointer instead).
 *
 * **Scope of this commit (B-W2-001).**
 * Implements list/create/update plumbing with audit-log integration. The
 * semver patch bump is delegated to `bumpSemverPatch()` — currently a stub
 * returning `"1.0.1"` for any input. B-W2-002 replaces the stub with the
 * real `major.minor.patch + 1` arithmetic and adds the immutability
 * regression guards on PromptVersion.
 *
 * Content-level validations (V-01..V-08 placeholders/PII/api-key/internal-url)
 * land in B-W2-003 and will be invoked at the top of `create`/`update`
 * AFTER the Zod parse but BEFORE the DB transaction.
 *
 * B-W2-001 — Sprint 46 Wave 2 task 1/9.
 */
import "server-only";
import type { Prisma } from "@prisma/client";

import { db } from "@/server/db";
import { AuditLogService } from "@/server/services/audit-log.service";
import {
  validateBlocking,
  type PromptValidationContext,
  type ValidationFailure,
} from "@/server/services/ai-governance/prompt-validations";
import type {
  CreatePromptInput,
  UpdatePromptInput,
} from "@/lib/validations/prompt-admin.schema";

// ─── Errors ─────────────────────────────────────────────────────────────────

export type PromptAdminErrorCode =
  | "SLUG_TAKEN"
  | "NOT_FOUND"
  | "CHANGE_NOTE_REQUIRED"
  | "NO_OP"
  | "VALIDATION_FAILED";

export class PromptAdminError extends Error {
  readonly code: PromptAdminErrorCode;
  /** Populated for code=VALIDATION_FAILED only — the aggregate of V-XX failures. */
  readonly validationErrors?: ValidationFailure[];
  constructor(
    code: PromptAdminErrorCode,
    message: string,
    validationErrors?: ValidationFailure[]
  ) {
    super(message);
    this.name = "PromptAdminError";
    this.code = code;
    this.validationErrors = validationErrors;
  }
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ActorContext {
  actorUserId: string;
  ip?: string | null;
  userAgent?: string | null;
}

export interface ListPromptsArgs {
  status?: "draft" | "active" | "archived";
  page: number;
  limit: number;
}

export interface ListPromptsRow {
  id: string;
  slug: string;
  status: string;
  modelType: string;
  activeVersionId: string | null;
  activeVersionTag: string | null;
  versionsCount: number;
  lastEvalTrustScore: number | null;
  createdBy: { id: string; name: string } | null;
  approvedBy: { id: string; name: string } | null;
  approvedAt: string | null;
  updatedAt: string;
}

export interface ListPromptsResult {
  data: ListPromptsRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreatePromptResult {
  id: string;
  slug: string;
  versionId: string;
  versionTag: string;
}

export interface UpdatePromptResult {
  id: string;
  newVersionId: string;
  newVersionTag: string;
}

// ─── Semver bump (B-W2-002) ─────────────────────────────────────────────────

/**
 * Strict semver patch bump for `PromptVersion.versionTag`.
 *
 * Accepts ONLY canonical `major.minor.patch` strings where each component
 * is a non-negative integer with no leading zero (except the literal "0").
 * Rejects everything else — null/undefined, empty, four-component, prefixed
 * (`v1.0.0`), negative, leading zeros, and any value that would push the
 * patch component past `Number.MAX_SAFE_INTEGER`.
 *
 * Increments only the patch component; major and minor are preserved
 * verbatim. This matches SPEC-TECHLEAD §3 Wave 2 ("auto-increment de versão
 * — semver patch bump") and the execution-plan §B.2 B-W2-002 contract.
 *
 * Throws `PromptAdminError("NO_OP", ...)` on malformed input. Callers
 * (PromptAdminService.create/update) treat this as a 400-class failure
 * because it indicates corrupted version state in the DB rather than a
 * client mistake.
 */
const SEMVER_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export function bumpSemverPatch(prev: string | null | undefined): string {
  if (typeof prev !== "string" || prev.length === 0) {
    throw new PromptAdminError(
      "NO_OP",
      "bumpSemverPatch: previous tag must be a non-empty string"
    );
  }
  const match = prev.match(SEMVER_RE);
  if (!match) {
    throw new PromptAdminError(
      "NO_OP",
      `bumpSemverPatch: "${prev}" is not canonical semver (expected major.minor.patch with non-negative integers, no leading zeros)`
    );
  }
  const major = match[1];
  const minor = match[2];
  const patch = Number(match[3]);
  if (!Number.isSafeInteger(patch) || patch + 1 > Number.MAX_SAFE_INTEGER) {
    throw new PromptAdminError(
      "NO_OP",
      `bumpSemverPatch: patch component overflow on "${prev}"`
    );
  }
  return `${major}.${minor}.${patch + 1}`;
}

// ─── Service ────────────────────────────────────────────────────────────────

export class PromptAdminService {
  static async list(args: ListPromptsArgs): Promise<ListPromptsResult> {
    const where: Prisma.PromptTemplateWhereInput = {};
    if (args.status) where.status = args.status;

    const skip = (args.page - 1) * args.limit;

    const [rows, total] = await Promise.all([
      db.promptTemplate.findMany({
        where,
        skip,
        take: args.limit,
        orderBy: { updatedAt: "desc" },
        include: {
          createdBy: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
          _count: { select: { versions: true } },
          versions: {
            where: {},
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { versionTag: true },
          },
        },
      }),
      db.promptTemplate.count({ where }),
    ]);

    type Row = (typeof rows)[number] & {
      createdBy: { id: string; name: string | null } | null;
      approvedBy: { id: string; name: string | null } | null;
      _count: { versions: number };
      versions: { versionTag: string }[];
    };

    const data: ListPromptsRow[] = (rows as Row[]).map((r) => ({
      id: r.id,
      slug: r.slug,
      status: r.status,
      modelType: r.modelType,
      activeVersionId: r.activeVersionId ?? null,
      activeVersionTag: r.versions[0]?.versionTag ?? null,
      versionsCount: r._count.versions,
      lastEvalTrustScore: null,
      createdBy: r.createdBy
        ? { id: r.createdBy.id, name: r.createdBy.name ?? "" }
        : null,
      approvedBy: r.approvedBy
        ? { id: r.approvedBy.id, name: r.approvedBy.name ?? "" }
        : null,
      approvedAt: r.approvedAt ? r.approvedAt.toISOString() : null,
      updatedAt: r.updatedAt.toISOString(),
    }));

    return {
      data,
      pagination: {
        page: args.page,
        limit: args.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / args.limit)),
      },
    };
  }

  static async create(
    input: CreatePromptInput,
    ctx: ActorContext
  ): Promise<CreatePromptResult> {
    const validation = validateBlocking({
      systemPrompt: input.systemPrompt,
      userTemplate: input.userTemplate,
      modelType: input.modelType,
      // CreatePromptSchema has no metadata field yet — V-04/V-05 skip.
    } as PromptValidationContext);
    if (!validation.ok) {
      throw new PromptAdminError(
        "VALIDATION_FAILED",
        `prompt content failed ${validation.errors.length} blocking validation(s)`,
        validation.errors
      );
    }

    const existing = await db.promptTemplate.findUnique({
      where: { slug: input.slug },
      select: { id: true },
    });
    if (existing) {
      throw new PromptAdminError(
        "SLUG_TAKEN",
        `slug "${input.slug}" is already in use`
      );
    }

    const initialTag = "1.0.0";

    const result = await db.$transaction(async (tx) => {
      const txDb = tx as unknown as typeof db;

      const tpl = await txDb.promptTemplate.create({
        data: {
          slug: input.slug,
          modelType: input.modelType,
          systemPrompt: input.systemPrompt,
          userTemplate: input.userTemplate,
          maxTokens: input.maxTokens,
          cacheControl: input.cacheControl ?? true,
          version: initialTag,
          status: "draft",
          createdById: ctx.actorUserId,
        },
      });

      const ver = await txDb.promptVersion.create({
        data: {
          promptTemplateId: tpl.id,
          versionTag: initialTag,
          systemPrompt: input.systemPrompt,
          userTemplate: input.userTemplate,
          maxTokens: input.maxTokens,
          cacheControl: input.cacheControl ?? true,
          modelType: input.modelType,
          changeNote: input.changeNote ?? null,
          createdById: ctx.actorUserId,
        },
      });

      await txDb.promptTemplate.update({
        where: { id: tpl.id },
        data: { activeVersionId: ver.id },
      });

      return { tpl, ver };
    });

    await AuditLogService.append({
      actorUserId: ctx.actorUserId,
      action: "prompt.create",
      entityType: "PromptTemplate",
      entityId: result.tpl.id,
      diffJson: {
        before: null,
        after: {
          slug: input.slug,
          modelType: input.modelType,
          maxTokens: input.maxTokens,
          cacheControl: input.cacheControl ?? true,
          versionTag: result.ver.versionTag,
          versionId: result.ver.id,
          changeNote: input.changeNote ?? null,
          systemPrompt: `[REDACTED — see PromptVersion ${result.ver.id}]`,
          userTemplate: `[REDACTED — see PromptVersion ${result.ver.id}]`,
        },
      },
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    });

    return {
      id: result.tpl.id,
      slug: result.tpl.slug,
      versionId: result.ver.id,
      versionTag: result.ver.versionTag,
    };
  }

  static async update(
    id: string,
    input: UpdatePromptInput,
    ctx: ActorContext
  ): Promise<UpdatePromptResult> {
    const tpl = await db.promptTemplate.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        modelType: true,
        systemPrompt: true,
        userTemplate: true,
        maxTokens: true,
        cacheControl: true,
        activeVersionId: true,
      },
    });
    if (!tpl) {
      throw new PromptAdminError("NOT_FOUND", `template ${id} not found`);
    }

    const contentChanged =
      input.systemPrompt !== undefined || input.userTemplate !== undefined;

    if (contentChanged && !input.changeNote) {
      throw new PromptAdminError(
        "CHANGE_NOTE_REQUIRED",
        "changeNote is required when systemPrompt or userTemplate is modified"
      );
    }

    const previousVersion = await db.promptVersion.findFirst({
      where: { promptTemplateId: id },
      orderBy: { createdAt: "desc" },
      select: { id: true, versionTag: true },
    });

    const prevTag = previousVersion?.versionTag ?? "1.0.0";
    const newTag = bumpSemverPatch(prevTag);

    const newSystemPrompt = input.systemPrompt ?? tpl.systemPrompt;
    const newUserTemplate = input.userTemplate ?? tpl.userTemplate;
    const newMaxTokens = input.maxTokens ?? tpl.maxTokens;
    const newCacheControl =
      input.cacheControl ?? tpl.cacheControl;

    // V-01..V-08 run on the merged content (post-merge, pre-DB-write).
    const validation = validateBlocking({
      systemPrompt: newSystemPrompt,
      userTemplate: newUserTemplate,
      modelType: tpl.modelType as PromptValidationContext["modelType"],
    });
    if (!validation.ok) {
      throw new PromptAdminError(
        "VALIDATION_FAILED",
        `prompt content failed ${validation.errors.length} blocking validation(s)`,
        validation.errors
      );
    }

    const result = await db.$transaction(async (tx) => {
      const txDb = tx as unknown as typeof db;

      const ver = await txDb.promptVersion.create({
        data: {
          promptTemplateId: id,
          versionTag: newTag,
          systemPrompt: newSystemPrompt,
          userTemplate: newUserTemplate,
          maxTokens: newMaxTokens,
          cacheControl: newCacheControl,
          modelType: tpl.modelType,
          changeNote: input.changeNote ?? null,
          createdById: ctx.actorUserId,
        },
      });

      await txDb.promptTemplate.update({
        where: { id },
        data: {
          systemPrompt: newSystemPrompt,
          userTemplate: newUserTemplate,
          maxTokens: newMaxTokens,
          cacheControl: newCacheControl,
          version: newTag,
        },
      });

      return { ver };
    });

    await AuditLogService.append({
      actorUserId: ctx.actorUserId,
      action: "prompt.update",
      entityType: "PromptTemplate",
      entityId: id,
      diffJson: {
        before: {
          versionId: previousVersion?.id ?? null,
          versionTag: prevTag,
          maxTokens: tpl.maxTokens,
          cacheControl: tpl.cacheControl,
          systemPrompt: previousVersion
            ? `[REDACTED — see PromptVersion ${previousVersion.id}]`
            : null,
          userTemplate: previousVersion
            ? `[REDACTED — see PromptVersion ${previousVersion.id}]`
            : null,
        },
        after: {
          versionId: result.ver.id,
          versionTag: newTag,
          maxTokens: newMaxTokens,
          cacheControl: newCacheControl,
          changeNote: input.changeNote ?? null,
          systemPrompt: `[REDACTED — see PromptVersion ${result.ver.id}]`,
          userTemplate: `[REDACTED — see PromptVersion ${result.ver.id}]`,
        },
      },
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    });

    return {
      id,
      newVersionId: result.ver.id,
      newVersionTag: newTag,
    };
  }
}
