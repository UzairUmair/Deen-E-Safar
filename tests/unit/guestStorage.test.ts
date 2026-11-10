import { describe, expect, it, vi } from "vitest";
import { validateBackup } from "../../app/features/backup";
import { bookmarkStore, toggleDuaBookmark, toggleVerseBookmark } from "../../app/services/guest/bookmarkStorage";
import { clearGuestData, createStore, exportGuestData, GUEST_PREFIX, replaceGuestData } from "../../app/services/guest/guestStorage";
import { preferencesStore, resetPrayerPreferences, setInterfaceLanguage, updatePrayerPreferences, updateQuranPreferences } from "../../app/services/guest/preferencesStorage";
import { readingProgressStore, recentStore, recordRecent, saveReadingProgress } from "../../app/services/guest/readingProgressStorage";

const raw = (name: string) => localStorage.getItem(GUEST_PREFIX + name);
/** What a fresh page load would see: every in-memory snapshot dropped, localStorage kept. */
const reload = () => window.dispatchEvent(new StorageEvent("storage", { key: null }));

describe("guest storage", () => {
  it("writes versioned envelopes under the deen-v2:guest: prefix", () => {
    toggleVerseBookmark(2, 255);
    expect(JSON.parse(raw("bookmarks")!)).toMatchObject({ v: 1, data: { quran: [{ surah: 2, ayah: 255 }], duas: [] } });
    expect(Object.keys(localStorage).every((key) => key.startsWith(GUEST_PREFIX))).toBe(true);
  });

  it("survives a reload", () => {
    toggleVerseBookmark(18, 10);
    saveReadingProgress(36, 12);
    updateQuranPreferences({ arabicSize: 40, translation: "ur" });
    reload();
    expect(bookmarkStore.get().quran).toMatchObject([{ surah: 18, ayah: 10 }]);
    expect(readingProgressStore.get()).toMatchObject({ surah: 36, ayah: 12 });
    expect(preferencesStore.get().quran).toMatchObject({ arabicSize: 40, translation: "ur" });
  });

  it("recovers from corrupt JSON and unknown schema versions", () => {
    localStorage.setItem(GUEST_PREFIX + "bookmarks", "{not json");
    localStorage.setItem(GUEST_PREFIX + "reading-progress", JSON.stringify({ v: 99, data: { surah: 2, ayah: 1, updatedAt: "x" } }));
    reload();
    expect(bookmarkStore.get()).toEqual({ quran: [], duas: [] });
    expect(readingProgressStore.get()).toBeNull();
    expect(raw("bookmarks")).toBeNull(); // the bad value is discarded, not left to fail again
    expect(toggleVerseBookmark(1, 1)).toBe("added");
  });

  it("drops invalid entries but keeps valid ones", () => {
    localStorage.setItem(GUEST_PREFIX + "bookmarks", JSON.stringify({ v: 1, data: { quran: [{ surah: 2, ayah: 255 }, { surah: 200, ayah: 1 }, { surah: 2, ayah: 255 }, "junk"], duas: [{ id: "2-201" }, { id: "<script>" }] } }));
    reload();
    expect(bookmarkStore.get().quran.map((b) => `${b.surah}:${b.ayah}`)).toEqual(["2:255"]);
    expect(bookmarkStore.get().duas.map((b) => b.id)).toEqual(["2-201"]);
  });

  it("repairs individual bad preference fields instead of resetting everything", () => {
    localStorage.setItem(GUEST_PREFIX + "preferences", JSON.stringify({ v: 1, data: { language: "ur", theme: "neon", quran: { arabicSize: 9999, translation: "ur" }, prayer: { method: 3, school: 7, location: { name: "X", latitude: 999, longitude: 0, timezone: "Asia/Karachi" } } } }));
    reload();
    const p = preferencesStore.get();
    expect(p.language).toBe("ur");
    expect(p.theme).toBe("light");
    expect(p.quran.arabicSize).toBe(34);
    expect(p.quran.translation).toBe("ur");
    expect(p.prayer.method).toBe(3);
    expect(p.prayer.school).toBe(1);
    expect(p.prayer.location.name).toBe("Karachi"); // invalid coordinates → default place
  });

  it("toggles bookmarks and reports the real outcome", () => {
    expect(toggleVerseBookmark(2, 255)).toBe("added");
    expect(toggleVerseBookmark(2, 255)).toBe("removed");
    expect(toggleDuaBookmark("2-201")).toBe("added");
    expect(bookmarkStore.get()).toMatchObject({ quran: [], duas: [{ id: "2-201" }] });
  });

  it("reports failure when the browser refuses the write", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    expect(toggleVerseBookmark(3, 8)).toBe("failed");
    expect(saveReadingProgress(3, 8)).toBe(false);
    spy.mockRestore();
    expect(bookmarkStore.get().quran).toEqual([]);
  });

  it("notifies subscribers, including for changes made in another tab", () => {
    const listener = vi.fn();
    const unsubscribe = bookmarkStore.subscribe(listener);
    toggleVerseBookmark(1, 2);
    expect(listener).toHaveBeenCalledTimes(1);
    localStorage.setItem(bookmarkStore.key, JSON.stringify({ v: 1, data: { quran: [{ surah: 9, ayah: 51, addedAt: "" }], duas: [] } }));
    window.dispatchEvent(new StorageEvent("storage", { key: bookmarkStore.key }));
    expect(listener).toHaveBeenCalledTimes(2);
    expect(bookmarkStore.get().quran[0]).toMatchObject({ surah: 9, ayah: 51 });
    unsubscribe();
  });

  it("keeps recent content unique, newest first, and capped", () => {
    for (let i = 1; i <= 10; i++) recordRecent("surah", String(i));
    recordRecent("surah", "5");
    const ids = recentStore.get().map((r) => r.id);
    expect(ids).toHaveLength(8);
    expect(ids[0]).toBe("5");
    expect(new Set(ids).size).toBe(8);
  });

  it("links the reader translation to the interface language and resets sections independently", () => {
    setInterfaceLanguage("ur");
    expect(preferencesStore.get()).toMatchObject({ language: "ur", quran: { translation: "ur" } });
    updatePrayerPreferences({ method: 4, school: 0 });
    resetPrayerPreferences();
    expect(preferencesStore.get().prayer).toMatchObject({ method: 1, school: 1, location: { source: "default" } });
    expect(preferencesStore.get().language).toBe("ur");
  });

  it("clears everything, including first-version keys", () => {
    toggleVerseBookmark(1, 1);
    localStorage.setItem("deen-tasbih", "33");
    localStorage.setItem("unrelated", "keep");
    clearGuestData();
    expect(Object.keys(localStorage)).toEqual(["unrelated"]);
    expect(bookmarkStore.get().quran).toEqual([]);
  });

  it("a generic store validates on read", () => {
    const store = createStore<number>({ name: "test-number", version: 2, defaults: () => 0, validate: (d) => (typeof d === "number" ? d : null) });
    expect(store.set(7)).toBe(true);
    expect(JSON.parse(localStorage.getItem(store.key)!)).toEqual({ v: 2, data: 7 });
    localStorage.setItem(store.key, JSON.stringify({ v: 2, data: "seven" }));
    reload();
    expect(store.get()).toBe(0);
  });
});

