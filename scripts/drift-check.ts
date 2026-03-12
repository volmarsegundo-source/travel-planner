#!/usr/bin/env npx tsx
/**
 * EDD Drift Detection
 *
 * Compares current eval scores against a stored baseline.
 * Alerts if any individual eval score drops by more than the threshold delta,
 * or if the composite trust score regresses beyond the delta.
 *
 * Usage:
 *   npx tsx scripts/drift-check.ts [baseline-file] [current-file] [--delta=0.1]
 *
 * Exit codes:
 *   0 — no drift detected
 *   1 — drift detected (score regression beyond delta)
 *   2 — input error (missing files, bad JSON)
 */

import * as fs from "node:fs";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface BaselineEval {
  score: number;
  pass: boolean;
}

interface Baseline {
  version: string;
  timestamp: string;
  trustScore: {
    composite: number;
    [category: string]: number;
  };
  evals: Record<string, BaselineEval>;
}

interface VitestJsonReport {
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  testResults: Array<{
    name: string;
    status: "passed" | "failed";
    assertionResults: Array<{
      fullName: string;
      status: "passed" | "failed";
    }>;
  }>;
}

interface DriftResult {
  evalId: string;
  baselineScore: number;
  currentScore: number;
  delta: number;
  drifted: boolean;
}

// ---------------------------------------------------------------------------
// Parse CLI arguments
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const positionalArgs = args.filter((a) => !a.startsWith("--"));

const baselineFile = positionalArgs[0] || "docs/evals/baselines/v0.22.0-baseline.json";
const currentFile = positionalArgs[1] || "eval-report.json";

const deltaArg = args.find((a) => a.startsWith("--delta="));
const delta = deltaArg ? parseFloat(deltaArg.split("=")[1]) : 0.1;

if (Number.isNaN(delta) || delta < 0 || delta > 1) {
  console.error("ERROR: --delta must be a number between 0 and 1");
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Read files
// ---------------------------------------------------------------------------
function readJson<T>(filePath: string, label: string): T {
  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    console.error(`ERROR: ${label} not found: ${resolved}`);
    process.exit(2);
  }
  try {
    return JSON.parse(fs.readFileSync(resolved, "utf-8")) as T;
  } catch {
    console.error(`ERROR: Failed to parse ${label} as JSON: ${resolved}`);
    process.exit(2);
    throw new Error("unreachable");
  }
}

const baseline = readJson<Baseline>(baselineFile, "Baseline");
const current = readJson<VitestJsonReport>(currentFile, "Current eval report");

// ---------------------------------------------------------------------------
// Derive per-eval scores from current vitest report
//
// Strategy: each test suite file maps to an eval ID extracted from the file name
// or the first test's fullName. For evals not individually identifiable in the
// vitest output, we fall back to the composite pass rate.
// ---------------------------------------------------------------------------
function deriveCurrentScores(report: VitestJsonReport): Record<string, number> {
  const scores: Record<string, number> = {};

  for (const suite of report.testResults) {
    // Try to extract eval ID from suite name (e.g., "EVAL-AI-001" in path or describe)
    const evalIdMatch = suite.name.match(/EVAL-[A-Z]+-\d+/i);
    if (evalIdMatch) {
      const evalId = evalIdMatch[0].toUpperCase();
      const total = suite.assertionResults.length;
      const passed = suite.assertionResults.filter((t) => t.status === "passed").length;
      scores[evalId] = total > 0 ? passed / total : 0;
    }
  }

  return scores;
}

const currentScores = deriveCurrentScores(current);

// Composite pass rate from current report
const compositePassRate =
  current.numTotalTests > 0
    ? current.numPassedTests / current.numTotalTests
    : 0;

// ---------------------------------------------------------------------------
// Compare baseline vs current
// ---------------------------------------------------------------------------
const driftResults: DriftResult[] = [];
let hasDrift = false;

// Check composite trust score
const compositeBaseline = baseline.trustScore.composite;
const compositeDelta = compositeBaseline - compositePassRate;
if (compositeDelta > delta) {
  hasDrift = true;
}
driftResults.push({
  evalId: "COMPOSITE",
  baselineScore: compositeBaseline,
  currentScore: compositePassRate,
  delta: compositeDelta,
  drifted: compositeDelta > delta,
});

// Check individual evals present in baseline
for (const [evalId, baselineEval] of Object.entries(baseline.evals)) {
  const currentScore = currentScores[evalId];

  // If the eval was not found in the current run, treat it as score 0 (missing eval = regression)
  const effectiveScore = currentScore !== undefined ? currentScore : 0;
  const evalDelta = baselineEval.score - effectiveScore;
  const drifted = evalDelta > delta;

  if (drifted) {
    hasDrift = true;
  }

  driftResults.push({
    evalId,
    baselineScore: baselineEval.score,
    currentScore: effectiveScore,
    delta: evalDelta,
    drifted,
  });
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------
console.log("");
console.log("=== EDD Drift Detection Report ===");
console.log(`Baseline version: ${baseline.version}`);
console.log(`Delta threshold:  ${(delta * 100).toFixed(0)}%`);
console.log("");

// Table header
console.log(
  "Eval ID".padEnd(20) +
    "Baseline".padEnd(12) +
    "Current".padEnd(12) +
    "Delta".padEnd(10) +
    "Status"
);
console.log("-".repeat(66));

for (const result of driftResults) {
  const baseStr = (result.baselineScore * 100).toFixed(1) + "%";
  const currStr = (result.currentScore * 100).toFixed(1) + "%";
  const deltaStr = (result.delta > 0 ? "-" : "+") + (Math.abs(result.delta) * 100).toFixed(1) + "%";
  const status = result.drifted ? "DRIFT" : "OK";

  console.log(
    result.evalId.padEnd(20) +
      baseStr.padEnd(12) +
      currStr.padEnd(12) +
      deltaStr.padEnd(10) +
      status
  );
}

console.log("");

// Emit structured JSON telemetry line
const telemetryLine = JSON.stringify({
  timestamp: new Date().toISOString(),
  event: "eval.drift_check",
  baselineVersion: baseline.version,
  compositeBaseline: compositeBaseline,
  compositeCurrentScore: compositePassRate,
  deltaThreshold: delta,
  hasDrift,
  driftedEvals: driftResults.filter((r) => r.drifted).map((r) => r.evalId),
});
console.log(telemetryLine);
console.log("");

if (hasDrift) {
  const driftedIds = driftResults
    .filter((r) => r.drifted)
    .map((r) => r.evalId)
    .join(", ");
  console.log(`DRIFT DETECTED in: ${driftedIds}`);
  console.log("One or more eval scores regressed beyond the allowed delta.");
  process.exit(1);
} else {
  console.log("NO DRIFT DETECTED — all scores within acceptable range.");
  process.exit(0);
}
