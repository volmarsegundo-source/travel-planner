import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { AuthenticatedNavbar } from "@/components/layout/AuthenticatedNavbar";

interface AppShellLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function AppShellLayout({ children, params }: AppShellLayoutProps) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect({ href: "/auth/login", locale });
    return null; // TypeScript: unreachable but satisfies narrowing
  }

  const user = session.user;
  const t = await getTranslations("common");

  // Derive display name: name > email local part > "Traveler"
  const displayName = user.name
    ?? user.email?.split("@")[0]
    ?? "Traveler";

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        {t("skipToContent")}
      </a>
      <AuthenticatedNavbar
        userName={displayName}
        userImage={user.image ?? null}
        userEmail={user.email ?? ""}
      />
      <main id="main-content" className="flex-1">
        {children}
      </main>
    </>
  );
}
