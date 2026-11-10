"use client";
import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getDailyVerse, localDateKey } from "../services/quran/dailyVerseService";
import { getJuzStarts, getSurah, getSurahs, getVerse, searchVerses } from "../services/quran/quranService";
import { TRANSLATION_EDITIONS, verifyTranslationEdition, type SearchScope } from "../services/quran/translationService";
import type { TranslationLanguage } from "../services/quran/types";
import { dailyVerseStore } from "../services/guest/readingProgressStorage";
import { getDuas } from "../services/duas/duaService";
import { useGuestStore } from "./useGuestData";

const DAY = 24 * 60 * 60 * 1000;

/** All 114 surahs. The list is effectively immutable, so it is cached for the session. */
export const useSurahs = () => useQuery({ queryKey: ["surahs"], queryFn: ({ signal }) => getSurahs({ signal }), staleTime: DAY });

export const useJuzStarts = (enabled = true) => useQuery({ queryKey: ["juz-starts"], queryFn: ({ signal }) => getJuzStarts({ signal }), staleTime: DAY, enabled });

/** Arabic text plus one translation (or Arabic only when `translation` is null). */
export function useSurah(surah: number | null, translation: TranslationLanguage | null) {
  const edition = translation ? TRANSLATION_EDITIONS[translation] : null;
  return useQuery({
    queryKey: ["surah", surah, edition],
    queryFn: ({ signal }) => getSurah(surah!, edition, { signal }),
    enabled: surah !== null,
    staleTime: DAY,
    // Switching translation keeps the verses on screen instead of flashing a skeleton.
    placeholderData: (previous) => (previous?.surah.number === surah ? previous : undefined),
  });
}

/** Whether the configured translation edition is still listed by the provider. */
export const useTranslationEdition = (language: TranslationLanguage) => useQuery({ queryKey: ["edition", language], queryFn: ({ signal }) => verifyTranslationEdition(language, { signal }), staleTime: DAY });

export const useVerse = (surah: number, ayah: number, enabled = true) => useQuery({ queryKey: ["verse", surah, ayah], queryFn: ({ signal }) => getVerse(surah, ayah, { signal }), staleTime: DAY, enabled });

export function useDebounced<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export const MIN_SEARCH_LENGTH = 3;

/** Debounced keyword search; superseded requests are cancelled through the query signal. */
export function useVerseSearch(keyword: string, scope: SearchScope) {
  const term = useDebounced(keyword.trim(), 450);
  const query = useQuery({
    queryKey: ["verse-search", scope, term],
    queryFn: ({ signal }) => searchVerses(term, scope, { signal }),
    enabled: term.length >= MIN_SEARCH_LENGTH,
    placeholderData: keepPreviousData,
  });
  return { ...query, term, pending: keyword.trim() !== term };
}

/**
 * Today's verse. If the provider cannot be reached, falls back to the last verse that
 * loaded successfully and says so (`stale`), with the date it belongs to.
 */
export function useDailyVerse() {
  // The date is only known on the client; rendering it during prerender would mismatch.
  const [date, setDate] = useState<string | null>(null);
  useEffect(() => setDate(localDateKey()), []);
  const cached = useGuestStore(dailyVerseStore);
  const query = useQuery({ queryKey: ["daily-verse", date], queryFn: ({ signal }) => getDailyVerse(date!, { signal }), enabled: date !== null, staleTime: DAY });
  const fresh = query.data ?? (cached && cached.date === date ? cached : null);
  if (fresh) return { verse: fresh, stale: false, loading: false, error: null, retry: query.refetch };
  if (query.isError && cached) return { verse: cached, stale: true, loading: false, error: query.error, retry: query.refetch };
  return { verse: null, stale: false, loading: !query.isError, error: query.isError ? query.error : null, retry: query.refetch };
}

export const useDuas = () => useQuery({ queryKey: ["duas"], queryFn: ({ signal }) => getDuas({ signal }), staleTime: DAY });
