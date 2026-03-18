/**
 * Map tile configuration provider.
 * Returns tile URLs and attribution based on the current theme.
 * No API keys needed -- OSM and CartoDB tiles are freely available.
 */

export interface MapTileConfig {
  url: string;
  attribution: string;
  maxZoom: number;
}

const OSM_LIGHT: MapTileConfig = {
  url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
  maxZoom: 19,
};

const CARTO_DARK: MapTileConfig = {
  url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
  maxZoom: 19,
};

export function getMapTileConfig(
  theme: "light" | "dark" = "light"
): MapTileConfig {
  return theme === "dark" ? CARTO_DARK : OSM_LIGHT;
}
