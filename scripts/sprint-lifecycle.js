#!/usr/bin/env node

/**
 * Sprint Lifecycle — Manages sprints with quality gates
 *
 * Usage:
 *   node scripts/sprint-lifecycle.js start <N>
 *   node scripts/sprint-lifecycle.js review <N>
 *   node scripts/sprint-lifecycle.js finish <N>
 *   node scripts/sprint-lifecycle.js status <N>
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "..");

const C = {
  reset: "\x1b[0m", red: "\x1b[31m", yellow: "\x1b[33m",
  green: "\x1b[32m", cyan: "\x1b[36m", bold: "\x1b[1m", dim: "\x1b[2m",
};

function ok(msg)   { console.log(`  ${C.green}✓${C.reset} ${msg}`); }
function warn(msg) { console.log(`  ${C.yellow}⚠${C.reset} ${msg}`); }
function fail(msg) { console.log(`  ${C.red}✗${C.reset} ${msg}`); }
function info(msg) { console.log(`  ${C.cyan}ℹ${C.reset} ${msg}`); }
function header(msg) { console.log(`\n${C.bold}${C.cyan}━━━ ${msg} ━━━${C.reset}`); }

function exec(cmd, opts = {}) {
  try { return execSync(cmd, { encoding: "utf8", stdio: "pipe", cwd: ROOT, ...opts }).trim(); }
  catch (e) { return opts.throwOnError ? null : (e.stdout || "").trim(); }
}

function getChangedFiles(sprintN) {
  // Files changed in this sprint (compared to master)
  const diff = exec("git diff --name-only master...HEAD 2>/dev/null") || "";
  if (diff) return diff.split("\n").filter(Boolean);
  // Fallback: all tracked files
  return [];
}

// ─── START ──────────────────────────────────────────────────────────────────

function start(sprintN) {
  console.log(`\n${C.bold}${C.cyan}🏁 Starting Sprint ${sprintN}${C.reset}\n`);

  // Check previous sprint review exists
  if (sprintN > 1) {
    const prevReview = path.join(ROOT, `review-sprint-${sprintN - 1}.md`);
    if (!fs.existsSync(prevReview)) {
      warn(`review-sprint-${sprintN - 1}.md not found — previous sprint may not be complete`);
    } else {
      ok(`Sprint ${sprintN - 1} review found`);
    }
  }

  // Check current branch
  const currentBranch = exec("git branch --show-current");
  const targetBranch = `feat/sprint-${sprintN}`;

  if (currentBranch === targetBranch) {
    ok(`Already on branch ${targetBranch}`);
  } else {
    info(`Creating branch ${targetBranch}...`);
    exec(`git checkout -b ${targetBranch}`);
    ok(`Branch ${targetBranch} created`);
  }

  // Tag start
  const startTag = `sprint-${sprintN}-start`;
  const existingTags = exec("git tag -l") || "";
  if (!existingTags.includes(startTag)) {
    exec(`git tag ${startTag}`);
    ok(`Tag ${startTag} created`);
  } else {
    info(`Tag ${startTag} already exists`);
  }

  // Baseline tests
  header("Baseline Tests");
  info("Running tests to establish baseline...");
  const testOutput = exec("npx vitest run 2>&1") || "";
  const passMatch = testOutput.match(/(\d+)\s+passed/);
  if (passMatch) ok(`Baseline: ${passMatch[1]} tests passing`);
  else warn("Could not determine baseline test count");

  // Create plan file
  const planPath = path.join(ROOT, `sprint-${sprintN}-plan.md`);
  if (!fs.existsSync(planPath)) {
    fs.writeFileSync(planPath, `# Sprint ${sprintN} Plan\n\n**Created:** ${new Date().toISOString().split("T")[0]}\n\n## Goals\n\n- [ ] \n\n## Tasks\n\n- [ ] \n`);
    ok(`Created sprint-${sprintN}-plan.md`);
  } else {
    info(`sprint-${sprintN}-plan.md already exists`);
  }

  console.log(`\n  ${C.green}${C.bold}Sprint ${sprintN} started!${C.reset}\n`);
}

// ─── REVIEW ─────────────────────────────────────────────────────────────────

function review(sprintN) {
  console.log(`\n${C.bold}${C.cyan}📋 Reviewing Sprint ${sprintN}${C.reset}\n`);

  const issues = [];

  // 1. Tests
  header("Tests");
  info("Running vitest...");
  const testOutput = exec("npx vitest run 2>&1") || "";
  const testPassMatch = testOutput.match(/(\d+)\s+passed/);
  const testFailMatch = testOutput.match(/(\d+)\s+failed/);
  const passed = testPassMatch ? parseInt(testPassMatch[1]) : 0;
  const failed = testFailMatch ? parseInt(testFailMatch[1]) : 0;

  if (failed > 0) {
    fail(`${failed} tests failing`);
    issues.push({ severity: "CRITICAL", category: "Tests", message: `${failed} tests failing` });
  } else {
    ok(`${passed} tests passing`);
  }

  // 2. Lint
  header("Lint");
  info("Running ESLint...");
  const lintOutput = exec("npx next lint 2>&1") || "";
  if (lintOutput.includes("error") && !lintOutput.includes("0 errors")) {
    warn("Lint errors found");
    issues.push({ severity: "MEDIUM", category: "Lint", message: "ESLint errors found" });
  } else {
    ok("Lint passed");
  }

  // 3. Type check
  header("Type Check");
  info("Running tsc --noEmit...");
  const tscOutput = exec("npx tsc --noEmit 2>&1") || "";
  if (tscOutput.includes("error TS")) {
    warn("Type errors found");
    issues.push({ severity: "HIGH", category: "TypeCheck", message: "TypeScript errors found" });
  } else {
    ok("Type check passed");
  }

  // 4. Security scan (integrated)
  header("Security Scan");
  try {
    const securityAudit = require("./security-audit.js");
    const secResult = securityAudit.run();
    if (secResult && secResult.counts) {
      if (secResult.counts.CRITICAL > 0) {
        issues.push({ severity: "CRITICAL", category: "Security", message: `${secResult.counts.CRITICAL} critical security issue(s)` });
      }
      if (secResult.counts.HIGH > 0) {
        issues.push({ severity: "HIGH", category: "Security", message: `${secResult.counts.HIGH} high security issue(s)` });
      }
    }
  } catch {
    warn("Security audit script not available");
  }

  // 5. i18n check (integrated)
  header("i18n Check");
  try {
    const i18nManager = require("./i18n-manager.js");
    const i18nResult = i18nManager.run();
    if (i18nResult && i18nResult.counts) {
      if (i18nResult.counts.missing > 0) {
        issues.push({ severity: "MEDIUM", category: "i18n", message: `${i18nResult.counts.missing} missing translation key(s)` });
      }
      if (i18nResult.counts.interpolation > 0) {
        issues.push({ severity: "HIGH", category: "i18n", message: `${i18nResult.counts.interpolation} interpolation mismatch(es)` });
      }
    }
  } catch {
    warn("i18n manager script not available");
  }

  // 6. TODOs in changed files
  header("TODO Scan");
  const changedFiles = getChangedFiles(sprintN);
  let todoCount = 0;
  for (const file of changedFiles) {
    const fullPath = path.join(ROOT, file);
    if (!fs.existsSync(fullPath)) continue;
    try {
      const content = fs.readFileSync(fullPath, "utf8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (/\bTODO\b/i.test(lines[i]) && !lines[i].includes("TODO:")) {
          todoCount++;
        } else if (/\bTODO:/i.test(lines[i])) {
          todoCount++;
          info(`TODO in ${file}:${i + 1}`);
        }
      }
    } catch { /* skip binary files */ }
  }
  if (todoCount > 0) {
    issues.push({ severity: "MEDIUM", category: "TODOs", message: `${todoCount} TODO(s) in changed files` });
  } else {
    ok("No TODOs in changed files");
  }

  // 7. Files without tests
  header("Test Coverage");
  const srcFiles = changedFiles.filter((f) => f.startsWith("src/") && /\.(tsx?|jsx?)$/.test(f) && !f.includes("test"));
  const testFiles = changedFiles.filter((f) => f.includes("test"));
  if (srcFiles.length > 0 && testFiles.length === 0) {
    issues.push({ severity: "HIGH", category: "Coverage", message: "New source files without corresponding tests" });
    warn("Changed source files have no new tests");
  } else {
    ok(`${testFiles.length} test file(s) for ${srcFiles.length} source file(s)`);
  }

  // ─── Generate review report ───
  const reviewPath = path.join(ROOT, `review-sprint-${sprintN}.md`);
  let md = `# Sprint ${sprintN} — Review\n\n`;
  md += `**Date:** ${new Date().toISOString().split("T")[0]}\n\n`;

  // Summary table
  const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const i of issues) counts[i.severity]++;

  md += `## Quality Gate\n\n`;
  md += `| Severity | Count |\n|----------|-------|\n`;
  for (const [sev, count] of Object.entries(counts)) {
    md += `| ${sev} | ${count} |\n`;
  }
  md += `\n**Status:** ${counts.CRITICAL > 0 ? "❌ BLOCKED" : "✅ PASS"}\n\n`;

  md += `## Tests\n\n- Passed: ${passed}\n- Failed: ${failed}\n\n`;

  if (issues.length > 0) {
    md += `## Issues\n\n`;
    for (const i of issues) {
      md += `- **[${i.severity}]** [${i.category}] ${i.message}\n`;
    }
    md += `\n`;
  }

  md += `## Changed Files\n\n`;
  for (const f of changedFiles.slice(0, 50)) {
    md += `- ${f}\n`;
  }
  if (changedFiles.length > 50) md += `- ... and ${changedFiles.length - 50} more\n`;

  fs.writeFileSync(reviewPath, md);

  // Print summary
  header("Review Summary");
  console.log(`    ${C.red}CRITICAL: ${counts.CRITICAL}${C.reset}`);
  console.log(`    ${C.yellow}HIGH: ${counts.HIGH}${C.reset}`);
  console.log(`    ${C.cyan}MEDIUM: ${counts.MEDIUM}${C.reset}`);
  console.log(`    ${C.dim}LOW: ${counts.LOW}${C.reset}`);

  if (counts.CRITICAL > 0) {
    console.log(`\n  ${C.red}${C.bold}Sprint ${sprintN} is BLOCKED — fix CRITICAL issues before finishing${C.reset}\n`);
  } else {
    console.log(`\n  ${C.green}${C.bold}Sprint ${sprintN} review passed!${C.reset}`);
  }

  ok(`Report saved to review-sprint-${sprintN}.md`);
  console.log("");

  return { issues, counts, passed, failed };
}

