#!/usr/bin/env npx tsx
/**
 * Scheduled Eval Runner
 *
 * Runs the full eval suite, saves results to history,
 * checks for alerts, and emits telemetry.
 *
 * Usage:
 *   npx tsx scripts/scheduled-eval.ts
 *   npm run eval:scheduled
 *
 * Exit codes:
 *   0 — eval suite completed successfully (may have failures)
 *   1 — eval suite could not run (infrastructure error)
 */

import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { calculateTrustScore } from "../src/lib/evals/trust-score";
import { checkAlerts, dispatchAlerts, getAlertConfig } from "../src/lib/evals/alerts";
import { saveEvalHistory } from "../src/lib/evals/history";
import type { EvalHistoryEntry } from "../src/lib/evals/history";

// ─── Constants ──────────────────────────────────────────────────────────────────

const EVAL_REPORT_PATH = path.resolve(process.cwd(), "eval-report.json");
const BASELINE_DIR = path.resolve(process.cwd(), "docs/evals/baselines");
const EVAL_CONFIG = "vitest.eval.config.ts";

// Dimension weights for mapping eval IDs to trust score dimensions.
// Eval IDs that contain these keywords are mapped to the corresponding dimension.
const DIMENSION_KEYWORDS: Record<string, string> = {
  safety: "safety",
  injection: "safety",
  security: "safety",
  schema: "accuracy",
  accuracy: "accuracy",
  judge: "accuracy",
  token: "performance",
  perf: "performance",
  budget: "performance",
  i18n: "i18n",
  locale: "i18n",
  completeness: "i18n",
  ux: "ux",
};

// ─── Types ──────────────────────────────────────────────────────────────────────

interface VitestAssertionResult {
  fullName: string;
  status: "passed" | "failed";
}

interface VitestTestResult {
  name: string;
  status: "passed" | "failed";
  assertionResults: VitestAssertionResult[];
}

interface VitestJsonReport {
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  testResults: VitestTestResult[];
}

interface EvalScore {
  evalId: string;
  score: number;
  pass: boolean;
  dimension: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function readPackageVersion(): string {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8")
    );
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Maps an eval ID or suite name to a trust score dimension.
 */
function inferDimension(name: string): string {
  const lower = name.toLowerCase();
  for (const [keyword, dimension] of Object.entries(DIMENSION_KEYWORDS)) {
    if (lower.includes(keyword)) return dimension;
  }
  return "accuracy"; // Default dimension for unrecognized evals
}

/**
 * Derives per-eval scores from a vitest JSON report.
 */
function deriveEvalScores(report: VitestJsonReport): EvalScore[] {
  const scores: EvalScore[] = [];

  for (const suite of report.testResults) {
    const total = suite.assertionResults.length;
    if (total === 0) continue;

    const passed = suite.assertionResults.filter(
      (t) => t.status === "passed"
    ).length;
    const score = passed / total;

    // Extract eval ID from suite name
    const evalIdMatch = suite.name.match(/EVAL-[A-Z]+-\d+/i);
    const evalId = evalIdMatch
      ? evalIdMatch[0].toUpperCase()
      : path.basename(suite.name, ".ts");

    scores.push({
      evalId,
      score,
      pass: score >= 0.8,
      dimension: inferDimension(suite.name),
    });
  }

  return scores;
}

/**
 * Aggregates per-eval scores into trust score dimension inputs.
 */
function aggregateDimensionScores(
  evalScores: EvalScore[]
): Record<string, number> {
  const dimensions: Record<string, { total: number; count: number }> = {
    safety: { total: 0, count: 0 },
    accuracy: { total: 0, count: 0 },
    performance: { total: 0, count: 0 },
    ux: { total: 0, count: 0 },
    i18n: { total: 0, count: 0 },
  };

  for (const evalScore of evalScores) {
    const dim = dimensions[evalScore.dimension];
    if (dim) {
      dim.total += evalScore.score;
      dim.count += 1;
    }
  }

  const result: Record<string, number> = {};
  for (const [key, data] of Object.entries(dimensions)) {
    result[key] = data.count > 0 ? data.total / data.count : 1.0;
  }

  return result;
}

/**
 * Finds the latest baseline file for drift comparison.
 */
function findLatestBaseline(): string | null {
  if (!fs.existsSync(BASELINE_DIR)) return null;

  const files = fs
    .readdirSync(BASELINE_DIR)
    .filter((f) => f.endsWith("-baseline.json"))
    .sort()
    .reverse();

  return files.length > 0 ? path.join(BASELINE_DIR, files[0]) : null;
}

// ─── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();
  const version = readPackageVersion();

