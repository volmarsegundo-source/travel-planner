#!/usr/bin/env npx tsx
/**
 * EDD Eval Gate
 *
 * Reads vitest JSON report and determines pass/fail based on trust score threshold.
 * Exit code 0 = pass, 1 = fail
 *
 * Usage: npx tsx scripts/eval-gate.ts [report-file] [--threshold=0.8]
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

// ---------------------------------------------------------------------------
// Read report
// ---------------------------------------------------------------------------
const reportPath = path.resolve(process.cwd(), reportFile);

if (!fs.existsSync(reportPath)) {
  console.error(`ERROR: Eval report not found: ${reportPath}`);
  process.exit(1);
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
if (passRate >= threshold) {
  console.log(`GATE PASSED (${(passRate * 100).toFixed(1)}% >= ${(threshold * 100).toFixed(1)}%)`);
  process.exit(0);
} else {
  console.log(`GATE FAILED (${(passRate * 100).toFixed(1)}% < ${(threshold * 100).toFixed(1)}%)`);
  process.exit(1);
}
