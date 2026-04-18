import { z } from "zod";

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

export const UserSignUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: StrongPasswordSchema,
  name: z.string().min(1, "Name is required").max(100).optional(),
});

export const UserSignInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type UserSignUpInput = z.infer<typeof UserSignUpSchema>;
export type UserSignInInput = z.infer<typeof UserSignInSchema>;
