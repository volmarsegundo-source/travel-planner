import { z } from "zod";

// ─── Constants ──────────────────────────────────────────────────────────────

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 100;
const SUPPORTED_LOCALES = ["pt-BR", "en"] as const;

// ─── Update Profile ─────────────────────────────────────────────────────────

export const UpdateUserProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(MIN_NAME_LENGTH, "account.errors.nameTooShort")
    .max(MAX_NAME_LENGTH, "account.errors.nameTooLong"),
  preferredLocale: z
    .enum(SUPPORTED_LOCALES, {
      errorMap: () => ({ message: "account.errors.invalidLocale" }),
    })
    .optional(),
});

export type UpdateUserProfileInput = z.infer<typeof UpdateUserProfileSchema>;

// ─── Delete Account ─────────────────────────────────────────────────────────

export const DeleteUserAccountSchema = z.object({
  confirmEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email("account.errors.invalidEmail"),
});

export type DeleteUserAccountInput = z.infer<typeof DeleteUserAccountSchema>;
