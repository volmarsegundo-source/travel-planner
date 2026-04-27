/**
 * Token-count heuristic — `ceil(chars / 3.5)`.
 *
 * SPEC-AI-GOVERNANCE-V2 §3.1 V-03 specifies this fallback when the
 * `@anthropic-ai/tokenizer` package is unavailable for the active model.
 * The 3.5 ratio is the documented Anthropic rule of thumb for English /
 * Portuguese text; languages with denser tokens (CJK) over-estimate (safe
 * direction — V-03 is a budget gate).
 *
 * **Used by**:
 *   - V-03 token-budget validation (`prompt-validations/token-budget.ts`)
 *   - B-W2-008 preview panel (real-time count under the editor)
 *   - B-W2-006 editor (live status while typing)
 *
 * Pure function, no side effects, server-or-client safe (no `server-only`).
 *
 * B-W2-005 — Sprint 46 Wave 2 task 5/9.
 */

/**
 * Estimates token count for a UTF-16 string using `ceil(chars / 3.5)`.
 *
 *   - Empty / null / undefined input → 0
 *   - Non-string input → 0 (defensive; do not throw on type drift)
 *   - Multi-byte (CJK, emoji surrogates) counted by JS `.length` (UTF-16 units)
 *
 * The 3.5 divisor is the canonical heuristic from the Anthropic docs.
 * Returns are integers in the range [0, ceil(s.length / 3.5)].
 */
export function estimateTokenCount(text: string | null | undefined): number {
  if (typeof text !== "string" || text.length === 0) return 0;
  return Math.ceil(text.length / 3.5);
}

/**
 * Convenience: sum the heuristic across two fields. Used by the editor +
 * preview to display "system 120 + user 60 = 180 tokens" inline.
 */
export function estimateCombinedTokens(
  systemPrompt: string | null | undefined,
  userTemplate: string | null | undefined
): { systemTokens: number; userTokens: number; total: number } {
  const systemTokens = estimateTokenCount(systemPrompt);
  const userTokens = estimateTokenCount(userTemplate);
  return { systemTokens, userTokens, total: systemTokens + userTokens };
}
