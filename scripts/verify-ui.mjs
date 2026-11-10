// Browser checks for the homepage story, global buttons and navigation.
// Start the site first (`npm run dev`, or serve `out/` after `npm run build`), then:
//   npm run verify:ui
// Env: BASE (default http://127.0.0.1:3000), CHROME_PATH (default: installed Chrome channel).
// Headless Chrome renders WebGL in software, so the live 3D scene is requested with ?3d=force.
import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const BASE = process.env.BASE || "http://127.0.0.1:3000";
const launch = { args: ["--no-sandbox", "--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist"] };
if (process.env.CHROME_PATH) launch.executablePath = process.env.CHROME_PATH;
else launch.channel = "chrome";

const browser = await chromium.launch(launch);
const results = [];
const problems = [];

async function open({ width = 1440, height = 900, query = "?3d=force", hash = "home", reducedMotion = "no-preference", lang, mobile = false, args } = {}) {
  const context = await (args ? await chromium.launch({ ...launch, args: [...launch.args, ...args] }) : browser).newContext({ viewport: { width, height }, reducedMotion, hasTouch: mobile, isMobile: mobile });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  if (lang) await page.addInitScript((l) => localStorage.setItem("deen-preferences", JSON.stringify({ lang: l })), lang);
  await page.goto(`${BASE}/${query}#${hash}`, { waitUntil: "load" });
  await page.waitForSelector("html[data-theme]"); // set once the app has hydrated and read preferences
  return { page, errors, close: () => context.close() };
}

async function scrollStory(page, fraction) {
  const target = await page.evaluate((f) => {
    const r = document.querySelector(".story-track").getBoundingClientRect();
    return Math.round(r.top + scrollY + f * (r.height - innerHeight));
  }, fraction);
  const from = await page.evaluate(() => scrollY);
  for (let i = 1; i <= 16; i++) {
    await page.evaluate((y) => scrollTo({ top: y, behavior: "instant" }), from + ((target - from) * i) / 16);
    await page.waitForTimeout(50);
  }
  // Wait for the main thread to present a frame before reading state.
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
  await page.waitForTimeout(500);
}

const visible = (page, selector) => page.evaluate((s) => [...document.querySelectorAll(s)].every((el) => getComputedStyle(el).visibility === "visible" && +getComputedStyle(el).opacity > 0.95), selector);
const hidden = (page, selector) => page.evaluate((s) => [...document.querySelectorAll(s)].every((el) => getComputedStyle(el).visibility === "hidden"), selector);
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

async function test(name, fn) {
  try {
    await fn();
    results.push(`PASS  ${name}`);
  } catch (error) {
    results.push(`FAIL  ${name}`);
    problems.push(`${name}: ${error.message.split("\n")[0]}`);
  }
}

await test("live 3D story: canvas renders, hero visible, guide hidden at the top", async () => {
  const { page, errors, close } = await open();
  await page.waitForSelector('.story[data-mode="3d"][data-timeline="ready"] .story-canvas[data-ready="true"] canvas', { timeout: 30000 });
  assert.ok(await visible(page, ".hero-copy"));
  assert.ok(await hidden(page, ".guide-copy, .surah-preview"));
  assert.deepEqual(errors, []);
  await close();
});

await test("scrolling opens the story, scrolling back reverses it", async () => {
  const { page, errors, close } = await open();
  await page.waitForSelector('.story[data-timeline="ready"] .story-canvas[data-ready="true"]', { timeout: 30000 });
  await scrollStory(page, 0.78);
  assert.ok(await visible(page, ".guide-copy, .surah-preview"), "guide and surah cards revealed");
  assert.ok(await hidden(page, ".hero-copy"), "hero copy gone");
  assert.ok((await page.evaluate(() => +getComputedStyle(document.querySelector(".stage-night")).opacity)) > 0.95, "night backdrop in");
  await scrollStory(page, 0);
  assert.ok(await visible(page, ".hero-copy"), "hero copy back");
  assert.ok(await hidden(page, ".guide-copy, .surah-preview"), "guide hidden again");
  assert.ok((await page.evaluate(() => +getComputedStyle(document.querySelector(".stage-night")).opacity)) < 0.05, "day backdrop back");
  assert.deepEqual(errors, []);
  await close();
});

await test("surah preview cards and the explorer CTA open real routes", async () => {
  const { page, close } = await open();
  await page.waitForSelector('.story[data-timeline="ready"] .story-canvas[data-ready="true"]', { timeout: 30000 });
  assert.deepEqual(await page.$$eval(".surah-preview a", (links) => links.map((a) => a.getAttribute("href"))), ["#reader?surah=1&ayah=1", "#reader?surah=2&ayah=1", "#reader?surah=3&ayah=1"]);
  await scrollStory(page, 0.78);
  await page.click(".surah-preview:nth-child(2) a");
  await page.waitForSelector(".reader-heading");
  assert.match(await page.textContent(".reader-heading"), /Al-Baqara/);
  await page.goto(`${BASE}/?3d=force#home`);
  await page.waitForSelector('.story[data-timeline="ready"] .story-canvas[data-ready="true"]', { timeout: 30000 });
  await scrollStory(page, 0.78);
  await page.click(".guide-copy .btn");
  await page.waitForSelector(".surah-grid");
  await close();
});

