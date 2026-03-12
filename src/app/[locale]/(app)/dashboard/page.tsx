import { redirect } from "@/i18n/navigation";

interface DashboardPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Sprint 28: Dashboard redirects to /expeditions.
 * Navigation restructure — SPEC-PROD-012.
 */
export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params;
  redirect({ href: "/expeditions", locale });
}