  console.log("");
  console.log("═══════════════════════════════════════");
  console.log("     EDD Scheduled Eval Run");
  console.log("═══════════════════════════════════════");
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Version:   ${version}`);
  console.log("");

  // 1. Run eval suite and capture JSON output
  console.log("Step 1/7: Running eval suite...");
  try {
    execSync(
      `npx vitest run --config ${EVAL_CONFIG} --reporter=json --outputFile=eval-report.json`,
      { stdio: "pipe", timeout: 120_000 }
    );
    console.log("  Eval suite completed.");
  } catch (err) {
    // Vitest exits with code 1 when tests fail, but still writes the report
    if (!fs.existsSync(EVAL_REPORT_PATH)) {
      console.error(
        "  ERROR: Eval suite failed and no report was generated."
      );
      console.error(
        `  ${err instanceof Error ? err.message : String(err)}`
      );
      process.exit(1);
    }
    console.log("  Eval suite completed with failures.");
  }

  // 2. Parse results
  console.log("Step 2/7: Parsing eval report...");
  let report: VitestJsonReport;
  try {
    report = JSON.parse(fs.readFileSync(EVAL_REPORT_PATH, "utf-8"));
  } catch {
    console.error("  ERROR: Failed to parse eval-report.json");
    process.exit(1);
  }
  console.log(
    `  ${report.numTotalTests} tests: ${report.numPassedTests} passed, ${report.numFailedTests} failed`
  );

  // 3. Map eval results to trust score dimensions
  console.log("Step 3/7: Mapping eval results to dimensions...");
  const evalScores = deriveEvalScores(report);
  const dimensionInputs = aggregateDimensionScores(evalScores);
  for (const [dim, score] of Object.entries(dimensionInputs)) {
    console.log(`  ${dim}: ${(score * 100).toFixed(1)}%`);
  }

  // 4. Calculate trust score
  console.log("Step 4/7: Calculating trust score...");
  const trustScore = calculateTrustScore({
    safety: dimensionInputs.safety ?? 1.0,
    accuracy: dimensionInputs.accuracy ?? 1.0,
    performance: dimensionInputs.performance ?? 1.0,
    ux: dimensionInputs.ux ?? 1.0,
    i18n: dimensionInputs.i18n ?? 1.0,
  });
  console.log(
    `  Composite: ${(trustScore.composite * 100).toFixed(1)}% (${trustScore.pass ? "PASS" : "FAIL"})`
  );

  // 5. Check and dispatch alerts
  console.log("Step 5/7: Checking alerts...");
  const alertConfig = getAlertConfig();
  const alerts = checkAlerts(trustScore, alertConfig);
  if (alerts.length > 0) {
    console.log(`  ${alerts.length} alert(s) triggered:`);
    for (const alert of alerts) {
      console.log(`    [${alert.severity.toUpperCase()}] ${alert.message}`);
    }
    await dispatchAlerts(alerts, alertConfig);
  } else {
    console.log("  No alerts triggered.");
  }

  // 6. Save to history
  console.log("Step 6/7: Saving to history...");
  const durationMs = Date.now() - startTime;
  const historyEntry: EvalHistoryEntry = {
    timestamp: new Date().toISOString(),
    version,
    trustScore,
    evalResults: evalScores.map((e) => ({
      evalId: e.evalId,
      score: e.score,
      pass: e.pass,
    })),
    durationMs,
    alerts,
  };
  const savedPath = saveEvalHistory(historyEntry);
  console.log(`  Saved: ${savedPath}`);

  // 7. Drift check against baseline
  console.log("Step 7/7: Checking for drift...");
  const baselinePath = findLatestBaseline();
  if (baselinePath) {
    try {
      const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf-8"));
      const baselineComposite =
        baseline.trustScore?.composite ?? baseline.composite ?? 0;
      const drift = baselineComposite - trustScore.composite;
      const driftThreshold = alertConfig.driftMaxDelta;

      if (drift > driftThreshold) {
        console.log(
          `  DRIFT DETECTED: composite dropped by ${(drift * 100).toFixed(1)}% (threshold: ${(driftThreshold * 100).toFixed(1)}%)`
        );
      } else {
        console.log(
          `  No drift detected (delta: ${(Math.abs(drift) * 100).toFixed(1)}%, threshold: ${(driftThreshold * 100).toFixed(1)}%)`
        );
      }
    } catch {
      console.log(`  Could not read baseline: ${baselinePath}`);
    }
  } else {
    console.log("  No baseline found for drift comparison.");
  }

  // Summary
  console.log("");
  console.log("═══════════════════════════════════════");
  console.log("     Summary");
  console.log("═══════════════════════════════════════");
  console.log(`Trust Score:  ${(trustScore.composite * 100).toFixed(1)}%`);
  console.log(`Status:       ${trustScore.pass ? "PASS" : "FAIL"}`);
  console.log(`Evals Run:    ${evalScores.length}`);
  console.log(`Alerts:       ${alerts.length}`);
  console.log(`Duration:     ${(durationMs / 1000).toFixed(1)}s`);
  console.log(`History:      ${savedPath}`);
  console.log("═══════════════════════════════════════");
  console.log("");

  // Emit structured telemetry
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      event: "eval.scheduled_run",
      version,
      composite: trustScore.composite,
      pass: trustScore.pass,
      evalCount: evalScores.length,
      alertCount: alerts.length,
      durationMs,
    })
  );

  // Clean up the transient report file
  try {
    fs.unlinkSync(EVAL_REPORT_PATH);
  } catch {
    // Non-critical — report file may already be cleaned up
  }
}

main().catch((err) => {
  console.error("Scheduled eval run failed:", err);
  process.exit(1);
});
