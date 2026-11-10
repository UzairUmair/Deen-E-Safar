// Browser checks for the application screens: Quran Explorer, reader, audio, bookmarks,
// prayer times, duas, dashboard, preferences, language switching and responsive layout.
// Providers are answered from recorded fixtures and the clock is fixed, so runs are repeatable.
//   npm run build && npx serve out   (or npm run dev), then:  npm run verify:app
// Env: BASE (default http://127.0.0.1:3000), CHROME_PATH.
import assert from "node:assert/strict";
import { BASE, launch, mockProviders, overflow, preferences, report, test } from "./lib/harness.mjs";

const NOW = "2026-11-10T12:55:00Z"; // 17:55 in Karachi: next prayer is Isha at 19:05
const browser = await launch();

async function open(hash, { width = 1280, height = 800, mobile = false, storage = {}, fail, time = NOW, geolocation, permissions = [] } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: mobile, isMobile: mobile, timezoneId: "Asia/Karachi", geolocation, permissions });
  const requests = await mockProviders(context, { fail });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource|net::ERR_FAILED/.test(m.text()) && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.clock.install({ time: new Date(time) });
  if (Object.keys(storage).length) {
    // Seed once: an init script would overwrite what the test saves before a reload.
    await page.goto(`${BASE}/favicon-not-needed`, { waitUntil: "commit" }).catch(() => {});
    await page.evaluate((entries) => Object.entries(entries).forEach(([k, v]) => localStorage.setItem(k, v)), storage);
  }
  await page.goto(`${BASE}/#${hash}`, { waitUntil: "load" });
  await page.waitForSelector("html[data-theme]");
  return { page, context, requests, errors, close: () => context.close() };
}

const stored = (page, name) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "null")?.data ?? null, `deen-v2:guest:${name}`);
const inViewport = (page, selector) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return r.top >= 0 && r.top < innerHeight; }, selector);

await test("Quran directory lists 114 surahs; search narrows; a card opens the right surah", async () => {
  const { page, errors, close } = await open("/quran");
  await page.waitForSelector(".surah-tile[data-surah='114']");
  assert.equal(await page.locator("a.surah-tile").count(), 114);
  await page.fill("input[type=search]", "ikhl");
  assert.deepEqual(await page.locator("a.surah-tile").evaluateAll((els) => els.map((e) => e.dataset.surah)), ["112"]);
  await page.click("a.surah-tile");
  await page.waitForFunction(() => location.hash === "#/quran/112");
  await page.waitForSelector("li.ayah");
  assert.deepEqual(await page.locator("li.ayah").evaluateAll((els) => els.map((e) => e.dataset.ayah)), ["1", "2", "3", "4"]);
  assert.match(await page.textContent(".surah-heading"), /Al-Ikhlaas/);
  assert.equal(await page.getAttribute(".ayah-arabic", "translate"), "no");
  assert.equal(await page.getAttribute(".ayah-arabic", "dir"), "rtl");
  assert.deepEqual(errors, []);
  await close();
});

await test("first-version links are redirected to the current routes", async () => {
  const { page, close } = await open("reader?surah=112&ayah=3");
  await page.waitForFunction(() => location.hash === "#/quran/112?ayah=3");
  await page.waitForSelector("#ayah-3[data-highlighted]");
  await close();
});

await test("translation switches between English and Urdu and the choice persists", async () => {
  const { page, close } = await open("/quran/112");
  await page.waitForSelector(".ayah-translation[lang=en]");
  await page.click("text=Reader settings");
  await page.selectOption(".settings-panel select >> nth=0", "ur");
  await page.waitForSelector(".ayah-translation[lang=ur][dir=rtl]");
  assert.match(await page.textContent(".reader-credit"), /Fateh Muhammad Jalandhry/);
  await page.reload();
  await page.waitForSelector(".ayah-translation[lang=ur]");
  assert.equal((await stored(page, "preferences")).quran.translation, "ur");
  await close();
});

