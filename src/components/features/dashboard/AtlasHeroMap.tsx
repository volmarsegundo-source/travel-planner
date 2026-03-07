"use client";

import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const OCEAN_BG = "#0D1B2A";
const CONTINENT_FILL = "#1E3A5F";
const CONTINENT_STROKE = "var(--atlas-gold, #C9973A)";
const CONTINENT_OPACITY = 0.4;
const PIN_COLOR = "var(--atlas-gold, #C9973A)";

// Basic coordinate lookup for destination pin placement
const CITY_COORDS: Record<string, [number, number]> = {
  tokyo: [139.69, 35.68],
  paris: [2.35, 48.85],
  london: [-0.12, 51.50],
  "new york": [-74.00, 40.71],
  "nova york": [-74.00, 40.71],
  "nova iorque": [-74.00, 40.71],
  roma: [12.49, 41.90],
  rome: [12.49, 41.90],
  barcelona: [2.17, 41.39],
  berlin: [13.40, 52.52],
  amsterdam: [4.90, 52.37],
  lisboa: [-9.14, 38.73],
  lisbon: [-9.14, 38.73],
  madrid: [-3.70, 40.41],
  dubai: [55.27, 25.20],
  bangkok: [100.50, 13.75],
  sydney: [151.20, -33.86],
  "rio de janeiro": [-43.17, -22.90],
  "são paulo": [-46.63, -23.55],
  "sao paulo": [-46.63, -23.55],
  "buenos aires": [-58.38, -34.60],
  "cidade do méxico": [-99.13, 19.43],
  "mexico city": [-99.13, 19.43],
  cairo: [31.23, 30.04],
  mumbai: [72.87, 19.07],
  singapore: [103.85, 1.28],
  singapura: [103.85, 1.28],
  seoul: [126.97, 37.56],
  seul: [126.97, 37.56],
  istanbul: [28.97, 41.00],
  istambul: [28.97, 41.00],
  moscou: [37.61, 55.75],
  moscow: [37.61, 55.75],
  lima: [-77.04, -12.04],
  santiago: [-70.64, -33.44],
  bogota: [-74.07, 4.71],
  bogotá: [-74.07, 4.71],
  havana: [-82.36, 23.11],
  cancun: [-86.85, 21.16],
  cancún: [-86.85, 21.16],
  miami: [-80.19, 25.76],
  "los angeles": [-118.24, 34.05],
  toronto: [-79.38, 43.65],
  vancouver: [-123.12, 49.28],
  "cape town": [18.42, -33.92],
  nairobi: [36.82, -1.28],
  marrakech: [-7.98, 31.63],
  atenas: [23.72, 37.97],
  athens: [23.72, 37.97],
  praga: [14.42, 50.07],
  prague: [14.42, 50.07],
  viena: [16.37, 48.20],
  vienna: [16.37, 48.20],
  zurique: [8.54, 47.37],
  zurich: [8.54, 47.37],
};

function resolveCoords(destination: string): [number, number] | null {
  const key = destination.toLowerCase().trim();
  // Exact match
  if (CITY_COORDS[key]) return CITY_COORDS[key];
  // Partial match (e.g. "Tokyo, Japan" → matches "tokyo")
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    if (key.includes(city) || city.includes(key)) return coords;
  }
  return null;
}

interface AtlasHeroMapProps {
  destinations?: string[];
}

export function AtlasHeroMap({ destinations = [] }: AtlasHeroMapProps) {
  const pins = destinations
    .map((d) => ({ name: d, coords: resolveCoords(d) }))
    .filter((p): p is { name: string; coords: [number, number] } => p.coords !== null);

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
      style={{ backgroundColor: OCEAN_BG }}
      aria-hidden="true"
    >
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 140, center: [0, 5] }}
        width={800}
        height={400}
        style={{ width: "100%", height: "100%" }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill={CONTINENT_FILL}
                stroke={CONTINENT_STROKE}
                strokeWidth={0.5}
                style={{
                  default: { outline: "none", opacity: CONTINENT_OPACITY },
                  hover: { outline: "none", opacity: CONTINENT_OPACITY },
                  pressed: { outline: "none", opacity: CONTINENT_OPACITY },
                }}
              />
            ))
          }
        </Geographies>

        {pins.map((pin, i) => (
          <Marker key={`${pin.name}-${i}`} coordinates={pin.coords}>
            <circle r={4} fill={PIN_COLOR} opacity={0.9}>
              <animate
                attributeName="r"
                values="4;7;4"
                dur="2s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.9;0.3;0.9"
                dur="2s"
                repeatCount="indefinite"
              />
            </circle>
            <circle r={2.5} fill={PIN_COLOR} />
          </Marker>
        ))}
      </ComposableMap>
    </div>
  );
}
