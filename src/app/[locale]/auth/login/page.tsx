import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { LoginForm } from "@/components/features/auth/LoginForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return {
    title: t("signIn"),
  };
}

export default async function LoginPage() {
  return <LoginForm />;
}
