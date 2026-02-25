"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrustSignals } from "./TrustSignals";
import { registerUser } from "@/server/actions/auth.actions";
import { RegisterSchema, type RegisterInput } from "@/lib/validations/user.schema";

export function RegisterForm() {
  const t = useTranslations("auth.register");

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
  });

  async function onSubmit(data: RegisterInput) {
    const result = await registerUser(data);
    if (result && !result.success) {
      setError("root", { message: result.error });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {t("google")}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-400">ou</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {errors.root && (
            <p role="alert" className="text-sm text-red-600 rounded-md bg-red-50 px-3 py-2">
              {errors.root.message}
            </p>
          )}

          <div className="space-y-1">
            <Label htmlFor="reg-email">{t("email")}</Label>
            <Input
              id="reg-email"
              type="email"
              autoComplete="email"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "reg-email-error" : undefined}
              {...register("email")}
            />
            {errors.email && (
              <p id="reg-email-error" role="alert" className="text-xs text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="reg-password">{t("password")}</Label>
            <Input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "reg-password-error" : undefined}
              {...register("password")}
            />
            {errors.password && (
              <p id="reg-password-error" role="alert" className="text-xs text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="reg-confirm">{t("confirmPassword")}</Label>
            <Input
              id="reg-confirm"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.confirmPassword}
              aria-describedby={errors.confirmPassword ? "reg-confirm-error" : undefined}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p id="reg-confirm-error" role="alert" className="text-xs text-red-600">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Criando conta...
              </>
            ) : (
              t("submit")
            )}
          </Button>
        </form>

        <TrustSignals />

        <p className="text-center text-sm text-gray-500">
          {t("hasAccount")}{" "}
          <Link
            href="/auth/login"
            className="font-medium text-orange-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded"
          >
            {t("login")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
