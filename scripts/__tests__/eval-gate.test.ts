/**
 * C-02 — EDD Eval Gate behavioral tests.
 *
 * Validates the gate runner's exit-code and message contracts so future
 * regressions cannot silently turn the gate into a no-op (Sprint 45 retro
 * St-05: "don't defer silent CI failures").
 *
 * Runs the gate as a child process so it exercises the same exit-code path
 * CI uses. Each scenario writes a fixture report to a tmp file.
 */
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const SCRIPT_PATH = resolve(__dirname, "..", "eval-gate.ts");

let workDir = "";

beforeAll(() => {
  workDir = mkdtempSync(join(tmpdir(), "eval-gate-"));
});

afterEach(() => {
  // Empty workDir between cases without removing the dir handle.
  for (const f of ["report.json"]) {
    try {
      rmSync(join(workDir, f));
    } catch {
      /* ignored */
    }
  }
});

function writeReport(partial: {
  total?: number;
  passed?: number;
  failed?: number;
  pending?: number;
  testResults?: unknown[];
}): string {
  const total = partial.total ?? 0;
  const passed = partial.passed ?? 0;
  const failed = partial.failed ?? 0;
  const pending = partial.pending ?? 0;
  const path = join(workDir, "report.json");
  writeFileSync(
    path,
    JSON.stringify({
      numTotalTests: total,
      numPassedTests: passed,
      numFailedTests: failed,
      numPendingTests: pending,
      testResults: partial.testResults ?? [],
    }),
    "utf8"
  );
  return path;
}

function runGate(args: string[]): SpawnSyncReturns<string> {
  return spawnSync(
    process.execPath,
    [
      // Use npx tsx so the gate runs the same way CI does.
      resolve(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs"),
      SCRIPT_PATH,
      ...args,
    ],
    {
      encoding: "utf8",
      cwd: workDir,
    }
  );
}

describe("C-02 EDD Eval Gate — behavioral contract", () => {
  describe("threshold pass/fail boundaries", () => {
    it("exits 0 (PASS) when pass-rate ≥ PR threshold (0.80)", () => {
      const path = writeReport({ total: 100, passed: 90, failed: 10 });
      const out = runGate([path, "--threshold=0.80"]);
      expect(out.status).toBe(0);
      expect(out.stdout).toContain("GATE PASSED");
    });

    it("exits 1 (FAIL) when pass-rate < PR threshold", () => {
      const path = writeReport({ total: 100, passed: 70, failed: 30 });
      const out = runGate([path, "--threshold=0.80"]);
      expect(out.status).toBe(1);
      expect(out.stdout).toContain("GATE FAILED");
    });

    it("exits 1 when staging threshold (0.85) not met", () => {
      const path = writeReport({ total: 100, passed: 82, failed: 18 });
      const out = runGate([path, "--threshold=0.85"]);
      expect(out.status).toBe(1);
      expect(out.stdout).toContain("GATE FAILED");
    });

    it("exits 1 when prod threshold (0.90) not met", () => {
      const path = writeReport({ total: 100, passed: 88, failed: 12 });
      const out = runGate([path, "--threshold=0.90"]);
      expect(out.status).toBe(1);
      expect(out.stdout).toContain("GATE FAILED");
    });

    it("exits 0 at exact threshold boundary (≥, not >)", () => {
      const path = writeReport({ total: 100, passed: 80, failed: 20 });
      const out = runGate([path, "--threshold=0.80"]);
      expect(out.status).toBe(0);
    });
  });

  describe("loud failure paths (no silent pass)", () => {
    it("exits 1 when report file missing", () => {
      const out = runGate([join(workDir, "does-not-exist.json"), "--threshold=0.80"]);
      expect(out.status).toBe(1);
      expect(out.stderr).toContain("Eval report not found");
    });

    it("exits 1 when report file is malformed JSON", () => {
      const path = join(workDir, "report.json");
      writeFileSync(path, "{not valid json", "utf8");
      const out = runGate([path, "--threshold=0.80"]);
      expect(out.status).toBe(1);
      expect(out.stderr).toContain("Failed to parse");
    });

    it("exits 1 when report has zero tests (default fail-closed)", () => {
      const path = writeReport({ total: 0, passed: 0, failed: 0 });
      const out = runGate([path, "--threshold=0.80"]);
      expect(out.status).toBe(1);
      expect(out.stdout).toContain("GATE FAILED");
    });

    it("exits 0 when report has zero tests AND --allow-empty is passed", () => {
      const path = writeReport({ total: 0, passed: 0, failed: 0 });
      const out = runGate([path, "--threshold=0.80", "--allow-empty"]);
      expect(out.status).toBe(0);
      expect(out.stdout).toContain("GATE PASSED");
      // Must surface the skip reason explicitly so the skip is visible.
      expect(out.stdout).toContain("--allow-empty");
    });

    it("exits 1 when report file is stale (mtime older than max-age)", () => {
      const path = writeReport({ total: 100, passed: 100, failed: 0 });
      // Make file 25 hours old.
      const past = (Date.now() - 25 * 60 * 60 * 1000) / 1000;
      utimesSync(path, past, past);
      const out = runGate([path, "--threshold=0.80", "--max-age-hours=24"]);
      expect(out.status).toBe(1);
      expect(out.stderr.toLowerCase()).toMatch(/stale|too old|exceeds/);
    });

    it("does NOT enforce stale check when max-age-hours is omitted (default off)", () => {
      const path = writeReport({ total: 100, passed: 100, failed: 0 });
      const past = (Date.now() - 48 * 60 * 60 * 1000) / 1000;
      utimesSync(path, past, past);
      const out = runGate([path, "--threshold=0.80"]);
      expect(out.status).toBe(0);
    });
  });

  describe("argument validation", () => {
    it("exits 1 when --threshold is not a number", () => {
      const path = writeReport({ total: 100, passed: 100, failed: 0 });
      const out = runGate([path, "--threshold=NaN"]);
      expect(out.status).toBe(1);
      expect(out.stderr).toContain("threshold");
    });

    it("exits 1 when --threshold is out of [0,1]", () => {
      const path = writeReport({ total: 100, passed: 100, failed: 0 });
      const out = runGate([path, "--threshold=1.5"]);
      expect(out.status).toBe(1);
      expect(out.stderr).toContain("threshold");
    });
  });

  describe("telemetry shape (for CI log aggregators)", () => {
    it("emits a single-line JSON telemetry record", () => {
      const path = writeReport({ total: 100, passed: 90, failed: 10 });
      const out = runGate([path, "--threshold=0.80"]);
      const lines = out.stdout
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const telemetry = lines.find(
        (l) => l.startsWith('{"timestamp"') && l.endsWith("}")
      );
      expect(telemetry).toBeDefined();
      const parsed = JSON.parse(telemetry as string);
      expect(parsed.event).toBe("eval.gate");
      expect(parsed.result).toBe("PASS");
      expect(parsed.passRate).toBeCloseTo(0.9, 5);
      expect(parsed.threshold).toBe(0.8);
    });

    it("telemetry record includes 'FAIL' result when threshold breached", () => {
      const path = writeReport({ total: 100, passed: 50, failed: 50 });
      const out = runGate([path, "--threshold=0.80"]);
      const tele = out.stdout
        .split("\n")
        .find((l) => l.includes('"event":"eval.gate"'));
      expect(tele).toBeDefined();
      const parsed = JSON.parse(tele as string);
      expect(parsed.result).toBe("FAIL");
    });
  });
});
