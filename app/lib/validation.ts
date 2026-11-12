// Small runtime guards shared by provider adapters and guest storage.

export const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

export const isString = (value: unknown): value is string => typeof value === "string";

export const isInt = (value: unknown, min: number, max: number): value is number => typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;

export const isFiniteNumber = (value: unknown, min: number, max: number): value is number => typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;

export const isOneOf = <T extends string | number>(value: unknown, options: readonly T[]): value is T => options.includes(value as T);

export function isTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || !value) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** Surah 1–114, as an integer, from untrusted input such as a URL segment. */
export function parseSurahNumber(value: unknown): number | null {
  const text = String(value ?? "").trim();
  if (!/^\d{1,3}$/.test(text)) return null;
  const n = Number(text);
  return n >= 1 && n <= 114 ? n : null;
}

/** "2:255", "2 255" or "2/255" → reference, without knowing the surah length yet. */
export function parseVerseReference(value: string): { surah: number; ayah: number } | null {
  const match = value.trim().match(/^(\d{1,3})\s*[:/\s]\s*(\d{1,3})$/);
  if (!match) return null;
  const surah = parseSurahNumber(match[1]);
  const ayah = Number(match[2]);
  return surah && ayah >= 1 && ayah <= 286 ? { surah, ayah } : null;
}
