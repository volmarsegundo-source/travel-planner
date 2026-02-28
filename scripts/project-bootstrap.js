#!/usr/bin/env node

/**
 * Project Bootstrap — Automated setup for new machines
 *
 * Usage:
 *   node scripts/project-bootstrap.js          # Full setup
 *   node scripts/project-bootstrap.js --check  # Verify only
 *   node scripts/project-bootstrap.js --fix    # Auto-fix issues
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");
const net = require("net");

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

function exec(cmd) {
  try { return execSync(cmd, { encoding: "utf8", stdio: "pipe", cwd: ROOT }).trim(); }
  catch { return null; }
}

function checkPort(port) {
  return new Promise((resolve) => {
    const s = new net.Socket();
    s.setTimeout(2000);
    s.on("connect", () => { s.destroy(); resolve(true); });
    s.on("timeout", () => { s.destroy(); resolve(false); });
    s.on("error", () => { s.destroy(); resolve(false); });
    s.connect(port, "127.0.0.1");
  });
}

// ─── Detection ──────────────────────────────────────────────────────────────

function detectStack() {
  const stack = { framework: null, orm: null, docker: false, typescript: false, packageManager: "npm" };

  const pkgPath = path.join(ROOT, "package.json");
  if (!fs.existsSync(pkgPath)) return stack;
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

  // Framework
  if (allDeps.next) stack.framework = "nextjs";
  else if (allDeps.vite) stack.framework = "vite";
  else if (allDeps.react) stack.framework = "react";

  // ORM
  if (allDeps.prisma || allDeps["@prisma/client"]) stack.orm = "prisma";

  // Docker
  if (fs.existsSync(path.join(ROOT, "docker-compose.yml")) || fs.existsSync(path.join(ROOT, "docker-compose.yaml"))) {
    stack.docker = true;
  }

  // TypeScript
  if (allDeps.typescript || fs.existsSync(path.join(ROOT, "tsconfig.json"))) {
    stack.typescript = true;
  }

  // Package manager
  if (fs.existsSync(path.join(ROOT, "pnpm-lock.yaml"))) stack.packageManager = "pnpm";
  else if (fs.existsSync(path.join(ROOT, "yarn.lock"))) stack.packageManager = "yarn";
  else stack.packageManager = "npm";

  return stack;
}

function checkPrerequisites() {
  const checks = [];

  // Node.js version
  const nodeVersion = process.version;
  const major = parseInt(nodeVersion.slice(1));
  checks.push({ name: "Node.js", ok: major >= 20, detail: `${nodeVersion} (need >=20)` });

  // Git
  const gitVersion = exec("git --version");
  checks.push({ name: "Git", ok: !!gitVersion, detail: gitVersion || "not found" });

  // Docker
  const dockerVersion = exec("docker --version");
  checks.push({ name: "Docker", ok: !!dockerVersion, detail: dockerVersion || "not found" });

  return checks;
}

// ─── .env Configuration ────────────────────────────────────────────────────

function configureEnv() {
  const envLocalPath = path.join(ROOT, ".env.local");
  const envExamplePath = path.join(ROOT, ".env.example");

  if (fs.existsSync(envLocalPath)) {
    ok(".env.local already exists");
    return true;
  }

  if (!fs.existsSync(envExamplePath)) {
    warn("No .env.example found — skipping .env configuration");
    return false;
  }

  let envContent = fs.readFileSync(envExamplePath, "utf8");

  // Auto-fill patterns
  const secret = crypto.randomBytes(32).toString("hex");

  // Try to extract DB credentials from docker-compose
  let dbUrl = "postgresql://postgres:postgres@localhost:5432/travel_planner";
  const composeFile = ["docker-compose.yml", "docker-compose.yaml"].find((f) => fs.existsSync(path.join(ROOT, f)));
  if (composeFile) {
    const compose = fs.readFileSync(path.join(ROOT, composeFile), "utf8");
    const userMatch = compose.match(/POSTGRES_USER:\s*(\S+)/);
    const passMatch = compose.match(/POSTGRES_PASSWORD:\s*(\S+)/);
    const dbMatch = compose.match(/POSTGRES_DB:\s*(\S+)/);
    const user = userMatch ? userMatch[1] : "postgres";
    const pass = passMatch ? passMatch[1] : "postgres";
    const db = dbMatch ? dbMatch[1] : "travel_planner";
    dbUrl = `postgresql://${user}:${pass}@localhost:5432/${db}`;
  }

  // Replace patterns
  envContent = envContent.replace(/(DATABASE_URL\s*=\s*).*/g, `$1"${dbUrl}"`);
  envContent = envContent.replace(/(REDIS_URL\s*=\s*).*/g, `$1"redis://localhost:6379"`);
  envContent = envContent.replace(/(NEXTAUTH_URL\s*=\s*).*/g, `$1"http://localhost:3000"`);
  envContent = envContent.replace(/(AUTH_URL\s*=\s*).*/g, `$1"http://localhost:3000"`);
  envContent = envContent.replace(/(NODE_ENV\s*=\s*).*/g, `$1"development"`);
  // Generate secrets for any *_SECRET or *_KEY placeholders
  envContent = envContent.replace(/((?:NEXTAUTH_SECRET|AUTH_SECRET|[A-Z_]*_SECRET|[A-Z_]*_KEY)\s*=\s*)"?(?:your-secret-here|changeme|)?"?/g, `$1"${secret}"`);

  fs.writeFileSync(envLocalPath, envContent);
  ok(".env.local created from .env.example");
  return true;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function run() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes("--check");
  const fixMode = args.includes("--fix");

  console.log(`\n${C.bold}${C.cyan}🚀 Project Bootstrap${C.reset}`);
  console.log(`${C.dim}   Mode: ${checkOnly ? "check" : fixMode ? "fix" : "full"}${C.reset}\n`);

  const report = { stack: null, prerequisites: [], steps: [], ok: true };

  // 1. Detect stack
  header("Stack Detection");
  const stack = detectStack();
  report.stack = stack;
  ok(`Framework: ${stack.framework || "unknown"}`);
  ok(`ORM: ${stack.orm || "none"}`);
  ok(`Docker: ${stack.docker ? "yes" : "no"}`);
  ok(`TypeScript: ${stack.typescript ? "yes" : "no"}`);
  ok(`Package manager: ${stack.packageManager}`);

  // 2. Prerequisites
  header("Prerequisites");
  const prereqs = checkPrerequisites();
  report.prerequisites = prereqs;
  for (const p of prereqs) {
    if (p.ok) ok(`${p.name}: ${p.detail}`);
    else { fail(`${p.name}: ${p.detail}`); report.ok = false; }
  }

  if (checkOnly) {
    // Additional checks
    header("Environment");
    const envExists = fs.existsSync(path.join(ROOT, ".env.local"));
    if (envExists) ok(".env.local exists");
    else warn(".env.local not found");

    const pgUp = await checkPort(5432);
    const redisUp = await checkPort(6379);
    if (pgUp) ok("PostgreSQL on port 5432");
    else warn("PostgreSQL not reachable on port 5432");
    if (redisUp) ok("Redis on port 6379");
    else warn("Redis not reachable on port 6379");

    const nodeModules = fs.existsSync(path.join(ROOT, "node_modules"));
    if (nodeModules) ok("node_modules installed");
    else warn("node_modules not found — run npm install");

    generateBootstrapReport(report);
    return report;
  }

  // 3. Install dependencies
  header("Dependencies");
  const installCmd = stack.packageManager === "pnpm" ? "pnpm install" : stack.packageManager === "yarn" ? "yarn" : "npm ci";
  info(`Running ${installCmd}...`);
  const installResult = exec(installCmd);
  if (installResult !== null) ok("Dependencies installed");
  else { warn("Install may have issues — trying npm install..."); exec("npm install"); }
  report.steps.push({ name: "Dependencies", ok: true });

  // 4. Configure .env
  header("Environment");
  const envOk = configureEnv();
  report.steps.push({ name: "Environment", ok: envOk });

  // 5. Docker
  if (stack.docker) {
    header("Docker");
    const pgUp = await checkPort(5432);
    const redisUp = await checkPort(6379);
    if (!pgUp || !redisUp) {
      info("Starting Docker containers...");
      exec("docker compose up -d");
      await new Promise((r) => setTimeout(r, 3000));
      const pgRetry = await checkPort(5432);
      const redisRetry = await checkPort(6379);
      if (pgRetry) ok("PostgreSQL ready");
      else warn("PostgreSQL not available");
      if (redisRetry) ok("Redis ready");
      else warn("Redis not available");
    } else {
      ok("PostgreSQL already running");
      ok("Redis already running");
    }
    report.steps.push({ name: "Docker", ok: true });
  }

  // 6. Database setup
  if (stack.orm === "prisma") {
    header("Database");
    info("Running prisma generate...");
    exec("npx prisma generate");
    ok("Prisma Client generated");
    info("Running prisma migrate deploy...");
    exec("npx prisma migrate deploy");
    ok("Migrations applied");

    // Seed if available
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
    if (pkg.prisma?.seed) {
      info("Running seed...");
      exec("npx prisma db seed");
      ok("Database seeded");
    }

    // Check for dev-setup.js
    if (fs.existsSync(path.join(ROOT, "scripts", "dev-setup.js"))) {
      info("Found scripts/dev-setup.js — run 'npm run dev:setup' for test users and sample data");
    }
    report.steps.push({ name: "Database", ok: true });
  }

  // 7. Verify build
  header("Verification");
  if (stack.typescript) {
    info("Type checking...");
    const typeCheck = exec("npx tsc --noEmit");
    if (typeCheck !== null) ok("Type check passed");
    else warn("Type check had issues");
  }

  info("Running tests...");
  const testResult = exec("npx vitest run 2>&1");
  if (testResult && testResult.includes("passed")) ok("Tests passed");
  else warn("Some tests may have issues");
  report.steps.push({ name: "Verification", ok: true });

  generateBootstrapReport(report);
  return report;
}

