/**
 * Zod schemas for /api/admin/ai/prompts CRUD inputs.
 *
 * SPEC-ARCH-AI-GOVERNANCE-V2 §5.1 — request body / query params contracts.
 *
 * The schemas here cover SHAPE only. Content-level validations
 * (V-01..V-08 placeholder/PII/api-key/internal-url checks) live in
 * `src/server/services/ai-governance/prompt-validations/` (B-W2-003) and
 * run AFTER the Zod parse in the service layer.
 *
 * B-W2-001 — Sprint 46 Wave 2 task 1/9.
 */
import { z } from "zod";

/** SPEC §5.1 GET /api/admin/ai/prompts query params. */
export const ListPromptsQuerySchema = z.object({
  status: z.enum(["draft", "active", "archived"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type ListPromptsQuery = z.infer<typeof ListPromptsQuerySchema>;

const SLUG_RE = /^[a-z0-9-]{3,50}$/;
const MODEL_TYPE = ["plan", "checklist", "guide"] as const;

/** SPEC §5.1 POST /api/admin/ai/prompts body. */
export const CreatePromptSchema = z.object({
  slug: z.string().regex(SLUG_RE, {
    message: "slug must match /^[a-z0-9-]{3,50}$/",
  }),
  modelType: z.enum(MODEL_TYPE),
  systemPrompt: z.string().min(10).max(50000),
  userTemplate: z.string().min(10).max(50000),
  maxTokens: z.number().int().min(256).max(16384),
  cacheControl: z.boolean().optional().default(true),
  changeNote: z.string().max(500).optional(),
});

export type CreatePromptInput = z.infer<typeof CreatePromptSchema>;

/**
 * SPEC §5.1 PATCH /api/admin/ai/prompts/:id body.
 *
 * All fields optional. `changeNote` becomes mandatory when systemPrompt or
 * userTemplate changes — that conditional check lives in the service layer
 * because Zod cannot read DB state to compare against the active version.
 */
export const UpdatePromptSchema = z
  .object({
    systemPrompt: z.string().min(10).max(50000).optional(),
    userTemplate: z.string().min(10).max(50000).optional(),
    maxTokens: z.number().int().min(256).max(16384).optional(),
    cacheControl: z.boolean().optional(),
    changeNote: z.string().max(500).optional(),
  })
  .refine(
    (input) =>
      input.systemPrompt !== undefined ||
      input.userTemplate !== undefined ||
      input.maxTokens !== undefined ||
      input.cacheControl !== undefined,
    { message: "at least one field must be provided" }
  );

export type UpdatePromptInput = z.infer<typeof UpdatePromptSchema>;
