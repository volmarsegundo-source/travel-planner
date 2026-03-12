/**
 * Unit tests for the EDD Eval History Tracker.
 *
 * Uses temporary directories for all file operations to avoid
 * polluting the real history directory.
 *
 * @module tests/evals/history
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import type { TrustScoreBreakdown } from "@/lib/evals/types";
import type { EvalAlert } from "@/lib/evals/alerts";
import {
  saveEvalHistory,
  loadEvalHistory,
  getLatestEntry,
  getTrendData,
} from "@/lib/evals/history";

// ─── Test Helpers ───────────────────────────────────────────────────────────────

function makeTrustScore(
  overrides: Partial<TrustScoreBreakdown> = {}
): TrustScoreBreakdown {
  return {
    safety: 0.95,
    accuracy: 0.90,
    performance: 0.85,
    ux: 0.80,
    i18n: 0.90,
    composite: 0.89,
    pass: true,
    threshold: 0.8,
    ...overrides,
  };
}

function makeHistoryEntry(overrides: Record<string, unknown> = {}) {
  return {
    timestamp: new Date().toISOString(),
    version: "0.22.0",
    trustScore: makeTrustScore(),
    evalResults: [
      { evalId: "EVAL-AI-001", score: 0.95, pass: true },
      { evalId: "EVAL-AI-002", score: 0.80, pass: true },
    ],
    durationMs: 1500,
    alerts: [] as EvalAlert[],
    ...overrides,
  };
}

// ─── Setup / Teardown ───────────────────────────────────────────────────────────

let tempDir: string;
let historyDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "eval-history-test-"));
  historyDir = path.join(tempDir, "docs", "evals", "history");
  fs.mkdirSync(historyDir, { recursive: true });

  // Mock process.cwd to redirect history files to temp dir.
  // history.ts uses getHistoryDir() which calls process.cwd() at runtime.
  vi.spyOn(process, "cwd").mockReturnValue(tempDir);
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

// ─── Tests ──────────────────────────────────────────────────────────────────────

describe("history", () => {
  describe("saveEvalHistory", () => {
    it("creates a JSON file with correct naming format", () => {
      const entry = makeHistoryEntry({
        timestamp: "2026-03-12T14:30:45.000Z",
      });
      const filepath = saveEvalHistory(entry);

      expect(filepath).toContain("2026-03-12-143045.json");
      expect(fs.existsSync(filepath)).toBe(true);

      const written = JSON.parse(fs.readFileSync(filepath, "utf-8"));
      expect(written.version).toBe("0.22.0");
      expect(written.trustScore.composite).toBe(0.89);
    });

    it("prunes entries beyond MAX_HISTORY_ENTRIES", () => {
      // Create 32 entries (beyond the 30 max)
      for (let i = 0; i < 32; i++) {
        const timestamp = new Date(
          Date.UTC(2026, 2, 1, 0, 0, i)
        ).toISOString();
        saveEvalHistory(makeHistoryEntry({ timestamp }));
      }

      const files = fs
        .readdirSync(historyDir)
        .filter((f) => f.endsWith(".json"));
      expect(files.length).toBeLessThanOrEqual(30);
    });
  });

  describe("loadEvalHistory", () => {
    it("returns entries sorted by timestamp descending", () => {
      const t1 = "2026-03-10T10:00:00.000Z";
      const t2 = "2026-03-11T10:00:00.000Z";
      const t3 = "2026-03-12T10:00:00.000Z";

      saveEvalHistory(makeHistoryEntry({ timestamp: t2 }));
      saveEvalHistory(makeHistoryEntry({ timestamp: t1 }));
      saveEvalHistory(makeHistoryEntry({ timestamp: t3 }));

      const entries = loadEvalHistory();

      expect(entries.length).toBe(3);
      expect(entries[0].timestamp).toBe(t3);
      expect(entries[1].timestamp).toBe(t2);
      expect(entries[2].timestamp).toBe(t1);
    });

    it("respects the limit parameter", () => {
      for (let i = 0; i < 5; i++) {
        const timestamp = new Date(
          Date.UTC(2026, 2, 10 + i, 0, 0, 0)
        ).toISOString();
        saveEvalHistory(makeHistoryEntry({ timestamp }));
      }

      const entries = loadEvalHistory(2);
      expect(entries.length).toBe(2);
    });
  });

  describe("getLatestEntry", () => {
    it("returns the most recent entry", () => {
      saveEvalHistory(
        makeHistoryEntry({ timestamp: "2026-03-10T10:00:00.000Z" })
      );
      saveEvalHistory(
        makeHistoryEntry({
          timestamp: "2026-03-12T10:00:00.000Z",
          version: "0.23.0",
        })
      );

      const latest = getLatestEntry();
      expect(latest).not.toBeNull();
      expect(latest!.version).toBe("0.23.0");
    });

    it("returns null when no history exists", () => {
      // Ensure the history dir is empty (no files from other tests)
      const files = fs.readdirSync(historyDir);
      for (const f of files) {
        fs.unlinkSync(path.join(historyDir, f));
      }

      const latest = getLatestEntry();
      expect(latest).toBeNull();
    });
  });

  describe("getTrendData", () => {
    it("calculates pass rate and average composite correctly", () => {
      const entries = [
        makeHistoryEntry({
          timestamp: "2026-03-10T10:00:00.000Z",
          trustScore: makeTrustScore({ composite: 0.9, pass: true }),
        }),
        makeHistoryEntry({
          timestamp: "2026-03-11T10:00:00.000Z",
          trustScore: makeTrustScore({ composite: 0.7, pass: false }),
        }),
        makeHistoryEntry({
          timestamp: "2026-03-12T10:00:00.000Z",
          trustScore: makeTrustScore({ composite: 0.8, pass: true }),
        }),
      ];

      const trends = getTrendData(entries);

      expect(trends.passRate).toBeCloseTo(2 / 3, 2);
      expect(trends.averageComposite).toBeCloseTo(0.8, 2);
    });

    it("returns composite scores in chronological order", () => {
      const entries = [
        makeHistoryEntry({
          timestamp: "2026-03-12T10:00:00.000Z",
          trustScore: makeTrustScore({ composite: 0.9 }),
        }),
        makeHistoryEntry({
          timestamp: "2026-03-10T10:00:00.000Z",
          trustScore: makeTrustScore({ composite: 0.7 }),
        }),
      ];

      const trends = getTrendData(entries);

      // Should be oldest first
      expect(trends.compositeScores[0].score).toBe(0.7);
      expect(trends.compositeScores[1].score).toBe(0.9);
    });

    it("includes dimension trends for all five dimensions", () => {
      const entries = [
        makeHistoryEntry({
          timestamp: "2026-03-12T10:00:00.000Z",
        }),
      ];

      const trends = getTrendData(entries);

      expect(Object.keys(trends.dimensionTrends)).toEqual(
        expect.arrayContaining([
          "safety",
          "accuracy",
          "performance",
          "ux",
          "i18n",
        ])
      );
    });

    it("handles empty entries array", () => {
      const trends = getTrendData([]);

      expect(trends.compositeScores).toHaveLength(0);
      expect(trends.passRate).toBe(0);
      expect(trends.averageComposite).toBe(0);
    });
  });
});
