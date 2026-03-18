import { describe, it, expect } from "vitest";
import { getMapTileConfig } from "@/lib/map/map-provider";

describe("getMapTileConfig", () => {
  it("returns OSM tiles for light theme", () => {
    const config = getMapTileConfig("light");
    expect(config.url).toContain("tile.openstreetmap.org");
    expect(config.attribution).toContain("OpenStreetMap");
    expect(config.maxZoom).toBe(19);
  });

  it("returns CartoDB Dark Matter tiles for dark theme", () => {
    const config = getMapTileConfig("dark");
    expect(config.url).toContain("basemaps.cartocdn.com");
    expect(config.url).toContain("dark_all");
    expect(config.attribution).toContain("CARTO");
    expect(config.maxZoom).toBe(19);
  });

  it("defaults to light theme when no argument provided", () => {
    const config = getMapTileConfig();
    expect(config.url).toContain("tile.openstreetmap.org");
  });
});
