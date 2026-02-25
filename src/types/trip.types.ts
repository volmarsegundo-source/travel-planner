import type { Trip, TripStatus } from "@/generated/prisma/client";

export type { Trip, TripStatus };

export type TripSummary = Pick<
  Trip,
  | "id"
  | "title"
  | "destinationName"
  | "startDate"
  | "endDate"
  | "travelers"
  | "status"
  | "coverGradient"
  | "coverEmoji"
  | "travelStyle"
  | "budgetTotal"
  | "budgetCurrency"
  | "createdAt"
  | "updatedAt"
>;

export const VALID_STATUS_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  PLANNING: ["ACTIVE", "ARCHIVED"],
  ACTIVE: ["COMPLETED", "ARCHIVED"],
  COMPLETED: ["ARCHIVED"],
  ARCHIVED: [],
};

export function isValidStatusTransition(
  from: TripStatus,
  to: TripStatus,
): boolean {
  return VALID_STATUS_TRANSITIONS[from].includes(to);
}

export const MAX_ACTIVE_TRIPS = 20;
