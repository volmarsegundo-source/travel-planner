import { describe, it, expect, vi, beforeEach } from "vitest";

// Wave 2.8b — ProfileService branch coverage tests
// Target: profile.service.ts 54% branches → ~90% branches

const {
  mockUserProfileUpsert,
  mockUserProfileFindUnique,
  mockUserProfileUpdate,
  mockAwardProfileCompletion,
  mockEncrypt,
  mockLoggerInfo,
} = vi.hoisted(() => ({
  mockUserProfileUpsert: vi.fn(),
  mockUserProfileFindUnique: vi.fn(),
  mockUserProfileUpdate: vi.fn(),
  mockAwardProfileCompletion: vi.fn(),
  mockEncrypt: vi.fn((value: string) => `enc(${value})`),
  mockLoggerInfo: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/server/db", () => ({
  db: {
    userProfile: {
      upsert: mockUserProfileUpsert,
      findUnique: mockUserProfileFindUnique,
      update: mockUserProfileUpdate,
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/engines/points-engine", () => ({
  PointsEngine: {
    awardProfileCompletion: mockAwardProfileCompletion,
  },
}));

vi.mock("@/lib/crypto", () => ({
  encrypt: mockEncrypt,
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: mockLoggerInfo, error: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/lib/hash", () => ({ hashUserId: (id: string) => `hash_${id}` }));

import { ProfileService } from "../profile.service";

describe("ProfileService.saveAndAwardProfileFields — branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserProfileUpsert.mockResolvedValue({});
    mockAwardProfileCompletion.mockResolvedValue(undefined);
  });

  it("skips undefined and empty-string values (early-continue branch)", async () => {
    const result = await ProfileService.saveAndAwardProfileFields("user_1", {
      phone: undefined,
      city: "",
    });

    expect(result.fieldsUpdated).toEqual([]);
    expect(result.pointsAwarded).toBe(0);
    expect(mockUserProfileUpsert).not.toHaveBeenCalled();
  });

  it("skips keys not in the allow-list (mass assignment guard)", async () => {
    const result = await ProfileService.saveAndAwardProfileFields("user_1", {
      maliciousField: "hacker",
      isAdmin: "true",
    } as Record<string, string>);

    expect(result.fieldsUpdated).toEqual([]);
    expect(mockUserProfileUpsert).not.toHaveBeenCalled();
  });

  it("parses birthDate into a Date (birthDate branch)", async () => {
    await ProfileService.saveAndAwardProfileFields("user_1", {
      birthDate: "1990-05-15",
    });

    expect(mockUserProfileUpsert).toHaveBeenCalledOnce();
    const call = mockUserProfileUpsert.mock.calls[0][0];
    expect(call.update.birthDate).toBeInstanceOf(Date);
    expect(call.update.birthDate.toISOString()).toContain("1990-05-15");
  });

  it("encrypts sensitive fields and stores under `${key}Enc` (encryption branch)", async () => {
    await ProfileService.saveAndAwardProfileFields("user_1", {
      passportNumber: "AB123456",
      nationalId: "123.456.789-00",
    });

    expect(mockEncrypt).toHaveBeenCalledWith("AB123456");
    expect(mockEncrypt).toHaveBeenCalledWith("123.456.789-00");
    const call = mockUserProfileUpsert.mock.calls[0][0];
    expect(call.update.passportNumberEnc).toBe("enc(AB123456)");
    expect(call.update.nationalIdEnc).toBe("enc(123.456.789-00)");
    expect(call.update.passportNumber).toBeUndefined();
  });

  it("stores plain-text fields under their original key (else branch)", async () => {
    await ProfileService.saveAndAwardProfileFields("user_1", {
      phone: "+5511999999999",
      city: "São Paulo",
    });

    const call = mockUserProfileUpsert.mock.calls[0][0];
    expect(call.update.phone).toBe("+5511999999999");
    expect(call.update.city).toBe("São Paulo");
  });

  it("returns early without touching DB when all fields are filtered out", async () => {
    const result = await ProfileService.saveAndAwardProfileFields("user_1", {});

    expect(result).toEqual({ pointsAwarded: 0, fieldsUpdated: [] });
    expect(mockUserProfileUpsert).not.toHaveBeenCalled();
    expect(mockAwardProfileCompletion).not.toHaveBeenCalled();
  });

  it("awards points for each updated field (points branch)", async () => {
    const result = await ProfileService.saveAndAwardProfileFields("user_1", {
      phone: "+55",
      city: "Recife",
    });

    expect(mockAwardProfileCompletion).toHaveBeenCalledTimes(2);
    expect(mockAwardProfileCompletion).toHaveBeenCalledWith("user_1", "phone", 25, undefined);
    expect(mockAwardProfileCompletion).toHaveBeenCalledWith("user_1", "city", 25, undefined);
    expect(result.pointsAwarded).toBe(50);
    expect(result.fieldsUpdated).toEqual(["phone", "city"]);
  });

  it("uses the tx client when a transaction is provided", async () => {
    const txUpsert = vi.fn().mockResolvedValue({});
    const tx = { userProfile: { upsert: txUpsert } } as unknown as Parameters<
      typeof ProfileService.saveAndAwardProfileFields
    >[2];

    await ProfileService.saveAndAwardProfileFields("user_1", { phone: "+55" }, tx);

    expect(txUpsert).toHaveBeenCalledOnce();
    expect(mockUserProfileUpsert).not.toHaveBeenCalled();
    expect(mockAwardProfileCompletion).toHaveBeenCalledWith("user_1", "phone", 25, tx);
  });
});

describe("ProfileService.recalculateCompletionScore — branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserProfileUpdate.mockResolvedValue({});
  });

  it("returns 0 when profile does not exist (null profile branch)", async () => {
    mockUserProfileFindUnique.mockResolvedValue(null);

    const score = await ProfileService.recalculateCompletionScore("user_1");

    expect(score).toBe(0);
    expect(mockUserProfileUpdate).not.toHaveBeenCalled();
  });

  it("returns 0 for an empty profile (no fields filled)", async () => {
    mockUserProfileFindUnique.mockResolvedValue({
      userId: "user_1",
      birthDate: null,
      phone: null,
      country: null,
      city: null,
      address: null,
      passportNumberEnc: null,
      passportExpiry: null,
      nationalIdEnc: null,
      bio: null,
      dietaryRestrictions: null,
      accessibility: null,
    });

    const score = await ProfileService.recalculateCompletionScore("user_1");

    expect(score).toBe(0);
    expect(mockUserProfileUpdate).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      data: { completionScore: 0 },
    });
  });

  it("returns 100 when every checked field is filled", async () => {
    mockUserProfileFindUnique.mockResolvedValue({
      birthDate: new Date(),
      phone: "+55",
      country: "BR",
      city: "SP",
      address: "Rua X",
      passportNumberEnc: "enc",
      passportExpiry: new Date(),
      nationalIdEnc: "enc",
      bio: "bio",
      dietaryRestrictions: "none",
      accessibility: "none",
    });

    const score = await ProfileService.recalculateCompletionScore("user_1");

    expect(score).toBe(100);
    expect(mockUserProfileUpdate).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      data: { completionScore: 100 },
    });
  });

  it("rounds partial completion score", async () => {
    // 3 of 11 checkFields filled → 3/11 ≈ 27.27% → rounded to 27
    mockUserProfileFindUnique.mockResolvedValue({
      birthDate: new Date(),
      phone: "+55",
      country: "BR",
      city: null,
      address: null,
      passportNumberEnc: null,
      passportExpiry: null,
      nationalIdEnc: null,
      bio: null,
      dietaryRestrictions: null,
      accessibility: null,
    });

    const score = await ProfileService.recalculateCompletionScore("user_1");

    expect(score).toBe(27);
  });

  it("uses the tx client when a transaction is provided", async () => {
    const txFindUnique = vi.fn().mockResolvedValue({
      birthDate: new Date(),
      phone: null, country: null, city: null, address: null,
      passportNumberEnc: null, passportExpiry: null, nationalIdEnc: null,
      bio: null, dietaryRestrictions: null, accessibility: null,
    });
    const txUpdate = vi.fn().mockResolvedValue({});
    const tx = {
      userProfile: { findUnique: txFindUnique, update: txUpdate },
    } as unknown as Parameters<typeof ProfileService.recalculateCompletionScore>[1];

    const score = await ProfileService.recalculateCompletionScore("user_1", tx);

    expect(score).toBe(9); // 1/11 ≈ 9.09 → 9
    expect(txFindUnique).toHaveBeenCalledOnce();
    expect(txUpdate).toHaveBeenCalledOnce();
    expect(mockUserProfileFindUnique).not.toHaveBeenCalled();
    expect(mockUserProfileUpdate).not.toHaveBeenCalled();
  });
});
