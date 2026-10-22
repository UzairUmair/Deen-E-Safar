"use client";
import { useState, useEffect } from "react";
import {
  ArrowRight,
  ArrowLeft,
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
  Search,
  GraduationCap,
  LayoutGrid,
  Home,
  Check,
  ChevronRight,
  Send,
  Copy,
  Settings,
  Globe,
  Calendar,
  Clock,
  Leaf,
  Star,
  Eye,
  EyeOff,
  LogOut,
  Plus,
  Share2,
} from "lucide-react";
import { motion, MotionConfig } from "motion/react";
import { courses, surahs, prayers, nav, dictionary } from "./data";
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
  onClick,
  secondary = false,
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { secondary?: boolean }) {
  return (
    <button
      className={`btn ${secondary ? "secondary" : ""} ${className}`}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
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
      <i>✦</i>
      <b>✧</b>
    </div>
  );
}
export default function App() {
  const [page, setPage] = useState("home"),
    [pref, setPref] = useState<Pref>(initial),
    [loaded, setLoaded] = useState(false),
    [menu, setMenu] = useState(false),
    [toast, setToast] = useState(""),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("All"),
    [selected, setSelected] = useState("foundations"),
    [surah, setSurah] = useState(20),
    [font, setFont] = useState(36),
    [reading, setReading] = useState(false),
    [lesson, setLesson] = useState(0),
    [modal, setModal] = useState(""),
    [auth, setAuth] = useState("login"),
    [showPassword, setShowPassword] = useState(false),
    [user, setUser] = useState(""),
    [busy, setBusy] = useState(false),
    [chat, setChat] = useState<{ role: string; text: string }[]>([]),
    [input, setInput] = useState(""),
    [location, setLocation] = useState("Karachi, Pakistan"),
    [method, setMethod] = useState("University of Islamic Sciences, Karachi"),
    [frequency, setFrequency] = useState("Daily"),
    [timezone, setTimezone] = useState("Asia/Karachi");
  useEffect(() => {
    try {
      const p = localStorage.getItem("deen-preferences");
      if (p) setPref({ ...initial, ...JSON.parse(p) });
      setUser(localStorage.getItem("deen-demo-user") || "");
      setFrequency(localStorage.getItem("deen-frequency") || "Daily");
      setTimezone(localStorage.getItem("deen-timezone") || "Asia/Karachi");
    } catch {}
    setLoaded(true);
    const route = () => {
      const h = locationHash();
      setPage(h);
      setMenu(false);
      setQuery("");
      setFilter("All");
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
  const t = dictionary[pref.lang] || dictionary.en;
  function go(p: string) {
    window.location.hash = p;
    setPage(p);
    setMenu(false);
    setQuery("");
    setFilter("All");
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function save(id: string) {
    setPref((p) => ({
      ...p,
      saved: p.saved.includes(id)
        ? p.saved.filter((x) => x !== id)
        : [...p.saved, id],
    }));
    setToast(
      pref.saved.includes(id)
        ? "Removed from your collection"
        : "Saved to your collection",
    );
  }
  function toggleReminder(id: string) {
    setPref((p) => ({
      ...p,
      reminders: { ...p.reminders, [id]: !p.reminders[id] },
    }));
  }
  function openCourse(id: string) {
    setSelected(id);
    setLesson(0);
    go("course");
  }
  function copy(text: string) {
    navigator.clipboard
      ?.writeText(text)
      .then(() => setToast("Copied to clipboard"))
      .catch(() => setToast("Clipboard unavailable in this browser"));
  }
  const course = courses.find((c) => c.id === selected) || courses[0];
  const currentSurah = surahs.find((s) => s.id === surah) || surahs[3];
  const countDone = (id: string) =>
    pref.done.filter((x) => x.startsWith(id + ":")).length;
  const complete = () => {
    const id = course.id + ":" + lesson;
    setPref((p) => ({ ...p, done: [...new Set([...p.done, id])] }));
    setToast("Lesson completed. A lovely step forward.");
    if (lesson < course.syllabus.length - 1) setLesson(lesson + 1);
  };
  function ask(question: string) {
    if (!question.trim() || busy) return;
    setChat((c) => [...c, { role: "user", text: question }]);
    setInput("");
    setBusy(true);
    setTimeout(() => {
      setChat((c) => [
        ...c,
        {
          role: "assistant",
          text: /learn|knowledge|begin|start/i.test(question)
            ? "A thoughtful place to begin is a small, regular reading practice. Choose one topic, note your questions, and study with a qualified teacher. The prayer in Quran 20:114 asks for an increase in knowledge. Read the passage in context using the reference below."
            : "I don’t have a reviewed answer to that question in this demo. I would rather leave it open than give you an unsupported explanation. Please bring questions about religious rulings to a qualified scholar.",
        },
      ]);
      setBusy(false);
    }, 900);
  }
  function Header() {
    return (
      <>
        <header className="header">
          <a href="#home" className="brand">
            <img src="/logo-mark.svg" alt="" />
            <span>
              Deen e Safar<small>FAITH. KNOWLEDGE. JOURNEY.</small>
            </span>
          </a>
          <nav aria-label="Main navigation">
            {nav.map((n) => (
              <a
                key={n.id}
                href={"#" + n.id}
                className={page === n.id ? "active" : ""}
              >
                {t[n.id]}
              </a>
            ))}
          </nav>
          <div className="header-actions">
            <label className="language">
              <Globe size={16} />
              <select
                aria-label="Interface language"
                value={pref.lang}
                onChange={(e) => setPref({ ...pref, lang: e.target.value })}
              >
                <option value="en">EN</option>
                <option value="ur">اردو</option>
                <option value="ar">عربي</option>
              </select>
            </label>
            <button
              className="icon-button"
              aria-label="Toggle dark mode"
              onClick={() =>
                setPref({
                  ...pref,
                  theme: pref.theme === "light" ? "dark" : "light",
                })
              }
            >
              {pref.theme === "light" ? <Moon size={19} /> : <Sun size={19} />}
            </button>
            <button
              className="icon-button notifications"
              aria-label="Reminder center"
              onClick={() => go("reminders")}
            >
              <Bell size={19} />
              <i />
            </button>
            <Button
              className="login-btn"
              onClick={() => go(user ? "dashboard" : "auth")}
            >
              {user ? "My space" : "Log in"}
              <ArrowRight size={15} />
            </Button>
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMenu(true)}
            >
              <Menu />
            </button>
          </div>
        </header>
        {menu && (
          <div className="drawer">
            <div className="row">
              <strong>Explore your journey</strong>
              <button
                className="icon-button"
                aria-label="Close navigation"
                onClick={() => setMenu(false)}
              >
                <X />
              </button>
            </div>
            {nav.map((n) => (
              <a href={"#" + n.id} key={n.id}>
                <Icon name={n.icon} />
                {t[n.id]}
                <ChevronRight />
              </a>
            ))}
            <a href="#reminders">
              <Bell />
              Reminder Center
            </a>
            <a href="#auth">Log in / Sign up</a>
          </div>
        )}
      </>
    );
  }
  function SectionTitle({
    eyebrow,
    title,
    description,
    action,
    onClick,
  }: {
    eyebrow: string;
    title: string;
    description?: string;
    action?: string;
    onClick?: () => void;
  }) {
    return (
      <div className="section-title">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {action && (
          <button className="text-button" onClick={onClick}>
            {action}
            <ArrowRight size={17} />
          </button>
        )}
      </div>
    );
  }
  function CourseCard({ c }: { c: (typeof courses)[0] }) {
    return (
      <article className="course-card">
        <button
          className="course-cover"
          onClick={() => openCourse(c.id)}
          aria-label={"Open " + c.title}
        >
          <Art type={c.icon} color={c.color} />
          <span className="pill">{c.category}</span>
        </button>
        <div className="course-info">
          <div className="row muted tiny">
            <span>{c.level}</span>
            <span>{c.syllabus.length} demo lessons</span>
          </div>
          <h3>
            <button className="plain" onClick={() => openCourse(c.id)}>
              {c.title}
            </button>
          </h3>
          <p>{c.description}</p>
          <div className="progress">
            <i
              style={{
                width: `${(countDone(c.id) / c.syllabus.length) * 100}%`,
              }}
            />
          </div>
          <div className="row">
            <span className="tiny muted">
              {countDone(c.id)
                ? `${countDone(c.id)} of ${c.syllabus.length} completed`
                : "A new path awaits"}
            </span>
            <button
              className="circle"
              aria-label={"Explore " + c.title}
              onClick={() => openCourse(c.id)}
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </article>
    );
  }
  function Inspiration() {
    return (
      <article className="inspiration">
        <div className="row">
          <span className="eyebrow">
            <Sparkles size={15} /> A MOMENT OF REFLECTION
          </span>
          <button
            className="icon-button"
            aria-label="Bookmark daily inspiration"
            onClick={() => save("Quran 20:114")}
          >
            <Bookmark
              fill={
                pref.saved.includes("Quran 20:114") ? "currentColor" : "none"
              }
              size={19}
            />
          </button>
        </div>
        <div className="arabic" lang="ar" dir="rtl">
          رَّبِّ زِدْنِي عِلْمًا
        </div>
        <h3>“My Lord! Increase me in knowledge.”</h3>
        <p>A beautiful reminder to keep a curious heart.</p>
        <div className="row">
          <a
            className="source"
            href="https://quran.com/20/114"
            target="_blank"
            rel="noreferrer"
          >
            Quran 20:114 · excerpt ↗
          </a>
          <button
            className="icon-button"
            aria-label="Copy inspiration"
            onClick={() =>
              copy(
                "“My Lord! Increase me in knowledge.” — Quran 20:114 (excerpt), Dr. Mustafa Khattab, The Clear Quran. https://quran.com/20/114",
              )
            }
          >
            <Share2 size={18} />
          </button>
        </div>
        <small className="attribution">
          Translation: Dr. Mustafa Khattab, The Clear Quran
        </small>
      </article>
    );
  }
  function PrayerCard({ full = false }: { full?: boolean }) {
    return (
      <article className="prayer-card">
        <div className="row">
          <div>
            <span className="eyebrow">YOUR DAILY RHYTHM</span>
            <h3>Make space for prayer</h3>
          </div>
          <Compass className="purple" />
        </div>
        <div className="row muted tiny">
          <span>{location}</span>
          <span className="demo-tag">Illustrative schedule</span>
        </div>
        <div className="next-prayer">
          <span>
            <small>DEMO NEXT PRAYER</small>
            <strong>Asr</strong>
          </span>
          <div>
            <b>15:39</b>
            <small>Sample day · not live times</small>
          </div>
        </div>
        <div className="prayer-list">
          {prayers.map((p) => (
            <div key={p.name} className={p.name === "Asr" ? "selected" : ""}>
              <Icon name={p.icon} size={17} />
              <span>{p.name}</span>
              <b>{p.time}</b>
            </div>
          ))}
        </div>
        <button
          className="text-button"
          onClick={() => (full ? setModal("prayer") : go("prayer"))}
        >
          Prayer settings
          <Settings size={15} />
        </button>
      </article>
    );
  }
  function HomePage() {
    return (
      <>
        <section className="hero" dir={pref.lang === "en" ? "ltr" : "rtl"}>
          <div className="hero-copy">
            <div className="salaam" lang="ar" dir="rtl">
              السلام عليكم
            </div>
            <span className="welcome">
              <span /> {t.welcome}
            </span>
            <h1>
              {t.heading}
              <br />
              <em>{t.highlight}</em>
            </h1>
            <p>{t.description}</p>
            <div className="hero-buttons">
              <Button onClick={() => go("learn")}>
                {t.start}
                <ArrowRight size={19} />
              </Button>
              <Button secondary onClick={() => go("quran")}>
                <BookOpen size={19} />
                {t.explore}
              </Button>
            </div>
            <div className="hero-notes">
              <span>
                <Leaf size={16} /> Learn at your pace
              </span>
              <span>
                <Heart size={16} /> Grow with intention
              </span>
            </div>
          </div>
          <div
            className="hero-visual"
            onPointerMove={(e) => {
              if (
                window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
                e.pointerType !== "mouse"
              )
                return;
              const r = e.currentTarget.getBoundingClientRect();
              e.currentTarget.style.setProperty(
                "--mx",
                `${(e.clientX - r.left - r.width / 2) / 55}px`,
              );
              e.currentTarget.style.setProperty(
                "--my",
                `${(e.clientY - r.top - r.height / 2) / 55}px`,
              );
            }}
            onPointerLeave={(e) => {
              e.currentTarget.style.setProperty("--mx", "0px");
              e.currentTarget.style.setProperty("--my", "0px");
            }}
          >
            <img
              src="/haramain.webp"
              alt="Artistic 3D montage of the Kaaba in Makkah and the green dome of Al Masjid an Nabawi in Madinah, on separate architectural platforms"
              fetchPriority="high"
              className="haramain-scene"
            />
            <div className="floating-note note-one">
              <span className="note-icon mint">
                <BookOpen size={19} />
              </span>
              <div>
                Makkah & Madinah<small>A connection that inspires.</small>
              </div>
            </div>
            <div className="floating-note note-two">
              <span>✦</span> Faith. Reflection. Discovery.
            </div>
            <span className="orbit-star">✧</span>
          </div>
        </section>
        <section className="quick-section">
          <div className="row">
            <span className="eyebrow">WHERE WILL YOUR JOURNEY TAKE YOU?</span>
            <span className="tiny muted">One thoughtful step at a time</span>
          </div>
          <div className="quick-grid">
            {[
              {
                name: "Read Quran",
                id: "quran",
                icon: "book",
                color: "lilac",
                sub: "Read. Reflect. Connect.",
              },
              {
                name: "Learn Islam",
                id: "learn",
                icon: "graduation",
                color: "mint",
                sub: "Make room for knowledge",
              },
              {
                name: "Daily Duas",
                id: "duas",
                icon: "heart",
                color: "peach",
                sub: "Words for every moment",
              },
              {
                name: "Prayer Times",
                id: "prayer",
                icon: "compass",
                color: "yellow",
                sub: "Find your daily rhythm",
              },
              {
                name: "Ask Safar AI",
                id: "ai",
                icon: "sparkles",
                color: "sky",
                sub: "Let curiosity lead the way",
              },
              {
                name: "Quick Quiz",
                id: "quiz",
                icon: "star",
                color: "pink",
                sub: "A little discovery awaits",
              },
            ].map((c) => (
              <button
                className={"quick-card " + c.color}
                key={c.id}
                onClick={() => go(c.id)}
              >
                <span className="quick-icon">
                  <Icon name={c.icon} size={29} />
                </span>
                <strong>{c.name}</strong>
                <small>{c.sub}</small>
                <ArrowRight size={17} />
              </button>
            ))}
          </div>
        </section>
        <section className="two-col daily">
          <Inspiration />
          <PrayerCard />
        </section>
        <section>
          <SectionTitle
            eyebrow="KNOWLEDGE, ONE STEP AT A TIME"
            title="Find your next little discovery."
            description="Thoughtfully designed paths for wherever you are in your journey."
            action="Explore all learning paths"
            onClick={() => go("learn")}
          />
          <div className="course-grid">
            {courses.slice(0, 3).map((c) => (
              <CourseCard key={c.id} c={c} />
            ))}
          </div>
        </section>
        <section className="ai-preview">
          <div>
            <span className="eyebrow">
              <Sparkles size={16} /> MEET YOUR LEARNING COMPANION
            </span>
            <h2>
              Big questions.
              <br />A gentle place to begin.
            </h2>
            <p>
              Explore ideas, find references, and follow your curiosity with
              Safar AI.
            </p>
            <Button onClick={() => go("ai")}>
              Let’s explore together <ArrowRight size={18} />
            </Button>
            <small>
              Educational demo · not a substitute for qualified scholarship
            </small>
          </div>
          <div className="preview-chat">
            <div className="row">
              <span className="ai-avatar">
                <Sparkles />
              </span>
              <div>
                <strong>Safar AI</strong>
                <small>Your curious companion</small>
              </div>
              <span className="pill">EN</span>
            </div>
            <p className="user-bubble">
              Where can I begin my learning journey?
            </p>
            <div className="assistant-bubble">
              Start small, and make space for curiosity. A thoughtful question
              can be the beginning of something beautiful.
              <a
                href="https://quran.com/20/114"
                target="_blank"
                rel="noreferrer"
                className="citation"
              >
                ↗ Quran 20:114 · read in context
              </a>
            </div>
            <div className="chat-foot">
              A little guidance for your next step <Sparkles size={17} />
            </div>
          </div>
        </section>
        <section className="reminder-banner">
          <div className="calendar-art">
            <Calendar size={45} />
            <span>✦</span>
          </div>
          <div>
            <span className="eyebrow">SMALL MOMENTS. MEANINGFUL HABITS.</span>
            <h2>A gentle nudge, just for you.</h2>
            <p>Make time for what matters with your own reminder routine.</p>
          </div>
          <Button secondary onClick={() => go("reminders")}>
            Set a reminder <Bell size={17} />
          </Button>
        </section>
      </>
    );
  }
  function Quran() {
    return (
      <>
        <SectionTitle
          eyebrow="READ • REFLECT • CONNECT"
          title="A quiet space for the Quran."
          description="Explore a curated demo catalogue. Full text and recitation are available through the linked source."
        />
        <div className="toolbar">
          <div className="search">
            <Search size={18} />
            <input
              aria-label="Search surahs"
              placeholder="Search by surah, meaning, or number…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button
            className={"chip " + (filter === "Saved" ? "selected" : "")}
            onClick={() => setFilter(filter === "Saved" ? "All" : "Saved")}
          >
            <Bookmark size={17} /> Bookmarks
          </button>
        </div>
        <div className="surah-grid">
          {surahs
            .filter(
              (s) =>
                `${s.name} ${s.meaning} ${s.id} ${s.arabic}`
                  .toLowerCase()
                  .includes(query.toLowerCase()) &&
                (filter !== "Saved" || pref.saved.includes("Surah " + s.name)),
            )
            .map((s) => (
              <article key={s.id} className="surah-card">
                <button
                  className="surah-main"
                  onClick={() => {
                    setSurah(s.id);
                    go("reader");
                  }}
                >
                  <span className="surah-number">{s.id}</span>
                  <span>
                    <strong>{s.name}</strong>
                    <small>
                      {s.meaning} · {s.verses} verses
                    </small>
                  </span>
                  <span className="arabic-name" lang="ar">
                    {s.arabic}
                  </span>
                </button>
                <button
                  className="icon-button"
                  aria-label={"Save " + s.name}
                  onClick={() => save("Surah " + s.name)}
                >
                  <Bookmark
                    size={17}
                    fill={
                      pref.saved.includes("Surah " + s.name)
                        ? "currentColor"
                        : "none"
                    }
                  />
                </button>
              </article>
            ))}
        </div>
        {!surahs.some(
          (s) =>
            `${s.name} ${s.meaning} ${s.id} ${s.arabic}`
              .toLowerCase()
              .includes(query.toLowerCase()) &&
            (filter !== "Saved" || pref.saved.includes("Surah " + s.name)),
        ) && (
          <div className="empty">
            <BookOpen />
            <h3>No surahs here yet</h3>
            <p>Try another search or save a surah to your collection.</p>
          </div>
        )}
      </>
    );
  }
  function Reader() {
    return (
      <div className={"reader " + (reading ? "focus-reading" : "")}>
        <button className="text-button" onClick={() => go("quran")}>
          <ArrowLeft size={17} /> Back to Quran Explorer
        </button>
        <div className="reader-heading">
          <span className="eyebrow">QURAN READER · FRONTEND PREVIEW</span>
          <h1 lang="ar">{currentSurah.arabic}</h1>
          <h2>{currentSurah.name}</h2>
          <p>
            {currentSurah.meaning} · {currentSurah.verses} verses
          </p>
        </div>
        <div className="reader-controls">
          <select
            aria-label="Select surah"
            value={surah}
            onChange={(e) => setSurah(Number(e.target.value))}
          >
            {surahs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id}. {s.name}
              </option>
            ))}
          </select>
          <label>
            Text size{" "}
            <input
              aria-label="Arabic font size"
              type="range"
              min="26"
              max="56"
              value={font}
              onChange={(e) => setFont(+e.target.value)}
            />
          </label>
          <button className="chip" onClick={() => setReading(!reading)}>
            {reading ? "Exit focus mode" : "Focus mode"}
          </button>
          <button
            className="icon-button"
            aria-label="Bookmark surah"
            onClick={() => save("Surah " + currentSurah.name)}
          >
            <Bookmark />
          </button>
        </div>
        {surah === 20 ? (
          <article className="verse-card">
            <div className="row">
              <span className="pill">20:114 · excerpt</span>
              <button
                className="icon-button"
                aria-label="Copy excerpt"
                onClick={() =>
                  copy("رَّبِّ زِدْنِي عِلْمًا — Quran 20:114 (excerpt)")
                }
              >
                <Copy size={18} />
              </button>
            </div>
            <p
              className="arabic"
              lang="ar"
              dir="rtl"
              style={{ fontSize: font }}
            >
              رَّبِّ زِدْنِي عِلْمًا
            </p>
            <p>“My Lord! Increase me in knowledge.”</p>
            <small className="muted">
              Dr. Mustafa Khattab, The Clear Quran · English translation excerpt
            </small>
          </article>
        ) : (
          <div className="empty">
            <BookOpen size={35} />
            <h3>Your reading space is ready</h3>
            <p>
              Full Arabic text is not bundled in this prototype. Read this surah
              with verified text and translations at Quran.com.
            </p>
          </div>
        )}
        <a
          className="btn secondary"
          href={`https://quran.com/${surah}`}
          target="_blank"
          rel="noreferrer"
        >
          Read full surah & listen at Quran.com ↗
        </a>
        <p className="fine-print">
          Recitation and additional translation selection will be connected in a
          future release.
        </p>
      </div>
    );
  }
  function Learning() {
    return (
      <>
        <SectionTitle
          eyebrow="YOUR LEARNING JOURNEY"
          title="A little more understanding. Every day."
          description="Find a path that meets you where you are. These lessons demonstrate the learning experience."
        />
        <div className="toolbar">
          <div className="search">
            <Search size={18} />
            <input
              aria-label="Search courses"
              placeholder="What would you like to explore?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            aria-label="Course difficulty"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option>All</option>
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
          </select>
        </div>
        <div className="course-grid">
          {courses
            .filter(
              (c) =>
                c.title.toLowerCase().includes(query.toLowerCase()) &&
                (filter === "All" || c.level === filter),
            )
            .map((c) => (
              <CourseCard key={c.id} c={c} />
            ))}
        </div>
        {!courses.some(
          (c) =>
            c.title.toLowerCase().includes(query.toLowerCase()) &&
            (filter === "All" || c.level === filter),
        ) && (
          <div className="empty">
            <Search />
            <h3>No matching paths yet</h3>
            <p>Try another topic or difficulty.</p>
          </div>
        )}
      </>
    );
  }
  function Course() {
    return (
      <>
        <button className="text-button" onClick={() => go("learn")}>
          <ArrowLeft size={17} /> All learning paths
        </button>
        <div className="course-detail">
          <div>
            <span className="eyebrow">
              {course.category} · {course.level}
            </span>
            <h1>{course.title}</h1>
            <p>{course.description}</p>
            <div className="hero-buttons">
              <Button onClick={() => go("lesson")}>
                {countDone(course.id) ? "Continue learning" : "Begin this path"}
                <ArrowRight size={18} />
              </Button>
              <Button secondary onClick={() => save(course.title)}>
                <Bookmark size={18} />
                {pref.saved.includes(course.title) ? "Saved" : "Save path"}
              </Button>
            </div>
            <p className="fine-print">
              Demo curriculum · educational content awaiting editorial review
            </p>
          </div>
          <Art type={course.icon} color={course.color} />
        </div>
        <SectionTitle
          eyebrow="YOUR PATH, AT A GLANCE"
          title="Small steps toward understanding."
        />
        <div className="syllabus">
          {course.syllabus.map((s, i) => (
            <button
              key={s}
              onClick={() => {
                setLesson(i);
                go("lesson");
              }}
            >
              <span
                className={
                  "step " +
                  (pref.done.includes(course.id + ":" + i) ? "complete" : "")
                }
              >
                {pref.done.includes(course.id + ":" + i) ? (
                  <Check size={18} />
                ) : (
                  String(i + 1).padStart(2, "0")
                )}
              </span>
              <span>
                <strong>{s}</strong>
                <small>Demo lesson · reflection & notes</small>
              </span>
              <ChevronRight size={18} />
            </button>
          ))}
        </div>
      </>
    );
  }
  function Lesson() {
    return (
      <div className="lesson-layout">
        <aside>
          <button className="text-button" onClick={() => go("course")}>
            <ArrowLeft size={16} /> Course overview
          </button>
          <h3>{course.title}</h3>
          {course.syllabus.map((s, i) => (
            <button
              className={i === lesson ? "selected" : ""}
              key={s}
              onClick={() => setLesson(i)}
            >
              <span>
                {pref.done.includes(course.id + ":" + i) ? "✓" : i + 1}
              </span>
              {s}
            </button>
          ))}
        </aside>
        <article className="lesson-content">
          <span className="eyebrow">
            LESSON {lesson + 1} OF {course.syllabus.length} · DEMO
          </span>
          <h1>{course.syllabus[lesson]}</h1>
          <div className="notice">
            This is a sample lesson experience. Reviewed religious teaching will
            be added before launch.
          </div>
          <h2>Begin with a thoughtful question.</h2>
          <p>
            Learning starts with curiosity. Before exploring this topic, take a
            moment to consider what you hope to understand and where you would
            like guidance.
          </p>
          <h3>A moment to reflect</h3>
          <p>
            What would you like to learn about “
            {course.syllabus[lesson].toLowerCase()}”? Write down one question to
            discuss with a qualified teacher.
          </p>
          <label className="field">
            Your reflection
            <textarea
              key={course.id + lesson}
              defaultValue={
                loaded
                  ? localStorage.getItem("note-" + course.id + lesson) || ""
                  : ""
              }
              onBlur={(e) => {
                localStorage.setItem(
                  "note-" + course.id + lesson,
                  e.target.value,
                );
                setToast("Reflection saved on this device");
              }}
              placeholder="A question I’m curious about…"
            />
          </label>
          <Button onClick={complete}>
            <Check size={18} />
            {pref.done.includes(course.id + ":" + lesson)
              ? "Review completed lesson"
              : "Mark lesson complete"}
          </Button>
        </article>
      </div>
    );
  }
  function Duas() {
    return (
      <>
        <SectionTitle
          eyebrow="WORDS FOR YOUR EVERYDAY"
          title="Little moments of remembrance."
          description="A space for duas and Hadith, with clear sources and room to reflect."
        />
        <div className="tabs">
          {["Duas", "Hadith", "Saved"].map((x) => (
            <button
              className={
                (filter === "All" && x === "Duas") || filter === x
                  ? "selected"
                  : ""
              }
              onClick={() => setFilter(x)}
              key={x}
            >
              {x}
            </button>
          ))}
        </div>
        <div className="toolbar">
          <div className="search">
            <Search size={18} />
            <input
              aria-label="Search library"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search knowledge, gratitude, travel…"
            />
          </div>
        </div>
        {filter === "Hadith" ? (
          <div className="empty">
            <BookOpen />
            <h3>A carefully sourced collection is on its way.</h3>
            <p>
              Hadith texts, grading, and references will be added after
              editorial review.
            </p>
            <a
              className="btn secondary"
              href="https://sunnah.com"
              target="_blank"
              rel="noreferrer"
            >
              Explore Sunnah.com ↗
            </a>
          </div>
        ) : (!query || /knowledge|learn|daily/i.test(query)) &&
          (filter !== "Saved" || pref.saved.includes("Quran 20:114")) ? (
          <div className="library-grid">
            <Inspiration />
            <article className="soft-card">
              <Art type="heart" color="peach" />
              <h3>For all the moments in between</h3>
              <p>
                Morning & Evening · Prayer · Gratitude · Travel · Protection ·
                Daily Life
              </p>
              <p className="fine-print">
                Category content is awaiting source review. No sample narration
                is presented as an authentic Hadith.
              </p>
            </article>
          </div>
        ) : (
          <div className="empty">
            <Bookmark />
            <h3>No matching entries</h3>
            <p>Try “knowledge” or bookmark the daily reflection.</p>
          </div>
        )}
      </>
    );
  }
  function Prayer() {
    return (
      <>
        <SectionTitle
          eyebrow="A RHYTHM OF REFLECTION"
          title="Make room for meaningful pauses."
          description="Preview the prayer timetable and location settings. All displayed times are illustrative, not calculated for today."
        />
        <div className="two-col">
          <PrayerCard full />
          <div className="soft-card">
            <Art type="compass" color="mint" />
            <h3>Your place in the world</h3>
            <p>{location}</p>
            <p className="fine-print">
              Calculation method: {method}. Location changes are saved for this
              session; they do not calculate a real schedule.
            </p>
            <Button secondary onClick={() => setModal("prayer")}>
              <Settings size={18} />
              Location & calculation
            </Button>
            <button className="text-button" onClick={() => go("reminders")}>
              Plan a prayer reminder
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
        <div className="notice">
          No live countdown or Qibla bearing is shown because location and
          prayer calculations are not connected.
        </div>
      </>
    );
  }
  function AI() {
    return (
      <div className="ai-layout">
        <aside>
          <Button
            onClick={() => {
              setChat([]);
              setInput("");
            }}
          >
            <Plus size={17} />
            New conversation
          </Button>
          <h4>YOUR CONVERSATION</h4>
          <p className="fine-print">Current session only</p>
          <button
            className="history-item"
            onClick={() => setInput("Where should I begin learning?")}
          >
            <Sparkles size={17} /> A beautiful beginning
          </button>
          <button className="text-button" onClick={() => go("dashboard")}>
            <Bookmark size={16} /> Saved references
          </button>
          <div className="ai-sidebar-note">
            <Leaf />
            <p>Curiosity is a beautiful place to begin.</p>
            <small>
              Mock responses. Reviewed sources will power the future assistant.
            </small>
          </div>
        </aside>
        <div className="chat-main">
          <div className="row chat-heading">
            <div>
              <strong>Safar AI</strong>
              <span className="demo-tag">Educational demo</span>
            </div>
            <label className="language">
              <Globe size={16} />
              <select
                aria-label="AI language preview"
                onChange={() =>
                  setToast(
                    "The current sample responses are available in English.",
                  )
                }
              >
                <option>English</option>
                <option>Urdu</option>
                <option>Arabic</option>
              </select>
            </label>
          </div>
          <div className="messages" aria-live="polite">
            {chat.length === 0 ? (
              <div className="ai-welcome">
                <Art type="sparkles" color="lilac" />
                <span className="eyebrow">
                  A LITTLE CURIOSITY GOES A LONG WAY
                </span>
                <h1>What’s on your mind?</h1>
                <p>A gentle space to ask, explore, and discover.</p>
                <div className="suggestions">
                  {[
                    "Where should I begin learning?",
                    "How can I build a reading habit?",
                    "What does seeking knowledge mean?",
                  ].map((q) => (
                    <button key={q} onClick={() => ask(q)}>
                      {q}
                      <ArrowRight size={16} />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              chat.map((m, i) => (
                <div className={"message " + m.role} key={i}>
                  {m.role === "assistant" && (
                    <span className="ai-avatar">
                      <Sparkles size={19} />
                    </span>
                  )}
                  <div>
                    <small>
                      {m.role === "assistant" ? "SAMPLE EXPLANATION" : "YOU"}
                    </small>
                    <p>{m.text}</p>
                    {m.role === "assistant" && (
                      <>
                        <a
                          className="citation"
                          href="https://quran.com/20/114"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Quran 20:114 · source excerpt ↗
                        </a>
                        <div className="row message-actions">
                          <button
                            className="icon-button"
                            aria-label="Copy response"
                            onClick={() => copy(m.text)}
                          >
                            <Copy size={16} />
                          </button>
                          <button
                            className="text-button"
                            onClick={() => setModal("feedback")}
                          >
                            Report response
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
            {busy && (
              <p className="loading">
                Preparing a sample response <span>•••</span>
              </p>
            )}
          </div>
          <form
            className="composer"
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
          >
            <input
              aria-label="Ask Safar AI"
              placeholder="Let your curiosity lead the way…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={2000}
            />
            <button
              className="send"
              aria-label="Send message"
              disabled={!input.trim() || busy}
            >
              <Send size={20} />
            </button>
          </form>
          <p className="fine-print centered">
            Educational guidance, not religious rulings. Consult a qualified
            scholar.
          </p>
        </div>
      </div>
    );
  }
  function Reminders() {
    return (
      <>
        <SectionTitle
          eyebrow="A GENTLE NUDGE"
          title="Make time for what matters."
          description="Shape a routine that feels right for you. Preferences are saved on this device only."
        />
        <div className="notice">
          <Bell size={20} />
          <div>
            <strong>Notifications are not enabled</strong>
            <p>
              This frontend demo saves preferences but does not schedule or send
              notifications.
            </p>
          </div>
        </div>
        <div className="reminder-layout">
          <div>
            {[
              "Prayer time",
              "Daily dua",
              "Quran reading",
              "Learning session",
              "Weekly review",
            ].map((r, i) => (
              <article className="reminder-row" key={r}>
                <span
                  className={
                    "reminder-icon " +
                    ["lilac", "peach", "mint", "sky", "yellow"][i]
                  }
                >
                  <Icon
                    name={["compass", "heart", "book", "graduation", "star"][i]}
                  />
                </span>
                <div>
                  <h3>{r}</h3>
                  <label className="time-label">
                    Preferred time{" "}
                    <input
                      aria-label={r + " reminder time"}
                      type="time"
                      value={pref.times[r] || "08:00"}
                      onChange={(e) =>
                        setPref({
                          ...pref,
                          times: { ...pref.times, [r]: e.target.value },
                        })
                      }
                    />
                  </label>
                </div>
                <button
                  className={"toggle " + (pref.reminders[r] ? "on" : "")}
                  role="switch"
                  aria-checked={!!pref.reminders[r]}
                  aria-label={r + " preference"}
                  onClick={() => toggleReminder(r)}
                >
                  <span />
                </button>
              </article>
            ))}
          </div>
          <aside className="soft-card">
            <span className="eyebrow">YOUR ROUTINE</span>
            <h3>A little space, just for you.</h3>
            <label className="field">
              Frequency
              <select
                value={frequency}
                onChange={(e) => {
                  setFrequency(e.target.value);
                  localStorage.setItem("deen-frequency", e.target.value);
                }}
              >
                <option>Daily</option>
                <option>Weekdays</option>
                <option>Weekly</option>
              </select>
            </label>
            <label className="field">
              Timezone
              <select
                value={timezone}
                onChange={(e) => {
                  setTimezone(e.target.value);
                  localStorage.setItem("deen-timezone", e.target.value);
                }}
              >
                <option>Asia/Karachi</option>
                <option>Asia/Dubai</option>
                <option>Europe/London</option>
                <option>America/New_York</option>
              </select>
            </label>
            <Button secondary onClick={() => setModal("preview")}>
              <Eye size={17} />
              Preview reminder
            </Button>
            <button
              className="text-button"
              onClick={() => {
                setPref({ ...pref, reminders: {} });
                setToast("All reminder preferences paused");
              }}
            >
              Pause all reminders
            </button>
          </aside>
        </div>
      </>
    );
  }
  function Dashboard() {
    return (
      <>
        <div className="dashboard-welcome">
          <div>
            <span className="eyebrow">YOUR OWN LITTLE CORNER</span>
            <h1>
              Welcome{user ? ", " + user : ""}.<br />
              Your journey continues.
            </h1>
            <p>A little learning, a moment of reflection, a step forward.</p>
          </div>
          <Art type="moon" color="lilac" />
        </div>
        <div className="dashboard-stats">
          <div>
            <BookOpen />
            <strong>{pref.done.length}</strong>
            <span>Demo lessons explored</span>
          </div>
          <div>
            <Bookmark />
            <strong>{pref.saved.length}</strong>
            <span>Saved discoveries</span>
          </div>
          <div>
            <Bell />
            <strong>
              {Object.values(pref.reminders).filter(Boolean).length}
            </strong>
            <span>Reminder preferences</span>
          </div>
        </div>
        <SectionTitle
          eyebrow="PICK UP WHERE YOU LEFT OFF"
          title="Your next step is waiting."
          action="All learning paths"
          onClick={() => go("learn")}
        />
        <div className="course-grid">
          {courses.slice(0, 3).map((c) => (
            <CourseCard key={c.id} c={c} />
          ))}
        </div>
        <section className="two-col">
          <div className="soft-card">
            <h2>Your saved discoveries</h2>
            {pref.saved.length ? (
              pref.saved.map((s) => (
                <div className="saved-row" key={s}>
                  <Bookmark size={18} />
                  <span>{s}</span>
                  <button
                    className="icon-button"
                    aria-label={"Remove " + s}
                    onClick={() => save(s)}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))
            ) : (
              <p>
                Save a surah, reflection, or learning path and find it here.
              </p>
            )}
            <button className="text-button" onClick={() => go("quran")}>
              Continue reading
              <ArrowRight size={16} />
            </button>
          </div>
          <PrayerCard />
        </section>
        {user && (
          <button
            className="text-button"
            onClick={() => {
              setUser("");
              localStorage.removeItem("deen-demo-user");
              setToast("Signed out of demo profile");
            }}
          >
            <LogOut size={17} /> Sign out of demo profile
          </button>
        )}
      </>
    );
  }
  function Auth() {
    return (
      <div className="auth-layout">
        <div className="auth-art">
          <img src="/haramain.webp" alt="The Deen e Safar learning journey" />
          <h2>
            A beautiful journey
            <br />
            begins with a little curiosity.
          </h2>
        </div>
        <form
          className="auth-form"
          onSubmit={(e) => {
            e.preventDefault();
            setBusy(true);
            const d = new FormData(e.currentTarget);
            setTimeout(() => {
              setBusy(false);
              if (auth === "forgot") {
                setToast("Demo only: no reset email was sent");
                return;
              }
              const n = String(d.get("name") || "Friend");
              setUser(n);
              localStorage.setItem("deen-demo-user", n);
              go("dashboard");
              setToast("Welcome to your local demo profile");
            }, 650);
          }}
        >
          <span className="eyebrow">YOUR JOURNEY STARTS HERE</span>
          <h1>
            {auth === "signup"
              ? "A little space for you."
              : auth === "forgot"
                ? "Let’s help you back in."
                : "Welcome back."}
          </h1>
          <p>
            {auth === "forgot"
              ? "Preview the password reset flow."
              : "Make room for learning, reflection, and growth."}
          </p>
          <div className="notice">
            Demo profile only. Do not enter a real password.
          </div>
          {auth === "signup" && (
            <label className="field">
              Name
              <input
                name="name"
                required
                placeholder="What should we call you?"
                autoComplete="off"
              />
            </label>
          )}
          <label className="field">
            Email
            <input
              type="email"
              name="email"
              required
              placeholder="you@example.com"
              autoComplete="off"
            />
          </label>
          {auth !== "forgot" && (
            <label className="field">
              Demo password
              <div className="password">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Show password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
          )}
          {auth === "login" && (
            <button
              type="button"
              className="text-button"
              onClick={() => setAuth("forgot")}
            >
              Forgot password?
            </button>
          )}
          <Button disabled={busy} type="submit">
            {busy
              ? "One moment…"
              : auth === "forgot"
                ? "Preview reset"
                : auth === "signup"
                  ? "Create demo profile"
                  : "Enter demo profile"}
            <ArrowRight size={17} />
          </Button>
          {auth !== "forgot" && (
            <Button
              secondary
              type="button"
              onClick={() =>
                setToast("Google sign-in is not connected in this prototype.")
              }
            >
              Continue with Google
            </Button>
          )}
          <p className="centered">
            {auth === "signup"
              ? "Already have an account?"
              : "New to Deen e Safar?"}{" "}
            <button
              type="button"
              className="inline-link"
              onClick={() => setAuth(auth === "signup" ? "login" : "signup")}
            >
              {auth === "signup" ? "Log in" : "Join the journey"}
            </button>
          </p>
          {auth === "forgot" && (
            <button
              type="button"
              className="text-button"
              onClick={() => setAuth("login")}
            >
              Back to login
            </button>
          )}
        </form>
      </div>
    );
  }
  function Quiz() {
    return (
      <div className="quiz soft-card">
        <Art type="star" color="yellow" />
        <span className="eyebrow">A LITTLE DISCOVERY · 1 QUESTION</span>
        <h1>What is a thoughtful first step when learning something new?</h1>
        {[
          "Find a reliable source and write down your questions",
          "Accept the first answer without checking",
          "Rush to finish as quickly as possible",
        ].map((a) => (
          <button
            key={a}
            className={"quiz-option " + (answer === a ? "selected" : "")}
            onClick={() => setAnswer(a)}
          >
            {a}
            {answer === a && <Check size={18} />}
          </button>
        ))}
        {answer && (
          <div className="notice">
            {answer.startsWith("Find")
              ? "Exactly. Curiosity and careful sources make a beautiful beginning."
              : "Take your time. Reliable sources and thoughtful questions help you learn well."}
          </div>
        )}
        <Button onClick={() => go("learn")}>
          Explore a learning path
          <ArrowRight size={18} />
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
              <img src="/logo-mark.svg" alt="" />
              <span>
                Deen e Safar<small>A BEAUTIFUL JOURNEY</small>
              </span>
            </a>
            <p>
              A peaceful space for curious hearts.
              <br />
              Discover, reflect, and grow — one step at a time.
            </p>
          </div>
          <div>
            <h4>Explore</h4>
            <a href="#quran">The Quran</a>
            <a href="#learn">Learning paths</a>
            <a href="#duas">Duas & Hadith</a>
          </div>
          <div>
            <h4>Your journey</h4>
            <a href="#dashboard">My dashboard</a>
            <a href="#reminders">Reminders</a>
            <a href="#ai">Safar AI</a>
          </div>
          <div>
            <h4>A little more</h4>
            <button onClick={() => setModal("about")}>Our purpose</button>
            <button onClick={() => setModal("sources")}>
              Content & attribution
            </button>
            <button onClick={() => setModal("contact")}>Get in touch</button>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Deen e Safar. Made with intention.</span>
          <span>
            <button onClick={() => setModal("privacy")}>Privacy</button>
            <button onClick={() => setModal("terms")}>Terms</button>
            <span>✦ A little closer, every day.</span>
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
          onKeyDown={(e) => {
            if (e.key === "Tab") {
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
          }}
        >
          <button
            id="close-dialog"
            className="icon-button close"
            aria-label="Close dialog"
            onClick={() => setModal("")}
          >
            <X />
          </button>
          <span className="eyebrow">DEEN E SAFAR</span>
          <h2 id="modal-title">
            {{
              prayer: "Your prayer preferences",
              preview: "A gentle reminder",
              feedback: "Help us improve",
              about: "A beautiful journey",
              sources: "Made with care",
              privacy: "Your privacy matters",
              terms: "About this prototype",
              contact: "Stay connected",
            }[modal] || "Your journey"}
          </h2>
          {modal === "prayer" ? (
            <>
              <label className="field">
                Location
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </label>
              <label className="field">
                Calculation method
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                >
                  <option>University of Islamic Sciences, Karachi</option>
                  <option>Muslim World League</option>
                  <option>ISNA</option>
                </select>
              </label>
              <p className="fine-print">
                Demo settings only. Displayed times will not change.
              </p>
              <Button
                onClick={() => {
                  setModal("");
                  setToast("Demo calculation preferences updated");
                }}
              >
                Save preferences
              </Button>
            </>
          ) : modal === "preview" ? (
            <>
              <div className="notification-preview">
                <img src="/logo-mark.svg" alt="" />
                <div>
                  <strong>A little time for your journey</strong>
                  <p>
                    Your reading space is waiting. Take a quiet moment when
                    you’re ready.
                  </p>
                  <small>
                    {frequency} · {timezone} · Preview only
                  </small>
                </div>
              </div>
            </>
          ) : modal === "feedback" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setModal("");
                setToast("Feedback preview complete. Nothing was sent.");
              }}
            >
              <label className="field">
                What would you like to flag?
                <textarea
                  required
                  placeholder="Tell us what needs attention…"
                />
              </label>
              <Button>Preview report</Button>
            </form>
          ) : (
            <p>
              {
                {
                  about:
                    "Deen e Safar brings learning and reflection into a warm, welcoming digital space. This prototype explores a thoughtful journey through Islamic knowledge.",
                  sources:
                    "The Quran 20:114 excerpt links to Quran.com; English translation by Dr. Mustafa Khattab, The Clear Quran. Course outlines and AI replies are clearly labeled demonstrations. The hero artwork was generated for this project; the crescent brand mark was supplied by you.",
                  privacy:
                    "Bookmarks, demo profile name, lesson progress, reminder preferences, and reflections stay in this browser’s local storage. No production authentication, analytics, AI service, or notification backend is connected. Use your browser’s site-data controls to clear this information.",
                  terms:
                    "This is an interactive frontend prototype, not a religious authority. Schedules are illustrative. Sample lessons are not reviewed teaching. Consult qualified scholars for religious rulings.",
                  contact:
                    "Contact channels have not been configured for this prototype. No messages or personal details are submitted.",
                }[modal]
              }
            </p>
          )}
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
    <MotionConfig reducedMotion="user">
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >
        Skip to content
      </a>
      <Header />
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
          {Screen()}
        </motion.div>
      </main>
      <Footer />
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {nav
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
                {n.id === "dashboard"
                  ? "Profile"
                  : n.id === "quran"
                    ? "Quran"
                    : n.id === "learn"
                      ? "Learn"
                      : n.id === "ai"
                        ? "AI"
                        : t.home}
              </span>
            </a>
          ))}
      </nav>
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
        </div>
      )}
      {modal && Modal()}
    </MotionConfig>
  );
}
function locationHash() {
  return window.location.hash.slice(1) || "home";
}
