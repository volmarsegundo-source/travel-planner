"use server";
import "server-only";
import { createHash } from "crypto";
import { headers } from "next/headers";
import { AuthService } from "@/server/services/auth.service";
import { UserSignUpSchema, StrongPasswordSchema } from "@/lib/validations/user.schema";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/http/get-client-ip";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

// ─── Register ─────────────────────────────────────────────────────────────────

export async function registerAction(
  formData: FormData
): Promise<ActionResult<{ userId: string }>> {
  const ip = getClientIp(await headers());
  const rl = await checkRateLimit(`register:${ip}`, 20, 3600, {
    failClosed: true,
  });
  if (!rl.allowed) return { success: false, error: "errors.rateLimitExceeded" };

  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
    dateOfBirth: formData.get("dateOfBirth"),
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
      parsed.data.name,
      new Date(parsed.data.dateOfBirth)
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
  const hdrs = await headers();
  const ip = getClientIp(hdrs);

  // Layer 1 — IP rate limit: 5 requests / hour.
  // Stops scripted IP-level enumeration and mass-mailing abuse.
  const ipLimit = await checkRateLimit(`pwd-reset:ip:${ip}`, 5, 3600, {
    failClosed: true,
  });
  if (!ipLimit.allowed) {
    return { success: false, error: "errors.rateLimitExceeded" };
  }

  const parsed = EmailSchema.safeParse(email);
  if (!parsed.success) {
    return { success: false, error: "auth.errors.emailInvalid" };
  }

  // Layer 2 — Email rate limit: 3 requests / hour per hashed email.
  // Caps per-account harassment/mailbox-flood even when attacker rotates IP.
  // Email is normalized (trim + lowercase) and SHA-256 hashed so we never
  // store raw PII in Redis keys.
  const emailKey = createHash("sha256")
    .update(parsed.data.trim().toLowerCase())
    .digest("hex");
  const emailLimit = await checkRateLimit(`pwd-reset:email:${emailKey}`, 3, 3600, {
    failClosed: true,
  });
  if (!emailLimit.allowed) {
    // Anti-enumeration: return success even when the per-email limit triggers,
    // so attackers cannot use the error signal to confirm a registered address.
    return { success: true };
  }

  const acceptLanguage = hdrs.get("accept-language") ?? "";
  const locale: "en" | "pt-BR" = acceptLanguage.toLowerCase().startsWith("pt")
    ? "pt-BR"
    : "en";

  try {
    await AuthService.requestPasswordReset(parsed.data, locale);
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
  password: StrongPasswordSchema,
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
