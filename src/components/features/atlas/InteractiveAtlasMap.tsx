"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { AtlasMapSkeleton } from "./AtlasMapSkeleton";
import { AtlasFilterChips, type AtlasFilter } from "./AtlasFilterChips";
import type { TripGeoJSON } from "@/lib/map/types";

// Leaflet requires DOM -- must use dynamic import with ssr: false
const LeafletMap = dynamic(() => import("./LeafletMapInner"), {
  ssr: false,
  loading: () => <AtlasMapSkeleton />,
});

interface InteractiveAtlasMapProps {
  geoData: TripGeoJSON;
}

export function InteractiveAtlasMap({ geoData }: InteractiveAtlasMapProps) {
  const t = useTranslations("atlas");
  const [activeFilter, setActiveFilter] = useState<AtlasFilter>("ALL");

  const counts = useMemo(() => {
    const features = geoData.features;
    return {
      all: features.length,
      planning: features.filter((f) => f.properties.status === "PLANNING")
        .length,
      inProgress: features.filter(
        (f) => f.properties.status === "IN_PROGRESS"
      ).length,
      completed: features.filter((f) => f.properties.status === "COMPLETED")
        .length,
    };
  }, [geoData.features]);

  const filteredGeoData = useMemo<TripGeoJSON>(() => {
    if (activeFilter === "ALL") return geoData;
    return {
      type: "FeatureCollection",
      features: geoData.features.filter(
        (f) => f.properties.status === activeFilter
      ),
    };
  }, [geoData, activeFilter]);

  const hasTrips = geoData.features.length > 0;

  return (
    <div className="flex flex-col gap-4" data-testid="atlas-interactive-map">
      {/* Filter chips */}
      {hasTrips && (
        <AtlasFilterChips
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          counts={counts}
        />
      )}

      {/* Map */}
      <div className="relative h-[calc(100vh-200px)] min-h-[400px] w-full rounded-xl overflow-hidden">
        <LeafletMap geoData={filteredGeoData} />

        {/* Empty state overlay */}
        {!hasTrips && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center">
            <div className="max-w-[360px] rounded-2xl bg-background p-8 text-center shadow-lg border border-border">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <svg
                  className="h-8 w-8 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 21a9 9 0 100-18 9 9 0 000 18z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6l4 2"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                {t("emptyTitle")}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("emptySubtitle")}
              </p>
              <Link href="/expedition/new">
                <Button className="mt-4" size="lg" data-testid="atlas-empty-cta">
                  {t("emptyCta")}
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