await test("bookshelf: 3D hover labels a book, click opens its panel, action navigates", async () => {
  const { page, close } = await open();
  await page.waitForSelector('.story[data-timeline="ready"] .story-canvas[data-ready="true"]', { timeout: 30000 });
  await page.waitForTimeout(2500);
  const box = await page.locator(".story-canvas canvas").boundingBox();
  // Sweep across the shelf until a book reports itself.
  let label = null;
  for (let x = 0.56; x < 0.92 && !label; x += 0.02) {
    await page.mouse.move(box.x + box.width * x, box.y + box.height * 0.52);
    await page.waitForTimeout(250);
    label = await page.evaluate(() => document.querySelector(".book-label")?.textContent || null);
    if (label) {
      await page.mouse.click(box.x + box.width * x, box.y + box.height * 0.52);
      await page.waitForSelector(".book-panel");
      assert.equal(await page.textContent(".book-panel h3"), label);
    }
  }
  assert.ok(label, "a book label appeared on hover");
  // Keyboard / touch path through the chip list.
  await page.click('.book-chips button:has-text("Islamic History")');
  assert.match(await page.textContent(".book-panel"), /Coming soon/);
  assert.equal(await page.locator(".book-panel .btn").count(), 0, "unbuilt section offers no fake action");
  await page.click('.book-chips button:has-text("Seerah")');
  await page.click(".book-panel .btn");
  await page.waitForFunction(() => location.hash === "#course?path=seerah");
  await close();
});

await test("diagonal sweep button: hidden at rest, covers on hover, no layout shift, disabled is inert", async () => {
  const { page, close } = await open({ hash: "dashboard" });
  const button = page.locator(".inner-main .btn").first();
  await button.waitFor();
  await page.waitForTimeout(800);
  const sweep = () => button.evaluate((el) => new DOMMatrix(getComputedStyle(el, "::before").transform).e);
  const before = await button.boundingBox();
  assert.ok((await sweep()) < -before.width, "sweep layer parked outside the button");
  await button.hover();
  await page.waitForTimeout(700);
  assert.ok(Math.abs(await sweep()) < 1, "sweep layer covers the button");
  assert.deepEqual(await button.boundingBox(), before);
  assert.equal(await button.evaluate((el) => getComputedStyle(el).overflow), "hidden");
  await page.mouse.move(0, 0);
  await page.waitForTimeout(700);
  assert.ok((await sweep()) < -before.width, "sweep reverses on leave");
  await button.evaluate((el) => (el.disabled = true));
  await button.hover({ force: true });
  await page.waitForTimeout(600);
  assert.ok((await sweep()) < -before.width, "disabled button does not sweep");
  await close();
});

await test("user dashboard and Quran reader stay free of WebGL", async () => {
  for (const hash of ["dashboard", "reader?surah=1&ayah=1", "quran", "prayer", "duas"]) {
    const { page, errors, close } = await open({ hash });
    await page.waitForTimeout(1500);
    assert.equal(await page.locator("canvas").count(), 0, `${hash} has no canvas`);
    assert.deepEqual(errors, [], hash);
    await close();
  }
});

await test("mobile menu: opens, traps focus, Escape closes and returns focus", async () => {
  const { page, close } = await open({ width: 390, height: 844, mobile: true });
  await page.click(".mobile-menu");
  await page.waitForSelector('.drawer[role="dialog"]');
  await page.waitForFunction(() => document.activeElement.id === "close-drawer", null, { timeout: 5000 });
  assert.equal(await page.getAttribute(".mobile-menu", "aria-expanded"), "true");
  await page.keyboard.press("Shift+Tab");
  assert.ok(await page.evaluate(() => document.querySelector(".drawer").contains(document.activeElement)), "focus stays inside");
  await page.keyboard.press("Escape");
  await page.waitForSelector(".drawer", { state: "detached" });
  await page.waitForFunction(() => document.activeElement.classList.contains("mobile-menu"), null, { timeout: 5000 });
  await page.click(".mobile-menu");
  await page.click('.drawer a[href="#prayer"]');
  await page.waitForFunction(() => location.hash === "#prayer");
  await page.waitForSelector(".drawer", { state: "detached" });
  await close();
});

