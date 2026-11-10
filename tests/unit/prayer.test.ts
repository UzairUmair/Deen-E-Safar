import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseTimings, timingsUrl, type TimingsRequest } from "../../app/lib/prayerApi";
import { defaultPrayerPreferences } from "../../app/services/guest/preferencesStorage";
import { timingsKey, timingsRequest } from "../../app/services/prayer/prayerService";
import { addDays, buildSchedule, dateInZone, findNextPrayer, formatClock, formatCountdown, needsTomorrow, qiblaBearing } from "../../app/services/prayer/prayerTimeUtils";

const fixture = (name: string) => JSON.parse(readFileSync(`tests/fixtures/${name}.json`, "utf8"));
const karachi: TimingsRequest = { date: "2026-11-10", latitude: 24.8607, longitude: 67.0011, method: 1, school: 1, timezone: "Asia/Karachi" };
const today = buildSchedule(parseTimings(fixture("timings-karachi-2026-11-10"), karachi));
const tomorrow = buildSchedule(parseTimings(fixture("timings-karachi-2026-11-11"), { ...karachi, date: "2026-11-11" }));
const at = (iso: string) => new Date(iso).getTime();

describe("AlAdhan adapter", () => {
  it("builds the documented request", () => {
    const url = new URL(timingsUrl(karachi));
    expect(url.pathname).toBe("/v1/timings/10-11-2026");
    expect(Object.fromEntries(url.searchParams)).toEqual({ latitude: "24.8607", longitude: "67.0011", method: "1", school: "1", timezonestring: "Asia/Karachi", iso8601: "true" });
  });

  it("parses a recorded response into absolute instants", () => {
    const parsed = parseTimings(fixture("timings-karachi-2026-11-10"), karachi);
    expect(parsed.timezone).toBe("Asia/Karachi");
    expect(parsed.method).toEqual({ id: 1, name: "University of Islamic Sciences, Karachi" });
    expect(parsed.hijri).toMatchObject({ day: 30, monthNumber: 5, year: 1448 });
    expect(today.map((e) => e.key)).toEqual(["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"]);
    expect(today[0].time.toISOString()).toBe("2026-11-10T00:26:00.000Z"); // 05:26 at UTC+5
    for (let i = 1; i < today.length; i++) expect(today[i].time.getTime()).toBeGreaterThan(today[i - 1].time.getTime());
  });

  it("rejects a response with a missing or unparseable time", () => {
    const broken = fixture("timings-karachi-2026-11-10");
    broken.data.timings.Asr = "soon";
    expect(() => parseTimings(broken, karachi)).toThrow();
    expect(() => parseTimings({ code: 200, data: {} }, karachi)).toThrow();
  });

  it("derives request and cache key from the shared settings", () => {
    const prefs = { ...defaultPrayerPreferences(), method: 3, school: 0 as const };
    expect(timingsRequest(prefs, "2026-11-10")).toEqual({ ...karachi, method: 3, school: 0 });
    expect(timingsKey(timingsRequest(prefs, "2026-11-10"))).not.toEqual(timingsKey(karachi));
  });
});

describe("prayer time arithmetic", () => {
  it("finds the calendar date at the location, not at the viewer", () => {
    expect(dateInZone(new Date("2026-10-23T20:00:00Z"), "Asia/Karachi")).toBe("2026-10-24");
    expect(dateInZone(new Date("2026-10-23T01:00:00Z"), "America/New_York")).toBe("2026-10-22");
    expect(dateInZone(new Date("2026-03-29T00:30:00Z"), "Europe/London")).toBe("2026-03-29"); // DST change day
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("picks the next of the five prayers and never counts sunrise", () => {
    expect(findNextPrayer(today, null, at("2026-11-10T00:00:00+05:00"))?.key).toBe("Fajr");
    // 06:00 local: Fajr has passed, sunrise (06:45) is next on the clock but is not a prayer.
    expect(findNextPrayer(today, null, at("2026-11-10T06:00:00+05:00"))?.key).toBe("Dhuhr");
    expect(findNextPrayer(today, null, at("2026-11-10T17:55:00+05:00"))).toMatchObject({ key: "Isha", tomorrow: false });
  });

  it("moves on exactly when a prayer time is reached", () => {
    const isha = today[5].time.getTime();
    expect(findNextPrayer(today, tomorrow, isha - 1)?.key).toBe("Isha");
    expect(findNextPrayer(today, tomorrow, isha)).toMatchObject({ key: "Fajr", tomorrow: true });
  });

  it("after Isha needs tomorrow's schedule, and counts down across midnight", () => {
    const lateEvening = at("2026-11-10T23:30:00+05:00");
    expect(needsTomorrow(today, lateEvening)).toBe(true);
    expect(needsTomorrow(today, at("2026-11-10T12:00:00+05:00"))).toBe(false);
    expect(findNextPrayer(today, null, lateEvening)).toBeNull(); // not loaded yet: show nothing rather than a wrong time
    const next = findNextPrayer(today, tomorrow, lateEvening)!;
    expect(next).toMatchObject({ key: "Fajr", tomorrow: true });
    expect(next.time.toISOString()).toBe(tomorrow[0].time.toISOString());
    expect(formatCountdown(next.time.getTime() - lateEvening)).toMatch(/^05:5\d:00$/);
  });

  it("formats countdowns without ever going negative", () => {
    expect(formatCountdown(5076000)).toBe("01:24:36");
    expect(formatCountdown(999)).toBe("00:00:01");
    expect(formatCountdown(0)).toBe("00:00:00");
    expect(formatCountdown(-5000)).toBe("00:00:00");
    expect(formatCountdown(36 * 3600 * 1000)).toBe("36:00:00");
  });

  it("shows clock times in the location's zone in 12- and 24-hour form", () => {
    const isha = today[5].time;
    expect(formatClock(isha, "Asia/Karachi", false)).toBe("19:05");
    expect(formatClock(isha, "Asia/Karachi", true)).toBe("07:05 PM");
    expect(formatClock(isha, "Europe/London", false)).toBe("14:05");
  });

  it("computes the Qibla bearing", () => {
    expect(qiblaBearing(24.8607, 67.0011)).toBeCloseTo(267.6, 0); // Karachi: just south of due west
    expect(qiblaBearing(51.5074, -0.1278)).toBeCloseTo(119, 0); // London: east-south-east
    expect(qiblaBearing(-6.2088, 106.8456)).toBeCloseTo(295, 0); // Jakarta: west-north-west
  });
});
