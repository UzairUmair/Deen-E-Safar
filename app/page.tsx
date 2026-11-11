"use client";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ArrowRight, Bell, Bookmark, BookOpen, Check, ChevronRight, Compass, Globe, GraduationCap, Heart, Home, LayoutGrid, Menu, Moon, Settings, Sparkles, Star, Sun, X } from "lucide-react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { DailyVerse } from "./components/dashboard/DailyVerse";
import { PrayerWidget } from "./components/dashboard/PrayerWidget";
import { Home as HomeScreen } from "./components/home/Home";
import { AnimatedButton } from "./components/motion/AnimatedButton";
import { Skeleton, ToastContext } from "./components/ui/states";
import i18n, { directionOf, LanguageContext, tr } from "./features/i18n";
import Learn from "./features/Learn";
import Library from "./features/Library";
import { ReminderScheduler, RemindersTool } from "./features/Personal";
import { useGuestPreferences } from "./hooks/useGuestData";
import { createQueryClient } from "./lib/queryClient";
import { link, navigate, normalizeTarget, useRoute, type Route } from "./lib/router";
import { setInterfaceLanguage, updatePreferences, type Language } from "./services/guest/preferencesStorage";

// Application screens load on demand, so the homepage never pays for them (or they for its 3D scene).
const Quran = lazy(() => import("./screens/Quran"));
const SurahReader = lazy(() => import("./screens/SurahReader"));
const Bookmarks = lazy(() => import("./screens/Bookmarks"));
const PrayerTimes = lazy(() => import("./screens/PrayerTimes"));
const Duas = lazy(() => import("./screens/Duas"));
const DuaDetails = lazy(() => import("./screens/Duas").then((m) => ({ default: m.DuaDetails })));
const Dashboard = lazy(() => import("./screens/Dashboard"));
const Preferences = lazy(() => import("./screens/Preferences"));
const IslamicAI = lazy(() => import("./screens/IslamicAI"));

const NAV = [
  { id: "home", to: "/", label: "Home", icon: Home },
  { id: "quran", to: "/quran", label: "Explore Quran", icon: BookOpen },
  { id: "learn", to: "learn", label: "Learn Islam", icon: GraduationCap },
  { id: "duas", to: "/duas", label: "Daily Duas", icon: Heart },
  { id: "prayer", to: "/prayer", label: "Prayer Times", icon: Compass },
  { id: "ai", to: "/ai", label: "Islamic AI", icon: Sparkles },
  { id: "dashboard", to: "/dashboard", label: "Dashboard", icon: LayoutGrid },
];
const BOTTOM_NAV = ["home", "quran", "prayer", "duas", "dashboard"];
const STORAGE_FAILED = "Could not save. Browser storage is unavailable or full.";

const isActive = (route: Route, id: string) => route.name === id || (id === "duas" && route.name === "hadith") || (id === "quran" && route.name === "bookmarks") || (id === "learn" && (route.name === "course" || route.name === "lesson")) || (id === "dashboard" && route.name === "preferences");

export default function App() {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <Shell />
    </QueryClientProvider>
  );
}

