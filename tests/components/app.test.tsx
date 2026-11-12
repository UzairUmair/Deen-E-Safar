import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrayerWidget } from "../../app/components/dashboard/PrayerWidget";
import i18n from "../../app/features/i18n";
import Dashboard from "../../app/screens/Dashboard";
import { DuaDetails } from "../../app/screens/Duas";
import Duas from "../../app/screens/Duas";
import PrayerTimes from "../../app/screens/PrayerTimes";
import { bookmarkStore, toggleVerseBookmark } from "../../app/services/guest/bookmarkStorage";
import { preferencesStore, updatePrayerPreferences } from "../../app/services/guest/preferencesStorage";
import { dailyVerseStore, readingProgressStore } from "../../app/services/guest/readingProgressStorage";
import { jsonResponse, mockProviders, renderScreen } from "../helpers";

const timings = (calls: string[]) => calls.filter((u) => u.includes("api.aladhan.com")).map((u) => new URL(u));

/** Freezes "now" at an instant while letting timers and promises run. */
function clockAt(iso: string) {
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ["Date", "setInterval", "clearInterval", "setTimeout", "clearTimeout"] });
  vi.setSystemTime(new Date(iso));
}
const prayerCards = () => [...document.querySelectorAll<HTMLElement>("[data-prayer]")];
const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
const geolocation = (impl: Geolocation["getCurrentPosition"]) => Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition: impl } });

afterEach(() => {
  // @ts-expect-error test cleanup of a stubbed browser API
  delete navigator.geolocation;
});

