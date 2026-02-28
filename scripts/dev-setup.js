#!/usr/bin/env node

/**
 * Travel Planner — Dev Environment Setup Script
 *
 * Usage:
 *   node scripts/dev-setup.js              # Full setup
 *   node scripts/dev-setup.js --check      # Health check only (no modifications)
 *   node scripts/dev-setup.js --reset      # Reset everything from scratch
 *   node scripts/dev-setup.js --users-only # Create/verify test users only
 */

const { execSync } = require("child_process");
const net = require("net");
const path = require("path");
const fs = require("fs");

// ─── Configuration ──────────────────────────────────────────────────────────

const TEST_USERS = [
  { name: "Test User",  email: "testuser@travel.dev",  password: "Test@1234",  role: "Standard user flow" },
  { name: "Power User", email: "poweruser@travel.dev", password: "Test@1234",  role: "User with preloaded trips" },
  { name: "New User",   email: "newuser@travel.dev",   password: "Test@1234",  role: "Clean account, no data" },
  { name: "Admin User", email: "admin@travel.dev",     password: "Admin@1234", role: "Administrative features" },
];

const SAMPLE_TRIPS = [
  {
    title: "Weekend in Rio de Janeiro",
    destination: "Rio de Janeiro, Brazil",
    description: "A quick weekend getaway to explore Rio's beaches and landmarks.",
    days: 3,
    status: "ACTIVE",
    activities: [
      { day: 1, title: "Arrive at GIG Airport",          startTime: "10:00", endTime: "11:00", type: "TRANSPORT" },
      { day: 1, title: "Check-in at Copacabana Hotel",   startTime: "12:00", endTime: "13:00", type: "ACCOMMODATION" },
      { day: 1, title: "Lunch at Confeitaria Colombo",   startTime: "13:30", endTime: "15:00", type: "FOOD" },
      { day: 2, title: "Christ the Redeemer",            startTime: "08:00", endTime: "11:00", type: "SIGHTSEEING" },
      { day: 2, title: "Sugarloaf Mountain",             startTime: "14:00", endTime: "17:00", type: "SIGHTSEEING" },
      { day: 2, title: "Dinner at Aprazivel",            startTime: "19:00", endTime: "21:00", type: "FOOD" },
      { day: 3, title: "Ipanema Beach morning",          startTime: "07:00", endTime: "10:00", type: "LEISURE" },
      { day: 3, title: "Depart from GIG Airport",        startTime: "15:00", endTime: "16:00", type: "TRANSPORT" },
    ],
  },
  {
    title: "Tokyo Adventure",
    destination: "Tokyo, Japan",
    description: "Five days exploring the best of Tokyo's culture and cuisine.",
    days: 5,
    status: "PLANNING",
    activities: [
      { day: 1, title: "Arrive at Narita Airport",       startTime: "09:00", endTime: "10:00", type: "TRANSPORT" },
      { day: 1, title: "Shibuya Crossing & Hachiko",     startTime: "14:00", endTime: "16:00", type: "SIGHTSEEING" },
      { day: 2, title: "Senso-ji Temple, Asakusa",       startTime: "09:00", endTime: "12:00", type: "SIGHTSEEING" },
      { day: 2, title: "Ramen at Ichiran Shibuya",       startTime: "12:30", endTime: "13:30", type: "FOOD" },
      { day: 3, title: "Tsukiji Outer Market",           startTime: "07:00", endTime: "10:00", type: "FOOD" },
      { day: 3, title: "TeamLab Borderless",             startTime: "14:00", endTime: "17:00", type: "LEISURE" },
      { day: 4, title: "Day trip to Hakone",             startTime: "08:00", endTime: "18:00", type: "SIGHTSEEING" },
      { day: 5, title: "Akihabara & Departure",          startTime: "10:00", endTime: "14:00", type: "SHOPPING" },
    ],
  },
  {
    title: "Portugal Road Trip",
    destination: "Lisbon to Porto, Portugal",
    description: "A week-long road trip through Portugal's most beautiful cities.",
    days: 7,
    status: "PLANNING",
    activities: [
      { day: 1, title: "Arrive in Lisbon",               startTime: "10:00", endTime: "12:00", type: "TRANSPORT" },
      { day: 1, title: "Belem Tower & Pasteis de Belem", startTime: "14:00", endTime: "17:00", type: "SIGHTSEEING" },
      { day: 2, title: "Sintra Day Trip",                startTime: "09:00", endTime: "18:00", type: "SIGHTSEEING" },
      { day: 3, title: "Drive to Nazare",                startTime: "10:00", endTime: "12:00", type: "TRANSPORT" },
      { day: 4, title: "Coimbra University Tour",        startTime: "10:00", endTime: "14:00", type: "SIGHTSEEING" },
      { day: 5, title: "Drive to Porto",                 startTime: "09:00", endTime: "11:00", type: "TRANSPORT" },
      { day: 6, title: "Port Wine Tasting in Vila Nova de Gaia", startTime: "14:00", endTime: "17:00", type: "FOOD" },
      { day: 7, title: "Livraria Lello & Departure",     startTime: "10:00", endTime: "15:00", type: "SIGHTSEEING" },
    ],
  },
];

