import { describe, it, expect, vi, beforeEach } from "vitest";

// SPEC-AUTH-AGE-002 — completeProfileAction must enforce 18+ for Google OAuth
// users and persist DOB to UserProfile.

const {
  mockAuth,
  mockSignOut,
  mockCheckRateLimit,
  mockHeaders,
  mockUpsert,
  mockFindUnique,
  mockUpdateSession,
  mockLoggerInfo,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockSignOut: vi.fn(),
  mockCheckRateLimit: vi.fn(),
  mockHeaders: vi.fn(),
  mockUpsert: vi.fn(),
  mockFindUnique: vi.fn(),
  mockUpdateSession: vi.fn(),
  mockLoggerInfo: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  headers: mockHeaders,
}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
  signOut: mockSignOut,
  updateSession: mockUpdateSession,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mockCheckRateLimit,
}));

vi.mock("@/server/db", () => ({
  db: {
    userProfile: { upsert: mockUpsert, findUnique: mockFindUnique },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: mockLoggerInfo, error: vi.fn(), warn: vi.fn() },
}));

import { completeProfileAction } from "@/server/actions/profile.actions";

function buildForm(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe("completeProfileAction — SPEC-AUTH-AGE-002", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true });
    mockHeaders.mockResolvedValue({ get: () => "127.0.0.1" });
    mockAuth.mockResolvedValue({ user: { id: "user_google_1" } });
    mockUpsert.mockResolvedValue({ userId: "user_google_1" });
    mockUpdateSession.mockResolvedValue(undefined);
  });

  // Scenario 2 — adult completes profile successfully
  it("upserts UserProfile with DOB and returns success for an adult", async () => {
    const fd = buildForm({ dateOfBirth: "1990-05-15" });

    const result = await completeProfileAction(fd);

    expect(result.success).toBe(true);
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const call = mockUpsert.mock.calls[0]![0] as {
      where: { userId: string };
      create: { userId: string; birthDate: Date };
      update: { birthDate: Date };
    };
    expect(call.where.userId).toBe("user_google_1");
    expect(call.create.birthDate).toBeInstanceOf(Date);
    expect(call.update.birthDate).toBeInstanceOf(Date);
    expect((call.create.birthDate as Date).toISOString().slice(0, 10)).toBe("1990-05-15");
    expect(mockSignOut).not.toHaveBeenCalled();

    // SPEC-AUTH-AGE-002 §Scenario 2: JWT must be refreshed so middleware
    // allows the user past /auth/complete-profile on the next navigation.
    expect(mockUpdateSession).toHaveBeenCalledWith({
      user: { profileComplete: true },
    });
  });

  // Scenario 3 — minor blocked and signed out
  it("blocks minors, logs an info event without PII, and triggers signOut", async () => {
    const today = new Date();
    const dob = new Date(today);
    dob.setFullYear(today.getFullYear() - 17);
    const iso = dob.toISOString().slice(0, 10);

    const fd = buildForm({ dateOfBirth: iso });

    const result = await completeProfileAction(fd);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("auth.errors.ageUnderage");
    }
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(mockSignOut).toHaveBeenCalledTimes(1);

    // Log must not contain email or DOB (anti-PII)
    const infoCalls = mockLoggerInfo.mock.calls;
    const rejected = infoCalls.find(
      (c) => c[0] === "auth.oauth.dobRejected"
    );
    expect(rejected).toBeDefined();
    const payload = rejected?.[1] ?? {};
    expect(JSON.stringify(payload)).not.toContain(iso);
    expect(JSON.stringify(payload)).not.toContain("@");
  });

  it("rejects invalid date strings with dateInvalid", async () => {
    const fd = buildForm({ dateOfBirth: "not-a-date" });

    const result = await completeProfileAction(fd);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("auth.errors.dateInvalid");
    }
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it("requires an authenticated session", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const result = await completeProfileAction(buildForm({ dateOfBirth: "1990-05-15" }));

    expect(result.success).toBe(false);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("rate-limits excessive attempts", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({ allowed: false });

    const result = await completeProfileAction(buildForm({ dateOfBirth: "1990-05-15" }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("errors.rateLimitExceeded");
    }
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});
