"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/server/db/client";
import {
  hashPassword,
  createVerificationToken,
  sendVerificationEmail,
  verifyEmailToken,
  createPasswordResetToken,
  sendPasswordResetEmail,
  confirmPasswordReset,
} from "@/server/services/auth.service";
import {
  RegisterSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  type RegisterInput,
} from "@/lib/validations/user.schema";
import { checkRateLimit } from "@/server/lib/rate-limit";
import { CacheKeys, RateLimit } from "@/server/cache/keys";

export async function registerUser(data: RegisterInput) {
  const parsed = RegisterSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const ip = (await headers()).get("x-forwarded-for") ?? "unknown";
  const rl = await checkRateLimit(
    CacheKeys.rateAuth(ip),
    RateLimit.AUTH_MAX,
    RateLimit.AUTH_WINDOW,
  );
  if (!rl.allowed) {
    return {
      success: false as const,
      error: "Muitas tentativas. Tente novamente em alguns minutos.",
    };
  }

  const { email, password } = parsed.data;

  let redirectTo: string | undefined;
  try {
    const existing = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      // Do not reveal whether email exists — return same message
      return { success: false as const, error: "Não foi possível criar a conta. Tente novamente." };
    }

    const passwordHash = await hashPassword(password);

    await db.user.create({
      data: { email, name: null, emailVerified: null, password: passwordHash },
    });

    const token = await createVerificationToken(email);
    await sendVerificationEmail(email, token);

    redirectTo = `/auth/verify-email?email=${encodeURIComponent(email)}`;
  } catch {
    return { success: false as const, error: "Erro ao criar conta. Tente novamente." };
  }

  redirect(redirectTo!);
}

export async function verifyEmail(token: string) {
  let redirectTo: string | undefined;
  try {
    const ok = await verifyEmailToken(token);
    if (!ok) {
      return { success: false as const, error: "Link inválido ou expirado." };
    }
    redirectTo = "/auth/login?verified=1";
  } catch {
    return { success: false as const, error: "Erro ao verificar e-mail." };
  }
  redirect(redirectTo!);
}

export async function requestPasswordReset(formData: FormData) {
  const email = formData.get("email") as string;
  const parsed = ForgotPasswordSchema.safeParse({ email });
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "E-mail inválido." };
  }

  const ip = (await headers()).get("x-forwarded-for") ?? "unknown";
  const rl = await checkRateLimit(
    CacheKeys.rateAuth(ip),
    RateLimit.AUTH_MAX,
    RateLimit.AUTH_WINDOW,
  );
  if (!rl.allowed) {
    return {
      success: false as const,
      error: "Muitas tentativas. Tente novamente em alguns minutos.",
    };
  }

  try {
    // Always return success to avoid user enumeration
    const user = await db.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });
    if (user) {
      const token = await createPasswordResetToken(parsed.data.email);
      await sendPasswordResetEmail(parsed.data.email, token);
    }
  } catch {
    // Swallow error — do not reveal failures
  }

  return { success: true as const };
}

export async function resetPassword(token: string, formData: FormData) {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  const parsed = ResetPasswordSchema.safeParse({ password, confirmPassword });
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  let redirectTo: string | undefined;
  try {
    const ok = await confirmPasswordReset(token, parsed.data.password);
    if (!ok) {
      return { success: false as const, error: "Link inválido ou expirado. Solicite um novo." };
    }
    redirectTo = "/auth/login?reset=1";
  } catch {
    return { success: false as const, error: "Erro ao redefinir senha." };
  }

  redirect(redirectTo!);
}
