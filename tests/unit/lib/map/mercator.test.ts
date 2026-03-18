import { describe, it, expect } from "vitest";
import { toMercatorXY } from "@/lib/map/mercator";

describe("toMercatorXY", () => {
  const WIDTH = 800;
  const HEIGHT = 400;

  it("maps equator + prime meridian to center-x", () => {
    const { x, y } = toMercatorXY(0, 0, WIDTH, HEIGHT);
    expect(x).toBeCloseTo(WIDTH / 2, 0);
    expect(y).toBeCloseTo(HEIGHT / 2, 0);
  });

  it("maps lon=-180 to left edge (x=0)", () => {
    const { x } = toMercatorXY(0, -180, WIDTH, HEIGHT);
    expect(x).toBeCloseTo(0, 0);
  });

  it("maps lon=180 to right edge (x=width)", () => {
    const { x } = toMercatorXY(0, 180, WIDTH, HEIGHT);
    expect(x).toBeCloseTo(WIDTH, 0);
  });

  it("maps positive latitude to upper half (lower y)", () => {
    const { y: yNorth } = toMercatorXY(45, 0, WIDTH, HEIGHT);
    const { y: yEquator } = toMercatorXY(0, 0, WIDTH, HEIGHT);
    expect(yNorth).toBeLessThan(yEquator);
  });

  it("maps negative latitude to lower half (higher y)", () => {
    const { y: ySouth } = toMercatorXY(-45, 0, WIDTH, HEIGHT);
    const { y: yEquator } = toMercatorXY(0, 0, WIDTH, HEIGHT);
    expect(ySouth).toBeGreaterThan(yEquator);
  });

  it("handles high latitude (85 degrees)", () => {
    const result = toMercatorXY(85, 0, WIDTH, HEIGHT);
    expect(result.x).toBeCloseTo(WIDTH / 2, 0);
    // High latitude Mercator gives y far above the map -- this is expected behavior
    expect(result.y).toBeLessThan(0);
    expect(Number.isFinite(result.y)).toBe(true);
  });

  it("handles typical city coordinates (Tokyo)", () => {
    const { x, y } = toMercatorXY(35.68, 139.69, WIDTH, HEIGHT);
    // Tokyo is in the right half, upper quarter
    expect(x).toBeGreaterThan(WIDTH / 2);
    expect(y).toBeLessThan(HEIGHT / 2);
  });

  it("handles typical city coordinates (Sydney)", () => {
    const { x, y } = toMercatorXY(-33.86, 151.20, WIDTH, HEIGHT);
    // Sydney is in the right half, lower half
    expect(x).toBeGreaterThan(WIDTH / 2);
    expect(y).toBeGreaterThan(HEIGHT / 2);
  });
});