// ─── FINISH ─────────────────────────────────────────────────────────────────

function finish(sprintN) {
  console.log(`\n${C.bold}${C.cyan}🏆 Finishing Sprint ${sprintN}${C.reset}\n`);

  // Check review exists and has no CRITICAL
  const reviewPath = path.join(ROOT, `review-sprint-${sprintN}.md`);
  if (!fs.existsSync(reviewPath)) {
    fail(`review-sprint-${sprintN}.md not found — run sprint:review ${sprintN} first`);
    process.exit(1);
  }

  const reviewContent = fs.readFileSync(reviewPath, "utf8");
  if (reviewContent.includes("BLOCKED") || reviewContent.includes("CRITICAL | ") && !reviewContent.includes("CRITICAL | 0")) {
    const critMatch = reviewContent.match(/CRITICAL \| (\d+)/);
    if (critMatch && parseInt(critMatch[1]) > 0) {
      fail(`Sprint has ${critMatch[1]} CRITICAL issue(s) — fix before finishing`);
      process.exit(1);
    }
  }

  ok("No CRITICAL issues in review");

  // Final tests
  header("Final Tests");
  info("Running final test suite...");
  const testOutput = exec("npx vitest run 2>&1") || "";
  const failMatch = testOutput.match(/(\d+)\s+failed/);
  if (failMatch && parseInt(failMatch[1]) > 0) {
    fail(`${failMatch[1]} tests still failing — cannot finish sprint`);
    process.exit(1);
  }
  const passMatch = testOutput.match(/(\d+)\s+passed/);
  ok(`${passMatch ? passMatch[1] : "All"} tests passing`);

  // Generate changelog
  header("Changelog");
  const log = exec(`git log master..HEAD --oneline 2>/dev/null`) || exec(`git log --oneline -10`);
  const changelogPath = path.join(ROOT, `changelog-sprint-${sprintN}.md`);
  let cl = `# Sprint ${sprintN} Changelog\n\n`;
  cl += `**Date:** ${new Date().toISOString().split("T")[0]}\n\n`;
  cl += `## Commits\n\n`;
  if (log) {
    for (const line of log.split("\n").filter(Boolean)) {
      cl += `- ${line}\n`;
    }
  }
  fs.writeFileSync(changelogPath, cl);
  ok(`changelog-sprint-${sprintN}.md created`);

  // Tag complete
  const completeTag = `sprint-${sprintN}-complete`;
  const existingTags = exec("git tag -l") || "";
  if (!existingTags.includes(completeTag)) {
    exec(`git tag ${completeTag}`);
    ok(`Tag ${completeTag} created`);
  }

  console.log(`\n  ${C.green}${C.bold}Sprint ${sprintN} finished!${C.reset}`);
  info("Don't forget to: git push && git push --tags\n");
}

