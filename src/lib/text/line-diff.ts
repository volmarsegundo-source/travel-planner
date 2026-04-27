/**
 * Line-level diff via LCS — returns ops suitable for a side-by-side viewer.
 *
 * Used by `DiffViewer` (B-W2-007) to compare two `PromptVersion` rows.
 * Pure function, no dependencies; small enough for prompt-template-sized
 * inputs (≤ 50k chars Zod cap).
 *
 * SPEC-ARCH-AI-GOVERNANCE-V2 §5.1 implies version diff is a Wave 2
 * surface; SPEC-UX-V2 §4.1 specifies side-by-side. This helper produces
 * the data; the rendering happens in the React component.
 *
 * B-W2-007 — Sprint 46 Wave 2 task 7/9.
 */

export type LineOpType = "same" | "add" | "remove";

export interface LineOp {
  type: LineOpType;
  text: string;
  /** 1-indexed line number on the LEFT side (only set for same / remove). */
  leftLine?: number;
  /** 1-indexed line number on the RIGHT side (only set for same / add). */
  rightLine?: number;
}

export interface DiffSummary {
  added: number;
  removed: number;
  same: number;
}

/**
 * Compute line-level operations between `before` and `after`.
 *
 * Returns ops in display order (top to bottom). Each op carries its
 * left / right line numbers so the renderer can label gutters.
 *
 * Empty inputs are treated as zero-line strings; trailing newlines are
 * preserved as empty trailing lines (intentional — admins notice
 * trailing-newline-only diffs).
 */
export function lineDiff(before: string, after: string): LineOp[] {
  const aLines = before.split("\n");
  const bLines = after.split("\n");
  const n = aLines.length;
  const m = bLines.length;

  // Build LCS table sized (n+1) x (m+1), values are int counts.
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0)
  );
  for (let i = 1; i <= n; i++) {
    const ai = aLines[i - 1];
    const row = dp[i]!;
    const prevRow = dp[i - 1]!;
    for (let j = 1; j <= m; j++) {
      if (ai === bLines[j - 1]) {
        row[j] = prevRow[j - 1]! + 1;
      } else {
        const top = prevRow[j]!;
        const left = row[j - 1]!;
        row[j] = top >= left ? top : left;
      }
    }
  }

  // Backtrack to recover the op sequence.
  const ops: LineOp[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && aLines[i - 1] === bLines[j - 1]) {
      ops.push({
        type: "same",
        text: aLines[i - 1]!,
        leftLine: i,
        rightLine: j,
      });
      i--;
      j--;
    } else if (
      j > 0 &&
      (i === 0 || (dp[i]![j - 1]! >= dp[i - 1]![j]!))
    ) {
      ops.push({
        type: "add",
        text: bLines[j - 1]!,
        rightLine: j,
      });
      j--;
    } else {
      ops.push({
        type: "remove",
        text: aLines[i - 1]!,
        leftLine: i,
      });
      i--;
    }
  }
  return ops.reverse();
}

/** Aggregate counts for a header summary ("+12 / -8 / 144 unchanged"). */
export function summarizeDiff(ops: LineOp[]): DiffSummary {
  let added = 0;
  let removed = 0;
  let same = 0;
  for (const op of ops) {
    if (op.type === "add") added++;
    else if (op.type === "remove") removed++;
    else same++;
  }
  return { added, removed, same };
}
