/**
 * Shared types for prompt-write validations (V-01..V-08 + W-01..W-04).
 *
 * SPEC-AI-GOVERNANCE-V2 §3.1 (blocking) and §3.2 (warnings).
 *
 * Each V-XX function is a pure (input → output) check. The orchestrator
 * `validateBlocking()` runs all 8 in order and aggregates errors so the
 * admin sees every failure on a single response (per SPEC §3 line 162:
 * "lista todas as falhas para reduzir retrabalho do admin").
 *
 * B-W2-003 — Sprint 46 Wave 2 task 3/9.
 */
import "server-only";

export type ModelType = "plan" | "checklist" | "guide";

/**
 * Optional metadata bag carried by create/update inputs. Validations that
 * are conditional on a metadata field (V-04 outputFormat=json, V-05
 * declared language) read from here. Absent fields skip those checks.
 */
export interface PromptValidationMetadata {
  outputFormat?: "json" | "markdown";
  jsonSchema?: unknown;
  language?: "pt-BR" | "en";
}

/**
 * Input shape for the validators. Mirrors `CreatePromptInput` /
 * `UpdatePromptInput` post-Zod-parse, plus metadata projection.
 */
export interface PromptValidationContext {
  systemPrompt: string;
  userTemplate: string;
  modelType: ModelType;
  metadata?: PromptValidationMetadata;
}

export type BlockingCode =
  | "V-01"
  | "V-02"
  | "V-03"
  | "V-04"
  | "V-05"
  | "V-06"
  | "V-07"
  | "V-08";

export type WarningCode = "W-01" | "W-02" | "W-03" | "W-04";

export interface ValidationFailure {
  code: BlockingCode | WarningCode;
  message: string;
  /** Optional location hint — e.g. "systemPrompt" or "userTemplate". */
  field?: "systemPrompt" | "userTemplate" | "metadata";
  /** Optional position hint (1-indexed line). */
  line?: number;
}

export type ValidationCheck<C extends BlockingCode | WarningCode> = (
  ctx: PromptValidationContext
) => ValidationFailure[] | null;

export interface ValidationResult {
  ok: boolean;
  errors: ValidationFailure[];
}
