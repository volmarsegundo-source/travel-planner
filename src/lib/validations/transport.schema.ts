import { z } from "zod";

// ─── Transport Type Enum ─────────────────────────────────────────────────────

export const TRANSPORT_TYPES = [
  "flight", "bus", "train", "car", "ferry", "other",
] as const;

export const TransportTypeSchema = z.enum(TRANSPORT_TYPES);
export type TransportType = z.infer<typeof TransportTypeSchema>;

// ─── Accommodation Type Enum ─────────────────────────────────────────────────

export const ACCOMMODATION_TYPES = [
  "hotel", "hostel", "airbnb", "friends_house", "camping", "other",
] as const;

export const AccommodationTypeSchema = z.enum(ACCOMMODATION_TYPES);
export type AccommodationType = z.infer<typeof AccommodationTypeSchema>;

// ─── Local Mobility Options ──────────────────────────────────────────────────

export const LOCAL_MOBILITY_OPTIONS = [
  "public_transit", "taxi_rideshare", "walking", "bicycle",
  "private_transfer", "car_rental", "other",
] as const;

export const LocalMobilitySchema = z.array(z.enum(LOCAL_MOBILITY_OPTIONS)).default([]);
export type LocalMobility = z.infer<typeof LocalMobilitySchema>;

// ─── Transport Segment Schema ────────────────────────────────────────────────

export const TransportSegmentSchema = z.object({
  transportType: TransportTypeSchema,
  departurePlace: z.string().max(150).nullable().optional(),
  arrivalPlace: z.string().max(150).nullable().optional(),
  departureAt: z.coerce.date().nullable().optional(),
  arrivalAt: z.coerce.date().nullable().optional(),
  provider: z.string().max(100).nullable().optional(),
  bookingCode: z.string().max(200).nullable().optional(), // plain text — encrypted before storage
  estimatedCost: z.number().nonnegative().max(99999999.99).nullable().optional(),
  currency: z.string().length(3).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  isReturn: z.boolean().default(false),
  segmentOrder: z.number().int().min(0).default(0),
});

export type TransportSegmentInput = z.infer<typeof TransportSegmentSchema>;

// ─── Accommodation Schema ────────────────────────────────────────────────────

export const AccommodationSchema = z.object({
  accommodationType: AccommodationTypeSchema,
  name: z.string().max(150).nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  bookingCode: z.string().max(200).nullable().optional(), // plain text — encrypted before storage
  checkIn: z.coerce.date().nullable().optional(),
  checkOut: z.coerce.date().nullable().optional(),
  estimatedCost: z.number().nonnegative().max(99999999.99).nullable().optional(),
  currency: z.string().length(3).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  orderIndex: z.number().int().min(0).default(0),
});

export type AccommodationInput = z.infer<typeof AccommodationSchema>;

// ─── Business Rules ──────────────────────────────────────────────────────────

export const MAX_TRANSPORT_SEGMENTS = 10;
export const MAX_ACCOMMODATIONS = 5;

// ─── Origin Schema ───────────────────────────────────────────────────────────

export const OriginSchema = z.string().max(150).nullable().optional();
