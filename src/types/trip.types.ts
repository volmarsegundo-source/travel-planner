export type TripStatus = "PLANNING" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
export type TripVisibility = "PRIVATE" | "PUBLIC" | "SHARED";

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

export interface CreateTripInput {
  title: string;
  destination: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  coverGradient?: string;
  coverEmoji?: string;
}

export interface UpdateTripInput extends Partial<CreateTripInput> {
  status?: TripStatus;
  visibility?: TripVisibility;
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
