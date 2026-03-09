/**
 * Prompt injection detection guard.
 *
 * Scans user-provided text inputs for common prompt injection patterns
 * before they are included in AI prompts. Returns a sanitized version
 * of the text or throws if a high-confidence injection is detected.
 *
 * Supports patterns in English and Brazilian Portuguese (pt-BR).
 * Applies NFKD normalization before regex checks to prevent Unicode bypass.
 *
 * @version 2.0.0
 * @see docs/prompts/OPTIMIZATION-BACKLOG.md (OPT-002)
 */

import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { maskPII } from "@/lib/prompts/pii-masker";

// ─── Injection Patterns ──────────────────────────────────────────────────────

/**
 * High-confidence patterns: very likely injection attempts.
 * Match triggers immediate rejection.
 */
const HIGH_CONFIDENCE_PATTERNS: readonly RegExp[] = [
  // Direct role override attempts (EN)
  /\bignore\s+(all\s+)?previous\s+(instructions?|prompts?|rules?)\b/i,
  /\byou\s+are\s+now\b/i,
  /\bact\s+as\s+(a\s+)?different\b/i,
  /\bnew\s+instructions?\s*:/i,

  // Refined "system:" pattern — only matches when followed by injection-like keywords
  // to avoid false positives like "transit system: Tokyo" (FIND-S16-003)
  /\bsystem\s*:\s*(?:override|ignore|new|you\s+are|act\s+as|reset|forget|disregard)/i,

  // Delimiter/boundary injection
  /```\s*system\b/i,
  /<\/?system>/i,
  /<\/?instructions?>/i,
  /<\/?prompt>/i,

  // Direct prompt extraction (EN)
  /\brepeat\s+(your|the)\s+(system\s+)?(prompt|instructions?)\b/i,
  /\bshow\s+(me\s+)?(your|the)\s+(system\s+)?(prompt|instructions?)\b/i,
  /\bwhat\s+(are|is)\s+your\s+(system\s+)?(prompt|instructions?)\b/i,

  // Jailbreak patterns
  /\bDAN\s+mode\b/i,
  /\bdeveloper\s+mode\b/i,
  /\bjailbreak\b/i,

  // ─── Brazilian Portuguese high-confidence patterns (FIND-S16-001) ──────────
  // NOTE: All pt-BR patterns use ASCII-only base characters because
  // normalizeText() strips combining marks after NFKD decomposition.
  // e.g., "ç" → "c", "ã" → "a", "ê" → "e", "é" → "e"

  // "ignore as instruções anteriores" / "ignore instruções anteriores"
  /\bignor[ea]\s+(as\s+)?instrucoes?\s+anteriores?\b/i,

  // "você agora é" / "voce agora e"
  /\bvoce\s+agora\s+e\b/i,

  // "novas instruções:" / "nova instrução:"
  /\bnovas?\s+instruca?o?e?s?\s*:/i,

  // "repita o prompt do sistema" / "repita as instruções do sistema"
  /\brepita\s+(o\s+|as?\s+)?(prompt|instrucoes?)\s+(do\s+)?sistema\b/i,

  // "mostre o prompt" / "mostre as instruções"
  /\bmostre\s+(me\s+)?(o\s+|as?\s+)?(prompt|instrucoes?)\b/i,

  // "aja como" (act as)
  /\baja\s+como\s+(um\s+)?diferente\b/i,
];

/**
 * Medium-confidence patterns: suspicious but could be legitimate in travel context.
 * Logged as warnings but not rejected unless combined with high-confidence.
 */
const MEDIUM_CONFIDENCE_PATTERNS: readonly RegExp[] = [
  /\bforget\s+(everything|all|what)\b/i,
  /\bdisregard\b/i,
  /\boverride\b/i,
  /\bdo\s+not\s+follow\b/i,
  /\bpretend\s+(you\s+are|to\s+be)\b/i,

  // pt-BR medium-confidence (ASCII-only after NFKD + combining mark removal)
  /\besqueca\s+tudo\b/i,
  /\bdesconsidere\b/i,
  /\bfinja\s+(que\s+)?(voce\s+)?e\b/i,
];

// ─── Cyrillic Homoglyph Transliteration (T-S17-008) ─────────────────────────

/**
 * Maps common Cyrillic characters that visually resemble Latin letters
 * to their Latin equivalents. These survive NFKD normalization because
 * they are distinct Unicode codepoints, not composed characters.
 *
 * Only applied to the normalized copy used for detection — the original
 * text is never modified.
 */
const CYRILLIC_HOMOGLYPH_MAP: ReadonlyMap<string, string> = new Map([
  ["\u0430", "a"], // а → a
  ["\u0435", "e"], // е → e
  ["\u043E", "o"], // о → o
  ["\u0440", "p"], // р → p
  ["\u0441", "c"], // с → c
  ["\u0443", "y"], // у → y
  ["\u0456", "i"], // і → i (Ukrainian)
  ["\u0455", "s"], // ѕ → s (Macedonian)
  ["\u04BB", "h"], // һ → h
  ["\u0458", "j"], // ј → j (Serbian)
  ["\u0501", "d"], // ԁ → d
  ["\u051D", "w"], // ԝ → w
  ["\u0410", "A"], // А → A (uppercase)
  ["\u0412", "B"], // В → B
  ["\u0415", "E"], // Е → E
  ["\u041A", "K"], // К → K
  ["\u041C", "M"], // М → M
  ["\u041D", "H"], // Н → H
  ["\u041E", "O"], // О → O
  ["\u0420", "P"], // Р → P
  ["\u0421", "C"], // С → C
  ["\u0422", "T"], // Т → T
  ["\u0425", "X"], // Х → X
]);

/**
 * Transliterates Cyrillic homoglyphs to their Latin equivalents.
 * Applied AFTER NFKD normalization, BEFORE pattern matching.
 */
function transliterateCyrillicHomoglyphs(text: string): string {
  let result = "";
  for (const char of text) {
    result += CYRILLIC_HOMOGLYPH_MAP.get(char) ?? char;
  }
  return result;
}

// ─── Normalization ───────────────────────────────────────────────────────────

/**
 * Normalizes text with NFKD to prevent Unicode bypass attacks
 * (e.g., fullwidth characters, Cyrillic lookalikes).
 * Strips combining marks after decomposition, then transliterates
 * Cyrillic homoglyphs to Latin equivalents (T-S17-008).
 */
function normalizeText(text: string): string {
  // 1. NFKD decomposes characters (e.g., fullwidth 'A' -> 'A', ligatures, etc.)
  // 2. Strip combining marks (diacritics) so accented chars become base letters
  //    e.g., "c\u0327" -> "c", "e\u0302" -> "e", enabling ASCII-only regex patterns
  // 3. Transliterate Cyrillic homoglyphs that survive NFKD
  //    e.g., "а" (U+0430 Cyrillic) -> "a" (Latin)
  // eslint-disable-next-line no-control-regex
  const nfkd = text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  return transliterateCyrillicHomoglyphs(nfkd);
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface InjectionCheckResult {
  safe: boolean;
  sanitized: string;
  warnings: string[];
}

/**
 * Checks text for prompt injection patterns.
 *
 * @param text - User input to check (e.g., travelNotes, destination name)
 * @param context - Label for logging (e.g., "travelNotes", "accessibility")
 * @returns Result with sanitized text and any warnings
 */
export function checkPromptInjection(
  text: string,
  context: string
): InjectionCheckResult {
  const warnings: string[] = [];

  // Apply NFKD normalization to prevent Unicode bypass (FIND-S16-002)
  const normalized = normalizeText(text);

  // Check high-confidence patterns (reject)
  for (const pattern of HIGH_CONFIDENCE_PATTERNS) {
    if (pattern.test(normalized)) {
      logger.warn("ai.injection.detected", {
        context,
        pattern: pattern.source,
        confidence: "high",
        inputPreview: maskPII(normalized.slice(0, 50)).masked,
      });
      return {
        safe: false,
        sanitized: "",
        warnings: [`Prompt injection detected in ${context}`],
      };
    }
  }

  // Check medium-confidence patterns (warn but allow)
  for (const pattern of MEDIUM_CONFIDENCE_PATTERNS) {
    if (pattern.test(normalized)) {
      warnings.push(`Suspicious pattern in ${context}: ${pattern.source}`);
      logger.warn("ai.injection.suspicious", {
        context,
        pattern: pattern.source,
        confidence: "medium",
      });
    }
  }

  return {
    safe: true,
    sanitized: text,
    warnings,
  };
}

/**
 * Validates user text input before including it in an AI prompt.
 * Throws AppError if prompt injection is detected.
 *
 * @param text - User input to validate
 * @param context - Label for logging
 * @param maxLength - Maximum allowed length (default: 500)
 * @returns Sanitized text, trimmed and truncated
 */
export function sanitizeForPrompt(
  text: string,
  context: string,
  maxLength: number = 500
): string {
  const trimmed = text.trim().slice(0, maxLength);

  const result = checkPromptInjection(trimmed, context);

  if (!result.safe) {
    throw new AppError(
      "PROMPT_INJECTION_DETECTED",
      "errors.invalidInput",
      400
    );
  }

  return result.sanitized;
}
