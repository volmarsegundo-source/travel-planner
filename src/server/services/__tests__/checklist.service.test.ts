import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks (vi.hoisted runs before vi.mock factories) ─────────────────

const { mockTrip, mockChecklistItem, mockTransaction } = vi.hoisted(() => {
  const mockTrip = { findUnique: vi.fn() };
  const mockChecklistItem = {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
  // Mock $transaction so it executes the callback synchronously
  const mockTransaction = vi.fn(async (callbackOrArray: unknown) => {
    if (typeof callbackOrArray === "function") {
      return callbackOrArray({ checklistItem: mockChecklistItem });
    }
    const results = [];
    for (const p of callbackOrArray as Array<Promise<unknown>>) {
      results.push(await p);
    }
    return results;
  });
  return { mockTrip, mockChecklistItem, mockTransaction };
});

vi.mock("@/server/db/client", () => ({
  db: {
    trip: mockTrip,
    checklistItem: mockChecklistItem,
    $transaction: mockTransaction,
  },
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import {
  saveChecklist,
  getChecklist,
  toggleChecklistItem,
  addChecklistItem,
  deleteChecklistItem,
} from "../checklist.service";
import type { ChecklistCategory } from "@/types/ai.types";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const USER_ID = "user-abc";
const TRIP_ID = "trip-123";
const ITEM_ID = "item-456";

const CATEGORIES_FIXTURE: ChecklistCategory[] = [
  {
    id: "DOCUMENTS",
    items: [
      { text: "Passaporte", required: true },
      { text: "Seguro viagem", required: false },
    ],
  },
  {
    id: "HEALTH",
    items: [{ text: "Remédios", required: true }],
  },
];

// ── saveChecklist ─────────────────────────────────────────────────────────────

describe("saveChecklist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTrip.findUnique.mockResolvedValue({ id: TRIP_ID });
    mockChecklistItem.deleteMany.mockResolvedValue({ count: 0 });
    mockChecklistItem.createMany.mockResolvedValue({ count: 3 });
  });

  it("throws FORBIDDEN when user does not own the trip", async () => {
    mockTrip.findUnique.mockResolvedValue(null);

    await expect(saveChecklist(TRIP_ID, USER_ID, CATEGORIES_FIXTURE)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("deletes existing items before creating new ones (inside transaction)", async () => {
    await saveChecklist(TRIP_ID, USER_ID, CATEGORIES_FIXTURE);

    expect(mockChecklistItem.deleteMany).toHaveBeenCalledWith({ where: { tripId: TRIP_ID } });
  });

  it("creates one ChecklistItem row per item across all categories", async () => {
    await saveChecklist(TRIP_ID, USER_ID, CATEGORIES_FIXTURE);

    expect(mockChecklistItem.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ category: "DOCUMENTS", text: "Passaporte", isAiGenerated: true }),
          expect.objectContaining({ category: "DOCUMENTS", text: "Seguro viagem", isAiGenerated: true }),
          expect.objectContaining({ category: "HEALTH", text: "Remédios", isAiGenerated: true }),
        ]),
      }),
    );
  });

  it("assigns sequential orderIndex across all items", async () => {
    await saveChecklist(TRIP_ID, USER_ID, CATEGORIES_FIXTURE);

    const [callArgs] = mockChecklistItem.createMany.mock.calls as [{ data: Array<{ orderIndex: number }> }][];
    const indices = callArgs![0].data.map((d) => d.orderIndex);
    expect(indices).toEqual([0, 1, 2]);
  });

  it("uses the transaction wrapper for delete + create", async () => {
    await saveChecklist(TRIP_ID, USER_ID, CATEGORIES_FIXTURE);

    expect(mockTransaction).toHaveBeenCalled();
  });

  it("does not call createMany when categories have no items", async () => {
    await saveChecklist(TRIP_ID, USER_ID, []);

    expect(mockChecklistItem.createMany).not.toHaveBeenCalled();
  });
});

// ── getChecklist ──────────────────────────────────────────────────────────────

describe("getChecklist", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null when no items exist for the trip", async () => {
    mockTrip.findUnique.mockResolvedValue({ id: TRIP_ID });
    mockChecklistItem.findMany.mockResolvedValue([]);

    const result = await getChecklist(TRIP_ID, USER_ID);

    expect(result).toBeNull();
  });

  it("throws FORBIDDEN when user does not own the trip", async () => {
    mockTrip.findUnique.mockResolvedValue(null);

    await expect(getChecklist(TRIP_ID, "other-user")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("groups items by category and returns ChecklistCategory array", async () => {
    mockTrip.findUnique.mockResolvedValue({ id: TRIP_ID });
    mockChecklistItem.findMany.mockResolvedValue([
      { id: "i1", category: "DOCUMENTS", text: "Passaporte", isChecked: false, orderIndex: 0 },
      { id: "i2", category: "DOCUMENTS", text: "Seguro viagem", isChecked: true, orderIndex: 1 },
      { id: "i3", category: "HEALTH", text: "Remédios", isChecked: false, orderIndex: 2 },
    ]);

    const result = await getChecklist(TRIP_ID, USER_ID);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);

    const docsCategory = result!.find((c) => c.id === "DOCUMENTS");
    expect(docsCategory).toBeDefined();
    expect(docsCategory!.items).toHaveLength(2);

    const healthCategory = result!.find((c) => c.id === "HEALTH");
    expect(healthCategory).toBeDefined();
    expect(healthCategory!.items).toHaveLength(1);
  });

  it("maps category items to ChecklistItemData shape (text field present)", async () => {
    mockTrip.findUnique.mockResolvedValue({ id: TRIP_ID });
    mockChecklistItem.findMany.mockResolvedValue([
      { id: "i1", category: "CURRENCY", text: "Dólares em espécie", isChecked: false, orderIndex: 0 },
    ]);

    const result = await getChecklist(TRIP_ID, USER_ID);

    expect(result![0]!.items[0]!.text).toBe("Dólares em espécie");
  });

  it("queries with deletedAt: null filter (BOLA-safe)", async () => {
    mockTrip.findUnique.mockResolvedValue({ id: TRIP_ID });
    mockChecklistItem.findMany.mockResolvedValue([]);

    await getChecklist(TRIP_ID, USER_ID);

    expect(mockChecklistItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tripId: TRIP_ID, deletedAt: null }),
      }),
    );
  });
});

