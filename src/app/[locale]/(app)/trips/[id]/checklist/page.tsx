import { redirect, Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { AlertCircle } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { ChecklistView } from "@/components/features/checklist/ChecklistView";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { Button } from "@/components/ui/button";
import { canUseAI } from "@/lib/guards/age-guard";

interface ChecklistPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function ChecklistPage({ params }: ChecklistPageProps) {
  const { locale, id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect({ href: "/auth/login", locale });
  }

  const tCommon = await getTranslations("common");
  const tErrors = await getTranslations("errors");
  const tTrips = await getTranslations("trips");
  const tChecklist = await getTranslations("checklist");
  const tNav = await getTranslations("navigation");

  // Fetch trip with BOLA check, plus its checklist items
  const trip = await db.trip.findFirst({
    where: { id, userId: session?.user?.id ?? "", deletedAt: null },
    select: {
      id: true,
      title: true,
      destination: true,
      startDate: true,
    },
  });

  if (!trip) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <div className="rounded-lg border bg-card p-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
          </div>
          <h2 role="alert" className="text-lg font-semibold text-foreground">
            {tTrips("errors.notFound")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {tErrors("tripNotFound.description")}
          </p>
          <Button variant="outline" asChild className="min-h-[44px]">
            <Link href="/trips">{tCommon("goBackToTrips")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const checklistItems = await db.checklistItem.findMany({
    where: { tripId: id },
    orderBy: [{ category: "asc" }, { orderIndex: "asc" }],
  });

  // Age restriction check
  let ageRestricted = false;
  try {
    const profile = await db.userProfile.findUnique({ where: { userId: session?.user?.id ?? "" }, select: { birthDate: true } });
    ageRestricted = !canUseAI(profile?.birthDate);
  } catch { /* non-critical */ }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[
            { label: tNav("breadcrumb.myTrips"), href: "/trips" },
            { label: trip.title, href: `/trips/${id}` },
            { label: tNav("breadcrumb.checklist") },
          ]}
          backLabel={tNav("breadcrumb.backTo", { name: trip.title })}
        />

        {/* Header */}
        <header className="mb-8 space-y-1">
          <h1 className="text-2xl font-bold">{tChecklist("title")}</h1>
          <p className="text-muted-foreground text-sm">{trip.title}</p>
        </header>

        <ChecklistView
          tripId={trip.id}
          destination={trip.destination}
          startDate={trip.startDate}
          travelers={1}
          locale={locale}
          initialItems={checklistItems}
          isAgeRestricted={ageRestricted}
        />
      </div>
    </div>
  );
}