// ─── STATUS ─────────────────────────────────────────────────────────────────

function status(sprintN) {
  console.log(`\n${C.bold}${C.cyan}📊 Sprint ${sprintN} Status${C.reset}\n`);

  const branch = exec("git branch --show-current") || "";
  const tags = exec("git tag -l") || "";
  const reviewPath = path.join(ROOT, `review-sprint-${sprintN}.md`);

  const hasStartTag = tags.includes(`sprint-${sprintN}-start`);
  const hasCompleteTag = tags.includes(`sprint-${sprintN}-complete`);
  const hasReview = fs.existsSync(reviewPath);
  const onBranch = branch === `feat/sprint-${sprintN}`;

  let state;
  if (hasCompleteTag) {
    state = "COMPLETED";
  } else if (hasReview) {
    const content = fs.readFileSync(reviewPath, "utf8");
    if (content.includes("BLOCKED")) state = "BLOCKED";
    else state = "READY TO FINISH";
  } else if (hasStartTag || onBranch) {
    state = "IN PROGRESS";
  } else {
    state = "NOT STARTED";
  }

  const stateColors = { "NOT STARTED": C.dim, "IN PROGRESS": C.cyan, "BLOCKED": C.red, "READY TO FINISH": C.yellow, "COMPLETED": C.green };
  console.log(`  State: ${stateColors[state] || ""}${C.bold}${state}${C.reset}`);
  console.log(`  Branch: ${onBranch ? C.green : C.dim}${branch}${C.reset}`);
  console.log(`  Start tag: ${hasStartTag ? `${C.green}✓` : `${C.dim}✗`}${C.reset}`);
  console.log(`  Review: ${hasReview ? `${C.green}✓` : `${C.dim}✗`}${C.reset}`);
  console.log(`  Complete tag: ${hasCompleteTag ? `${C.green}✓` : `${C.dim}✗`}${C.reset}`);
  console.log("");

  return state;
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = { start, review, finish, status };

// ─── Main ───────────────────────────────────────────────────────────────────

if (require.main === module) {
  const [command, sprintArg] = process.argv.slice(2);
  const sprintN = parseInt(sprintArg);

  if (!command || !sprintN) {
    console.log("Usage: node scripts/sprint-lifecycle.js <start|review|finish|status> <sprint-number>");
    process.exit(1);
  }

  switch (command) {
    case "start": start(sprintN); break;
    case "review": review(sprintN); break;
    case "finish": finish(sprintN); break;
    case "status": status(sprintN); break;
    default:
      console.log(`Unknown command: ${command}`);
      process.exit(1);
  }
}
