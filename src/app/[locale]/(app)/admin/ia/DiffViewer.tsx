"use client";

/**
 * DiffViewer — side-by-side line diff for two PromptVersion bodies.
 *
 * SPEC-ARCH-AI-GOVERNANCE-V2 §5.1 (versioning); SPEC-UX-V2 §4.1 (side-by-side).
 *
 * Renders a two-column table:
 *   - Left:  baseline version (red background on `remove`)
 *   - Right: candidate version (green background on `add`)
 *   - Same lines render aligned on both sides with neutral background.
 *
 * Header surfaces the +X / -Y / =Z summary from `summarizeDiff`.
 *
 * B-W2-007 — Sprint 46 Wave 2 task 7/9.
 */
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { lineDiff, summarizeDiff, type LineOp } from "@/lib/text/line-diff";

interface DiffViewerProps {
  before: string;
  after: string;
  /** Heading for the left column — typically the baseline versionTag. */
  beforeLabel: string;
  /** Heading for the right column — typically the candidate versionTag. */
  afterLabel: string;
}

/**
 * Pair adjacent (remove, add) ops on the same row so the side-by-side
 * table reads as "this line on the left was changed to this line on the right"
 * instead of two isolated rows.
 */
function pairOps(
  ops: LineOp[]
): {
  left: { text: string; line: number | null; type: "same" | "remove" | "blank" };
  right: { text: string; line: number | null; type: "same" | "add" | "blank" };
}[] {
  const rows: ReturnType<typeof pairOps> = [];
  let i = 0;
  while (i < ops.length) {
    const op = ops[i]!;
    if (op.type === "remove") {
      const next = ops[i + 1];
      if (next && next.type === "add") {
        rows.push({
          left: { text: op.text, line: op.leftLine ?? null, type: "remove" },
          right: { text: next.text, line: next.rightLine ?? null, type: "add" },
        });
        i += 2;
        continue;
      }
      rows.push({
        left: { text: op.text, line: op.leftLine ?? null, type: "remove" },
        right: { text: "", line: null, type: "blank" },
      });
      i++;
      continue;
    }
    if (op.type === "add") {
      rows.push({
        left: { text: "", line: null, type: "blank" },
        right: { text: op.text, line: op.rightLine ?? null, type: "add" },
      });
      i++;
      continue;
    }
    // same
    rows.push({
      left: { text: op.text, line: op.leftLine ?? null, type: "same" },
      right: { text: op.text, line: op.rightLine ?? null, type: "same" },
    });
    i++;
  }
  return rows;
}

const CELL_BG: Record<string, string> = {
  same: "",
  remove: "bg-atlas-error/10",
  add: "bg-atlas-success/10",
  blank: "bg-atlas-surface-container-low/40",
};

export function DiffViewer({
  before,
  after,
  beforeLabel,
  afterLabel,
}: DiffViewerProps) {
  const t = useTranslations("admin.ia.diff");

  const ops = useMemo(() => lineDiff(before, after), [before, after]);
  const summary = useMemo(() => summarizeDiff(ops), [ops]);
  const rows = useMemo(() => pairOps(ops), [ops]);

  return (
    <div data-testid="admin-ia-diff-viewer" className="flex flex-col gap-3">
      <header className="flex items-baseline justify-between">
        <h3 className="text-lg font-semibold">{t("title")}</h3>
        <p
          className="text-sm text-atlas-on-surface-variant"
          data-testid="admin-ia-diff-summary"
          aria-live="polite"
        >
          <span className="text-atlas-success">+{summary.added}</span>{" "}
          <span className="text-atlas-error">−{summary.removed}</span>{" "}
          <span>={summary.same}</span>
        </p>
      </header>
      <div
        className="grid grid-cols-2 gap-3 overflow-auto rounded-atlas-md border border-atlas-outline-variant/40"
        role="region"
        aria-label={t("regionAria")}
      >
        <div>
          <div className="bg-atlas-surface-container-low px-3 py-2 text-xs font-bold">
            {beforeLabel}
          </div>
        </div>
        <div>
          <div className="bg-atlas-surface-container-low px-3 py-2 text-xs font-bold">
            {afterLabel}
          </div>
        </div>
      </div>
      <table
        className="w-full table-fixed border-collapse font-mono text-xs"
        data-testid="admin-ia-diff-table"
      >
        <thead className="sr-only">
          <tr>
            <th>{t("leftAria", { label: beforeLabel })}</th>
            <th>{t("rightAria", { label: afterLabel })}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} data-testid={`admin-ia-diff-row-${idx}`}>
              <td
                className={`whitespace-pre-wrap break-words border-r border-atlas-outline-variant/20 px-3 py-1 align-top ${CELL_BG[row.left.type]}`}
                data-cell="left"
                data-cell-type={row.left.type}
              >
                <span className="mr-2 text-atlas-on-surface-variant">
                  {row.left.line ?? ""}
                </span>
                {row.left.text}
              </td>
              <td
                className={`whitespace-pre-wrap break-words px-3 py-1 align-top ${CELL_BG[row.right.type]}`}
                data-cell="right"
                data-cell-type={row.right.type}
              >
                <span className="mr-2 text-atlas-on-surface-variant">
                  {row.right.line ?? ""}
                </span>
                {row.right.text}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
