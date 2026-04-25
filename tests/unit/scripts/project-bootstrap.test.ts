/**
 * Tests for project-bootstrap.js
 *
 * Tests cover: stack detection, prerequisites check, .env configuration.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const {
  detectStack,
  checkPrerequisites,
  configureEnv,
} = require("../../../scripts/project-bootstrap.js");

const ROOT = path.join(__dirname, "..", "..", "..");

describe("project-bootstrap: detectStack", () => {
  it("detects Next.js framework", () => {
    const stack = detectStack();
    expect(stack.framework).toBe("nextjs");
  });

  it("detects Prisma ORM", () => {
    const stack = detectStack();
    expect(stack.orm).toBe("prisma");
  });

  it("detects Docker from docker-compose.yml", () => {
    const stack = detectStack();
    expect(stack.docker).toBe(true);
  });

  it("detects TypeScript", () => {
    const stack = detectStack();
    expect(stack.typescript).toBe(true);
  });

  it("detects npm as package manager", () => {
    const stack = detectStack();
    expect(stack.packageManager).toBe("npm");
  });
});

describe("project-bootstrap: checkPrerequisites", { timeout: 30000 }, () => {
  it("checks Node.js version >= 20", () => {
    const checks = checkPrerequisites();
    const nodeCheck = checks.find((c: { name: string }) => c.name === "Node.js");
    expect(nodeCheck).toBeDefined();
    expect(nodeCheck.ok).toBe(true);
  });

  it("checks Git availability", () => {
    const checks = checkPrerequisites();
    const gitCheck = checks.find((c: { name: string }) => c.name === "Git");
    expect(gitCheck).toBeDefined();
    expect(gitCheck.ok).toBe(true);
  });

  it("returns all 3 prerequisite checks", () => {
    const checks = checkPrerequisites();
    expect(checks).toHaveLength(3);
  });
});

describe("project-bootstrap: configureEnv", () => {
  // C-01 (Sprint 46): .env.local is gitignored, so it is NOT present on
  // CI runners. Skipping the existence assertion when absent prevents
  // "loud-on-CI / silent-on-local" failure pattern. configureEnv() still
  // runs and is asserted to return a boolean.
  it("returns true when .env.local exists; skips assertion on CI runners (gitignored)", () => {
    const envLocalPath = path.join(ROOT, ".env.local");
    if (fs.existsSync(envLocalPath)) {
      const result = configureEnv();
      expect(result).toBe(true);
    } else {
      // CI runner / fresh clone — .env.local is gitignored.
      const result = configureEnv();
      expect(typeof result).toBe("boolean");
    }
  });
});

describe("project-bootstrap: --check mode", () => {
  it("detectStack is read-only and does not modify files", () => {
    const pkgBefore = fs.readFileSync(path.join(ROOT, "package.json"), "utf8");
    detectStack();
    const pkgAfter = fs.readFileSync(path.join(ROOT, "package.json"), "utf8");
    expect(pkgAfter).toBe(pkgBefore);
  });
});
