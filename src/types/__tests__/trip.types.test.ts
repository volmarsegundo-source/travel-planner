import { describe, it, expect } from "vitest";
import { isValidStatusTransition, MAX_ACTIVE_TRIPS } from "../trip.types";

describe("isValidStatusTransition", () => {
  it("PLANNING → ACTIVE is valid", () => {
    expect(isValidStatusTransition("PLANNING", "ACTIVE")).toBe(true);
  });

  it("PLANNING → ARCHIVED is valid", () => {
    expect(isValidStatusTransition("PLANNING", "ARCHIVED")).toBe(true);
  });

  it("PLANNING → COMPLETED is invalid", () => {
    expect(isValidStatusTransition("PLANNING", "COMPLETED")).toBe(false);
  });

  it("ACTIVE → COMPLETED is valid", () => {
    expect(isValidStatusTransition("ACTIVE", "COMPLETED")).toBe(true);
  });

  it("ACTIVE → ARCHIVED is valid", () => {
    expect(isValidStatusTransition("ACTIVE", "ARCHIVED")).toBe(true);
  });

  it("ACTIVE → PLANNING is invalid (no rollback)", () => {
    expect(isValidStatusTransition("ACTIVE", "PLANNING")).toBe(false);
  });

  it("COMPLETED → ARCHIVED is valid", () => {
    expect(isValidStatusTransition("COMPLETED", "ARCHIVED")).toBe(true);
  });

  it("COMPLETED → PLANNING is invalid", () => {
    expect(isValidStatusTransition("COMPLETED", "PLANNING")).toBe(false);
  });

  it("ARCHIVED → anything is invalid (terminal state)", () => {
    const targets = ["PLANNING", "ACTIVE", "COMPLETED", "ARCHIVED"] as const;
    for (const to of targets) {
      expect(isValidStatusTransition("ARCHIVED", to)).toBe(false);
    }
  });

  it("same status → same is invalid (no-op transitions not allowed)", () => {
    expect(isValidStatusTransition("PLANNING", "PLANNING")).toBe(false);
    expect(isValidStatusTransition("ACTIVE", "ACTIVE")).toBe(false);
  });
});

describe("MAX_ACTIVE_TRIPS", () => {
  it("is 20", () => {
    expect(MAX_ACTIVE_TRIPS).toBe(20);
  });
});
