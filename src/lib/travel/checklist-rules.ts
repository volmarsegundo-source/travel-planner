import type { TripType } from "./trip-classifier";
import type { Phase3ItemKey } from "@/types/gamification.types";

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

// ─── Phase 3 Checklist Rules (O Preparo) ──────────────────────────────────

export interface Phase3ChecklistRule {
  key: Phase3ItemKey;
  requiredFor: TripType[];
  recommendedFor: TripType[];
  deadlineDaysBefore: number;
}

export const PHASE3_CHECKLIST: Phase3ChecklistRule[] = [
  {
    key: "passport_valid_6m",
    requiredFor: ["international", "schengen"],
    recommendedFor: ["mercosul"],
    deadlineDaysBefore: 90,
  },
  {
    key: "visa_required",
    requiredFor: ["international", "schengen"],
    recommendedFor: [],
    deadlineDaysBefore: 60,
  },
  {
    key: "travel_insurance",
    requiredFor: ["international", "schengen"],
    recommendedFor: ["domestic", "mercosul"],
    deadlineDaysBefore: 30,
  },
  {
    key: "yellow_fever_vaccine",
    requiredFor: [],
    recommendedFor: ["mercosul", "international"],
    deadlineDaysBefore: 60,
  },
  {
    key: "etias_eta",
    requiredFor: ["schengen"],
    recommendedFor: [],
    deadlineDaysBefore: 30,
  },
  {
    key: "emergency_contacts",
    requiredFor: ["domestic", "mercosul", "international", "schengen"],
    recommendedFor: [],
    deadlineDaysBefore: 14,
  },
  {
    key: "copies_documents",
    requiredFor: ["international", "schengen"],
    recommendedFor: ["domestic", "mercosul"],
    deadlineDaysBefore: 14,
  },
  {
    key: "local_currency",
    requiredFor: ["mercosul", "international", "schengen"],
    recommendedFor: [],
    deadlineDaysBefore: 7,
  },
];

// ─── Phase 4 CNH Rules (O Abrigo) ─────────────────────────────────────────

export interface CnhRule {
  required: boolean;
  type: "cnh_brasileira" | "cinh" | null;
  leadTimeDays: number;
}

export const CNH_RULES: Record<TripType, CnhRule> = {
  domestic: { required: false, type: null, leadTimeDays: 0 },
  mercosul: { required: false, type: "cnh_brasileira", leadTimeDays: 0 },
  international: { required: true, type: "cinh", leadTimeDays: 45 },
  schengen: { required: true, type: "cinh", leadTimeDays: 45 },
};