await test("recitation really plays, pauses, resumes, advances to the next verse and stops", async () => {
  const { page, requests, errors, close } = await open("/quran/112");
  await page.waitForSelector("li.ayah");
  await page.click("#ayah-1 button[aria-label='Play verse 1']");
  await page.waitForSelector(".audio-player[data-status=playing]");
  assert.ok(requests.some((u) => /cdn\.islamic\.network\/quran\/audio\/128\/ar\.alafasy\/6222\.mp3$/.test(u)), "audio requested for global ayah 6222");
  assert.match(await page.textContent(".audio-info strong"), /Playing verse 1/);
  await page.click(".audio-main");
  await page.waitForSelector(".audio-player[data-status=paused]");
  await page.click(".audio-main");
  await page.waitForSelector(".audio-player[data-status=playing]");
  // The recorded clip is two seconds long; the next verse should start by itself.
  await page.waitForFunction(() => /Playing verse 2/.test(document.querySelector(".audio-info strong").textContent), null, { timeout: 15000 });
  assert.ok(await page.locator("#ayah-2[data-active]").count());
  await page.click("button[aria-label='Stop recitation']");
  await page.waitForSelector(".audio-player[data-status=idle]");
  await page.click("#ayah-3 button[aria-label='Play verse 3']");
  await page.waitForSelector(".audio-player[data-status=playing]");
  await page.click("text=All surahs >> nth=0"); // leaving the reader ends playback
  await page.waitForSelector(".surah-tiles");
  assert.deepEqual(errors, []);
  await close();
});

await test("a failed audio file is reported instead of pretending to play", async () => {
  const { page, close } = await open("/quran/112", { fail: (url) => url.includes("cdn.islamic.network") });
  await page.waitForSelector("li.ayah");
  await page.click("#ayah-1 button[aria-label='Play verse 1']");
  await page.waitForSelector(".audio-player[data-status=error] .audio-error");
  await close();
});

await test("verse bookmarks persist across a reload and appear on the Bookmarks page", async () => {
  const { page, close } = await open("/quran/1");
  await page.waitForSelector("li.ayah");
  await page.click("#ayah-5 button[aria-label='Bookmark verse 5']");
  await page.waitForSelector(".toast");
  await page.reload();
  await page.waitForSelector("#ayah-5 button[aria-pressed=true][aria-label='Remove bookmark for verse 5']");
  await page.goto(`${BASE}/#/bookmarks`);
  await page.waitForSelector(".bookmark-row");
  assert.match(await page.textContent(".bookmark-row"), /Al-Faatiha.*1:5/s);
  await page.click(".bookmark-row >> text=Open");
  await page.waitForFunction(() => location.hash === "#/quran/1?ayah=5");
  await page.waitForSelector("#ayah-5[data-highlighted]");
  await close();
});

await test("reading position: saved while reading, offered on return, and restored", async () => {
  const { page, close } = await open("/quran/1", { width: 390, height: 560, mobile: true });
  await page.waitForSelector("li.ayah");
  assert.equal(await stored(page, "reading-progress"), null);
  await page.waitForTimeout(900);
  await page.evaluate(() => document.querySelector("#ayah-3").scrollIntoView({ block: "start", behavior: "instant" }));
  await page.waitForTimeout(400);
  await page.clock.runFor(3000); // rest on the verse: the save is debounced
  await page.waitForFunction(() => localStorage.getItem("deen-v2:guest:reading-progress"));
  const { surah, ayah } = await stored(page, "reading-progress");
  // The verse under the docked player is the one recorded (3, or its neighbour on a short page).
  assert.ok(surah === 1 && Math.abs(ayah - 3) <= 1, `saved 1:${ayah}`);
  await page.goto(`${BASE}/#/quran`);
  const card = page.getByTestId("continue-reading");
  await card.waitFor();
  assert.equal(await card.getAttribute("href"), `#/quran/1?ayah=${ayah}`);
  await card.click();
  await page.waitForSelector(`#ayah-${ayah}[data-highlighted]`);
  await page.clock.runFor(200);
  await page.waitForTimeout(200);
  assert.ok(await inViewport(page, `#ayah-${ayah}`), "saved verse is brought into view");
  assert.ok(await page.evaluate(() => scrollY > 100), "the page is scrolled to it, not left at the top");
  await page.reload();
  await page.waitForSelector("li.ayah");
  assert.equal((await stored(page, "reading-progress")).ayah, ayah);
  await close();
});

