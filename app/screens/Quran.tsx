"use client";
import { useMemo, useState } from "react";
import { Bookmark, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ContinueReading } from "../components/dashboard/ContinueReading";
import { SurahCard, SurahCardSkeleton } from "../components/quran/SurahCard";
import { EmptyState, ErrorState, PageHeading, Skeleton } from "../components/ui/states";
import { useBookmarks } from "../hooks/useGuestData";
import { MIN_SEARCH_LENGTH, useJuzStarts, useSurahs, useVerseSearch } from "../hooks/useQuran";
import { link } from "../lib/router";
import { parseVerseReference } from "../lib/validation";
import { QURAN_PROVIDER, SEARCH_RESULT_LIMIT } from "../services/quran/quranService";
import { SEARCH_SCOPES, type SearchScope } from "../services/quran/translationService";
import type { SurahSummary } from "../services/quran/types";

// Lets "al fatiha", "alfatiha" and "الفاتحة" all find سُورَةُ ٱلْفَاتِحَةِ / Al-Faatiha.
const fold = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, "")
    .replace(/[ٱأإآ]/g, "ا")
    .replace(/[^a-z0-9\u0600-\u06FF]/g, "");

export function filterSurahs(surahs: SurahSummary[], query: string, revelation: "All" | "Meccan" | "Medinan") {
  const raw = query.trim();
  const term = fold(raw);
  return surahs.filter((s) => {
    if (revelation !== "All" && s.revelation !== revelation) return false;
    if (!term) return true;
    if (/^\d+$/.test(raw)) return String(s.number).startsWith(String(Number(raw)));
    return fold(s.englishName).includes(term) || fold(s.englishMeaning).includes(term) || fold(s.arabicName).includes(term);
  });
}

type Tab = "surahs" | "juz" | "search";

export default function Quran() {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<Tab>("surahs");
  const [query, setQuery] = useState("");
  const [revelation, setRevelation] = useState<"All" | "Meccan" | "Medinan">("All");
  const surahs = useSurahs();
  const bookmarks = useBookmarks();
  const visible = useMemo(() => (surahs.data ? filterSurahs(surahs.data, query, revelation) : []), [surahs.data, query, revelation]);

  // "2:255" in the search box is a direct jump, once the surah list can confirm it exists.
  const reference = parseVerseReference(query);
  const referenceSurah = reference && surahs.data?.find((s) => s.number === reference.surah);
  const validReference = reference && referenceSurah && reference.ayah <= referenceSurah.ayahCount ? reference : null;

  const tabs: { id: Tab; label: string }[] = [
    { id: "surahs", label: t("Surahs") },
    { id: "juz", label: t("Juz") },
    { id: "search", label: t("Search verses") },
  ];

  return (
    <div className="app-screen">
      <PageHeading
        eyebrow={t("THE NOBLE QURAN")}
        title={t("Quran Explorer")}
        aside={
          <a className="btn secondary btn-sm" href={link("/bookmarks")}>
            <Bookmark size={15} aria-hidden="true" />
            {t("Bookmarks")} ({bookmarks.quran.length})
          </a>
        }
      >
        {t("All 114 surahs in Arabic with English and Urdu translations, verse audio, bookmarks, and your saved reading position.")}
      </PageHeading>

      <ContinueReading showEmpty={false} />

      <div className="tabs" role="tablist" aria-label={t("Quran Explorer sections")}>
        {tabs.map((item) => (
          <button key={item.id} type="button" role="tab" id={`tab-${item.id}`} aria-selected={tab === item.id} aria-controls={`panel-${item.id}`} className={`chip ${tab === item.id ? "selected" : ""}`} onClick={() => setTab(item.id)}>
            {item.label}
          </button>
        ))}
      </div>

      {tab === "surahs" && (
        <section role="tabpanel" id="panel-surahs" aria-labelledby="tab-surahs">
          <div className="search-row">
            <label className="search-field">
              <Search size={18} aria-hidden="true" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setQuery("")} placeholder={t("Search by name, number, or verse (2:255)")} aria-label={t("Search surahs")} autoComplete="off" />
              {query && (
                <button type="button" className="icon-button" aria-label={t("Clear search")} onClick={() => setQuery("")}>
                  <X size={16} aria-hidden="true" />
                </button>
              )}
            </label>
            <div className="chip-row" role="group" aria-label={t("Filter by revelation")}>
              {(["All", "Meccan", "Medinan"] as const).map((option) => (
                <button key={option} type="button" className={`chip ${revelation === option ? "selected" : ""}`} aria-pressed={revelation === option} onClick={() => setRevelation(option)}>
                  {t(option)}
                </button>
              ))}
            </div>
          </div>

          {validReference && (
            <a className="jump-card" href={link(`/quran/${validReference.surah}?ayah=${validReference.ayah}`)}>
              {t("Go to verse {{reference}}", { reference: `${validReference.surah}:${validReference.ayah}` })} · {i18n.language === "en" ? referenceSurah!.englishName : <span lang="ar">{referenceSurah!.arabicName}</span>}
            </a>
          )}

          {surahs.isPending ? (
            <div className="surah-tiles" role="status">
              <span className="sr-only">{t("Loading surahs…")}</span>
              {Array.from({ length: 12 }, (_, i) => (
                <SurahCardSkeleton key={i} />
              ))}
            </div>
          ) : surahs.isError ? (
            <ErrorState error={surahs.error} onRetry={() => surahs.refetch()} title={t("The surah list could not be loaded")} />
          ) : visible.length ? (
            <>
              <p className="fine-print" aria-live="polite">
                {t("Showing {{shown}} of {{total}} surahs", { shown: visible.length, total: surahs.data.length })}
              </p>
              <div className="surah-tiles">
                {visible.map((s) => (
                  <SurahCard key={s.number} surah={s} />
                ))}
              </div>
            </>
          ) : (
            !validReference && (
              <EmptyState
                title={t("No surah matches your search")}
                action={
                  <button type="button" className="btn secondary btn-sm" onClick={() => { setQuery(""); setRevelation("All"); }}>
                    {t("Clear search")}
                  </button>
                }
              >
                {t("Try a surah name, a number from 1 to 114, or a verse reference such as 2:255.")}
              </EmptyState>
            )
          )}
        </section>
      )}

      {tab === "juz" && <JuzPanel />}
      {tab === "search" && <VerseSearchPanel />}

      <p className="content-credit">
        {t("Quran text, translations and audio")}:{" "}
        <a href={QURAN_PROVIDER.url} target="_blank" rel="noreferrer">
          {QURAN_PROVIDER.name} ↗
        </a>
      </p>
    </div>
  );
}

