"use client";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Bookmark, BookOpen, Copy, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmptyState, ErrorState, PageHeading, Skeleton, useToast } from "../components/ui/states";
import { useBookmarks } from "../hooks/useGuestData";
import { useDuas } from "../hooks/useQuran";
import { link } from "../lib/router";
import { DUA_SOURCE, duaCategories, filterDuas, withoutFootnoteMarks, type Dua } from "../services/duas/duaService";
import { recordRecent } from "../services/guest/readingProgressStorage";
import { useEffect } from "react";

const STORAGE_FAILED = "Could not save. Browser storage is unavailable or full.";

/** Translation shown for a dua in the current interface language (Arabic interface: Arabic only). */
function meaning(dua: Dua, language: string) {
  return language === "ur" ? { text: dua.ur, notes: dua.urNotes, lang: "ur", credit: DUA_SOURCE.urdu } : language === "ar" ? null : { text: dua.en, notes: dua.enNotes, lang: "en", credit: DUA_SOURCE.english };
}

export function DuaCard({ dua, saved, onToggle }: { dua: Dua; saved: boolean; onToggle: () => void }) {
  const { t, i18n } = useTranslation();
  const translation = meaning(dua, i18n.language);
  return (
    <li className="dua-card">
      <div className="dua-card-head">
        <span className="pill">{t(dua.category)}</span>
        <button type="button" className="icon-button" aria-pressed={saved} aria-label={saved ? t("Remove {{title}} from bookmarks", { title: t(dua.title) }) : t("Bookmark {{title}}", { title: t(dua.title) })} onClick={onToggle}>
          <Bookmark size={18} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
        </button>
      </div>
      <a href={link(`/duas/${dua.id}`)} className="dua-card-link">
        <h3>{t(dua.title)}</h3>
        <p className="dua-arabic notranslate" lang="ar" dir="rtl" translate="no">
          {dua.arabic}
        </p>
        {translation && (
          <p className="dua-excerpt" lang={translation.lang} dir={translation.lang === "ur" ? "rtl" : "ltr"}>
            {withoutFootnoteMarks(translation.text)}
          </p>
        )}
        <small>
          {t("Quran")} {dua.surah}:{dua.ayah}
        </small>
      </a>
    </li>
  );
}

