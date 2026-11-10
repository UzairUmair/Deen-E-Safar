"use client";
import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(notify: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
}

/** Live `prefers-reduced-motion`; false during prerender. */
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
}
