"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { UnauthorizedError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/trip.types";
import type { ChecklistCategory } from "@/types/ai.types";

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

function mapErrorToKey(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "errors.generic";
}

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

  // BOLA check: verify trip belongs to the user
  const owned = await verifyTripOwnership(tripId, session.user.id);
  if (!owned) {
    return { success: false, error: "trips.errors.notFound" };
  }

  // Verify item belongs to the trip (BOLA)
  const item = await db.checklistItem.findFirst({
    where: { id: itemId, tripId },
  });
  if (!item) {
    return { success: false, error: "trips.errors.notFound" };
  }

  try {
    const updated = await db.checklistItem.update({
      where: { id: itemId },
      data: { checked: !item.checked },
    });

    revalidatePath(`/trips/${tripId}/checklist`);
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

  if (!label.trim()) {
    return { success: false, error: "errors.generic" };
  }

  // BOLA check
  const owned = await verifyTripOwnership(tripId, session.user.id);
  if (!owned) {
    return { success: false, error: "trips.errors.notFound" };
  }

  try {
    // Get next orderIndex within this category
    const maxOrder = await db.checklistItem.aggregate({
      where: { tripId, category },
      _max: { orderIndex: true },
    });
    const nextIndex = (maxOrder._max.orderIndex ?? -1) + 1;

    const item = await db.checklistItem.create({
      data: {
        tripId,
        category,
        label: label.trim(),
        checked: false,
        orderIndex: nextIndex,
      },
    });

    revalidatePath(`/trips/${tripId}/checklist`);
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

  // BOLA check: verify trip belongs to the user
  const owned = await verifyTripOwnership(tripId, session.user.id);
  if (!owned) {
    return { success: false, error: "trips.errors.notFound" };
  }

  // Verify item belongs to the trip (BOLA)
  const item = await db.checklistItem.findFirst({
    where: { id: itemId, tripId },
    select: { id: true },
  });
  if (!item) {
    return { success: false, error: "trips.errors.notFound" };
  }

  try {
    await db.checklistItem.delete({ where: { id: itemId } });
    revalidatePath(`/trips/${tripId}/checklist`);
    return { success: true };
  } catch (error) {
    logger.error("checklist.deleteChecklistItemAction.error", error, {
      userId: session.user.id,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}
