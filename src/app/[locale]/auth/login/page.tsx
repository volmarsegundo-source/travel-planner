import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { LoginForm } from "@/components/features/auth/LoginForm";
import { getAvailableOAuthProviders } from "@/lib/auth-providers";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return {
    title: t("signIn"),
  };
}

export default async function LoginPage() {
  const availableProviders = getAvailableOAuthProviders();
  return <LoginForm availableProviders={availableProviders} />;
}
