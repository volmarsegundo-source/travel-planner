#!/usr/bin/env npx tsx
/**
 * Eval Trend Reporter
 *
 * Outputs a formatted summary of trust score trends to the console.
 * Reads from the eval history in docs/evals/history/.
 *
 * Usage:
 *   npx tsx scripts/eval-trend.ts
 *   npx tsx scripts/eval-trend.ts --limit=20
 *   npm run eval:trend
 */

import { loadEvalHistory, getTrendData } from "../src/lib/evals/history";

// ─── Constants ──────────────────────────────────────────────────────────────────

const PERCENT_MULTIPLIER = 100;
const DEFAULT_LIMIT = 10;
const DIMENSIONS = ["safety", "accuracy", "performance", "ux", "i18n"] as const;

// ─── Parse CLI Arguments ────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : DEFAULT_LIMIT;

if (Number.isNaN(limit) || limit < 1) {
  console.error("ERROR: --limit must be a positive integer");
  process.exit(1);
}

// ─── Load History ───────────────────────────────────────────────────────────────

const history = loadEvalHistory(limit);

if (history.length === 0) {
  console.log("");
  console.log("No eval history found.");
  console.log("Run: npm run eval:scheduled");
  console.log("");
  process.exit(0);
}

const trends = getTrendData(history);

// ─── Output ─────────────────────────────────────────────────────────────────────

console.log("");
console.log("═══════════════════════════════════════════════════════════════");
console.log("     EDD Eval Trend Report");
console.log("═══════════════════════════════════════════════════════════════");
console.log(`Entries:  ${history.length}`);
console.log(
  `Period:   ${new Date(history[history.length - 1].timestamp).toLocaleDateString()} — ${new Date(history[0].timestamp).toLocaleDateString()}`
);
console.log("");

// Composite score table
console.log("── Composite Scores ───────────────────────────────────────────");
console.log(
  "Date".padEnd(14) +
    "Version".padEnd(12) +
    "Score".padEnd(10) +
    "Status".padEnd(10) +
    "Alerts"
);
console.log("-".repeat(60));

for (const entry of history) {
  const date = new Date(entry.timestamp).toLocaleDateString("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
  const score =
    (entry.trustScore.composite * PERCENT_MULTIPLIER).toFixed(1) + "%";
  const status = entry.trustScore.pass ? "PASS" : "FAIL";
  const alertCount = entry.alerts.length > 0 ? String(entry.alerts.length) : "-";

  console.log(
    date.padEnd(14) +
      entry.version.padEnd(12) +
      score.padEnd(10) +
      status.padEnd(10) +
      alertCount
  );
}

console.log("");

// Summary stats
console.log("── Summary ────────────────────────────────────────────────────");
console.log(
  `Pass rate:        ${(trends.passRate * PERCENT_MULTIPLIER).toFixed(0)}%`
);
console.log(
  `Average composite: ${(trends.averageComposite * PERCENT_MULTIPLIER).toFixed(1)}%`
);

// Min/max
const compositeValues = trends.compositeScores.map((c) => c.score);
const minComposite = Math.min(...compositeValues);
const maxComposite = Math.max(...compositeValues);
console.log(
  `Min composite:    ${(minComposite * PERCENT_MULTIPLIER).toFixed(1)}%`
);
console.log(
  `Max composite:    ${(maxComposite * PERCENT_MULTIPLIER).toFixed(1)}%`
);

console.log("");

// Dimension trends (latest value + direction)
console.log("── Dimension Trends ───────────────────────────────────────────");
console.log(
  "Dimension".padEnd(16) +
    "Latest".padEnd(10) +
    "Average".padEnd(10) +
    "Trend"
);
console.log("-".repeat(50));

for (const dim of DIMENSIONS) {
  const dimData = trends.dimensionTrends[dim];
  if (!dimData || dimData.length === 0) continue;

  const latestScore = dimData[dimData.length - 1].score;
  const avgScore =
    dimData.reduce((sum, d) => sum + d.score, 0) / dimData.length;

  let trendIcon = "=";
  if (dimData.length >= 2) {
    const prevScore = dimData[dimData.length - 2].score;
    const delta = latestScore - prevScore;
    if (delta > 0.01) trendIcon = "^";
    else if (delta < -0.01) trendIcon = "v";
  }

  console.log(
    dim.padEnd(16) +
      `${(latestScore * PERCENT_MULTIPLIER).toFixed(1)}%`.padEnd(10) +
      `${(avgScore * PERCENT_MULTIPLIER).toFixed(1)}%`.padEnd(10) +
      trendIcon
  );
}

console.log("");
console.log("Legend: ^ improving | v declining | = stable");
console.log("═══════════════════════════════════════════════════════════════");
console.log("");

// Emit structured JSON for log aggregation
console.log(
  JSON.stringify({
    timestamp: new Date().toISOString(),
    event: "eval.trend_report",
    entries: history.length,
    passRate: trends.passRate,
    averageComposite: trends.averageComposite,
    minComposite,
    maxComposite,
  })
);
