import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { CompleteProfileForm } from "@/components/features/auth/CompleteProfileForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.completeProfile");
  return {
    title: t("title"),
    robots: { index: false, follow: false },
  };
}

interface CompleteProfilePageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function CompleteProfilePage({
  params,
  searchParams,
}: CompleteProfilePageProps) {
  const { locale } = await params;
  const { callbackUrl } = await searchParams;

  const session = await auth();
  if (!session?.user) {
    redirect({ href: "/auth/login", locale });
    return null;
  }

  return <CompleteProfileForm callbackUrl={callbackUrl} />;
}
