/**
 * Tests for generate-test-plan.js
 *
 * Covers: task extraction, file categorization, feature area detection,
 * and the generate function (file output).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";

// Import the module under test
const {
  extractTasks,
  categorizeChangedFiles,
  detectFeatureAreas,
  generate,
} = require("../../../scripts/generate-test-plan.js");

// ─── extractTasks ────────────────────────────────────────────────────────────

describe("extractTasks", () => {
  it("extracts unchecked tasks from markdown", () => {
    const content = `# Plan\n\n- [ ] Build login page\n- [ ] Add tests\n`;
    const tasks = extractTasks(content);
    expect(tasks).toEqual(["Build login page", "Add tests"]);
  });

  it("extracts checked tasks too", () => {
    const content = `- [x] Done task\n- [ ] Pending task\n`;
    const tasks = extractTasks(content);
    expect(tasks).toEqual(["Done task", "Pending task"]);
  });

  it("returns empty array for no tasks", () => {
    const content = `# Plan\n\nJust text, no tasks.\n`;
    const tasks = extractTasks(content);
    expect(tasks).toEqual([]);
  });

  it("handles asterisk bullet points", () => {
    const content = `* [ ] Star bullet task\n`;
    const tasks = extractTasks(content);
    expect(tasks).toEqual(["Star bullet task"]);
  });
});

// ─── categorizeChangedFiles ──────────────────────────────────────────────────

describe("categorizeChangedFiles", () => {
  it("categorizes page files", () => {
    const files = ["src/app/[locale]/(app)/trips/page.tsx"];
    const cats = categorizeChangedFiles(files);
    expect(cats.pages).toHaveLength(1);
  });

  it("categorizes loading and error files as pages", () => {
    const files = [
      "src/app/[locale]/(app)/loading.tsx",
      "src/app/[locale]/(app)/error.tsx",
      "src/app/[locale]/(app)/layout.tsx",
    ];
    const cats = categorizeChangedFiles(files);
    expect(cats.pages).toHaveLength(3);
  });

  it("categorizes component files", () => {
    const files = ["src/components/features/account/ProfileForm.tsx"];
    const cats = categorizeChangedFiles(files);
    expect(cats.components).toHaveLength(1);
  });

  it("categorizes server actions", () => {
    const files = ["src/server/actions/account.actions.ts"];
    const cats = categorizeChangedFiles(files);
    expect(cats.serverActions).toHaveLength(1);
  });

  it("categorizes test files", () => {
    const files = [
      "tests/unit/app/loading-app.test.tsx",
      "tests/e2e/login.spec.ts",
    ];
    const cats = categorizeChangedFiles(files);
    expect(cats.tests).toHaveLength(2);
  });

  it("categorizes i18n files", () => {
    const files = ["messages/en.json", "messages/pt-BR.json"];
    const cats = categorizeChangedFiles(files);
    expect(cats.i18n).toHaveLength(2);
  });

  it("categorizes lib files", () => {
    const files = ["src/lib/validations/account.schema.ts"];
    const cats = categorizeChangedFiles(files);
    expect(cats.lib).toHaveLength(1);
  });

  it("categorizes config and prisma files", () => {
    const files = ["prisma/schema.prisma", "package.json"];
    const cats = categorizeChangedFiles(files);
    expect(cats.config).toHaveLength(2);
  });
});

// ─── detectFeatureAreas ──────────────────────────────────────────────────────

describe("detectFeatureAreas", () => {
  it("detects auth area", () => {
    const areas = detectFeatureAreas(["src/lib/auth.ts", "src/app/[locale]/auth/login/page.tsx"]);
    expect(areas).toContain("auth");
  });

  it("detects trips area", () => {
    const areas = detectFeatureAreas(["src/app/[locale]/(app)/trips/page.tsx"]);
    expect(areas).toContain("trips");
  });

  it("detects itinerary area", () => {
    const areas = detectFeatureAreas(["src/components/features/itinerary/ItineraryEditor.tsx"]);
    expect(areas).toContain("itinerary");
  });

  it("detects checklist area", () => {
    const areas = detectFeatureAreas(["src/components/features/checklist/ChecklistView.tsx"]);
    expect(areas).toContain("checklist");
  });

  it("detects account area", () => {
    const areas = detectFeatureAreas(["src/components/features/account/ProfileForm.tsx"]);
    expect(areas).toContain("account");
  });

  it("detects loading-states area", () => {
    const areas = detectFeatureAreas(["src/app/[locale]/(app)/loading.tsx"]);
    expect(areas).toContain("loading-states");
  });

  it("detects error-handling area", () => {
    const areas = detectFeatureAreas(["src/app/[locale]/(app)/error.tsx"]);
    expect(areas).toContain("error-handling");
  });

  it("detects i18n area", () => {
    const areas = detectFeatureAreas(["messages/en.json"]);
    expect(areas).toContain("i18n");
  });

  it("detects navigation area", () => {
    const areas = detectFeatureAreas(["src/components/layout/AuthenticatedNavbar.tsx"]);
    expect(areas).toContain("navigation");
  });

  it("detects multiple areas from mixed files", () => {
    const areas = detectFeatureAreas([
      "src/components/features/account/ProfileForm.tsx",
      "src/app/[locale]/(app)/trips/page.tsx",
      "messages/pt-BR.json",
    ]);
    expect(areas).toContain("account");
    expect(areas).toContain("trips");
    expect(areas).toContain("i18n");
  });

  it("returns empty array for unrelated files", () => {
    const areas = detectFeatureAreas(["README.md", "package.json"]);
    expect(areas).toHaveLength(0);
  });
});

// ─── generate (integration) ─────────────────────────────────────────────────

describe("generate", () => {
  const outputPath = path.join(
    process.cwd(),
    "docs",
    "test-results",
    "test-plan-sprint-999.md"
  );

  afterEach(() => {
    // Cleanup test output
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
  });

  it("generates a test plan file", () => {
    const result = generate(999);
    expect(fs.existsSync(result.outputPath)).toBe(true);
  });

  it("returns the count of test cases", () => {
    const result = generate(999);
    expect(result.checkboxCount).toBeGreaterThan(0);
  });

  it("output contains all required sections", () => {
    generate(999);
    const content = fs.readFileSync(outputPath, "utf8");

    expect(content).toContain("Ambiente de Teste");
    expect(content).toContain("Happy Path");
    expect(content).toContain("Edge Cases");
    expect(content).toContain("Regressão");
    expect(content).toContain("Mobile / Responsivo");
    expect(content).toContain("Acessibilidade");
    expect(content).toContain("i18n");
    expect(content).toContain("Performance");
  });

  it("output contains sprint number in title", () => {
    generate(999);
    const content = fs.readFileSync(outputPath, "utf8");
    expect(content).toContain("Sprint 999");
  });

  it("output contains checkboxes", () => {
    generate(999);
    const content = fs.readFileSync(outputPath, "utf8");
    const checkboxes = content.match(/- \[ \]/g) || [];
    expect(checkboxes.length).toBeGreaterThan(10);
  });
});
