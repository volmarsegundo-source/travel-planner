/**
 * Mercator projection for positioning CSS pins on the static hero map SVG.
 * Pure math -- no DOM or external dependencies.
 *
 * @param lat  Latitude (-90 to 90)
 * @param lon  Longitude (-180 to 180)
 * @param width  Container width in pixels
 * @param height Container height in pixels
 * @returns { x, y } pixel coordinates
 */
export function toMercatorXY(
  lat: number,
  lon: number,
  width: number,
  height: number
): { x: number; y: number } {
  const x = ((lon + 180) / 360) * width;
  const latRad = (lat * Math.PI) / 180;
  const y =
    height / 2 -
    (width * Math.log(Math.tan(Math.PI / 4 + latRad / 2))) / (2 * Math.PI);
  return { x, y };
}
