// Live checks against the real providers. Run when network access is available:
//   npm run verify:live
// The automated suites (npm test, verify:app) never touch the network; this script is the
// separate integration check that the recorded fixtures still match reality.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const QURAN = "https://api.alquran.cloud/v1";
const PRAYER = "https://api.aladhan.com/v1";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Both APIs allow about 12 requests per second per IP; stay well under it.
const get = async (url) => {
  await sleep(200);
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  return { status: response.status, body: await response.json().catch(() => null), headers: response.headers };
};

const source = (file) => readFileSync(new URL(`../app/${file}`, import.meta.url), "utf8");
const locations = [...source("data/supportedLocations.ts").matchAll(/id: "([^"]+)", city: "([^"]+)".*?latitude: (-?[\d.]+), longitude: (-?[\d.]+), timezone: "([^"]+)"/g)].map((m) => ({ id: m[1], city: m[2], latitude: m[3], longitude: m[4], timezone: m[5] }));
const dailyRefs = [...source("services/quran/dailyVerseService.ts").matchAll(/\[(\d+), (\d+)\]/g)].map((m) => [Number(m[1]), Number(m[2])]);
const methods = [...source("lib/prayerApi.ts").matchAll(/\{ id: (\d+), name: "([^"]+)" \}/g)].filter((m) => !/Standard|Hanafi/.test(m[2])).map((m) => ({ id: Number(m[1]), name: m[2] }));

const results = [];
async function check(name, fn) {
  try {
    const note = await fn();
    results.push(`PASS  ${name}${note ? ` — ${note}` : ""}`);
  } catch (error) {
    results.push(`FAIL  ${name}: ${error.message.split("\n")[0]}`);
    process.exitCode = 1;
  }
}

await check("Al Quran Cloud: surah list has 114 entries with CORS enabled", async () => {
  const { status, body, headers } = await get(`${QURAN}/surah`);
  assert.equal(status, 200);
  assert.equal(body.data.length, 114);
  assert.equal(headers.get("access-control-allow-origin"), "*");
  assert.equal(body.data.reduce((sum, s) => sum + s.numberOfAyahs, 0), 6236);
  return "6,236 ayahs in total";
});

await check("configured editions exist: quran-uthmani, en.sahih, ur.jalandhry, quran-simple-clean", async () => {
  const [en, ur, ar] = await Promise.all(["en", "ur", "ar"].map((l) => get(`${QURAN}/edition/language/${l}`)));
  const ids = [...en.body.data, ...ur.body.data, ...ar.body.data].map((e) => `${e.identifier}:${e.format}:${e.type}`);
  for (const id of ["en.sahih:text:translation", "ur.jalandhry:text:translation", "quran-uthmani:text:quran", "quran-simple-clean:text:quran"]) assert.ok(ids.includes(id), id);
});

await check("reciters are published as verse-by-verse audio and their files are on the CDN", async () => {
  const { body } = await get(`${QURAN}/edition/format/audio`);
  for (const reciter of ["ar.alafasy", "ar.husary"]) {
    assert.ok(body.data.some((e) => e.identifier === reciter && e.type === "versebyverse"), reciter);
    for (const ayah of [1, 262, 6236]) {
      await sleep(150);
      const head = await fetch(`https://cdn.islamic.network/quran/audio/128/${reciter}/${ayah}.mp3`, { method: "HEAD" });
      assert.equal(head.status, 200, `${reciter}/${ayah}`);
      assert.match(head.headers.get("content-type"), /audio/);
    }
  }
});

await check("multi-edition surah request aligns by ayah number (Al-Baqara, 286 ayahs)", async () => {
  const { body } = await get(`${QURAN}/surah/2/editions/quran-uthmani,en.sahih,ur.jalandhry`);
  assert.deepEqual(body.data.map((e) => e.edition.identifier), ["quran-uthmani", "en.sahih", "ur.jalandhry"]);
  for (const edition of body.data) {
    assert.equal(edition.ayahs.length, 286);
    edition.ayahs.forEach((a, i) => assert.equal(a.numberInSurah, i + 1));
  }
  assert.equal(body.data[0].ayahs[254].number, 262);
});

await check("recorded fixtures still match the live text", async () => {
  for (const [file, url] of [["surah-112-en", `${QURAN}/surah/112/editions/quran-uthmani,en.sahih`], ["surah-1-ur", `${QURAN}/surah/1/editions/quran-uthmani,ur.jalandhry`]]) {
    const recorded = JSON.parse(readFileSync(new URL(`../tests/fixtures/${file}.json`, import.meta.url), "utf8"));
    const { body } = await get(url);
    assert.deepEqual(body.data.map((e) => e.ayahs.map((a) => a.text)), recorded.data.map((e) => e.ayahs.map((a) => a.text)), file);
  }
});

await check("search: matches, the 404-for-no-results behaviour, and Arabic search", async () => {
  const hit = await get(`${QURAN}/search/daybreak/all/en.sahih`);
  assert.ok(hit.body.data.matches.some((m) => m.surah.number === 113 && m.numberInSurah === 1));
  const miss = await get(`${QURAN}/search/zzzzqqq/all/en.sahih`);
  assert.equal(miss.status, 404);
  const arabic = await get(`${QURAN}/search/${encodeURIComponent("رحمة")}/all/quran-simple-clean`);
  assert.ok(arabic.body.data.count > 0);
});

await check("juz metadata lists 30 starting points", async () => {
  const { body } = await get(`${QURAN}/meta`);
  assert.equal(body.data.juzs.references.length, 30);
  assert.deepEqual(body.data.juzs.references[1], { surah: 2, ayah: 142 });
});

await check(`every daily-verse reference resolves (${dailyRefs.length})`, async () => {
  const { body } = await get(`${QURAN}/surah`);
  for (const [surah, ayah] of dailyRefs) assert.ok(ayah <= body.data[surah - 1].numberOfAyahs, `${surah}:${ayah}`);
  for (const [surah, ayah] of [dailyRefs[0], dailyRefs.at(-1)]) {
    const verse = await get(`${QURAN}/ayah/${surah}:${ayah}/editions/quran-uthmani,en.sahih,ur.jalandhry`);
    assert.equal(verse.body.data.length, 3);
    assert.equal(verse.body.data[0].numberInSurah, ayah);
  }
});

await check("invalid surah number is a 404", async () => {
  assert.equal((await get(`${QURAN}/surah/115`)).status, 404);
});

await check("AlAdhan: method identifiers used by the app match GET /methods", async () => {
  const { body } = await get(`${PRAYER}/methods`);
  const live = Object.values(body.data).filter((m) => m.name);
  for (const method of methods) {
    const match = live.find((m) => m.id === method.id);
    assert.ok(match, `method ${method.id}`);
    // Compare loosely: the app drops provider annotations such as "(experimental)".
    assert.ok(match.name.toLowerCase().includes(method.name.toLowerCase().split(" (")[0].split(",")[0].slice(0, 12)), `${method.id}: ${match.name} vs ${method.name}`);
  }
  return `${methods.length} methods`;
});

await check("AlAdhan timings: ISO instants, requested zone, Hijri date, and the Asr school changes Asr", async () => {
  const base = `${PRAYER}/timings/10-11-2026?latitude=24.8607&longitude=67.0011&method=1&timezonestring=Asia/Karachi&iso8601=true`;
  const hanafi = await get(`${base}&school=1`);
  const standard = await get(`${base}&school=0`);
  assert.equal(hanafi.headers.get("access-control-allow-origin"), "*");
  assert.equal(hanafi.body.data.meta.timezone, "Asia/Karachi");
  assert.equal(hanafi.body.data.meta.method.id, 1);
  for (const key of ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"]) assert.match(hanafi.body.data.timings[key], /^2026-11-1[01]T\d\d:\d\d:00\+05:00$/, key);
  assert.ok(Date.parse(hanafi.body.data.timings.Asr) > Date.parse(standard.body.data.timings.Asr), "Hanafi Asr is later");
  assert.ok(Number(hanafi.body.data.date.hijri.year) >= 1448);
  const recorded = JSON.parse(readFileSync(new URL("../tests/fixtures/timings-karachi-2026-11-10.json", import.meta.url), "utf8"));
  assert.deepEqual(hanafi.body.data.timings, recorded.data.timings, "fixture matches live response");
});

await check(`every listed city's time zone matches the zone AlAdhan derives from its coordinates (${locations.length})`, async () => {
  assert.ok(locations.length >= 25);
  const mismatches = [];
  for (const location of locations) {
    // No timezonestring: the provider resolves the zone from the coordinates alone.
    const { status, body } = await get(`${PRAYER}/timings/10-11-2026?latitude=${location.latitude}&longitude=${location.longitude}&method=3`);
    if (status !== 200) mismatches.push(`${location.city}: HTTP ${status}`);
    else if (body.data.meta.timezone !== location.timezone) {
      // Different names for the same rules (e.g. Asia/Calcutta) are fine; compare offsets on two dates.
      const offset = (zone, date) => new Intl.DateTimeFormat("en", { timeZone: zone, timeZoneName: "longOffset" }).format(new Date(date));
      if (["2026-01-15", "2026-07-15"].some((d) => offset(body.data.meta.timezone, d).split(", ")[1] !== offset(location.timezone, d).split(", ")[1])) mismatches.push(`${location.city}: ${location.timezone} vs ${body.data.meta.timezone}`);
    }
  }
  assert.deepEqual(mismatches, []);
});

console.log(results.join("\n"));
console.log(process.exitCode ? "\nLive provider checks FAILED." : `\nAll ${results.length} live provider checks passed.`);
