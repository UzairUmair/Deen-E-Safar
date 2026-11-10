// Dua library. Every entry is a complete Quran verse from the bundled, source-checked
// snapshot (public/content/duas.json, verified against QuranEnc by scripts/verify-functional.cjs).
import { getJson, invalid } from "../../lib/apiClient";
import { isInt, isRecord, isString } from "../../lib/validation";

export type Dua = {
  /** Stable id: "<surah>-<ayah>". */
  id: string;
  surah: number;
  ayah: number;
  title: string;
  category: string;
  arabic: string;
  en: string;
  ur: string;
  enNotes: string;
  urNotes: string;
};

export const DUA_SOURCE = {
  name: "QuranEnc.com",
  url: "https://quranenc.com/en/home/api",
  english: "Noor International Center, v1.1.2",
  urdu: "Muhammad Ibrahim Junagarhi, v1.1.3",
  retrieved: "23 October 2026",
};

export const duaId = (surah: number, ayah: number) => `${surah}-${ayah}`;

export function parseDuas(raw: unknown): Dua[] {
  if (!Array.isArray(raw) || !raw.length) return invalid("Malformed dua collection");
  return raw.map((item) => {
    if (!isRecord(item) || !isInt(item.surah, 1, 114) || !isInt(item.id, 1, 286) || !isString(item.title) || !isString(item.category) || !isString(item.arabic) || !isString(item.en) || !isString(item.ur)) return invalid("Malformed dua");
    return {
      id: duaId(item.surah, item.id),
      surah: item.surah,
      ayah: item.id,
      title: item.title,
      category: item.category,
      arabic: item.arabic,
      en: item.en,
      ur: item.ur,
      enNotes: isString(item.enNotes) ? item.enNotes : "",
      urNotes: isString(item.urNotes) ? item.urNotes : "",
    };
  });
}

export async function getDuas(options?: { signal?: AbortSignal }): Promise<Dua[]> {
  return parseDuas(await getJson("/content/duas.json", options));
}

const fold = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f\u064B-\u065F\u0670]/g, "");

/** Translation footnote markers such as "[1]" are reference numbers, not part of the meaning. */
export const withoutFootnoteMarks = (text: string) => text.replace(/\s*\[\d+\]/g, "").trim();

export function filterDuas(duas: Dua[], { query = "", category = "All", translate = (s: string) => s }: { query?: string; category?: string; translate?: (text: string) => string }) {
  const term = fold(query.trim());
  return duas.filter((dua) => {
    if (category !== "All" && dua.category !== category) return false;
    if (!term) return true;
    return fold([dua.title, translate(dua.title), dua.category, translate(dua.category), dua.en, dua.ur, dua.arabic, `${dua.surah}:${dua.ayah}`].join(" ")).includes(term);
  });
}

export const duaCategories = (duas: Dua[]) => [...new Set(duas.map((d) => d.category))];
