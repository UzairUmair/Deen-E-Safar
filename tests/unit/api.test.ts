import { describe, expect, it, vi } from "vitest";
import { ApiError, getJson, isRetryable } from "../../app/lib/apiClient";
import { fetchSurahList } from "../../app/lib/quranApi";
import { normalizeTarget, parseHash } from "../../app/lib/router";
import { parseSurahNumber, parseVerseReference } from "../../app/lib/validation";
import { DAILY_VERSE_REFERENCES, dailyVerseReference } from "../../app/services/quran/dailyVerseService";
import { getSurah, getVerse, searchVerses } from "../../app/services/quran/quranService";
import { verifyTranslationEdition } from "../../app/services/quran/translationService";
import { jsonResponse, mockProviders } from "../helpers";

const kind = async (promise: Promise<unknown>) => {
  try {
    await promise;
    return "resolved";
  } catch (error) {
    return error instanceof ApiError ? error.kind : `other:${(error as Error).name}`;
  }
};

describe("apiClient", () => {
  it("classifies HTTP failures", async () => {
    mockProviders((url) => jsonResponse({}, url.includes("429") ? 429 : url.includes("503") ? 503 : url.includes("404") ? 404 : 400));
    expect(await kind(getJson("https://x.test/429"))).toBe("rate-limit");
    expect(await kind(getJson("https://x.test/503"))).toBe("server");
    expect(await kind(getJson("https://x.test/404"))).toBe("not-found");
    expect(await kind(getJson("https://x.test/400"))).toBe("bad-request");
  });

  it("reports unreachable hosts, invalid JSON and offline state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    expect(await kind(getJson("https://x.test/"))).toBe("network");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>", { status: 200 })));
    expect(await kind(getJson("https://x.test/"))).toBe("invalid-response");
    const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    expect(await kind(getJson("https://x.test/"))).toBe("offline");
    online.mockRestore();
  });

  it("times out, and lets a caller cancel without reporting an error", async () => {
    const hang = (_: unknown, init?: RequestInit) => new Promise<Response>((_, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError"))));
    vi.stubGlobal("fetch", vi.fn(hang));
    expect(await kind(getJson("https://x.test/", { timeoutMs: 20 }))).toBe("timeout");
    const controller = new AbortController();
    const pending = kind(getJson("https://x.test/", { signal: controller.signal }));
    controller.abort();
    expect(await pending).toBe("other:AbortError");
  });

  it("retries only transient failures", () => {
    expect(isRetryable(new ApiError("network", ""))).toBe(true);
    expect(isRetryable(new ApiError("timeout", ""))).toBe(true);
    expect(isRetryable(new ApiError("server", ""))).toBe(true);
    expect(isRetryable(new ApiError("not-found", ""))).toBe(false);
    expect(isRetryable(new ApiError("rate-limit", ""))).toBe(false);
    expect(isRetryable(new ApiError("invalid-response", ""))).toBe(false);
  });
});

describe("Quran provider adapter and service", () => {
  it("returns all 114 surahs and rejects a short list", async () => {
    mockProviders();
    const surahs = await fetchSurahList();
    expect(surahs).toHaveLength(114);
    expect(surahs[0]).toMatchObject({ number: 1, englishName: "Al-Faatiha", ayahCount: 7, revelation: "Meccan" });
    expect(surahs[113].number).toBe(114);
    mockProviders(() => jsonResponse({ code: 200, status: "OK", data: [] }));
    expect(await kind(fetchSurahList())).toBe("invalid-response");
  });

  it("pairs each translation with its ayah by number, not by position", async () => {
    const { readFileSync } = await import("node:fs");
    const body = JSON.parse(readFileSync("tests/fixtures/surah-112-en.json", "utf8"));
    const expected = new Map<number, string>(body.data[1].ayahs.map((a: { numberInSurah: number; text: string }) => [a.numberInSurah, a.text]));
    body.data[1].ayahs.reverse(); // translation arrives out of order
    mockProviders((url) => (url.includes("/surah/112/") ? jsonResponse(body) : undefined));
    const surah = await getSurah(112, "en.sahih");
    expect(surah.verses.map((v) => v.ayah)).toEqual([1, 2, 3, 4]);
    for (const verse of surah.verses) expect(verse.translation).toBe(expected.get(verse.ayah));
    expect(surah.translationEdition?.englishName).toBe("Saheeh International");
    expect(surah.verses[0].arabic).toBe(body.data[0].ayahs[0].text); // Arabic passes through untouched
  });

  it("rejects a surah whose Arabic text is incomplete or belongs to another edition", async () => {
    const { readFileSync } = await import("node:fs");
    const short = JSON.parse(readFileSync("tests/fixtures/surah-112-ar.json", "utf8"));
    short.data[0].ayahs.pop();
    mockProviders(() => jsonResponse(short));
    expect(await kind(getSurah(112, null))).toBe("invalid-response");
    const other = JSON.parse(readFileSync("tests/fixtures/surah-113-ar.json", "utf8"));
    mockProviders(() => jsonResponse(other));
    expect(await kind(getSurah(112, null))).toBe("invalid-response");
  });

  it("loads a single verse with both translations and their attribution", async () => {
    mockProviders();
    const verse = await getVerse(2, 255);
    expect(verse.verse).toMatchObject({ surah: 2, ayah: 255, globalNumber: 262 });
    expect(verse.translations.en.edition.englishName).toBe("Saheeh International");
    expect(verse.translations.ur.edition.identifier).toBe("ur.jalandhry");
  });

  it("treats the provider's 404 for an empty search as no results", async () => {
    mockProviders();
    expect(await searchVerses("zzzzqqq", "en")).toEqual({ total: 0, matches: [] });
    const found = await searchVerses("daybreak", "en");
    expect(found.matches.map((m) => `${m.surah}:${m.ayah}`)).toEqual(["6:96", "113:1"]);
  });

  it("confirms configured translations against the provider's edition list", async () => {
    mockProviders();
    expect((await verifyTranslationEdition("en"))?.identifier).toBe("en.sahih");
    expect((await verifyTranslationEdition("ur"))?.identifier).toBe("ur.jalandhry");
    mockProviders(() => jsonResponse({ code: 200, status: "OK", data: [] }));
    expect(await verifyTranslationEdition("en")).toBeNull();
  });
});

describe("daily verse", () => {
  it("is stable within a day and uses only real references", () => {
    expect(dailyVerseReference("2026-11-10")).toEqual(dailyVerseReference("2026-11-10"));
    expect(dailyVerseReference("2026-11-10")).toEqual({ surah: 3, ayah: 159 });
    expect(dailyVerseReference("2026-11-11")).not.toEqual(dailyVerseReference("2026-11-10"));
    const lengths = new Map<number, number>();
    for (const [surah, ayah] of DAILY_VERSE_REFERENCES) {
      expect(surah).toBeGreaterThanOrEqual(1);
      expect(surah).toBeLessThanOrEqual(114);
      expect(ayah).toBeGreaterThanOrEqual(1);
      lengths.set(surah, Math.max(lengths.get(surah) ?? 0, ayah));
    }
    expect(new Set(DAILY_VERSE_REFERENCES.map((r) => r.join(":"))).size).toBe(DAILY_VERSE_REFERENCES.length);
  });

  it("every reference fits inside its surah", async () => {
    mockProviders();
    const surahs = await fetchSurahList();
    for (const [surah, ayah] of DAILY_VERSE_REFERENCES) expect(ayah).toBeLessThanOrEqual(surahs[surah - 1].ayahCount);
  });
});

describe("routing and input validation", () => {
  it("rewrites first-version links to current routes", () => {
    expect(normalizeTarget("#reader?surah=2&ayah=255")).toBe("/quran/2?ayah=255");
    expect(normalizeTarget("reader?surah=36&ayah=1")).toBe("/quran/36");
    expect(normalizeTarget("#quran")).toBe("/quran");
    expect(normalizeTarget("auth")).toBe("/dashboard");
    expect(normalizeTarget("home")).toBe("/");
    expect(normalizeTarget("course?path=seerah")).toBe("course?path=seerah");
    expect(normalizeTarget("/duas/2-201")).toBe("/duas/2-201");
  });

  it("parses path-style and legacy hashes", () => {
    const reader = parseHash("#/quran/18?ayah=10");
    expect(reader.name).toBe("quran");
    expect(reader.segments[1]).toBe("18");
    expect(reader.query.get("ayah")).toBe("10");
    expect(parseHash("").name).toBe("home");
    expect(parseHash("#course?path=seerah").name).toBe("course");
  });

  it("accepts only real surah numbers and verse references", () => {
    expect(parseSurahNumber("114")).toBe(114);
    for (const bad of ["0", "115", "abc", "1.5", "-1", "", undefined, "0001"]) expect(parseSurahNumber(bad)).toBeNull();
    expect(parseVerseReference("2:255")).toEqual({ surah: 2, ayah: 255 });
    expect(parseVerseReference("2 255")).toEqual({ surah: 2, ayah: 255 });
    expect(parseVerseReference("115:1")).toBeNull();
    expect(parseVerseReference("mercy")).toBeNull();
  });
});