describe("first-version data", () => {
  it("is migrated once into the versioned stores", () => {
    localStorage.setItem("deen-verses", JSON.stringify([{ surah: 2, ayah: 255, label: "Al-Baqara 2:255" }]));
    localStorage.setItem("deen-library-saved", JSON.stringify(["dua:2:201", "hadith:5"]));
    localStorage.setItem("deen-reading", JSON.stringify({ surah: 18, ayah: 10, name: "Al-Kahf", updated: "2026-10-23T10:00:00.000Z" }));
    localStorage.setItem("deen-preferences", JSON.stringify({ saved: [], done: [], reminders: {}, times: {}, theme: "dark", lang: "ur" }));
    localStorage.setItem("deen-reader-settings", JSON.stringify({ font: 40, translation: "ur", focus: false }));
    localStorage.setItem("deen-prayer", JSON.stringify({ name: "London", lat: 51.5074, lon: -0.1278, zone: "Europe/London", method: "MuslimWorldLeague", hanafi: false }));
    reload();
    expect(bookmarkStore.get().quran).toMatchObject([{ surah: 2, ayah: 255 }]);
    expect(bookmarkStore.get().duas).toMatchObject([{ id: "2-201" }]);
    expect(readingProgressStore.get()).toMatchObject({ surah: 18, ayah: 10 });
    expect(preferencesStore.get()).toMatchObject({ language: "ur", theme: "dark", quran: { arabicSize: 40, translation: "ur" }, prayer: { method: 3, school: 0, location: { name: "London", timezone: "Europe/London" } } });
    expect(localStorage.getItem("deen-verses")).toBeNull();
    expect(JSON.parse(localStorage.getItem("deen-library-saved")!)).toEqual(["hadith:5"]); // Hadith bookmarks stay with the Hadith library
  });
});

describe("backup", () => {
  it("round-trips an export and rejects tampered data", () => {
    toggleVerseBookmark(2, 255);
    saveReadingProgress(2, 255);
    const backup = { version: 1, data: exportGuestData() };
    const entries = validateBackup(JSON.parse(JSON.stringify(backup)));
    clearGuestData();
    replaceGuestData(entries);
    expect(bookmarkStore.get().quran).toMatchObject([{ surah: 2, ayah: 255 }]);
    expect(() => validateBackup({ version: 1, data: { [GUEST_PREFIX + "bookmarks"]: JSON.stringify({ v: 1, data: "nope" }) } })).toThrow();
    expect(() => validateBackup({ version: 1, data: { [GUEST_PREFIX + "unknown"]: "{}" } })).toThrow();
    expect(() => validateBackup({ version: 1, data: { "someone-elses-key": "1" } })).toThrow();
  });
});
