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
  email: string,
  token: string,
): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${token}`;
  // TODO: integrate transactional email (Resend / SendGrid) before production
  console.log(`[AUTH] Verification email → ${email}\nLink: ${url}`);
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
  email: string,
  token: string,
): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${token}`;
  console.log(`[AUTH] Password reset email → ${email}\nLink: ${url}`);
}

export async function confirmPasswordReset(
  token: string,
  newPassword: string,
): Promise<boolean> {
  const email = await redis.get(CacheKeys.passwordReset(token));
  if (!email) return false;

  const passwordHash = await hashPassword(newPassword);

  // Auth.js v5 with Credentials stores password in Account model
  // Update via a custom field or user metadata — adjust per final auth schema
  await db.user.update({
    where: { email },
    data: { updatedAt: new Date() },
  });

  // Store hashed password in cache temporarily for Credentials provider
  // In production this should be a dedicated `password` field on User
  await redis.setex(`pwd:${email}`, 60 * 60 * 24 * 30, passwordHash);
  await redis.del(CacheKeys.passwordReset(token));
  return true;
}
