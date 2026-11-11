"use client";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { tr } from "../../features/i18n";
import { useResponsiveScene } from "../../hooks/useResponsiveScene";
import { OPEN_END, type Story } from "../three/story";
import { shelfBooks } from "./content";
import { HomeHero } from "./HomeHero";
import { InteractiveBookshelf } from "./InteractiveBookshelf";
import { QuranExplorerReveal } from "./QuranExplorerReveal";

// three.js, R3F and drei only ever load through this boundary.
const HomeScene = lazy(() => import("../three/HomeScene"));

const MOTES = [
  [12, 30, 0], [22, 62, 3], [31, 18, 6], [38, 74, 1], [47, 40, 4], [9, 80, 7], [27, 46, 2], [43, 12, 5],
];

/**
 * Hero → Quran → surah previews as one scroll-driven story. A single progress value
 * (0–1 across `.story-track`) drives both the 3D scene and the DOM timeline, so the
 * visitor's scroll position is the only clock and scrolling back reverses everything.
 */
export function QuranScrollSection({ go, rtl }: { go: (page: string) => void; rtl: boolean }) {
  const { mode, tall, lowPower } = useResponsiveScene();
  const root = useRef<HTMLDivElement>(null);
  const story = useRef<Story>({ target: 0, p: 0, open: 0 }).current;
  const invalidate = useRef<() => void>(() => {});
  const [ready, setReady] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const live = mode === "3d";

  const onReady = useCallback((fn: () => void) => {
    invalidate.current = fn;
    setReady(true);
  }, []);
  const select = useCallback((id: string | null) => setSelected(id), []);

  useEffect(() => {
    if (!live || !root.current) return;
    let cancelled = false;
    let revert = () => {};
    Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([{ gsap }, { ScrollTrigger }]) => {
      if (cancelled || !root.current) return;
      gsap.registerPlugin(ScrollTrigger);
      const context = gsap.context(() => {
        // Positions and durations are fractions of the whole track (timeline length = 1).
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: ".story-track",
            start: "top top",
            end: "bottom bottom",
            // The story eases toward the scroll position instead of snapping to it, which
            // absorbs mouse-wheel steps. Shorter on touch, where the finger is already smooth.
            scrub: ScrollTrigger.isTouch === 1 ? 0.45 : 0.9,
          },
        });
        // One clock for everything: the 3D scene reads the timeline's own (smoothed) progress.
        tl.eventCallback("onUpdate", () => {
          story.target = tl.progress();
          invalidate.current();
        });
        tl.to({}, { duration: 1 }, 0);
        tl.to(".scroll-cue", { autoAlpha: 0, duration: 0.03 }, 0.005);
        tl.to(".hero-copy", { autoAlpha: 0, y: -56, duration: 0.11, ease: "power1.in" }, 0.015);
        tl.to(".shelf-ui", { autoAlpha: 0, y: -28, duration: 0.07, ease: "power1.in" }, 0.015);
        tl.to(".stage-night", { opacity: 1, duration: 0.24, ease: "sine.inOut" }, 0.35);
        tl.fromTo(".guide-copy", { autoAlpha: 0, y: 36 }, { autoAlpha: 1, y: 0, duration: 0.09, ease: "power2.out" }, OPEN_END - 0.04);
        tl.fromTo(".surah-preview", { autoAlpha: 0, y: 36, scale: 0.97 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.09, stagger: 0.03, ease: "power2.out" }, OPEN_END + 0.05);
        tl.to(".guide-body", { autoAlpha: 0, y: -28, duration: 0.07, ease: "power1.in" }, 0.89);
        tl.to(".stage-night", { opacity: 0, duration: 0.1, ease: "sine.inOut" }, 0.89);
        tl.to(".story-visual", { opacity: 0, duration: 0.08, ease: "sine.inOut" }, 0.915);
      }, root);
      revert = () => context.revert();
      root.current.dataset.timeline = "ready";
      ScrollTrigger.refresh();
    });
    return () => {
      cancelled = true;
      revert();
      document.body.style.cursor = "";
    };
  }, [live, story]);

  // The shelf is only interactive while it is the subject of the scene.
  useEffect(() => {
    if (!live) return;
    const clear = () => {
      if (story.target > 0.08) {
        setHovered(null);
        setSelected(null);
      }
    };
    window.addEventListener("scroll", clear, { passive: true });
    return () => window.removeEventListener("scroll", clear);
  }, [live, story]);

  return (
    <div className="story" data-mode={mode} ref={root}>
      <HomeHero go={go} />
      <div className="story-track">
        <div className="story-stage">
          <div className="stage-day" aria-hidden="true">
            <svg className="stage-arch" viewBox="0 0 400 520" fill="none">
              <path d="M20 520V230C20 110 110 40 200 8c90 32 180 102 180 222v290" stroke="currentColor" strokeWidth="1.2" />
              <path d="M52 520V238C52 136 126 76 200 46c74 30 148 90 148 192v282" stroke="currentColor" strokeWidth="0.7" />
            </svg>
            <span className="stage-star s1">✦</span>
            <span className="stage-star s2">✧</span>
            <span className="stage-star s3">✦</span>
          </div>
          <div className="stage-night" aria-hidden="true">
            <div className="stage-pattern" />
            <div className="stage-glow" />
            {MOTES.map(([x, y, d]) => (
              <i key={`${x}-${y}`} className="stage-mote" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${-d}s` }} />
            ))}
          </div>
          <div className="hero-area">
            <div className="story-visual">
              <img
                className="shelf-poster"
                data-hidden={live && ready}
                src="/home-bookshelf.webp"
                alt={tr("A cream and gold bookshelf holding four study books: Seerah, Hadith, Islamic History, and Quran Studies")}
                width={1100}
                height={640}
                fetchPriority="high"
              />
              {live && (
                <div className="story-canvas" data-ready={ready} aria-hidden="true">
                  <Suspense fallback={null}>
                    <HomeScene story={story} tall={tall} rtl={rtl} lowPower={lowPower} books={shelfBooks} raisedId={hovered || selected} onHover={setHovered} onSelect={select} onReady={onReady} />
                  </Suspense>
                </div>
              )}
              {live && !ready && (
                <p className="scene-loading" role="status">
                  <span aria-hidden="true" />
                  {tr("Preparing the 3D library…")}
                </p>
              )}
            </div>
            <InteractiveBookshelf books={shelfBooks} hovered={hovered} selected={selected} onHover={setHovered} onSelect={select} go={go} />
            {live && (
              <p className="scroll-cue">
                {tr("Scroll to open the Quran")}
                <ChevronDown size={16} aria-hidden="true" />
              </p>
            )}
          </div>
          <QuranExplorerReveal go={go} staticImage={mode === "static"} />
        </div>
      </div>
    </div>
  );
}