function JuzPanel() {
  const { t } = useTranslation();
  const juz = useJuzStarts();
  return (
    <section role="tabpanel" id="panel-juz" aria-labelledby="tab-juz">
      {juz.isPending ? (
        <div role="status">
          <span className="sr-only">{t("Loading…")}</span>
          <Skeleton lines={4} />
        </div>
      ) : juz.isError ? (
        <ErrorState error={juz.error} onRetry={() => juz.refetch()} />
      ) : (
        <div className="juz-grid">
          {juz.data.map((j) => (
            <a key={j.juz} className="juz-tile" href={link(`/quran/${j.surah}?ayah=${j.ayah}`)}>
              <strong>
                {t("Juz")} {j.juz}
              </strong>
              <small>
                {t("Starts at")} {j.surah}:{j.ayah}
              </small>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

function VerseSearchPanel() {
  const { t, i18n } = useTranslation();
  const [keyword, setKeyword] = useState("");
  const [scope, setScope] = useState<SearchScope>(i18n.language === "ur" ? "ur" : i18n.language === "ar" ? "ar" : "en");
  const search = useVerseSearch(keyword, scope);
  const rtl = scope !== "en";
  const tooShort = keyword.trim().length < MIN_SEARCH_LENGTH;
  return (
    <section role="tabpanel" id="panel-search" aria-labelledby="tab-search">
      <div className="search-row">
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <input type="search" value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setKeyword("")} placeholder={t("Search for a word or phrase")} aria-label={t("Search verses")} autoComplete="off" />
          {keyword && (
            <button type="button" className="icon-button" aria-label={t("Clear search")} onClick={() => setKeyword("")}>
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </label>
        <label className="scope-select">
          <span className="sr-only">{t("Search in")}</span>
          <select value={scope} onChange={(e) => setScope(e.target.value as SearchScope)} aria-label={t("Search in")}>
            {(Object.keys(SEARCH_SCOPES) as SearchScope[]).map((key) => (
              <option key={key} value={key}>
                {t(SEARCH_SCOPES[key].label)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="fine-print">{t("Finds verses that contain the exact word or phrase in the selected text. This is keyword matching, not meaning-based search.")}</p>

      {tooShort ? (
        <EmptyState title={t("Type at least 3 characters")}>{t("Results appear as you type.")}</EmptyState>
      ) : search.isError ? (
        <ErrorState error={search.error} onRetry={() => search.refetch()} title={t("Search could not be completed")} />
      ) : search.pending || search.isPending ? (
        <div role="status">
          <span className="sr-only">{t("Searching…")}</span>
          <Skeleton lines={4} />
        </div>
      ) : search.data && search.data.matches.length ? (
        <>
          <p className="fine-print" aria-live="polite">
            {search.data.total > search.data.matches.length ? t("Showing the first {{shown}} of {{total}} matches", { shown: SEARCH_RESULT_LIMIT, total: search.data.total }) : t("{{total}} matches", { total: search.data.total })}
          </p>
          <ul className="result-list" data-fetching={search.isFetching || undefined}>
            {search.data.matches.map((m) => (
              <li key={`${m.surah}:${m.ayah}`}>
                <a href={link(`/quran/${m.surah}?ayah=${m.ayah}`)}>
                  <span className="ayah-ref">
                    {m.surah}:{m.ayah}
                  </span>
                  <span className={scope === "ar" ? "result-text notranslate" : "result-text"} lang={scope} dir={rtl ? "rtl" : "ltr"} translate={scope === "ar" ? "no" : undefined}>
                    {m.text}
                  </span>
                  <small>{i18n.language === "en" ? m.surahName : <span lang="ar">{m.surahArabicName}</span>}</small>
                </a>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <EmptyState title={t("No verses contain that text")}>{t("Check the spelling, try a shorter word, or search a different text.")}</EmptyState>
      )}
    </section>
  );
}
