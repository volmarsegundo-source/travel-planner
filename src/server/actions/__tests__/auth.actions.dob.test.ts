import { describe, it, expect, vi, beforeEach } from "vitest";

// SPEC-AUTH-AGE-001: registerAction must enforce 18+ and forward DOB to
// AuthService.registerUser. BDD-style scenarios.

const { mockRegisterUser, mockCheckRateLimit, mockHeaders } = vi.hoisted(() => ({
  mockRegisterUser: vi.fn(),
  mockCheckRateLimit: vi.fn(),
  mockHeaders: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  headers: mockHeaders,
}));

vi.mock("@/server/services/auth.service", () => ({
  AuthService: {
    registerUser: mockRegisterUser,
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mockCheckRateLimit,
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { registerAction } from "@/server/actions/auth.actions";

function buildForm(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe("registerAction — SPEC-AUTH-AGE-001 DOB enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true });
    mockHeaders.mockResolvedValue({ get: () => "127.0.0.1" });
    mockRegisterUser.mockResolvedValue({ userId: "u_123" });
  });

  // Scenario 1 — Given an adult with a valid DOB,
  //   When registerAction runs, Then the user is created with the DOB.
  it("registers an adult successfully and forwards DOB to the service", async () => {
    const fd = buildForm({
      email: "adult@example.com",
      password: "SecurePass1!",
      dateOfBirth: "1990-05-15",
    });

    const result = await registerAction(fd);

    expect(result.success).toBe(true);
    expect(mockRegisterUser).toHaveBeenCalledTimes(1);
    const [email, password, name, dob] = mockRegisterUser.mock.calls[0]!;
    expect(email).toBe("adult@example.com");
    expect(password).toBe("SecurePass1!");
    expect(name).toBeUndefined();
    expect(dob).toBeInstanceOf(Date);
    expect((dob as Date).toISOString().slice(0, 10)).toBe("1990-05-15");
  });

  // Scenario 2 — Given a minor (17y old today),
  //   When registerAction runs, Then it returns ageUnderage error.
  it("rejects a minor (DOB less than 18 years ago) with ageUnderage error", async () => {
    const today = new Date();
    const dob = new Date(today);
    dob.setFullYear(today.getFullYear() - 17);
    const dobIso = dob.toISOString().slice(0, 10);

    const fd = buildForm({
      email: "minor@example.com",
      password: "SecurePass1!",
      dateOfBirth: dobIso,
    });

    const result = await registerAction(fd);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("auth.errors.ageUnderage");
    }
    expect(mockRegisterUser).not.toHaveBeenCalled();
  });

  // Scenario 3 — Given an invalid date string,
  //   When registerAction runs, Then it returns dateInvalid error.
  it("rejects an invalid DOB string with dateInvalid error", async () => {
    const fd = buildForm({
      email: "bad@example.com",
      password: "SecurePass1!",
      dateOfBirth: "not-a-date",
    });

    const result = await registerAction(fd);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("auth.errors.dateInvalid");
    }
    expect(mockRegisterUser).not.toHaveBeenCalled();
  });

  // Scenario 4 — Given missing DOB,
  //   When registerAction runs, Then it rejects.
  it("rejects when DOB is missing", async () => {
    const fd = buildForm({
      email: "nodob@example.com",
      password: "SecurePass1!",
    });

    const result = await registerAction(fd);

    expect(result.success).toBe(false);
    expect(mockRegisterUser).not.toHaveBeenCalled();
  });
});
