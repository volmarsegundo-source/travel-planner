import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Hoist mocks ──────────────────────────────────────────────────────────────

const { mockProfileFindUnique } = vi.hoisted(() => ({
  mockProfileFindUnique: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/server/db", () => ({
  db: {
    userProfile: { findUnique: mockProfileFindUnique },
  },
}));

vi.mock("@/lib/errors", () => {
  class AppError extends Error {
    code: string;
    statusCode: number;
    constructor(code: string, message: string, statusCode: number) {
      super(message);
      this.code = code;
      this.statusCode = statusCode;
      this.name = "AppError";
    }
  }
  return { AppError };
});

// ─── Import after mocks ───────────────────────────────────────────────────────

import { assertAiConsent } from "@/lib/guards/ai-consent-guard";
import { AppError } from "@/lib/errors";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("assertAiConsent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes when aiConsentGiven is true", async () => {
    mockProfileFindUnique.mockResolvedValue({ aiConsentGiven: true });

    await expect(assertAiConsent("user-1")).resolves.toBeUndefined();
  });

  it("passes when aiConsentGiven is true with v0-legacy version", async () => {
    mockProfileFindUnique.mockResolvedValue({
      aiConsentGiven: true,
      aiConsentVersion: "v0-legacy",
    });

    await expect(assertAiConsent("user-1")).resolves.toBeUndefined();
  });

  it("throws AI_CONSENT_REQUIRED when aiConsentGiven is null", async () => {
    mockProfileFindUnique.mockResolvedValue({ aiConsentGiven: null });

    await expect(assertAiConsent("user-1")).rejects.toThrow(AppError);
    try {
      await assertAiConsent("user-1");
    } catch (error) {
      expect((error as AppError).code).toBe("AI_CONSENT_REQUIRED");
      expect((error as AppError).statusCode).toBe(403);
    }
  });

  it("throws AI_CONSENT_REQUIRED when aiConsentGiven is false", async () => {
    mockProfileFindUnique.mockResolvedValue({ aiConsentGiven: false });

    await expect(assertAiConsent("user-1")).rejects.toThrow(AppError);
    try {
      await assertAiConsent("user-1");
    } catch (error) {
      expect((error as AppError).code).toBe("AI_CONSENT_REQUIRED");
    }
  });

  it("throws AI_CONSENT_REQUIRED when user profile not found", async () => {
    mockProfileFindUnique.mockResolvedValue(null);

    await expect(assertAiConsent("user-1")).rejects.toThrow(AppError);
    try {
      await assertAiConsent("user-1");
    } catch (error) {
      expect((error as AppError).code).toBe("AI_CONSENT_REQUIRED");
    }
  });

  it("queries userProfile with correct userId and select", async () => {
    mockProfileFindUnique.mockResolvedValue({ aiConsentGiven: true });

    await assertAiConsent("user-abc-123");

    expect(mockProfileFindUnique).toHaveBeenCalledWith({
      where: { userId: "user-abc-123" },
      select: { aiConsentGiven: true },
    });
  });
});
