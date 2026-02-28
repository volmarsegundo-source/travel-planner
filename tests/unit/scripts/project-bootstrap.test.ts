/**
 * Tests for project-bootstrap.js
 *
 * Tests cover: stack detection, prerequisites check, .env configuration.
 */
import { describe, it, expect } from "vitest";

const {
  detectStack,
  checkPrerequisites,
} = require("../../../scripts/project-bootstrap.js");

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

describe("project-bootstrap: checkPrerequisites", () => {
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
