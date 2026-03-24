import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { LoginFormV2 } from "@/components/features/auth/LoginFormV2";
import { getAvailableOAuthProviders } from "@/lib/auth-providers";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return {
    title: t("signIn"),
  };
}

export default async function LoginPage() {
  const availableProviders = getAvailableOAuthProviders();
  return <LoginFormV2 availableProviders={availableProviders} />;
}
