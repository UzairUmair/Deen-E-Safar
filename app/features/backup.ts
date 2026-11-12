// Validates an exported backup before it replaces saved data.
// Accepts both the current versioned guest stores and the flat keys written by the first
// version of the site (those are migrated on the next load).
import { isRecord } from "../lib/validation";
import { validateBookmarks } from "../services/guest/bookmarkStorage";
import { GUEST_PREFIX } from "../services/guest/legacyMigration";
import { validatePreferences } from "../services/guest/preferencesStorage";
import { validateDailyVerse, validateProgress, validateRecent } from "../services/guest/readingProgressStorage";

const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");
const verse = (x: unknown) => isRecord(x) && Number.isInteger(x.surah) && Number(x.surah) >= 1 && Number(x.surah) <= 114 && Number.isInteger(x.ayah) && Number(x.ayah) >= 1 && Number(x.ayah) <= 286;

// Envelope data → true when the store's own validator accepts it.
const guestStores: Record<string, (data: unknown) => boolean> = {
  preferences: (d) => validatePreferences(d) !== null,
  bookmarks: (d) => validateBookmarks(d) !== null,
  "reading-progress": (d) => d === null || validateProgress(d) !== null,
  "recent-content": (d) => validateRecent(d) !== null,
  "daily-verse": (d) => d === null || validateDailyVerse(d) !== null,
};

function validLegacy(key: string, v: unknown): boolean {
  switch (key) {
    case "deen-profile":
      return typeof v === "string" && v.length <= 60;
    case "deen-library-language":
      return ["en", "ur", "ar"].includes(v as string);
    case "deen-tasbih":
      return Number.isSafeInteger(v) && (v as number) >= 0;
    case "deen-lessons":
      return strings(v) && v.every((s) => /^([0-9]|1[0-4])$/.test(s));
    case "deen-library-saved":
      return strings(v) && v.every((s) => /^(dua:\d+:\d+|hadith:\d+)$/.test(s));
    case "deen-notes":
      return isRecord(v) && Object.values(v).every((s) => typeof s === "string");
    case "deen-reading":
      return v === null || (verse(v) && isRecord(v) && typeof v.name === "string" && typeof v.updated === "string");
    case "deen-verses":
      return Array.isArray(v) && v.every((x) => verse(x) && typeof (x as Record<string, unknown>).label === "string");
    case "deen-reader-settings":
      return isRecord(v) && typeof v.font === "number" && v.font >= 26 && v.font <= 56 && ["en", "ur", "none"].includes(String(v.translation)) && typeof v.focus === "boolean";
    case "deen-prayer": {
      if (!isRecord(v) || typeof v.name !== "string" || typeof v.lat !== "number" || !Number.isFinite(v.lat) || Math.abs(v.lat) > 90 || typeof v.lon !== "number" || !Number.isFinite(v.lon) || Math.abs(v.lon) > 180) return false;
      if (typeof v.zone !== "string" || !["Karachi", "MuslimWorldLeague", "NorthAmerica", "UmmAlQura", "Egyptian", "MoonsightingCommittee"].includes(String(v.method)) || typeof v.hanafi !== "boolean") return false;
      new Intl.DateTimeFormat("en", { timeZone: v.zone }); // throws on an unknown zone
      return true;
    }
    case "deen-reminders-v2":
      return Array.isArray(v) && v.length <= 20 && v.every((x) => isRecord(x) && typeof x.id === "string" && typeof x.title === "string" && typeof x.enabled === "boolean" && typeof x.time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(x.time));
    case "deen-preferences":
      return isRecord(v) && strings(v.saved) && strings(v.done) && ["light", "dark"].includes(String(v.theme)) && ["en", "ur", "ar"].includes(String(v.lang)) && isRecord(v.reminders) && isRecord(v.times);
    default:
      throw Error("Unknown key");
  }
}

export function validateBackup(value: unknown): Record<string, string> {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.data)) throw Error("Invalid backup");
  const data: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value.data)) {
    if (typeof raw !== "string" || raw.length > 1000000) throw Error("Invalid entry");
    if (key.startsWith("deen-reminder-fired")) continue;
    if (key.startsWith("note-") || ["deen-demo-user", "deen-frequency", "deen-timezone", GUEST_PREFIX + "migrated"].includes(key)) {
      data[key] = raw;
      continue;
    }
    const parsed: unknown = JSON.parse(raw);
    if (key.startsWith(GUEST_PREFIX)) {
      const check = guestStores[key.slice(GUEST_PREFIX.length)];
      if (!check) throw Error("Unknown key");
      if (!isRecord(parsed) || parsed.v !== 1 || !check(parsed.data)) throw Error("Invalid field");
    } else if (!validLegacy(key, parsed)) throw Error("Invalid field");
    data[key] = raw;
  }
  return data;
}