describe("Prayer Times page", () => {
  it("loads times for the saved location and shows them in that location's zone", async () => {
    clockAt("2026-11-10T12:55:00Z"); // 17:55 in Karachi
    const { calls } = mockProviders();
    renderScreen(<PrayerTimes />);
    await screen.findByTestId("countdown");
    const cards = prayerCards();
    const text = (key: string) => cards.find((c) => c.getAttribute("data-prayer") === key)!.textContent;
    expect(text("Fajr")).toContain("05:26 AM");
    expect(text("Sunrise")).toContain("06:45 AM");
    expect(text("Dhuhr")).toContain("12:16 PM");
    expect(text("Asr")).toContain("04:11 PM");
    expect(text("Maghrib")).toContain("05:47 PM");
    expect(text("Isha")).toContain("07:05 PM");
    const [request] = timings(calls);
    expect(request.pathname).toBe("/v1/timings/10-11-2026");
    expect(request.searchParams.get("timezonestring")).toBe("Asia/Karachi");
    expect(screen.getByText("Asia/Karachi")).toBeInTheDocument();
    expect(screen.getByTestId("method-name")).toHaveTextContent("University of Islamic Sciences, Karachi");
    expect(screen.getByText(/local mosque or official timetable/)).toBeInTheDocument();
    expect(screen.getByText(/1448/)).toBeInTheDocument(); // Hijri date from the provider
  });

  it("counts down to the next prayer and highlights it", async () => {
    clockAt("2026-11-10T12:55:00Z");
    mockProviders();
    renderScreen(<PrayerTimes />);
    await screen.findByTestId("countdown");
    expect(screen.getByTestId("next-prayer")).toHaveTextContent("Isha");
    expect(screen.getByTestId("countdown")).toHaveTextContent("01:10:00");
    await tick(3000);
    expect(screen.getByTestId("countdown")).toHaveTextContent("01:09:57");
    expect(prayerCards().find((c) => c.hasAttribute("data-next"))).toHaveAttribute("data-prayer", "Isha");
  });

  it("moves to tomorrow's Fajr once Isha arrives, fetching the next day", async () => {
    clockAt("2026-11-10T14:04:58Z"); // two seconds before Isha (19:05 +05:00)
    const { calls } = mockProviders();
    renderScreen(<PrayerTimes />);
    await screen.findByTestId("countdown");
    expect(screen.getByTestId("next-prayer")).toHaveTextContent("Isha");
    expect(screen.getByTestId("countdown")).toHaveTextContent("00:00:02");
    expect(timings(calls)).toHaveLength(1);

    await tick(3000);
    await waitFor(() => expect(screen.getByTestId("next-prayer")).toHaveTextContent("Fajr"));
    expect(screen.getByTestId("next-prayer")).toHaveTextContent("tomorrow");
    expect(timings(calls).map((u) => u.pathname)).toEqual(["/v1/timings/10-11-2026", "/v1/timings/11-11-2026"]);
    // Fajr on the 11th is 05:27 +05:00 → 10h 21m 59s after 19:05:01.
    expect(screen.getByTestId("countdown").textContent).toMatch(/^10:21:5\d$/);
    expect(prayerCards().some((c) => c.hasAttribute("data-next"))).toBe(false); // nothing left today
  });

  it("rolls over to the new day at midnight in the location's zone", async () => {
    clockAt("2026-11-10T18:59:58Z"); // 23:59:58 in Karachi
    const { calls } = mockProviders();
    renderScreen(<PrayerTimes />);
    await screen.findByTestId("countdown");
    await waitFor(() => expect(screen.getByTestId("next-prayer")).toHaveTextContent("Fajr"));
    expect(screen.getByTestId("countdown").textContent).not.toMatch(/-/);
    await tick(4000); // now 00:00:02 on the 11th
    await waitFor(() => expect(screen.getByDisplayValue("2026-11-11")).toBeInTheDocument());
    expect(screen.getByTestId("next-prayer")).toHaveTextContent("Fajr");
    expect(screen.getByTestId("next-prayer")).not.toHaveTextContent("tomorrow");
    expect(screen.getByTestId("countdown").textContent).toMatch(/^05:26:5\d$/);
    // The 11th was already cached as "tomorrow": no extra request for it.
    expect(timings(calls).filter((u) => u.pathname.endsWith("11-11-2026"))).toHaveLength(1);
  });

  it("refetches with new coordinates when a city is chosen", async () => {
    clockAt("2026-11-10T12:55:00Z");
    const { calls } = mockProviders();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderScreen(<PrayerTimes />);
    await screen.findByTestId("countdown");
    await user.type(screen.getByRole("searchbox", { name: "Search a city" }), "lond");
    await user.click(screen.getByRole("button", { name: /London/ }));
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("London, United Kingdom"));
    const request = timings(calls).at(-1)!;
    expect(request.searchParams.get("latitude")).toBe("51.5074");
    expect(request.searchParams.get("longitude")).toBe("-0.1278");
    expect(request.searchParams.get("timezonestring")).toBe("Europe/London");
    expect(preferencesStore.get().prayer.location).toMatchObject({ name: "London", source: "city" });
    // Same instant, London clock: Isha there is shown in London time.
    await waitFor(() => expect(screen.getByText("Europe/London")).toBeInTheDocument());
  });

  it("refetches when the calculation method or Asr school changes", async () => {
    clockAt("2026-11-10T12:55:00Z");
    const { calls } = mockProviders();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderScreen(<PrayerTimes />);
    await screen.findByTestId("countdown");
    await user.selectOptions(screen.getByTestId("method-select"), "3");
    await waitFor(() => expect(screen.getByTestId("method-name")).toHaveTextContent("Muslim World League"));
    expect(timings(calls).at(-1)!.searchParams.get("method")).toBe("3");
    await user.selectOptions(screen.getByTestId("school-select"), "0");
    await waitFor(() => expect(timings(calls).at(-1)!.searchParams.get("school")).toBe("0"));
    expect(preferencesStore.get().prayer).toMatchObject({ method: 3, school: 0 });
  });

  it("switches between 12- and 24-hour clocks", async () => {
    clockAt("2026-11-10T12:55:00Z");
    mockProviders();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderScreen(<PrayerTimes />);
    await screen.findByTestId("countdown");
    await user.selectOptions(screen.getByLabelText("Clock format"), "24");
    expect(prayerCards().find((c) => c.getAttribute("data-prayer") === "Isha")).toHaveTextContent("19:05");
  });

  it("does not ask for location until the button is pressed, and handles a refusal", async () => {
    clockAt("2026-11-10T12:55:00Z");
    mockProviders();
    const ask = vi.fn<Geolocation["getCurrentPosition"]>((_, onError) => onError?.({ code: 1, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3, message: "" } as GeolocationPositionError));
    geolocation(ask);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderScreen(<PrayerTimes />);
    await screen.findByTestId("countdown");
    expect(ask).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Use My Location" }));
    expect(ask).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Location permission was denied/)).toBeInTheDocument();
    expect(preferencesStore.get().prayer.location.name).toBe("Karachi"); // unchanged
  });

  it("uses the device position when permission is given, storing rounded coordinates", async () => {
    clockAt("2026-11-10T12:55:00Z");
    const { calls } = mockProviders();
    geolocation((onSuccess) => onSuccess({ coords: { latitude: 31.520412, longitude: 74.358749 } } as GeolocationPosition));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderScreen(<PrayerTimes />);
    await screen.findByTestId("countdown");
    await user.click(screen.getByRole("button", { name: "Use My Location" }));
    await waitFor(() => expect(screen.getByTestId("location-name")).toHaveTextContent("My location"));
    expect(preferencesStore.get().prayer.location).toMatchObject({ latitude: 31.52, longitude: 74.36, source: "device" });
    expect(timings(calls).at(-1)!.searchParams.get("latitude")).toBe("31.52");
  });

  it("validates manually entered coordinates", async () => {
    clockAt("2026-11-10T12:55:00Z");
    mockProviders();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderScreen(<PrayerTimes />);
    await screen.findByTestId("countdown");
    await user.click(screen.getByText("Enter coordinates manually"));
    await user.type(screen.getByLabelText("Latitude"), "120");
    await user.type(screen.getByLabelText("Longitude"), "10");
    await user.click(screen.getByRole("button", { name: "Use these coordinates" }));
    expect(await screen.findByText(/Enter a latitude between -90 and 90/)).toBeInTheDocument();
    expect(preferencesStore.get().prayer.location.name).toBe("Karachi");
  });

  it("shows an error with retry, never made-up times, when the provider fails", async () => {
    clockAt("2026-11-10T12:55:00Z");
    let fail = true;
    mockProviders((url) => (fail && url.includes("aladhan") ? jsonResponse({ code: 503 }, 503) : undefined));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderScreen(<PrayerTimes />);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Prayer times could not be loaded");
    expect(screen.queryByTestId("countdown")).not.toBeInTheDocument();
    expect(screen.queryAllByRole("listitem").filter((li) => li.hasAttribute("data-prayer"))).toHaveLength(0);
    fail = false;
    await user.click(within(alert).getByRole("button", { name: "Try again" }));
    expect(await screen.findByTestId("countdown")).toHaveTextContent("01:10:00");
  });
});

