import type { ShelfBook } from "../three/BookModel";

export type HomeBook = ShelfBook & {
  description: string;
  /** Hash route of the implemented section, or null when it does not exist yet. */
  route: string | null;
  action: string;
};

// Each book opens something that really exists. Anything unbuilt says so.
export const shelfBooks: HomeBook[] = [
  {
    id: "seerah",
    title: "Seerah",
    label: "Seerah",
    color: "#1F5A3D",
    description: "A guided introduction to studying the Prophetic biography.",
    route: "course?path=seerah",
    action: "Open learning path",
  },
  {
    id: "hadith",
    title: "Hadith",
    label: "Hadith",
    color: "#24408E",
    description: "A selected, sourced Hadith collection with Arabic text, translations, explanations, attribution, and grading.",
    route: "duas",
    action: "Open Duas & Hadith",
  },
  {
    id: "history",
    title: "Islamic History",
    label: "Islamic History",
    color: "#7A2231",
    description: "A dedicated Islamic history library has not been built yet. It will appear here once its content is sourced and reviewed.",
    route: null,
    action: "Coming soon",
  },
  {
    id: "quran-studies",
    title: "Quran Studies",
    label: "Quran Studies",
    color: "#17616A",
    description: "Explore the context, themes, and beauty of the Quran.",
    route: "course?path=quran",
    action: "Open learning path",
  },
];

export type SurahPreview = { id: number; name: string; meaning: string; count: number; revelation: "Meccan" | "Medinan" };

// Names and verse counts of real surahs; Arabic titles are read from the bundled index.
export const surahPreviews: SurahPreview[] = [
  { id: 1, name: "Al-Fatihah", meaning: "The Opening", count: 7, revelation: "Meccan" },
  { id: 2, name: "Al-Baqarah", meaning: "The Cow", count: 286, revelation: "Medinan" },
  { id: 3, name: "Ali 'Imran", meaning: "The Family of Imran", count: 200, revelation: "Medinan" },
];
