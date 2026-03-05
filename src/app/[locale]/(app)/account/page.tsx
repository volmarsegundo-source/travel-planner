import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { ProfileForm } from "@/components/features/account/ProfileForm";
import { DeleteAccountSection } from "@/components/features/account/DeleteAccountSection";
import { db } from "@/server/db";

interface AccountPageProps {
  params: Promise<{ locale: string }>;
}

export default async function AccountPage({ params }: AccountPageProps) {
  const { locale } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect({ href: "/auth/login", locale });
  }

  const userId = session!.user!.id!;
  const tNav = await getTranslations("navigation");
  const t = await getTranslations("account");

  // Fetch full user record (including preferredLocale which is not in session)
  const user = await db.user.findUnique({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      preferredLocale: true,
    },
  });

  if (!user) {
    return redirect({ href: "/auth/login", locale });
  }

  const userName = user.name ?? "";
  const userEmail = user.email;
  const userLocale = user.preferredLocale ?? locale;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
      <Breadcrumb
        items={[
          { label: tNav("breadcrumb.home"), href: "/trips" },
          { label: tNav("breadcrumb.account") },
        ]}
      />

      <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
        {t("title")}
      </h1>

      <div className="mt-8 space-y-8">
        <ProfileForm
          userName={userName}
          userEmail={userEmail}
          preferredLocale={userLocale}
        />

        <DeleteAccountSection userEmail={userEmail} />
      </div>
    </div>
  );
}