function Shell() {
  const route = useRoute();
  const preferences = useGuestPreferences();
  const { t } = useTranslation();
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState("");
  const [answer, setAnswer] = useState("");
  const menuButton = useRef<HTMLButtonElement>(null);
  const { language, theme } = preferences;

  // Saved language and theme are applied after hydration (the prerendered page is English, light).
  useEffect(() => {
    if (i18n.language !== language) i18n.changeLanguage(language);
    document.documentElement.lang = language;
    document.documentElement.dir = directionOf(language);
    document.documentElement.dataset.theme = theme;
  }, [language, theme]);

  // Links written for the first version of the site (#reader?surah=2) are rewritten in place.
  useEffect(() => {
    const current = window.location.hash.replace(/^#/, "");
    if (current && normalizeTarget(current) !== current) window.location.replace("#" + normalizeTarget(current));
  }, []);

  const screenKey = route.segments.join("/") || "home";
  useEffect(() => {
    setMenu(false);
  }, [screenKey]);

  // Fetch the other screens once the page is idle, so a page change never waits on a download.
  useEffect(() => {
    if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return;
    const warm = () => {
      for (const load of [() => import("./screens/Quran"), () => import("./screens/SurahReader"), () => import("./screens/PrayerTimes"), () => import("./screens/Duas"), () => import("./screens/Dashboard"), () => import("./screens/Bookmarks"), () => import("./screens/Preferences"), () => import("./screens/IslamicAI")]) load().catch(() => {});
    };
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(warm, { timeout: 5000 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = setTimeout(warm, 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!modal) return;
    const before = document.activeElement as HTMLElement | null;
    document.getElementById("close-dialog")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setModal("");
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      before?.focus();
    };
  }, [modal]);

  useEffect(() => {
    if (!menu) return;
    document.getElementById("close-drawer")?.focus();
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      // Deliberately read at cleanup time: focus returns to the toggle as it exists when the drawer closes.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      menuButton.current?.focus();
    };
  }, [menu]);

  function changeLanguage(next: Language) {
    i18n.changeLanguage(next);
    if (!setInterfaceLanguage(next)) setToast(t(STORAGE_FAILED));
  }

  function screen() {
    switch (route.name) {
      case "quran":
        return route.segments[1] ? <SurahReader surahParam={route.segments[1]} ayahParam={route.query.get("ayah")} /> : <Quran />;
      case "bookmarks":
        return <Bookmarks initialTab={route.query.get("tab")} />;
      case "prayer":
        return <PrayerTimes />;
      case "duas":
        return route.segments[1] ? <DuaDetails id={route.segments[1]} /> : <Duas />;
      case "hadith":
        return <Library notify={setToast} />;
      case "dashboard":
        return <Dashboard />;
      case "preferences":
        return <Preferences />;
      case "ai":
        return <IslamicAI />;
      case "learn":
      case "course":
      case "lesson":
        return <Learn notify={setToast} />;
      case "reminders":
        return <RemindersTool notify={setToast} />;
      case "quiz":
        return <Quiz answer={answer} setAnswer={setAnswer} />;
      default:
        return (
          <HomeScreen
            go={navigate}
            lang={language}
            daily={
              <>
                <DailyVerse />
                <PrayerWidget />
              </>
            }
          />
        );
    }
  }
  const isHome = !["quran", "bookmarks", "prayer", "duas", "hadith", "dashboard", "preferences", "ai", "learn", "course", "lesson", "reminders", "quiz"].includes(route.name);

  return (
    <LanguageContext.Provider value={language}>
      <ToastContext.Provider value={setToast}>
        <MotionConfig reducedMotion="user">
          <a
            className="skip-link"
            href="#main"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById("main")?.focus();
            }}
          >
            {t("Skip to content")}
          </a>
          <ReminderScheduler notify={setToast} />

          <header className="header">
            <a href={link("/")} className="brand">
              <img src="/logo-mark.svg" alt="" />
              <span>
                {t("Deen e Safar")}
                <small>{t("FAITH. KNOWLEDGE. JOURNEY.")}</small>
              </span>
            </a>
            <nav aria-label={t("Main navigation")}>
              {NAV.map((item) => (
                <a key={item.id} href={link(item.to)} className={isActive(route, item.id) ? "active" : ""} aria-current={isActive(route, item.id) ? "page" : undefined}>
                  {t(item.label)}
                </a>
              ))}
            </nav>
            <div className="header-actions">
              <label className="language">
                <Globe size={16} aria-hidden="true" />
                <select aria-label={t("Interface language")} value={language} onChange={(e) => changeLanguage(e.target.value as Language)}>
                  <option value="en">EN</option>
                  <option value="ur">اردو</option>
                  <option value="ar">عربي</option>
                </select>
              </label>
              <button className="icon-button" aria-label={t("Toggle dark mode")} aria-pressed={theme === "dark"} onClick={() => !updatePreferences({ theme: theme === "light" ? "dark" : "light" }) && setToast(t(STORAGE_FAILED))}>
                {theme === "light" ? <Moon size={19} aria-hidden="true" /> : <Sun size={19} aria-hidden="true" />}
              </button>
              <a className="icon-button notifications" aria-label={t("Reminder center")} href="#reminders">
                <Bell size={19} aria-hidden="true" />
              </a>
              <AnimatedButton className="login-btn" size="sm" href={link("/dashboard")} arrow>
                {t("Dashboard")}
              </AnimatedButton>
              <button className="icon-button mobile-menu" aria-label={t("Open navigation")} aria-expanded={menu} aria-controls="site-drawer" ref={menuButton} onClick={() => setMenu(true)}>
                <Menu aria-hidden="true" />
              </button>
            </div>
          </header>

          {menu && (
            <div className="drawer" id="site-drawer" role="dialog" aria-modal="true" aria-label={t("Main navigation")} onKeyDown={trapFocus}>
              <div className="row">
                <strong>{t("Explore your journey")}</strong>
                <button className="icon-button" id="close-drawer" aria-label={t("Close navigation")} onClick={() => setMenu(false)}>
                  <X aria-hidden="true" />
                </button>
              </div>
              {NAV.map((item) => (
                <a href={link(item.to)} key={item.id} aria-current={isActive(route, item.id) ? "page" : undefined} onClick={() => setMenu(false)}>
                  <item.icon size={21} strokeWidth={1.65} aria-hidden="true" />
                  {t(item.label)}
                  <ChevronRight aria-hidden="true" />
                </a>
              ))}
              <a href={link("/bookmarks")} onClick={() => setMenu(false)}>
                <Bookmark size={21} strokeWidth={1.65} aria-hidden="true" />
                {t("Bookmarks")}
                <ChevronRight aria-hidden="true" />
              </a>
              <a href="#reminders" onClick={() => setMenu(false)}>
                <Bell size={21} strokeWidth={1.65} aria-hidden="true" />
                {t("Reminder Center")}
                <ChevronRight aria-hidden="true" />
              </a>
              <a href={link("/preferences")} onClick={() => setMenu(false)}>
                <Settings size={21} strokeWidth={1.65} aria-hidden="true" />
                {t("Preferences")}
                <ChevronRight aria-hidden="true" />
              </a>
            </div>
          )}

          <main id="main" tabIndex={-1}>
            {/* The old screen fades out where it is, the page returns to the top unseen, then the new one fades in. */}
            <AnimatePresence mode="wait" onExitComplete={() => window.scrollTo({ top: 0, behavior: "instant" })}>
              <motion.div
                key={screenKey}
                data-screen={screenKey}
                // Layout class travels with the screen, so an exiting screen keeps its own layout.
                className={isHome ? "home-main" : "inner-main"}
                // No vertical shift on the homepage: its scroll story measures positions on mount.
                initial={{ opacity: 0, y: isHome ? 0 : 12 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } }}
                exit={{ opacity: 0, transition: { duration: 0.16, ease: "easeIn" } }}
              >
              <Suspense
                fallback={
                  <div className="app-screen" role="status">
                    <span className="sr-only">{t("Loading…")}</span>
                    <Skeleton lines={6} />
                  </div>
                }
              >
                {screen()}
              </Suspense>
              </motion.div>
            </AnimatePresence>
          </main>

          <footer>
            <div className="footer-main">
              <div>
                <a href={link("/")} className="brand">
                  <img src="/logo-mark.svg" alt="" />
                  <span>
                    {t("Deen e Safar")}
                    <small>{t("A BEAUTIFUL JOURNEY")}</small>
                  </span>
                </a>
                <p>
                  {t("A peaceful space for curious hearts.")}
                  <br />
                  {t("Discover, reflect, and grow — one step at a time.")}
                </p>
              </div>
              <div>
                <h4>{t("Explore")}</h4>
                <a href={link("/quran")}>{t("The Quran")}</a>
                <a href={link("/prayer")}>{t("Prayer Times")}</a>
                <a href={link("/duas")}>{t("Daily Duas")}</a>
                <a href={link("/hadith")}>{t("Hadith collection")}</a>
                <a href="#learn">{t("Learning paths")}</a>
              </div>
              <div>
                <h4>{t("Your journey")}</h4>
                <a href={link("/dashboard")}>{t("My dashboard")}</a>
                <a href={link("/bookmarks")}>{t("Bookmarks")}</a>
                <a href={link("/preferences")}>{t("Preferences")}</a>
                <a href="#reminders">{t("Reminders")}</a>
              </div>
              <div>
                <h4>{t("A little more")}</h4>
                <button onClick={() => setModal("about")}>{t("Our purpose")}</button>
                <button onClick={() => setModal("sources")}>{t("Content & attribution")}</button>
                <button onClick={() => setModal("contact")}>{t("Get in touch")}</button>
              </div>
            </div>
            <div className="footer-bottom">
              <span>{t("© 2026 Deen e Safar. Made with intention.")}</span>
              <span>
                <button onClick={() => setModal("privacy")}>{t("Privacy")}</button>
                <button onClick={() => setModal("terms")}>{t("Terms")}</button>
                <span>{t("✦ A little closer, every day.")}</span>
              </span>
            </div>
          </footer>

          <nav className="bottom-nav" aria-label={t("Mobile navigation")}>
            {NAV.filter((item) => BOTTOM_NAV.includes(item.id)).map((item) => (
              <a href={link(item.to)} className={isActive(route, item.id) ? "active" : ""} aria-current={isActive(route, item.id) ? "page" : undefined} key={item.id}>
                <item.icon size={21} strokeWidth={1.65} aria-hidden="true" />
                <span>{t(BOTTOM_LABELS[item.id])}</span>
              </a>
            ))}
          </nav>

          {toast && (
            <div className="toast" role="status">
              <Check size={18} aria-hidden="true" />
              {tr(toast)}
            </div>
          )}
          {modal && <Modal kind={modal} close={() => setModal("")} />}
        </MotionConfig>
      </ToastContext.Provider>
    </LanguageContext.Provider>
  );
}

