"use client";
import { BookOpen } from "lucide-react";
import { tr } from "../../features/i18n";
import { AnimatedButton } from "../motion/AnimatedButton";

/** Left-hand hero copy. Each line carries `hero-rise` so the type enters in sequence. */
export function HomeHero({ go }: { go: (page: string) => void }) {
  return (
    <div className="hero-copy">
      <p className="hero-brand hero-rise">
        <span aria-hidden="true">✦</span>
        {tr("Deen e Safar")}
      </p>
      <h1 className="hero-rise">{tr("A Journey of Faith & Knowledge")}</h1>
      <p className="hero-lede hero-rise">{tr("Explore the Quran, deepen your understanding, and discover a more meaningful way to learn.")}</p>
      <div className="hero-actions hero-rise">
        <AnimatedButton arrow onClick={() => go("learn")}>
          {tr("Start Exploring")}
        </AnimatedButton>
        <AnimatedButton variant="outline" onClick={() => go("quran")}>
          <BookOpen size={18} aria-hidden="true" />
          {tr("Discover the Quran")}
        </AnimatedButton>
      </div>
    </div>
  );
}
