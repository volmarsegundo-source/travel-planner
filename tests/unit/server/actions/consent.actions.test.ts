/**
 * Unit tests for AI consent server actions.
 *
 * @see SPEC-ARCH-056 Section 9.1
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Hoist mocks ──────────────────────────────────────────────────────────────

const {
  mockAuth,
  mockProfileFindUnique,
  mockProfileUpsert,
  mockLoggerInfo,
  mockRevalidatePath,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockProfileFindUnique: vi.fn(),
  mockProfileUpsert: vi.fn(),
  mockLoggerInfo: vi.fn(),
  mockRevalidatePath: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/server/db", () => ({
  db: {
    userProfile: {
      findUnique: mockProfileFindUnique,
      upsert: mockProfileUpsert,
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: mockLoggerInfo, error: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/lib/hash", () => ({
  hashUserId: (id: string) => `hashed_${id}`,
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
  return {
    AppError,
    UnauthorizedError: class UnauthorizedError extends AppError {
      constructor() {
        super("UNAUTHORIZED", "Authentication required", 401);
      }
    },
  };
});

// ─── Import after mocks ───────────────────────────────────────────────────────

import {
  recordAiConsentAction,
  getAiConsentStatusAction,
} from "@/server/actions/consent.actions";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("recordAiConsentAction", () => {
  const session = { user: { id: "user-1", email: "test@test.com" } };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(session);
    mockProfileUpsert.mockResolvedValue({});
  });

  it("accepts consent for a new user and persists aiConsentGiven=true", async () => {
    const result = await recordAiConsentAction("accepted");

    expect(result).toEqual({ success: true, data: { ok: true } });
    expect(mockProfileUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        create: expect.objectContaining({
          userId: "user-1",
          aiConsentGiven: true,
          aiConsentVersion: "v1",
        }),
        update: expect.objectContaining({
          aiConsentGiven: true,
          aiConsentVersion: "v1",
        }),
      })
    );
  });

  it("accepts consent idempotently (calling accept twice does not error)", async () => {
    const result1 = await recordAiConsentAction("accepted");
    const result2 = await recordAiConsentAction("accepted");

    expect(result1).toEqual({ success: true, data: { ok: true } });
    expect(result2).toEqual({ success: true, data: { ok: true } });
    expect(mockProfileUpsert).toHaveBeenCalledTimes(2);
  });

  it("refuses consent and persists aiConsentGiven=false", async () => {
    const result = await recordAiConsentAction("refused");

    expect(result).toEqual({ success: true, data: { ok: true } });
    expect(mockProfileUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          aiConsentGiven: false,
        }),
        update: expect.objectContaining({
          aiConsentGiven: false,
        }),
      })
    );
  });

  it("throws UnauthorizedError when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(recordAiConsentAction("accepted")).rejects.toThrow(
      "Authentication required"
    );
  });

  it("returns validation error for invalid decision value", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await recordAiConsentAction("maybe" as any);

    expect(result).toEqual({
      success: false,
      error: "errors.validation",
    });
  });

  it("emits structured log with consent.recorded event", async () => {
    await recordAiConsentAction("accepted");

    expect(mockLoggerInfo).toHaveBeenCalledWith(
      "consent.recorded",
      expect.objectContaining({
        userId: "hashed_user-1",
        decision: "accepted",
        version: "v1",
      })
    );
  });

  it("sets aiConsentAt to a valid Date", async () => {
    const before = Date.now();
    await recordAiConsentAction("accepted");
    const after = Date.now();

    const upsertCall = mockProfileUpsert.mock.calls[0]![0];
    const consentAt = upsertCall.create.aiConsentAt as Date;
    expect(consentAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(consentAt.getTime()).toBeLessThanOrEqual(after);
  });

  it("revalidates expedition paths after recording consent", async () => {
    await recordAiConsentAction("accepted");

    expect(mockRevalidatePath).toHaveBeenCalledWith(
      "/expedition",
      "layout"
    );
  });
});

describe("getAiConsentStatusAction", () => {
  const session = { user: { id: "user-1", email: "test@test.com" } };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(session);
  });

  it("returns 'unknown' for new user with no profile", async () => {
    mockProfileFindUnique.mockResolvedValue(null);

    const result = await getAiConsentStatusAction();

    expect(result).toEqual({
      success: true,
      data: { status: "unknown" },
    });
  });

  it("returns 'consented' for user with aiConsentGiven=true", async () => {
    mockProfileFindUnique.mockResolvedValue({ aiConsentGiven: true });

    const result = await getAiConsentStatusAction();

    expect(result).toEqual({
      success: true,
      data: { status: "consented" },
    });
  });

  it("returns 'refused' for user with aiConsentGiven=false", async () => {
    mockProfileFindUnique.mockResolvedValue({ aiConsentGiven: false });

    const result = await getAiConsentStatusAction();

    expect(result).toEqual({
      success: true,
      data: { status: "refused" },
    });
  });

  it("returns 'unknown' for user with aiConsentGiven=null", async () => {
    mockProfileFindUnique.mockResolvedValue({ aiConsentGiven: null });

    const result = await getAiConsentStatusAction();

    expect(result).toEqual({
      success: true,
      data: { status: "unknown" },
    });
  });

  it("throws UnauthorizedError when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(getAiConsentStatusAction()).rejects.toThrow(
      "Authentication required"
    );
  });
});