const BOTTOM_LABELS: Record<string, string> = { home: "Home", quran: "Quran", prayer: "Prayer", duas: "Duas", dashboard: "Dashboard" };

const MODAL_TITLES: Record<string, string> = { about: "A beautiful journey", sources: "Made with care", privacy: "Your privacy matters", terms: "About this website", contact: "Stay connected" };
const MODAL_TEXT: Record<string, string> = {
  about: "Deen e Safar is a place for Quran reading, introductory learning, and daily reflection.",
  sources:
    "Quran reader: Al Quran Cloud (Uthmani Arabic text; English by Saheeh International; Urdu by Fateh Muhammad Jalandhry) with recitation audio from the Islamic Network CDN. Prayer times: AlAdhan API. Duas: Quran verses from QuranEnc.com (English by Noor International Center; Urdu by Muhammad Ibrahim Junagarhi). Hadith: HadeethEnc.com, with source attribution and grading. Each content screen links its sources.",
  privacy:
    "Bookmarks, reading position, notes, and settings stay in this browser; export or clear them from Preferences. Quran text and audio are requested from alquran.cloud and islamic.network, and prayer times from aladhan.com, which receives the coordinates you choose. Fonts load from Google Fonts. There is no account server and no generative AI connection.",
  terms: "This is an educational reading and study tool. Translations explain meanings. Consult qualified scholarship for personal religious rulings. Calculated prayer times are not mosque congregation times.",
  contact: "Contact channels are not configured. No messages or personal details are submitted.",
};

