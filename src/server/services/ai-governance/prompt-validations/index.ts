/**
 * Prompt-write blocking validations orchestrator.
 *
 * SPEC-AI-GOVERNANCE-V2 §3.1 — runs V-01..V-08 in order, AGGREGATES every
 * failure (does NOT short-circuit) so the admin sees all errors at once
 * and can fix them in a single round-trip.
 *
 * B-W2-003 — Sprint 46 Wave 2 task 3/9.
 *
 * Note: this module is independent of the runtime `PolicyEngine`
 * (`src/server/services/ai-governance/policy-engine.ts`) which gates
 * AI calls (kill-switch / rate-limit / cost-budget). These prompt-write
 * checks run on admin-edit, not on user-facing AI calls.
 */
import "server-only";
import type {
  PromptValidationContext,
  ValidationFailure,
  ValidationResult,
} from "./types";
import {
  v01RequiredPlaceholders,
  v02ForbiddenPlaceholders,
} from "./placeholders";
import { v03TokenBudget } from "./token-budget";
import { v04JsonOutputSchema } from "./json-schema";
import { v05LanguageDeclared } from "./language";
import {
  v06PiiDetection,
  v07ApiKeyDetection,
  v08InternalUrlDetection,
} from "./sensitive-content";

const BLOCKING_CHECKS = [
  v01RequiredPlaceholders,
  v02ForbiddenPlaceholders,
  v03TokenBudget,
  v04JsonOutputSchema,
  v05LanguageDeclared,
  v06PiiDetection,
  v07ApiKeyDetection,
  v08InternalUrlDetection,
];

/**
 * Run every V-XX check, aggregate failures.
 *
 * Returns `{ ok: true, errors: [] }` when ALL checks pass.
 * Returns `{ ok: false, errors: [...] }` with every failure surfaced.
 *
 * SPEC §3 line 162: "lista todas as falhas para reduzir retrabalho do admin"
 */
export function validateBlocking(ctx: PromptValidationContext): ValidationResult {
  const errors: ValidationFailure[] = [];
  for (const check of BLOCKING_CHECKS) {
    const out = check(ctx);
    if (out && out.length > 0) errors.push(...out);
  }
  return { ok: errors.length === 0, errors };
}

export {
  v01RequiredPlaceholders,
  v02ForbiddenPlaceholders,
  v03TokenBudget,
  v04JsonOutputSchema,
  v05LanguageDeclared,
  v06PiiDetection,
  v07ApiKeyDetection,
  v08InternalUrlDetection,
};
export {
  REQUIRED_PLACEHOLDERS,
  FORBIDDEN_PLACEHOLDERS,
  extractPlaceholders,
} from "./placeholders";
export { TOKEN_BUDGET_MAX } from "./token-budget";
export { detectLanguage } from "./language";
export type {
  ModelType,
  PromptValidationContext,
  PromptValidationMetadata,
  ValidationFailure,
  ValidationResult,
  BlockingCode,
  WarningCode,
} from "./types";
