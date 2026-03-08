import { describe, it, expect } from "vitest";
import {
  CHECKLIST_RULES,
  PHASE3_CHECKLIST,
  CNH_RULES,
} from "@/lib/travel/checklist-rules";
import type { TripType } from "@/lib/travel/trip-classifier";

describe("checklist-rules", () => {
  it("domestic does not include passport as required", () => {
    const passportRule = CHECKLIST_RULES.domestic.find(
      (r) => r.key === "passport"
    );
    expect(
      passportRule === undefined || passportRule.required === false
    ).toBe(true);
  });

  it("mercosul includes currency_exchange", () => {
    const rule = CHECKLIST_RULES.mercosul.find(
      (r) => r.key === "currency_exchange"
    );
    expect(rule).toBeDefined();
  });

  it("international includes visa_check and travel_insurance as required", () => {
    const visa = CHECKLIST_RULES.international.find(
      (r) => r.key === "visa_check"
    );
    const insurance = CHECKLIST_RULES.international.find(
      (r) => r.key === "travel_insurance"
    );
    expect(visa?.required).toBe(true);
    expect(insurance?.required).toBe(true);
  });

  it("schengen includes travel_insurance_30k as required", () => {
    const rule = CHECKLIST_RULES.schengen.find(
      (r) => r.key === "travel_insurance_30k"
    );
    expect(rule?.required).toBe(true);
  });

  it("schengen includes eta_etias", () => {
    const rule = CHECKLIST_RULES.schengen.find(
      (r) => r.key === "eta_etias"
    );
    expect(rule).toBeDefined();
  });

  it("all trip types include flight_tickets and accommodation", () => {
    const types: TripType[] = [
      "domestic",
      "mercosul",
      "international",
      "schengen",
    ];
    for (const type of types) {
      const flights = CHECKLIST_RULES[type].find(
        (r) => r.key === "flight_tickets"
      );
      const accom = CHECKLIST_RULES[type].find(
        (r) => r.key === "accommodation"
      );
      expect(flights).toBeDefined();
      expect(accom).toBeDefined();
    }
  });
});

// ─── Phase 3 Checklist Rules ──────────────────────────────────────────────

describe("PHASE3_CHECKLIST", () => {
  it("contains exactly 8 items", () => {
    expect(PHASE3_CHECKLIST).toHaveLength(8);
  });

  it("emergency_contacts is required for all trip types", () => {
    const rule = PHASE3_CHECKLIST.find((r) => r.key === "emergency_contacts");
    expect(rule).toBeDefined();
    expect(rule!.requiredFor).toEqual(
      expect.arrayContaining(["domestic", "mercosul", "international", "schengen"])
    );
  });

  it("etias_eta is required only for schengen", () => {
    const rule = PHASE3_CHECKLIST.find((r) => r.key === "etias_eta");
    expect(rule).toBeDefined();
    expect(rule!.requiredFor).toEqual(["schengen"]);
    expect(rule!.recommendedFor).toEqual([]);
  });

  it("passport_valid_6m is required for international and schengen", () => {
    const rule = PHASE3_CHECKLIST.find((r) => r.key === "passport_valid_6m");
    expect(rule!.requiredFor).toEqual(
      expect.arrayContaining(["international", "schengen"])
    );
    expect(rule!.requiredFor).not.toContain("domestic");
  });

  it("local_currency is required for non-domestic trips", () => {
    const rule = PHASE3_CHECKLIST.find((r) => r.key === "local_currency");
    expect(rule!.requiredFor).toEqual(
      expect.arrayContaining(["mercosul", "international", "schengen"])
    );
    expect(rule!.requiredFor).not.toContain("domestic");
  });

  it("every item has a positive deadlineDaysBefore", () => {
    for (const rule of PHASE3_CHECKLIST) {
      expect(rule.deadlineDaysBefore).toBeGreaterThan(0);
    }
  });

  it("yellow_fever_vaccine is recommended (not required) for mercosul and international", () => {
    const rule = PHASE3_CHECKLIST.find((r) => r.key === "yellow_fever_vaccine");
    expect(rule!.requiredFor).toEqual([]);
    expect(rule!.recommendedFor).toEqual(
      expect.arrayContaining(["mercosul", "international"])
    );
  });

  it("travel_insurance is required for international/schengen, recommended for domestic/mercosul", () => {
    const rule = PHASE3_CHECKLIST.find((r) => r.key === "travel_insurance");
    expect(rule!.requiredFor).toEqual(
      expect.arrayContaining(["international", "schengen"])
    );
    expect(rule!.recommendedFor).toEqual(
      expect.arrayContaining(["domestic", "mercosul"])
    );
  });
});

// ─── CNH Rules ────────────────────────────────────────────────────────────

describe("CNH_RULES", () => {
  it("domestic does not require CNH", () => {
    expect(CNH_RULES.domestic.required).toBe(false);
    expect(CNH_RULES.domestic.type).toBeNull();
  });

  it("mercosul uses CNH brasileira (not required)", () => {
    expect(CNH_RULES.mercosul.required).toBe(false);
    expect(CNH_RULES.mercosul.type).toBe("cnh_brasileira");
  });

  it("international requires CINH with 45 day lead time", () => {
    expect(CNH_RULES.international.required).toBe(true);
    expect(CNH_RULES.international.type).toBe("cinh");
    expect(CNH_RULES.international.leadTimeDays).toBe(45);
  });

  it("schengen requires CINH with 45 day lead time", () => {
    expect(CNH_RULES.schengen.required).toBe(true);
    expect(CNH_RULES.schengen.type).toBe("cinh");
    expect(CNH_RULES.schengen.leadTimeDays).toBe(45);
  });
});
