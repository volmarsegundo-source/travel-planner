/**
 * i18n Completeness Grader
 *
 * Verifies translation key parity between all locale files.
 * Catches missing keys, extra keys, empty values, and mismatched
 * interpolation variables before they reach production.
 *
 * Locale files:
 *   - messages/en.json (English)
 *   - messages/pt-BR.json (Portuguese - Brazil, default locale)
 *
 * @eval-type code
 * @metrics i18n_coverage, missing_keys, extra_keys, interpolation_mismatch
 */

import * as fs from "node:fs";
import * as path from "node:path";

// ─── Types ──────────────────────────────────────────────────────────────────────

interface GraderResult {
  pass: boolean;
  score: number;
  errors: string[];
  details: Record<string, unknown>;
}

interface I18nIssue {
  type: "missing_key" | "extra_key" | "empty_value" | "interpolation_mismatch";
  locale: string;
  key: string;
  message: string;
}

interface LocaleComparison {
  /** Keys present in source but missing from target */
  missingKeys: string[];
  /** Keys present in target but not in source */
  extraKeys: string[];
  /** Keys that exist but have empty string values */
  emptyValues: string[];
  /** Keys where interpolation variables differ between locales */
  interpolationMismatches: Array<{
    key: string;
    sourceVars: string[];
    targetVars: string[];
  }>;
}

// ─── Key Extraction ─────────────────────────────────────────────────────────────

/**
 * Recursively extracts all dot-notation keys from a nested JSON object.
 *
 * Example:
 *   { common: { save: "Save", theme: { light: "Light" } } }
 *   => ["common.save", "common.theme.light"]
 */
function extractKeys(obj: unknown, prefix = ""): string[] {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    return prefix ? [prefix] : [];
  }

  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      keys.push(...extractKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }

  return keys;
}

/**
 * Gets the value at a dot-notation path from a nested object.
 * Returns undefined if the path does not exist.
 */
function getValueAtPath(obj: unknown, dotPath: string): unknown {
  const parts = dotPath.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

// ─── Interpolation Variable Extraction ──────────────────────────────────────────

/**
 * Extracts interpolation variables from a translation string.
 *
 * Supports next-intl / ICU-style patterns:
 *   - {name}         -> simple variable
 *   - {count, plural, ...} -> plural form (extracts "count")
 *   - {count, number} -> number format (extracts "count")
 *
 * Returns sorted unique variable names.
 */
function extractInterpolationVars(value: string): string[] {
  if (typeof value !== "string") return [];

  const INTERPOLATION_PATTERN = /\{(\w+)(?:\s*,\s*\w+)?(?:\s*,\s*[^}]*)?\}/g;
  const vars = new Set<string>();

  let match: RegExpExecArray | null;
  while ((match = INTERPOLATION_PATTERN.exec(value)) !== null) {
    vars.add(match[1]);
  }

  return [...vars].sort();
}

// ─── Locale Comparison ──────────────────────────────────────────────────────────

/**
 * Compares two locale files and identifies all discrepancies.
 * The `source` is treated as the reference (typically en.json).
 */
function compareLocales(
  sourceObj: unknown,
  targetObj: unknown,
  sourceLocale: string,
  targetLocale: string
): LocaleComparison {
  const sourceKeys = new Set(extractKeys(sourceObj));
  const targetKeys = new Set(extractKeys(targetObj));

  // Keys in source but not in target
  const missingKeys = [...sourceKeys].filter((k) => !targetKeys.has(k));

  // Keys in target but not in source
  const extraKeys = [...targetKeys].filter((k) => !sourceKeys.has(k));

  // Empty values in target
  const emptyValues: string[] = [];
  for (const key of targetKeys) {
    const value = getValueAtPath(targetObj, key);
    if (typeof value === "string" && value.trim() === "") {
      emptyValues.push(key);
    }
  }

  // Also check source for empty values
  for (const key of sourceKeys) {
    const value = getValueAtPath(sourceObj, key);
    if (typeof value === "string" && value.trim() === "" && !emptyValues.includes(key)) {
      emptyValues.push(key);
    }
  }

  // Interpolation variable mismatches (only for keys that exist in both)
  const commonKeys = [...sourceKeys].filter((k) => targetKeys.has(k));
  const interpolationMismatches: LocaleComparison["interpolationMismatches"] = [];

  for (const key of commonKeys) {
    const sourceValue = getValueAtPath(sourceObj, key);
    const targetValue = getValueAtPath(targetObj, key);

    if (typeof sourceValue !== "string" || typeof targetValue !== "string") continue;

    const sourceVars = extractInterpolationVars(sourceValue);
    const targetVars = extractInterpolationVars(targetValue);

    if (JSON.stringify(sourceVars) !== JSON.stringify(targetVars)) {
      interpolationMismatches.push({ key, sourceVars, targetVars });
    }
  }

  return { missingKeys, extraKeys, emptyValues, interpolationMismatches };
}

