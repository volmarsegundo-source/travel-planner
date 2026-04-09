import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { RegisterFormV2 } from "@/components/features/auth/RegisterFormV2";
import { getAvailableOAuthProviders } from "@/lib/auth-providers";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return {
    title: t("signUp"),
  };
}

export default async function RegisterPage() {
  const availableProviders = getAvailableOAuthProviders();
  return <RegisterFormV2 availableProviders={availableProviders} />;
}