await test("verse search finds text and opens the matching ayah", async () => {
  const { page, close } = await open("/quran");
  await page.click("role=tab[name='Search verses']");
  await page.fill("input[aria-label='Search verses']", "daybreak");
  await page.clock.runFor(600);
  await page.waitForSelector(".result-list a");
  assert.deepEqual(await page.locator(".result-list a").evaluateAll((els) => els.map((e) => e.getAttribute("href"))), ["#/quran/6?ayah=96", "#/quran/113?ayah=1"]);
  await page.click(".result-list a >> nth=1");
  await page.waitForSelector("#ayah-1");
  assert.match(await page.textContent(".surah-heading"), /Al-Falaq/);
  await close();
});

await test("provider outage shows an error state with a retry that recovers", async () => {
  let down = true;
  const { page, close } = await open("/quran", { fail: (url) => down && url.includes("alquran.cloud") });
  await page.waitForSelector(".error-state", { timeout: 20000 });
  assert.equal(await page.locator("a.surah-tile").count(), 0);
  down = false;
  await page.click(".error-state button");
  await page.waitForSelector(".surah-tile[data-surah='114']");
  await close();
});

await test("prayer times: provider times in the location's zone, live countdown, highlighted next prayer", async () => {
  const { page, requests, errors, close } = await open("/prayer");
  await page.waitForSelector("[data-testid=countdown]");
  const times = await page.locator(".prayer-card").evaluateAll((els) => Object.fromEntries(els.map((e) => [e.dataset.prayer, e.querySelector("time").textContent.trim()])));
  assert.deepEqual(times, { Fajr: "05:26 AM", Sunrise: "06:45 AM", Dhuhr: "12:16 PM", Asr: "04:11 PM", Maghrib: "05:47 PM", Isha: "07:05 PM" });
  assert.match(await page.textContent("[data-testid=next-prayer]"), /Isha/);
  assert.equal(await page.getAttribute(".prayer-card[data-next]", "data-prayer"), "Isha");
  const seconds = async () => (await page.textContent("[data-testid=countdown]")).split(":").reduce((total, part) => total * 60 + Number(part), 0);
  const before = await seconds();
  assert.ok(before > 4190 && before <= 4200, `about 01:10:00 remaining, got ${before}s`);
  await page.clock.runFor(5000);
  await page.waitForTimeout(300);
  const after = await seconds();
  assert.ok(before - after >= 4 && before - after <= 7, `countdown advanced by about 5s (was ${before - after}s)`);
  assert.ok(requests.some((u) => u.includes("/timings/10-11-2026") && u.includes("timezonestring=Asia%2FKarachi") && u.includes("iso8601=true")));
  assert.deepEqual(errors, []);
  await close();
});

await test("prayer countdown rolls over to tomorrow's Fajr after Isha", async () => {
  const { page, requests, close } = await open("/prayer", { time: "2026-11-10T14:04:57Z" });
  await page.waitForSelector("[data-testid=countdown]");
  assert.match(await page.textContent("[data-testid=next-prayer]"), /Isha/);
  await page.clock.runFor(5000);
  await page.waitForFunction(() => /Fajr/.test(document.querySelector("[data-testid=next-prayer]")?.textContent ?? ""));
  assert.match(await page.textContent("[data-testid=countdown]"), /^10:21:\d\d$/);
  assert.ok(requests.some((u) => u.includes("/timings/11-11-2026")), "next day's schedule requested");
  await close();
});

