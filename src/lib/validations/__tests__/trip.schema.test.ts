import { describe, it, expect } from "vitest";
import { TripCreateSchema, TripUpdateSchema, TripDeleteSchema } from "../trip.schema";

describe("TripCreateSchema", () => {
  const valid = {
    title: "Férias em Roma",
    destinationName: "Roma, Itália",
    travelers: 2,
  };

  it("accepts a valid minimal input", () => {
    const result = TripCreateSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("applies defaults: travelers=1, budgetCurrency=BRL, coverGradient=sunset", () => {
    const result = TripCreateSchema.safeParse({
      title: "T",
      destinationName: "D",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.travelers).toBe(1);
      expect(result.data.budgetCurrency).toBe("BRL");
      expect(result.data.coverGradient).toBe("sunset");
    }
  });

  it("rejects when title is missing", () => {
    const result = TripCreateSchema.safeParse({ destinationName: "Somewhere" });
    expect(result.success).toBe(false);
  });

  it("rejects when title is empty string", () => {
    const result = TripCreateSchema.safeParse({ ...valid, title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects when destinationName is missing", () => {
    const result = TripCreateSchema.safeParse({ title: "Trip" });
    expect(result.success).toBe(false);
  });

  it("rejects travelers < 1", () => {
    const result = TripCreateSchema.safeParse({ ...valid, travelers: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects travelers > 50", () => {
    const result = TripCreateSchema.safeParse({ ...valid, travelers: 51 });
    expect(result.success).toBe(false);
  });

  it("rejects invalid coverGradient", () => {
    const result = TripCreateSchema.safeParse({
      ...valid,
      coverGradient: "rainbow",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid cover gradients", () => {
    const gradients = ["sunset", "ocean", "forest", "desert", "aurora", "city", "sakura", "alpine"];
    for (const g of gradients) {
      const r = TripCreateSchema.safeParse({ ...valid, coverGradient: g });
      expect(r.success, `gradient '${g}' should be valid`).toBe(true);
    }
  });

  it("rejects endDate before startDate", () => {
    const result = TripCreateSchema.safeParse({
      ...valid,
      startDate: "2025-07-10",
      endDate: "2025-07-01",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues[0]?.message;
      expect(msg).toContain("Data de volta");
    }
  });

  it("accepts endDate equal to startDate", () => {
    const result = TripCreateSchema.safeParse({
      ...valid,
      startDate: "2025-07-01",
      endDate: "2025-07-01",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid travelStyle", () => {
    const result = TripCreateSchema.safeParse({
      ...valid,
      travelStyle: "PARTYING",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid travelStyles", () => {
    const styles = ["ADVENTURE", "CULTURE", "RELAXATION", "GASTRONOMY"];
    for (const s of styles) {
      const r = TripCreateSchema.safeParse({ ...valid, travelStyle: s });
      expect(r.success, `style '${s}' should be valid`).toBe(true);
    }
  });
});

describe("TripUpdateSchema", () => {
  it("accepts empty object (all fields optional)", () => {
    const result = TripUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts partial update with just title", () => {
    const result = TripUpdateSchema.safeParse({ title: "New Name" });
    expect(result.success).toBe(true);
  });

  it("accepts valid status values", () => {
    const statuses = ["PLANNING", "ACTIVE", "COMPLETED", "ARCHIVED"];
    for (const s of statuses) {
      const r = TripUpdateSchema.safeParse({ status: s });
      expect(r.success, `status '${s}' should be valid`).toBe(true);
    }
  });

  it("rejects invalid status", () => {
    const result = TripUpdateSchema.safeParse({ status: "DELETED" });
    expect(result.success).toBe(false);
  });
});

describe("TripDeleteSchema", () => {
  it("accepts a non-empty confirmTitle", () => {
    const result = TripDeleteSchema.safeParse({ confirmTitle: "My Trip" });
    expect(result.success).toBe(true);
  });

  it("rejects empty confirmTitle", () => {
    const result = TripDeleteSchema.safeParse({ confirmTitle: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing confirmTitle", () => {
    const result = TripDeleteSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
