#!/usr/bin/env node

/**
 * i18n Manager — Translation consistency checker
 *
 * Usage:
 *   node scripts/i18n-manager.js            # Full consistency check
 *   node scripts/i18n-manager.js --check    # Same as default
 *   node scripts/i18n-manager.js --sync     # Add [NEEDS TRANSLATION] for missing keys
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src");

const C = {
  reset: "\x1b[0m", red: "\x1b[31m", yellow: "\x1b[33m",
  green: "\x1b[32m", cyan: "\x1b[36m", bold: "\x1b[1m", dim: "\x1b[2m",
};

// ─── Utilities ──────────────────────────────────────────────────────────────

function flattenKeys(obj, prefix = "") {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function getNestedValue(obj, keyPath) {
  const parts = keyPath.split(".");
  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return current;
}

function setNestedValue(obj, keyPath, value) {
  const parts = keyPath.split(".");
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]] || typeof current[parts[i]] !== "object") {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

function extractInterpolationVars(str) {
  if (typeof str !== "string") return [];
  const matches = str.match(/\{(\w+)\}/g) || [];
  return matches.map((m) => m.slice(1, -1)).sort();
}

function findLocaleFiles() {
  const dirs = ["messages", "locales", "src/locales", "src/messages", "public/locales"];
  for (const dir of dirs) {
    const fullDir = path.join(ROOT, dir);
    if (fs.existsSync(fullDir)) {
      const files = fs.readdirSync(fullDir).filter((f) => f.endsWith(".json"));
      return { dir: fullDir, files };
    }
  }
  return null;
}

function walkSourceFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkSourceFiles(full));
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) results.push(full);
  }
  return results;
}

// ─── Checks ─────────────────────────────────────────────────────────────────

function findMissingKeys(locales) {
  const issues = [];
  const localeNames = Object.keys(locales);
  const allKeys = {};

  for (const [name, data] of Object.entries(locales)) {
    allKeys[name] = new Set(flattenKeys(data));
  }

  for (let i = 0; i < localeNames.length; i++) {
    for (let j = i + 1; j < localeNames.length; j++) {
      const a = localeNames[i];
      const b = localeNames[j];

      for (const key of allKeys[a]) {
        if (!allKeys[b].has(key)) {
          issues.push({ severity: "MEDIUM", type: "missing", key, present: a, missing: b });
        }
      }
      for (const key of allKeys[b]) {
        if (!allKeys[a].has(key)) {
          issues.push({ severity: "MEDIUM", type: "missing", key, present: b, missing: a });
        }
      }
    }
  }
  return issues;
}

function findOrphanedKeys(locales, sourceFiles) {
  const issues = [];
  // Collect all source content
  let allSource = "";
  for (const file of sourceFiles) {
    allSource += fs.readFileSync(file, "utf8") + "\n";
  }

  const firstLocale = Object.keys(locales)[0];
  const keys = flattenKeys(locales[firstLocale]);

  for (const key of keys) {
    // Check if key or any parent namespace is referenced in source
    const parts = key.split(".");
    let found = false;
    // Check the key itself and its leaf part
    for (let i = 0; i < parts.length; i++) {
      const partial = parts.slice(i).join(".");
      if (allSource.includes(`"${partial}"`) || allSource.includes(`'${partial}'`) || allSource.includes(`\`${partial}\``)) {
        found = true;
        break;
      }
    }
    // Also check the full key
    if (allSource.includes(key)) found = true;

    if (!found) {
      issues.push({ severity: "LOW", type: "orphaned", key });
    }
  }
  return issues;
}

function findInterpolationMismatches(locales) {
  const issues = [];
  const localeNames = Object.keys(locales);
  if (localeNames.length < 2) return issues;

  const referenceLocale = localeNames[0];
  const referenceKeys = flattenKeys(locales[referenceLocale]);

  for (const key of referenceKeys) {
    const refValue = getNestedValue(locales[referenceLocale], key);
    const refVars = extractInterpolationVars(refValue);
    if (refVars.length === 0) continue;

    for (let i = 1; i < localeNames.length; i++) {
      const otherLocale = localeNames[i];
      const otherValue = getNestedValue(locales[otherLocale], key);
      if (otherValue === undefined) continue; // missing key is handled separately

      const otherVars = extractInterpolationVars(otherValue);
      if (JSON.stringify(refVars) !== JSON.stringify(otherVars)) {
        issues.push({
          severity: "HIGH",
          type: "interpolation",
          key,
          locales: { [referenceLocale]: refVars, [otherLocale]: otherVars },
        });
      }
    }
  }
  return issues;
}

function findHardcodedStrings(sourceFiles) {
  const issues = [];
  const textElementPattern = /<(?:h[1-6]|p|span|button|label|title|a)\b[^>]*>([A-Z][a-z]{2,}(?:\s+[a-zA-Z]+)*)<\//g;

  for (const file of sourceFiles) {
    if (file.includes("test") || file.includes("spec") || file.includes("__test__")) continue;
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip lines that use translation functions
      if (line.includes("t(") || line.includes("t.") || line.includes("useTranslations")) continue;
      // Skip comments
      if (line.trim().startsWith("//") || line.trim().startsWith("*")) continue;

      textElementPattern.lastIndex = 0;
      let match;
      while ((match = textElementPattern.exec(line)) !== null) {
        const text = match[1].trim();
        if (text.length >= 3 && !/^[A-Z]+$/.test(text) && !/^\{/.test(text)) {
          issues.push({
            severity: "MEDIUM",
            type: "hardcoded",
            file: path.relative(ROOT, file).replace(/\\/g, "/"),
            line: i + 1,
            text,
          });
        }
      }
    }
  }
  return issues;
}

// ─── Sync ───────────────────────────────────────────────────────────────────

function syncMissingKeys(localeDir, locales, missingIssues) {
  const changes = {};
  for (const issue of missingIssues) {
    if (issue.type !== "missing") continue;
    const sourceValue = getNestedValue(locales[issue.present], issue.key);
    const placeholder = `[NEEDS TRANSLATION] ${typeof sourceValue === "string" ? sourceValue : JSON.stringify(sourceValue)}`;

    if (!changes[issue.missing]) {
      changes[issue.missing] = JSON.parse(JSON.stringify(locales[issue.missing]));
    }
    setNestedValue(changes[issue.missing], issue.key, placeholder);
  }

  for (const [locale, data] of Object.entries(changes)) {
    const filePath = path.join(localeDir, `${locale}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
    console.log(`  ${C.green}✓${C.reset} Updated ${locale}.json with placeholders`);
  }
  return Object.keys(changes).length;
}

// ─── Report ─────────────────────────────────────────────────────────────────

function generateReport(allIssues) {
  let md = `# i18n Consistency Report\n\n`;
  md += `**Date:** ${new Date().toISOString().split("T")[0]}\n\n`;

  const counts = { missing: 0, orphaned: 0, interpolation: 0, hardcoded: 0 };
  for (const i of allIssues) counts[i.type] = (counts[i.type] || 0) + 1;

  md += `## Summary\n\n`;
  md += `| Check | Issues |\n|-------|--------|\n`;
  md += `| Missing keys | ${counts.missing} |\n`;
  md += `| Orphaned keys | ${counts.orphaned} |\n`;
  md += `| Interpolation mismatches | ${counts.interpolation} |\n`;
  md += `| Hardcoded strings | ${counts.hardcoded} |\n`;
  md += `\n**Total issues:** ${allIssues.length}\n\n`;

  const byType = {};
  for (const i of allIssues) {
    if (!byType[i.type]) byType[i.type] = [];
    byType[i.type].push(i);
  }

  const typeLabels = { missing: "Missing Keys", orphaned: "Orphaned Keys", interpolation: "Interpolation Mismatches", hardcoded: "Hardcoded Strings" };
  for (const [type, typeIssues] of Object.entries(byType)) {
    md += `## ${typeLabels[type] || type}\n\n`;
    for (const i of typeIssues) {
      if (type === "missing") md += `- **[${i.severity}]** \`${i.key}\` — present in ${i.present}, missing in ${i.missing}\n`;
      else if (type === "orphaned") md += `- **[${i.severity}]** \`${i.key}\` — not referenced in source code\n`;
      else if (type === "interpolation") md += `- **[${i.severity}]** \`${i.key}\` — variables differ: ${JSON.stringify(i.locales)}\n`;
      else if (type === "hardcoded") md += `- **[${i.severity}]** "${i.text}" in \`${i.file}:${i.line}\`\n`;
    }
    md += `\n`;
  }
  return md;
}

// ─── Main ───────────────────────────────────────────────────────────────────

function run() {
  const args = process.argv.slice(2);
  const syncMode = args.includes("--sync");

  console.log(`\n${C.bold}${C.cyan}🌍 i18n Manager${C.reset}\n`);

  // Find locale files
  const localeInfo = findLocaleFiles();
  if (!localeInfo) {
    console.log(`  ${C.red}✗${C.reset} No locale files found`);
    process.exit(1);
  }

  console.log(`  ${C.dim}Locale directory: ${path.relative(ROOT, localeInfo.dir)}${C.reset}`);
  console.log(`  ${C.dim}Locale files: ${localeInfo.files.join(", ")}${C.reset}\n`);

  // Load locales
  const locales = {};
  for (const file of localeInfo.files) {
    const name = path.basename(file, ".json");
    locales[name] = JSON.parse(fs.readFileSync(path.join(localeInfo.dir, file), "utf8"));
  }

  // Scan source files
  const sourceFiles = walkSourceFiles(SRC);
  console.log(`  ${C.dim}Scanning ${sourceFiles.length} source files...${C.reset}\n`);

  // Run checks
  const missingIssues = findMissingKeys(locales);
  const orphanedIssues = findOrphanedKeys(locales, sourceFiles);
  const interpolationIssues = findInterpolationMismatches(locales);
  const hardcodedIssues = findHardcodedStrings(sourceFiles);

  const allIssues = [...missingIssues, ...orphanedIssues, ...interpolationIssues, ...hardcodedIssues];

  // Display issues
  const typeIcons = { missing: "📭", orphaned: "🗑️", interpolation: "⚠️", hardcoded: "📝" };
  for (const issue of allIssues) {
    const icon = typeIcons[issue.type] || "•";
    if (issue.type === "missing") {
      console.log(`  ${icon} ${C.yellow}[MISSING]${C.reset} ${issue.key} — in ${issue.present}, not in ${issue.missing}`);
    } else if (issue.type === "orphaned") {
      console.log(`  ${icon} ${C.dim}[ORPHANED]${C.reset} ${issue.key}`);
    } else if (issue.type === "interpolation") {
      console.log(`  ${icon} ${C.red}[INTERPOLATION]${C.reset} ${issue.key}`);
    } else if (issue.type === "hardcoded") {
      console.log(`  ${icon} ${C.yellow}[HARDCODED]${C.reset} "${issue.text}" in ${issue.file}:${issue.line}`);
    }
  }

  // Summary
  console.log(`\n${C.bold}  Summary:${C.reset}`);
  console.log(`    Missing keys: ${missingIssues.length}`);
  console.log(`    Orphaned keys: ${orphanedIssues.length}`);
  console.log(`    Interpolation: ${interpolationIssues.length}`);
  console.log(`    Hardcoded: ${hardcodedIssues.length}`);

  // Sync mode
  if (syncMode && missingIssues.length > 0) {
    console.log(`\n${C.bold}  Syncing missing keys...${C.reset}`);
    syncMissingKeys(localeInfo.dir, locales, missingIssues);
  }

  // Generate report
  const report = generateReport(allIssues);
  const reportPath = path.join(ROOT, "i18n-report.md");
  fs.writeFileSync(reportPath, report);
  console.log(`\n  ${C.green}✓${C.reset} Report saved to i18n-report.md\n`);

  return { issues: allIssues, counts: { missing: missingIssues.length, orphaned: orphanedIssues.length, interpolation: interpolationIssues.length, hardcoded: hardcodedIssues.length } };
}

module.exports = { flattenKeys, getNestedValue, setNestedValue, extractInterpolationVars, findMissingKeys, findOrphanedKeys, findInterpolationMismatches, findHardcodedStrings, findLocaleFiles, generateReport, run };

if (require.main === module) {
  run();
}