// ─── File Loader ────────────────────────────────────────────────────────────────

/** Default messages directory relative to project root */
const DEFAULT_MESSAGES_DIR = "messages";

/** Supported locales in the project */
const SUPPORTED_LOCALES = ["en", "pt-BR"] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/**
 * Loads a locale JSON file and parses it.
 * Throws a descriptive error if the file is missing or invalid JSON.
 */
function loadLocaleFile(messagesDir: string, locale: string): unknown {
  const filePath = path.join(messagesDir, `${locale}.json`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Locale file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, "utf-8");

  try {
    return JSON.parse(content);
  } catch {
    throw new Error(`Invalid JSON in locale file: ${filePath}`);
  }
}

// ─── Grader ─────────────────────────────────────────────────────────────────────

/**
 * Grades the completeness and consistency of i18n locale files.
 *
 * Uses en.json as the reference locale and checks all other locales
 * for missing keys, extra keys, empty values, and interpolation mismatches.
 *
 * Scoring:
 *   - Start at 1.0
 *   - Each missing key: -0.01 (these break the UI)
 *   - Each extra key: -0.005 (unused but not breaking)
 *   - Each empty value: -0.02 (shows blank text to users)
 *   - Each interpolation mismatch: -0.03 (can cause runtime errors)
 *
 * @param projectRoot - Absolute path to the project root directory
 * @param referenceLocale - The locale to use as the source of truth (default: "en")
 * @param passThreshold - Minimum score to pass (default: 0.95)
 */
