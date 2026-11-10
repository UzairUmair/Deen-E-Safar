"use client";
import { Bookmark, BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useBookmarks } from "../../hooks/useGuestData";
import { useDailyVerse } from "../../hooks/useQuran";
import { link } from "../../lib/router";
import { QURAN_PROVIDER } from "../../services/quran/quranService";
import { formatLongDate } from "../../services/prayer/prayerTimeUtils";
import { ErrorState, Skeleton, useToast } from "../ui/states";

/** Verse of the day from the Quran provider. Never shows text that did not come from it. */
export function DailyVerse() {
  const { t, i18n } = useTranslation();
  const notify = useToast();
  const { verse, stale, loading, error, retry } = useDailyVerse();
  const bookmarks = useBookmarks();

  if (!verse) {
    return (
      <section className="widget daily-verse" aria-label={t("Daily verse")}>
        <span className="eyebrow">{t("DAILY VERSE")}</span>
        {loading ? (
          <div role="status">
            <span className="sr-only">{t("Loading today's verse…")}</span>
            <Skeleton lines={3} />
          </div>
        ) : (
          <ErrorState error={error} onRetry={() => retry()} title={t("Today's verse could not be loaded")} />
        )}
      </section>
    );
  }

  const language = i18n.language === "ur" ? "ur" : "en";
  // Arabic interface: the verse itself is the content, so no translation is shown.
  const translation = i18n.language === "ar" ? null : verse.translations[language];
  const saved = bookmarks.isVerseBookmarked(verse.surah, verse.ayah);
  return (
    <section className="widget daily-verse" aria-label={t("Daily verse")}>
      <div className="widget-head">
        <span className="eyebrow">{t("DAILY VERSE")}</span>
        <button
          type="button"
          className="icon-button"
          aria-pressed={saved}
          aria-label={saved ? t("Remove bookmark") : t("Bookmark this verse")}
          onClick={() => {
            const result = bookmarks.toggleVerse(verse.surah, verse.ayah);
            notify(t(result === "added" ? "Verse bookmarked" : result === "removed" ? "Bookmark removed" : "Could not save. Browser storage is unavailable or full."));
          }}
        >
          <Bookmark size={18} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
        </button>
      </div>
      {stale && (
        <p className="notice" role="status">
          {t("The provider could not be reached. Showing the verse saved on {{date}}.", { date: formatLongDate(verse.date, i18n.language) })}{" "}
          <button type="button" className="inline-link" onClick={() => retry()}>
            {t("Try again")}
          </button>
        </p>
      )}
      <p className="daily-arabic notranslate" lang="ar" dir="rtl" translate="no">
        {verse.arabic}
      </p>
      {translation && (
        <p className="daily-translation" lang={language} dir={language === "ur" ? "rtl" : "ltr"}>
          {translation.text}
        </p>
      )}
      <p className="daily-meta">
        <span>
          {i18n.language === "en" ? verse.surahName : <span lang="ar">{verse.surahArabicName}</span>} · {verse.surah}:{verse.ayah}
        </span>
        {translation && (
          <span>
            {t("Translation")}: {translation.edition} · {QURAN_PROVIDER.name}
          </span>
        )}
      </p>
      <a className="btn secondary btn-sm" href={link(`/quran/${verse.surah}?ayah=${verse.ayah}`)}>
        <BookOpen size={15} aria-hidden="true" />
        {t("Open in Quran")}
      </a>
    </section>
  );
}
