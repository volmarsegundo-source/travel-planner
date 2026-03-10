"use server";
import "server-only";
import { auth } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";
import { TransportService } from "@/server/services/transport.service";
import { AccommodationService } from "@/server/services/accommodation.service";
import {
  TransportSegmentSchema,
  AccommodationSchema,
  LocalMobilitySchema,
} from "@/lib/validations/transport.schema";
import type { ActionResult } from "@/types/trip.types";
import { db } from "@/server/db";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { hashUserId } from "@/lib/hash";

// ─── Transport Segments ─────────────────────────────────────────────────────

export async function saveTransportSegmentsAction(
  tripId: string,
  segments: unknown[]
): Promise<ActionResult<{ count: number }>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const parsed = z.array(TransportSegmentSchema).safeParse(segments);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Invalid transport data",
    };
  }

  try {
    const result = await TransportService.saveSegments(
      session.user.id,
      tripId,
      parsed.data
    );
    return { success: true, data: { count: result.length } };
  } catch (error) {
    logger.error("transport.save.error", error, {
      userId: hashUserId(session.user.id),
    });
    return { success: false, error: "Failed to save transport segments" };
  }
}

export async function getTransportSegmentsAction(
  tripId: string
): Promise<ActionResult<{ segments: unknown[] }>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  try {
    const segments = await TransportService.getSegments(
      session.user.id,
      tripId
    );
    return { success: true, data: { segments } };
  } catch (error) {
    logger.error("transport.get.error", error, {
      userId: hashUserId(session.user.id),
    });
    return { success: false, error: "Failed to load transport segments" };
  }
}

// ─── Accommodations ─────────────────────────────────────────────────────────

export async function saveAccommodationsAction(
  tripId: string,
  accommodations: unknown[]
): Promise<ActionResult<{ count: number }>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const parsed = z.array(AccommodationSchema).safeParse(accommodations);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Invalid accommodation data",
    };
  }

  try {
    const result = await AccommodationService.saveAccommodations(
      session.user.id,
      tripId,
      parsed.data
    );
    return { success: true, data: { count: result.length } };
  } catch (error) {
    logger.error("accommodation.save.error", error, {
      userId: hashUserId(session.user.id),
    });
    return { success: false, error: "Failed to save accommodations" };
  }
}

export async function getAccommodationsAction(
  tripId: string
): Promise<ActionResult<{ accommodations: unknown[] }>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  try {
    const accommodations = await AccommodationService.getAccommodations(
      session.user.id,
      tripId
    );
    return { success: true, data: { accommodations } };
  } catch (error) {
    logger.error("accommodation.get.error", error, {
      userId: hashUserId(session.user.id),
    });
    return { success: false, error: "Failed to load accommodations" };
  }
}

// ─── Local Mobility ─────────────────────────────────────────────────────────

export async function saveLocalMobilityAction(
  tripId: string,
  mobility: unknown
): Promise<ActionResult<{ saved: boolean }>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const parsed = LocalMobilitySchema.safeParse(mobility);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Invalid mobility data",
    };
  }

  try {
    // BOLA check + save mobility to phase metadata
    const trip = await db.trip.findFirst({
      where: { id: tripId, userId: session.user.id, deletedAt: null },
    });
    if (!trip) {
      return { success: false, error: "Trip not found or unauthorized" };
    }

    const phase = await db.expeditionPhase.findUnique({
      where: { tripId_phaseNumber: { tripId, phaseNumber: 4 } },
    });
    if (!phase) {
      return { success: false, error: "Phase not found" };
    }

    const existingMeta = (phase.metadata as Record<string, unknown>) ?? {};
    await db.expeditionPhase.update({
      where: { id: phase.id },
      data: {
        metadata: {
          ...existingMeta,
          localMobility: parsed.data,
        },
      },
    });

    return { success: true, data: { saved: true } };
  } catch (error) {
    logger.error("mobility.save.error", error, {
      userId: hashUserId(session.user.id),
    });
    return { success: false, error: "Failed to save mobility preferences" };
  }
}

export async function getLocalMobilityAction(
  tripId: string
): Promise<ActionResult<{ mobility: string[] }>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  try {
    const trip = await db.trip.findFirst({
      where: { id: tripId, userId: session.user.id, deletedAt: null },
    });
    if (!trip) {
      return { success: false, error: "Trip not found or unauthorized" };
    }

    const phase = await db.expeditionPhase.findUnique({
      where: { tripId_phaseNumber: { tripId, phaseNumber: 4 } },
    });

    const meta = (phase?.metadata as Record<string, unknown>) ?? {};
    const mobility = Array.isArray(meta.localMobility)
      ? (meta.localMobility as string[])
      : [];

    return { success: true, data: { mobility } };
  } catch (error) {
    logger.error("mobility.get.error", error, {
      userId: hashUserId(session.user.id),
    });
    return { success: false, error: "Failed to load mobility preferences" };
  }
}
