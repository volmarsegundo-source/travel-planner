/**
 * Unit tests for OnboardingService.
 *
 * Covers: getProgress (with/without profile), saveStep (happy path per step,
 * step skipping guard, final step completion, upsert for missing profile).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock("@/lib/hash", () => ({ hashUserId: (id: string) => `h_${id}` }));

vi.mock("@/server/db", () => ({
  db: mockDeep<PrismaClient>(),
}));

import { db } from "@/server/db";
import { OnboardingService } from "@/server/services/onboarding.service";

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;
const USER_ID = "user_abc";

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("OnboardingService.getProgress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns step 0 with null data when no profile exists", async () => {
    prismaMock.userProfile.findUnique.mockResolvedValue(null);

    const result = await OnboardingService.getProgress(USER_ID);

    expect(result).toEqual({
      onboardingStep: 0,
      onboardingData: null,
      onboardingCompletedAt: null,
    });
    expect(prismaMock.userProfile.findUnique).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      select: {
        onboardingStep: true,
        onboardingData: true,
        onboardingCompletedAt: true,
      },
    });
  });

  it("returns saved progress from profile", async () => {
    const savedData = { step1: {}, step2: { destination: "Tokyo" } };
    prismaMock.userProfile.findUnique.mockResolvedValue({
      onboardingStep: 2,
      onboardingData: savedData,
      onboardingCompletedAt: null,
    } as never);

    const result = await OnboardingService.getProgress(USER_ID);

    expect(result).toEqual({
      onboardingStep: 2,
      onboardingData: savedData,
      onboardingCompletedAt: null,
    });
  });

  it("returns completed state with timestamp", async () => {
    const completedAt = new Date("2026-04-18T10:00:00Z");
    prismaMock.userProfile.findUnique.mockResolvedValue({
      onboardingStep: 3,
      onboardingData: { step1: {}, step2: {}, step3: {} },
      onboardingCompletedAt: completedAt,
    } as never);

    const result = await OnboardingService.getProgress(USER_ID);

    expect(result.onboardingCompletedAt).toEqual(completedAt);
    expect(result.onboardingStep).toBe(3);
  });
});

describe("OnboardingService.saveStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws for step number below 1", async () => {
    await expect(
      OnboardingService.saveStep(USER_ID, 0, {})
    ).rejects.toThrow("onboarding.errors.invalidStep");
  });

  it("throws for step number above 3", async () => {
    await expect(
      OnboardingService.saveStep(USER_ID, 4, {})
    ).rejects.toThrow("onboarding.errors.invalidStep");
  });

  it("throws when trying to skip a step", async () => {
    prismaMock.userProfile.findUnique.mockResolvedValue({
      onboardingStep: 0,
      onboardingData: null,
      onboardingCompletedAt: null,
    } as never);

    await expect(
      OnboardingService.saveStep(USER_ID, 2, { destination: "Paris" })
    ).rejects.toThrow("onboarding.errors.stepSkipped");
  });

  it("saves step 1 and upserts profile", async () => {
    prismaMock.userProfile.findUnique.mockResolvedValue(null);
    prismaMock.userProfile.upsert.mockResolvedValue({
      onboardingStep: 1,
      onboardingData: { step1: {} },
      onboardingCompletedAt: null,
    } as never);

    const result = await OnboardingService.saveStep(USER_ID, 1, {});

    expect(result.onboardingStep).toBe(1);
    expect(prismaMock.userProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: USER_ID },
        create: expect.objectContaining({
          userId: USER_ID,
          onboardingStep: 1,
          onboardingData: { step1: {} },
          onboardingCompletedAt: null,
        }),
        update: expect.objectContaining({
          onboardingStep: 1,
          onboardingData: { step1: {} },
        }),
      })
    );
  });

  it("saves step 2 merging with existing step 1 data", async () => {
    prismaMock.userProfile.findUnique.mockResolvedValue({
      onboardingStep: 1,
      onboardingData: { step1: {} },
      onboardingCompletedAt: null,
    } as never);
    const step2Payload = {
      destination: "Paris",
      startDate: "2026-06-01",
      endDate: "2026-06-10",
      travelers: 2,
    };
    prismaMock.userProfile.upsert.mockResolvedValue({
      onboardingStep: 2,
      onboardingData: { step1: {}, step2: step2Payload },
      onboardingCompletedAt: null,
    } as never);

    const result = await OnboardingService.saveStep(USER_ID, 2, step2Payload);

    expect(result.onboardingStep).toBe(2);
    expect(prismaMock.userProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          onboardingData: { step1: {}, step2: step2Payload },
        }),
      })
    );
  });

  it("saves step 3 and sets onboardingCompletedAt", async () => {
    prismaMock.userProfile.findUnique.mockResolvedValue({
      onboardingStep: 2,
      onboardingData: { step1: {}, step2: { destination: "Paris" } },
      onboardingCompletedAt: null,
    } as never);
    const step3Payload = {
      travelStyle: "ADVENTURE",
      budget: 2000,
      currency: "USD",
    };
    const completedAt = new Date();
    prismaMock.userProfile.upsert.mockResolvedValue({
      onboardingStep: 3,
      onboardingData: { step1: {}, step2: {}, step3: step3Payload },
      onboardingCompletedAt: completedAt,
    } as never);

    const result = await OnboardingService.saveStep(USER_ID, 3, step3Payload);

    expect(result.onboardingCompletedAt).toEqual(completedAt);
    expect(prismaMock.userProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          onboardingCompletedAt: expect.any(Date),
        }),
        update: expect.objectContaining({
          onboardingCompletedAt: expect.any(Date),
        }),
      })
    );
  });

  it("allows re-submitting the current step (idempotent)", async () => {
    prismaMock.userProfile.findUnique.mockResolvedValue({
      onboardingStep: 1,
      onboardingData: { step1: {} },
      onboardingCompletedAt: null,
    } as never);
    prismaMock.userProfile.upsert.mockResolvedValue({
      onboardingStep: 1,
      onboardingData: { step1: {} },
      onboardingCompletedAt: null,
    } as never);

    // Re-submitting step 1 when already on step 1 should work
    const result = await OnboardingService.saveStep(USER_ID, 1, {});
    expect(result.onboardingStep).toBe(1);
  });
});
