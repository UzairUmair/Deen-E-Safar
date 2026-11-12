// Provider adapter: AlAdhan Prayer Times API (https://aladhan.com/prayer-times-api).
import { getJson, invalid } from "./apiClient";
import { isInt, isRecord, isString } from "./validation";

const BASE = "https://api.aladhan.com/v1";

export const PRAYER_PROVIDER = { name: "AlAdhan", url: "https://aladhan.com/prayer-times-api" };

// Identifiers as published by GET /v1/methods (checked live when this adapter was written).
export const PRAYER_METHODS = [
  { id: 1, name: "University of Islamic Sciences, Karachi" },
  { id: 3, name: "Muslim World League" },
  { id: 2, name: "Islamic Society of North America (ISNA)" },
  { id: 4, name: "Umm Al-Qura University, Makkah" },
  { id: 5, name: "Egyptian General Authority of Survey" },
  { id: 15, name: "Moonsighting Committee Worldwide" },
  { id: 8, name: "Gulf Region" },
  { id: 13, name: "Diyanet İşleri Başkanlığı, Turkey" },
  { id: 17, name: "Jabatan Kemajuan Islam Malaysia (JAKIM)" },
  { id: 20, name: "Kementerian Agama Republik Indonesia" },
] as const;
export const PRAYER_METHOD_IDS: readonly number[] = PRAYER_METHODS.map((m) => m.id);

/** Asr shadow rule: 0 = Shafi, Maliki, Hanbali (standard); 1 = Hanafi. */
export const ASR_SCHOOLS = [
  { id: 0, name: "Standard (Shafi, Maliki, Hanbali)" },
  { id: 1, name: "Hanafi" },
] as const;

export const PRAYER_KEYS = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;
export type PrayerKey = (typeof PRAYER_KEYS)[number];

export type TimingsRequest = {
  /** Calendar date at the location, YYYY-MM-DD. */
  date: string;
  latitude: number;
  longitude: number;
  method: number;
  school: number;
  timezone: string;
};

export type TimingsResponse = {
  date: string;
  /** Absolute instants as ISO 8601 strings with the location's UTC offset. */
  timings: Record<PrayerKey, string>;
  timezone: string;
  method: { id: number; name: string };
  hijri: { day: number; monthNumber: number; monthEn: string; monthAr: string; year: number } | null;
};

export function timingsUrl(request: TimingsRequest) {
  const [year, month, day] = request.date.split("-");
  const query = new URLSearchParams({
    latitude: String(request.latitude),
    longitude: String(request.longitude),
    method: String(request.method),
    school: String(request.school),
    timezonestring: request.timezone,
    iso8601: "true",
  });
  return `${BASE}/timings/${day}-${month}-${year}?${query}`;
}

export function parseTimings(body: unknown, request: TimingsRequest): TimingsResponse {
  if (!isRecord(body) || body.code !== 200 || !isRecord(body.data)) return invalid("Unexpected envelope");
  const { timings: raw, meta, date } = body.data;
  if (!isRecord(raw) || !isRecord(meta)) return invalid("Malformed timings");
  const timings = {} as Record<PrayerKey, string>;
  for (const key of PRAYER_KEYS) {
    const value = raw[key];
    if (!isString(value) || Number.isNaN(Date.parse(value))) return invalid(`Missing ${key} time`);
    timings[key] = value;
  }
  const method = isRecord(meta.method) && isInt(meta.method.id, 0, 99) && isString(meta.method.name) ? { id: meta.method.id, name: meta.method.name } : { id: request.method, name: "" };
  let hijri: TimingsResponse["hijri"] = null;
  const h = isRecord(date) ? date.hijri : null;
  if (isRecord(h) && isRecord(h.month) && isInt(h.month.number, 1, 12)) {
    const day = Number(h.day);
    const year = Number(h.year);
    if (Number.isInteger(day) && Number.isInteger(year)) hijri = { day, monthNumber: h.month.number, monthEn: isString(h.month.en) ? h.month.en : "", monthAr: isString(h.month.ar) ? h.month.ar : "", year };
  }
  return { date: request.date, timings, timezone: isString(meta.timezone) ? meta.timezone : request.timezone, method, hijri };
}

export async function fetchTimings(request: TimingsRequest, options: { signal?: AbortSignal } = {}): Promise<TimingsResponse> {
  return parseTimings(await getJson(timingsUrl(request), options), request);
}