export function gradeI18nCompleteness(
  projectRoot: string,
  referenceLocale: SupportedLocale = "en",
  passThreshold = 0.95
): GraderResult {
  const messagesDir = path.join(projectRoot, DEFAULT_MESSAGES_DIR);
  const issues: I18nIssue[] = [];
  const comparisonResults: Record<string, LocaleComparison> = {};

  // Load the reference locale
  let referenceObj: unknown;
  try {
    referenceObj = loadLocaleFile(messagesDir, referenceLocale);
  } catch (err) {
    return {
      pass: false,
      score: 0,
      errors: [`Failed to load reference locale: ${err instanceof Error ? err.message : String(err)}`],
      details: { referenceLocale },
    };
  }

  // Check reference locale for empty values
  const referenceKeys = extractKeys(referenceObj);
  for (const key of referenceKeys) {
    const value = getValueAtPath(referenceObj, key);
    if (typeof value === "string" && value.trim() === "") {
      issues.push({
        type: "empty_value",
        locale: referenceLocale,
        key,
        message: `Empty value in reference locale "${referenceLocale}" at key "${key}"`,
      });
    }
  }

  // Compare each target locale against the reference
  const targetLocales = SUPPORTED_LOCALES.filter((l) => l !== referenceLocale);

  for (const targetLocale of targetLocales) {
    let targetObj: unknown;
    try {
      targetObj = loadLocaleFile(messagesDir, targetLocale);
    } catch (err) {
      issues.push({
        type: "missing_key",
        locale: targetLocale,
        key: "*",
        message: `Failed to load locale file: ${err instanceof Error ? err.message : String(err)}`,
      });
      continue;
    }

    const comparison = compareLocales(referenceObj, targetObj, referenceLocale, targetLocale);
    comparisonResults[targetLocale] = comparison;

    for (const key of comparison.missingKeys) {
      issues.push({
        type: "missing_key",
        locale: targetLocale,
        key,
        message: `Key "${key}" exists in "${referenceLocale}" but is missing from "${targetLocale}"`,
      });
    }

    for (const key of comparison.extraKeys) {
      issues.push({
        type: "extra_key",
        locale: targetLocale,
        key,
        message: `Key "${key}" exists in "${targetLocale}" but not in "${referenceLocale}" (orphaned key)`,
      });
    }

    for (const key of comparison.emptyValues) {
      issues.push({
        type: "empty_value",
        locale: targetLocale,
        key,
        message: `Empty string value at "${key}" in "${targetLocale}"`,
      });
    }

    for (const mismatch of comparison.interpolationMismatches) {
      issues.push({
        type: "interpolation_mismatch",
        locale: targetLocale,
        key: mismatch.key,
        message:
          `Interpolation variables differ at "${mismatch.key}": ` +
          `${referenceLocale} has {${mismatch.sourceVars.join(", ")}}, ` +
          `${targetLocale} has {${mismatch.targetVars.join(", ")}}`,
      });
    }
  }

  // Calculate score
  const PENALTY_MISSING_KEY = 0.01;
  const PENALTY_EXTRA_KEY = 0.005;
  const PENALTY_EMPTY_VALUE = 0.02;
  const PENALTY_INTERPOLATION = 0.03;

  let penalty = 0;
  for (const issue of issues) {
    switch (issue.type) {
      case "missing_key":
        penalty += PENALTY_MISSING_KEY;
        break;
      case "extra_key":
        penalty += PENALTY_EXTRA_KEY;
        break;
      case "empty_value":
        penalty += PENALTY_EMPTY_VALUE;
        break;
      case "interpolation_mismatch":
        penalty += PENALTY_INTERPOLATION;
        break;
    }
  }

  const score = Math.max(0, parseFloat((1 - penalty).toFixed(3)));

  // Build coverage statistics
  const totalReferenceKeys = referenceKeys.length;
  const coverageByLocale: Record<string, { total: number; missing: number; coverage: string }> = {};

  for (const targetLocale of targetLocales) {
    const comparison = comparisonResults[targetLocale];
    if (!comparison) continue;

    const targetKeyCount = totalReferenceKeys - comparison.missingKeys.length;
    const coverage = totalReferenceKeys > 0
      ? ((targetKeyCount / totalReferenceKeys) * 100).toFixed(1)
      : "0.0";

    coverageByLocale[targetLocale] = {
      total: totalReferenceKeys,
      missing: comparison.missingKeys.length,
      coverage: `${coverage}%`,
    };
  }

  return {
    pass: score >= passThreshold,
    score,
    errors: issues.map((i) => i.message),
    details: {
      referenceLocale,
      totalReferenceKeys,
      supportedLocales: SUPPORTED_LOCALES,
      coverageByLocale,
      issueCounts: {
        missingKeys: issues.filter((i) => i.type === "missing_key").length,
        extraKeys: issues.filter((i) => i.type === "extra_key").length,
        emptyValues: issues.filter((i) => i.type === "empty_value").length,
        interpolationMismatches: issues.filter((i) => i.type === "interpolation_mismatch").length,
        total: issues.length,
      },
      issues,
    },
  };
}

// ─── Standalone Key Diff ────────────────────────────────────────────────────────

/**
 * Returns a quick diff summary between two locale objects.
 * Useful for CI checks or pre-commit hooks without the full grading overhead.
 */
export function diffLocaleKeys(
  sourceObj: unknown,
  targetObj: unknown
): { missingInTarget: string[]; extraInTarget: string[] } {
  const sourceKeys = new Set(extractKeys(sourceObj));
  const targetKeys = new Set(extractKeys(targetObj));

  return {
    missingInTarget: [...sourceKeys].filter((k) => !targetKeys.has(k)),
    extraInTarget: [...targetKeys].filter((k) => !sourceKeys.has(k)),
  };
}

// ─── Exports ────────────────────────────────────────────────────────────────────

export {
  extractKeys,
  extractInterpolationVars,
  compareLocales,
  loadLocaleFile,
  diffLocaleKeys,
  SUPPORTED_LOCALES,
  DEFAULT_MESSAGES_DIR,
};

export type { GraderResult, I18nIssue, LocaleComparison, SupportedLocale };
