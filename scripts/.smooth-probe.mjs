// One-off evidence: how the story and page changes behave over time.
import { launch, mockProviders, BASE } from "/tmp/hoplite/workspace/scripts/lib/harness.mjs";
const browser = await launch();
const context = await browser.newContext({ viewport: { width: 560, height: 360 } });
await mockProviders(context);
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 160)));
await page.goto(`${BASE}/?3d=force#/`);
await page.waitForSelector('.story[data-timeline="ready"] .story-canvas[data-ready="true"]');
await page.waitForTimeout(2500);
// A single abrupt jump of 45% of the track, as a coarse mouse wheel or a Page Down would make.
const samples = await page.evaluate(async () => {
  const track = document.querySelector(".story-track").getBoundingClientRect();
  const night = document.querySelector(".stage-night");
  scrollTo({ top: 0.45 * (track.height - innerHeight), behavior: "instant" });
  const out = [];
  const start = performance.now();
  await new Promise((done) => {
    const tick = () => {
      const t = performance.now() - start;
      out.push([Math.round(t), +(+getComputedStyle(night).opacity).toFixed(3)]);
      t < 1500 ? requestAnimationFrame(tick) : done();
    };
    requestAnimationFrame(tick);
  });
  return out;
});
const pick = (ms) => samples.reduce((a, b) => (Math.abs(b[0] - ms) < Math.abs(a[0] - ms) ? b : a));
console.log("backdrop opacity after one abrupt jump (ms → value):", [0, 100, 200, 350, 500, 700, 900, 1200, 1500].map((ms) => pick(ms).join("→")).join("  "));
const steps = samples.slice(1).map((s, i) => Math.abs(s[1] - samples[i][1]));
console.log("frames:", samples.length, "largest single-frame change:", Math.max(...steps).toFixed(3), "monotonic:", samples.every((s, i) => i === 0 || s[1] >= samples[i - 1][1] - 0.001));

// Page change from far down the homepage.
await page.goto(`${BASE}/#/duas`); await page.waitForSelector(".dua-card"); await page.waitForTimeout(800); await page.evaluate(() => scrollTo({ top: 1400, behavior: "instant" }));
await page.waitForTimeout(1500);
const log = await page.evaluate(async () => {
  const out = [];
  const start = performance.now();
  location.hash = "/prayer";
  await new Promise((done) => {
    const tick = () => {
      const t = performance.now() - start;
      const screens = [...document.querySelectorAll("main > [data-screen]")];
      out.push([Math.round(t), screens.map((s) => `${s.dataset.screen}@${(+getComputedStyle(s).opacity).toFixed(2)}`).join("+"), Math.round(scrollY)]);
      t < 900 ? requestAnimationFrame(tick) : done();
    };
    requestAnimationFrame(tick);
  });
  return out;
});
const at = (ms) => log.reduce((a, b) => (Math.abs(b[0] - ms) < Math.abs(a[0] - ms) ? b : a));
console.log("page change (ms: screens, scrollY):", [0, 80, 150, 220, 320, 500, 900].map((ms) => { const s = at(ms); return `${s[0]}: ${s[1]} y=${s[2]}`; }).join(" | "));
console.log("ever two screens at once:", log.some((l) => l[1].includes("+")), "| old screen ever shown at top:", log.some((l) => /^duas@(?!0\.00)/.test(l[1]) && l[2] === 0));
console.log("errors:", JSON.stringify(errors));
await browser.close();