await test("location and calculation settings change the request, persist, and reach the dashboard widget", async () => {
  const { page, requests, close } = await open("/prayer");
  await page.waitForSelector("[data-testid=countdown]");
  await page.fill("input[aria-label='Search a city']", "london");
  await page.click(".city-list button");
  await page.waitForFunction(() => /London/.test(document.querySelector("h1")?.textContent ?? ""));
  await page.selectOption("[data-testid=method-select]", "3");
  await page.waitForFunction(() => /Muslim World League/.test(document.querySelector("[data-testid=method-name]")?.textContent ?? ""));
  await page.selectOption("[data-testid=school-select]", "0");
  await page.waitForTimeout(400);
  const final = new URL(requests.filter((u) => u.includes("aladhan")).at(-1));
  assert.deepEqual(Object.fromEntries(final.searchParams), { latitude: "51.5074", longitude: "-0.1278", method: "3", school: "0", timezonestring: "Europe/London", iso8601: "true" });
  await page.reload();
  await page.waitForSelector("[data-testid=countdown]");
  assert.match(await page.textContent("h1"), /London/);
  assert.equal(await page.inputValue("[data-testid=method-select]"), "3");
  const next = await page.textContent("[data-testid=next-prayer]");
  await page.goto(`${BASE}/#/dashboard`);
  await page.waitForSelector(".prayer-widget [data-testid=countdown]");
  assert.match(await page.textContent("[data-testid=widget-location]"), /London/);
  assert.equal(await page.textContent(".prayer-widget [data-testid=next-prayer]"), next);
  await close();
});

await test("location permission: never requested on load; denial is explained; grant uses the device position", async () => {
  const denied = await open("/prayer");
  await denied.page.waitForSelector("[data-testid=countdown]");
  await denied.page.click("text=Use My Location");
  await denied.page.waitForSelector(".location-picker [role=alert]");
  assert.match(await denied.page.textContent(".location-picker [role=alert]"), /denied|could not be determined/);
  assert.match(await denied.page.textContent("[data-testid=location-name]"), /Karachi/);
  await denied.close();

  const granted = await open("/prayer", { geolocation: { latitude: 31.520412, longitude: 74.358749 }, permissions: ["geolocation"] });
  await granted.page.waitForSelector("[data-testid=countdown]");
  assert.ok(!granted.requests.some((u) => u.includes("latitude=31.52")), "no location use before the button is pressed");
  await granted.page.click("text=Use My Location");
  await granted.page.waitForFunction(() => /My location/.test(document.querySelector("[data-testid=location-name]")?.textContent ?? ""));
  assert.ok(granted.requests.some((u) => u.includes("latitude=31.52") && u.includes("longitude=74.36")));
  await granted.close();
});

await test("duas: verified list, category filter, details with source, bookmark shown in Bookmarks and dashboard", async () => {
  const { page, errors, close } = await open("/duas");
  await page.waitForSelector(".dua-card");
  assert.equal(await page.locator(".dua-card").count(), 19);
  await page.click(".chip-row >> text=Travel");
  assert.equal(await page.locator(".dua-card").count(), 2);
  await page.click(".dua-card-link >> nth=0");
  await page.waitForSelector(".dua-article");
  assert.match(await page.textContent(".dua-source"), /Quran 43:13/);
  await page.click("button[aria-label='Bookmark this dua']");
  await page.waitForSelector("button[aria-label='Remove bookmark'][aria-pressed=true]");
  await page.reload();
  await page.waitForSelector("button[aria-label='Remove bookmark'][aria-pressed=true]");
  await page.goto(`${BASE}/#/bookmarks?tab=duas`);
  await page.waitForSelector(".bookmark-row");
  assert.match(await page.textContent(".bookmark-row"), /Remembering blessings in travel/);
  await page.goto(`${BASE}/#/dashboard`);
  await page.waitForSelector(".widget-list a[href='#/duas/43-13']");
  assert.deepEqual(errors, []);
  await close();
});

await test("dashboard: honest empty states for a new visitor, real daily verse, working quick actions", async () => {
  const { page, errors, close } = await open("/dashboard");
  await page.waitForSelector(".daily-verse .daily-arabic");
  const text = await page.textContent(".dashboard");
  for (const expected of ["Guest Mode", "Nothing saved yet", "Your reading position will appear here", "Surahs and duas you open will be listed here", "No lessons completed yet", "3:159"]) assert.ok(text.includes(expected), expected);
  assert.equal(await page.getAttribute(".daily-verse a.btn", "href"), "#/quran/3?ayah=159");
  for (const [label, hash] of [["Prayer Times", "#/prayer"], ["Daily Duas", "#/duas"], ["Preferences", "#/preferences"]]) {
    await page.click(`.quick-actions >> text=${label}`);
    await page.waitForFunction((h) => location.hash === h, hash);
    await page.goBack();
    await page.waitForSelector(".quick-actions");
  }
  assert.deepEqual(errors, []);
  await close();
});

