"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useTheme } from "next-themes";
import { getMapTileConfig } from "@/lib/map/map-provider";
import { TripMarkerPopup } from "./TripMarkerPopup";
import { PIN_COLORS } from "@/lib/map/types";
import type { TripGeoJSON, TripGeoFeature, TripPinStatus } from "@/lib/map/types";

import "leaflet/dist/leaflet.css";

// ─── Fix Leaflet default icon path issue with bundlers ─────────────────────
// Leaflet expects marker images at a path relative to the CSS file,
// but bundlers break this. We override to use /public/leaflet/ assets.
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

// ─── Constants ─────────────────────────────────────────────────────────────

const DEFAULT_CENTER: L.LatLngExpression = [20, 0];
const DEFAULT_ZOOM = 2;
const PIN_RADIUS = 10;

// ─── Custom divIcon factory ────────────────────────────────────────────────

function createPinIcon(status: TripPinStatus): L.DivIcon {
  const color = PIN_COLORS[status];
  const isInProgress = status === "IN_PROGRESS";
  const isPlanning = status === "PLANNING";

  const borderStyle = isPlanning ? "2px dashed white" : "2px solid white";
  const pulseAnimation = isInProgress
    ? "animation: atlas-pin-pulse 2s ease-in-out infinite;"
    : "";

  return L.divIcon({
    className: "atlas-pin-icon",
    html: `<div style="
      width: ${PIN_RADIUS * 2}px;
      height: ${PIN_RADIUS * 2}px;
      border-radius: 50%;
      background-color: ${color};
      border: ${borderStyle};
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      ${pulseAnimation}
    " role="button" tabindex="0"></div>`,
    iconSize: [PIN_RADIUS * 2, PIN_RADIUS * 2],
    iconAnchor: [PIN_RADIUS, PIN_RADIUS],
    popupAnchor: [0, -PIN_RADIUS],
  });
}

// ─── Auto-fit bounds helper ────────────────────────────────────────────────

function FitBoundsToFeatures({ features }: { features: TripGeoFeature[] }) {
  const map = useMap();

  useEffect(() => {
    if (features.length === 0) return;

    const bounds = L.latLngBounds(
      features.map((f) => [
        f.geometry.coordinates[1], // lat
        f.geometry.coordinates[0], // lon
      ])
    );

    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
  }, [map, features]);

  return null;
}

// ─── Theme-reactive tile layer ─────────────────────────────────────────────

function ThemeTileLayer() {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? "dark" : "light";
  const config = getMapTileConfig(theme);

  return (
    <TileLayer
      key={theme}
      url={config.url}
      attribution={config.attribution}
      maxZoom={config.maxZoom}
    />
  );
}

// ─── Main LeafletMapInner component ────────────────────────────────────────

interface LeafletMapInnerProps {
  geoData: TripGeoJSON;
}

export default function LeafletMapInner({ geoData }: LeafletMapInnerProps) {
  const mapRef = useRef<L.Map | null>(null);

  const iconCache = useMemo(() => {
    const cache = new Map<TripPinStatus, L.DivIcon>();
    (["PLANNING", "IN_PROGRESS", "COMPLETED"] as const).forEach((status) => {
      cache.set(status, createPinIcon(status));
    });
    return cache;
  }, []);

  return (
    <>
      {/* Inject pulse animation CSS */}
      <style>{`
        @keyframes atlas-pin-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        @media (prefers-reduced-motion: reduce) {
          .atlas-pin-icon div {
            animation: none !important;
          }
        }
        .atlas-pin-icon {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
      <div role="region" aria-label="Interactive destination map" data-testid="atlas-map-container">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        className="h-full w-full rounded-xl"
        style={{ minHeight: "400px", background: "#0D1B2A" }}
        ref={mapRef}
      >
        <ThemeTileLayer />
        <FitBoundsToFeatures features={geoData.features} />

        {geoData.features.map((feature) => {
          const [lon, lat] = feature.geometry.coordinates;
          const icon = iconCache.get(feature.properties.status);

          return (
            <Marker
              key={feature.properties.tripId}
              position={[lat!, lon!]}
              icon={icon}
              title={`${feature.properties.destination}, ${feature.properties.status.toLowerCase()}`}
            >
              <Popup>
                <TripMarkerPopup feature={feature.properties} />
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      </div>
    </>
  );
}
