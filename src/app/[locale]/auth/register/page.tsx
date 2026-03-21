import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { RegisterForm } from "@/components/features/auth/RegisterForm";
import { getAvailableOAuthProviders } from "@/lib/auth-providers";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return {
    title: t("signUp"),
  };
}

export default async function RegisterPage() {
  const availableProviders = getAvailableOAuthProviders();
  return <RegisterForm availableProviders={availableProviders} />;
}
