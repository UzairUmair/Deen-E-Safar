"use client";
// localized-jsx
import {tr} from './features/i18n';
import { useState, useEffect, useRef } from "react";
import {
  ArrowRight,
  BookOpen,
  Bookmark,
  Heart,
  Compass,
  Sun,
  Moon,
  Sparkles,
  Bell,
  Menu,
  X,
  GraduationCap,
  LayoutGrid,
  Home,
  Check,
  ChevronRight,
  Settings,
  Globe,
  Star,
} from "lucide-react";
import { motion, MotionConfig } from "motion/react";
import {setLanguage,LanguageContext} from "./features/i18n";
import {QuranExplorer,QuranReader} from './features/Quran';
import Library from './features/Library';
import PrayerTools,{PrayerWidget} from './features/Prayer';
import Learn from './features/Learn';
import {Personal,RemindersTool,ReminderScheduler,SourceFinder} from './features/Personal';
import { nav, dictionary } from "./data";
import { Home as HomeScreen } from "./components/home/Home";
import { AnimatedButton } from "./components/motion/AnimatedButton";
const icons: Record<string, typeof Home> = {
  home: Home,
  book: BookOpen,
  bookmark: Bookmark,
  heart: Heart,
  compass: Compass,
  sun: Sun,
  moon: Moon,
  sparkles: Sparkles,
  graduation: GraduationCap,
  grid: LayoutGrid,
  star: Star,
};
function Icon({ name, size = 21 }: { name: string; size?: number }) {
  const C = icons[name] || Sparkles;
  return <C size={size} strokeWidth={1.65} />;
}
type Pref = {
  saved: string[];
  done: string[];
  reminders: Record<string, boolean>;
  times: Record<string, string>;
  theme: string;
  lang: string;
};
const initial: Pref = {
  saved: [],
  done: [],
  reminders: {},
  times: {},
  theme: "light",
  lang: "en",
};
function Button({
  children,
  secondary = false,
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { secondary?: boolean }) {
  return (
    <AnimatedButton variant={secondary ? "secondary" : "primary"} className={className} {...rest}>
      {tr(children)}
    </AnimatedButton>
  );
}
function Art({
  type = "book",
  color = "lilac",
}: {
  type?: string;
  color?: string;
}) {
  return (
    <div className={`clay ${color}`} aria-hidden="true">
      <div className="clay-object">
        <Icon name={type} size={53} />
      </div>
      <i>{" "}{tr("✦")}{" "}</i>
      <b>{" "}{tr("✧")}{" "}</b>
    </div>
  );
}
export default function App() {
  const [page,setPage]=useState('home'),[pref,setPref]=useState<Pref>(initial),[loaded,setLoaded]=useState(false),[menu,setMenu]=useState(false),[toast,setToast]=useState(''),[modal,setModal]=useState(''),[user,setUser]=useState('');
  useEffect(() => {
    try {
      const p = localStorage.getItem("deen-preferences");
      if (p) setPref({ ...initial, ...JSON.parse(p) });
      setUser(localStorage.getItem("deen-demo-user") || "");
    } catch {}
    setLoaded(true);
    const route = () => {
      const h = locationHash();
      setPage(h);
      setMenu(false);
      window.scrollTo(0, 0);
    };
    route();
    window.addEventListener("hashchange", route);
    return () => window.removeEventListener("hashchange", route);
  }, []);
  useEffect(() => {
    if (loaded) {
      localStorage.setItem("deen-preferences", JSON.stringify(pref));
      document.documentElement.dataset.theme = pref.theme;
      document.documentElement.lang = pref.lang;
      document.documentElement.dir = pref.lang === "en" ? "ltr" : "rtl";
    }
  }, [pref, loaded]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 3500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const [answer, setAnswer] = useState("");
  useEffect(() => {
    if (!modal) return;
    const before = document.activeElement as HTMLElement;
    document.getElementById("close-dialog")?.focus();
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModal("");
    };
    document.addEventListener("keydown", h);
    return () => {
      document.removeEventListener("keydown", h);
      before?.focus();
    };
  }, [modal]);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menu) return;
    document.getElementById("close-drawer")?.focus();
    document.body.style.overflow = "hidden";
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(false);
    };
    document.addEventListener("keydown", h);
    return () => {
      document.removeEventListener("keydown", h);
      document.body.style.overflow = "";
      menuButton.current?.focus();
    };
  }, [menu]);
  setLanguage(pref.lang);
  const t = dictionary[pref.lang] || dictionary.en;
  function go(p: string) {
    window.location.hash = p;
    setPage(p.split("?")[0]);
    setMenu(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function openCourse(id:string){go('course?path='+id)}
  function Header() {
    return (
      <>
        <header className="header">
          <a href="#home" className="brand">
            <img src="/logo-mark.svg" alt={tr("")} />
            <span>{" "}{tr("Deen e Safar")}{" "}<small>{" "}{tr("FAITH. KNOWLEDGE. JOURNEY.")}{" "}</small>
            </span>
          </a>
          <nav aria-label={tr("Main navigation")}>
            {tr(nav.map((n) => (
              <a
                key={n.id}
                href={"#" + n.id}
                className={page === n.id ? "active" : ""}
              >
                {tr(t[n.id])}
              </a>
            )))}
          </nav>
          <div className="header-actions">
            <label className="language">
              <Globe size={16} />
              <select
                aria-label={tr("Interface language")}
                value={pref.lang}
                onChange={(e) => setPref({ ...pref, lang: e.target.value })}
              >
                <option value="en">{" "}{tr("EN")}{" "}</option>
                <option value="ur">{" "}{tr("اردو")}{" "}</option>
                <option value="ar">{" "}{tr("عربي")}{" "}</option>
              </select>
            </label>
            <button
              className="icon-button"
              aria-label={tr("Toggle dark mode")}
              onClick={() =>
                setPref({
                  ...pref,
                  theme: pref.theme === "light" ? "dark" : "light",
                })
              }
            >
              {tr(pref.theme === "light" ? <Moon size={19} /> : <Sun size={19} />)}
            </button>
            <button
              className="icon-button notifications"
              aria-label={tr("Reminder center")}
              onClick={() => go("reminders")}
            >
              <Bell size={19} />
              <i />
            </button>
            <Button
              className="login-btn"
              onClick={() => go(user ? "dashboard" : "auth")}
            >
              {tr(user ? "My space" : "My profile")}
              <ArrowRight size={15} />
            </Button>
            <button
              className="icon-button mobile-menu"
              aria-label={tr("Open navigation")}
              aria-expanded={menu}
              aria-controls="site-drawer"
              ref={menuButton}
              onClick={() => setMenu(true)}
            >
              <Menu />
            </button>
          </div>
        </header>
        {tr(menu && (
          <div
            className="drawer"
            id="site-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={tr("Main navigation")}
            onKeyDown={trapFocus}
          >
            <div className="row">
              <strong>{" "}{tr("Explore your journey")}{" "}</strong>
              <button
                className="icon-button"
                id="close-drawer"
                aria-label={tr("Close navigation")}
                onClick={() => setMenu(false)}
              >
                <X />
              </button>
            </div>
            {tr(nav.map((n) => (
              <a href={"#" + n.id} key={n.id} aria-current={page === n.id ? "page" : undefined}>
                <Icon name={n.icon} />
                {tr(t[n.id])}
                <ChevronRight />
              </a>
            )))}
            <a href="#reminders">
              <Bell />{" "}{tr("Reminder Center")}{" "}</a>
            <a href={user ? "#dashboard" : "#auth"}>
              <Settings />{" "}{tr(user ? "My space" : "My profile")}{" "}</a>
          </div>
        ))}
      </>
    );
  }
  function Inspiration() { return <article className="inspiration"><span className="eyebrow">{" "}{tr("A MOMENT OF REFLECTION")}{" "}</span><div className="arabic" lang="ar" dir="rtl">{" "}{tr("رَّبِّ زِدْنِي عِلْمًا")}{" "}</div><h3>{" "}{tr("Asking for knowledge")}{" "}</h3><p>{" "}{tr("A beautiful reminder to keep a curious heart.")}{" "}</p><button className="btn secondary" onClick={()=>go('reader?surah=20&ayah=114')}>{" "}{tr("Read translation & context · 20:114 →")}{" "}</button></article>; }
  function PrayerCard() { return <PrayerWidget compact/>; }
  function HomePage() {
    return <HomeScreen go={go} lang={pref.lang} daily={<>{Inspiration()}{PrayerCard()}</>} />;
  }
  function Quran() { return <QuranExplorer notify={setToast}/>; }
  function Reader() { return <QuranReader notify={setToast}/>; }
  function Learning() { return <Learn notify={setToast}/>; }
  function Course() { return <Learn notify={setToast}/>; }
  function Lesson() { return <Learn notify={setToast}/>; }
  function Duas() { return <Library notify={setToast}/>; }
  function Prayer() { return <PrayerTools notify={setToast}/>; }
  function AI() { return <SourceFinder/>; }
  function Reminders() { return <RemindersTool notify={setToast}/>; }
  function Dashboard() { return <Personal notify={setToast} onName={setUser}/>; }
  function Auth() { return <Personal notify={setToast} onName={setUser}/>; }
  function Quiz() {
    return (
      <div className="quiz soft-card">
        <Art type="star" color="yellow" />
        <span className="eyebrow">{" "}{tr("A LITTLE DISCOVERY · 1 QUESTION")}{" "}</span>
        <h1>{" "}{tr("What is a thoughtful first step when learning something new?")}{" "}</h1>
        {tr([
          "Find a reliable source and write down your questions",
          "Accept the first answer without checking",
          "Rush to finish as quickly as possible",
        ].map((a) => (
          <button
            key={a}
            className={"quiz-option " + (answer === a ? "selected" : "")}
            onClick={() => setAnswer(a)}
          >
            {tr(a)}
            {tr(answer === a && <Check size={18} />)}
          </button>
        )))}
        {tr(answer && (
          <div className="notice">
            {tr(answer.startsWith("Find")
              ? "Exactly. Curiosity and careful sources make a beautiful beginning."
              : "Take your time. Reliable sources and thoughtful questions help you learn well.")}
          </div>
        ))}
        <Button onClick={() => go("learn")}>{" "}{tr("Explore a learning path")}{" "}<ArrowRight size={18} />
        </Button>
      </div>
    );
  }
  function Footer() {
    return (
      <footer>
        <div className="footer-main">
          <div>
            <a href="#home" className="brand">
              <img src="/logo-mark.svg" alt={tr("")} />
              <span>{" "}{tr("Deen e Safar")}{" "}<small>{" "}{tr("A BEAUTIFUL JOURNEY")}{" "}</small>
              </span>
            </a>
            <p>{" "}{tr("A peaceful space for curious hearts.")}{" "}<br />{" "}{tr("Discover, reflect, and grow — one step at a time.")}{" "}</p>
          </div>
          <div>
            <h4>{" "}{tr("Explore")}{" "}</h4>
            <a href="#quran">{" "}{tr("The Quran")}{" "}</a>
            <a href="#learn">{" "}{tr("Learning paths")}{" "}</a>
            <a href="#duas">{" "}{tr("Duas & Hadith")}{" "}</a>
          </div>
          <div>
            <h4>{" "}{tr("Your journey")}{" "}</h4>
            <a href="#dashboard">{" "}{tr("My dashboard")}{" "}</a>
            <a href="#reminders">{" "}{tr("Reminders")}{" "}</a>
            <a href="#ai">{" "}{tr("Source finder")}{" "}</a>
          </div>
          <div>
            <h4>{" "}{tr("A little more")}{" "}</h4>
            <button onClick={() => setModal("about")}>{" "}{tr("Our purpose")}{" "}</button>
            <button onClick={() => setModal("sources")}>{" "}{tr("Content & attribution")}{" "}</button>
            <button onClick={() => setModal("contact")}>{" "}{tr("Get in touch")}{" "}</button>
          </div>
        </div>
        <div className="footer-bottom">
          <span>{" "}{tr("© 2026 Deen e Safar. Made with intention.")}{" "}</span>
          <span>
            <button onClick={() => setModal("privacy")}>{" "}{tr("Privacy")}{" "}</button>
            <button onClick={() => setModal("terms")}>{" "}{tr("Terms")}{" "}</button>
            <span>{" "}{tr("✦ A little closer, every day.")}{" "}</span>
          </span>
        </div>
      </footer>
    );
  }
  function Modal() {
    return (
      <div className="modal-backdrop" onClick={() => setModal("")}>
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={trapFocus}
        >
          <button
            id="close-dialog"
            className="icon-button close"
            aria-label={tr("Close dialog")}
            onClick={() => setModal("")}
          >
            <X />
          </button>
          <span className="eyebrow">{" "}{tr("DEEN E SAFAR")}{" "}</span>
          <h2 id="modal-title">
            {tr({
              prayer: "Your prayer preferences",
              preview: "A gentle reminder",
              feedback: "Help us improve",
              about: "A beautiful journey",
              sources: "Made with care",
              privacy: "Your privacy matters",
              terms: "About this website",
              contact: "Stay connected",
            }[modal] || "Your journey")}
          </h2>
          <p>{tr({about:'Deen e Safar is a place for Quran reading, introductory learning, and daily reflection.',sources:'Quran: QuranEnc.com, English by Noor International Center v1.1.2; Urdu by Muhammad Ibrahim Junagarhi v1.1.3. Hadith: HadeethEnc.com, with source attribution and grading. Prayer calculations: Adhan. Verse audio: Islamic Network, Mishary Rashid Alafasy. Each content screen links its sources.',privacy:'Progress, notes, profile, and settings stay in this browser. Export or clear them from My space. Audio streams from Islamic Network; fonts load from Google Fonts. There is no account server or generative AI connection.',terms:'This is an educational reading and study tool. Translations explain meanings. Consult qualified scholarship for personal religious rulings. Calculated prayer times are not mosque congregation times.',contact:'Contact channels are not configured. No messages or personal details are submitted.'}[modal])}</p>
        </div>
      </div>
    );
  }
  const screens: Record<string, () => React.JSX.Element> = {
    home: HomePage,
    quran: Quran,
    reader: Reader,
    learn: Learning,
    course: Course,
    lesson: Lesson,
    duas: Duas,
    prayer: Prayer,
    ai: AI,
    reminders: Reminders,
    dashboard: Dashboard,
    auth: Auth,
    quiz: Quiz,
  };
  const Screen = screens[page] || HomePage;
  return (
    <LanguageContext.Provider value={pref.lang}><MotionConfig reducedMotion="user">
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >{" "}{tr("Skip to content")}{" "}</a>
      <ReminderScheduler notify={setToast}/>{Header()}
      <main
        id="main"
        tabIndex={-1}
        className={page === "home" ? "home-main" : "inner-main"}
      >
        <motion.div
          key={page}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {tr(Screen())}
        </motion.div>
      </main>
      {Footer()}
      <nav className="bottom-nav" aria-label={tr("Mobile navigation")}>
        {tr(nav
          .filter((n) =>
            ["home", "quran", "learn", "ai", "dashboard"].includes(n.id),
          )
          .map((n) => (
            <a
              href={"#" + n.id}
              className={page === n.id ? "active" : ""}
              key={n.id}
            >
              <Icon name={n.icon} size={21} />
              <span>
                {tr(n.id === "dashboard"
                  ? "Profile"
                  : n.id === "quran"
                    ? "Quran"
                    : n.id === "learn"
                      ? "Learn"
                      : n.id === "ai"
                        ? "Sources"
                        : t.home)}
              </span>
            </a>
          )))}
      </nav>
      {tr(toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {tr(toast)}
        </div>
      ))}
      {tr(modal && Modal())}
    </MotionConfig></LanguageContext.Provider>
  );
}
// Keeps Tab / Shift+Tab inside an open dialog or drawer.
function trapFocus(e: React.KeyboardEvent<HTMLElement>) {
  if (e.key !== "Tab") return;
  const f = e.currentTarget.querySelectorAll<HTMLElement>(
    "button,input,select,textarea,a[href]",
  );
  const first = f[0],
    last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}
function locationHash() {
  return window.location.hash.slice(1).split("?")[0] || "home";
}

// spaced-jsx
