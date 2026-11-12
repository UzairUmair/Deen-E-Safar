"use client";
import { Bookmark, BookOpen, Compass, Heart, Settings, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BookmarksWidget, RecentWidget } from "../components/dashboard/BookmarksWidget";
import { ContinueReading } from "../components/dashboard/ContinueReading";
import { DailyVerse } from "../components/dashboard/DailyVerse";
import { PrayerWidget } from "../components/dashboard/PrayerWidget";
import { useStored } from "../features/shared";
import { useGuestPreferences } from "../hooks/useGuestData";
import { useNow } from "../hooks/usePrayerTimes";
import { link } from "../lib/router";

const ACTIONS = [
  { to: "/quran", label: "Quran Explorer", icon: BookOpen },
  { to: "/prayer", label: "Prayer Times", icon: Compass },
  { to: "/duas", label: "Daily Duas", icon: Heart },
  { to: "/bookmarks", label: "Bookmarks", icon: Bookmark },
  { to: "/ai", label: "Islamic AI Assistant", icon: Sparkles },
  { to: "/preferences", label: "Preferences", icon: Settings },
];

/** Guest dashboard: every figure on it is read from the shared services or this browser's saved data. */
export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const { displayName } = useGuestPreferences();
  const now = useNow(60000);
  const [lessons] = useStored<string[]>("deen-lessons", []);
  const hour = now ? new Date(now).getHours() : null;
  const greeting = hour === null ? "Welcome" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const locale = i18n.language === "ur" ? "ur-PK-u-nu-latn" : i18n.language === "ar" ? "ar-u-nu-latn" : "en-GB";

  return (
    <div className="app-screen dashboard">
      <header className="page-heading">
        <div>
          <span className="guest-badge">{t("Guest Mode")}</span>
          <h1 className="feature-heading">
            {t(greeting)}
            {displayName && `, ${displayName}`}
          </h1>
          <p>
            {now ? new Date(now).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "…"}
            {" · "}
            {t("No account is needed. Bookmarks, reading position and settings are saved in this browser only.")}
          </p>
        </div>
      </header>

      <div className="dashboard-grid">
        <PrayerWidget />
        <DailyVerse />
        <ContinueReading />
        <BookmarksWidget />
        <RecentWidget />
        <section className="widget" aria-label={t("Learning progress")}>
          <span className="eyebrow">{t("LEARNING")}</span>
          <h2>{lessons.length ? t("{{n}} of 15 lessons completed", { n: lessons.length }) : t("No lessons completed yet")}</h2>
          <a className="text-button" href="#learn">
            {lessons.length ? t("Continue learning") : t("Start a learning path")}
          </a>
        </section>
      </div>

      <nav className="quick-actions" aria-label={t("Quick actions")}>
        {ACTIONS.map(({ to, label, icon: Icon }) => (
          <a key={to} href={link(to)} className="quick-action">
            <Icon size={20} aria-hidden="true" />
            {t(label)}
          </a>
        ))}
      </nav>

      <p className="fine-print">{t("Accounts and syncing between devices are not available yet. When they are, you will be able to choose which saved items to move to your account.")}</p>
    </div>
  );
}
