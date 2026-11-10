// Internationalisation runs on i18next / react-i18next. Keys are the English strings
// themselves; translations.json maps each one to [Urdu, Arabic].
import { createContext, useContext } from "react";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import translations from "./translations.json";

export type Language = "en" | "ur" | "ar";

const dictionary = translations as Record<string, string[]>;
const ur: Record<string, string> = {};
const ar: Record<string, string> = {};
for (const [key, [urdu, arabic]] of Object.entries(dictionary)) {
  ur[key] = urdu;
  ar[key] = arabic;
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: {} }, ur: { translation: ur }, ar: { translation: ar } },
  lng: "en",
  fallbackLng: "en",
  // Keys are sentences, so "." and ":" must not be treated as separators.
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  returnNull: false,
  initAsync: false,
});

export default i18n;

/** Kept for older screens that read the language from context. */
export const LanguageContext = createContext<string>("en");
export function useSiteLanguage() {
  return useContext(LanguageContext);
}

export function setLanguage(value: string) {
  const next: Language = value === "ur" || value === "ar" ? value : "en";
  if (i18n.language !== next) i18n.changeLanguage(next);
}
export function getLanguage(): Language {
  return i18n.language === "ur" || i18n.language === "ar" ? i18n.language : "en";
}

/** Text direction for interface chrome in a language. */
export const directionOf = (language: string) => (language === "en" ? "ltr" : "rtl");

// Composite strings built by older screens ("Play verse 12") are translated piecewise.
const patterns: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^Welcome, (.+)$/, (m) => (getLanguage() === "ur" ? `خوش آمدید، ${m[1]}` : `مرحبًا، ${m[1]}`)],
  [/^Continue (.+)$/, (m) => `${tr("Continue reading")} · ${tr(m[1])}`],
  [/^(Play|Bookmark|Copy) verse (\d+)$/, (m) => `${tr(m[1])} ${tr("Verse")} ${m[2]}`],
  [/^Listen from verse (\d+)$/, (m) => `${tr("Listen from verse")} ${m[1]}`],
  [/^Reading position saved at (.+)$/, (m) => `${tr("Reading position saved")} ${m[1]}`],
  [/^(\d+) matches$/, (m) => `${m[1]} ${tr("matches")}`],
  [/^(\d+) of (\d+) completed$/, (m) => `${m[1]} / ${m[2]} ${tr("completed")}`],
  [/^(\w+) in (\d+)h (\d+)m$/, (m) => `${tr(m[1])} · ${m[2]} ${tr("hours")} ${m[3]} ${tr("minutes")}`],
  [/^Save Hadith (\d+)$/, (m) => `${tr("Save Hadith")} ${m[1]}`],
  [/^Save (.+)$/, (m) => `${tr("Save")} ${tr(m[1])}`],
  [/^Copy (.+)$/, (m) => `${tr("Copy")} ${tr(m[1])}`],
  [/^Open (.+)$/, (m) => `${tr("Open")} ${tr(m[1])}`],
  [/^(.+?) (\d+:\d+)$/, (m) => `${tr(m[1])} ${m[2]}`],
  [/^Explore (.+)$/, (m) => `${tr("Explore")} ${tr(m[1])}`],
];

/** Translates a string in the active language; non-strings pass through untouched. */
export function tr<T>(value: T): T {
  if (typeof value !== "string" || getLanguage() === "en") return value;
  const text = value.replace(/\s+/g, " ").trim();
  if (i18n.exists(text)) return i18n.t(text) as T;
  for (const [pattern, build] of patterns) {
    const match = text.match(pattern);
    if (match) return build(match) as T;
  }
  return value;
}
