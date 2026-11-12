// Daily verse: a fixed rotation of verse references, one per calendar day.
import { getVerse } from "./quranService";
import { dailyVerseStore, type CachedDailyVerse } from "../guest/readingProgressStorage";

// References only; text always comes from the Quran provider. Each is a complete ayah
// that reads well on its own. scripts/verify-live-apis.mjs checks every reference resolves.
export const DAILY_VERSE_REFERENCES: readonly (readonly [surah: number, ayah: number])[] = [
  [2, 45], [2, 152], [2, 153], [2, 186], [2, 201], [2, 255], [2, 286], [3, 8], [3, 26], [3, 139],
  [3, 159], [3, 200], [8, 2], [9, 51], [10, 57], [13, 28], [14, 7], [16, 90], [16, 97], [17, 23],
  [20, 114], [21, 87], [24, 35], [25, 63], [29, 69], [31, 17], [33, 41], [39, 10], [39, 53], [40, 60],
  [41, 30], [49, 13], [50, 16], [51, 56], [59, 22], [64, 11], [94, 5],
];

/** The visitor's own calendar date, YYYY-MM-DD. This is the "day" the verse belongs to. */
export function localDateKey(now = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Deterministic pick: the number of days since 1970-01-01 for that calendar date,
 * modulo the rotation length. Same date, same verse, on every device and refresh.
 */
export function dailyVerseReference(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const days = Math.floor(Date.UTC(year, month - 1, day) / 86400000);
  const [surah, ayah] = DAILY_VERSE_REFERENCES[((days % DAILY_VERSE_REFERENCES.length) + DAILY_VERSE_REFERENCES.length) % DAILY_VERSE_REFERENCES.length];
  return { surah, ayah };
}

export async function getDailyVerse(dateKey: string, options?: { signal?: AbortSignal }): Promise<CachedDailyVerse> {
  const { surah, ayah } = dailyVerseReference(dateKey);
  const result = await getVerse(surah, ayah, options);
  const verse: CachedDailyVerse = {
    date: dateKey,
    surah,
    ayah,
    surahName: result.surah.englishName,
    surahArabicName: result.surah.arabicName,
    arabic: result.verse.arabic,
    translations: Object.fromEntries(Object.entries(result.translations).map(([language, t]) => [language, { text: t.text, edition: t.edition.englishName }])),
  };
  dailyVerseStore.set(verse); // kept so an outage can still show a verified verse, with its date
  return verse;
}
