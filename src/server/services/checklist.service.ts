import "server-only";
import { db } from "@/server/db/client";
import type { ChecklistCategory as AiChecklistCategory } from "@/types/ai.types";
import type { ChecklistCategory as DbChecklistCategory } from "@/generated/prisma/client";

// ── Authorization ──────────────────────────────────────────────────────────

async function assertOwnership(tripId: string, userId: string): Promise<void> {
  const trip = await db.trip.findUnique({
    where: { id: tripId, userId, deletedAt: null },
    select: { id: true },
  });
  if (!trip) {
    const error = new Error("Trip not found or not authorized");
    (error as NodeJS.ErrnoException).code = "FORBIDDEN";
    throw error;
  }
}

// ── Save a full AI-generated checklist ────────────────────────────────────
// Deletes existing ChecklistItems for the trip, then creates new ones in a transaction.
// ChecklistCategory IDs are already aligned between AI output and DB enum.

export async function saveChecklist(
  tripId: string,
  userId: string,
  categories: AiChecklistCategory[],
): Promise<void> {
  await assertOwnership(tripId, userId);

  await db.$transaction(async (tx) => {
    // Soft-delete all existing items
    await tx.checklistItem.deleteMany({ where: { tripId } });

    // Build flat list of items with orderIndex
    const itemsToCreate: Array<{
      tripId: string;
      category: DbChecklistCategory;
      text: string;
      isAiGenerated: boolean;
      orderIndex: number;
    }> = [];

    let globalIndex = 0;
    for (const cat of categories) {
      for (const item of cat.items) {
        itemsToCreate.push({
          tripId,
          category: cat.id as DbChecklistCategory,
          text: item.text,
          isAiGenerated: true,
          orderIndex: globalIndex++,
        });
      }
    }

    if (itemsToCreate.length > 0) {
      await tx.checklistItem.createMany({ data: itemsToCreate });
    }
  });
}

// ── Get saved checklist ────────────────────────────────────────────────────
// Returns null if no ChecklistItem rows exist for this trip.

export async function getChecklist(
  tripId: string,
  userId: string,
): Promise<AiChecklistCategory[] | null> {
  await assertOwnership(tripId, userId);

  const items = await db.checklistItem.findMany({
    where: { tripId, deletedAt: null },
    orderBy: [{ category: "asc" }, { orderIndex: "asc" }],
    select: {
      id: true,
      category: true,
      text: true,
      isChecked: true,
      orderIndex: true,
    },
  });

  if (items.length === 0) return null;

  // Group by category and map back to AI ChecklistCategory shape
  const categoryMap = new Map<string, AiChecklistCategory>();

  for (const item of items) {
    const catId = item.category as string;
    if (!categoryMap.has(catId)) {
      categoryMap.set(catId, { id: catId as AiChecklistCategory["id"], items: [] });
    }
    categoryMap.get(catId)!.items.push({
      text: item.text,
      required: false,
    });
  }

  return Array.from(categoryMap.values());
}

// ── Toggle item checked state ──────────────────────────────────────────────

export async function toggleChecklistItem(
  itemId: string,
  tripId: string,
  userId: string,
): Promise<void> {
  await assertOwnership(tripId, userId);

  const item = await db.checklistItem.findUnique({
    where: { id: itemId, deletedAt: null },
    select: { id: true, tripId: true, isChecked: true },
  });
  if (!item || item.tripId !== tripId) {
    const error = new Error("Checklist item not found or not authorized");
    (error as NodeJS.ErrnoException).code = "FORBIDDEN";
    throw error;
  }

  await db.checklistItem.update({
    where: { id: itemId },
    data: { isChecked: !item.isChecked },
  });
}

// ── Add item to category ───────────────────────────────────────────────────

export async function addChecklistItem(
  tripId: string,
  userId: string,
  category: string,
  text: string,
): Promise<void> {
  await assertOwnership(tripId, userId);

  // Determine next orderIndex for this category
  const lastItem = await db.checklistItem.findFirst({
    where: { tripId, category: category as DbChecklistCategory, deletedAt: null },
    orderBy: { orderIndex: "desc" },
    select: { orderIndex: true },
  });
  const nextIndex = lastItem ? lastItem.orderIndex + 1 : 0;

  await db.checklistItem.create({
    data: {
      tripId,
      category: category as DbChecklistCategory,
      text,
      isAiGenerated: false,
      orderIndex: nextIndex,
    },
  });
}

// ── Delete item (soft delete) ──────────────────────────────────────────────

export async function deleteChecklistItem(
  itemId: string,
  tripId: string,
  userId: string,
): Promise<void> {
  await assertOwnership(tripId, userId);

  const item = await db.checklistItem.findUnique({
    where: { id: itemId, deletedAt: null },
    select: { id: true, tripId: true },
  });
  if (!item || item.tripId !== tripId) {
    const error = new Error("Checklist item not found or not authorized");
    (error as NodeJS.ErrnoException).code = "FORBIDDEN";
    throw error;
  }

  await db.checklistItem.update({
    where: { id: itemId },
    data: { deletedAt: new Date() },
  });
}
