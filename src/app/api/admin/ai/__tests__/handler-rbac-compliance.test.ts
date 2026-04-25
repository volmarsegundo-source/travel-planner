/**
 * B47-API-RBAC-CONVENTION compliance test.
 *
 * **Purpose.** Edge middleware skips `/api/*` paths
 * (`src/middleware.ts:45`), so admin AI API handlers cannot rely on
 * middleware RBAC. Every route under `src/app/api/admin/ai/**` MUST be
 * exported wrapped in `withAiGovernanceAccess` or
 * `withAiGovernanceApproverAccess` (`src/lib/auth/with-rbac.ts`).
 *
 * This test is the lint-rule equivalent: it enumerates every route file
 * in the admin AI handler tree and asserts each one imports one of the
 * wrappers. It exists even though Wave 2 has not yet shipped any
 * handlers — it activates automatically on the first Wave 2 commit and
 * fails CI loudly if any handler skips the wrapper.
 *
 * Sprint 46, P1 from 4-agent batch-review §10.3.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ADMIN_AI_API_DIR = join(
  process.cwd(),
  "src",
  "app",
  "api",
  "admin",
  "ai"
);

const REQUIRED_WRAPPERS = [
  "withAiGovernanceAccess",
  "withAiGovernanceApproverAccess",
] as const;

function listRouteFiles(dir: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    // Directory does not exist yet — Wave 2 has not started.
    return [];
  }

  const out: string[] = [];
  for (const entry of entries) {
    if (entry === "__tests__") continue;
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      out.push(...listRouteFiles(full));
      continue;
    }
    // App Router route files are named route.ts / route.tsx.
    if (/^route\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe("B47-API-RBAC-CONVENTION — /api/admin/ai/** RBAC compliance", () => {
  const routeFiles = listRouteFiles(ADMIN_AI_API_DIR);

  it("convention is wired even when no handlers exist yet (early activation)", () => {
    // Sanity: the wrapper module file must exist. If it is not present,
    // the glob pass below would silently pass for an empty tree.
    const wrapperPath = join(
      process.cwd(),
      "src",
      "lib",
      "auth",
      "with-rbac.ts"
    );
    expect(
      existsSync(wrapperPath),
      "withAiGovernance* wrappers missing — see src/lib/auth/with-rbac.ts."
    ).toBe(true);
  });

  if (routeFiles.length === 0) {
    it("(no /api/admin/ai/** route files yet — convention will activate on Wave 2)", () => {
      expect(routeFiles.length).toBe(0);
    });
    return;
  }

  it.each(routeFiles)(
    "%s imports a withAiGovernance* wrapper",
    (filePath) => {
      const source = readFileSync(filePath, "utf8");

      const importsWrapper = REQUIRED_WRAPPERS.some((wrapper) => {
        const namedImport = new RegExp(
          `import\\s*\\{[^}]*\\b${wrapper}\\b[^}]*\\}\\s*from\\s*['"]@/lib/auth/with-rbac['"]`
        );
        return namedImport.test(source);
      });

      const rel = relative(process.cwd(), filePath);
      expect(
        importsWrapper,
        `${rel} must import withAiGovernanceAccess or withAiGovernanceApproverAccess from '@/lib/auth/with-rbac'. ` +
          `Convention B47-API-RBAC-CONVENTION (Sprint 46): every /api/admin/ai/** route handler must self-gate ` +
          `because the Edge middleware skips /api/*.`
      ).toBe(true);
    }
  );

  it.each(routeFiles)(
    "%s exports HTTP method handlers wrapped via withAiGovernance*",
    (filePath) => {
      const source = readFileSync(filePath, "utf8");

      // Heuristic: any `export const GET|POST|PUT|PATCH|DELETE = ...`
      // statement should reference one of the wrappers on the same line
      // chain. Multi-line wrapping (assigned to a variable and then
      // exported) is also accepted.
      const exportRegex =
        /export\s+(?:const|async\s+function|function)\s+(GET|POST|PUT|PATCH|DELETE)\b/g;
      const matches = Array.from(source.matchAll(exportRegex));

      if (matches.length === 0) {
        // No HTTP exports — file may be a shared helper. Skip.
        return;
      }

      const wrapperUsed = REQUIRED_WRAPPERS.some((wrapper) =>
        new RegExp(`\\b${wrapper}\\s*\\(`).test(source)
      );
      const rel = relative(process.cwd(), filePath);
      expect(
        wrapperUsed,
        `${rel} exports HTTP method handlers (${matches
          .map((m) => m[1])
          .join(", ")}) but does not call withAiGovernanceAccess or ` +
          `withAiGovernanceApproverAccess. Convention B47-API-RBAC-CONVENTION.`
      ).toBe(true);
    }
  );
});
