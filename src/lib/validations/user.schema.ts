import { z } from "zod";
import { isAdult } from "@/lib/guards/age-guard";

/**
 * Strong password schema — enforces:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one digit
 * - At least one special character (non-alphanumeric)
 * - Maximum 72 characters (bcrypt limit)
 *
 * All failure messages use the same i18n key so the UI shows a single
 * "password does not meet requirements" error alongside the visual checklist.
 */
export const StrongPasswordSchema = z
  .string()
  .min(8, "auth.errors.passwordWeak")
  .regex(/[A-Z]/, "auth.errors.passwordWeak")
  .regex(/[0-9]/, "auth.errors.passwordWeak")
  .regex(/[^A-Za-z0-9]/, "auth.errors.passwordWeak")
  .max(72, "auth.errors.passwordWeak");

// SPEC-AUTH-AGE-001: DOB is required at signup. Accept ISO date strings
// (from <input type="date">) and enforce 18+.
// SPEC-AUTH-AGE-002: exported for reuse in the Google OAuth complete-profile flow.
export const DateOfBirthSchema = z
  .string()
  .min(1, "auth.errors.dateInvalid")
  .refine((val) => !Number.isNaN(new Date(val).getTime()), {
    message: "auth.errors.dateInvalid",
  })
  .refine((val) => isAdult(val), {
    message: "auth.errors.ageUnderage",
  });

export const UserSignUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: StrongPasswordSchema,
  dateOfBirth: DateOfBirthSchema,
  name: z.string().min(1, "Name is required").max(100).optional(),
});

export const UserSignInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type UserSignUpInput = z.infer<typeof UserSignUpSchema>;
export type UserSignInInput = z.infer<typeof UserSignInSchema>;
