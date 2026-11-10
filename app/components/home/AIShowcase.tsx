"use client";
import { BookOpen } from "lucide-react";
import { motion } from "motion/react";
import { tr } from "../../features/i18n";
import { useContent, type QuranChapter } from "../../features/shared";
import { AnimatedButton } from "../motion/AnimatedButton";
import { RevealSection } from "../motion/RevealSection";

const cascade = { hidden: {}, shown: { transition: { staggerChildren: 0.42, delayChildren: 0.35 } } };
const item = { hidden: { opacity: 0, y: 16 }, shown: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 0.61, 0.36, 1] as const } } };

// Footnote markers such as [622] belong to the reader, not this short preview.
const plain = (text: string) => text.replace(/\[\d+\]/g, "").trim();

/**
 * Public showcase of the assistant. Nothing here is generated: the verse text is read
 * from the same bundled Quran files the reader uses, and the block is labelled a preview.
 */
export function AIShowcase({ go, lang }: { go: (page: string) => void; lang: string }) {
  const thunder = useContent<QuranChapter>("/content/quran/13.json").data;
  const cow = useContent<QuranChapter>("/content/quran/2.json").data;
  const verse = thunder?.verses.find((v) => v.id === 28);
  const related = cow?.verses.find((v) => v.id === 152);
  const translate = (v: { en: string; ur: string }) => plain(lang === "ur" ? v.ur : v.en);
  return (
    <section className="home-section ai-showcase" aria-labelledby="ai-title">
      <RevealSection className="ai-copy">
        <span className="home-eyebrow">{tr("ISLAMIC AI ASSISTANT")}</span>
        <h2 id="ai-title">{tr("Answers that keep the source in view")}</h2>
        <p>{tr("Ask a question and go straight to the Quran and Hadith passages behind it.")}</p>
        <p className="ai-honest">{tr("Today the assistant works as a source finder over the bundled Quran and Hadith. Generated answers are not connected yet.")}</p>
        <AnimatedButton arrow onClick={() => go("ai")}>
          {tr("Explore Islamic AI")}
        </AnimatedButton>
      </RevealSection>
      <motion.div className="phone" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.35 }} transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}>
        <div className="phone-screen">
          <div className="phone-bar">
            <img src="/logo-mark.svg" alt="" width={30} height={28} />
            <strong>{tr("Deen e Safar")}</strong>
            <span className="phone-tag">{tr("Illustrative preview")}</span>
          </div>
          <motion.div className="phone-thread" variants={cascade} initial="hidden" whileInView="shown" viewport={{ once: true, amount: 0.5 }}>
            <motion.p className="chat-question" variants={item}>
              {tr("Which verse speaks about hearts finding rest?")}
            </motion.p>
            <motion.div className="chat-answer" variants={item}>
              <p>{tr("A verse often read on this theme:")}</p>
              {verse ? (
                <>
                  <p className="chat-arabic" lang="ar" dir="rtl">
                    {verse.arabic}
                  </p>
                  <p className="chat-translation">{translate(verse)}</p>
                </>
              ) : (
                <span className="chat-skeleton" aria-hidden="true" />
              )}
            </motion.div>
            <motion.p className="chat-label" variants={item}>
              {tr("Sources")}
            </motion.p>
            <motion.a className="source-card" variants={item} href="#reader?surah=13&ayah=28">
              <BookOpen size={17} aria-hidden="true" />
              <span>
                <strong>{tr("Quran 13:28")} · Ar-Ra&apos;d</strong>
                <small>{tr("Read in context")}</small>
              </span>
            </motion.a>
            <motion.a className="source-card" variants={item} href="#reader?surah=2&ayah=152">
              <BookOpen size={17} aria-hidden="true" />
              <span>
                <strong>{tr("Quran 2:152")} · Al-Baqarah</strong>
                <small>{related ? translate(related) : tr("Read in context")}</small>
              </span>
            </motion.a>
            <motion.p className="chat-note" variants={item}>
              {tr("Preview only. Verses are quoted from the bundled Quran text, not generated.")}
            </motion.p>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
