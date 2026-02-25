"use server";

import { auth } from "@/lib/auth";
import {
  saveChecklist as serviceSaveChecklist,
  getChecklist as serviceGetChecklist,
  toggleChecklistItem as serviceToggleChecklistItem,
  addChecklistItem as serviceAddChecklistItem,
  deleteChecklistItem as serviceDeleteChecklistItem,
} from "@/server/services/checklist.service";
import type { ChecklistCategory } from "@/types/ai.types";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

function handleError(error: unknown): ActionResult {
  const err = error as NodeJS.ErrnoException;
  if (err.code === "FORBIDDEN")
    return { success: false, error: "Acesso negado.", code: "FORBIDDEN" };
  if (err.code === "NOT_FOUND")
    return { success: false, error: "Item não encontrado.", code: "NOT_FOUND" };
  console.error("[checklist.actions] Unexpected error:", err.message);
  return { success: false, error: "Erro interno. Tente novamente." };
}

// ── Save full AI-generated checklist ──────────────────────────────────────

export async function saveChecklist(
  tripId: string,
  categories: ChecklistCategory[],
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id)
    return { success: false, error: "Não autorizado.", code: "UNAUTHORIZED" };

  try {
    await serviceSaveChecklist(tripId, session.user.id, categories);
    return { success: true, data: undefined };
  } catch (error) {
    return handleError(error);
  }
}

// ── Get saved checklist ────────────────────────────────────────────────────

export async function getChecklist(
  tripId: string,
): Promise<ActionResult<ChecklistCategory[] | null>> {
  const session = await auth();
  if (!session?.user?.id)
    return { success: false, error: "Não autorizado.", code: "UNAUTHORIZED" };

  try {
    const data = await serviceGetChecklist(tripId, session.user.id);
    return { success: true, data };
  } catch (error) {
    return handleError(error) as ActionResult<ChecklistCategory[] | null>;
  }
}

// ── Toggle item checked state ──────────────────────────────────────────────

export async function toggleChecklistItem(
  itemId: string,
  tripId: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id)
    return { success: false, error: "Não autorizado.", code: "UNAUTHORIZED" };

  try {
    await serviceToggleChecklistItem(itemId, tripId, session.user.id);
    return { success: true, data: undefined };
  } catch (error) {
    return handleError(error);
  }
}

// ── Add item to category ───────────────────────────────────────────────────

export async function addChecklistItem(
  tripId: string,
  category: string,
  text: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id)
    return { success: false, error: "Não autorizado.", code: "UNAUTHORIZED" };

  try {
    await serviceAddChecklistItem(tripId, session.user.id, category, text);
    return { success: true, data: undefined };
  } catch (error) {
    return handleError(error);
  }
}

// ── Delete item ────────────────────────────────────────────────────────────

export async function deleteChecklistItem(
  itemId: string,
  tripId: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id)
    return { success: false, error: "Não autorizado.", code: "UNAUTHORIZED" };

  try {
    await serviceDeleteChecklistItem(itemId, tripId, session.user.id);
    return { success: true, data: undefined };
  } catch (error) {
    return handleError(error);
  }
}