// ── toggleChecklistItem ───────────────────────────────────────────────────────

describe("toggleChecklistItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTrip.findUnique.mockResolvedValue({ id: TRIP_ID });
    mockChecklistItem.update.mockResolvedValue({});
  });

  it("throws FORBIDDEN when user does not own the trip", async () => {
    mockTrip.findUnique.mockResolvedValue(null);

    await expect(toggleChecklistItem(ITEM_ID, TRIP_ID, USER_ID)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("throws FORBIDDEN when item does not belong to the trip", async () => {
    mockChecklistItem.findUnique.mockResolvedValue({
      id: ITEM_ID,
      tripId: "other-trip",
      isChecked: false,
    });

    await expect(toggleChecklistItem(ITEM_ID, TRIP_ID, USER_ID)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("sets isChecked to true when item is currently unchecked", async () => {
    mockChecklistItem.findUnique.mockResolvedValue({
      id: ITEM_ID,
      tripId: TRIP_ID,
      isChecked: false,
    });

    await toggleChecklistItem(ITEM_ID, TRIP_ID, USER_ID);

    expect(mockChecklistItem.update).toHaveBeenCalledWith({
      where: { id: ITEM_ID },
      data: { isChecked: true },
    });
  });

  it("sets isChecked to false when item is currently checked", async () => {
    mockChecklistItem.findUnique.mockResolvedValue({
      id: ITEM_ID,
      tripId: TRIP_ID,
      isChecked: true,
    });

    await toggleChecklistItem(ITEM_ID, TRIP_ID, USER_ID);

    expect(mockChecklistItem.update).toHaveBeenCalledWith({
      where: { id: ITEM_ID },
      data: { isChecked: false },
    });
  });
});

// ── addChecklistItem ──────────────────────────────────────────────────────────

describe("addChecklistItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTrip.findUnique.mockResolvedValue({ id: TRIP_ID });
    mockChecklistItem.findFirst.mockResolvedValue(null);
    mockChecklistItem.create.mockResolvedValue({ id: "new-item" });
  });

  it("throws FORBIDDEN when user does not own the trip", async () => {
    mockTrip.findUnique.mockResolvedValue(null);

    await expect(
      addChecklistItem(TRIP_ID, USER_ID, "DOCUMENTS", "Passaporte"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("creates item with orderIndex 0 when no items in category yet", async () => {
    mockChecklistItem.findFirst.mockResolvedValue(null);

    await addChecklistItem(TRIP_ID, USER_ID, "DOCUMENTS", "Passaporte");

    expect(mockChecklistItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ orderIndex: 0, isAiGenerated: false }),
      }),
    );
  });

  it("creates item with orderIndex = lastIndex + 1 when items exist", async () => {
    mockChecklistItem.findFirst.mockResolvedValue({ orderIndex: 3 });

    await addChecklistItem(TRIP_ID, USER_ID, "HEALTH", "Remédios");

    expect(mockChecklistItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ orderIndex: 4 }),
      }),
    );
  });

  it("creates item with the correct category and text", async () => {
    await addChecklistItem(TRIP_ID, USER_ID, "CURRENCY", "Dólares");

    expect(mockChecklistItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          category: "CURRENCY",
          text: "Dólares",
          tripId: TRIP_ID,
        }),
      }),
    );
  });
});

// ── deleteChecklistItem ───────────────────────────────────────────────────────

describe("deleteChecklistItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTrip.findUnique.mockResolvedValue({ id: TRIP_ID });
    mockChecklistItem.findUnique.mockResolvedValue({ id: ITEM_ID, tripId: TRIP_ID });
    mockChecklistItem.update.mockResolvedValue({});
  });

  it("throws FORBIDDEN when user does not own the trip", async () => {
    mockTrip.findUnique.mockResolvedValue(null);

    await expect(deleteChecklistItem(ITEM_ID, TRIP_ID, USER_ID)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("throws FORBIDDEN when item does not belong to the trip", async () => {
    mockChecklistItem.findUnique.mockResolvedValue({ id: ITEM_ID, tripId: "other-trip" });

    await expect(deleteChecklistItem(ITEM_ID, TRIP_ID, USER_ID)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("soft-deletes the item by setting deletedAt", async () => {
    await deleteChecklistItem(ITEM_ID, TRIP_ID, USER_ID);

    expect(mockChecklistItem.update).toHaveBeenCalledWith({
      where: { id: ITEM_ID },
      data: { deletedAt: expect.any(Date) },
    });
  });
});