await test("language: Urdu switch sets lang/dir, translates the interface, persists; Arabic verses keep their direction", async () => {
  const { page, close } = await open("/quran/112");
  await page.waitForSelector("li.ayah");
  await page.selectOption(".language select", "ur");
  await page.waitForFunction(() => document.documentElement.lang === "ur" && document.documentElement.dir === "rtl");
  await page.waitForSelector(".ayah-translation[lang=ur]"); // reader follows the interface language
  assert.equal(await page.textContent(".surah-pager .btn >> nth=-1").then((s) => s.trim()), "اگلی سورت");
  assert.equal(await page.getAttribute(".ayah-arabic", "dir"), "rtl");
  assert.equal(await page.getAttribute(".ayah-ref", "class"), "ayah-ref");
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".ayah-ref")).direction), "ltr"); // references are not mirrored
  await page.reload();
  await page.waitForFunction(() => document.documentElement.lang === "ur" && document.documentElement.dir === "rtl");
  await page.goto(`${BASE}/#/prayer`);
  await page.waitForSelector("[data-testid=countdown]");
  assert.match(await page.textContent(".prayer-card[data-prayer=Fajr]"), /فجر/);
  await page.selectOption(".language select", "en");
  await page.waitForFunction(() => document.documentElement.dir === "ltr");
  assert.match(await page.textContent(".prayer-card[data-prayer=Fajr]"), /Fajr/);
  await close();
});

await test("assistant: clearly not live, and returns labelled source-search citations only", async () => {
  const { page, close } = await open("/ai");
  assert.match(await page.textContent("h1"), /Live answers coming soon/);
  await page.fill("#chat-input", "mercy");
  await page.click(".chat-composer button");
  await page.waitForSelector(".citation-card", { timeout: 30000 });
  assert.match(await page.textContent(".reply-label"), /not an AI answer/);
  assert.match(await page.getAttribute(".citation-card", "href"), /^#\/quran\/\d+\?ayah=\d+$/);
  await close();
});

await test("preferences: theme persists; clearing device data removes everything saved", async () => {
  const { page, close } = await open("/preferences", { storage: { ...preferences({ language: "en", theme: "light" }), "deen-v2:guest:bookmarks": JSON.stringify({ v: 1, data: { quran: [{ surah: 1, ayah: 1, addedAt: "" }], duas: [] } }) } });
  await page.waitForSelector(".preferences");
  await page.selectOption(".preferences .panel >> nth=0 >> select >> nth=1", "dark");
  await page.waitForFunction(() => document.documentElement.dataset.theme === "dark");
  await page.reload();
  await page.waitForFunction(() => document.documentElement.dataset.theme === "dark");
  await page.click("text=Clear device data");
  await page.click("text=Yes, clear my data");
  await page.waitForFunction(() => location.hash === "#/");
  await page.waitForSelector("html[data-theme=light]");
  assert.deepEqual(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("deen-") && !k.endsWith(":migrated") && !k.endsWith(":daily-verse"))), []);
  await close();
});

