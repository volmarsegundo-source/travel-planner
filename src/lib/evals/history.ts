/**
 * Eval History Tracker
 *
 * Persists eval run results as individual JSON files in docs/evals/history/.
 * Provides read, trend analysis, and pruning functionality.
 *
 * This module uses node:fs and is intended for build-time / script use only.
 * It must NOT be imported in Edge runtime or client-side code.
 *
 * @module evals/history
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { TrustScoreBreakdown } from "./types";
import type { EvalAlert } from "./alerts";

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface EvalHistoryEntry {
  /** ISO 8601 timestamp of the eval run */
  timestamp: string;
  /** Application version at time of eval */
  version: string;
  /** Trust score breakdown from this run */
  trustScore: TrustScoreBreakdown;
  /** Summary of individual eval results */
  evalResults: Array<{ evalId: string; score: number; pass: boolean }>;
  /** Total wall-clock duration in milliseconds */
  durationMs: number;
  /** Alerts generated during this run */
  alerts: EvalAlert[];
}

export interface TrendData {
  /** Composite scores over time */
  compositeScores: Array<{ timestamp: string; score: number }>;
  /** Per-dimension score trends */
  dimensionTrends: Record<string, Array<{ timestamp: string; score: number }>>;
  /** Fraction of entries that passed (0-1) */
  passRate: number;
  /** Mean composite score across entries */
  averageComposite: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

/** Maximum number of history files to retain. Older entries are pruned. */
const MAX_HISTORY_ENTRIES = 30;

/**
 * Returns the history directory path. Evaluated at call time (not module load)
 * so that test mocking of process.cwd() works correctly.
 */
function getHistoryDir(): string {
  return path.resolve(process.cwd(), "docs/evals/history");
}

const DIMENSIONS = ["safety", "accuracy", "performance", "ux", "i18n"] as const;

// ─── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Ensures the history directory exists.
 */
function ensureHistoryDir(): void {
  const dir = getHistoryDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Formats an ISO timestamp into a filename-safe string.
 * Example: "2026-03-12T14:30:45.123Z" -> "2026-03-12-143045"
 */
function timestampToFilename(isoTimestamp: string): string {
  const d = new Date(isoTimestamp);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  const seconds = String(d.getUTCSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}-${hours}${minutes}${seconds}`;
}

/**
 * Lists all .json files in the history directory, sorted by name descending.
 */
function listHistoryFiles(): string[] {
  ensureHistoryDir();
  return fs
    .readdirSync(getHistoryDir())
    .filter((f) => f.endsWith(".json"))
    .sort()
    .reverse();
}

// ─── Public API ─────────────────────────────────────────────────────────────────

/**
 * Saves an eval history entry to a JSON file.
 *
 * Filename format: YYYY-MM-DD-HHmmss.json
 * Prunes entries beyond MAX_HISTORY_ENTRIES (oldest first).
 *
 * @param entry - The eval history entry to persist
 * @returns Absolute path of the saved file
 */
export function saveEvalHistory(entry: EvalHistoryEntry): string {
  ensureHistoryDir();

  const historyDir = getHistoryDir();
  const filename = `${timestampToFilename(entry.timestamp)}.json`;
  const filepath = path.join(historyDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(entry, null, 2), "utf-8");

  // Prune old entries
  const files = listHistoryFiles();
  if (files.length > MAX_HISTORY_ENTRIES) {
    const toRemove = files.slice(MAX_HISTORY_ENTRIES);
    for (const file of toRemove) {
      fs.unlinkSync(path.join(getHistoryDir(), file));
    }
  }

  return filepath;
}

/**
 * Loads eval history entries from disk, sorted by timestamp descending.
 *
 * @param limit - Maximum number of entries to return (default: 30)
 * @returns Array of history entries, most recent first
 */
export function loadEvalHistory(limit = MAX_HISTORY_ENTRIES): EvalHistoryEntry[] {
  const files = listHistoryFiles();
  const entries: EvalHistoryEntry[] = [];

  for (const file of files.slice(0, limit)) {
    try {
      const content = fs.readFileSync(path.join(getHistoryDir(), file), "utf-8");
      entries.push(JSON.parse(content) as EvalHistoryEntry);
    } catch {
      // Skip corrupt files — do not crash the reader
      console.warn(`[EVAL-HISTORY] Skipping unreadable file: ${file}`);
    }
  }

  // Sort by timestamp descending (files are already name-sorted but entries have precise timestamps)
  entries.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return entries;
}

/**
 * Returns the most recent eval history entry, or null if none exist.
 */
export function getLatestEntry(): EvalHistoryEntry | null {
  const entries = loadEvalHistory(1);
  return entries[0] ?? null;
}

/**
 * Computes trend data from a set of history entries.
 *
 * @param entries - History entries to analyze (should be pre-sorted)
 * @returns Trend metrics including composite scores, dimension trends, pass rate, and average
 */
export function getTrendData(entries: EvalHistoryEntry[]): TrendData {
  // Sort oldest-first for chronological trends
  const chronological = [...entries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const compositeScores = chronological.map((e) => ({
    timestamp: e.timestamp,
    score: e.trustScore.composite,
  }));

  const dimensionTrends: Record<
    string,
    Array<{ timestamp: string; score: number }>
  > = {};
  for (const dim of DIMENSIONS) {
    dimensionTrends[dim] = chronological.map((e) => ({
      timestamp: e.timestamp,
      score: e.trustScore[dim],
    }));
  }

  const passCount = entries.filter((e) => e.trustScore.pass).length;
  const passRate = entries.length > 0 ? passCount / entries.length : 0;

  const totalComposite = entries.reduce(
    (sum, e) => sum + e.trustScore.composite,
    0
  );
  const averageComposite =
    entries.length > 0 ? totalComposite / entries.length : 0;

  return {
    compositeScores,
    dimensionTrends,
    passRate,
    averageComposite,
  };
}
