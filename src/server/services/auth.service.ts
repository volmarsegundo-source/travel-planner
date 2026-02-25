import "server-only";
import bcrypt from "bcryptjs";
import { createId } from "@paralleldrive/cuid2";
import { db } from "@/server/db/client";
import { redis } from "@/server/cache/client";
import { CacheKeys, CacheTTL } from "@/server/cache/keys";

const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function getUserByEmail(email: string) {
  return db.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
      image: true,
      locale: true,
      password: true,
    },
  });
}

export async function createVerificationToken(email: string): Promise<string> {
  const token = createId();
  await redis.setex(
    CacheKeys.emailVerify(token),
    CacheTTL.EMAIL_VERIFY,
    email,
  );
  return token;
}

export async function verifyEmailToken(token: string): Promise<boolean> {
  const email = await redis.get(CacheKeys.emailVerify(token));
  if (!email) return false;

  await db.user.update({
    where: { email },
    data: { emailVerified: new Date() },
  });
  await redis.del(CacheKeys.emailVerify(token));
  return true;
}

export async function sendVerificationEmail(
  _email: string,
  token: string,
): Promise<void> {
  // TODO: integrate transactional email (Resend / SendGrid) before production
  // SECURITY: never log email address (PII) or token in non-dev environments
  if (process.env.NODE_ENV === "development") {
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${token}`;
    console.log("[AUTH DEV] Verification URL (configure Resend before staging):", url);
  }
}

export async function createPasswordResetToken(email: string): Promise<string> {
  const token = createId();
  await redis.setex(
    CacheKeys.passwordReset(token),
    CacheTTL.PASSWORD_RESET,
    email,
  );
  return token;
}

export async function sendPasswordResetEmail(
  _email: string,
  token: string,
): Promise<void> {
  // TODO: integrate transactional email (Resend / SendGrid) before production
  // SECURITY: never log email address (PII) or token in non-dev environments
  if (process.env.NODE_ENV === "development") {
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${token}`;
    console.log("[AUTH DEV] Password reset URL (configure Resend before staging):", url);
  }
}

export async function confirmPasswordReset(
  token: string,
  newPassword: string,
): Promise<boolean> {
  const email = await redis.get(CacheKeys.passwordReset(token));
  if (!email) return false;

  const passwordHash = await hashPassword(newPassword);

  await db.user.update({
    where: { email },
    data: { password: passwordHash },
  });

  await redis.del(CacheKeys.passwordReset(token));
  return true;
}
