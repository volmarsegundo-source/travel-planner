import "server-only";
import { db } from "@/server/db";
import { encrypt, decrypt } from "@/lib/crypto";
import type { TransportSegmentInput } from "@/lib/validations/transport.schema";
import { MAX_TRANSPORT_SEGMENTS } from "@/lib/validations/transport.schema";

// ─── Transport Service ────────────────────────────────────────────────────────

export class TransportService {
  /**
   * Save transport segments for a trip. BOLA check: verifies trip belongs to user.
   * Replaces all existing segments (upsert pattern).
   */
  static async saveSegments(
    userId: string,
    tripId: string,
    segments: TransportSegmentInput[]
  ) {
    // 1. BOLA check
    const trip = await db.trip.findFirst({
      where: { id: tripId, userId, deletedAt: null },
    });
    if (!trip) throw new Error("Trip not found or unauthorized");

    // 2. Enforce max segments
    if (segments.length > MAX_TRANSPORT_SEGMENTS) {
      throw new Error(
        `Maximum ${MAX_TRANSPORT_SEGMENTS} transport segments allowed`
      );
    }

    // 3. Delete existing + create new in transaction
    return db.$transaction(async (tx) => {
      await tx.transportSegment.deleteMany({ where: { tripId } });

      const created = await Promise.all(
        segments.map((seg, index) =>
          tx.transportSegment.create({
            data: {
              tripId,
              segmentOrder: seg.segmentOrder ?? index,
              transportType: seg.transportType,
              departurePlace: seg.departurePlace ?? null,
              arrivalPlace: seg.arrivalPlace ?? null,
              departureAt: seg.departureAt ?? null,
              arrivalAt: seg.arrivalAt ?? null,
              provider: seg.provider ?? null,
              bookingCodeEnc: seg.bookingCode ? encrypt(seg.bookingCode) : null,
              estimatedCost: seg.estimatedCost ?? null,
              currency: seg.currency ?? null,
              notes: seg.notes ?? null,
              isReturn: seg.isReturn ?? false,
            },
          })
        )
      );
      return created;
    });
  }

  /**
   * Get transport segments for a trip with decrypted booking codes.
   */
  static async getSegments(userId: string, tripId: string) {
    const trip = await db.trip.findFirst({
      where: { id: tripId, userId, deletedAt: null },
    });
    if (!trip) throw new Error("Trip not found or unauthorized");

    const segments = await db.transportSegment.findMany({
      where: { tripId },
      orderBy: { segmentOrder: "asc" },
    });

    return segments.map((seg) => ({
      ...seg,
      bookingCode: seg.bookingCodeEnc ? decrypt(seg.bookingCodeEnc) : null,
      bookingCodeEnc: undefined, // never expose encrypted value
      estimatedCost: seg.estimatedCost
        ? typeof (seg.estimatedCost as unknown as { toNumber?: () => number }).toNumber === "function"
          ? (seg.estimatedCost as unknown as { toNumber: () => number }).toNumber()
          : Number(seg.estimatedCost)
        : null,
    }));
  }
}
