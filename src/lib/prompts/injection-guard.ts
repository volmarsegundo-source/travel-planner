/**
 * Prompt injection detection guard.
 *
 * Scans user-provided text inputs for common prompt injection patterns
 * before they are included in AI prompts. Returns a sanitized version
 * of the text or throws if a high-confidence injection is detected.
 *
 * @version 1.0.0
 * @see docs/prompts/OPTIMIZATION-BACKLOG.md (OPT-002)
 */

import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

// ─── Injection Patterns ──────────────────────────────────────────────────────

/**
 * High-confidence patterns: very likely injection attempts.
 * Match triggers immediate rejection.
 */
const HIGH_CONFIDENCE_PATTERNS: readonly RegExp[] = [
  // Direct role override attempts
  /\bignore\s+(all\s+)?previous\s+(instructions?|prompts?|rules?)\b/i,
  /\byou\s+are\s+now\b/i,
  /\bact\s+as\s+(a\s+)?different\b/i,
  /\bnew\s+instructions?\s*:/i,
  /\bsystem\s*:\s*/i,

  // Delimiter/boundary injection
  /```\s*system\b/i,
  /<\/?system>/i,
  /<\/?instructions?>/i,
  /<\/?prompt>/i,

  // Direct prompt extraction
  /\brepeat\s+(your|the)\s+(system\s+)?(prompt|instructions?)\b/i,
  /\bshow\s+(me\s+)?(your|the)\s+(system\s+)?(prompt|instructions?)\b/i,
  /\bwhat\s+(are|is)\s+your\s+(system\s+)?(prompt|instructions?)\b/i,

  // Jailbreak patterns
  /\bDAN\s+mode\b/i,
  /\bdeveloper\s+mode\b/i,
  /\bjailbreak\b/i,
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
];

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

  // Check high-confidence patterns (reject)
  for (const pattern of HIGH_CONFIDENCE_PATTERNS) {
    if (pattern.test(text)) {
      logger.warn("ai.injection.detected", {
        context,
        pattern: pattern.source,
        confidence: "high",
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
    if (pattern.test(text)) {
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
