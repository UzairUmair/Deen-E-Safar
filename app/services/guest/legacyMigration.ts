// One-time move of data saved by the first version of the site (flat `deen-*` keys)
// into the versioned guest stores. Values are re-validated by each store when read.
export const GUEST_PREFIX = "deen-v2:guest:";

const MARKER = GUEST_PREFIX + "migrated";
const LEGACY_METHODS: Record<string, number> = { Karachi: 1, MuslimWorldLeague: 3, NorthAmerica: 2, UmmAlQura: 4, Egyptian: 5, MoonsightingCommittee: 15 };

let done = false;

function parse(storage: Storage, key: string): unknown {
  try {
    const raw = storage.getItem(key);
    return raw == null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

export function migrateLegacyData(storage: Storage) {
  if (done) return;
  done = true;
  try {
    if (storage.getItem(MARKER)) return;
    const put = (name: string, data: unknown) => {
      if (storage.getItem(GUEST_PREFIX + name) == null) storage.setItem(GUEST_PREFIX + name, JSON.stringify({ v: 1, data }));
    };
    const now = new Date().toISOString();

    const verses = parse(storage, "deen-verses");
    const library = parse(storage, "deen-library-saved");
    const quran = Array.isArray(verses) ? verses.filter(record).map((v) => ({ surah: v.surah, ayah: v.ayah, addedAt: now })) : [];
    const duaIds = Array.isArray(library) ? library.filter((id): id is string => typeof id === "string" && id.startsWith("dua:")) : [];
    if (quran.length || duaIds.length) put("bookmarks", { quran, duas: duaIds.map((id) => ({ id: id.slice(4).replace(":", "-"), addedAt: now })) });
    // Hadith bookmarks stay with the Hadith library, which still owns that key.
    if (Array.isArray(library)) storage.setItem("deen-library-saved", JSON.stringify(library.filter((id) => typeof id === "string" && !id.startsWith("dua:"))));

    const reading = parse(storage, "deen-reading");
    if (record(reading)) put("reading-progress", { surah: reading.surah, ayah: reading.ayah, updatedAt: typeof reading.updated === "string" ? reading.updated : now });

    const old = parse(storage, "deen-preferences");
    const reader = parse(storage, "deen-reader-settings");
    const prayer = parse(storage, "deen-prayer");
    const name = parse(storage, "deen-profile");
    if (record(old) || record(reader) || record(prayer) || typeof name === "string") {
      const preferences: Record<string, unknown> = {};
      if (record(old)) Object.assign(preferences, { language: old.lang, theme: old.theme });
      if (typeof name === "string") preferences.displayName = name;
      if (record(reader)) preferences.quran = { arabicSize: reader.font, showTranslation: reader.translation !== "none", translation: reader.translation === "ur" ? "ur" : "en" };
      if (record(prayer))
        preferences.prayer = {
          location: { name: prayer.name, country: "", latitude: prayer.lat, longitude: prayer.lon, timezone: prayer.zone, source: "manual" },
          method: LEGACY_METHODS[String(prayer.method)] ?? 1,
          school: prayer.hanafi === false ? 0 : 1,
        };
      put("preferences", preferences);
    }
    for (const key of ["deen-verses", "deen-reading", "deen-preferences", "deen-reader-settings", "deen-prayer", "deen-profile", "deen-demo-user"]) storage.removeItem(key);
    storage.setItem(MARKER, "1");
  } catch {
    // Storage full or blocked: leave the old keys alone and carry on with defaults.
  }
}

/** Test hook: lets a fresh storage be migrated again. */
export function resetMigrationForTests() {
  done = false;
}
