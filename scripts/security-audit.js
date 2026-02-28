#!/usr/bin/env node

/**
 * Security Audit — Automated security scanner
 *
 * Usage:
 *   node scripts/security-audit.js          # Full scan with report
 *   node scripts/security-audit.js --ci     # CI mode (exit 1 on CRITICAL)
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src");

const C = {
  reset: "\x1b[0m", red: "\x1b[31m", yellow: "\x1b[33m",
  green: "\x1b[32m", cyan: "\x1b[36m", bold: "\x1b[1m", dim: "\x1b[2m",
};

// ─── Utilities ──────────────────────────────────────────────────────────────

function walkFiles(dir, ext = [".ts", ".tsx", ".js", ".jsx"]) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue;
    if (entry.isDirectory()) results.push(...walkFiles(full, ext));
    else if (ext.some((e) => entry.name.endsWith(e))) results.push(full);
  }
  return results;
}

function relativePath(p) {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

// ─── Scanners ───────────────────────────────────────────────────────────────

function scanSecrets(files) {
  const issues = [];
  const sensitivePatterns = [
    { pattern: /console\.(log|debug|info|warn)\s*\([^)]*(?:password|passwd|secret|token|apiKey|api_key|credential)/gi, msg: "console.log with sensitive data" },
    { pattern: /(?:key|token|secret|password|apiKey|api_key)\s*[:=]\s*["'`][A-Za-z0-9_\-/.+]{20,}["'`]/gi, msg: "Possible hardcoded secret" },
    { pattern: /(?:postgres|mysql|mongodb|redis):\/\/[^:]+:[^@]+@/gi, msg: "Connection string with password" },
    { pattern: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/g, msg: "Private key in source" },
  ];

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip comments and test files
      if (line.trim().startsWith("//") || line.trim().startsWith("*")) continue;
      if (/\.(test|spec)\.[jt]sx?$/.test(file) || file.includes("__tests__")) continue;
      for (const { pattern, msg } of sensitivePatterns) {
        pattern.lastIndex = 0;
        if (pattern.test(line)) {
          issues.push({ severity: "CRITICAL", category: "Secrets", file: relativePath(file), line: i + 1, message: msg });
        }
      }
    }
  }

  // Check .env in .gitignore
  const gitignorePath = path.join(ROOT, ".gitignore");
  if (fs.existsSync(gitignorePath)) {
    const gitignore = fs.readFileSync(gitignorePath, "utf8");
    if (!gitignore.includes(".env")) {
      issues.push({ severity: "CRITICAL", category: "Secrets", file: ".gitignore", line: 0, message: ".env files not listed in .gitignore" });
    }
  } else {
    issues.push({ severity: "CRITICAL", category: "Secrets", file: ".gitignore", line: 0, message: "No .gitignore file found" });
  }

  return issues;
}

function scanAuth(files) {
  const issues = [];

  for (const file of files) {
    if (/\.(test|spec)\.[jt]sx?$/.test(file) || file.includes("__tests__")) continue;
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // bcrypt salt rounds < 10
      const bcryptMatch = line.match(/(?:hash|genSalt)\s*\([^,]*,\s*(\d+)/);
      if (bcryptMatch && parseInt(bcryptMatch[1]) < 10) {
        issues.push({ severity: "HIGH", category: "Auth", file: relativePath(file), line: i + 1, message: `bcrypt salt rounds too low: ${bcryptMatch[1]} (minimum 10)` });
      }
      // CORS wildcard
      if (/origin\s*:\s*["'`]\*["'`]/.test(line)) {
        issues.push({ severity: "HIGH", category: "Auth", file: relativePath(file), line: i + 1, message: "CORS origin set to wildcard *" });
      }
    }
  }

  return issues;
}

function scanLGPD() {
  const issues = [];
  const srcFiles = walkFiles(SRC);
  const allContent = srcFiles.map((f) => fs.readFileSync(f, "utf8")).join("\n");

  // Check for account deletion functionality
  const hasDeleteAccount = allContent.includes("deleteAccount") || allContent.includes("delete-account") || allContent.includes("account/delete");
  if (!hasDeleteAccount) {
    issues.push({ severity: "HIGH", category: "LGPD", file: "src/", line: 0, message: "No account deletion functionality found (Right to Erasure)" });
  }

  // Check for privacy policy reference
  const hasPrivacyPolicy = allContent.includes("privacy") || allContent.includes("privacidade");
  if (!hasPrivacyPolicy) {
    issues.push({ severity: "HIGH", category: "LGPD", file: "src/", line: 0, message: "No privacy policy reference found" });
  }

  return issues;
}

function scanDependencies() {
  const issues = [];
  try {
    const auditOutput = execSync("npm audit --json 2>/dev/null", { cwd: ROOT, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    const audit = JSON.parse(auditOutput);
    const vulns = audit.vulnerabilities || {};
    for (const [pkg, info] of Object.entries(vulns)) {
      if (info.severity === "critical") {
        issues.push({ severity: "CRITICAL", category: "Dependencies", file: "package.json", line: 0, message: `Critical vulnerability in ${pkg}` });
      } else if (info.severity === "high") {
        issues.push({ severity: "HIGH", category: "Dependencies", file: "package.json", line: 0, message: `High vulnerability in ${pkg}` });
      }
    }
  } catch {
    // npm audit returns non-zero when vulnerabilities are found
    try {
      const auditOutput = execSync("npm audit --json 2>&1", { cwd: ROOT, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
      const audit = JSON.parse(auditOutput);
      const vulns = audit.vulnerabilities || {};
      for (const [pkg, info] of Object.entries(vulns)) {
        if (info.severity === "critical") {
          issues.push({ severity: "CRITICAL", category: "Dependencies", file: "package.json", line: 0, message: `Critical vulnerability in ${pkg}` });
        } else if (info.severity === "high") {
          issues.push({ severity: "HIGH", category: "Dependencies", file: "package.json", line: 0, message: `High vulnerability in ${pkg}` });
        }
      }
    } catch {
      issues.push({ severity: "LOW", category: "Dependencies", file: "package.json", line: 0, message: "Could not run npm audit" });
    }
  }
  return issues;
}

// ─── Report ─────────────────────────────────────────────────────────────────

function generateReport(issues) {
  const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const i of issues) counts[i.severity]++;

  let md = `# Security Audit Report\n\n`;
  md += `**Date:** ${new Date().toISOString().split("T")[0]}\n\n`;
  md += `## Summary\n\n`;
  md += `| Severity | Count |\n|----------|-------|\n`;
  for (const [sev, count] of Object.entries(counts)) {
    md += `| ${sev} | ${count} |\n`;
  }
  md += `\n**Total issues:** ${issues.length}\n\n`;

  if (issues.length === 0) {
    md += `No security issues found.\n`;
  } else {
    const byCategory = {};
    for (const i of issues) {
      if (!byCategory[i.category]) byCategory[i.category] = [];
      byCategory[i.category].push(i);
    }
    for (const [cat, catIssues] of Object.entries(byCategory)) {
      md += `## ${cat}\n\n`;
      for (const i of catIssues) {
        md += `- **[${i.severity}]** ${i.message}`;
        if (i.file) md += ` — \`${i.file}\``;
        if (i.line) md += `:${i.line}`;
        md += `\n`;
      }
      md += `\n`;
    }
  }
  return md;
}

// ─── Main ───────────────────────────────────────────────────────────────────

function run() {
  const args = process.argv.slice(2);
  const ciMode = args.includes("--ci");

  console.log(`\n${C.bold}${C.cyan}🔒 Security Audit${C.reset}\n`);

  const files = walkFiles(SRC);
  console.log(`${C.dim}  Scanning ${files.length} files...${C.reset}\n`);

  const issues = [
    ...scanSecrets(files),
    ...scanAuth(files),
    ...scanLGPD(),
    ...scanDependencies(),
  ];

  // Display issues
  const severityColors = { CRITICAL: C.red, HIGH: C.yellow, MEDIUM: C.cyan, LOW: C.dim };
  for (const issue of issues) {
    const color = severityColors[issue.severity] || C.reset;
    console.log(`  ${color}[${issue.severity}]${C.reset} ${issue.message}`);
    if (issue.file) console.log(`    ${C.dim}${issue.file}${issue.line ? `:${issue.line}` : ""}${C.reset}`);
  }

  // Summary
  const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const i of issues) counts[i.severity]++;

  console.log(`\n${C.bold}  Summary:${C.reset}`);
  console.log(`    ${C.red}CRITICAL: ${counts.CRITICAL}${C.reset}`);
  console.log(`    ${C.yellow}HIGH: ${counts.HIGH}${C.reset}`);
  console.log(`    ${C.cyan}MEDIUM: ${counts.MEDIUM}${C.reset}`);
  console.log(`    ${C.dim}LOW: ${counts.LOW}${C.reset}`);

  // Generate report
  const report = generateReport(issues);
  const reportPath = path.join(ROOT, "security-report.md");
  fs.writeFileSync(reportPath, report);
  console.log(`\n  ${C.green}✓${C.reset} Report saved to security-report.md\n`);

  if (ciMode && counts.CRITICAL > 0) {
    console.log(`${C.red}${C.bold}  CI FAILED: ${counts.CRITICAL} CRITICAL issue(s) found${C.reset}\n`);
    process.exit(1);
  }

  return { issues, counts };
}

// Export for testing and integration
module.exports = { scanSecrets, scanAuth, scanLGPD, scanDependencies, generateReport, walkFiles, run };

if (require.main === module) {
  run();
}
