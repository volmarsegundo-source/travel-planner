"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { resetPassword } from "@/server/actions/auth.actions";
import {
  ResetPasswordSchema,
  type ResetPasswordInput,
} from "@/lib/validations/user.schema";

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const t = useTranslations("auth.resetPassword");
  const { token } = use(searchParams);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(ResetPasswordSchema),
  });

  async function onSubmit(data: ResetPasswordInput) {
    if (!token) {
      setError("root", { message: "Link inválido." });
      return;
    }
    const formData = new FormData();
    formData.set("password", data.password);
    formData.set("confirmPassword", data.confirmPassword);
    const result = await resetPassword(token, formData);
    if (result && !result.success) {
      setError("root", { message: result.error });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {errors.root && (
            <p role="alert" className="text-sm text-red-600 rounded-md bg-red-50 px-3 py-2">
              {errors.root.message}
            </p>
          )}
          <div className="space-y-1">
            <Label htmlFor="rp-password">{t("password")}</Label>
            <Input id="rp-password" type="password" autoComplete="new-password"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "rp-pw-error" : undefined}
              {...register("password")} />
            {errors.password && (
              <p id="rp-pw-error" role="alert" className="text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="rp-confirm">{t("confirmPassword")}</Label>
            <Input id="rp-confirm" type="password" autoComplete="new-password"
              aria-invalid={!!errors.confirmPassword}
              aria-describedby={errors.confirmPassword ? "rp-confirm-error" : undefined}
              {...register("confirmPassword")} />
            {errors.confirmPassword && (
              <p id="rp-confirm-error" role="alert" className="text-xs text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />Redefinindo...</>
            ) : t("submit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
