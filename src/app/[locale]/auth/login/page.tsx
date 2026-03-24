import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { LoginForm } from "@/components/features/auth/LoginForm";
import { LoginFormV2 } from "@/components/features/auth/LoginFormV2";
import { DesignBranch } from "@/components/ui/DesignBranch";
import { getAvailableOAuthProviders } from "@/lib/auth-providers";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return {
    title: t("signIn"),
  };
}

export default async function LoginPage() {
  const availableProviders = getAvailableOAuthProviders();
  return (
    <DesignBranch
      v1={<LoginForm availableProviders={availableProviders} />}
      v2={<LoginFormV2 availableProviders={availableProviders} />}
    />
  );
}