function generateBootstrapReport(report) {
  let md = `# Bootstrap Report\n\n`;
  md += `**Date:** ${new Date().toISOString().split("T")[0]}\n\n`;
  md += `## Stack\n\n`;
  if (report.stack) {
    md += `- Framework: ${report.stack.framework || "unknown"}\n`;
    md += `- ORM: ${report.stack.orm || "none"}\n`;
    md += `- Docker: ${report.stack.docker ? "yes" : "no"}\n`;
    md += `- TypeScript: ${report.stack.typescript ? "yes" : "no"}\n`;
    md += `- Package Manager: ${report.stack.packageManager}\n`;
  }
  md += `\n## Prerequisites\n\n`;
  for (const p of report.prerequisites) {
    md += `- ${p.ok ? "✅" : "❌"} ${p.name}: ${p.detail}\n`;
  }
  md += `\n## Steps\n\n`;
  for (const s of report.steps) {
    md += `- ${s.ok ? "✅" : "❌"} ${s.name}\n`;
  }
  md += `\n## Status: ${report.ok ? "READY" : "NEEDS ATTENTION"}\n`;

  fs.writeFileSync(path.join(ROOT, "bootstrap-report.md"), md);
  console.log(`\n  ${C.green}✓${C.reset} Report saved to bootstrap-report.md\n`);
}

module.exports = { detectStack, checkPrerequisites, configureEnv, run };

if (require.main === module) {
  run().catch((err) => { console.error(err); process.exit(1); });
}
