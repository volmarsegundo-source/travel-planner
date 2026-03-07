import type { TripType } from "./trip-classifier";

export type ChecklistItemKey =
  | "national_id"
  | "passport"
  | "passport_validity"
  | "visa_check"
  | "schengen_visa"
  | "travel_insurance"
  | "travel_insurance_30k"
  | "eta_etias"
  | "vaccinations"
  | "currency_exchange"
  | "notify_bank"
  | "international_sim"
  | "power_adapter"
  | "flight_tickets"
  | "accommodation"
  | "travel_insurance_rec";

export interface ChecklistRule {
  key: ChecklistItemKey;
  required: boolean;
  phase: number;
}

export const CHECKLIST_RULES: Record<TripType, ChecklistRule[]> = {
  domestic: [
    { key: "national_id", required: true, phase: 1 },
    { key: "flight_tickets", required: true, phase: 3 },
    { key: "accommodation", required: true, phase: 4 },
    { key: "travel_insurance_rec", required: false, phase: 2 },
  ],
  mercosul: [
    { key: "national_id", required: true, phase: 1 },
    { key: "passport", required: false, phase: 1 },
    { key: "flight_tickets", required: true, phase: 3 },
    { key: "accommodation", required: true, phase: 4 },
    { key: "travel_insurance_rec", required: false, phase: 2 },
    { key: "currency_exchange", required: true, phase: 2 },
  ],
  international: [
    { key: "passport", required: true, phase: 1 },
    { key: "passport_validity", required: true, phase: 1 },
    { key: "visa_check", required: true, phase: 1 },
    { key: "travel_insurance", required: true, phase: 2 },
    { key: "vaccinations", required: true, phase: 2 },
    { key: "currency_exchange", required: true, phase: 2 },
    { key: "notify_bank", required: true, phase: 2 },
    { key: "international_sim", required: true, phase: 3 },
    { key: "power_adapter", required: true, phase: 3 },
    { key: "flight_tickets", required: true, phase: 3 },
    { key: "accommodation", required: true, phase: 4 },
  ],
  schengen: [
    { key: "passport", required: true, phase: 1 },
    { key: "passport_validity", required: true, phase: 1 },
    { key: "schengen_visa", required: true, phase: 1 },
    { key: "visa_check", required: true, phase: 1 },
    { key: "travel_insurance_30k", required: true, phase: 2 },
    { key: "eta_etias", required: true, phase: 2 },
    { key: "vaccinations", required: true, phase: 2 },
    { key: "currency_exchange", required: true, phase: 2 },
    { key: "notify_bank", required: true, phase: 2 },
    { key: "international_sim", required: true, phase: 3 },
    { key: "power_adapter", required: true, phase: 3 },
    { key: "flight_tickets", required: true, phase: 3 },
    { key: "accommodation", required: true, phase: 4 },
  ],
};
