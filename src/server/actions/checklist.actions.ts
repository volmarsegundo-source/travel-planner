"use server";
import "server-only";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { UnauthorizedError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { mapErrorToKey } from "@/lib/action-utils";
import type { ActionResult } from "@/types/trip.types";
import type { ChecklistCategory } from "@/types/ai.types";

// ─── Validation ──────────────────────────────────────────────────────────────

const ItemIdSchema = z.string().cuid();
const TripIdSchema = z.string().cuid();

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChecklistItem {
  id: string;
  tripId: string;
  category: string;
  label: string;
  checked: boolean;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function verifyTripOwnership(
  tripId: string,
  userId: string
): Promise<boolean> {
  const trip = await db.trip.findFirst({
    where: { id: tripId, userId, deletedAt: null },
    select: { id: true },
  });
  return trip !== null;
}

// ─── toggleChecklistItemAction ────────────────────────────────────────────────

export async function toggleChecklistItemAction(
  itemId: string,
  tripId: string
): Promise<ActionResult<ChecklistItem>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const itemIdParsed = ItemIdSchema.safeParse(itemId);
  const tripIdParsed = TripIdSchema.safeParse(tripId);
  if (!itemIdParsed.success || !tripIdParsed.success) {
    return { success: false, error: "errors.validation" };
  }

  // BOLA check: verify trip belongs to the user
  const owned = await verifyTripOwnership(tripIdParsed.data, session.user.id);
  if (!owned) {
    return { success: false, error: "trips.errors.notFound" };
  }

  // Verify item belongs to the trip (BOLA)
  const item = await db.checklistItem.findFirst({
    where: { id: itemIdParsed.data, tripId: tripIdParsed.data },
  });
  if (!item) {
    return { success: false, error: "trips.errors.notFound" };
  }

  try {
    const updated = await db.checklistItem.update({
      where: { id: itemIdParsed.data },
      data: { checked: !item.checked },
    });

    revalidatePath(`/trips/${tripIdParsed.data}/checklist`);
    return { success: true, data: updated };
  } catch (error) {
    logger.error("checklist.toggleChecklistItemAction.error", error, {
      userId: session.user.id,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── addChecklistItemAction ───────────────────────────────────────────────────

export async function addChecklistItemAction(
  tripId: string,
  category: ChecklistCategory,
  label: string
): Promise<ActionResult<ChecklistItem>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const tripIdParsed = TripIdSchema.safeParse(tripId);
  if (!tripIdParsed.success) {
    return { success: false, error: "errors.validation" };
  }

  try {
    z.string().min(1).max(200).parse(label.trim());
  } catch {
    return { success: false, error: "errors.validation" };
  }

  // BOLA check
  const owned = await verifyTripOwnership(tripIdParsed.data, session.user.id);
  if (!owned) {
    return { success: false, error: "trips.errors.notFound" };
  }

  try {
    // Get next orderIndex within this category
    const maxOrder = await db.checklistItem.aggregate({
      where: { tripId: tripIdParsed.data, category },
      _max: { orderIndex: true },
    });
    const nextIndex = (maxOrder._max.orderIndex ?? -1) + 1;

    const item = await db.checklistItem.create({
      data: {
        tripId: tripIdParsed.data,
        category,
        label: label.trim(),
        checked: false,
        orderIndex: nextIndex,
      },
    });

    revalidatePath(`/trips/${tripIdParsed.data}/checklist`);
    return { success: true, data: item };
  } catch (error) {
    logger.error("checklist.addChecklistItemAction.error", error, {
      userId: session.user.id,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── deleteChecklistItemAction ────────────────────────────────────────────────

export async function deleteChecklistItemAction(
  itemId: string,
  tripId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const itemIdParsed = ItemIdSchema.safeParse(itemId);
  const tripIdParsed = TripIdSchema.safeParse(tripId);
  if (!itemIdParsed.success || !tripIdParsed.success) {
    return { success: false, error: "errors.validation" };
  }

  // BOLA check: verify trip belongs to the user
  const owned = await verifyTripOwnership(tripIdParsed.data, session.user.id);
  if (!owned) {
    return { success: false, error: "trips.errors.notFound" };
  }

  // Verify item belongs to the trip (BOLA)
  const item = await db.checklistItem.findFirst({
    where: { id: itemIdParsed.data, tripId: tripIdParsed.data },
    select: { id: true },
  });
  if (!item) {
    return { success: false, error: "trips.errors.notFound" };
  }

  try {
    await db.checklistItem.delete({ where: { id: itemIdParsed.data } });
    revalidatePath(`/trips/${tripIdParsed.data}/checklist`);
    return { success: true };
  } catch (error) {
    logger.error("checklist.deleteChecklistItemAction.error", error, {
      userId: session.user.id,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}
