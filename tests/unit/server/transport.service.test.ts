/**
 * Unit tests for TransportService (T-S21-005).
 *
 * Tests cover: BOLA rejection, max segments enforcement,
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

import { TransportService } from "@/server/services/transport.service";
import { db } from "@/server/db";
import { MAX_TRANSPORT_SEGMENTS } from "@/lib/validations/transport.schema";
import type { TransportSegmentInput } from "@/lib/validations/transport.schema";

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSegment(
  overrides: Partial<TransportSegmentInput> = {}
): TransportSegmentInput {
  return {
    transportType: "flight",
    segmentOrder: 0,
    isReturn: false,
    ...overrides,
  };
}

function makeDbSegment(overrides: Record<string, unknown> = {}) {
  return {
    id: "seg-1",
    tripId: "trip-1",
    segmentOrder: 0,
    transportType: "flight",
    departurePlace: null,
    arrivalPlace: null,
    departureAt: null,
    arrivalAt: null,
    provider: null,
    bookingCodeEnc: null,
    estimatedCost: null,
    currency: null,
    notes: null,
    isReturn: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("TransportService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("saveSegments", () => {
    it("rejects when trip not found (BOLA check)", async () => {
      prismaMock.trip.findFirst.mockResolvedValue(null);

      await expect(
        TransportService.saveSegments("user-1", "trip-1", [makeSegment()])
      ).rejects.toThrow("Trip not found or unauthorized");
    });

    it("rejects when segments exceed max limit", async () => {
      prismaMock.trip.findFirst.mockResolvedValue({ id: "trip-1" } as never);

      const segments = Array.from(
        { length: MAX_TRANSPORT_SEGMENTS + 1 },
        (_, i) => makeSegment({ segmentOrder: i })
      );

      await expect(
        TransportService.saveSegments("user-1", "trip-1", segments)
      ).rejects.toThrow(`Maximum ${MAX_TRANSPORT_SEGMENTS} transport segments allowed`);
    });

    it("calls encrypt for bookingCode when provided", async () => {
      prismaMock.trip.findFirst.mockResolvedValue({ id: "trip-1" } as never);

      const txMock = mockDeep<PrismaClient>();
      txMock.transportSegment.create.mockResolvedValue(makeDbSegment() as never);
      txMock.transportSegment.deleteMany.mockResolvedValue({ count: 0 } as never);
      prismaMock.$transaction.mockImplementation(async (fn) => {
        if (typeof fn === "function") {
          return fn(txMock as unknown as Parameters<Parameters<typeof db.$transaction>[0]>[0]);
        }
        return [];
      });

      await TransportService.saveSegments("user-1", "trip-1", [
        makeSegment({ bookingCode: "ABC123" }),
      ]);

      expect(mockEncrypt).toHaveBeenCalledWith("ABC123");
    });

    it("passes null for bookingCodeEnc when bookingCode is null", async () => {
      prismaMock.trip.findFirst.mockResolvedValue({ id: "trip-1" } as never);

      const txMock = mockDeep<PrismaClient>();
      txMock.transportSegment.create.mockResolvedValue(makeDbSegment() as never);
      txMock.transportSegment.deleteMany.mockResolvedValue({ count: 0 } as never);
      prismaMock.$transaction.mockImplementation(async (fn) => {
        if (typeof fn === "function") {
          return fn(txMock as unknown as Parameters<Parameters<typeof db.$transaction>[0]>[0]);
        }
        return [];
      });

      await TransportService.saveSegments("user-1", "trip-1", [
        makeSegment({ bookingCode: null }),
      ]);

      expect(mockEncrypt).not.toHaveBeenCalled();
      expect(txMock.transportSegment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ bookingCodeEnc: null }),
        })
      );
    });

    it("deletes existing segments before creating new ones", async () => {
      prismaMock.trip.findFirst.mockResolvedValue({ id: "trip-1" } as never);

      const txMock = mockDeep<PrismaClient>();
      const callOrder: string[] = [];
      txMock.transportSegment.deleteMany.mockImplementation(async () => {
        callOrder.push("delete");
        return { count: 0 } as never;
      });
      txMock.transportSegment.create.mockImplementation(async () => {
        callOrder.push("create");
        return makeDbSegment() as never;
      });
      prismaMock.$transaction.mockImplementation(async (fn) => {
        if (typeof fn === "function") {
          return fn(txMock as unknown as Parameters<Parameters<typeof db.$transaction>[0]>[0]);
        }
        return [];
      });

      await TransportService.saveSegments("user-1", "trip-1", [makeSegment()]);

      expect(callOrder).toEqual(["delete", "create"]);
    });

    it("creates multiple segments with correct order", async () => {
      prismaMock.trip.findFirst.mockResolvedValue({ id: "trip-1" } as never);

      const txMock = mockDeep<PrismaClient>();
      txMock.transportSegment.deleteMany.mockResolvedValue({ count: 0 } as never);
      txMock.transportSegment.create.mockResolvedValue(makeDbSegment() as never);
      prismaMock.$transaction.mockImplementation(async (fn) => {
        if (typeof fn === "function") {
          return fn(txMock as unknown as Parameters<Parameters<typeof db.$transaction>[0]>[0]);
        }
        return [];
      });

      await TransportService.saveSegments("user-1", "trip-1", [
        makeSegment({ transportType: "flight", segmentOrder: 0 }),
        makeSegment({ transportType: "bus", segmentOrder: 1 }),
      ]);

      expect(txMock.transportSegment.create).toHaveBeenCalledTimes(2);
    });
  });

  describe("getSegments", () => {
    it("rejects when trip not found (BOLA check)", async () => {
      prismaMock.trip.findFirst.mockResolvedValue(null);

      await expect(
        TransportService.getSegments("user-1", "trip-1")
      ).rejects.toThrow("Trip not found or unauthorized");
    });

    it("calls decrypt for segments with bookingCodeEnc", async () => {
      prismaMock.trip.findFirst.mockResolvedValue({ id: "trip-1" } as never);
      prismaMock.transportSegment.findMany.mockResolvedValue([
        makeDbSegment({ bookingCodeEnc: "enc_ABC123" }),
      ] as never);

      const result = await TransportService.getSegments("user-1", "trip-1");

      expect(mockDecrypt).toHaveBeenCalledWith("enc_ABC123");
      expect(result[0].bookingCode).toBe("ABC123");
      expect(result[0].bookingCodeEnc).toBeUndefined();
    });

    it("returns null bookingCode when bookingCodeEnc is null", async () => {
      prismaMock.trip.findFirst.mockResolvedValue({ id: "trip-1" } as never);
      prismaMock.transportSegment.findMany.mockResolvedValue([
        makeDbSegment({ bookingCodeEnc: null }),
      ] as never);

      const result = await TransportService.getSegments("user-1", "trip-1");

      expect(mockDecrypt).not.toHaveBeenCalled();
      expect(result[0].bookingCode).toBeNull();
    });

    it("converts Decimal estimatedCost to number", async () => {
      prismaMock.trip.findFirst.mockResolvedValue({ id: "trip-1" } as never);
      prismaMock.transportSegment.findMany.mockResolvedValue([
        makeDbSegment({ estimatedCost: { toNumber: () => 250.5 } }),
      ] as never);

      const result = await TransportService.getSegments("user-1", "trip-1");

      expect(result[0].estimatedCost).toBe(250.5);
    });
  });
});
