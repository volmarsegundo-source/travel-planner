// ─── Atlas Gamification Types ───────────────────────────────────────────────

export type Rank =
  | "traveler"
  | "explorer"
  | "navigator"
  | "cartographer"
  | "pathfinder"
  | "ambassador";

export type BadgeKey =
  | "first_step"
  | "navigator"
  | "host"
  | "cartographer"
  | "treasurer"
  | "pathfinder"
  | "ambassador";

export type PhaseStatus = "locked" | "active" | "completed";
export type PhaseNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type PointTransactionType =
  | "phase_complete"
  | "ai_usage"
  | "daily_login"
  | "purchase"
  | "referral"
  | "checklist"
  | "profile_completion"
  | "phase_checklist"
  | "phase_accommodation"
  | "phase_connectivity";

export type Phase3ItemKey =
  | "passport_valid_6m"
  | "visa_required"
  | "travel_insurance"
  | "yellow_fever_vaccine"
  | "etias_eta"
  | "emergency_contacts"
  | "copies_documents"
  | "local_currency";

export type ConnectivityOption = "chip_local" | "esim" | "roaming" | "wifi_only";

export type AiSpendType =
  | "ai_itinerary"
  | "ai_route"
  | "ai_accommodation"
  | "ai_regenerate";

export interface PhaseDefinition {
  phaseNumber: PhaseNumber;
  name: string;
  nameKey: string;
  isFree: boolean;
  pointsReward: number;
  aiCost: number;
  badgeKey: BadgeKey | null;
  rankPromotion: Rank | null;
  nonBlocking: boolean;
}

export interface PhaseCompletionResult {
  phaseNumber: PhaseNumber;
  pointsEarned: number;
  badgeAwarded: BadgeKey | null;
  newRank: Rank | null;
  nextPhaseUnlocked: PhaseNumber | null;
}

export interface PointBalanceResult {
  totalPoints: number;
  availablePoints: number;
  currentRank: Rank;
}

export interface SpendResult {
  success: boolean;
  remainingPoints: number;
  transactionId: string;
}

export const AI_COSTS: Record<AiSpendType, number> = {
  ai_itinerary: 150,
  ai_route: 100,
  ai_accommodation: 100,
  ai_regenerate: 80,
};

export const WELCOME_BONUS = 500;

export const EARNING_AMOUNTS = {
  daily_login: 10,
  checklist: 20,
  review: 500,
  referral: 300,
} as const;

export const PROFILE_FIELD_POINTS: Record<string, number> = {
  birthDate: 25,
  phone: 25,
  country: 25,
  city: 25,
  address: 25,
  passportNumber: 25,
  passportExpiry: 25,
  nationalId: 25,
  bio: 25,
  dietaryRestrictions: 25,
  accessibility: 25,
} as const;
