/**
 * Unit tests for AccommodationService (T-S21-005).
 *
 * Tests cover: BOLA rejection, max accommodations enforcement,
 * encrypt/decrypt of bookingCode, null bookingCode passthrough.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

// ─── Hoisted mocks ──────────────────────────────────────────────────────────

const { mockEncrypt, mockDecrypt } = vi.hoisted(() => ({
  mockEncrypt: vi.fn((v: string) => `enc_${v}`),
  mockDecrypt: vi.fn((v: string) => v.replace("enc_", "")),
}));

// ─── Module mocks ────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/server/db", () => ({
  db: mockDeep<PrismaClient>(),
}));

vi.mock("@/lib/crypto", () => ({
  encrypt: mockEncrypt,
  decrypt: mockDecrypt,
}));

// ─── Import SUT after mocks ─────────────────────────────────────────────────

import { AccommodationService } from "@/server/services/accommodation.service";
import { db } from "@/server/db";
import { MAX_ACCOMMODATIONS } from "@/lib/validations/transport.schema";
import type { AccommodationInput } from "@/lib/validations/transport.schema";

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeAccommodation(
  overrides: Partial<AccommodationInput> = {}
): AccommodationInput {
  return {
    accommodationType: "hotel",
    orderIndex: 0,
    ...overrides,
  };
}

function makeDbAccommodation(overrides: Record<string, unknown> = {}) {
  return {
    id: "acc-1",
    tripId: "trip-1",
    orderIndex: 0,
    accommodationType: "hotel",
    name: null,
    address: null,
    bookingCodeEnc: null,
    checkIn: null,
    checkOut: null,
    estimatedCost: null,
    currency: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("AccommodationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("saveAccommodations", () => {
    it("rejects when trip not found (BOLA check)", async () => {
      prismaMock.trip.findFirst.mockResolvedValue(null);

      await expect(
        AccommodationService.saveAccommodations("user-1", "trip-1", [
          makeAccommodation(),
        ])
      ).rejects.toThrow("Trip not found or unauthorized");
    });

    it("rejects when accommodations exceed max limit", async () => {
      prismaMock.trip.findFirst.mockResolvedValue({ id: "trip-1" } as never);

      const accommodations = Array.from(
        { length: MAX_ACCOMMODATIONS + 1 },
        (_, i) => makeAccommodation({ orderIndex: i })
      );

      await expect(
        AccommodationService.saveAccommodations("user-1", "trip-1", accommodations)
      ).rejects.toThrow(`Maximum ${MAX_ACCOMMODATIONS} accommodations allowed`);
    });

    it("calls encrypt for bookingCode when provided", async () => {
      prismaMock.trip.findFirst.mockResolvedValue({ id: "trip-1" } as never);

      const txMock = mockDeep<PrismaClient>();
      txMock.accommodation.create.mockResolvedValue(makeDbAccommodation() as never);
      txMock.accommodation.deleteMany.mockResolvedValue({ count: 0 } as never);
      prismaMock.$transaction.mockImplementation(async (fn) => {
        if (typeof fn === "function") {
          return fn(txMock as unknown as Parameters<Parameters<typeof db.$transaction>[0]>[0]);
        }
        return [];
      });

      await AccommodationService.saveAccommodations("user-1", "trip-1", [
        makeAccommodation({ bookingCode: "HOTEL-456" }),
      ]);

      expect(mockEncrypt).toHaveBeenCalledWith("HOTEL-456");
    });

    it("passes null for bookingCodeEnc when bookingCode is null", async () => {
      prismaMock.trip.findFirst.mockResolvedValue({ id: "trip-1" } as never);

      const txMock = mockDeep<PrismaClient>();
      txMock.accommodation.create.mockResolvedValue(makeDbAccommodation() as never);
      txMock.accommodation.deleteMany.mockResolvedValue({ count: 0 } as never);
      prismaMock.$transaction.mockImplementation(async (fn) => {
        if (typeof fn === "function") {
          return fn(txMock as unknown as Parameters<Parameters<typeof db.$transaction>[0]>[0]);
        }
        return [];
      });

      await AccommodationService.saveAccommodations("user-1", "trip-1", [
        makeAccommodation({ bookingCode: null }),
      ]);

      expect(mockEncrypt).not.toHaveBeenCalled();
      expect(txMock.accommodation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ bookingCodeEnc: null }),
        })
      );
    });

    it("deletes existing accommodations before creating new ones", async () => {
      prismaMock.trip.findFirst.mockResolvedValue({ id: "trip-1" } as never);

      const txMock = mockDeep<PrismaClient>();
      const callOrder: string[] = [];
      txMock.accommodation.deleteMany.mockImplementation(async () => {
        callOrder.push("delete");
        return { count: 0 } as never;
      });
      txMock.accommodation.create.mockImplementation(async () => {
        callOrder.push("create");
        return makeDbAccommodation() as never;
      });
      prismaMock.$transaction.mockImplementation(async (fn) => {
        if (typeof fn === "function") {
          return fn(txMock as unknown as Parameters<Parameters<typeof db.$transaction>[0]>[0]);
        }
        return [];
      });

      await AccommodationService.saveAccommodations("user-1", "trip-1", [
        makeAccommodation(),
      ]);

      expect(callOrder).toEqual(["delete", "create"]);
    });
  });

  describe("getAccommodations", () => {
    it("rejects when trip not found (BOLA check)", async () => {
      prismaMock.trip.findFirst.mockResolvedValue(null);

      await expect(
        AccommodationService.getAccommodations("user-1", "trip-1")
      ).rejects.toThrow("Trip not found or unauthorized");
    });

    it("calls decrypt for accommodations with bookingCodeEnc", async () => {
      prismaMock.trip.findFirst.mockResolvedValue({ id: "trip-1" } as never);
      prismaMock.accommodation.findMany.mockResolvedValue([
        makeDbAccommodation({ bookingCodeEnc: "enc_HOTEL-456" }),
      ] as never);

      const result = await AccommodationService.getAccommodations("user-1", "trip-1");

      expect(mockDecrypt).toHaveBeenCalledWith("enc_HOTEL-456");
      expect(result[0].bookingCode).toBe("HOTEL-456");
      expect(result[0].bookingCodeEnc).toBeUndefined();
    });

    it("returns null bookingCode when bookingCodeEnc is null", async () => {
      prismaMock.trip.findFirst.mockResolvedValue({ id: "trip-1" } as never);
      prismaMock.accommodation.findMany.mockResolvedValue([
        makeDbAccommodation({ bookingCodeEnc: null }),
      ] as never);

      const result = await AccommodationService.getAccommodations("user-1", "trip-1");

      expect(mockDecrypt).not.toHaveBeenCalled();
      expect(result[0].bookingCode).toBeNull();
    });

    it("converts Decimal estimatedCost to number", async () => {
      prismaMock.trip.findFirst.mockResolvedValue({ id: "trip-1" } as never);
      prismaMock.accommodation.findMany.mockResolvedValue([
        makeDbAccommodation({ estimatedCost: Object.assign(Object.create(null), { valueOf: () => 150.75, toString: () => "150.75", toNumber: () => 150.75 }) }),
      ] as never);

      const result = await AccommodationService.getAccommodations("user-1", "trip-1");

      expect(result[0].estimatedCost).toBe(150.75);
    });
  });
});
