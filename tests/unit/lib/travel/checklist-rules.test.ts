import { describe, it, expect } from "vitest";
import { CHECKLIST_RULES } from "@/lib/travel/checklist-rules";
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