describe("Guest dashboard", () => {
  it("shows honest empty states to a first-time visitor", async () => {
    clockAt("2026-11-10T12:55:00Z");
    mockProviders();
    renderScreen(<Dashboard />);
    expect(screen.getByText("Guest Mode")).toBeInTheDocument();
    expect(screen.getByText("Your reading position will appear here once you open a surah.")).toBeInTheDocument();
    expect(screen.getByText("Nothing saved yet")).toBeInTheDocument();
    expect(screen.getByText("Surahs and duas you open will be listed here.")).toBeInTheDocument();
    expect(screen.getByText("No lessons completed yet")).toBeInTheDocument();
    expect(screen.queryByText(/streak/i)).not.toBeInTheDocument();
    const actions = within(screen.getByRole("navigation", { name: "Quick actions" })).getAllByRole("link");
    expect(actions.map((a) => a.getAttribute("href"))).toEqual(["#/quran", "#/prayer", "#/duas", "#/bookmarks", "#/ai", "#/preferences"]);
  });

  it("shows saved bookmarks and the saved reading position", async () => {
    clockAt("2026-11-10T12:55:00Z");
    mockProviders();
    toggleVerseBookmark(114, 3);
    bookmarkStore.set((b) => ({ ...b, duas: [{ id: "2-201", addedAt: "" }] }));
    readingProgressStore.set({ surah: 112, ayah: 2, updatedAt: "2026-11-10T08:00:00.000Z" });
    renderScreen(<Dashboard />);
    expect(screen.getByText("1 verses · 1 duas")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /An-Naas.*114:3/ })).toHaveAttribute("href", "#/quran/114?ayah=3");
    expect(await screen.findByRole("link", { name: /A good life and a good Hereafter/ })).toHaveAttribute("href", "#/duas/2-201");
    expect(screen.getByTestId("continue-reading")).toHaveAttribute("href", "#/quran/112?ayah=2");
  });

  it("prayer widget and prayer page share one request and one set of settings", async () => {
    clockAt("2026-11-10T12:55:00Z");
    updatePrayerPreferences({ method: 3, school: 0, location: { name: "London", country: "United Kingdom", latitude: 51.5074, longitude: -0.1278, timezone: "Europe/London", source: "city" } });
    const { calls } = mockProviders();
    renderScreen(
      <>
        <PrayerWidget />
        <PrayerTimes />
      </>,
    );
    expect(await screen.findByTestId("widget-location")).toHaveTextContent("London, United Kingdom");
    await waitFor(() => expect(screen.getAllByTestId("countdown")).toHaveLength(2));
    const [widget, page] = screen.getAllByTestId("countdown");
    expect(widget.textContent).toBe(page.textContent);
    const requests = timings(calls);
    expect(requests).toHaveLength(1); // deduplicated through the shared cache
    expect(Object.fromEntries(requests[0].searchParams)).toMatchObject({ latitude: "51.5074", method: "3", school: "0", timezonestring: "Europe/London" });
  });

  it("shows the provider's daily verse, stable for the day, and bookmarks it", async () => {
    clockAt("2026-11-10T12:55:00Z");
    const { calls } = mockProviders();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { toasts } = renderScreen(<Dashboard />);
    const link = await screen.findByRole("link", { name: "Open in Quran" });
    expect(link).toHaveAttribute("href", "#/quran/3?ayah=159");
    expect(screen.getByText(/Aal-i-Imraan · 3:159/)).toBeInTheDocument();
    expect(screen.getByText(/Translation: Saheeh International/)).toBeInTheDocument();
    expect(calls.filter((u) => u.includes("/ayah/"))).toEqual(["https://api.alquran.cloud/v1/ayah/3:159/editions/quran-uthmani,en.sahih,ur.jalandhry"]);
    await user.click(screen.getByRole("button", { name: "Bookmark this verse" }));
    expect(toasts).toEqual(["Verse bookmarked"]);
    expect(bookmarkStore.get().quran).toMatchObject([{ surah: 3, ayah: 159 }]);
  });

  it("falls back to the last saved verse with its date, or an error, when the provider is down", async () => {
    clockAt("2026-11-12T12:55:00Z");
    mockProviders((url) => (url.includes("/ayah/") ? jsonResponse({}, 503) : undefined));
    const first = renderScreen(<Dashboard />);
    expect(await screen.findByText("Today's verse could not be loaded")).toBeInTheDocument();
    first.unmount();

    dailyVerseStore.set({ date: "2026-11-10", surah: 3, ayah: 159, surahName: "Aal-i-Imraan", surahArabicName: "سُورَةُ آلِ عِمۡرَانَ", arabic: "ARABIC-FROM-CACHE", translations: { en: { text: "cached translation", edition: "Saheeh International" } } });
    renderScreen(<Dashboard />);
    expect(await screen.findByText(/Showing the verse saved on Tuesday, 10 November 2026/)).toBeInTheDocument();
    expect(screen.getByText("ARABIC-FROM-CACHE")).toBeInTheDocument();
  });
});

