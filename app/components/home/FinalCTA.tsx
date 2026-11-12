"use client";
import { tr } from "../../features/i18n";
import { AnimatedButton } from "../motion/AnimatedButton";
import { RevealSection } from "../motion/RevealSection";

export function FinalCTA({ go }: { go: (page: string) => void }) {
  return (
    <section className="home-section final-cta" aria-labelledby="cta-title">
      <RevealSection className="final-cta-card">
        <svg className="final-arches" viewBox="0 0 900 300" fill="none" aria-hidden="true" preserveAspectRatio="xMidYMax slice">
          {[0, 1, 2, 3, 4].map((i) => (
            <path key={i} d={`M${30 + i * 176} 300V150c0-58 34-96 68-116 34 20 68 58 68 116v150`} stroke="currentColor" strokeWidth="1.2" />
          ))}
        </svg>
        <span className="home-eyebrow">{tr("DEEN E SAFAR")}</span>
        <h2 id="cta-title">{tr("Begin wherever you are")}</h2>
        <p>{tr("Read, reflect, and learn at your own pace.")}</p>
        <div className="hero-actions">
          <AnimatedButton arrow onClick={() => go("learn")}>
            {tr("Start Exploring")}
          </AnimatedButton>
          <AnimatedButton variant="outline" onClick={() => go("quran")}>
            {tr("Open Quran Explorer")}
          </AnimatedButton>
        </div>
      </RevealSection>
    </section>
  );
}
