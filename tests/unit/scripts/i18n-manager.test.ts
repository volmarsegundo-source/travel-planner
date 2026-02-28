/**
 * Tests for i18n-manager.js
 *
 * Tests cover: missing keys, orphaned keys, interpolation mismatches,
 * sync mode, and report generation.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";

const {
  flattenKeys,
  extractInterpolationVars,
  findMissingKeys,
  findOrphanedKeys,
  findInterpolationMismatches,
  findLocaleFiles,
  setNestedValue,
  generateReport,
} = require("../../../scripts/i18n-manager.js");

describe("i18n-manager: flattenKeys", () => {
  it("flattens nested object keys with dot notation", () => {
    const obj = { a: { b: "x", c: { d: "y" } }, e: "z" };
    const keys = flattenKeys(obj);
    expect(keys).toEqual(["a.b", "a.c.d", "e"]);
  });

  it("returns empty array for empty object", () => {
    expect(flattenKeys({})).toEqual([]);
  });
});

describe("i18n-manager: extractInterpolationVars", () => {
  it("extracts variables from interpolation strings", () => {
    expect(extractInterpolationVars("Hello {name}, {count} trips")).toEqual(["count", "name"]);
  });

  it("returns empty array when no variables", () => {
    expect(extractInterpolationVars("Hello world")).toEqual([]);
  });

  it("handles non-string input", () => {
    expect(extractInterpolationVars(42)).toEqual([]);
  });
});

describe("i18n-manager: findMissingKeys", () => {
  it("detects key present in en but missing in pt", () => {
    const locales = {
      en: { common: { hello: "Hello", bye: "Bye" } },
      "pt-BR": { common: { hello: "Olá" } },
    };
    const issues = findMissingKeys(locales);
    expect(issues.length).toBeGreaterThanOrEqual(1);
    const missing = issues.find((i: { key: string; missing: string }) => i.key === "common.bye" && i.missing === "pt-BR");
    expect(missing).toBeDefined();
    expect(missing.severity).toBe("MEDIUM");
  });

  it("detects key present in pt but missing in en", () => {
    const locales = {
      en: { a: "x" },
      "pt-BR": { a: "y", b: "z" },
    };
    const issues = findMissingKeys(locales);
    const missing = issues.find((i: { key: string; missing: string }) => i.key === "b" && i.missing === "en");
    expect(missing).toBeDefined();
  });

  it("returns empty when locales are in sync", () => {
    const locales = {
      en: { a: "x" },
      "pt-BR": { a: "y" },
    };
    expect(findMissingKeys(locales)).toHaveLength(0);
  });
});

describe("i18n-manager: findInterpolationMismatches", () => {
  it("detects mismatched interpolation variables", () => {
    const locales = {
      en: { greeting: "Hello {name}, {count} trips" },
      "pt-BR": { greeting: "Olá {name}" },
    };
    const issues = findInterpolationMismatches(locales);
    expect(issues.length).toBe(1);
    expect(issues[0].severity).toBe("HIGH");
    expect(issues[0].key).toBe("greeting");
  });

  it("does not flag matching interpolation", () => {
    const locales = {
      en: { greeting: "Hello {name}" },
      "pt-BR": { greeting: "Olá {name}" },
    };
    expect(findInterpolationMismatches(locales)).toHaveLength(0);
  });
});

describe("i18n-manager: findLocaleFiles", () => {
  it("finds locale files in messages/ directory", () => {
    const result = findLocaleFiles();
    expect(result).not.toBeNull();
    expect(result!.files).toContain("en.json");
    expect(result!.files).toContain("pt-BR.json");
  });
});

describe("i18n-manager: findOrphanedKeys", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = path.join(__dirname, "__test_i18n_" + Date.now());
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("detects orphaned keys not referenced in source", () => {
    const srcFile = path.join(tmpDir, "component.tsx");
    fs.writeFileSync(srcFile, `const x = t("hello");\n`);
    const locales = { en: { hello: "Hi", orphanKey: "unused" } };
    const issues = findOrphanedKeys(locales, [srcFile]);
    const orphan = issues.find((i: { key: string }) => i.key === "orphanKey");
    expect(orphan).toBeDefined();
    expect(orphan.type).toBe("orphaned");
  });

  it("does not flag keys that are referenced in source", () => {
    const srcFile = path.join(tmpDir, "component.tsx");
    fs.writeFileSync(srcFile, `const x = t("hello");\nconst y = t("bye");\n`);
    const locales = { en: { hello: "Hi", bye: "Bye" } };
    const issues = findOrphanedKeys(locales, [srcFile]);
    expect(issues).toHaveLength(0);
  });
});

describe("i18n-manager: sync mode (setNestedValue)", () => {
  it("sets a nested value for sync placeholders", () => {
    const obj: Record<string, unknown> = { a: { b: "x" } };
    setNestedValue(obj, "a.c", "[NEEDS TRANSLATION] original");
    expect((obj.a as Record<string, unknown>).c).toBe("[NEEDS TRANSLATION] original");
  });

  it("creates intermediate keys when missing", () => {
    const obj: Record<string, unknown> = {};
    setNestedValue(obj, "a.b.c", "[NEEDS TRANSLATION] test");
    expect(((obj.a as Record<string, unknown>).b as Record<string, unknown>).c).toBe("[NEEDS TRANSLATION] test");
  });
});

describe("i18n-manager: generateReport", () => {
  it("generates markdown report with issue counts", () => {
    const issues = [
      { severity: "MEDIUM", type: "missing", key: "test.key", present: "en", missing: "pt-BR" },
      { severity: "HIGH", type: "interpolation", key: "test.interp", locales: { en: ["name"], "pt-BR": [] } },
    ];
    const report = generateReport(issues);
    expect(report).toContain("# i18n Consistency Report");
    expect(report).toContain("Missing keys");
    expect(report).toContain("test.key");
    expect(report).toContain("test.interp");
  });
});
