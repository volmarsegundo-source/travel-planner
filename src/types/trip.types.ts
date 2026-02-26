export type { TripStatus, TripVisibility } from "@prisma/client";
import type { TripStatus, TripVisibility } from "@prisma/client";

export interface Trip {
  id: string;
  userId: string;
  title: string;
  destination: string;
  description?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  coverGradient: string;
  coverEmoji: string;
  status: TripStatus;
  visibility: TripVisibility;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

// ─── Shared result types ──────────────────────────────────────────────────────

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
