"use client";
import { tr } from "../../features/i18n";
import { useContent, type QuranIndex } from "../../features/shared";
import { AnimatedButton } from "../motion/AnimatedButton";
import { surahPreviews } from "./content";

/**
 * Copy and surah previews revealed once the Quran is open. In the live story it is an
 * overlay animated by the scroll timeline; in static mode it is an ordinary section.
 */
export function QuranExplorerReveal({ go, staticImage }: { go: (page: string) => void; staticImage: boolean }) {
  const { data } = useContent<QuranIndex>("/content/quran-index.json");
  return (
    <section className="guide" aria-labelledby="guide-title">
      {staticImage && <img className="quran-poster" src="/home-quran.webp" alt={tr("An open Quran resting on a wooden rehal")} width={900} height={760} loading="lazy" />}
      <div className="guide-body">
        <div className="guide-copy">
          <span className="home-eyebrow">{tr("THE NOBLE QURAN")}</span>
          <h2 id="guide-title">{tr("Explore the Words of Guidance")}</h2>
          <p>{tr("All 114 surahs, with Arabic text, English and Urdu translations, verse audio, and saved reading positions.")}</p>
          <AnimatedButton variant="secondary" arrow onClick={() => go("quran")}>
            {tr("Open Quran Explorer")}
          </AnimatedButton>
        </div>
        <ul className="surah-previews" aria-label={tr("Surah previews")}>
          {surahPreviews.map((s) => {
            const arabic = data?.chapters.find((c) => c.id === s.id)?.arabic;
            return (
              <li key={s.id} className="surah-preview">
                <a href={`#reader?surah=${s.id}&ayah=1`}>
                  <span className="surah-preview-number">{String(s.id).padStart(2, "0")}</span>
                  <span className="surah-preview-arabic" lang="ar" dir="rtl">
                    {arabic || "\u00a0"}
                  </span>
                  <strong>{s.name}</strong>
                  <small>
                    {tr(s.meaning)} · {s.count} {tr("verses")} · {tr(s.revelation)}
                  </small>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
