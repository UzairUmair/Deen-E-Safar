// Hash-based routing. Application routes look like paths (#/quran/2?ayah=5); a few older
// screens still use their original form (#course?path=seerah) and old links are redirected.
import { useSyncExternalStore } from "react";

export type Route = { name: string; segments: string[]; query: URLSearchParams; hash: string };

const PATH_ROUTES = new Set(["quran", "prayer", "duas", "dashboard", "ai", "bookmarks", "preferences", "hadith"]);

/** Accepts a path ("/quran/2") or a pre-v2 name ("reader?surah=2&ayah=5") and returns the current form, without "#". */
export function normalizeTarget(target: string) {
  const value = target.replace(/^#/, "");
  if (value.startsWith("/")) return value;
  const [name, query = ""] = value.split("?");
  if (!name || name === "home") return "/";
  if (name === "reader") {
    const params = new URLSearchParams(query);
    const ayah = params.get("ayah");
    return `/quran/${params.get("surah") || "1"}${ayah && ayah !== "1" ? `?ayah=${ayah}` : ""}`;
  }
  if (name === "auth") return "/dashboard";
  if (PATH_ROUTES.has(name)) return `/${name}${query ? `?${query}` : ""}`;
  return value;
}

export function parseHash(hash: string): Route {
  const value = hash.replace(/^#/, "");
  const [path, query = ""] = value.split("?");
  const segments = path.split("/").filter(Boolean);
  return { name: segments[0] || "home", segments, query: new URLSearchParams(query), hash: value };
}

/** href for an <a>. */
export const link = (target: string) => "#" + normalizeTarget(target);

export function navigate(target: string) {
  window.location.hash = normalizeTarget(target);
}

function subscribe(listener: () => void) {
  const onChange = () => {
    const current = window.location.hash.replace(/^#/, "");
    const normalized = normalizeTarget(current);
    // Old bookmarks and links keep working: rewrite them in place, without a history entry.
    if (current && normalized !== current) window.location.replace("#" + normalized);
    else listener();
  };
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => "",
  );
  return parseHash(normalizeTarget(hash));
}
