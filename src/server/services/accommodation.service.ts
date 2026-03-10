import "server-only";
import { db } from "@/server/db";
import { encrypt, decrypt } from "@/lib/crypto";
import type { AccommodationInput } from "@/lib/validations/transport.schema";
import { MAX_ACCOMMODATIONS } from "@/lib/validations/transport.schema";

// ─── Accommodation Service ────────────────────────────────────────────────────

export class AccommodationService {
  /**
   * Save accommodations for a trip. BOLA check: verifies trip belongs to user.
   * Replaces all existing accommodations (upsert pattern).
   */
  static async saveAccommodations(
    userId: string,
    tripId: string,
    accommodations: AccommodationInput[]
  ) {
    // 1. BOLA check
    const trip = await db.trip.findFirst({
      where: { id: tripId, userId, deletedAt: null },
      select: { id: true },
    });
    if (!trip) throw new Error("Trip not found or unauthorized");

    // 2. Enforce max accommodations
    if (accommodations.length > MAX_ACCOMMODATIONS) {
      throw new Error(
        `Maximum ${MAX_ACCOMMODATIONS} accommodations allowed`
      );
    }

    // 3. Delete existing + create new in transaction
    return db.$transaction(async (tx) => {
      await tx.accommodation.deleteMany({ where: { tripId } });

      const created = await Promise.all(
        accommodations.map((acc, index) =>
          tx.accommodation.create({
            data: {
              tripId,
              orderIndex: acc.orderIndex ?? index,
              accommodationType: acc.accommodationType,
              name: acc.name ?? null,
              address: acc.address ?? null,
              bookingCodeEnc: acc.bookingCode ? encrypt(acc.bookingCode) : null,
              checkIn: acc.checkIn ?? null,
              checkOut: acc.checkOut ?? null,
              estimatedCost: acc.estimatedCost ?? null,
              currency: acc.currency ?? null,
              notes: acc.notes ?? null,
            },
          })
        )
      );
      return created;
    });
  }

  /**
   * Get accommodations for a trip with decrypted booking codes.
   */
  static async getAccommodations(userId: string, tripId: string) {
    const trip = await db.trip.findFirst({
      where: { id: tripId, userId, deletedAt: null },
      select: { id: true },
    });
    if (!trip) throw new Error("Trip not found or unauthorized");

    const accommodations = await db.accommodation.findMany({
      where: { tripId },
      orderBy: { orderIndex: "asc" },
    });

    return accommodations.map((acc) => ({
      ...acc,
      bookingCode: acc.bookingCodeEnc ? decrypt(acc.bookingCodeEnc) : null,
      bookingCodeEnc: undefined, // never expose encrypted value
      estimatedCost: acc.estimatedCost ? Number(acc.estimatedCost) : null,
    }));
  }
}
