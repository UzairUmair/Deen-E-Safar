// Deterministic stand-ins for the third-party providers, built from responses recorded
// from the real APIs (see README in this folder). Used by the Vitest suite (as a fetch
// mock) and by the Playwright checks (as network routes), so both exercise the same data.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// A string is passed on purpose: under jsdom the global URL class is not the one node:url expects.
const dir = fileURLToPath(import.meta.url).replace(/[^/\\]*$/, "");
const cache = new Map();
const read = (name) => {
  if (!cache.has(name)) cache.set(name, readFileSync(dir + name, "utf8"));
  return cache.get(name);
};
const has = (name) => {
  try {
    read(name);
    return true;
  } catch {
    return false;
  }
};
const json = (body, status = 200) => ({ status, contentType: "application/json", body: typeof body === "string" ? body : JSON.stringify(body) });
const notFound = (message) => json({ code: 404, status: "NOT FOUND", data: message }, 404);

const METHOD_NAMES = { 1: "University of Islamic Sciences, Karachi", 2: "Islamic Society of North America (ISNA)", 3: "Muslim World League", 4: "Umm Al-Qura University, Makkah", 5: "Egyptian General Authority of Survey" };

/**
 * @param {string} url absolute request URL
 * @returns {{status:number, contentType:string, body:string|Buffer}|null} null when the URL is not a provider URL
 */
export function resolveProviderRequest(url) {
  const u = new URL(url);
  if (u.hostname === "api.alquran.cloud") {
    const path = decodeURIComponent(u.pathname).replace(/^\/v1/, "");
    if (path === "/surah") return json(read("surah-list.json"));
    if (path === "/meta") return json(read("meta.json"));
    let m = path.match(/^\/edition\/language\/(en|ur)$/);
    if (m) return json(read(`editions-${m[1]}.json`));
    m = path.match(/^\/surah\/(\d+)\/editions\/quran-uthmani(?:,(en\.sahih|ur\.jalandhry))?$/);
    if (m) {
      const file = `surah-${m[1]}-${m[2] ? m[2].slice(0, 2) : "ar"}.json`;
      return has(file) ? json(read(file)) : Number(m[1]) >= 1 && Number(m[1]) <= 114 ? json({ code: 500, status: "FIXTURE MISSING", data: file }, 500) : notFound("Surat number should be between 1 and 114.");
    }
    m = path.match(/^\/ayah\/(\d+):(\d+)\/editions\//);
    if (m) return has(`ayah-${m[1]}-${m[2]}.json`) ? json(read(`ayah-${m[1]}-${m[2]}.json`)) : notFound("Ayah fixture not recorded.");
    m = path.match(/^\/search\/([^/]+)\/all\/([\w.-]+)$/);
    if (m) return m[1].toLowerCase() === "daybreak" && m[2] === "en.sahih" ? json(read("search-daybreak-en.json")) : json(read("search-empty.json"), 404);
    return notFound("Unknown endpoint.");
  }
  if (u.hostname === "api.aladhan.com") {
    const m = u.pathname.match(/^\/v1\/timings\/(\d{2})-(\d{2})-(\d{4})$/);
    if (!m) return notFound("Unknown endpoint.");
    const date = `${m[3]}-${m[2]}-${m[1]}`;
    const london = u.searchParams.get("timezonestring") === "Europe/London";
    // Two recorded Karachi days are enough for "today" and "tomorrow"; other dates reuse the first.
    const file = london ? "timings-london-2026-11-10.json" : date === "2026-11-11" ? "timings-karachi-2026-11-11.json" : "timings-karachi-2026-11-10.json";
    const body = JSON.parse(read(file));
    const method = Number(u.searchParams.get("method"));
    // Echo the requested settings the way the real API does, so the UI can show them.
    body.data.meta.method = { ...body.data.meta.method, id: method, name: METHOD_NAMES[method] ?? body.data.meta.method.name };
    body.data.meta.school = u.searchParams.get("school") === "1" ? "HANAFI" : "STANDARD";
    return json(body);
  }
  if (u.hostname === "cdn.islamic.network") return { status: 200, contentType: "audio/mpeg", body: readFileSync(dir + "silence.mp3") };
  return null;
}
