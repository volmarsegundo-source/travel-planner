export type TravelStyle =
  | "ADVENTURE"
  | "CULTURE"
  | "RELAXATION"
  | "GASTRONOMY"
  | "ROMANTIC"
  | "FAMILY"
  | "BUSINESS"
  | "BACKPACKER"
  | "LUXURY";
export type ActivityType =
  | "SIGHTSEEING"
  | "FOOD"
  | "TRANSPORT"
  | "ACCOMMODATION"
  | "LEISURE"
  | "SHOPPING";
export type ChecklistCategory =
  | "DOCUMENTS"
  | "HEALTH"
  | "CURRENCY"
  | "WEATHER"
  | "TECHNOLOGY";
export type Priority = "HIGH" | "MEDIUM" | "LOW";

export interface GeneratePlanParams {
  userId: string;
  destination: string;
  startDate: string;
  endDate: string;
  travelStyle: TravelStyle;
  budgetTotal: number;
  budgetCurrency: string;
  travelers: number;
  language: "pt-BR" | "en";
  travelNotes?: string;
}

export interface DayActivity {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  estimatedCost: number;
  activityType: ActivityType;
}

export interface DayPlan {
  dayNumber: number;
  date: string;
  theme: string;
  activities: DayActivity[];
}

export interface ItineraryPlan {
  destination: string;
  totalDays: number;
  estimatedBudgetUsed: number;
  currency: string;
  days: DayPlan[];
  tips: string[];
}

export interface GenerateChecklistParams {
  userId: string;
  destination: string;
  startDate: string;
  travelers: number;
  language: "pt-BR" | "en";
}

export interface ChecklistItemData {
  label: string;
  priority: Priority;
}

export interface ChecklistCategoryData {
  category: ChecklistCategory;
  items: ChecklistItemData[];
}

export interface ChecklistResult {
  categories: ChecklistCategoryData[];
}

// ─── Destination Guide (Phase 5) ────────────────────────────────────────────

export interface GuideSectionData {
  title: string;
  icon: string;
  summary: string;
  tips: string[];
}

export type GuideSectionKey =
  | "timezone"
  | "currency"
  | "language"
  | "electricity"
  | "connectivity"
  | "cultural_tips";

export type DestinationGuideContent = Record<GuideSectionKey, GuideSectionData>;

export interface GenerateGuideParams {
  userId: string;
  destination: string;
  language: "pt-BR" | "en";
}
