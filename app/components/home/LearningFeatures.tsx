"use client";
import { ArrowRight, Bookmark, BookOpen, Compass, GraduationCap, Heart, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { tr } from "../../features/i18n";
import { RevealSection } from "../motion/RevealSection";
import { link } from "../../lib/router";

// Every card opens an implemented route; `note` states plainly what is not built yet.
const features = [
  { icon: BookOpen, tone: "turquoise", title: "Quran Explorer", route: "quran", text: "All 114 surahs with Arabic text, English and Urdu translations, search, bookmarks, and verse audio." },
  {
    icon: Sparkles,
    tone: "lavender",
    title: "Islamic AI Assistant",
    route: "ai",
    text: "Search the bundled Quran and Hadith texts by word or phrase, then read each passage in context.",
    note: "Source search today · live answers coming soon",
  },
  { icon: Compass, tone: "gold", title: "Prayer Times", route: "prayer", text: "Prayer times for your city with a live countdown to the next prayer, a Qibla bearing, and a dhikr counter." },
  { icon: Heart, tone: "peach", title: "Daily Duas", route: "duas", text: "Quranic supplications shown as complete verses, alongside a selected, sourced Hadith collection." },
  { icon: GraduationCap, tone: "turquoise", title: "Interactive Learning", route: "learn", text: "Five introductory learning paths with lessons, reflection notes, and self-checks." },
  { icon: Bookmark, tone: "gold", title: "Bookmarks and Progress", route: "dashboard", text: "Saved verses and duas, your reading position, and your settings, kept privately in this browser." },
];

export function LearningFeatures() {
  return (
    <section className="home-section features" aria-labelledby="features-title">
      <RevealSection className="home-heading">
        <span className="home-eyebrow">{tr("EVERYTHING IN ONE PLACE")}</span>
        <h2 id="features-title">{tr("Tools for a thoughtful journey")}</h2>
        <p>{tr("Read, learn, and keep track of where you are, all in one calm space.")}</p>
      </RevealSection>
      <ul className="feature-grid">
        {features.map((f, i) => (
          <motion.li
            key={f.title}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2, margin: "0px 0px -6% 0px" }}
            transition={{ duration: 0.8, delay: (i % 3) * 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <a className="feature-card" href={link(f.route)}>
              <span className={`feature-icon ${f.tone}`} aria-hidden="true">
                <f.icon size={22} strokeWidth={1.7} />
              </span>
              <h3>{tr(f.title)}</h3>
              <p>{tr(f.text)}</p>
              {f.note && <span className="feature-note">{tr(f.note)}</span>}
              <span className="feature-open">
                {tr("Open")}
                <ArrowRight size={16} aria-hidden="true" />
              </span>
            </a>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
