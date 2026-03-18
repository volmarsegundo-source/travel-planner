import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/server/db";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { InteractiveAtlasMap } from "@/components/features/atlas/InteractiveAtlasMap";
import { buildTripGeoJSON } from "@/lib/map/build-geojson";

interface AtlasPageProps {
  params: Promise<{ locale: string }>;
}

export default async function AtlasPage({ params }: AtlasPageProps) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect({ href: "/auth/login", locale });
    return null;
  }

  const tNav = await getTranslations("navigation");
  const t = await getTranslations("atlas");

  // BOLA: userId filter ensures user can only see their own trips
  const trips = await db.trip.findMany({
    where: {
      userId: session.user.id,
      deletedAt: null,
      status: { not: "ARCHIVED" },
      destinationLat: { not: null },
      destinationLon: { not: null },
    },
    select: {
      id: true,
      destination: true,
      currentPhase: true,
      status: true,
      startDate: true,
      endDate: true,
      coverEmoji: true,
      destinationLat: true,
      destinationLon: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const geoData = buildTripGeoJSON(trips);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <Breadcrumb
        items={[
          { label: tNav("breadcrumb.home"), href: "/expeditions" },
          { label: tNav("breadcrumb.atlas") },
        ]}
      />
      <h1 className="mt-4 text-2xl font-bold text-foreground">{t("title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("pageDescription")}
      </p>
      <div className="mt-4">
        <InteractiveAtlasMap geoData={geoData} />
      </div>
    </div>
  );
}
