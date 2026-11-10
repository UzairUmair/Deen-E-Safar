"use client";
import { useEffect, useState } from "react";
import { useReducedMotion } from "./useReducedMotion";

/** Must stay in sync with the `tall` media query in styles/homepage.css. */
export const TALL_QUERY = "(max-width: 899px), (max-aspect-ratio: 21/20)";

export type SceneMode = "pending" | "3d" | "static";

function probeWebGL(): "accelerated" | "software" | "none" {
  const attempt = (strict: boolean) => {
    try {
      const canvas = document.createElement("canvas");
      const options = { failIfMajorPerformanceCaveat: strict };
      const gl = (canvas.getContext("webgl2", options) || canvas.getContext("webgl", options)) as WebGLRenderingContext | null;
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
      return Boolean(gl);
    } catch {
      return false;
    }
  };
  if (attempt(true)) return "accelerated";
  return attempt(false) ? "software" : "none";
}

/**
 * Decides whether the homepage may run the live 3D story.
 * `static` (pre-rendered stills, no scroll choreography) is used for reduced motion,
 * missing or software-only WebGL, data-saver, and very low memory devices.
 * Append `?3d=force` to the URL to run the live scene on a software renderer.
 */
export function useResponsiveScene() {
  const reduced = useReducedMotion();
  const [capability, setCapability] = useState<"unknown" | "ok" | "weak">("unknown");
  const [tall, setTall] = useState(false);
  const [lowPower, setLowPower] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    const forced = new URLSearchParams(window.location.search).get("3d") === "force";
    const webgl = probeWebGL();
    const constrained = Boolean(nav.connection?.saveData) || (nav.deviceMemory !== undefined && nav.deviceMemory <= 2);
    setCapability(webgl === "accelerated" ? (constrained && !forced ? "weak" : "ok") : webgl === "software" && forced ? "ok" : "weak");

    const media = window.matchMedia(TALL_QUERY);
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const apply = () => {
      setTall(media.matches);
      setLowPower(media.matches || coarse || (navigator.hardwareConcurrency || 8) <= 4);
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  const mode: SceneMode = capability === "unknown" ? "pending" : capability === "ok" && !reduced ? "3d" : "static";
  return { mode, tall, lowPower };
}