await test("older screens still work: lesson completion reaches the dashboard, lesson links use current routes, Hadith and quiz respond", async () => {
  const { page, errors, close } = await open("lesson?id=0");
  await page.waitForSelector("main h1");
  await page.click("text=Read Quran 2:177");
  await page.waitForFunction(() => location.hash === "#/quran/2?ayah=177");
  await page.goBack();
  await page.waitForSelector("text=Complete & continue");
  await page.click("text=Connect belief with everyday"); // the lesson's self-check answer
  await page.click("text=Complete & continue");
  await page.waitForFunction(() => JSON.parse(localStorage.getItem("deen-lessons") || "[]").length === 1);
  await page.goto(`${BASE}/#/dashboard`);
  await page.waitForSelector("text=1 of 15 lessons completed");
  await page.goto(`${BASE}/#/hadith`);
  await page.waitForSelector("[aria-label='Save Hadith 10112']");
  await page.click("[aria-label='Save Hadith 10112']");
  await page.waitForFunction(() => JSON.parse(localStorage.getItem("deen-library-saved") || "[]").includes("hadith:10112"));
  await page.click("text=← Daily Duas");
  await page.waitForSelector(".dua-card");
  await page.goto(`${BASE}/#quiz`);
  await page.click(".quiz-option >> nth=0");
  await page.waitForSelector(".quiz .notice");
  assert.deepEqual(errors, []);
  await close();
});

/** Navigates within the app and waits until the screen has its heading and its data. */
async function show(page, screen) {
  await page.goto(`${BASE}/#${screen}`);
  await page.waitForFunction((hash) => location.hash === hash && document.querySelector("main h1") && !document.querySelector("main [role=status] .skeleton, main .skeleton-tile"), `#${screen}`);
  await page.waitForTimeout(150);
}

const SCREENS = ["/quran", "/quran/1", "/bookmarks", "/prayer", "/duas", "/duas/20-114", "/dashboard", "/preferences", "/ai", "/hadith"];

await test("no horizontal overflow or clipped Arabic on any app screen at 320–1440px, in English and Urdu", async () => {
  for (const [width, height] of [[320, 568], [360, 740], [390, 844], [430, 932], [768, 1024], [1024, 768], [1440, 900]]) {
    for (const language of width <= 430 ? ["en", "ur"] : ["en"]) {
      const { page, close } = await open(SCREENS[0], { width, height, mobile: width < 800, storage: preferences({ language, quran: { translation: language } }) });
      for (const screen of SCREENS) {
        await show(page, screen);
        assert.equal(await overflow(page), 0, `${screen} overflows at ${width}px (${language})`);
        const clipped = await page.evaluate(() => [...document.querySelectorAll("[lang=ar], .ayah-translation, .dua-translation, .countdown-clock, .prayer-time")].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.left < -1 || r.right > innerWidth + 1); }).length);
        assert.equal(clipped, 0, `${screen} clips text at ${width}px (${language})`);
      }
      await close();
    }
  }
});

await test("app screens stay light: no WebGL canvas, and every control has an accessible name", async () => {
  const { page, close } = await open(SCREENS[0]);
  for (const screen of SCREENS) {
    await show(page, screen);
    assert.equal(await page.locator("canvas").count(), 0, `${screen} has a canvas`);
    const unnamed = await page.evaluate(() =>
      [...document.querySelectorAll("main button, main a[href], main input, main select")]
        .filter((el) => {
          if (el.closest("[aria-hidden=true]") || el.type === "hidden") return false;
          const labelled = el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.textContent.trim() || el.getAttribute("title") || el.getAttribute("alt") || (el.labels && el.labels.length);
          return !labelled;
        })
        .map((el) => el.outerHTML.slice(0, 120)),
    );
    assert.deepEqual(unnamed, [], `${screen} has controls without a name`);
    assert.equal(await page.locator("main img:not([alt])").count(), 0, `${screen} has images without alt`);
    assert.ok((await page.locator("main h1").count()) >= 1, `${screen} has a main heading`);
  }
  await close();
});

await test("mobile: touch targets are large enough and the audio bar stays inside the screen", async () => {
  const { page, close } = await open("/quran/1", { width: 360, height: 740, mobile: true });
  await page.waitForSelector("li.ayah");
  const small = await page.evaluate(() => [...document.querySelectorAll(".audio-player button, .ayah-actions button, .bottom-nav a")].filter((el) => { const r = el.getBoundingClientRect(); return r.width < 38 || r.height < 38; }).length);
  assert.equal(small, 0);
  const bar = await page.locator(".audio-player").boundingBox();
  assert.ok(bar.x >= 0 && bar.x + bar.width <= 360);
  await close();
});

await browser.close();
report();
