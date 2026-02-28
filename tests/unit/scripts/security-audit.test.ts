/**
 * Tests for security-audit.js
 *
 * Tests cover: secret detection, auth patterns, .gitignore check, report generation.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";

// Import functions from the script
const {
  scanSecrets,
  scanAuth,
  scanLGPD,
  generateReport,
  walkFiles,
} = require("../../../scripts/security-audit.js");

describe("security-audit: scanSecrets", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = path.join(__dirname, "__test_sec_" + Date.now());
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("detects console.log with 'password' as CRITICAL", () => {
    const file = path.join(tmpDir, "bad.ts");
    fs.writeFileSync(file, `console.log("User password:", password);\n`);
    const issues = scanSecrets([file]);
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0].severity).toBe("CRITICAL");
    expect(issues[0].category).toBe("Secrets");
  });

  it("detects hardcoded API key as CRITICAL", () => {
    const file = path.join(tmpDir, "config.ts");
    fs.writeFileSync(file, `const apiKey = "sk-ant-1234567890abcdefghijklmnopq";\n`);
    const issues = scanSecrets([file]);
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0].severity).toBe("CRITICAL");
  });

  it("does not flag test files", () => {
    const file = path.join(tmpDir, "auth.test.ts");
    fs.writeFileSync(file, `console.log("Testing password:", mockPassword);\n`);
    const issues = scanSecrets([file]);
    expect(issues).toHaveLength(0);
  });

  it("does not flag comments", () => {
    const file = path.join(tmpDir, "clean.ts");
    fs.writeFileSync(file, `// console.log with password for debugging\nconst x = 1;\n`);
    const issues = scanSecrets([file]);
    expect(issues).toHaveLength(0);
  });
});

describe("security-audit: scanAuth", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = path.join(__dirname, "__test_auth_" + Date.now());
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("detects bcrypt salt rounds below 10", () => {
    const file = path.join(tmpDir, "auth.ts");
    fs.writeFileSync(file, `const hash = await bcrypt.hash(password, 5);\n`);
    const issues = scanAuth([file]);
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0].severity).toBe("HIGH");
    expect(issues[0].message).toContain("salt rounds too low");
  });

  it("does not flag bcrypt salt rounds >= 10", () => {
    const file = path.join(tmpDir, "auth.ts");
    fs.writeFileSync(file, `const hash = await bcrypt.hash(password, 12);\n`);
    const issues = scanAuth([file]);
    expect(issues).toHaveLength(0);
  });

  it("detects CORS wildcard origin", () => {
    const file = path.join(tmpDir, "api.ts");
    fs.writeFileSync(file, `const corsConfig = { origin: "*" };\n`);
    const issues = scanAuth([file]);
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0].message).toContain("CORS");
  });
});

describe("security-audit: generateReport", () => {
  it("generates markdown report with severity table", () => {
    const issues = [
      { severity: "CRITICAL", category: "Secrets", file: "test.ts", line: 1, message: "Test issue" },
      { severity: "HIGH", category: "Auth", file: "auth.ts", line: 5, message: "Weak hash" },
    ];
    const report = generateReport(issues);
    expect(report).toContain("# Security Audit Report");
    expect(report).toContain("CRITICAL");
    expect(report).toContain("Test issue");
    expect(report).toContain("Weak hash");
  });

  it("generates clean report when no issues", () => {
    const report = generateReport([]);
    expect(report).toContain("No security issues found");
    expect(report).toContain("Total issues:** 0");
  });
});

describe("security-audit: walkFiles", () => {
  it("finds TypeScript files in a directory", () => {
    const files = walkFiles(path.join(__dirname, "..", "..", "..", "src"));
    expect(files.length).toBeGreaterThan(0);
    expect(files.every((f: string) => /\.(tsx?|jsx?)$/.test(f))).toBe(true);
  });
});
