import "server-only";
import bcrypt from "bcryptjs";
import { createId } from "@paralleldrive/cuid2";
import { db } from "@/server/db";
import { redis } from "@/server/cache/redis";
import { ConflictError, AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { hashUserId } from "@/lib/hash";
import { getEmailSender } from "@/server/services/email/factory";
import type { EmailLocale } from "@/server/services/email/email-sender";

// ─── Constants ───────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 12;
const EMAIL_VERIFY_TTL_SECONDS = 86_400; // 24 hours
const PASSWORD_RESET_TTL_SECONDS = 3_600; // 1 hour

// ─── Cache key builders ───────────────────────────────────────────────────────

function emailVerifyKey(token: string): string {
  return `cache:email-verify:${token}`;
}

function passwordResetKey(token: string): string {
  return `cache:pwd-reset:${token}`;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class AuthService {
  /**
   * Register a new user with email + password.
   * Password is hashed with bcrypt before storage.
   * Triggers a verification email (placeholder — real email in T-003).
   *
   * Throws ConflictError if the email is already registered.
   */
  static async registerUser(
    email: string,
    password: string,
    name?: string,
    dateOfBirth?: Date
  ): Promise<{ userId: string }> {
    const existing = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictError("auth.errors.emailAlreadyExists");
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await db.user.create({
      data: {
        email,
        passwordHash,
        name: name ?? null,
        emailVerified: new Date(), // TODO(T-003): remove when real email verification flow ships
      },
      select: { id: true },
    });

    // SPEC-AUTH-AGE-001: persist DOB on UserProfile. Schema enforces 18+
    // before reaching this code, so we trust the value here.
    if (dateOfBirth) {
      await db.userProfile.create({
        data: { userId: user.id, birthDate: dateOfBirth },
      });
    }

    logger.info("auth.register", { userIdHash: hashUserId(user.id) });

    // Fire-and-forget: verification email — real delivery handled in T-003.
    // Do NOT await — if Redis is temporarily unavailable the registration
    // should still succeed (emailVerified is already set).
    AuthService.sendVerificationEmail(user.id, email).catch((err) => {
      logger.error("auth.register.emailTokenFailed", err);
    });

    return { userId: user.id };
  }

  /**
   * Store an email verification token in Redis with a 24-hour TTL.
   * The token is a cryptographically strong random ID.
   */
  static async sendVerificationEmail(
    userId: string,
    _email: string // email intentionally not logged — PII
  ): Promise<{ token: string }> {
    const token = createId();
    const key = emailVerifyKey(token);

    await redis.set(key, userId, "EX", EMAIL_VERIFY_TTL_SECONDS);

    logger.info("auth.emailVerify.tokenIssued", { userIdHash: hashUserId(userId) });

    // TODO (T-003): send actual email with verification link containing token.
    return { token };
  }

  /**
   * Verify an email address using the token stored in Redis.
   * Sets emailVerified timestamp on the user record and deletes the token.
   *
   * Throws AppError with code TOKEN_INVALID if the token does not exist or
   * has already expired.
   */
  static async verifyEmail(token: string): Promise<{ userId: string }> {
    const key = emailVerifyKey(token);
    const userId = await redis.get(key);

    if (!userId) {
      throw new AppError("TOKEN_INVALID", "auth.errors.tokenExpired", 400);
    }

    await db.user.update({
      where: { id: userId },
      data: { emailVerified: new Date() },
    });

    await redis.del(key);

    logger.info("auth.emailVerify.success", { userIdHash: hashUserId(userId) });

    return { userId };
  }

  /**
   * Generate a password-reset token and store it in Redis with a 1-hour TTL.
   *
   * Always returns successfully — even when the email is not found — to
   * prevent user-enumeration attacks.
   */
  static async requestPasswordReset(
    email: string,
    locale: EmailLocale = "en"
  ): Promise<void> {
    const user = await db.user.findUnique({
      where: { email, deletedAt: null },
      select: { id: true },
    });

    // Do not reveal whether the email exists.
    if (!user) {
      logger.info("auth.passwordReset.emailNotFound");
      return;
    }

    const token = createId();
    const key = passwordResetKey(token);

    await redis.set(key, user.id, "EX", PASSWORD_RESET_TTL_SECONDS);

    logger.info("auth.passwordReset.tokenIssued", { userIdHash: hashUserId(user.id) });

    const baseUrl = process.env.AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;

    try {
      await getEmailSender().sendPasswordReset({ to: email, resetUrl, locale });
    } catch (err) {
      // Anti-enumeration: never let dispatch failures surface to the caller.
      logger.error("auth.passwordReset.emailDispatchFailed", {
        userIdHash: hashUserId(user.id),
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Complete a password reset using the token issued by requestPasswordReset.
   * Hashes the new password and deletes the token from Redis.
   *
   * Throws AppError with code TOKEN_INVALID if the token is expired or invalid.
   */
  static async confirmPasswordReset(
    token: string,
    newPassword: string
  ): Promise<{ userId: string }> {
    const key = passwordResetKey(token);
    const userId = await redis.get(key);

    if (!userId) {
      throw new AppError("TOKEN_INVALID", "auth.errors.tokenExpired", 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await db.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await redis.del(key);

    logger.info("auth.passwordReset.success", { userIdHash: hashUserId(userId) });

    return { userId };
  }
}
