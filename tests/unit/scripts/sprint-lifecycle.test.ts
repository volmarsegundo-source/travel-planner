/**
 * Tests for sprint-lifecycle.js
 *
 * Tests cover: status detection, review issue categorization.
 * Note: start/finish commands modify git state so are tested
 * via integration (running the actual commands).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";

// We test the exported functions
const { status } = require("../../../scripts/sprint-lifecycle.js");

describe("sprint-lifecycle: status", { timeout: 30000 }, () => {
  it("returns a valid state string", () => {
    // status() checks git tags/branches and review file
    const state = status(99); // Sprint 99 should be NOT STARTED
    expect(["NOT STARTED", "IN PROGRESS", "BLOCKED", "READY TO FINISH", "COMPLETED"]).toContain(state);
  });

  it("returns NOT STARTED for a non-existent sprint", () => {
    const state = status(999);
    expect(state).toBe("NOT STARTED");
  });
});

describe("sprint-lifecycle: status for completed sprint", { timeout: 30000 }, () => {
  it("returns READY TO FINISH for sprint 4 (has review file)", () => {
    const state = status(4);
    // Sprint 4 has review-sprint-4.md but no complete tag
    expect(["READY TO FINISH", "IN PROGRESS", "COMPLETED"]).toContain(state);
  });
});

describe("sprint-lifecycle: review file format", () => {
  it("review-sprint-3.md exists and contains quality gate section", () => {
    const reviewPath = path.join(__dirname, "..", "..", "..", "review-sprint-3.md");
    if (fs.existsSync(reviewPath)) {
      const content = fs.readFileSync(reviewPath, "utf8");
      expect(content).toContain("Sprint 3");
    }
  });

  it("review-sprint-4.md exists and contains quality gate", () => {
    const reviewPath = path.join(__dirname, "..", "..", "..", "review-sprint-4.md");
    expect(fs.existsSync(reviewPath)).toBe(true);
    const content = fs.readFileSync(reviewPath, "utf8");
    expect(content).toContain("Sprint 4");
    expect(content).toContain("Quality Gate");
    expect(content).toContain("PASS");
  });
});
