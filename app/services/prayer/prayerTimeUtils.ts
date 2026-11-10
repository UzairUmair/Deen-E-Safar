// Pure time arithmetic for prayer schedules. Everything works on absolute instants
// (the provider returns ISO timestamps with the location's offset), so the visitor's
// own clock zone and daylight-saving changes never enter the comparison.
import { PRAYER_KEYS, type PrayerKey, type TimingsResponse } from "../../lib/prayerApi";

export type ScheduleEntry = { key: PrayerKey; time: Date };

/** The five prayers a countdown can point at (sunrise is shown but is not a prayer). */
const COUNTED: readonly PrayerKey[] = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

/** Calendar date (YYYY-MM-DD) at an IANA time zone for a given instant. */
export function dateInZone(now: Date, zone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Calendar arithmetic on a YYYY-MM-DD string, independent of any time zone. */
export function addDays(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function isDateString(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export function buildSchedule(response: TimingsResponse): ScheduleEntry[] {
  return PRAYER_KEYS.map((key) => ({ key, time: new Date(response.timings[key]) }));
}

export type NextPrayer = { key: PrayerKey; time: Date; tomorrow: boolean };

/**
 * The next of the five prayers strictly after `now`. Once today's Isha has passed it is
 * tomorrow's Fajr; null means tomorrow's schedule is needed but not loaded yet.
 */
export function findNextPrayer(today: ScheduleEntry[], tomorrow: ScheduleEntry[] | null, now: number): NextPrayer | null {
  const upcoming = today.find((entry) => COUNTED.includes(entry.key) && entry.time.getTime() > now);
  if (upcoming) return { ...upcoming, tomorrow: false };
  const later = tomorrow?.find((entry) => COUNTED.includes(entry.key) && entry.time.getTime() > now);
  return later ? { ...later, tomorrow: true } : null;
}

/** True once every counted prayer today is in the past, i.e. tomorrow's schedule is required. */
export function needsTomorrow(today: ScheduleEntry[], now: number) {
  return !today.some((entry) => COUNTED.includes(entry.key) && entry.time.getTime() > now);
}

/** HH:MM:SS, never negative. */
export function formatCountdown(milliseconds: number) {
  const total = Math.max(0, Math.ceil(milliseconds / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

/** Clock time at the location's zone. Latin digits are kept so times read the same in every interface language. */
export function formatClock(time: Date, zone: string, hour12: boolean) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", hour12, hourCycle: hour12 ? "h12" : "h23" }).format(time).toUpperCase();
}

export function formatLongDate(date: string, language: string) {
  const locale = language === "ur" ? "ur-PK-u-nu-latn" : language === "ar" ? "ar-u-nu-latn" : "en-GB";
  return new Intl.DateTimeFormat(locale, { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${date}T00:00:00Z`));
}

const KAABA = { latitude: 21.4225, longitude: 39.8262 };
const RAD = Math.PI / 180;

/** Initial great-circle bearing to the Kaaba, in degrees clockwise from true north. */
export function qiblaBearing(latitude: number, longitude: number) {
  const dLon = (KAABA.longitude - longitude) * RAD;
  const y = Math.sin(dLon);
  const x = Math.cos(latitude * RAD) * Math.tan(KAABA.latitude * RAD) - Math.sin(latitude * RAD) * Math.cos(dLon);
  return (Math.atan2(y, x) / RAD + 360) % 360;
}
