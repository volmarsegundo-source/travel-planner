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

export interface ExpeditionContext {
  tripType?: string;
  travelerType?: string;
  accommodationStyle?: string;
  travelPace?: number;
  budget?: number;
  currency?: string;
  destinationGuideContext?: string;
  /** TASK-S33-011: Full traveler context for Phase 6 prompt enrichment */
  personal?: {
    name?: string;
    ageRange?: string;
    origin?: string;
  };
  trip?: {
    destination?: string;
    dates?: string;
    type?: string;
    travelers?: string;
  };
  preferences?: {
    pace?: string;
    budget?: string;
    food?: string;
    interests?: string;
    accommodation?: string;
  };
  logistics?: {
    transport?: string[];
    accommodation?: string[];
    mobility?: string[];
  };
}

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
  expeditionContext?: ExpeditionContext;
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

// ─── Destination Guide (Phase 5) — v1 (DEPRECATED, kept for cached data) ────

export type GuideSectionType = "stat" | "content";

export interface GuideSectionData {
  title: string;
  icon: string;
  summary: string;
  tips: string[];
  type: GuideSectionType;
  details?: string;
}

export type GuideSectionKey =
  | "timezone"
  | "currency"
  | "language"
  | "electricity"
  | "connectivity"
  | "cultural_tips"
  | "safety"
  | "health"
  | "transport_overview"
  | "local_customs";

/** @deprecated Use DestinationGuideContentV2 for new code */
export type DestinationGuideContentV1 = Record<GuideSectionKey, GuideSectionData>;

// ─── Destination Guide (Phase 5) — v2 ──────────────────────────────────────

export interface QuickFact {
  label: string;
  value: string;
}

export interface SafetyInfo {
  level: "safe" | "moderate" | "caution";
  tips: string[];
  emergencyNumbers: {
    police: string;
    ambulance: string;
    tourist: string | null;
  };
}

export interface CostItem {
  category: string;
  budget: string;
  mid: string;
  premium: string;
}

export interface DailyCosts {
  items: CostItem[];
  dailyTotal: {
    budget: string;
    mid: string;
    premium: string;
  };
  tip?: string;
}

export interface MustSeeItem {
  name: string;
  category: "nature" | "culture" | "food" | "nightlife" | "sport" | "adventure";
  estimatedTime: string;
  costRange: string;
  description: string;
}

export interface DocumentationInfo {
  passport: string;
  visa: string;
  vaccines: string;
  insurance: string;
}

export interface LocalTransportInfo {
  options: string[];
  tips: string[];
}

export interface DestinationInfo {
  name: string;
  nickname: string;
  subtitle: string;
  overview: string[];
}

export interface DestinationGuideContentV2 {
  destination: DestinationInfo;
  quickFacts: {
    climate: QuickFact;
    currency: QuickFact;
    language: QuickFact;
    timezone: QuickFact;
    plugType: QuickFact;
    dialCode: QuickFact;
  };
  safety: SafetyInfo;
  dailyCosts: DailyCosts;
  mustSee: MustSeeItem[];
  documentation: DocumentationInfo;
  localTransport: LocalTransportInfo;
  culturalTips: string[];
}

/**
 * Union type for guide content — supports both v1 (legacy cached) and v2 (new).
 * Use `isGuideV2()` to discriminate at runtime.
 */
export type DestinationGuideContent = DestinationGuideContentV1 | DestinationGuideContentV2;

/** Type guard: returns true if the guide content is v2 format */
export function isGuideV2(content: DestinationGuideContent): content is DestinationGuideContentV2 {
  return "destination" in content && "quickFacts" in content && "mustSee" in content;
}

export interface GenerateGuideParams {
  userId: string;
  destination: string;
  language: "pt-BR" | "en";
  /** Optional traveler context from Phases 1-4 for personalized guide */
  travelerContext?: import("@/lib/prompts/types").GuideTravelerContext;
}
