// Quran and Dua bookmarks. Only references are stored; text is fetched from its source when shown.
import { isInt, isRecord, isString } from "../../lib/validation";
import { createStore } from "./guestStorage";

export type QuranBookmark = { surah: number; ayah: number; addedAt: string };
export type DuaBookmark = { id: string; addedAt: string };
export type Bookmarks = { quran: QuranBookmark[]; duas: DuaBookmark[] };

export const verseId = (surah: number, ayah: number) => `${surah}:${ayah}`;
const DUA_ID = /^\d{1,3}-\d{1,3}$/;
const MAX = 2000;

function validate(raw: unknown): Bookmarks | null {
  if (!isRecord(raw) || !Array.isArray(raw.quran) || !Array.isArray(raw.duas)) return null;
  const seen = new Set<string>();
  const quran: QuranBookmark[] = [];
  for (const item of raw.quran.slice(0, MAX)) {
    if (!isRecord(item) || !isInt(item.surah, 1, 114) || !isInt(item.ayah, 1, 286) || seen.has(verseId(item.surah, item.ayah))) continue;
    seen.add(verseId(item.surah, item.ayah));
    quran.push({ surah: item.surah, ayah: item.ayah, addedAt: isString(item.addedAt) ? item.addedAt : "" });
  }
  const duas: DuaBookmark[] = [];
  for (const item of raw.duas.slice(0, MAX)) {
    if (!isRecord(item) || !isString(item.id) || !DUA_ID.test(item.id) || seen.has("dua:" + item.id)) continue;
    seen.add("dua:" + item.id);
    duas.push({ id: item.id, addedAt: isString(item.addedAt) ? item.addedAt : "" });
  }
  return { quran, duas };
}

export const bookmarkStore = createStore<Bookmarks>({ name: "bookmarks", version: 1, defaults: () => ({ quran: [], duas: [] }), validate });
export const validateBookmarks = validate;

export type ToggleResult = "added" | "removed" | "failed";

/** Adds or removes a verse bookmark and reports what actually happened. */
export function toggleVerseBookmark(surah: number, ayah: number): ToggleResult {
  const exists = bookmarkStore.get().quran.some((b) => b.surah === surah && b.ayah === ayah);
  const ok = bookmarkStore.set((current) => ({
    ...current,
    quran: exists ? current.quran.filter((b) => !(b.surah === surah && b.ayah === ayah)) : [{ surah, ayah, addedAt: new Date().toISOString() }, ...current.quran],
  }));
  return ok ? (exists ? "removed" : "added") : "failed";
}

export function toggleDuaBookmark(id: string): ToggleResult {
  const exists = bookmarkStore.get().duas.some((b) => b.id === id);
  const ok = bookmarkStore.set((current) => ({ ...current, duas: exists ? current.duas.filter((b) => b.id !== id) : [{ id, addedAt: new Date().toISOString() }, ...current.duas] }));
  return ok ? (exists ? "removed" : "added") : "failed";
}
