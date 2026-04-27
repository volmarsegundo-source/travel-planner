/**
 * V-03: template input ≤ 4000 tokens (heuristic ceil(chars / 3.5)).
 *
 * SPEC-AI-GOVERNANCE-V2 §3.1 V-03.
 *
 * The heuristic itself lives at `estimateTokenCount` here as an inline
 * implementation; B-W2-005 extracts it to a public helper at
 * `src/lib/ai/token-count.ts` and updates this file to import it.
 *
 * B-W2-003 — Sprint 46 Wave 2 task 3/9.
 */
import "server-only";
import type { ValidationCheck } from "./types";

export const TOKEN_BUDGET_MAX = 4000;

/**
 * Inline token-count heuristic. Returns ceil(chars / 3.5).
 *
 * Note: B-W2-005 turns this into the canonical helper. Until then, callers
 * outside this validation MUST NOT import it — the function is module-local
 * via a private name.
 */
function estimateTokenCount(text: string): number {
  if (typeof text !== "string" || text.length === 0) return 0;
  return Math.ceil(text.length / 3.5);
}

/**
 * V-03: combined input tokens (systemPrompt + userTemplate) must not exceed
 * the budget. Computed independently for each field so the error message
 * pinpoints which field is to blame.
 */
export const v03TokenBudget: ValidationCheck<"V-03"> = (ctx) => {
  const systemTokens = estimateTokenCount(ctx.systemPrompt);
  const userTokens = estimateTokenCount(ctx.userTemplate);
  const total = systemTokens + userTokens;
  if (total <= TOKEN_BUDGET_MAX) return null;
  return [
    {
      code: "V-03",
      message: `Template excede o orçamento de ${TOKEN_BUDGET_MAX} tokens (atual: ${total} = system ${systemTokens} + user ${userTokens})`,
    },
  ];
};
