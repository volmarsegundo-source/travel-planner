// Sprint 45 Phase 1: Parse tsc/lint/vitest logs into raw-errors JSON.
// Temporary diagnostic script — can be deleted after SCOPE-BOX is approved.
const fs = require("fs");

const tscLog = fs.readFileSync("tmp-tsc.log", "utf8");
const tsRe = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/;
const tsErrors = [];
for (const line of tscLog.split(/\r?\n/)) {
  const m = line.match(tsRe);
  if (m) {
    tsErrors.push({
      tool: "tsc",
      file: m[1].replace(/\\/g, "/"),
      line: Number(m[2]),
      col: Number(m[3]),
      rule: m[4],
      message: m[5],
    });
  }
}

const lintLog = fs.readFileSync("tmp-lint.log", "utf8");
const lintErrors = [];
let currentFile = null;
for (const raw of lintLog.split(/\r?\n/)) {
  const line = raw.replace(/\x1b\[[0-9;]*m/g, "").trim();
  if (!line) continue;
  if (line.startsWith("./")) {
    currentFile = line.replace(/^\.\//, "");
    continue;
  }
  const m = line.match(/^(\d+):(\d+)\s+(Warning|Error):\s+(.*?)\s{2,}([a-zA-Z/@][\w/@-]+)$/);
  if (m && currentFile) {
    lintErrors.push({
      tool: "eslint",
      file: currentFile.replace(/\\/g, "/"),
      line: Number(m[1]),
      col: Number(m[2]),
      severity: m[3].toLowerCase(),
      message: m[4],
      rule: m[5],
    });
  }
}

const vitestLog = fs.readFileSync("tmp-vitest.log", "utf8");
const clean = vitestLog.replace(/\x1b\[[0-9;]*m/g, "");
const vitestErrors = [];
const seenFiles = new Set();
const fileRe = /FAIL\s+((?:src|tests)\/\S+\.(?:test|spec)\.[jt]sx?)/g;
let fm;
while ((fm = fileRe.exec(clean))) {
  const f = fm[1].replace(/\\/g, "/");
  if (!seenFiles.has(f)) {
    seenFiles.add(f);
    vitestErrors.push({ tool: "vitest", file: f, rule: "test_failure" });
  }
}

const out = {
  generatedAt: new Date().toISOString(),
  baseline: {
    typecheck: { total: tsErrors.length, source: "npx tsc --noEmit (no techdebt exclude)" },
    lint: { total: lintErrors.length, source: "npx next lint (techdebt allowlist downgrades 24 no-unused-vars warn — removing it flips to error; count unchanged)" },
    vitest: { totalFiles: vitestErrors.length, totalTests: 51, source: "npx vitest run w/ strict config (no techdebt exclude)" },
    total: tsErrors.length + lintErrors.length + 51,
  },
  typecheck: {
    byCode: tsErrors.reduce((acc, e) => ((acc[e.rule] = (acc[e.rule] || 0) + 1), acc), {}),
    byFile: tsErrors.reduce((acc, e) => ((acc[e.file] = (acc[e.file] || 0) + 1), acc), {}),
    rootCause: {
      "TS2339 jest-dom matchers": 485,
      note: "Single fix at tests/setup.ts: import '@testing-library/jest-dom/vitest' (not plain '@testing-library/jest-dom') should resolve 485/497 TS errors.",
    },
    errors: tsErrors,
  },
  lint: {
    byRule: lintErrors.reduce((acc, e) => ((acc[e.rule] = (acc[e.rule] || 0) + 1), acc), {}),
    byFile: lintErrors.reduce((acc, e) => ((acc[e.file] = (acc[e.file] || 0) + 1), acc), {}),
    errors: lintErrors,
  },
  vitest: {
    failingFiles: vitestErrors.map((e) => e.file),
  },
};

fs.writeFileSync(
  "docs/specs/sprint-45/raw-errors-2026-04-20.json",
  JSON.stringify(out, null, 2)
);
console.log("TS:", tsErrors.length, "LINT:", lintErrors.length, "VITEST FILES:", vitestErrors.length);
console.log("TOTAL:", tsErrors.length + lintErrors.length + 51);
