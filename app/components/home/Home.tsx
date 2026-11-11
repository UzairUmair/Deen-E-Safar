"use client";
import type { ReactNode } from "react";
import { RevealSection } from "../motion/RevealSection";
import { AIShowcase } from "./AIShowcase";
import { FinalCTA } from "./FinalCTA";
import { LearningFeatures } from "./LearningFeatures";
import { QuranScrollSection } from "./QuranScrollSection";

/** Public homepage. `daily` is the existing reflection + live prayer-times row. */
export function Home({ go, lang, daily }: { go: (page: string) => void; lang: string; daily: ReactNode }) {
  return (
    <div className="home" dir={lang === "en" ? "ltr" : "rtl"}>
      <QuranScrollSection go={go} rtl={lang !== "en"} />
      <LearningFeatures />
      <RevealSection as="section" className="home-section home-daily two-col daily">
        {daily}
      </RevealSection>
      <AIShowcase go={go} lang={lang} />
      <FinalCTA go={go} />
    </div>
  );
}