await test("no horizontal overflow at 320 / 360 / 390 / 430 / 768 / 1024 / 1440, hero CTA on screen", async () => {
  for (const [width, height] of [[320, 568], [360, 740], [390, 844], [430, 932], [768, 1024], [1024, 768], [1440, 900]]) {
    const { page, close } = await open({ width, height, mobile: width < 800 });
    await page.waitForSelector('.story[data-timeline="ready"] .story-canvas[data-ready="true"]', { timeout: 30000 });
    assert.equal(await overflow(page), 0, `${width}px at top`);
    const cta = await page.locator(".hero-actions .btn").first().boundingBox();
    assert.ok(cta.x >= 0 && cta.x + cta.width <= width && cta.y + cta.height <= height, `${width}px hero CTA visible`);
    await scrollStory(page, 0.78);
    assert.equal(await overflow(page), 0, `${width}px mid-story`);
    const inside = await page.evaluate(() => [...document.querySelectorAll(".guide-copy .btn, .surah-preview a")].every((el) => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; }));
    assert.ok(inside, `${width}px guide CTA and surah cards inside the viewport`);
    const top = await page.evaluate(() => { const el = document.querySelector(".guide-copy .btn"); const r = el.getBoundingClientRect(); return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest(".btn") === el; });
    assert.ok(top, `${width}px guide CTA is not covered by the canvas`);
    await close();
  }
});

await test("Urdu: RTL document, translated hero, Arabic surah names stay RTL", async () => {
  const { page, close } = await open({ lang: "ur" });
  await page.waitForFunction(() => document.documentElement.dir === "rtl");
  assert.equal(await page.textContent(".hero-copy h1"), "ایمان اور علم کا سفر");
  await page.waitForFunction(() => document.querySelector(".surah-preview-arabic")?.textContent.trim().length > 3);
  assert.equal(await page.getAttribute(".surah-preview-arabic", "dir"), "rtl");
  assert.equal(await overflow(page), 0);
  await close();
});

await test("reduced motion: static layout, no canvas, content and links intact", async () => {
  const { page, errors, close } = await open({ reducedMotion: "reduce" });
  await page.waitForSelector('.story[data-mode="static"]');
  assert.equal(await page.locator("canvas").count(), 0);
  assert.ok(await visible(page, ".hero-copy, .guide-copy, .surah-preview"));
  assert.ok(await page.locator(".shelf-poster").evaluate((img) => img.complete && img.naturalWidth > 0));
  await page.click('.book-chips button:has-text("Hadith")');
  await page.waitForSelector(".book-panel .btn");
  assert.deepEqual(errors, []);
  await close();
});

await test("WebGL disabled: homepage falls back to the static stills and still navigates", async () => {
  const fallback = await chromium.launch({ ...launch, args: ["--no-sandbox", "--disable-3d-apis", "--disable-gpu"] });
  const page = await (await fallback.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${BASE}/?3d=force#home`, { waitUntil: "load" });
  await page.waitForSelector('.story[data-mode="static"]');
  assert.equal(await page.locator("canvas").count(), 0);
  await page.click(".guide-copy .btn");
  await page.waitForSelector(".surah-grid");
  assert.deepEqual(errors, []);
  await fallback.close();
});

await test("AI showcase: labelled preview, messages cascade in order, verse comes from bundled text", async () => {
  const { page, close } = await open({ reducedMotion: "no-preference" });
  await page.waitForSelector('.story[data-timeline="ready"] .story-canvas[data-ready="true"]', { timeout: 30000 });
  assert.match(await page.textContent(".phone-tag"), /Illustrative preview/);
  await page.locator(".ai-showcase").scrollIntoViewIfNeeded();
  await page.evaluate(() => document.querySelector(".phone").scrollIntoView({ block: "center", behavior: "instant" }));
  const order = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const items = [...document.querySelectorAll(".phone-thread > *")];
        const seen = [];
        const tick = () => {
          items.forEach((el, i) => !seen.includes(i) && +getComputedStyle(el).opacity > 0.5 && seen.push(i));
          if (seen.length === items.length) resolve(seen);
          else requestAnimationFrame(tick);
        };
        tick();
        setTimeout(() => resolve(seen), 8000);
      }),
  );
  assert.deepEqual(order, [0, 1, 2, 3, 4, 5], "items appeared one after another");
  const bundled = await (await fetch(`${BASE}/content/quran/13.json`)).json();
  assert.equal((await page.textContent(".chat-arabic")).trim(), bundled.verses.find((v) => v.id === 28).arabic.trim());
  assert.equal(await page.getAttribute(".phone .source-card", "href"), "#reader?surah=13&ayah=28");
  await close();
});

await browser.close();
console.log(results.join("\n"));
if (problems.length) {
  console.error("\n" + problems.join("\n"));
  process.exit(1);
}
console.log(`\nAll ${results.length} browser checks passed.`);
