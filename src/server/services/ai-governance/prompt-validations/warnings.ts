/**
 * W-01..W-04 — non-blocking warnings.
 *
 * SPEC-AI-GOVERNANCE-V2 §3.2:
 *   W-01  Optional placeholders not in the per-type schema
 *   W-02  Missing explicit output-format instruction in the prompt
 *   W-03  Missing language instruction in the system section
 *   W-04  Temperature > 1.0 declared on a deterministic prompt (guide/checklist)
 *
 * Warnings surface to the editor UI (B-W2-006) and to the API response —
 * admin can override and save. The orchestrator `validateWarnings()`
 * mirrors `validateBlocking()` (no short-circuit, aggregate every match).
 *
 * B-W2-004 — Sprint 46 Wave 2 task 4/9.
 */
import "server-only";
import type {
  PromptValidationContext,
  ValidationCheck,
  ValidationFailure,
  ValidationResult,
} from "./types";
import {
  REQUIRED_PLACEHOLDERS,
  FORBIDDEN_PLACEHOLDERS,
  extractPlaceholders,
} from "./placeholders";

// ─── W-01: Unknown optional placeholders ────────────────────────────────────
//
// SPEC-AI §2.2-2.4 lists OPTIONAL placeholders per type. Anything outside
// the union of (required ∪ optional) is a "you might have a typo" warn.
// Forbidden placeholders are caught by V-02, not W-01.

const OPTIONAL_PLACEHOLDERS: Record<
  PromptValidationContext["modelType"],
  string[]
> = {
  // §2.2 guide
  guide: [
    "budgetTotal",
    "budgetCurrency",
    "travelerType",
    "travelPace",
    "interests",
    "personalNotes",
    "siblingCities",
  ],
  // §2.3 plan
  plan: ["guideDigest", "destinations", "personalNotes"],
  // §2.4 checklist
  checklist: [
    "destinationFactsFromGuide",
    "itineraryHighlightsFromRoteiro",
    "logisticsFromPhase5",
    "userPrefs",
  ],
};

export const w01UnknownPlaceholders: ValidationCheck<"W-01"> = (ctx) => {
  const required = REQUIRED_PLACEHOLDERS[ctx.modelType] ?? [];
  const optional = OPTIONAL_PLACEHOLDERS[ctx.modelType] ?? [];
  const known = new Set([...required, ...optional]);

  const errors: ValidationFailure[] = [];
  for (const field of ["systemPrompt", "userTemplate"] as const) {
    for (const name of extractPlaceholders(ctx[field])) {
      // Forbidden placeholders are a V-02 hard block; do not double-report here.
      if (FORBIDDEN_PLACEHOLDERS.has(name)) continue;
      if (known.has(name)) continue;
      errors.push({
        code: "W-01",
        field,
        message: `Placeholder \`{${name}}\` não está listado no schema do tipo \`${ctx.modelType}\`. Confirme se é intencional`,
      });
    }
  }
  return errors.length > 0 ? errors : null;
};

// ─── W-02: Missing output-format instruction ────────────────────────────────
//
// Heuristic: detect at least one of the typical phrases that anchor an
// explicit format directive. SPEC §3.2 example: "Return JSON with fields:".

const OUTPUT_FORMAT_HINTS = [
  /return\s+json/i,
  /return\s+a\s+single\s+json/i,
  /respond\s+with\s+json/i,
  /respond\s+in\s+json/i,
  /respond\s+(only\s+)?in\s+markdown/i,
  /format\s*[:=]\s*(json|markdown)/i,
  /retorne\s+um\s+(?:único\s+)?objeto\s+json/i,
  /retorne\s+(?:em\s+)?(?:json|markdown)/i,
  /responda\s+(?:em|no formato)\s+(?:json|markdown)/i,
  /formato\s*[:=]\s*(?:json|markdown)/i,
];

export const w02OutputFormat: ValidationCheck<"W-02"> = (ctx) => {
  const combined = `${ctx.systemPrompt}\n\n${ctx.userTemplate}`;
  for (const re of OUTPUT_FORMAT_HINTS) {
    if (re.test(combined)) return null;
  }
  return [
    {
      code: "W-02",
      message:
        "Recomendado declarar formato de saída explicitamente (ex: 'Return JSON with fields: ...' ou 'Retorne em markdown')",
    },
  ];
};

// ─── W-03: Missing language instruction in system section ───────────────────
//
// We treat the system prompt as authoritative for language hints. If it
// mentions a language directive (English, Portuguese, "respond in <lang>",
// "{language}" placeholder), we accept; otherwise warn.

const LANGUAGE_HINTS = [
  /\b(respond|answer)\s+in\s+(english|portuguese|spanish|french)\b/i,
  /\b(?:in|em)\s+(?:portuguese|português|english|inglês)\b/i,
  /\bresponda\s+(?:em|na\s+língua)\s+/i,
  /\bidioma\s*[:=]\s*/i,
  /\{language\}/,
];

export const w03LanguageInstruction: ValidationCheck<"W-03"> = (ctx) => {
  for (const re of LANGUAGE_HINTS) {
    if (re.test(ctx.systemPrompt)) return null;
  }
  return [
    {
      code: "W-03",
      field: "systemPrompt",
      message:
        "Recomendado incluir instrução explícita de idioma na seção system (ex: 'Respond in {language}')",
    },
  ];
};

// ─── W-04: Temperature > 1.0 on deterministic prompts ───────────────────────
//
// Metadata-driven (soft floor). Activates only when ctx.metadata
// (extended for B-W2-004) carries a `temperature` value. modelType "guide"
// and "checklist" are deterministic per SPEC §3.2; "plan" is excluded.

export interface PromptValidationMetadataExtended {
  outputFormat?: "json" | "markdown";
  jsonSchema?: unknown;
  language?: "pt-BR" | "en";
  temperature?: number;
}

const DETERMINISTIC_TYPES = new Set<PromptValidationContext["modelType"]>([
  "guide",
  "checklist",
]);

export const w04Temperature: ValidationCheck<"W-04"> = (ctx) => {
  const meta = ctx.metadata as PromptValidationMetadataExtended | undefined;
  if (!meta || typeof meta.temperature !== "number") return null;
  if (!DETERMINISTIC_TYPES.has(ctx.modelType)) return null;
  if (meta.temperature <= 1.0) return null;
  return [
    {
      code: "W-04",
      field: "metadata",
      message: `Temperatura ${meta.temperature} > 1.0 declarada em prompt determinístico (${ctx.modelType}). Recomendado ≤ 1.0`,
    },
  ];
};

// ─── Orchestrator ───────────────────────────────────────────────────────────

const WARNING_CHECKS = [
  w01UnknownPlaceholders,
  w02OutputFormat,
  w03LanguageInstruction,
  w04Temperature,
];

export function validateWarnings(ctx: PromptValidationContext): ValidationResult {
  const errors: ValidationFailure[] = [];
  for (const check of WARNING_CHECKS) {
    const out = check(ctx);
    if (out && out.length > 0) errors.push(...out);
  }
  return { ok: errors.length === 0, errors };
}
