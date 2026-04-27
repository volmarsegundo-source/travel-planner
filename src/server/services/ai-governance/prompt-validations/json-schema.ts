/**
 * V-04: when `metadata.outputFormat === "json"`, the prompt config must
 * declare a Zod-parseable `metadata.jsonSchema`.
 *
 * SPEC-AI-GOVERNANCE-V2 §3.1 V-04.
 *
 * **Why metadata-driven and not first-class.** The current `PromptTemplate`
 * Zod schema (`src/lib/validations/prompt-admin.schema.ts`) does not yet
 * carry `outputFormat` or `jsonSchema` at the top level — they live in the
 * existing free-form `metadata` JSON column. This validation is ACTIVE only
 * when the caller opts in via metadata. A follow-up (Wave 4 or 5) will
 * promote the fields to first-class once the Wave 2 SPEC-PROD AC are
 * stable.
 *
 * Until that promotion, V-04 is a **soft floor**: present-and-valid
 * passes; absent-or-blank passes (admin chose markdown / no JSON contract);
 * present-but-malformed fails.
 *
 * B-W2-003 — Sprint 46 Wave 2 task 3/9.
 */
import "server-only";
import type { ValidationCheck } from "./types";

/**
 * Minimal "is this a Zod-shaped schema description?" check. We accept any
 * object whose top level is a non-null object (typically a JSON Schema or
 * a serialized Zod definition); if Zod is later wired in for runtime
 * parsing, this check tightens to `z.never()`-safe shapes.
 *
 * Reject: null, undefined, primitive types, empty object, arrays.
 */
function looksLikeSchema(value: unknown): boolean {
  if (value === null || typeof value !== "object") return false;
  if (Array.isArray(value)) return false;
  if (Object.keys(value as object).length === 0) return false;
  return true;
}

export const v04JsonOutputSchema: ValidationCheck<"V-04"> = (ctx) => {
  const meta = ctx.metadata;
  if (!meta || meta.outputFormat !== "json") return null;
  if (!looksLikeSchema(meta.jsonSchema)) {
    return [
      {
        code: "V-04",
        field: "metadata",
        message:
          "outputFormat=json declarado mas metadata.jsonSchema está ausente ou inválido (Zod-parseable shape esperado)",
      },
    ];
  }
  return null;
};
