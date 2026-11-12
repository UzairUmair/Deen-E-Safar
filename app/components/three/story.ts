// Dependency-free so the DOM side can share these without pulling three.js into the first load.

/** Shared between the scroll controller (writes target) and the scene (reads p / open). */
export type Story = { target: number; p: number; open: number };

// Scroll window (fractions of the story track) in which the Quran opens.
export const OPEN_START = 0.3;
export const OPEN_END = 0.58;
