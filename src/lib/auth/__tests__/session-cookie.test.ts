import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// BUG-C-F3 — patchSessionToken must replace unstable_update cleanly.

const {
  mockCookies,
  mockGet,
  mockSet,
  mockEncode,
  mockDecode,
} = vi.hoisted(() => ({
  mockCookies: vi.fn(),
  mockGet: vi.fn(),
  mockSet: vi.fn(),
  mockEncode: vi.fn(),
  mockDecode: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

vi.mock("next-auth/jwt", () => ({
  encode: mockEncode,
  decode: mockDecode,
}));

import { patchSessionToken } from "@/lib/auth/session-cookie";

describe("patchSessionToken", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, AUTH_SECRET: "test-secret-123" };
    mockCookies.mockResolvedValue({ get: mockGet, set: mockSet });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns no-secret when AUTH_SECRET is missing", async () => {
    delete process.env.AUTH_SECRET;

    const result = await patchSessionToken({ profileComplete: true });

    expect(result).toEqual({ ok: false, reason: "no-secret" });
    expect(mockCookies).not.toHaveBeenCalled();
    expect(mockDecode).not.toHaveBeenCalled();
    expect(mockEncode).not.toHaveBeenCalled();
  });

  it("returns no-cookie when session cookie is absent", async () => {
    mockGet.mockReturnValue(undefined);

    const result = await patchSessionToken({ profileComplete: true });

    expect(result).toEqual({ ok: false, reason: "no-cookie" });
    expect(mockDecode).not.toHaveBeenCalled();
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("returns decode-failed when JWT cannot be decoded", async () => {
    mockGet.mockReturnValue({ value: "corrupted-jwt" });
    mockDecode.mockResolvedValue(null);

    const result = await patchSessionToken({ profileComplete: true });

    expect(result).toEqual({ ok: false, reason: "decode-failed" });
    expect(mockEncode).not.toHaveBeenCalled();
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("re-encodes the merged payload and rewrites the cookie on happy path", async () => {
    mockGet.mockReturnValue({ value: "valid-jwt" });
    mockDecode.mockResolvedValue({
      sub: "user_1",
      role: "user",
      name: "Ada",
      profileComplete: false,
    });
    mockEncode.mockResolvedValue("new-jwt");

    const result = await patchSessionToken({ profileComplete: true });

    expect(result).toEqual({ ok: true });
    expect(mockDecode).toHaveBeenCalledWith({
      token: "valid-jwt",
      secret: "test-secret-123",
      salt: expect.stringMatching(/authjs\.session-token$/),
    });
    expect(mockEncode).toHaveBeenCalledWith({
      token: {
        sub: "user_1",
        role: "user",
        name: "Ada",
        profileComplete: true,
      },
      secret: "test-secret-123",
      salt: expect.stringMatching(/authjs\.session-token$/),
      maxAge: 30 * 24 * 60 * 60,
    });
    expect(mockSet).toHaveBeenCalledWith(
      expect.stringMatching(/authjs\.session-token$/),
      "new-jwt",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      })
    );
  });

  it("patch overrides existing fields without dropping untouched claims", async () => {
    mockGet.mockReturnValue({ value: "valid-jwt" });
    mockDecode.mockResolvedValue({
      sub: "user_1",
      role: "user",
      name: "Ada",
      email: "ada@example.com",
      profileComplete: false,
      iat: 1700000000,
      exp: 1702592000,
    });
    mockEncode.mockResolvedValue("new-jwt");

    const result = await patchSessionToken({
      profileComplete: true,
      name: "Ada Lovelace",
    });

    expect(result).toEqual({ ok: true });
    const encodeCall = mockEncode.mock.calls[0]![0] as { token: Record<string, unknown> };
    expect(encodeCall.token).toMatchObject({
      sub: "user_1",
      role: "user",
      email: "ada@example.com",
      name: "Ada Lovelace",
      profileComplete: true,
      iat: 1700000000,
      exp: 1702592000,
    });
  });
});