function Modal({ kind, close }: { kind: string; close: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={(e) => e.stopPropagation()} onKeyDown={trapFocus}>
        <button id="close-dialog" className="icon-button close" aria-label={t("Close dialog")} onClick={close}>
          <X aria-hidden="true" />
        </button>
        <span className="eyebrow">{t("DEEN E SAFAR")}</span>
        <h2 id="modal-title">{t(MODAL_TITLES[kind] ?? "Your journey")}</h2>
        <p>{t(MODAL_TEXT[kind] ?? "")}</p>
      </div>
    </div>
  );
}

const QUIZ_OPTIONS = ["Find a reliable source and write down your questions", "Accept the first answer without checking", "Rush to finish as quickly as possible"];

function Quiz({ answer, setAnswer }: { answer: string; setAnswer: (value: string) => void }) {
  const { t } = useTranslation();
  return (
    <div className="quiz soft-card">
      <div className="clay yellow" aria-hidden="true">
        <div className="clay-object">
          <Star size={53} strokeWidth={1.65} />
        </div>
      </div>
      <span className="eyebrow">{t("A LITTLE DISCOVERY · 1 QUESTION")}</span>
      <h1>{t("What is a thoughtful first step when learning something new?")}</h1>
      {QUIZ_OPTIONS.map((option) => (
        <button key={option} className={"quiz-option " + (answer === option ? "selected" : "")} aria-pressed={answer === option} onClick={() => setAnswer(option)}>
          {t(option)}
          {answer === option && <Check size={18} aria-hidden="true" />}
        </button>
      ))}
      {answer && <div className="notice">{t(answer.startsWith("Find") ? "Exactly. Curiosity and careful sources make a beautiful beginning." : "Take your time. Reliable sources and thoughtful questions help you learn well.")}</div>}
      <AnimatedButton href="#learn">
        {t("Explore a learning path")}
        <ArrowRight size={18} aria-hidden="true" />
      </AnimatedButton>
    </div>
  );
}

// Keeps Tab / Shift+Tab inside an open dialog or drawer.
function trapFocus(e: React.KeyboardEvent<HTMLElement>) {
  if (e.key !== "Tab") return;
  const focusable = e.currentTarget.querySelectorAll<HTMLElement>("button,input,select,textarea,a[href]");
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}
