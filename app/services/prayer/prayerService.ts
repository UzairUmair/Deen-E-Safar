// Application-level prayer-time operations shared by the Prayer Times page and every widget.
import { fetchTimings, PRAYER_PROVIDER, type TimingsRequest, type TimingsResponse } from "../../lib/prayerApi";
import type { PrayerPreferences } from "../guest/preferencesStorage";

export { PRAYER_PROVIDER };

export function timingsRequest(prayer: PrayerPreferences, date: string): TimingsRequest {
  const { latitude, longitude, timezone } = prayer.location;
  return { date, latitude, longitude, timezone, method: prayer.method, school: prayer.school };
}

/** Stable cache identity: one entry per date, place and calculation setting. */
export function timingsKey(request: TimingsRequest) {
  return ["prayer-timings", request.date, request.latitude, request.longitude, request.timezone, request.method, request.school] as const;
}

export function getTimings(request: TimingsRequest, options?: { signal?: AbortSignal }): Promise<TimingsResponse> {
  return fetchTimings(request, options);
}

export type DeviceLocationError = "unsupported" | "denied" | "unavailable" | "timeout";

/** Asks the browser for the device position. Only ever called from a button press. */
export function requestDeviceLocation(): Promise<{ latitude: number; longitude: number; timezone: string }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return reject("unsupported" satisfies DeviceLocationError);
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          // Two decimals (about 1 km) is plenty for prayer times and avoids storing a precise position.
          latitude: Math.round(position.coords.latitude * 100) / 100,
          longitude: Math.round(position.coords.longitude * 100) / 100,
          // The device is at this position, so its own zone is the location's zone.
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      (error) => reject((error.code === error.PERMISSION_DENIED ? "denied" : error.code === error.TIMEOUT ? "timeout" : "unavailable") satisfies DeviceLocationError),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 },
    );
  });
}