const COLORS = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
};

function log(msg) { console.log(msg); }
function ok(msg)  { log(`${COLORS.green}  ✓${COLORS.reset} ${msg}`); }
function warn(msg){ log(`${COLORS.yellow}  ⚠${COLORS.reset} ${msg}`); }
function fail(msg){ log(`${COLORS.red}  ✗${COLORS.reset} ${msg}`); }
function info(msg){ log(`${COLORS.cyan}  ℹ${COLORS.reset} ${msg}`); }
function header(msg) { log(`\n${COLORS.bold}${COLORS.blue}━━━ ${msg} ━━━${COLORS.reset}`); }

// ─── Utilities ──────────────────────────────────────────────────────────────

function checkPort(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);
    socket.on("connect", () => { socket.destroy(); resolve(true); });
    socket.on("timeout", () => { socket.destroy(); resolve(false); });
    socket.on("error",   () => { socket.destroy(); resolve(false); });
    socket.connect(port, host);
  });
}

function exec(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: "pipe", ...opts }).trim();
  } catch {
    return null;
  }
}

function scanRoutes(appDir) {
  const routes = [];
  if (!fs.existsSync(appDir)) return routes;

  function walk(dir, prefix) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Skip route groups (parenthesized names like (auth))
        const segment = entry.name.startsWith("(") ? "" : `/${entry.name}`;
        walk(fullPath, prefix + segment);
      } else if (entry.name === "page.tsx" || entry.name === "page.ts") {
        routes.push(prefix || "/");
      }
    }
  }
  walk(appDir, "");
  return routes.sort();
}

async function testRoute(route, baseUrl = "http://localhost:3000") {
  try {
    const url = `${baseUrl}${route}`;
    const response = await fetch(url, { redirect: "manual" });
    return { route, status: response.status, ok: response.status < 400 };
  } catch {
    return { route, status: "ERR", ok: false };
  }
}

// ─── Steps ──────────────────────────────────────────────────────────────────

async function checkDocker() {
  header("Docker");
  const dockerInfo = exec("docker info");
  if (!dockerInfo) {
    fail("Docker is not running.");
    info("Please open Docker Desktop and try again.");
    return false;
  }
  ok("Docker is running");

  const composeStatus = exec("docker compose ps --format json");
  if (composeStatus) {
    ok("Docker Compose project found");
  } else {
    warn("No Docker Compose containers detected");
  }
  return true;
}

async function startContainers() {
  header("Starting Containers");
  info("Running docker compose up -d...");
  const result = exec("docker compose up -d", { stdio: "inherit" });
  if (result === null) {
    warn("docker compose up -d may have failed — checking ports next");
  } else {
    ok("Containers started");
  }
}

