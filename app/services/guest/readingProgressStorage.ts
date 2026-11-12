// Last reading position, recently opened content, and the cached daily verse.
import { isInt, isOneOf, isRecord, isString } from "../../lib/validation";
import { createStore } from "./guestStorage";

export type ReadingProgress = { surah: number; ayah: number; updatedAt: string };

function validateProgress(raw: unknown): ReadingProgress | null {
  if (!isRecord(raw) || !isInt(raw.surah, 1, 114) || !isInt(raw.ayah, 1, 286) || !isString(raw.updatedAt)) return null;
  return { surah: raw.surah, ayah: raw.ayah, updatedAt: raw.updatedAt };
}

/** `null` data means the visitor has not read anything yet. */
export const readingProgressStore = createStore<ReadingProgress | null>({ name: "reading-progress", version: 1, defaults: () => null, validate: validateProgress });
export { validateProgress };

export function saveReadingProgress(surah: number, ayah: number) {
  const current = readingProgressStore.get();
  if (current?.surah === surah && current.ayah === ayah) return true;
  return readingProgressStore.set({ surah, ayah, updatedAt: new Date().toISOString() });
}

export type RecentItem = { type: "surah" | "dua"; id: string; at: string };
const RECENT_LIMIT = 8;

function validateRecent(raw: unknown): RecentItem[] | null {
  if (!Array.isArray(raw)) return null;
  return raw
    .filter((item): item is RecentItem => isRecord(item) && isOneOf(item.type, ["surah", "dua"] as const) && isString(item.id) && /^[\d-]{1,8}$/.test(item.id) && isString(item.at))
    .slice(0, RECENT_LIMIT)
    .map(({ type, id, at }) => ({ type, id, at }));
}

export const recentStore = createStore<RecentItem[]>({ name: "recent-content", version: 1, defaults: () => [], validate: validateRecent });
export { validateRecent };

export function recordRecent(type: RecentItem["type"], id: string) {
  return recentStore.set((items) => [{ type, id, at: new Date().toISOString() }, ...items.filter((item) => !(item.type === type && item.id === id))].slice(0, RECENT_LIMIT));
}

/** The last daily verse that loaded successfully, kept so an outage can show it with its date. */
export type CachedDailyVerse = {
  date: string;
  surah: number;
  ayah: number;
  surahName: string;
  surahArabicName: string;
  arabic: string;
  translations: Record<string, { text: string; edition: string }>;
};

function validateDailyVerse(raw: unknown): CachedDailyVerse | null {
  if (!isRecord(raw) || !isString(raw.date) || !isInt(raw.surah, 1, 114) || !isInt(raw.ayah, 1, 286) || !isString(raw.arabic) || !isString(raw.surahName) || !isString(raw.surahArabicName) || !isRecord(raw.translations)) return null;
  const translations: CachedDailyVerse["translations"] = {};
  for (const [language, value] of Object.entries(raw.translations)) {
    if (isRecord(value) && isString(value.text) && isString(value.edition)) translations[language] = { text: value.text, edition: value.edition };
  }
  return { date: raw.date, surah: raw.surah, ayah: raw.ayah, surahName: raw.surahName, surahArabicName: raw.surahArabicName, arabic: raw.arabic, translations };
}

export const dailyVerseStore = createStore<CachedDailyVerse | null>({ name: "daily-verse", version: 1, defaults: () => null, validate: validateDailyVerse });
export { validateDailyVerse };
