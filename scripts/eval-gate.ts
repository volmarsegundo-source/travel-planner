#!/usr/bin/env npx tsx
/**
 * EDD Eval Gate
 *
 * Reads a vitest JSON report and emits a PASS/FAIL decision based on
 * the configured pass-rate threshold. Exit code 0 = PASS, 1 = FAIL.
 *
 * Usage:
 *   npx tsx scripts/eval-gate.ts [report-file] [flags]
 *
 * Flags:
 *   --threshold=<0..1>      Required pass-rate. Default 0.8 (PR gate).
 *                           Use 0.85 for staging, 0.90 for prod.
 *   --max-age-hours=<n>     Fail loud if report mtime older than n hours.
 *                           Default OFF (no staleness check). Recommended
 *                           in CI to catch stale-artifact regressions.
 *   --allow-empty           Treat numTotalTests == 0 as PASS instead of FAIL.
 *                           Default OFF (fail-closed). Use only when an
 *                           empty test set is the legitimate expected state.
 *
 * C-02 (Sprint 46): hardened to be the authoritative PASS/FAIL decision
 * point. Sprint 45 retro St-05: "don't defer silent CI failures."
 */

import * as fs from "node:fs";
import * as path from "node:path";

interface AssertionResult {
  fullName: string;
  status: "passed" | "failed";
}

interface TestResult {
  name: string;
  status: "passed" | "failed";
  assertionResults: AssertionResult[];
}

interface VitestJsonReport {
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  testResults: TestResult[];
}

// ---------------------------------------------------------------------------
// Parse CLI arguments
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const positionalArgs = args.filter((a) => !a.startsWith("--"));
const reportFile = positionalArgs[0] || "eval-report.json";

const thresholdArg = args.find((a) => a.startsWith("--threshold="));
const threshold = thresholdArg ? parseFloat(thresholdArg.split("=")[1]) : 0.8;

if (Number.isNaN(threshold) || threshold < 0 || threshold > 1) {
  console.error("ERROR: --threshold must be a number between 0 and 1");
  process.exit(1);
}

const maxAgeArg = args.find((a) => a.startsWith("--max-age-hours="));
const maxAgeHours = maxAgeArg ? parseFloat(maxAgeArg.split("=")[1]) : null;

if (
  maxAgeHours !== null &&
  (Number.isNaN(maxAgeHours) || maxAgeHours <= 0)
) {
  console.error("ERROR: --max-age-hours must be a positive number");
  process.exit(1);
}

const allowEmpty = args.includes("--allow-empty");

// ---------------------------------------------------------------------------
// Read report
// ---------------------------------------------------------------------------
const reportPath = path.resolve(process.cwd(), reportFile);

if (!fs.existsSync(reportPath)) {
  console.error(`ERROR: Eval report not found: ${reportPath}`);
  process.exit(1);
}

if (maxAgeHours !== null) {
  const stat = fs.statSync(reportPath);
  const ageHours = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60);
  if (ageHours > maxAgeHours) {
    console.error(
      `ERROR: Eval report is stale (mtime exceeds --max-age-hours=${maxAgeHours}). ` +
        `Actual age: ${ageHours.toFixed(2)}h. Re-run \`npm run eval:report\` and retry.`
    );
    process.exit(1);
  }
}

let report: VitestJsonReport;
try {
  report = JSON.parse(fs.readFileSync(reportPath, "utf-8"));
} catch {
  console.error(`ERROR: Failed to parse eval report as JSON: ${reportPath}`);
  process.exit(1);
}

// Validate minimal expected structure
if (typeof report.numTotalTests !== "number" || !Array.isArray(report.testResults)) {
  console.error("ERROR: Eval report does not match expected vitest JSON format");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Calculate pass rate (trust score proxy)
// ---------------------------------------------------------------------------
const passRate =
  report.numTotalTests > 0
    ? report.numPassedTests / report.numTotalTests
    : 0;

// ---------------------------------------------------------------------------
// Output results — structured for both human readers and CI log parsers
// ---------------------------------------------------------------------------
console.log("");
console.log("=== EDD Eval Gate Report ===");
console.log(`Total tests:  ${report.numTotalTests}`);
console.log(`Passed:       ${report.numPassedTests}`);
console.log(`Failed:       ${report.numFailedTests}`);
if (report.numPendingTests > 0) {
  console.log(`Pending:      ${report.numPendingTests}`);
}
console.log(`Pass rate:    ${(passRate * 100).toFixed(1)}%`);
console.log(`Threshold:    ${(threshold * 100).toFixed(1)}%`);
console.log("");

// List every failed eval for quick debugging in CI logs
if (report.numFailedTests > 0) {
  console.log("Failed evals:");
  for (const suite of report.testResults) {
    for (const test of suite.assertionResults) {
      if (test.status === "failed") {
        console.log(`  FAIL  ${test.fullName}`);
      }
    }
  }
  console.log("");
}

// Emit structured JSON line for log aggregation (Vercel / Datadog / etc.)
const telemetryLine = JSON.stringify({
  timestamp: new Date().toISOString(),
  event: "eval.gate",
  passRate,
  threshold,
  totalTests: report.numTotalTests,
  passedTests: report.numPassedTests,
  failedTests: report.numFailedTests,
  result: passRate >= threshold ? "PASS" : "FAIL",
});
console.log(telemetryLine);
console.log("");

// ---------------------------------------------------------------------------
// Gate decision
// ---------------------------------------------------------------------------
// Empty-report guard: by default a zero-test report is fail-closed (an
// empty suite cannot validate anything). The `--allow-empty` opt-in is
// the ONLY way to skip — it must surface a visible reason in stdout so
// the skip is loud, not silent (Sprint 45 retro St-05).
if (report.numTotalTests === 0) {
  if (allowEmpty) {
    console.log(
      "GATE PASSED (0 tests; --allow-empty was set — verify this is the expected state)"
    );
    process.exit(0);
  }
  console.log(
    "GATE FAILED (0 tests collected; refusing to silently pass — " +
      "pass --allow-empty if an empty test set is the intended state)"
  );
  process.exit(1);
}

if (passRate >= threshold) {
  console.log(`GATE PASSED (${(passRate * 100).toFixed(1)}% >= ${(threshold * 100).toFixed(1)}%)`);
  process.exit(0);
} else {
  console.log(`GATE FAILED (${(passRate * 100).toFixed(1)}% < ${(threshold * 100).toFixed(1)}%)`);
  process.exit(1);
}