async function checkPorts() {
  header("Port Checks");
  const pgOk = await checkPort(5432);
  const redisOk = await checkPort(6379);

  if (pgOk)    ok("PostgreSQL is listening on port 5432");
  else         fail("PostgreSQL is NOT reachable on port 5432");

  if (redisOk) ok("Redis is listening on port 6379");
  else         fail("Redis is NOT reachable on port 6379");

  return { pg: pgOk, redis: redisOk };
}

async function runMigrations() {
  header("Prisma Migrations");
  info("Running prisma generate...");
  exec("npx prisma generate", { stdio: "inherit" });
  ok("Prisma Client generated");

  info("Running prisma migrate deploy...");
  const migrateResult = exec("npx prisma migrate deploy", { stdio: "inherit" });
  if (migrateResult === null) {
    warn("Migrations may have issues — check output above");
  } else {
    ok("Migrations applied");
  }
}

async function createUsers(prisma, bcrypt) {
  header("Test Users");
  const created = [];

  for (const user of TEST_USERS) {
    const passwordHash = await bcrypt.hash(user.password, 12);
    const result = await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, passwordHash, emailVerified: new Date() },
      create: {
        email: user.email,
        name: user.name,
        passwordHash,
        emailVerified: new Date(),
      },
    });
    ok(`${user.name} <${user.email}> (id: ${result.id})`);
    created.push({ ...user, id: result.id });
  }
  return created;
}

async function createSampleTrips(prisma, powerUserId) {
  header("Sample Trips (Power User)");

  for (const trip of SAMPLE_TRIPS) {
    // Check if trip already exists
    const existing = await prisma.trip.findFirst({
      where: { userId: powerUserId, title: trip.title, deletedAt: null },
    });

    if (existing) {
      info(`Trip "${trip.title}" already exists — skipping`);
      continue;
    }

    const createdTrip = await prisma.trip.create({
      data: {
        userId: powerUserId,
        title: trip.title,
        destination: trip.destination,
        description: trip.description,
        status: trip.status,
        startDate: new Date(),
        endDate: new Date(Date.now() + trip.days * 24 * 60 * 60 * 1000),
      },
    });

    // Group activities by day
    const dayMap = {};
    for (const act of trip.activities) {
      if (!dayMap[act.day]) dayMap[act.day] = [];
      dayMap[act.day].push(act);
    }

    for (const [dayNum, activities] of Object.entries(dayMap)) {
      const day = await prisma.itineraryDay.create({
        data: {
          tripId: createdTrip.id,
          dayNumber: parseInt(dayNum),
          date: new Date(Date.now() + (parseInt(dayNum) - 1) * 24 * 60 * 60 * 1000),
        },
      });

      for (let i = 0; i < activities.length; i++) {
        await prisma.activity.create({
          data: {
            dayId: day.id,
            title: activities[i].title,
            startTime: activities[i].startTime,
            endTime: activities[i].endTime,
            activityType: activities[i].type,
            orderIndex: i,
          },
        });
      }
    }

    ok(`Created "${trip.title}" (${trip.days} days, ${trip.activities.length} activities)`);
  }
}

async function discoverRoutes() {
  header("Route Discovery");
  const appDir = path.join(__dirname, "..", "src", "app");
  const routes = scanRoutes(appDir);

  if (routes.length === 0) {
    warn("No routes found in src/app/");
    return;
  }

  log(`  Found ${routes.length} routes:`);
  for (const route of routes) {
    log(`    ${COLORS.dim}→${COLORS.reset} ${route}`);
  }

  // Test routes if server is running
  const serverUp = await checkPort(3000);
  if (serverUp) {
    log("");
    info("Dev server detected on port 3000 — testing routes...");
    for (const route of routes) {
      // Replace dynamic segments with placeholder values
      const testableRoute = route
        .replace(/\[locale\]/g, "en")
        .replace(/\[id\]/g, "test-id");
      const result = await testRoute(testableRoute);
      const icon = result.ok ? `${COLORS.green}✓${COLORS.reset}` : `${COLORS.yellow}→${COLORS.reset}`;
      log(`    ${icon} ${result.status} ${testableRoute}`);
    }
  } else {
    info("Dev server not running — skipping route tests");
    info("Start with: npm run dev");
  }
}

