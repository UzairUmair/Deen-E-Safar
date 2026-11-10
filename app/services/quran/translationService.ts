// Which editions the app reads, and a check that they still exist in the provider's metadata.
import { fetchEditionsForLanguage } from "../../lib/quranApi";
import type { EditionInfo, TranslationLanguage } from "./types";

/** Uthmani script with full diacritics. */
export const ARABIC_EDITION = "quran-uthmani";

// Both identifiers were confirmed against GET /edition/language/{en,ur}; verifyTranslationEdition re-checks at runtime.
export const TRANSLATION_EDITIONS: Record<TranslationLanguage, string> = { en: "en.sahih", ur: "ur.jalandhry" };

export const TRANSLATION_LABELS: Record<TranslationLanguage, string> = { en: "English — Saheeh International", ur: "اردو — فتح محمد جالندھری" };

export const SEARCH_SCOPES = {
  en: { edition: TRANSLATION_EDITIONS.en, label: "English translation (Saheeh International)" },
  ur: { edition: TRANSLATION_EDITIONS.ur, label: "Urdu translation (Jalandhry)" },
  ar: { edition: "quran-simple-clean", label: "Arabic text (without diacritics)" },
} as const;
export type SearchScope = keyof typeof SEARCH_SCOPES;

/**
 * Confirms the configured translation is still published as a text translation.
 * Returns the edition metadata, or null when the provider no longer lists it.
 */
export async function verifyTranslationEdition(language: TranslationLanguage, options?: { signal?: AbortSignal }): Promise<EditionInfo | null> {
  const editions = await fetchEditionsForLanguage(language, options);
  return editions.find((e) => e.identifier === TRANSLATION_EDITIONS[language] && e.format === "text" && e.type === "translation") ?? null;
}
