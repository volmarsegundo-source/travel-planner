#!/usr/bin/env node
/**
 * Eval drift checker — compares current run against the most recent baseline
 * snapshot and flags dimensions that regressed more than DRIFT_THRESHOLD
 * (default 10%).
 *
 * Usage:
 *   node tests/evals/scripts/drift.js [resultsPath] [--baseline=path] [--threshold=0.10]
 *
 * Baselines live at: docs/evals/baselines/*.json (most recent by mtime wins).
 *
 * See: docs/specs/SPEC-EVALS-V1.md §7.3, docs/evals/playbooks/drift-detected.md
 */

const fs = require("fs");
const path = require("path");

const DIMENSIONS = ["safety", "accuracy", "performance", "ux", "i18n"];
const DEFAULT_BASELINE_DIR = path.resolve(process.cwd(), "docs/evals/baselines");

function parseArgs(argv) {
  const args = { resultsPath: "./eval-results.json", baseline: null, threshold: 0.10 };
  for (const a of argv.slice(2)) {
    if (a.startsWith("--baseline=")) args.baseline = a.split("=")[1];
    else if (a.startsWith("--threshold=")) args.threshold = Number(a.split("=")[1]);
    else if (!a.startsWith("--")) args.resultsPath = a;
  }
  return args;
}

function mostRecentBaseline(dir) {
  if (!fs.existsSync(dir)) return null;
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({ f, full: path.join(dir, f), mtime: fs.statSync(path.join(dir, f)).mtimeMs }));
  if (files.length === 0) return null;
  files.sort((a, b) => b.mtime - a.mtime);
  return files[0].full;
}

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function extractDimScores(data) {
  const sums = { safety: 0, accuracy: 0, performance: 0, ux: 0, i18n: 0 };
  const counts = { safety: 0, accuracy: 0, performance: 0, ux: 0, i18n: 0 };
  const results =
    (data && data.results && data.results.results) ||
    (data && data.results) ||
    [];
  for (const r of Array.isArray(results) ? results : []) {
    const asserts =
      (r && r.gradingResult && r.gradingResult.componentResults) ||
      (r && r.componentResults) ||
      [];
    for (const c of asserts) {
      const key =
        (c.componentKey && String(c.componentKey).toLowerCase()) ||
        (c.component && String(c.component).toLowerCase()) ||
        null;
      const score = typeof c.score === "number" ? c.score : (c.pass ? 1 : 0);
      if (key && DIMENSIONS.includes(key)) {
        sums[key] += score;
        counts[key] += 1;
      }
    }
  }
  const avg = {};
  for (const d of DIMENSIONS) avg[d] = counts[d] > 0 ? sums[d] / counts[d] : 0;
  return avg;
}

function main() {
  const args = parseArgs(process.argv);
  const baselinePath = args.baseline
    ? path.resolve(process.cwd(), args.baseline)
    : mostRecentBaseline(DEFAULT_BASELINE_DIR);

  if (!baselinePath) {
    console.log("[drift] no baseline found — skip");
    process.exit(0);
  }
  if (!fs.existsSync(args.resultsPath)) {
    console.error(`[drift] results file missing: ${args.resultsPath}`);
    process.exit(2);
  }

  const current = extractDimScores(loadJson(args.resultsPath));
  const base = extractDimScores(loadJson(baselinePath));

  console.log("=== Drift Check ===");
  console.log(`Baseline: ${baselinePath}`);
  console.log(`Current:  ${args.resultsPath}`);
  console.log(`Threshold: ${(args.threshold * 100).toFixed(0)}% regression`);

  const regressions = [];
  for (const d of DIMENSIONS) {
    const delta = current[d] - base[d];
    const arrow = delta > 0 ? "+" : delta < 0 ? "-" : "=";
    console.log(
      `  ${d.padEnd(11, " ")} base=${base[d].toFixed(3)}  current=${current[d].toFixed(3)}  delta=${arrow}${Math.abs(delta).toFixed(3)}`,
    );
    if (base[d] > 0 && delta < 0 && Math.abs(delta) / base[d] > args.threshold) {
      regressions.push({ dim: d, base: base[d], current: current[d], delta });
    }
  }

  if (regressions.length > 0) {
    console.log("--- Drift: REGRESSION ---");
    for (const r of regressions) {
      console.log(
        `  ${r.dim}: -${(Math.abs(r.delta) / r.base * 100).toFixed(1)}% (${r.base.toFixed(3)} -> ${r.current.toFixed(3)})`,
      );
    }
    console.log("See: docs/evals/playbooks/drift-detected.md");
    process.exit(1);
  }

  console.log("--- Drift: OK ---");
  process.exit(0);
}

main();
