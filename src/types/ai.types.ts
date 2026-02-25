// Shared AI types — consumed by both ai.service.ts and UI components

export interface Activity {
  time?: string;          // e.g. "09:00"
  title: string;
  description: string;
  durationMinutes?: number;
  category: "SIGHTSEEING" | "FOOD" | "TRANSPORT" | "LEISURE" | "ACCOMMODATION" | "OTHER";
  estimatedCost?: number;
}

export interface DayPlan {
  dayNumber: number;      // 1-based
  date?: string;          // ISO date string, optional
  theme?: string;         // e.g. "Chegada e primeiros passos"
  activities: Activity[];
}

export interface ItineraryPlan {
  destination: string;
  totalDays: number;
  travelStyle: string;
  budgetSummary?: string;
  highlights: string[];
  days: DayPlan[];
  tips?: string[];
}

// ── Checklist types (T-010, Dia 6) ────────────────────────────────────────

export type ChecklistCategoryId =
  | "DOCUMENTS"
  | "HEALTH"
  | "CURRENCY"
  | "WEATHER"
  | "TECHNOLOGY"
  | "OTHER";

export interface ChecklistItemData {
  text: string;
  required: boolean;
  notes?: string;
}

export interface ChecklistCategory {
  id: ChecklistCategoryId;
  items: ChecklistItemData[];
}

// ── Param types ────────────────────────────────────────────────────────────

export interface GeneratePlanParams {
  destination: string;
  startDate?: Date | null;
  endDate?: Date | null;
  travelStyle?: string | null;
  budgetTotal?: number | null;
  budgetCurrency?: string | null;
  travelers: number;
  language?: "pt-BR" | "en";
}

export interface GenerateChecklistParams {
  destination: string;
  startDate?: Date | null;
  endDate?: Date | null;
  travelers: number;
  language?: "pt-BR" | "en";
}
