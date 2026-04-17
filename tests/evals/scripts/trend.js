#!/usr/bin/env node
/**
 * Trend viewer — reads docs/evals/history/*.json and prints Trust Score
 * evolution over the last N runs.
 *
 * Usage:
 *   node tests/evals/scripts/trend.js [--last=10]
 *
 * See: docs/specs/SPEC-EVALS-V1.md §7.1
 */

const fs = require("fs");
const path = require("path");

const HISTORY_DIR = path.resolve(process.cwd(), "docs/evals/history");
const WEIGHTS = { safety: 0.30, accuracy: 0.25, performance: 0.20, ux: 0.15, i18n: 0.10 };
const DIMENSIONS = ["safety", "accuracy", "performance", "ux", "i18n"];

function parseArgs(argv) {
  const args = { last: 10 };
  for (const a of argv.slice(2)) {
    if (a.startsWith("--last=")) args.last = Number(a.split("=")[1]);
  }
  return args;
}

function loadSnapshots(dir, last) {
  if (!fs.existsSync(dir)) return [];
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({ f, full: path.join(dir, f), mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => a.mtime - b.mtime);
  return files.slice(-last);
}

function extractDimScores(data) {
  const sums = { safety: 0, accuracy: 0, performance: 0, ux: 0, i18n: 0 };
  const counts = { safety: 0, accuracy: 0, performance: 0, ux: 0, i18n: 0 };
  const results = (data && data.results && data.results.results) || (data && data.results) || [];
  for (const r of Array.isArray(results) ? results : []) {
    const asserts = (r && r.gradingResult && r.gradingResult.componentResults) || [];
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
  const composite =
    avg.safety * WEIGHTS.safety +
    avg.accuracy * WEIGHTS.accuracy +
    avg.performance * WEIGHTS.performance +
    avg.ux * WEIGHTS.ux +
    avg.i18n * WEIGHTS.i18n;
  return { avg, composite };
}

function main() {
  const args = parseArgs(process.argv);
  const snaps = loadSnapshots(HISTORY_DIR, args.last);
  if (snaps.length === 0) {
    console.log("[trend] no history yet");
    return;
  }

  console.log("=== Trust Score Trend ===");
  console.log("timestamp                          safety  acc     perf    ux      i18n    composite");
  for (const s of snaps) {
    try {
      const { avg, composite } = extractDimScores(JSON.parse(fs.readFileSync(s.full, "utf8")));
      const stamp = path.basename(s.f, ".json").padEnd(32, " ");
      console.log(
        `${stamp}  ${avg.safety.toFixed(3)}   ${avg.accuracy.toFixed(3)}   ${avg.performance.toFixed(3)}   ${avg.ux.toFixed(3)}   ${avg.i18n.toFixed(3)}   ${composite.toFixed(3)}`,
      );
    } catch (e) {
      console.log(`${s.f} (error: ${e.message})`);
    }
  }
}

main();
