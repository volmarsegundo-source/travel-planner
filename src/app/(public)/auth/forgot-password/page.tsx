"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle } from "lucide-react";
import { requestPasswordReset } from "@/server/actions/auth.actions";
import {
  ForgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/validations/user.schema";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth.forgotPassword");
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(ForgotPasswordSchema),
  });

  async function onSubmit(data: ForgotPasswordInput) {
    const formData = new FormData();
    formData.set("email", data.email);
    await requestPasswordReset(formData);
    setSent(true);
  }

  if (sent) {
    return (
      <Card>
        <CardContent className="pt-6 text-center space-y-3">
          <CheckCircle className="mx-auto h-10 w-10 text-green-500" aria-hidden="true" />
          <p className="font-medium">{t("success")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <p className="text-sm text-gray-500">{t("description")}</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="fp-email">{t("email")}</Label>
            <Input
              id="fp-email"
              type="email"
              autoComplete="email"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "fp-email-error" : undefined}
              {...register("email")}
            />
            {errors.email && (
              <p id="fp-email-error" role="alert" className="text-xs text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />Enviando...</>
            ) : t("submit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
