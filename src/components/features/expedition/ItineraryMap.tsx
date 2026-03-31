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
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";

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
 */
function FitBounds({ positions }: { positions: L.LatLngTuple[] }) {
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
