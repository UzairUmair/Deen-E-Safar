// Provider-neutral Quran shapes used by hooks and components.

export type SurahSummary = {
  number: number;
  arabicName: string;
  englishName: string;
  englishMeaning: string;
  ayahCount: number;
  revelation: "Meccan" | "Medinan";
};

export type EditionInfo = {
  identifier: string;
  name: string;
  englishName: string;
  language: string;
  direction: "rtl" | "ltr";
  format: string;
  type: string;
};

export type Verse = {
  surah: number;
  ayah: number;
  /** 1–6236; used for audio files. */
  globalNumber: number;
  arabic: string;
  translation: string | null;
  juz: number;
  sajda: boolean;
};

export type SurahContent = {
  surah: SurahSummary;
  verses: Verse[];
  arabicEdition: EditionInfo;
  translationEdition: EditionInfo | null;
};

export type SingleVerse = {
  surah: SurahSummary;
  verse: Verse;
  arabicEdition: EditionInfo;
  /** Keyed by language code ("en", "ur"). */
  translations: Record<string, { text: string; edition: EditionInfo }>;
};

export type JuzStart = { juz: number; surah: number; ayah: number };

export type SearchMatch = { surah: number; ayah: number; text: string; surahName: string; surahArabicName: string };

export type TranslationLanguage = "en" | "ur";
