export interface GeoPoint { latitude: number; longitude: number }
/** Great-circle distance in miles, not driving distance. */
export function distanceMiles(a: GeoPoint, b: GeoPoint): number {
  const radians = (n: number) => n * Math.PI / 180;
  const h = Math.sin(radians(b.latitude - a.latitude) / 2) ** 2
    + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude))
    * Math.sin(radians(b.longitude - a.longitude) / 2) ** 2;
  return 3958.7613 * 2 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, h))));
}