describe("Dua library", () => {
  it("lists verified duas, filters by category and search, and bookmarks", async () => {
    mockProviders();
    const user = userEvent.setup();
    const { toasts } = renderScreen(<Duas />);
    await screen.findByText("Showing 19 of 19 duas");
    await user.click(screen.getByRole("button", { name: "Travel" }));
    expect(screen.getByText("Showing 2 of 19 duas")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "All" }));
    await user.type(screen.getByRole("searchbox", { name: "Search duas" }), "20:114");
    const card = screen.getByRole("link", { name: /Asking for knowledge/ });
    expect(card).toHaveAttribute("href", "#/duas/20-114");
    await user.click(screen.getByRole("button", { name: "Bookmark Asking for knowledge" }));
    expect(toasts).toEqual(["Dua bookmarked"]);
    expect(bookmarkStore.get().duas).toMatchObject([{ id: "20-114" }]);
    await user.clear(screen.getByRole("searchbox", { name: "Search duas" }));
    await user.click(screen.getByRole("button", { name: /Saved \(1\)/ }));
    expect(screen.getByText("Showing 1 of 19 duas")).toBeInTheDocument();
  });

  it("shows a dua with its source, in the interface language", async () => {
    mockProviders();
    const view = renderScreen(<DuaDetails id="20-114" />);
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent("Asking for knowledge");
    expect(screen.getByText("Quran 20:114")).toBeInTheDocument();
    expect(screen.getByText("Noor International Center, v1.1.2")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Read in context" })).toHaveAttribute("href", "#/quran/20?ayah=114");
    view.unmount();
    await i18n.changeLanguage("ur");
    renderScreen(<DuaDetails id="20-114" />);
    expect(await screen.findByText("Muhammad Ibrahim Junagarhi, v1.1.3")).toBeInTheDocument();
    expect(document.querySelector(".dua-translation")).toHaveAttribute("lang", "ur");
  });

  it("handles an unknown dua id", async () => {
    mockProviders();
    renderScreen(<DuaDetails id="999-1" />);
    expect(await screen.findByText("That dua is not in this collection")).toBeInTheDocument();
  });
});
