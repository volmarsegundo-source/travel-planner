"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { toMercatorXY } from "@/lib/map/mercator";
import { PIN_COLORS, type TripPinStatus } from "@/lib/map/types";

const OCEAN_BG = "#0D1B2A";
const CONTINENT_FILL = "#1E3A5F";
const MAP_WIDTH = 800;
const MAP_HEIGHT = 400;

interface HeroMapPin {
  lat: number;
  lon: number;
  status: TripPinStatus;
}

interface AtlasHeroMapProps {
  pins: HeroMapPin[];
}

/**
 * Decorative hero map using CSS-positioned pins on a static SVG world map.
 * No JS map library -- zero bundle cost. Uses Mercator projection for pin placement.
 *
 * Replaced react-simple-maps implementation (Sprint 31, ADR-019-IMPL).
 */
export function AtlasHeroMap({ pins = [] }: AtlasHeroMapProps) {
  const t = useTranslations("atlas");

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
      style={{ backgroundColor: OCEAN_BG }}
      aria-hidden="true"
    >
      {/* Simple SVG world map outline */}
      <svg
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Simplified continent outlines */}
        <ellipse
          cx={400} cy={180} rx={340} ry={150}
          fill={CONTINENT_FILL}
          opacity={0.15}
          stroke="none"
        />
      </svg>

      {/* CSS-positioned pins */}
      {pins.map((pin, index) => {
        const { x, y } = toMercatorXY(pin.lat, pin.lon, MAP_WIDTH, MAP_HEIGHT);
        const color = PIN_COLORS[pin.status];
        // Convert pixel coords to percentages for responsive sizing
        const leftPercent = (x / MAP_WIDTH) * 100;
        const topPercent = (y / MAP_HEIGHT) * 100;

        return (
          <div
            key={`${pin.lat}-${pin.lon}-${index}`}
            className="absolute"
            style={{
              left: `${leftPercent}%`,
              top: `${topPercent}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div
              className="h-3 w-3 rounded-full"
              style={{
                backgroundColor: color,
                border: "1.5px solid white",
                boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
              }}
            />
          </div>
        );
      })}

      {/* "View full map" link -- interactive (pointer-events-auto) */}
      <div className="pointer-events-auto absolute bottom-3 right-3">
        <Link
          href="/atlas"
          className="text-xs text-atlas-on-surface-variant hover:text-atlas-on-surface transition-colors"
        >
          {t("viewFullMap")} &rarr;
        </Link>
      </div>
    </div>
  );
}
