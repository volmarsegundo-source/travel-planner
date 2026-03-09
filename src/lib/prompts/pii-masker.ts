/**
 * PII (Personally Identifiable Information) masker for LGPD compliance.
 *
 * Detects and masks PII in user-provided text before it is sent to
 * external AI APIs. This ensures compliance with LGPD (Lei Geral de
 * Proteção de Dados) by preventing PII from leaving the system boundary.
 *
 * Supported PII types:
 * - CPF (Brazilian tax ID)
 * - Email addresses
 * - Phone numbers (Brazilian format)
 * - Credit card numbers (13-19 digits)
 * - Passport numbers (2 letters + 6-9 digits)
 *
 * @version 1.0.0
 * @see docs/prompts/OPTIMIZATION-BACKLOG.md (OPT-010)
 */

import { logger } from "@/lib/logger";

// ─── PII Patterns ────────────────────────────────────────────────────────────

/**
 * CPF: XXX.XXX.XXX-XX or 11 consecutive digits.
 * Matches with optional dots/dashes/spaces as separators.
 */
const CPF_PATTERN = /\b\d{3}[.\s-]?\d{3}[.\s-]?\d{3}[.\s-]?\d{2}\b/g;

/**
 * Email: standard email format.
 */
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/**
 * Brazilian phone numbers:
 * +55 (XX) XXXXX-XXXX, (XX) XXXXX-XXXX, XX XXXXX-XXXX, etc.
 * Also matches without country code and with 8 or 9 digit local numbers.
 */
const PHONE_PATTERN =
  /(?:\+55\s?)?(?:\(?\d{2}\)?\s?)\d{4,5}[-\s]?\d{4}\b/g;

/**
 * Credit card numbers: 13-19 digits with optional spaces or dashes.
 * Uses a lookahead to ensure total digit count is 13-19.
 */
const CREDIT_CARD_PATTERN =
  /\b(?=[\d\s-]{13,23}\b)\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{1,7}\b/g;

/**
 * Passport numbers: 2 uppercase letters followed by 6-9 digits.
 */
const PASSPORT_PATTERN = /\b[A-Z]{2}\d{6,9}\b/g;

// ─── PII type definitions ────────────────────────────────────────────────────

interface PIIPattern {
  type: string;
  pattern: RegExp;
  replacement: string;
}

// Order matters: longer/more-specific patterns first to avoid partial matches.
// Credit card must be checked before phone to prevent phone regex eating card digits.
const PII_PATTERNS: readonly PIIPattern[] = [
  {
    type: "credit_card",
    pattern: CREDIT_CARD_PATTERN,
    replacement: "[CARD-REDACTED]",
  },
  { type: "cpf", pattern: CPF_PATTERN, replacement: "[CPF-REDACTED]" },
  { type: "email", pattern: EMAIL_PATTERN, replacement: "[EMAIL-REDACTED]" },
  { type: "phone", pattern: PHONE_PATTERN, replacement: "[PHONE-REDACTED]" },
  {
    type: "passport",
    pattern: PASSPORT_PATTERN,
    replacement: "[PASSPORT-REDACTED]",
  },
];

// ─── Public API ──────────────────────────────────────────────────────────────

export interface PIIMaskResult {
  masked: string;
  hasPII: boolean;
  detectedTypes: string[];
}

/**
 * Detects and masks PII in the given text.
 *
 * @param text - User input to scan for PII
 * @param context - Label for logging (e.g., "travelNotes")
 * @returns Object with masked text, PII detection flag, and detected types
 */
export function maskPII(text: string, context?: string): PIIMaskResult {
  let masked = text;
  const detectedTypes: string[] = [];

  for (const { type, pattern, replacement } of PII_PATTERNS) {
    // Reset lastIndex for global regex (they are stateful)
    pattern.lastIndex = 0;

    if (pattern.test(masked)) {
      detectedTypes.push(type);
      // Reset lastIndex again before replace (test() advances it)
      pattern.lastIndex = 0;
      masked = masked.replace(pattern, replacement);
    }
  }

  const hasPII = detectedTypes.length > 0;

  if (hasPII) {
    logger.warn("ai.pii.detected", {
      context: context ?? "unknown",
      detectedTypes: detectedTypes.join(", "),
      piiCount: detectedTypes.length,
    });
  }

  return { masked, hasPII, detectedTypes };
}
