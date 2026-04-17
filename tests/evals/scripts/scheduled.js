#!/usr/bin/env node
/**
 * Scheduled eval runner — executes Promptfoo end-to-end, saves a snapshot into
 * docs/evals/history/YYYY-MM-DDTHH-MM-SS.json, and runs the gate.
 *
 * Usage:
 *   node tests/evals/scripts/scheduled.js
 *
 * Recommended cadence: weekly via CI schedule (see SPEC-EVALS-V1 §6.2).
 *
 * See: docs/specs/SPEC-EVALS-V1.md §7.1
 */

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const CONFIG = path.resolve(ROOT, "tests/evals/promptfooconfig.yaml");
const RESULTS = path.resolve(ROOT, "eval-results.json");
const HISTORY_DIR = path.resolve(ROOT, "docs/evals/history");
const GATE = path.resolve(ROOT, "tests/evals/scripts/gate.js");

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32", ...opts });
  return res.status;
}

function main() {
  ensureDir(HISTORY_DIR);

  console.log("=== Scheduled eval run ===");
  console.log(`Config: ${CONFIG}`);

  const promptfooBin = "npx";
  const promptfooArgs = [
    "promptfoo",
    "eval",
    "-c",
    CONFIG,
    "--output",
    RESULTS,
  ];
  const status = run(promptfooBin, promptfooArgs);

  if (!fs.existsSync(RESULTS)) {
    console.error("[scheduled] promptfoo did not produce results file");
    process.exit(2);
  }

  const snapshotPath = path.join(HISTORY_DIR, `${timestamp()}.json`);
  fs.copyFileSync(RESULTS, snapshotPath);
  console.log(`[scheduled] snapshot saved: ${snapshotPath}`);

  // Run gate (threshold 0.85 for scheduled — staging gate).
  const gateStatus = run("node", [GATE, RESULTS, "--threshold=0.85"]);
  if (status !== 0 || gateStatus !== 0) process.exit(1);
  process.exit(0);
}

main();
