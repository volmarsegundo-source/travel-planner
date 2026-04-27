/**
 * V-01 (required placeholders) and V-02 (forbidden placeholders).
 *
 * SPEC-AI-GOVERNANCE-V2 §2.1 — extraction regex `/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g`.
 * Escaped placeholders `{{literal}}` are ignored (they render as literal `{literal}`).
 *
 * §2.2-2.4 enumerate the required per-type placeholder set; §2.5 enumerates
 * the forbidden set (PII / secrets / internal URLs).
 *
 * B-W2-003 — Sprint 46 Wave 2 task 3/9.
 */
import "server-only";
import type {
  ModelType,
  PromptValidationContext,
  ValidationCheck,
  ValidationFailure,
} from "./types";

/** Canonical placeholder extractor — matches SPEC §2.1. */
const PLACEHOLDER_RE = /\{([a-zA-Z][a-zA-Z0-9_]*)\}/g;

/**
 * Extracts placeholder names from a template, ignoring escaped `{{name}}`.
 * Doubled braces are eliminated first so the canonical regex sees only
 * single-brace tokens.
 */
export function extractPlaceholders(template: string): string[] {
  // Replace `{{...}}` with a sentinel that contains no braces, so the
  // single-brace regex below cannot match across them.
  const stripped = template.replace(/\{\{[^{}]*\}\}/g, "ESCAPED");
  const out = new Set<string>();
  for (const match of stripped.matchAll(PLACEHOLDER_RE)) {
    out.add(match[1]!);
  }
  return [...out];
}

/** Per-type required placeholders — SPEC §2.2/2.3/2.4. */
export const REQUIRED_PLACEHOLDERS: Record<ModelType, string[]> = {
  guide: [
    "destination",
    "originCity",
    "days",
    "startDate",
    "endDate",
    "passengers",
    "travelStyle",
    "language",
  ],
  plan: [
    "destination",
    "days",
    "startDate",
    "endDate",
    "dailyPace",
    "preferences",
    "travelers",
    "language",
    "budgetTotal",
    "budgetCurrency",
    "tokenBudget",
  ],
  checklist: [
    "destination",
    "tripType",
    "departureDays",
    "dates",
    "travelers",
    "language",
  ],
};

/** Forbidden placeholders — SPEC §2.5. PII / secrets / internal URLs. */
export const FORBIDDEN_PLACEHOLDERS = new Set<string>([
  // PII
  "userEmail",
  "userId",
  "email",
  "phone",
  "passport",
  "cpf",
  // Secrets
  "apiKey",
  "secret",
  "token",
  "anthropicApiKey",
  "googleAiApiKey",
  // Internal URLs
  "internalUrl",
  "databaseUrl",
  "redisUrl",
]);

/**
 * V-01: every required placeholder for the type must appear at least once
 * across systemPrompt OR userTemplate.
 */
export const v01RequiredPlaceholders: ValidationCheck<"V-01"> = (ctx) => {
  const required = REQUIRED_PLACEHOLDERS[ctx.modelType];
  if (!required) {
    // Defensive: unknown modelType. Treat as a hard fail to avoid silent skip.
    return [
      {
        code: "V-01",
        message: `unknown modelType "${ctx.modelType}" — no required-placeholder schema`,
      },
    ];
  }

  const present = new Set([
    ...extractPlaceholders(ctx.systemPrompt),
    ...extractPlaceholders(ctx.userTemplate),
  ]);

  const missing = required.filter((name) => !present.has(name));
  if (missing.length === 0) return null;
  return [
    {
      code: "V-01",
      message: `Faltam placeholders obrigatórios: ${missing
        .map((n) => `\`{${n}}\``)
        .join(", ")}`,
    },
  ];
};

/**
 * V-02: no placeholder name may be in the forbidden set. Checks BOTH the
 * systemPrompt and userTemplate; reports each occurrence so admin can
 * locate them all on first response.
 */
export const v02ForbiddenPlaceholders: ValidationCheck<"V-02"> = (ctx) => {
  const errors: ValidationFailure[] = [];
  const fields = [
    { field: "systemPrompt" as const, value: ctx.systemPrompt },
    { field: "userTemplate" as const, value: ctx.userTemplate },
  ];
  for (const { field, value } of fields) {
    for (const name of extractPlaceholders(value)) {
      if (FORBIDDEN_PLACEHOLDERS.has(name)) {
        errors.push({
          code: "V-02",
          field,
          message: `Placeholder proibido detectado: \`{${name}}\` (PII / segredos / URL interna nunca devem atravessar o contexto do modelo)`,
        });
      }
    }
  }
  return errors.length > 0 ? errors : null;
};
