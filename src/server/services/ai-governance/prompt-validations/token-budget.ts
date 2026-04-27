/**
 * V-03: template input ≤ 4000 tokens (heuristic ceil(chars / 3.5)).
 *
 * SPEC-AI-GOVERNANCE-V2 §3.1 V-03.
 *
 * The token-count helper lives at `src/lib/ai/token-count.ts` (B-W2-005)
 * so the editor (B-W2-006) and the preview panel (B-W2-008) can share it.
 *
 * B-W2-003 — Sprint 46 Wave 2 task 3/9.
 */
import "server-only";
import { estimateTokenCount } from "@/lib/ai/token-count";
import type { ValidationCheck } from "./types";

export const TOKEN_BUDGET_MAX = 4000;

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
