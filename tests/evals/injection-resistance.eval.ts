/**
 * EVAL-SEC-001: Injection Resistance pattern tests.
 *
 * Validates that known attack patterns from the injection-resistance
 * dataset are detectable by regex. These are pattern-matching tests
 * only -- no actual injection attempts are made.
 *
 * @module tests/evals/injection-resistance
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// Dataset loading
// ---------------------------------------------------------------------------

interface InjectionTestCase {
  id: string;
  category: string;
  subcategory: string;
  description: string;
  input: {
    field?: string;
    value?: string;
    language?: string;
    context?: string;
    authenticated_as?: string | null;
    request?: {
      method: string;
      path: string;
      body?: Record<string, unknown>;
      notes?: string;
    };
  };
  expected: Record<string, unknown>;
}

const datasetPath = path.resolve(
  process.cwd(),
  "docs/evals/datasets/injection-resistance.json"
);
const dataset = JSON.parse(fs.readFileSync(datasetPath, "utf-8"));
const testCases: InjectionTestCase[] = dataset.test_cases;

// ---------------------------------------------------------------------------
// Prompt Injection
// ---------------------------------------------------------------------------

describe("EVAL-SEC-001: Injection Resistance", () => {
  describe("prompt injection patterns", () => {
    const promptInjections = testCases.filter(
      (tc) => tc.category === "prompt_injection"
    );

    // Transliterate Cyrillic homoglyphs to ASCII equivalents for pattern matching
    const CYRILLIC_MAP: Record<string, string> = {
      "\u0435": "e", // Cyrillic е -> Latin e
      "\u0430": "a", // Cyrillic а -> Latin a
      "\u0441": "c", // Cyrillic с -> Latin c
      "\u043e": "o", // Cyrillic о -> Latin o
    };

    function transliterate(input: string): string {
      return input.replace(
        /[\u0430\u0435\u043e\u0441]/g,
        (ch) => CYRILLIC_MAP[ch] ?? ch
      );
    }

    it.each(
      promptInjections.map((tc) => [
        tc.id,
        tc.input.value,
        tc.expected.pattern_matched as string,
        tc.description,
      ])
    )("%s: detects pattern (%s)", (_id, value, pattern, _desc) => {
      expect(value).toBeDefined();
      expect(pattern).toBeDefined();
      const normalized = transliterate(value as string);
      const regex = new RegExp(pattern as string, "i");
      expect(regex.test(normalized)).toBe(true);
    });

    it("all prompt injection test cases expect blocked=true", () => {
      for (const tc of promptInjections) {
        expect(tc.expected.blocked).toBe(true);
      }
    });

    it("all prompt injection test cases have an error code", () => {
      for (const tc of promptInjections) {
        expect(tc.expected.error_code).toBe("PROMPT_INJECTION_DETECTED");
      }
    });
  });

  // -------------------------------------------------------------------------
  // XSS
  // -------------------------------------------------------------------------

  describe("XSS patterns", () => {
    const xssPatterns = testCases.filter((tc) => tc.category === "xss");

    it.each(xssPatterns.map((tc) => [tc.id, tc.input.value, tc.description]))(
      "%s: is sanitizable (%s)",
      (_id, value, _desc) => {
        const raw = value as string;
        // Basic HTML sanitization should neutralize these
        const sanitized = raw
          .replace(/<[^>]*>/g, "")
          .replace(/javascript:/gi, "")
          .replace(/on\w+=/gi, "");
        expect(sanitized).not.toContain("<script");
        expect(sanitized.toLowerCase()).not.toContain("javascript:");
        expect(sanitized).not.toMatch(/on\w+=/i);
      }
    );

    it("all XSS test cases expect sanitized=true or blocked=true", () => {
      for (const tc of xssPatterns) {
        const isSanitized =
          tc.expected.sanitized === true || tc.expected.blocked === true;
        expect(isSanitized).toBe(true);
      }
    });

    it("URL-encoded XSS is still detectable after decoding", () => {
      const encodedCase = xssPatterns.find(
        (tc) => tc.subcategory === "encoded_payload"
      );
      if (encodedCase) {
        const decoded = decodeURIComponent(encodedCase.input.value as string);
        expect(decoded.toLowerCase()).toContain("<script>");
      }
    });
  });

  // -------------------------------------------------------------------------
  // SQL Injection
  // -------------------------------------------------------------------------

  describe("SQL injection patterns", () => {
    const sqlPatterns = testCases.filter(
      (tc) => tc.category === "sql_injection"
    );

    it.each(
      sqlPatterns.map((tc) => [tc.id, tc.input.value, tc.description])
    )("%s: contains SQL keywords (%s)", (_id, value, _desc) => {
      const raw = (value as string).toUpperCase();
      const sqlKeywords = [
        "UNION",
        "SELECT",
        "DROP",
        "INSERT",
        "DELETE",
        "UPDATE",
        "OR 1=1",
        "SLEEP",
        "--",
      ];
      const hasSqlKeyword = sqlKeywords.some((kw) => raw.includes(kw));
      expect(hasSqlKeyword).toBe(true);
    });

    it("all SQL injection test cases expect parameterized_query=true", () => {
      for (const tc of sqlPatterns) {
        expect(tc.expected.parameterized_query).toBe(true);
      }
    });

    it("all SQL injection test cases use Prisma protection (escapes or type validation)", () => {
      for (const tc of sqlPatterns) {
        const hasPrismaProtection =
          tc.expected.prisma_escapes_input === true ||
          tc.expected.prisma_type_validation === true;
        expect(hasPrismaProtection).toBe(true);
      }
    });
  });

  // -------------------------------------------------------------------------
  // BOLA (Broken Object-Level Authorization)
  // -------------------------------------------------------------------------

  describe("BOLA patterns", () => {
    const bolaPatterns = testCases.filter((tc) => tc.category === "bola");

    it("unauthenticated access expects 401", () => {
      const unauth = bolaPatterns.find(
        (tc) => tc.subcategory === "unauthenticated_access"
      );
      expect(unauth).toBeDefined();
      expect(unauth!.expected.status_code).toBe(401);
      expect(unauth!.input.authenticated_as).toBeNull();
    });

    it("trip ID manipulation expects 404 (not 403)", () => {
      const tripManip = bolaPatterns.find(
        (tc) => tc.subcategory === "trip_id_manipulation"
      );
      expect(tripManip).toBeDefined();
      expect(tripManip!.expected.status_code).toBe(404);
      expect(tripManip!.expected.not_403).toBe(true);
      expect(tripManip!.expected.no_existence_leakage).toBe(true);
    });

    it("user ID swap expects body userId to be ignored", () => {
      const swap = bolaPatterns.find((tc) => tc.subcategory === "user_id_swap");
      expect(swap).toBeDefined();
      expect(swap!.expected.body_user_id_ignored).toBe(true);
      expect(swap!.expected.user_id_from_session).toBe(true);
    });

    it("mass assignment expects protected fields to be stripped", () => {
      const mass = bolaPatterns.find(
        (tc) => tc.subcategory === "mass_assignment_status"
      );
      expect(mass).toBeDefined();
      expect(mass!.expected.status_field_ignored).toBe(true);
      expect(mass!.expected.deleted_at_field_ignored).toBe(true);
      expect(mass!.expected.id_field_ignored).toBe(true);
      expect(mass!.expected.zod_strips_protected_fields).toBe(true);
    });

    it("path traversal expects normalized paths and 404", () => {
      const traversal = bolaPatterns.find(
        (tc) => tc.subcategory === "path_traversal"
      );
      expect(traversal).toBeDefined();
      expect(traversal!.expected.status_code).toBe(404);
      expect(traversal!.expected.path_normalized).toBe(true);
      expect(traversal!.expected.no_directory_traversal).toBe(true);
    });

    it("dataset has coverage for all BOLA subcategories", () => {
      const subcategories = new Set(bolaPatterns.map((tc) => tc.subcategory));
      expect(subcategories.has("trip_id_manipulation")).toBe(true);
      expect(subcategories.has("user_id_swap")).toBe(true);
      expect(subcategories.has("path_traversal")).toBe(true);
      expect(subcategories.has("mass_assignment_status")).toBe(true);
      expect(subcategories.has("unauthenticated_access")).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Dataset integrity
  // -------------------------------------------------------------------------

  describe("dataset integrity", () => {
    it("all test cases have a unique id", () => {
      const ids = testCases.map((tc) => tc.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("all test cases have a valid category", () => {
      const validCategories = [
        "prompt_injection",
        "xss",
        "sql_injection",
        "bola",
      ];
      for (const tc of testCases) {
        expect(validCategories).toContain(tc.category);
      }
    });

    it("dataset metadata matches expected eval id", () => {
      expect(dataset.eval_id).toBe("EVAL-SEC-001");
      expect(dataset.zero_tolerance).toBe(true);
      expect(dataset.pass_threshold).toBe(1.0);
    });
  });
});
