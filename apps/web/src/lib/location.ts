import type { GeoLocation } from "@flipscout/types";
export type LocationErrorCode = "unsupported" | "denied" | "timeout" | "unavailable" | "invalid";
export class LocationError extends Error {
  constructor(readonly code: LocationErrorCode) { super(code); }
}
export function parseManualLocation(latitude: string, longitude: string): GeoLocation {
  if (!latitude.trim() || !longitude.trim()) throw new LocationError("invalid");
  const lat = Number(latitude), lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) throw new LocationError("invalid");
  return { latitude: lat, longitude: lng };
}
export function currentLocation(geolocation: Pick<Geolocation, "getCurrentPosition"> | undefined): Promise<GeoLocation> {
  if (!geolocation) return Promise.reject(new LocationError("unsupported"));
  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(
      position => {
        try { resolve(parseManualLocation(String(position.coords.latitude), String(position.coords.longitude))); }
        catch (e) { reject(e); }
      },
      error => reject(new LocationError(error.code === 1 ? "denied" : error.code === 3 ? "timeout" : "unavailable")),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  });
}
