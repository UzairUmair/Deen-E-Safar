// One shared <audio> element for verse recitation, so two verses can never overlap.
// State is derived from the element's own events, not from what a button assumed.
import { ayahAudioUrl } from "../../lib/quranApi";

// Verse-by-verse editions confirmed on GET /edition/format/audio and on the CDN at 128 kbps.
export const RECITERS = [
  { id: "ar.alafasy", name: "Mishary Rashid Alafasy" },
  { id: "ar.husary", name: "Mahmoud Khalil Al-Husary" },
] as const;
export type ReciterId = (typeof RECITERS)[number]["id"];
export const DEFAULT_RECITER: ReciterId = "ar.alafasy";

export type AudioStatus = "idle" | "loading" | "playing" | "paused" | "error";
export type AudioTrack = { surah: number; ayah: number; globalNumber: number };
export type AudioState = { status: AudioStatus; track: AudioTrack | null; reciter: ReciterId; error: string | null };

const IDLE: AudioState = { status: "idle", track: null, reciter: DEFAULT_RECITER, error: null };

let state: AudioState = IDLE;
let element: HTMLAudioElement | null = null;
let onEnded: ((track: AudioTrack) => void) | null = null;
const listeners = new Set<() => void>();

function set(next: Partial<AudioState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

function audio() {
  if (element) return element;
  element = new Audio();
  element.preload = "auto";
  element.addEventListener("loadstart", () => state.track && set({ status: "loading", error: null }));
  element.addEventListener("waiting", () => state.track && set({ status: "loading" }));
  element.addEventListener("playing", () => state.track && set({ status: "playing", error: null }));
  element.addEventListener("pause", () => {
    // `pause` also fires at the natural end and when the source is cleared.
    if (state.track && element && !element.ended && state.status !== "error") set({ status: "paused" });
  });
  element.addEventListener("ended", () => {
    const finished = state.track;
    set({ status: "idle", track: null });
    if (finished) onEnded?.(finished);
  });
  element.addEventListener("error", () => {
    if (state.track) set({ status: "error", error: "Audio is unavailable for this verse. Check your connection or try another verse." });
  });
  return element;
}

function start() {
  // Browsers may refuse playback that was not started by a tap; report it instead of pretending.
  audio()
    .play()
    .catch((error: unknown) => {
      if (!state.track) return;
      if (error instanceof DOMException && error.name === "NotAllowedError") set({ status: "paused", error: "Your browser blocked playback. Press play to start." });
      else if (!(error instanceof DOMException && error.name === "AbortError")) set({ status: "error", error: "Audio is unavailable for this verse. Check your connection or try another verse." });
    });
}

export const quranAudio = {
  getState: () => state,
  getServerState: () => IDLE,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  play(track: AudioTrack, reciter: ReciterId = state.reciter) {
    const el = audio();
    set({ status: "loading", track, reciter, error: null });
    el.src = ayahAudioUrl(reciter, track.globalNumber);
    start();
  },
  pause() {
    element?.pause();
  },
  resume() {
    if (state.track) start();
  },
  stop() {
    if (!element) return;
    set({ status: "idle", track: null, error: null });
    element.pause();
    element.removeAttribute("src");
    element.load();
  },
  /** Called with the finished track; the reader uses it to continue to the next ayah. */
  setOnEnded(handler: ((track: AudioTrack) => void) | null) {
    onEnded = handler;
  },
};
