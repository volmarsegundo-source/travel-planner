/**
 * Tests for install-skills.js
 *
 * Tests cover: verification, script/file presence, package.json scripts.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const {
  verify,
  SKILL_FILES,
  SCRIPT_FILES,
  PACKAGE_SCRIPTS,
} = require("../../../scripts/install-skills.js");

const ROOT = path.join(__dirname, "..", "..", "..");

describe("install-skills: file presence", () => {
  it("all SKILL.md files exist", () => {
    for (const file of SKILL_FILES) {
      const fullPath = path.join(ROOT, file);
      expect(fs.existsSync(fullPath), `Missing: ${file}`).toBe(true);
    }
  });

  it("all script files exist", () => {
    for (const file of SCRIPT_FILES) {
      const fullPath = path.join(ROOT, file);
      expect(fs.existsSync(fullPath), `Missing: ${file}`).toBe(true);
    }
  });
});

describe("install-skills: package.json", () => {
  it("all 16 scripts are registered in package.json", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
    for (const [name, cmd] of Object.entries(PACKAGE_SCRIPTS)) {
      expect(pkg.scripts[name], `Missing script: ${name}`).toBe(cmd);
    }
  });
});

describe("install-skills: verify", () => {
  it("verify() returns true when everything is installed", () => {
    const result = verify();
    expect(result).toBe(true);
  });
});
