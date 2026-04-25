/**
 * B-W1-005 — RBAC helper tests.
 *
 * SPEC-ARCH-AI-GOVERNANCE-V2 §7.7 RBAC matrix.
 */
import { describe, it, expect } from "vitest";
import {
  hasAiGovernanceAccess,
  hasAiGovernanceApproverAccess,
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
