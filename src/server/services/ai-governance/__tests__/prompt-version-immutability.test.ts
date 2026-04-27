/**
 * B-W2-002 — PromptVersion immutability regression guard.
 *
 * SPEC-ARCH-AI-GOVERNANCE-V2 §4.2 — "PromptVersion é IMUTÁVEL: cada edição
 * cria nova linha; nunca UPDATE, nunca DELETE manual."
 *
 * Prisma exposes `db.promptVersion.update(...)` and `.delete(...)` — there
 * is no DB-level CHECK constraint preventing the call. This regression
 * test enforces the convention at the **codebase** level: no production
 * source under `src/server/services/` may call those methods on
 * `promptVersion`. Test files are explicitly allowed (they may simulate
 * forbidden writes to assert that production code does not use them).
 *
 * If this test starts failing, audit the new caller — either the call is
 * genuinely required (then SPEC §4.2 must change first) or the convention
 * must be restored.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SCAN_ROOT = join(ROOT, "src", "server", "services");

const FORBIDDEN_PATTERNS = [
  /promptVersion\.update\s*\(/,
  /promptVersion\.delete\s*\(/,
  /promptVersion\.deleteMany\s*\(/,
  /promptVersion\.updateMany\s*\(/,
  /promptVersion\.upsert\s*\(/,
];

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      // Skip __tests__ — tests may legitimately mock or simulate forbidden calls.
      if (entry === "__tests__") continue;
      out.push(...listSourceFiles(full));
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe("B-W2-002 — PromptVersion is immutable in production code", () => {
  const files = listSourceFiles(SCAN_ROOT);

  it("scan covers the ai-governance directory", () => {
    const aiGovFiles = files.filter((f) =>
      f.includes(join("ai-governance"))
    );
    // Wave 2 has shipped at least the prompt-admin service.
    expect(aiGovFiles.length).toBeGreaterThan(0);
  });

  it.each(files)("%s never calls db.promptVersion.update / .delete", (file) => {
    const source = readFileSync(file, "utf8");
    const rel = relative(ROOT, file);

    for (const pattern of FORBIDDEN_PATTERNS) {
      const match = source.match(pattern);
      expect(
        match,
        `${rel} contains forbidden ${match?.[0]} — PromptVersion is immutable per SPEC-ARCH-AI-GOVERNANCE-V2 §4.2.`
      ).toBeNull();
    }
  });
});
