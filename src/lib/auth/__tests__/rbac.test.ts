/**
 * B-W1-005 — RBAC helper tests.
 *
 * SPEC-ARCH-AI-GOVERNANCE-V2 §7.7 RBAC matrix.
 */
import { describe, it, expect } from "vitest";
import {
  hasAiGovernanceAccess,
  hasAiGovernanceApproverAccess,
  decideAdminAccess,
} from "@/lib/auth/rbac";

describe("hasAiGovernanceAccess (read+edit access)", () => {
  it("allows admin", () => {
    expect(hasAiGovernanceAccess("admin")).toBe(true);
  });

  it("allows admin-ai", () => {
    expect(hasAiGovernanceAccess("admin-ai")).toBe(true);
  });

  it("allows admin-ai-approver", () => {
    expect(hasAiGovernanceAccess("admin-ai-approver")).toBe(true);
  });

  it("denies regular user", () => {
    expect(hasAiGovernanceAccess("user")).toBe(false);
  });

  it("denies unknown roles", () => {
    expect(hasAiGovernanceAccess("moderator")).toBe(false);
    expect(hasAiGovernanceAccess("admin-billing")).toBe(false);
  });

  it("denies null / undefined / non-string", () => {
    expect(hasAiGovernanceAccess(null)).toBe(false);
    expect(hasAiGovernanceAccess(undefined)).toBe(false);
    expect(hasAiGovernanceAccess(42 as unknown as string)).toBe(false);
  });

  it("denies empty string", () => {
    expect(hasAiGovernanceAccess("")).toBe(false);
  });
});

describe("hasAiGovernanceApproverAccess (promote-only)", () => {
  it("allows admin", () => {
    expect(hasAiGovernanceApproverAccess("admin")).toBe(true);
  });

  it("allows admin-ai-approver", () => {
    expect(hasAiGovernanceApproverAccess("admin-ai-approver")).toBe(true);
  });

  it("DENIES admin-ai (read-only role per SPEC §7.7)", () => {
    expect(hasAiGovernanceApproverAccess("admin-ai")).toBe(false);
  });

  it("denies regular user + unknown roles", () => {
    expect(hasAiGovernanceApproverAccess("user")).toBe(false);
    expect(hasAiGovernanceApproverAccess("moderator")).toBe(false);
  });

  it("denies null / undefined / non-string", () => {
    expect(hasAiGovernanceApproverAccess(null)).toBe(false);
    expect(hasAiGovernanceApproverAccess(undefined)).toBe(false);
  });
});

/**
 * B47-MW-PURE-FN — Sprint 46 (P1 from 4-agent batch-review synthesis §10.3).
 *
 * Decoupled middleware/layout RBAC decision. Pure function is unit-testable
 * without NextAuth's auth() HOF wrapper, closing the test gap consolidated
 * across honesty flags from bfa2643 (layout-as-proxy) and 1c021db (RBAC).
 */
describe("decideAdminAccess (path-aware admin gate)", () => {
  describe("admin role (full platform admin)", () => {
    it("allows /admin/ia (V2 AI Governance)", () => {
      expect(decideAdminAccess("/en/admin/ia", "admin")).toBe("allow");
    });

    it("allows /admin/dashboard (back-compat admin-only)", () => {
      expect(decideAdminAccess("/en/admin/dashboard", "admin")).toBe("allow");
    });

    it("allows nested /admin/ia subpaths", () => {
      expect(decideAdminAccess("/pt/admin/ia/prompts", "admin")).toBe("allow");
    });

    it("allows /admin path on either locale", () => {
      expect(decideAdminAccess("/pt/admin/users", "admin")).toBe("allow");
    });
  });

  describe("admin-ai role (read+edit AI Governance only)", () => {
    it("allows /admin/ia per SPEC §7.7", () => {
      expect(decideAdminAccess("/en/admin/ia", "admin-ai")).toBe("allow");
    });

    it("allows nested /admin/ia subpaths", () => {
      expect(decideAdminAccess("/en/admin/ia/prompts/123", "admin-ai")).toBe(
        "allow"
      );
    });

    it("DENIES other /admin/* (back-compat: admin-only)", () => {
      expect(decideAdminAccess("/en/admin/dashboard", "admin-ai")).toBe("deny");
      expect(decideAdminAccess("/en/admin/users", "admin-ai")).toBe("deny");
      expect(decideAdminAccess("/en/admin", "admin-ai")).toBe("deny");
    });
  });

  describe("admin-ai-approver role (admin-ai + promote)", () => {
    it("allows /admin/ia (superset of admin-ai)", () => {
      expect(decideAdminAccess("/en/admin/ia", "admin-ai-approver")).toBe(
        "allow"
      );
    });

    it("DENIES other /admin/* (back-compat: admin-only)", () => {
      expect(
        decideAdminAccess("/en/admin/dashboard", "admin-ai-approver")
      ).toBe("deny");
    });
  });

  describe("non-AI roles", () => {
    it("denies regular user on /admin/ia", () => {
      expect(decideAdminAccess("/en/admin/ia", "user")).toBe("deny");
    });

    it("denies regular user on /admin/dashboard", () => {
      expect(decideAdminAccess("/en/admin/dashboard", "user")).toBe("deny");
    });

    it("denies unknown roles on both paths", () => {
      expect(decideAdminAccess("/en/admin/ia", "moderator")).toBe("deny");
      expect(decideAdminAccess("/en/admin/dashboard", "billing-admin")).toBe(
        "deny"
      );
    });
  });

  describe("defensive null/undefined/non-string role", () => {
    it("denies on /admin/ia with null role", () => {
      expect(decideAdminAccess("/en/admin/ia", null)).toBe("deny");
    });

    it("denies on /admin/dashboard with undefined role", () => {
      expect(decideAdminAccess("/en/admin/dashboard", undefined)).toBe("deny");
    });

    it("denies with non-string role (defense-in-depth)", () => {
      expect(
        decideAdminAccess("/en/admin/ia", 42 as unknown as string)
      ).toBe("deny");
      expect(
        decideAdminAccess("/en/admin/dashboard", {} as unknown as string)
      ).toBe("deny");
    });

    it("denies with empty-string role", () => {
      expect(decideAdminAccess("/en/admin/ia", "")).toBe("deny");
    });
  });

  describe("non-admin paths (caller responsibility)", () => {
    it("returns 'allow' for paths outside /admin/* (caller opts in)", () => {
      // Function is only meaningful when caller is gating /admin/*; for any
      // other path the function defers to the caller and returns 'allow'.
      expect(decideAdminAccess("/en/expeditions", "user")).toBe("allow");
      expect(decideAdminAccess("/en/trips", null)).toBe("allow");
    });
  });

  describe("path detection edge cases", () => {
    it("treats /admin/ia query/hash variants as the AI route", () => {
      expect(decideAdminAccess("/en/admin/ia?tab=prompts", "admin-ai")).toBe(
        "allow"
      );
    });

    it("does NOT treat /admin/iam (substring collision) as the AI route", () => {
      // Boundary check: /admin/iam should be admin-only (back-compat),
      // NOT auto-allowed for admin-ai. Documents the matcher boundary.
      expect(decideAdminAccess("/en/admin/iam", "admin-ai")).toBe("deny");
      expect(decideAdminAccess("/en/admin/iam", "admin")).toBe("allow");
    });
  });
});
