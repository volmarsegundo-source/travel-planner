"use server";
import "server-only";
import { AuthService } from "@/server/services/auth.service";
import { UserSignUpSchema } from "@/lib/validations/user.schema";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { z } from "zod";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

// ─── Register ─────────────────────────────────────────────────────────────────

export async function registerAction(
  formData: FormData
): Promise<ActionResult<{ userId: string }>> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name") ?? undefined,
  };

  const parsed = UserSignUpSchema.safeParse(raw);

  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return { success: false, error: firstError?.message ?? "auth.errors.invalidCredentials" };
  }

  try {
    const result = await AuthService.registerUser(
      parsed.data.email,
      parsed.data.password,
      parsed.data.name
    );
    return { success: true, data: result };
  } catch (err) {
    if (err instanceof AppError) {
      return { success: false, error: err.message };
    }
    logger.error("auth.registerAction.unexpected", err);
    return { success: false, error: "errors.generic" };
  }
}

// ─── Verify Email ─────────────────────────────────────────────────────────────

const TokenSchema = z.string().min(1, "Token is required");

export async function verifyEmailAction(
  token: string
): Promise<ActionResult> {
  const parsed = TokenSchema.safeParse(token);
  if (!parsed.success) {
    return { success: false, error: "auth.errors.tokenExpired" };
  }

  try {
    await AuthService.verifyEmail(parsed.data);
    return { success: true };
  } catch (err) {
    if (err instanceof AppError) {
      return { success: false, error: err.message };
    }
    logger.error("auth.verifyEmailAction.unexpected", err);
    return { success: false, error: "errors.generic" };
  }
}

// ─── Request Password Reset ───────────────────────────────────────────────────

const EmailSchema = z.string().email("auth.errors.emailInvalid");

export async function requestPasswordResetAction(
  email: string
): Promise<ActionResult> {
  const parsed = EmailSchema.safeParse(email);
  if (!parsed.success) {
    return { success: false, error: "auth.errors.emailInvalid" };
  }

  try {
    await AuthService.requestPasswordReset(parsed.data);
    // Always return success to prevent user enumeration.
    return { success: true };
  } catch (err) {
    logger.error("auth.requestPasswordResetAction.unexpected", err);
    return { success: false, error: "errors.generic" };
  }
}

// ─── Confirm Password Reset ───────────────────────────────────────────────────

const ConfirmResetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "auth.errors.passwordTooShort").max(72),
});

export async function confirmPasswordResetAction(
  token: string,
  password: string
): Promise<ActionResult> {
  const parsed = ConfirmResetSchema.safeParse({ token, password });
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return { success: false, error: firstError?.message ?? "errors.generic" };
  }

  try {
    await AuthService.confirmPasswordReset(parsed.data.token, parsed.data.password);
    return { success: true };
  } catch (err) {
    if (err instanceof AppError) {
      return { success: false, error: err.message };
    }
    logger.error("auth.confirmPasswordResetAction.unexpected", err);
    return { success: false, error: "errors.generic" };
  }
}
