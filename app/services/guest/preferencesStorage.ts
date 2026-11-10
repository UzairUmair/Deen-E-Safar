// Guest preferences: interface language, theme, reader and prayer settings.
import { PRAYER_METHOD_IDS } from "../../lib/prayerApi";
import { isFiniteNumber, isInt, isOneOf, isRecord, isString, isTimeZone } from "../../lib/validation";
import { DEFAULT_RECITER, RECITERS, type ReciterId } from "../quran/audioService";
import type { TranslationLanguage } from "../quran/types";
import { createStore } from "./guestStorage";

export const LANGUAGES = ["en", "ur", "ar"] as const;
export type Language = (typeof LANGUAGES)[number];

export type QuranPreferences = {
  arabicSize: number;
  translationSize: number;
  showTranslation: boolean;
  translation: TranslationLanguage;
  width: "comfortable" | "wide";
  spacing: "compact" | "normal" | "relaxed";
  autoAdvance: boolean;
  reciter: ReciterId;
};

export type PrayerLocation = {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  /** `default` means the visitor has not chosen a place yet. */
  source: "default" | "city" | "device" | "manual";
};

export type PrayerPreferences = { location: PrayerLocation; method: number; school: 0 | 1; hour12: boolean };

export type Preferences = { language: Language; theme: "light" | "dark"; displayName: string; quran: QuranPreferences; prayer: PrayerPreferences };

export const ARABIC_SIZE = { min: 24, max: 56 };
export const TRANSLATION_SIZE = { min: 14, max: 26 };

export const defaultQuranPreferences = (): QuranPreferences => ({ arabicSize: 34, translationSize: 17, showTranslation: true, translation: "en", width: "comfortable", spacing: "normal", autoAdvance: true, reciter: DEFAULT_RECITER });

export const defaultPrayerPreferences = (): PrayerPreferences => ({
  location: { name: "Karachi", country: "Pakistan", latitude: 24.8607, longitude: 67.0011, timezone: "Asia/Karachi", source: "default" },
  method: 1,
  school: 1,
  hour12: true,
});

const defaults = (): Preferences => ({ language: "en", theme: "light", displayName: "", quran: defaultQuranPreferences(), prayer: defaultPrayerPreferences() });

export function validateLocation(raw: unknown): PrayerLocation | null {
  if (!isRecord(raw) || !isString(raw.name) || !isFiniteNumber(raw.latitude, -90, 90) || !isFiniteNumber(raw.longitude, -180, 180) || !isTimeZone(raw.timezone)) return null;
  return {
    name: raw.name.slice(0, 80),
    country: isString(raw.country) ? raw.country.slice(0, 80) : "",
    latitude: raw.latitude,
    longitude: raw.longitude,
    timezone: raw.timezone,
    source: isOneOf(raw.source, ["default", "city", "device", "manual"] as const) ? raw.source : "manual",
  };
}

// Field by field: one bad value falls back to its default instead of discarding everything.
function validate(raw: unknown): Preferences | null {
  if (!isRecord(raw)) return null;
  const base = defaults();
  const q = isRecord(raw.quran) ? raw.quran : {};
  const p = isRecord(raw.prayer) ? raw.prayer : {};
  return {
    language: isOneOf(raw.language, LANGUAGES) ? raw.language : base.language,
    theme: isOneOf(raw.theme, ["light", "dark"] as const) ? raw.theme : base.theme,
    displayName: isString(raw.displayName) ? raw.displayName.slice(0, 60) : "",
    quran: {
      arabicSize: isFiniteNumber(q.arabicSize, ARABIC_SIZE.min, ARABIC_SIZE.max) ? q.arabicSize : base.quran.arabicSize,
      translationSize: isFiniteNumber(q.translationSize, TRANSLATION_SIZE.min, TRANSLATION_SIZE.max) ? q.translationSize : base.quran.translationSize,
      showTranslation: typeof q.showTranslation === "boolean" ? q.showTranslation : base.quran.showTranslation,
      translation: isOneOf(q.translation, ["en", "ur"] as const) ? q.translation : base.quran.translation,
      width: isOneOf(q.width, ["comfortable", "wide"] as const) ? q.width : base.quran.width,
      spacing: isOneOf(q.spacing, ["compact", "normal", "relaxed"] as const) ? q.spacing : base.quran.spacing,
      autoAdvance: typeof q.autoAdvance === "boolean" ? q.autoAdvance : base.quran.autoAdvance,
      reciter: isOneOf(
        q.reciter,
        RECITERS.map((r) => r.id),
      )
        ? q.reciter
        : base.quran.reciter,
    },
    prayer: {
      location: validateLocation(p.location) ?? base.prayer.location,
      method: isInt(p.method, 0, 99) && PRAYER_METHOD_IDS.includes(p.method) ? p.method : base.prayer.method,
      school: p.school === 0 || p.school === 1 ? p.school : base.prayer.school,
      hour12: typeof p.hour12 === "boolean" ? p.hour12 : base.prayer.hour12,
    },
  };
}

export const preferencesStore = createStore<Preferences>({ name: "preferences", version: 1, defaults, validate });
export const validatePreferences = validate;

export const updatePreferences = (patch: Partial<Preferences>) => preferencesStore.set((current) => ({ ...current, ...patch }));
export const updateQuranPreferences = (patch: Partial<QuranPreferences>) => preferencesStore.set((current) => ({ ...current, quran: { ...current.quran, ...patch } }));
export const updatePrayerPreferences = (patch: Partial<PrayerPreferences>) => preferencesStore.set((current) => ({ ...current, prayer: { ...current.prayer, ...patch } }));
export const resetQuranPreferences = () => updateQuranPreferences(defaultQuranPreferences());
export const resetPrayerPreferences = () => updatePrayerPreferences(defaultPrayerPreferences());

/** Switching the interface language also moves the reader to that language's translation. */
export function setInterfaceLanguage(language: Language) {
  return preferencesStore.set((current) => ({ ...current, language, quran: language === "ar" ? current.quran : { ...current.quran, translation: language } }));
}
