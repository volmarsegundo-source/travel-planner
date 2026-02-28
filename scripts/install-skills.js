#!/usr/bin/env node

/**
 * Skill Installer — Sets up all dev skills and scripts
 *
 * Usage:
 *   node scripts/install-skills.js             # Install everything
 *   node scripts/install-skills.js --verify    # Verify installation
 *   node scripts/install-skills.js --uninstall # Remove skills
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

const C = {
  reset: "\x1b[0m", red: "\x1b[31m", yellow: "\x1b[33m",
  green: "\x1b[32m", cyan: "\x1b[36m", bold: "\x1b[1m", dim: "\x1b[2m",
};

function ok(msg)   { console.log(`  ${C.green}✓${C.reset} ${msg}`); }
function warn(msg) { console.log(`  ${C.yellow}⚠${C.reset} ${msg}`); }
function fail(msg) { console.log(`  ${C.red}✗${C.reset} ${msg}`); }

const SKILL_DIRS = [
  ".claude/skills/sprint-lifecycle",
  ".claude/skills/project-bootstrap",
  ".claude/skills/security-audit",
  ".claude/skills/i18n-manager",
  ".claude/skills/dev-environment",
];

const SKILL_FILES = [
  ".claude/skills/sprint-lifecycle/SKILL.md",
  ".claude/skills/project-bootstrap/SKILL.md",
  ".claude/skills/security-audit/SKILL.md",
  ".claude/skills/i18n-manager/SKILL.md",
  ".claude/skills/dev-environment/SKILL.md",
];

const SCRIPT_FILES = [
  "scripts/sprint-lifecycle.js",
  "scripts/project-bootstrap.js",
  "scripts/security-audit.js",
  "scripts/i18n-manager.js",
  "scripts/dev-setup.js",
];

const PACKAGE_SCRIPTS = {
  "sprint:start": "node scripts/sprint-lifecycle.js start",
  "sprint:review": "node scripts/sprint-lifecycle.js review",
  "sprint:finish": "node scripts/sprint-lifecycle.js finish",
  "sprint:status": "node scripts/sprint-lifecycle.js status",
  "bootstrap": "node scripts/project-bootstrap.js",
  "bootstrap:check": "node scripts/project-bootstrap.js --check",
  "bootstrap:fix": "node scripts/project-bootstrap.js --fix",
  "security": "node scripts/security-audit.js",
  "security:ci": "node scripts/security-audit.js --ci",
  "i18n": "node scripts/i18n-manager.js",
  "i18n:check": "node scripts/i18n-manager.js --check",
  "i18n:sync": "node scripts/i18n-manager.js --sync",
  "dev:setup": "node scripts/dev-setup.js",
  "dev:check": "node scripts/dev-setup.js --check",
  "dev:reset": "node scripts/dev-setup.js --reset",
  "dev:users": "node scripts/dev-setup.js --users-only",
};

// ─── Install ────────────────────────────────────────────────────────────────

function install() {
  console.log(`\n${C.bold}${C.cyan}📦 Installing Skills${C.reset}\n`);

  // Create directories
  for (const dir of SKILL_DIRS) {
    const fullPath = path.join(ROOT, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      ok(`Created ${dir}/`);
    } else {
      ok(`${dir}/ exists`);
    }
  }

  // Check skill files exist
  console.log("");
  for (const file of SKILL_FILES) {
    const fullPath = path.join(ROOT, file);
    if (fs.existsSync(fullPath)) {
      ok(`${file}`);
    } else {
      warn(`${file} — not found (create manually)`);
    }
  }

  // Check script files exist
  console.log("");
  for (const file of SCRIPT_FILES) {
    const fullPath = path.join(ROOT, file);
    if (fs.existsSync(fullPath)) {
      ok(`${file}`);
    } else {
      warn(`${file} — not found`);
    }
  }

  // Update package.json
  console.log("");
  const pkgPath = path.join(ROOT, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  let updated = false;

  for (const [name, cmd] of Object.entries(PACKAGE_SCRIPTS)) {
    if (!pkg.scripts[name]) {
      pkg.scripts[name] = cmd;
      updated = true;
      ok(`Added script: ${name}`);
    } else {
      ok(`Script exists: ${name}`);
    }
  }

  if (updated) {
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
    ok("package.json updated");
  }

  console.log(`\n  ${C.green}${C.bold}Installation complete!${C.reset}\n`);
}

// ─── Verify ─────────────────────────────────────────────────────────────────

function verify() {
  console.log(`\n${C.bold}${C.cyan}🔍 Verifying Skills Installation${C.reset}\n`);
  let allOk = true;

  for (const file of [...SKILL_FILES, ...SCRIPT_FILES]) {
    const fullPath = path.join(ROOT, file);
    if (fs.existsSync(fullPath)) {
      ok(file);
    } else {
      fail(file);
      allOk = false;
    }
  }

  // Check package.json scripts
  console.log("");
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  for (const name of Object.keys(PACKAGE_SCRIPTS)) {
    if (pkg.scripts[name]) {
      ok(`npm run ${name}`);
    } else {
      fail(`npm run ${name} — missing from package.json`);
      allOk = false;
    }
  }

  console.log(`\n  ${allOk ? `${C.green}✓ All verified` : `${C.red}✗ Some items missing`}${C.reset}\n`);
  return allOk;
}

// ─── Uninstall ──────────────────────────────────────────────────────────────

function uninstall() {
  console.log(`\n${C.bold}${C.cyan}🗑️  Uninstalling Skills${C.reset}\n`);

  // Remove package.json scripts (except dev:* which were from Sprint 3)
  const pkgPath = path.join(ROOT, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const sprint4Scripts = ["sprint:start", "sprint:review", "sprint:finish", "sprint:status",
    "bootstrap", "bootstrap:check", "bootstrap:fix",
    "security", "security:ci", "i18n", "i18n:check", "i18n:sync"];

  for (const name of sprint4Scripts) {
    if (pkg.scripts[name]) {
      delete pkg.scripts[name];
      ok(`Removed script: ${name}`);
    }
  }
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  console.log(`\n  ${C.green}${C.bold}Uninstall complete!${C.reset}`);
  console.log(`  ${C.dim}Note: Script files and SKILL.md files were kept. Delete manually if needed.${C.reset}\n`);
}

// ─── Main ───────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

module.exports = { install, verify, uninstall, SKILL_FILES, SCRIPT_FILES, PACKAGE_SCRIPTS };

if (require.main === module) {
  if (args.includes("--verify")) verify();
  else if (args.includes("--uninstall")) uninstall();
  else install();
}
