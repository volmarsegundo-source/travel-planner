"use client";

/**
 * ItineraryMap — Interactive Leaflet map for Phase 6 itinerary activities.
 *
 * Dynamically imported (SSR-incompatible) via next/dynamic.
 * Shows numbered pins for activities with coordinates, connected by a polyline.
 * Auto-fits bounds to display all pins.
 *
 * @see Phase6ItineraryV2.tsx MapPanel
 */

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import type { ComponentType } from "react";
import type {
  MapContainerProps,
  TileLayerProps,
  MarkerProps,
  PopupProps,
  PolylineProps,
} from "react-leaflet";

// ─── Dynamic imports for SSR-incompatible react-leaflet components ──────────

const MapContainer = dynamic<MapContainerProps>(
  () => import("react-leaflet").then((mod) => mod.MapContainer as unknown as ComponentType<MapContainerProps>),
  { ssr: false },
);

const TileLayer = dynamic<TileLayerProps>(
  () => import("react-leaflet").then((mod) => mod.TileLayer as unknown as ComponentType<TileLayerProps>),
  { ssr: false },
);

const Marker = dynamic<MarkerProps>(
  () => import("react-leaflet").then((mod) => mod.Marker as unknown as ComponentType<MarkerProps>),
  { ssr: false },
);

const Popup = dynamic<PopupProps>(
  () => import("react-leaflet").then((mod) => mod.Popup as unknown as ComponentType<PopupProps>),
  { ssr: false },
);

const Polyline = dynamic<PolylineProps>(
  () => import("react-leaflet").then((mod) => mod.Polyline as unknown as ComponentType<PolylineProps>),
  { ssr: false },
);

// ─── Numbered marker icon factory ───────────────────────────────────────────

function createNumberedIcon(index: number): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="
      display:flex;align-items:center;justify-content:center;
      width:28px;height:28px;border-radius:50%;
      background:#1B2A4A;color:#fff;font-weight:700;font-size:13px;
      border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);
    ">${index}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

// ─── Auto-fit bounds helper component ───────────────────────────────────────

/**
 * FitBounds is rendered inside MapContainer to imperatively
 * call fitBounds whenever the coordinates change.
 *
 * We import useMap at module level inside the dynamic wrapper,
 * but because FitBounds is only rendered client-side (inside the
 * dynamically loaded MapContainer), this is safe.
 */
const FitBounds = dynamic<{ positions: L.LatLngTuple[] }>(
  () =>
    import("react-leaflet").then((mod) => {
      const { useMap } = mod;
      function FitBoundsInner({ positions }: { positions: L.LatLngTuple[] }) {
        const map = useMap();
        const prevRef = useRef<string>("");

        useEffect(() => {
          const key = JSON.stringify(positions);
          if (key === prevRef.current || positions.length === 0) return;
          prevRef.current = key;

          const bounds = L.latLngBounds(positions.map((p) => L.latLng(p[0], p[1])));
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
        }, [positions, map]);

        return null;
      }
      return FitBoundsInner as unknown as ComponentType<{ positions: L.LatLngTuple[] }>;
    }),
  { ssr: false },
);

// ─── Public types ───────────────────────────────────────────────────────────

export interface MapActivity {
  name: string;
  coordinates: { lat: number; lng: number };
}

export interface ItineraryMapProps {
  activities: MapActivity[];
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ItineraryMap({ activities }: ItineraryMapProps) {
  const positions: L.LatLngTuple[] = activities.map((a) => [
    a.coordinates.lat,
    a.coordinates.lng,
  ]);

  const center: L.LatLngTuple =
    positions.length > 0 ? positions[0] : [0, 0];

  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom
      style={{ width: "100%", height: "100%" }}
      className="rounded-2xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {activities.map((activity, i) => (
        <Marker
          key={`${activity.name}-${i}`}
          position={[activity.coordinates.lat, activity.coordinates.lng]}
          icon={createNumberedIcon(i + 1)}
        >
          <Popup>
            <span className="font-atlas-body text-sm font-semibold text-atlas-on-surface">
              {i + 1}. {activity.name}
            </span>
          </Popup>
        </Marker>
      ))}

      {positions.length >= 2 && (
        <Polyline
          positions={positions}
          pathOptions={{
            color: "#1B2A4A",
            weight: 3,
            opacity: 0.6,
            dashArray: "8 6",
          }}
        />
      )}

      <FitBounds positions={positions} />
    </MapContainer>
  );
}
