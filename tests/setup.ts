import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import i18n from "../app/features/i18n";
import { clearGuestData } from "../app/services/guest/guestStorage";
import { resetMigrationForTests } from "../app/services/guest/legacyMigration";
import { quranAudio } from "../app/services/quran/audioService";

// jsdom has no media pipeline. This stand-in follows the same event contract as a real
// <audio>: play() → "playing", pause() → "pause", finish() → "ended".
class FakeAudio extends EventTarget {
  static instances: FakeAudio[] = [];
  src = "";
  preload = "";
  ended = false;
  paused = true;
  constructor() {
    super();
    FakeAudio.instances.push(this);
  }
  play() {
    this.paused = false;
    this.ended = false;
    queueMicrotask(() => this.dispatchEvent(new Event("playing")));
    return Promise.resolve();
  }
  pause() {
    if (this.paused) return;
    this.paused = true;
    this.dispatchEvent(new Event("pause"));
  }
  load() {}
  removeAttribute() {
    this.src = "";
  }
  finish() {
    this.ended = true;
    this.paused = true;
    this.dispatchEvent(new Event("ended"));
  }
}
vi.stubGlobal("Audio", FakeAudio);
export { FakeAudio };

Element.prototype.scrollIntoView = vi.fn();
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
window.matchMedia ??= ((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as unknown as typeof window.matchMedia;

beforeEach(() => {
  localStorage.clear();
  resetMigrationForTests();
  clearGuestData(); // drops every store's in-memory snapshot
  window.location.hash = "";
});

afterEach(async () => {
  cleanup();
  quranAudio.stop();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  await i18n.changeLanguage("en");
});