function showSummary(users) {
  header("Setup Complete!");
  log("");
  log(`  ${COLORS.bold}Test Credentials${COLORS.reset}`);
  log(`  ${"─".repeat(60)}`);
  log(`  ${"Email".padEnd(26)} ${"Password".padEnd(12)} Purpose`);
  log(`  ${"─".repeat(60)}`);
  for (const u of (users || TEST_USERS)) {
    log(`  ${u.email.padEnd(26)} ${u.password.padEnd(12)} ${u.role}`);
  }
  log(`  ${"─".repeat(60)}`);
  log("");
  log(`  ${COLORS.bold}Access URLs${COLORS.reset}`);
  log(`  Landing page:  http://localhost:3000`);
  log(`  Login:         http://localhost:3000/auth/login`);
  log(`  Register:      http://localhost:3000/auth/register`);
  log(`  Trips:         http://localhost:3000/trips`);
  log(`  English:       http://localhost:3000/en`);
  log("");
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const mode = args.includes("--check") ? "check"
    : args.includes("--reset") ? "reset"
    : args.includes("--users-only") ? "users-only"
    : "full";

  log(`\n${COLORS.bold}${COLORS.cyan}🌍 Travel Planner — Dev Setup${COLORS.reset}`);
  log(`${COLORS.dim}   Mode: ${mode}${COLORS.reset}\n`);

  // Load environment variables
  try {
    require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
  } catch {
    try {
      require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
    } catch {
      warn("dotenv not available — using process.env as-is");
    }
  }

  // ── Check mode ──
  if (mode === "check") {
    await checkDocker();
    await checkPorts();
    await discoverRoutes();
    showSummary();
    return;
  }

  // ── Reset mode ──
  if (mode === "reset") {
    header("Reset");
    info("Stopping containers and removing volumes...");
    exec("docker compose down -v", { stdio: "inherit" });
    ok("Containers and volumes removed");
    info("Restarting containers...");
    exec("docker compose up -d", { stdio: "inherit" });
    ok("Containers restarted");
    // Wait for services to be ready
    info("Waiting for services to start...");
    await new Promise((r) => setTimeout(r, 5000));
  }

  // ── Docker check ──
  if (mode !== "users-only") {
    const dockerOk = await checkDocker();
    if (!dockerOk) {
      process.exit(1);
    }

    // Start containers if needed
    const ports = await checkPorts();
    if (!ports.pg || !ports.redis) {
      await startContainers();
      // Wait and re-check
      await new Promise((r) => setTimeout(r, 3000));
      const portsRetry = await checkPorts();
      if (!portsRetry.pg) {
        fail("PostgreSQL still not available. Check Docker containers.");
        process.exit(1);
      }
    }

    // Run migrations
    await runMigrations();
  }

  // ── Load Prisma and bcrypt ──
  let PrismaClient, bcrypt;
  try {
    PrismaClient = require("@prisma/client").PrismaClient;
  } catch {
    fail("@prisma/client not found. Run: npx prisma generate");
    process.exit(1);
  }

  try {
    bcrypt = require("bcryptjs");
  } catch {
    info("Installing bcryptjs...");
    execSync("npm install --save bcryptjs", { stdio: "inherit" });
    bcrypt = require("bcryptjs");
  }

  const prisma = new PrismaClient();

  try {
    // Create test users
    const users = await createUsers(prisma, bcrypt);

    // Create sample trips for Power User
    if (mode !== "users-only") {
      const powerUser = users.find((u) => u.email === "poweruser@travel.dev");
      if (powerUser) {
        try {
          await createSampleTrips(prisma, powerUser.id);
        } catch (err) {
          warn(`Could not create sample trips: ${err.message}`);
          info("Trip/ItineraryDay/Activity models may not exist yet.");
        }
      }
    }

    // Discover routes
    if (mode !== "users-only") {
      await discoverRoutes();
    }

    showSummary(users);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  fail(`Setup failed: ${err.message}`);
  console.error(err);
  process.exit(1);
});
