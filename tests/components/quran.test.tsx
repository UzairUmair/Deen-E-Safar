import { readFileSync } from "node:fs";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ContinueReading } from "../../app/components/dashboard/ContinueReading";
import i18n from "../../app/features/i18n";
import Bookmarks from "../../app/screens/Bookmarks";
import Quran from "../../app/screens/Quran";
import SurahReader from "../../app/screens/SurahReader";
import { bookmarkStore } from "../../app/services/guest/bookmarkStorage";
import { preferencesStore } from "../../app/services/guest/preferencesStorage";
import { readingProgressStore } from "../../app/services/guest/readingProgressStorage";
import { quranAudio } from "../../app/services/quran/audioService";
import { jsonResponse, mockProviders, renderScreen } from "../helpers";
import { FakeAudio } from "../setup";

const fixture = (name: string) => JSON.parse(readFileSync(`tests/fixtures/${name}.json`, "utf8"));
const tiles = () => screen.getAllByRole("link").filter((a) => a.hasAttribute("data-surah"));

describe("Quran Explorer directory", () => {
  it("lists all 114 surahs from the provider, each linking to its reader", async () => {
    mockProviders();
    renderScreen(<Quran />);
    expect(screen.getByText("Loading surahs…")).toBeInTheDocument();
    await screen.findByText("Showing 114 of 114 surahs");
    expect(tiles()).toHaveLength(114);
    const last = tiles()[113];
    expect(last).toHaveAttribute("href", "#/quran/114");
    expect(within(last).getByText("An-Naas")).toBeInTheDocument();
    expect(within(last).getByText(/6 verses · Meccan/)).toBeInTheDocument();
    expect(within(last).getByText(fixture("surah-list").data[113].name)).toHaveAttribute("translate", "no");
  });

  it("searches by English name, Arabic name and number, and can be cleared", async () => {
    mockProviders();
    const user = userEvent.setup();
    renderScreen(<Quran />);
    await screen.findByText("Showing 114 of 114 surahs");
    const box = screen.getByRole("searchbox", { name: "Search surahs" });

    await user.type(box, "ya seen");
    expect(tiles().map((t) => t.getAttribute("data-surah"))).toEqual(["36"]);
    await user.clear(box);
    await user.type(box, "الكهف"); // typed without diacritics
    expect(tiles().map((t) => t.getAttribute("data-surah"))).toEqual(["18"]);
    await user.clear(box);
    await user.type(box, "112");
    expect(tiles().map((t) => t.getAttribute("data-surah"))).toEqual(["112"]);
    await user.clear(box);
    await user.type(box, "qqqq");
    expect(screen.getByText("No surah matches your search")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Clear search" })[0]);
    expect(tiles()).toHaveLength(114);
  });

  it("offers a direct jump for a valid verse reference only", async () => {
    mockProviders();
    const user = userEvent.setup();
    renderScreen(<Quran />);
    await screen.findByText("Showing 114 of 114 surahs");
    const box = screen.getByRole("searchbox", { name: "Search surahs" });
    await user.type(box, "2:255");
    expect(screen.getByRole("link", { name: /Go to verse 2:255/ })).toHaveAttribute("href", "#/quran/2?ayah=255");
    await user.clear(box);
    await user.type(box, "112:9"); // Al-Ikhlaas has 4 verses
    expect(screen.queryByRole("link", { name: /Go to verse/ })).not.toBeInTheDocument();
  });

  it("shows a real error with a working retry when the provider fails", async () => {
    let fail = true;
    const { calls } = mockProviders((url) => (fail && url.endsWith("/surah") ? jsonResponse({ code: 500 }, 500) : undefined));
    const user = userEvent.setup();
    renderScreen(<Quran />);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("The surah list could not be loaded");
    expect(alert).toHaveTextContent("The provider is having problems right now.");
    expect(tiles()).toHaveLength(0); // nothing invented in place of the data
    fail = false;
    await user.click(within(alert).getByRole("button", { name: "Try again" }));
    await screen.findByText("Showing 114 of 114 surahs");
    expect(calls.filter((u) => u.endsWith("/surah"))).toHaveLength(2);
  });

  it("searches verse text with a debounce and handles no results", async () => {
    const { calls } = mockProviders();
    const user = userEvent.setup();
    renderScreen(<Quran />);
    await user.click(screen.getByRole("tab", { name: "Search verses" }));
    const box = screen.getByRole("searchbox", { name: "Search verses" });
    await user.type(box, "daybreak");
    const result = await screen.findByRole("link", { name: /113:1/ });
    expect(result).toHaveAttribute("href", "#/quran/113?ayah=1");
    // One request for the final term, not one per keystroke.
    expect(calls.filter((u) => u.includes("/search/"))).toEqual(["https://api.alquran.cloud/v1/search/daybreak/all/en.sahih"]);
    await user.clear(box);
    await user.type(box, "zzzzqqq");
    expect(await screen.findByText("No verses contain that text")).toBeInTheDocument();
  });
});

describe("Surah reader", () => {
  it("renders every verse in order with Arabic, translation and attribution", async () => {
    mockProviders();
    renderScreen(<SurahReader surahParam="1" ayahParam={null} />);
    const items = await screen.findAllByRole("listitem");
    const expected = fixture("surah-1-en");
    expect(items.map((li) => li.getAttribute("data-ayah"))).toEqual(["1", "2", "3", "4", "5", "6", "7"]);
    items.forEach((li, i) => {
      expect(li.querySelector(".ayah-arabic")!.textContent).toBe(expected.data[0].ayahs[i].text.replace(/^\uFEFF/, "")); // Arabic exactly as provided
      expect(li).toHaveTextContent(expected.data[1].ayahs[i].text);
      expect(li).toHaveTextContent("Saheeh International");
    });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(expected.data[0].name);
    expect(items[0].querySelector(".ayah-arabic")).toHaveAttribute("translate", "no");
  });

  it("rejects an invalid surah number without calling the provider", () => {
    const { calls } = mockProviders();
    renderScreen(<SurahReader surahParam="115" ayahParam={null} />);
    expect(screen.getByText("That surah does not exist")).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it("switches between English and Urdu translations and can hide them", async () => {
    const { calls } = mockProviders();
    const user = userEvent.setup();
    renderScreen(<SurahReader surahParam="112" ayahParam={null} />);
    await screen.findByText(fixture("surah-112-en").data[1].ayahs[1].text);
    await user.click(screen.getByRole("button", { name: "Reader settings" }));
    await user.selectOptions(screen.getByLabelText("Translation"), "ur");
    const urdu = await screen.findByText(fixture("surah-112-ur").data[1].ayahs[1].text);
    expect(urdu).toHaveAttribute("dir", "rtl");
    expect(urdu).toHaveAttribute("lang", "ur");
    expect(screen.getAllByText("Fateh Muhammad Jalandhry").length).toBeGreaterThan(0);
    expect(calls).toContain("https://api.alquran.cloud/v1/surah/112/editions/quran-uthmani,ur.jalandhry");
    expect(preferencesStore.get().quran.translation).toBe("ur"); // persisted

    await user.click(screen.getByLabelText("Show translation"));
    await waitFor(() => expect(screen.queryByText(fixture("surah-112-ur").data[1].ayahs[1].text)).not.toBeInTheDocument());
    expect(screen.getAllByRole("listitem")).toHaveLength(4); // Arabic stays
  });

  it("applies and persists reader settings", async () => {
    mockProviders();
    const user = userEvent.setup();
    const { container } = renderScreen(<SurahReader surahParam="112" ayahParam={null} />);
    await screen.findAllByRole("listitem");
    await user.click(screen.getByRole("button", { name: "Reader settings" }));
    fireEvent.change(screen.getByLabelText(/Arabic text size/), { target: { value: "44" } });
    await user.selectOptions(screen.getByLabelText("Verse spacing"), "relaxed");
    await user.selectOptions(screen.getByLabelText("Reading width"), "wide");
    const root = container.querySelector(".reader-screen") as HTMLElement;
    expect(root.style.getPropertyValue("--arabic-size")).toBe("44px");
    expect(root).toHaveAttribute("data-spacing", "relaxed");
    expect(root).toHaveAttribute("data-width", "wide");
    expect(preferencesStore.get().quran).toMatchObject({ arabicSize: 44, spacing: "relaxed", width: "wide" });
    await user.click(screen.getByRole("button", { name: "Reset reader settings" }));
    expect(preferencesStore.get().quran).toMatchObject({ arabicSize: 34, spacing: "normal", width: "comfortable" });
  });

  it("plays, pauses, resumes and stops recitation, mirroring the audio element", async () => {
    mockProviders();
    const user = userEvent.setup();
    renderScreen(<SurahReader surahParam="112" ayahParam={null} />);
    await screen.findAllByRole("listitem");
    const global = fixture("surah-112-ar").data[0].ayahs[1].number;

    await user.click(screen.getByRole("button", { name: "Play verse 2" }));
    const element = FakeAudio.instances.at(-1)!;
    expect(element.src).toBe(`https://cdn.islamic.network/quran/audio/128/ar.alafasy/${global}.mp3`);
    expect(await screen.findByText("Playing verse 2")).toBeInTheDocument();
    expect(FakeAudio.instances).toHaveLength(1); // one element, so recitations cannot overlap

    await user.click(screen.getByRole("button", { name: "Pause verse 2" }));
    expect(element.paused).toBe(true);
    expect(await screen.findByText("Paused at verse 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Resume recitation" }));
    expect(await screen.findByText("Playing verse 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Play verse 4" })); // switching reuses the same element
    expect(FakeAudio.instances).toHaveLength(1);
    expect(await screen.findByText("Playing verse 4")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Stop recitation" }));
    expect(quranAudio.getState().status).toBe("idle");
    expect(screen.getByText("Ready to play from verse 1")).toBeInTheDocument();
  });

  it("continues to the next verse when one ends, and reports audio failures", async () => {
    mockProviders();
    const user = userEvent.setup();
    const { unmount } = renderScreen(<SurahReader surahParam="112" ayahParam={null} />);
    await screen.findAllByRole("listitem");
    await user.click(screen.getByRole("button", { name: "Play verse 3" }));
    await screen.findByText("Playing verse 3");
    const element = FakeAudio.instances.at(-1)!;
    element.finish();
    expect(await screen.findByText("Playing verse 4")).toBeInTheDocument();
    element.finish(); // last verse: nothing follows
    await waitFor(() => expect(quranAudio.getState().status).toBe("idle"));

    await user.click(screen.getByRole("button", { name: "Play verse 1" }));
    await screen.findByText("Playing verse 1");
    element.dispatchEvent(new Event("error"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Audio is unavailable for this verse.");

    await user.click(screen.getByRole("button", { name: "Play verse 2" }));
    await screen.findByText("Playing verse 2");
    unmount(); // leaving the reader ends playback
    expect(quranAudio.getState().status).toBe("idle");
  });

  it("saves bookmarks that persist, and removes them", async () => {
    mockProviders();
    const user = userEvent.setup();
    const first = renderScreen(<SurahReader surahParam="1" ayahParam={null} />);
    await screen.findAllByRole("listitem");
    await user.click(screen.getByRole("button", { name: "Bookmark verse 5" }));
    expect(first.toasts).toEqual(["Verse bookmarked"]);
    expect(JSON.parse(localStorage.getItem(bookmarkStore.key)!).data.quran).toMatchObject([{ surah: 1, ayah: 5 }]);
    first.unmount();

    // A fresh mount reads the saved state back.
    window.dispatchEvent(new StorageEvent("storage", { key: null }));
    const second = renderScreen(<SurahReader surahParam="1" ayahParam={null} />);
    const saved = await screen.findByRole("button", { name: "Remove bookmark for verse 5" });
    expect(saved).toHaveAttribute("aria-pressed", "true");
    await user.click(saved);
    expect(second.toasts).toEqual(["Bookmark removed"]);
    expect(bookmarkStore.get().quran).toEqual([]);
  });

  it("opens at a requested verse and records it as the reading position", async () => {
    mockProviders();
    renderScreen(<SurahReader surahParam="1" ayahParam="6" />);
    const items = await screen.findAllByRole("listitem");
    await waitFor(() => expect(items[5]).toHaveAttribute("data-highlighted", "true"));
    await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalled());
    expect(readingProgressStore.get()).toMatchObject({ surah: 1, ayah: 6 });
  });

  it("keeps the previous text and says so when a translation fails to load", async () => {
    let failUrdu = false;
    mockProviders((url) => (failUrdu && url.includes("ur.jalandhry") ? jsonResponse({}, 503) : undefined));
    const user = userEvent.setup();
    renderScreen(<SurahReader surahParam="112" ayahParam={null} />);
    const english = fixture("surah-112-en").data[1].ayahs[0].text;
    await screen.findByText(english);
    failUrdu = true;
    await user.click(screen.getByRole("button", { name: "Reader settings" }));
    await user.selectOptions(screen.getByLabelText("Translation"), "ur");
    expect(await screen.findByText(/The selected translation could not be loaded/)).toBeInTheDocument();
    expect(screen.getByText(english)).toBeInTheDocument();
  });

  it("shows an error state, not placeholder verses, when the surah cannot be loaded", async () => {
    mockProviders((url) => (url.includes("/surah/113/") ? Promise.reject(new TypeError("Failed to fetch")) : undefined));
    renderScreen(<SurahReader surahParam="113" ayahParam={null} />);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("This surah could not be loaded");
    expect(alert).toHaveTextContent("The service could not be reached.");
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });
});

describe("Continue reading and bookmarks", () => {
  it("shows nothing saved for a new visitor, then links to the saved position", async () => {
    mockProviders();
    const view = renderScreen(<ContinueReading />);
    expect(screen.getByText("Your reading position will appear here once you open a surah.")).toBeInTheDocument();
    view.unmount();
    readingProgressStore.set({ surah: 114, ayah: 4, updatedAt: "2026-11-10T08:00:00.000Z" });
    renderScreen(<ContinueReading />);
    expect(screen.getByTestId("continue-reading")).toHaveAttribute("href", "#/quran/114?ayah=4");
    expect(await screen.findByText("An-Naas")).toBeInTheDocument();
    expect(screen.getByText(/114:4/)).toBeInTheDocument();
  });

  it("lists saved verses by reference, filters them, and fetches text only on request", async () => {
    bookmarkStore.set({ quran: [{ surah: 2, ayah: 255, addedAt: "" }, { surah: 114, ayah: 1, addedAt: "" }], duas: [] });
    const { calls } = mockProviders();
    const user = userEvent.setup();
    const { toasts } = renderScreen(<Bookmarks initialTab={null} />);
    expect(await screen.findByText("Al-Baqara")).toBeInTheDocument();
    expect(calls.some((u) => u.includes("/ayah/"))).toBe(false); // references only until asked
    expect(JSON.stringify(localStorage)).not.toContain("ٱللَّهُ"); // no Quran text duplicated into storage

    await user.type(screen.getByRole("searchbox", { name: "Filter bookmarks" }), "naas");
    expect(screen.queryByText("Al-Baqara")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /An-Naas/ })).toHaveAttribute("href", "#/quran/114?ayah=1");
    await user.clear(screen.getByRole("searchbox", { name: "Filter bookmarks" }));

    await user.click(screen.getAllByRole("button", { name: "Show verse" })[0]);
    expect(await screen.findByText(fixture("ayah-2-255").data[0].text)).toBeInTheDocument();
    expect(calls.filter((u) => u.includes("/ayah/2:255/"))).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Remove bookmark 2:255" }));
    expect(toasts).toEqual(["Bookmark removed"]);
    expect(bookmarkStore.get().quran).toMatchObject([{ surah: 114, ayah: 1 }]);
  });
});

describe("interface language", () => {
  it("renders the explorer in Urdu while Arabic names keep their own direction", async () => {
    mockProviders();
    await i18n.changeLanguage("ur");
    renderScreen(<Quran />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("قرآن کا مطالعہ");
    await screen.findByText("114 میں سے 114 سورتیں");
    expect(screen.getByRole("searchbox", { name: "سورتیں تلاش کریں" })).toBeInTheDocument();
    const first = tiles()[0];
    expect(within(first).getByText(/7 آیات · مکی/)).toBeInTheDocument();
    expect(first.querySelector(".surah-tile-arabic")).toHaveAttribute("dir", "rtl");
  });
});
