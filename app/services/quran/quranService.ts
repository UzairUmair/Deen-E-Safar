// Application-level Quran operations. Components and hooks call these, never the provider adapter.
import { invalid } from "../../lib/apiClient";
import { fetchAyahEditions, fetchJuzStarts, fetchSurahEditions, fetchSurahList, searchEdition, QURAN_PROVIDER, type RawAyah } from "../../lib/quranApi";
import { ARABIC_EDITION, SEARCH_SCOPES, TRANSLATION_EDITIONS, type SearchScope } from "./translationService";
import type { SingleVerse, SurahContent, TranslationLanguage, Verse } from "./types";

export { QURAN_PROVIDER };

type Options = { signal?: AbortSignal };

export const getSurahs = (options?: Options) => fetchSurahList(options);

export const getJuzStarts = (options?: Options) => fetchJuzStarts(options);

function toVerse(surah: number, arabic: RawAyah, translation: string | null): Verse {
  return { surah, ayah: arabic.numberInSurah, globalNumber: arabic.number, arabic: arabic.text, translation, juz: arabic.juz, sajda: arabic.sajda };
}

/**
 * A surah in Arabic plus (optionally) one translation edition.
 * Translations are joined to the Arabic by ayah number, never by array position.
 */
export async function getSurah(surahNumber: number, translationEdition: string | null, options?: Options): Promise<SurahContent> {
  const editions = translationEdition ? [ARABIC_EDITION, translationEdition] : [ARABIC_EDITION];
  const [arabic, translation] = await fetchSurahEditions(surahNumber, editions, options);
  if (arabic.ayahs.length !== arabic.surah.ayahCount) invalid("Arabic text is incomplete");
  const byAyah = new Map((translation?.ayahs ?? []).map((a) => [a.numberInSurah, a.text]));
  const verses = [...arabic.ayahs].sort((a, b) => a.numberInSurah - b.numberInSurah).map((a) => toVerse(surahNumber, a, byAyah.get(a.numberInSurah) ?? null));
  verses.forEach((v, i) => {
    if (v.ayah !== i + 1) invalid("Ayah sequence has gaps");
  });
  return { surah: arabic.surah, verses, arabicEdition: arabic.edition, translationEdition: translation?.edition ?? null };
}

/** One ayah in Arabic with both interface translations (daily verse, bookmark previews). */
export async function getVerse(surah: number, ayah: number, options?: Options): Promise<SingleVerse> {
  const languages = Object.keys(TRANSLATION_EDITIONS) as TranslationLanguage[];
  const [arabic, ...rest] = await fetchAyahEditions(surah, ayah, [ARABIC_EDITION, ...languages.map((l) => TRANSLATION_EDITIONS[l])], options);
  const translations: SingleVerse["translations"] = {};
  rest.forEach((item, i) => {
    translations[languages[i]] = { text: item.ayah.text, edition: item.edition };
  });
  return { surah: arabic.surah, verse: toVerse(surah, arabic.ayah, null), arabicEdition: arabic.edition, translations };
}

export const SEARCH_RESULT_LIMIT = 50;

/** Literal keyword search inside one edition (not semantic search). */
export async function searchVerses(keyword: string, scope: SearchScope, options?: Options) {
  const result = await searchEdition(keyword.trim(), SEARCH_SCOPES[scope].edition, options);
  return { total: result.total, matches: result.matches.slice(0, SEARCH_RESULT_LIMIT) };
}
