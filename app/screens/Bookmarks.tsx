"use client";
import { useMemo, useState } from "react";
import { ChevronDown, Search, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmptyState, ErrorState, PageHeading, Skeleton, useToast } from "../components/ui/states";
import { useBookmarks } from "../hooks/useGuestData";
import { useDuas, useSurahs, useVerse } from "../hooks/useQuran";
import { link } from "../lib/router";
import type { QuranBookmark } from "../services/guest/bookmarkStorage";

const STORAGE_FAILED = "Could not save. Browser storage is unavailable or full.";

/** Saved verses and duas. Only references are stored; text is fetched when a row is expanded. */
export default function Bookmarks({ initialTab }: { initialTab: string | null }) {
  const { t, i18n } = useTranslation();
  const notify = useToast();
  const [tab, setTab] = useState<"quran" | "duas">(initialTab === "duas" ? "duas" : "quran");
  const [filter, setFilter] = useState("");
  const bookmarks = useBookmarks();
  const surahs = useSurahs();
  const duas = useDuas();

  const name = (surah: number) => {
    const s = surahs.data?.find((item) => item.number === surah);
    return s ? (i18n.language === "en" ? s.englishName : s.arabicName) : `${t("Surah")} ${surah}`;
  };
  const term = filter.trim().toLowerCase();
  const verses = useMemo(
    () =>
      bookmarks.quran.filter((b) => {
        if (!term) return true;
        const s = surahs.data?.find((item) => item.number === b.surah);
        return `${b.surah}:${b.ayah} ${b.surah} ${s?.englishName ?? ""} ${s?.arabicName ?? ""} ${s?.englishMeaning ?? ""}`.toLowerCase().includes(term);
      }),
    [bookmarks.quran, surahs.data, term],
  );
  const savedDuas = useMemo(() => {
    const byId = new Map((duas.data ?? []).map((d) => [d.id, d]));
    return bookmarks.duas.map((b) => ({ bookmark: b, dua: byId.get(b.id) })).filter(({ bookmark, dua }) => !term || `${bookmark.id} ${dua?.title ?? ""} ${dua ? t(dua.title) : ""} ${dua?.category ?? ""}`.toLowerCase().includes(term));
  }, [bookmarks.duas, duas.data, term, t]);

  const report = (result: string) => notify(t(result === "removed" ? "Bookmark removed" : result === "added" ? "Bookmark saved" : STORAGE_FAILED));

  return (
    <div className="app-screen">
      <PageHeading eyebrow={t("SAVED IN THIS BROWSER")} title={t("Bookmarks")}>
        {t("Verses and duas you have saved. They stay on this device and are not synced.")}
      </PageHeading>

      <div className="tabs" role="tablist" aria-label={t("Bookmark types")}>
        <button type="button" role="tab" aria-selected={tab === "quran"} className={`chip ${tab === "quran" ? "selected" : ""}`} onClick={() => setTab("quran")}>
          {t("Quran verses")} ({bookmarks.quran.length})
        </button>
        <button type="button" role="tab" aria-selected={tab === "duas"} className={`chip ${tab === "duas" ? "selected" : ""}`} onClick={() => setTab("duas")}>
          {t("Duas")} ({bookmarks.duas.length})
        </button>
      </div>

      {(tab === "quran" ? bookmarks.quran.length : bookmarks.duas.length) > 0 && (
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <input type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={tab === "quran" ? t("Filter by surah name or reference") : t("Filter saved duas")} aria-label={t("Filter bookmarks")} />
          {filter && (
            <button type="button" className="icon-button" aria-label={t("Clear search")} onClick={() => setFilter("")}>
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </label>
      )}

      {tab === "quran" ? (
        !bookmarks.quran.length ? (
          <EmptyState
            title={t("No saved verses yet")}
            action={
              <a className="btn btn-sm" href={link("/quran")}>
                {t("Open Quran Explorer")}
              </a>
            }
          >
            {t("Use the bookmark button beside any verse in the reader to keep it here.")}
          </EmptyState>
        ) : !verses.length ? (
          <EmptyState title={t("No saved verse matches that filter")} />
        ) : (
          <ul className="bookmark-list">
            {verses.map((b) => (
              <VerseBookmarkRow key={`${b.surah}:${b.ayah}`} bookmark={b} name={name(b.surah)} onRemove={() => report(bookmarks.toggleVerse(b.surah, b.ayah))} />
            ))}
          </ul>
        )
      ) : !bookmarks.duas.length ? (
        <EmptyState
          title={t("No saved duas yet")}
          action={
            <a className="btn btn-sm" href={link("/duas")}>
              {t("Browse duas")}
            </a>
          }
        >
          {t("Save a dua from its page to find it here.")}
        </EmptyState>
      ) : duas.isError ? (
        <ErrorState error={duas.error} onRetry={() => duas.refetch()} />
      ) : !savedDuas.length ? (
        <EmptyState title={t("No saved dua matches that filter")} />
      ) : (
        <ul className="bookmark-list">
          {savedDuas.map(({ bookmark, dua }) => (
            <li key={bookmark.id} className="bookmark-row">
              <div className="bookmark-main">
                <a href={link(`/duas/${bookmark.id}`)}>
                  <strong>{dua ? t(dua.title) : t("Dua")}</strong>
                  <small>
                    {dua ? `${t(dua.category)} · ` : ""}
                    {t("Quran")} {bookmark.id.replace("-", ":")}
                  </small>
                </a>
                <div className="bookmark-actions">
                  <a className="chip" href={link(`/duas/${bookmark.id}`)}>
                    {t("Open")}
                  </a>
                  <button type="button" className="icon-button danger" aria-label={t("Remove bookmark")} onClick={() => report(bookmarks.toggleDua(bookmark.id))}>
                    <Trash2 size={17} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function VerseBookmarkRow({ bookmark, name, onRemove }: { bookmark: QuranBookmark; name: string; onRemove: () => void }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  // The verse is fetched from the provider only when someone asks to see it.
  const verse = useVerse(bookmark.surah, bookmark.ayah, open);
  const reference = `${bookmark.surah}:${bookmark.ayah}`;
  const language = i18n.language === "ur" ? "ur" : "en";
  return (
    <li className="bookmark-row">
      <div className="bookmark-main">
        <a href={link(`/quran/${bookmark.surah}?ayah=${bookmark.ayah}`)}>
          <strong>{name}</strong>
          <small>
            {t("Verse")} {reference}
          </small>
        </a>
        <div className="bookmark-actions">
          <button type="button" className="chip" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
            {open ? t("Hide verse") : t("Show verse")}
            <ChevronDown size={15} aria-hidden="true" className={open ? "turned" : ""} />
          </button>
          <a className="chip" href={link(`/quran/${bookmark.surah}?ayah=${bookmark.ayah}`)}>
            {t("Open")}
          </a>
          <button type="button" className="icon-button danger" aria-label={t("Remove bookmark {{reference}}", { reference })} onClick={onRemove}>
            <Trash2 size={17} aria-hidden="true" />
          </button>
        </div>
      </div>
      {open && (
        <div className="bookmark-preview">
          {verse.isPending ? (
            <div role="status">
              <span className="sr-only">{t("Loading…")}</span>
              <Skeleton lines={2} />
            </div>
          ) : verse.isError ? (
            <ErrorState error={verse.error} onRetry={() => verse.refetch()} />
          ) : (
            <>
              <p className="ayah-arabic notranslate" lang="ar" dir="rtl" translate="no">
                {verse.data.verse.arabic}
              </p>
              {i18n.language !== "ar" && verse.data.translations[language] && (
                <>
                  <p className="ayah-translation" lang={language} dir={language === "ur" ? "rtl" : "ltr"}>
                    {verse.data.translations[language].text}
                  </p>
                  <p className="ayah-credit">{verse.data.translations[language].edition.englishName}</p>
                </>
              )}
            </>
          )}
        </div>
      )}
    </li>
  );
}
