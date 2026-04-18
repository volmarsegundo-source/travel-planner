import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/features/auth/ForgotPasswordForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return {
    title: t("forgotPassword"),
  };
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