export default function Duas() {
  const { t } = useTranslation();
  const notify = useToast();
  const duas = useDuas();
  const bookmarks = useBookmarks();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [savedOnly, setSavedOnly] = useState(false);

  const categories = useMemo(() => (duas.data ? duaCategories(duas.data) : []), [duas.data]);
  const visible = useMemo(() => {
    if (!duas.data) return [];
    const list = filterDuas(duas.data, { query, category, translate: t });
    return savedOnly ? list.filter((d) => bookmarks.duas.some((b) => b.id === d.id)) : list;
  }, [duas.data, query, category, savedOnly, bookmarks.duas, t]);

  const toggle = (dua: Dua) => {
    const result = bookmarks.toggleDua(dua.id);
    notify(t(result === "added" ? "Dua bookmarked" : result === "removed" ? "Bookmark removed" : STORAGE_FAILED));
  };

  return (
    <div className="app-screen">
      <PageHeading
        eyebrow={t("DAILY DUAS")}
        title={t("Supplications from the Quran")}
        aside={
          <a className="btn secondary btn-sm" href={link("/hadith")}>
            <BookOpen size={15} aria-hidden="true" />
            {t("Hadith collection")}
          </a>
        }
      >
        {t("A small, verified collection: every dua here is a complete Quran verse, shown with its reference and translation source.")}
      </PageHeading>

      <div className="search-row">
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setQuery("")} placeholder={t("Search by title, meaning, or reference")} aria-label={t("Search duas")} autoComplete="off" />
          {query && (
            <button type="button" className="icon-button" aria-label={t("Clear search")} onClick={() => setQuery("")}>
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </label>
        <button type="button" className={`chip ${savedOnly ? "selected" : ""}`} aria-pressed={savedOnly} onClick={() => setSavedOnly((value) => !value)}>
          <Bookmark size={15} aria-hidden="true" />
          {t("Saved")} ({bookmarks.duas.length})
        </button>
      </div>

      {duas.isPending ? (
        <div role="status">
          <span className="sr-only">{t("Loading duas…")}</span>
          <Skeleton lines={6} />
        </div>
      ) : duas.isError ? (
        <ErrorState error={duas.error} onRetry={() => duas.refetch()} title={t("The dua collection could not be loaded")} />
      ) : (
        <>
          <div className="chip-row" role="group" aria-label={t("Filter by category")}>
            {["All", ...categories].map((item) => (
              <button key={item} type="button" className={`chip ${category === item ? "selected" : ""}`} aria-pressed={category === item} onClick={() => setCategory(item)}>
                {t(item)}
              </button>
            ))}
          </div>
          {visible.length ? (
            <>
              <p className="fine-print" aria-live="polite">
                {t("Showing {{shown}} of {{total}} duas", { shown: visible.length, total: duas.data.length })}
              </p>
              <ul className="dua-grid">
                {visible.map((dua) => (
                  <DuaCard key={dua.id} dua={dua} saved={bookmarks.isDuaBookmarked(dua.id)} onToggle={() => toggle(dua)} />
                ))}
              </ul>
            </>
          ) : (
            <EmptyState
              title={savedOnly && !bookmarks.duas.length ? t("No saved duas yet") : t("No dua matches your search")}
              action={
                <button type="button" className="btn secondary btn-sm" onClick={() => { setQuery(""); setCategory("All"); setSavedOnly(false); }}>
                  {t("Show all duas")}
                </button>
              }
            />
          )}
        </>
      )}
      <DuaCredit />
    </div>
  );
}

function DuaCredit() {
  const { t } = useTranslation();
  return (
    <p className="content-credit">
      {t("Text and translations")}:{" "}
      <a href={DUA_SOURCE.url} target="_blank" rel="noreferrer">
        {DUA_SOURCE.name} ↗
      </a>{" "}
      · {t("English")}: {DUA_SOURCE.english} · {t("Urdu")}: {DUA_SOURCE.urdu}. {t("Each verse is checked against the source snapshot retrieved on {{date}}.", { date: DUA_SOURCE.retrieved })}
    </p>
  );
}

export function DuaDetails({ id }: { id: string | undefined }) {
  const { t, i18n } = useTranslation();
  const notify = useToast();
  const duas = useDuas();
  const bookmarks = useBookmarks();
  const index = duas.data?.findIndex((d) => d.id === id) ?? -1;
  const dua = index >= 0 ? duas.data![index] : null;

  useEffect(() => {
    if (dua) recordRecent("dua", dua.id);
  }, [dua]);

  if (duas.isPending) {
    return (
      <div className="app-screen" role="status">
        <span className="sr-only">{t("Loading duas…")}</span>
        <Skeleton lines={6} />
      </div>
    );
  }
  if (duas.isError) {
    return (
      <div className="app-screen">
        <ErrorState error={duas.error} onRetry={() => duas.refetch()} title={t("The dua collection could not be loaded")} />
      </div>
    );
  }
  if (!dua) {
    return (
      <div className="app-screen">
        <EmptyState
          title={t("That dua is not in this collection")}
          action={
            <a className="btn btn-sm" href={link("/duas")}>
              {t("Browse duas")}
            </a>
          }
        />
      </div>
    );
  }

  const translation = meaning(dua, i18n.language);
  const saved = bookmarks.isDuaBookmarked(dua.id);
  const previous = duas.data![index - 1];
  const next = duas.data![index + 1];
  const copy = () => {
    const text = [dua.arabic, translation ? withoutFootnoteMarks(translation.text) : null, `— Quran ${dua.surah}:${dua.ayah}${translation ? ` (${translation.credit})` : ""} · ${DUA_SOURCE.name}`].filter(Boolean).join("\n\n");
    if (!navigator.clipboard) return notify(t("Copying is not available in this browser."));
    navigator.clipboard.writeText(text).then(
      () => notify(t("Dua copied")),
      () => notify(t("Copying is not available in this browser.")),
    );
  };

  return (
    <div className="app-screen dua-details">
      <a className="text-button" href={link("/duas")}>
        <ArrowLeft size={17} aria-hidden="true" className="flip-rtl" />
        {t("All duas")}
      </a>
      <article className="panel dua-article">
        <div className="dua-card-head">
          <span className="pill">{t(dua.category)}</span>
          <div className="ayah-actions">
            <button type="button" className="icon-button" aria-label={t("Copy dua")} onClick={copy}>
              <Copy size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="icon-button"
              aria-pressed={saved}
              aria-label={saved ? t("Remove bookmark") : t("Bookmark this dua")}
              onClick={() => {
                const result = bookmarks.toggleDua(dua.id);
                notify(t(result === "added" ? "Dua bookmarked" : result === "removed" ? "Bookmark removed" : STORAGE_FAILED));
              }}
            >
              <Bookmark size={18} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
            </button>
          </div>
        </div>
        <h1>{t(dua.title)}</h1>
        <p className="dua-arabic full notranslate" lang="ar" dir="rtl" translate="no">
          {dua.arabic}
        </p>
        {translation && (
          <>
            <p className="dua-translation" lang={translation.lang} dir={translation.lang === "ur" ? "rtl" : "ltr"}>
              {translation.text}
            </p>
            {translation.notes && (
              <details className="footnotes">
                <summary>{t("Translator’s footnotes")}</summary>
                <p lang={translation.lang} dir={translation.lang === "ur" ? "rtl" : "ltr"}>
                  {translation.notes}
                </p>
              </details>
            )}
          </>
        )}
        <dl className="dua-source">
          <div>
            <dt>{t("Source")}</dt>
            <dd>
              {t("Quran")} {dua.surah}:{dua.ayah}
            </dd>
          </div>
          {translation && (
            <div>
              <dt>{t("Translation")}</dt>
              <dd>{translation.credit}</dd>
            </div>
          )}
          <div>
            <dt>{t("Review")}</dt>
            <dd>{t("Quran verse, checked word for word against the QuranEnc source text.")}</dd>
          </div>
        </dl>
        <a className="btn secondary btn-sm" href={link(`/quran/${dua.surah}?ayah=${dua.ayah}`)}>
          <BookOpen size={15} aria-hidden="true" />
          {t("Read in context")}
        </a>
      </article>
      <nav className="surah-pager" aria-label={t("Dua navigation")}>
        {previous ? (
          <a className="btn secondary" href={link(`/duas/${previous.id}`)}>
            <ArrowLeft size={17} aria-hidden="true" className="flip-rtl" />
            {t("Previous dua")}
          </a>
        ) : (
          <span />
        )}
        {next ? (
          <a className="btn" href={link(`/duas/${next.id}`)}>
            {t("Next dua")}
            <ArrowRight size={17} aria-hidden="true" className="flip-rtl" />
          </a>
        ) : (
          <span />
        )}
      </nav>
      <DuaCredit />
    </div>
  );
}
