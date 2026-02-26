import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { ChecklistView } from "@/components/features/checklist/ChecklistView";

interface ChecklistPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function ChecklistPage({ params }: ChecklistPageProps) {
  const { locale, id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${locale}/auth/login`);
  }

  const t = await getTranslations("common");
  const tTrips = await getTranslations("trips");
  const tChecklist = await getTranslations("checklist");

  // Fetch trip with BOLA check, plus its checklist items
  const trip = await db.trip.findFirst({
    where: { id, userId: session.user.id, deletedAt: null },
    select: {
      id: true,
      title: true,
      destination: true,
      startDate: true,
    },
  });

  if (!trip) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-muted-foreground">{tTrips("errors.notFound")}</p>
        <Link
          href={`/${locale}/trips`}
          className="text-sm text-primary underline underline-offset-4"
        >
          {t("back")}
        </Link>
      </div>
    );
  }

  const checklistItems = await db.checklistItem.findMany({
    where: { tripId: id },
    orderBy: [{ category: "asc" }, { orderIndex: "asc" }],
  });

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href={`/${locale}/trips/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          {t("back")}
        </Link>

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
        />
      </div>
    </main>
  );
}
