"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AudioPlayer } from "../components/quran/AudioPlayer";
import { AyahCard, type AyahAudioState } from "../components/quran/AyahCard";
import { QuranSettings } from "../components/quran/QuranSettings";
import { EmptyState, ErrorState, Skeleton, useToast } from "../components/ui/states";
import { useBookmarks, useGuestPreferences } from "../hooks/useGuestData";
import { useSurah, useSurahs, useTranslationEdition } from "../hooks/useQuran";
import { useQuranAudio } from "../hooks/useQuranAudio";
import { link, navigate } from "../lib/router";
import { parseSurahNumber } from "../lib/validation";
import { recordRecent, saveReadingProgress } from "../services/guest/readingProgressStorage";
import { RECITERS } from "../services/quran/audioService";
import { QURAN_PROVIDER } from "../services/quran/quranService";
import type { SurahContent, Verse } from "../services/quran/types";

const STORAGE_FAILED = "Could not save. Browser storage is unavailable or full.";

export default function SurahReader({ surahParam, ayahParam }: { surahParam: string | undefined; ayahParam: string | null }) {
  const { t } = useTranslation();
  const number = parseSurahNumber(surahParam);
  if (number === null) {
    return (
      <div className="app-screen">
        <EmptyState
          title={t("That surah does not exist")}
          action={
            <a className="btn btn-sm" href={link("/quran")}>
              {t("Back to all surahs")}
            </a>
          }
        >
          {t("Surah numbers run from 1 to 114.")}
        </EmptyState>
      </div>
    );
  }
  // Keyed so every surah starts with fresh scroll, audio and settings-panel state.
  return <Reader key={number} number={number} ayahParam={ayahParam} />;
}

function Reader({ number, ayahParam }: { number: number; ayahParam: string | null }) {
  const { t, i18n } = useTranslation();
  const notify = useToast();
  const { quran: settings } = useGuestPreferences();
  const translation = settings.showTranslation ? settings.translation : null;
  const surahQuery = useSurah(number, translation);
  const surahs = useSurahs();
  const edition = useTranslationEdition(settings.translation);
  const bookmarks = useBookmarks();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [jump, setJump] = useState("");
  const [highlight, setHighlight] = useState<number | null>(null);
  const list = useRef<HTMLOListElement>(null);
  const settled = useRef(false);

  // The last text that loaded stays on screen if a later request (e.g. another translation) fails.
  const [lastGood, setLastGood] = useState<SurahContent>();
  if (surahQuery.data && !surahQuery.isPlaceholderData && surahQuery.data !== lastGood) setLastGood(surahQuery.data);
  const content = surahQuery.data ?? lastGood;
  const verses = content?.verses;
  const count = content?.surah.ayahCount ?? 0;
  const requested = ayahParam && /^\d{1,3}$/.test(ayahParam) ? Number(ayahParam) : null;

  const scrollToAyah = useCallback((ayah: number, smooth = false) => {
    const element = list.current?.querySelector<HTMLElement>(`#ayah-${ayah}`);
    if (!element) return false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollIntoView({ block: "start", behavior: smooth && !reduced ? "smooth" : "instant" });
    return true;
  }, []);

  const audio = useQuranAudio(verses, {
    reciter: settings.reciter,
    autoAdvance: settings.autoAdvance,
    onAdvance: useCallback(
      (verse: Verse) => {
        scrollToAyah(verse.ayah, true);
        saveReadingProgress(verse.surah, verse.ayah);
      },
      [scrollToAyah],
    ),
  });

  useEffect(() => {
    recordRecent("surah", String(number));
  }, [number]);

  // Open at the requested ayah (bookmark, search result, Continue Reading) once the verses exist.
  const loaded = !!verses;
  useEffect(() => {
    if (!loaded) return;
    const target = requested ? Math.min(Math.max(requested, 1), count) : null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let jump: ReturnType<typeof setTimeout> | undefined;
    if (target && target > 1) {
      setHighlight(target);
      saveReadingProgress(number, target);
      // After the shell's scroll-to-top for the new route, which runs once this effect has.
      jump = setTimeout(() => scrollToAyah(target), 60);
      timer = setTimeout(() => setHighlight(null), 2600);
    }
    // Give the jump a moment to land before scroll tracking may overwrite the position.
    const settle = setTimeout(() => (settled.current = true), 700);
    return () => {
      clearTimeout(timer);
      clearTimeout(jump);
      clearTimeout(settle);
      settled.current = false;
    };
  }, [loaded, requested, count, number, scrollToAyah]);

  // Reading position: the first ayah below the docked header and player, saved after the
  // reader has rested there for a moment rather than on every scroll event.
  useEffect(() => {
    if (!loaded || !list.current || typeof IntersectionObserver === "undefined") return;
    const visible = new Set<number>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const ayah = Number((entry.target as HTMLElement).dataset.ayah);
          if (entry.isIntersecting) visible.add(ayah);
          else visible.delete(ayah);
        }
        clearTimeout(timer);
        timer = setTimeout(() => {
          if (settled.current && visible.size) saveReadingProgress(number, Math.min(...visible));
        }, 1500);
      },
      { rootMargin: "-230px 0px -40% 0px" },
    );
    list.current.querySelectorAll("li.ayah").forEach((item) => observer.observe(item));
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [loaded, number, count]);

  // Handlers read the latest audio state through a ref so their identity stays stable
  // and a status change does not re-render every ayah.
  const audioRef = useRef(audio);
  useEffect(() => {
    audioRef.current = audio;
  });
  const toggleAudio = useCallback((verse: Verse) => {
    const { currentAyah, status, pause, resume, play } = audioRef.current;
    if (currentAyah === verse.ayah && (status === "playing" || status === "loading")) pause();
    else if (currentAyah === verse.ayah && status === "paused") resume();
    else {
      play(verse);
      saveReadingProgress(verse.surah, verse.ayah);
    }
  }, []);

  const { toggleVerse } = bookmarks;
  const toggleBookmark = useCallback(
    (verse: Verse) => {
      const result = toggleVerse(verse.surah, verse.ayah);
      notify(t(result === "added" ? "Verse bookmarked" : result === "removed" ? "Bookmark removed" : STORAGE_FAILED));
    },
    [toggleVerse, notify, t],
  );

  const translationName = content?.translationEdition?.englishName ?? null;
  const copy = useCallback(
    (verse: Verse) => {
      const lines = [verse.arabic, verse.translation, `— Quran ${verse.surah}:${verse.ayah}${verse.translation && translationName ? ` (${translationName})` : ""} · ${QURAN_PROVIDER.name}`].filter(Boolean);
      if (!navigator.clipboard) return notify(t("Copying is not available in this browser."));
      navigator.clipboard.writeText(lines.join("\n\n")).then(
        () => notify(t("Verse copied")),
        () => notify(t("Copying is not available in this browser.")),
      );
    },
    [notify, t, translationName],
  );

  const bookmarked = useMemo(() => new Set(bookmarks.quran.filter((b) => b.surah === number).map((b) => b.ayah)), [bookmarks.quran, number]);
  const reciterName = RECITERS.find((r) => r.id === settings.reciter)?.name ?? "";
  const summary = content?.surah ?? surahs.data?.find((s) => s.number === number);
  const startAyah = requested && count ? Math.min(Math.max(requested, 1), count) : 1;

  return (
    <div className="app-screen reader-screen" data-width={settings.width} data-spacing={settings.spacing} style={{ "--arabic-size": `${settings.arabicSize}px`, "--translation-size": `${settings.translationSize}px` } as React.CSSProperties}>
      <nav className="reader-nav" aria-label={t("Reader navigation")}>
        <a className="text-button" href={link("/quran")}>
          <ArrowLeft size={17} aria-hidden="true" className="flip-rtl" />
          {t("All surahs")}
        </a>
        <div className="reader-nav-controls">
          <label>
            <span className="sr-only">{t("Select surah")}</span>
            <select value={number} onChange={(e) => navigate(`/quran/${e.target.value}`)} aria-label={t("Select surah")}>
              {surahs.data ? (
                surahs.data.map((s) => (
                  <option key={s.number} value={s.number}>
                    {s.number}. {i18n.language === "en" ? s.englishName : s.arabicName}
                  </option>
                ))
              ) : (
                <option value={number}>{number}</option>
              )}
            </select>
          </label>
          <form
            className="verse-jump"
            onSubmit={(e) => {
              e.preventDefault();
              const ayah = Number(jump);
              if (!Number.isInteger(ayah) || ayah < 1 || ayah > count) return notify(t("Enter a verse number from 1 to {{max}}", { max: count }));
              if (scrollToAyah(ayah, true)) {
                setHighlight(ayah);
                saveReadingProgress(number, ayah);
                setTimeout(() => setHighlight(null), 2600);
              }
            }}
          >
            <label>
              <span className="sr-only">{t("Go to verse")}</span>
              <input type="number" inputMode="numeric" min={1} max={count || undefined} value={jump} onChange={(e) => setJump(e.target.value)} placeholder={t("Verse")} aria-label={t("Go to verse")} disabled={!count} />
            </label>
            <button type="submit" className="chip" disabled={!count}>
              {t("Go")}
            </button>
          </form>
          <button type="button" className={`chip ${settingsOpen ? "selected" : ""}`} aria-expanded={settingsOpen} aria-controls="reader-settings" onClick={() => setSettingsOpen((open) => !open)}>
            <Settings2 size={16} aria-hidden="true" />
            {t("Reader settings")}
          </button>
        </div>
      </nav>

      {settingsOpen && (
        <section id="reader-settings" className="settings-panel" aria-label={t("Reader settings")}>
          <QuranSettings />
        </section>
      )}

      <header className="surah-heading">
        {summary ? (
          <>
            <span className="eyebrow">
              {t("Surah")} {summary.number} · {t(summary.revelation)} · {t("{{n}} verses", { n: summary.ayahCount })}
            </span>
            <h1 className="notranslate" lang="ar" dir="rtl" translate="no">
              {summary.arabicName}
            </h1>
            <p>
              <strong>{summary.englishName}</strong>
              {i18n.language === "en" && ` · ${summary.englishMeaning}`}
            </p>
          </>
        ) : (
          <Skeleton lines={2} />
        )}
      </header>

      {edition.data === null && settings.showTranslation && (
        <p className="notice" role="status">
          {t("This translation edition is no longer listed by the provider. Choose another translation in the reader settings.")}
        </p>
      )}

      {surahQuery.isPending && !content ? (
        <div role="status" className="reader-loading">
          <span className="sr-only">{t("Loading verses…")}</span>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} lines={3} />
          ))}
        </div>
      ) : surahQuery.isError && !content ? (
        <ErrorState error={surahQuery.error} onRetry={() => surahQuery.refetch()} title={t("This surah could not be loaded")} />
      ) : content && verses ? (
        <>
          <AudioPlayer
            status={audio.status}
            currentAyah={audio.currentAyah}
            ayahCount={count}
            reciterName={reciterName}
            error={audio.error}
            startAyah={startAyah}
            onPause={audio.pause}
            onResume={audio.resume}
            onStop={audio.stop}
            onPlayAyah={(ayah) => {
              const verse = verses.find((v) => v.ayah === ayah);
              if (verse) {
                audio.play(verse);
                scrollToAyah(ayah, true);
                saveReadingProgress(number, ayah);
              }
            }}
          />
          {surahQuery.isError && (
            <p className="notice" role="alert">
              {t("The selected translation could not be loaded. Showing the previous text.")}{" "}
              <button type="button" className="inline-link" onClick={() => surahQuery.refetch()}>
                {t("Try again")}
              </button>
            </p>
          )}
          <p className="fine-print reader-credit">
            {t("Arabic")}: {content.arabicEdition.englishName}
            {content.translationEdition && ` · ${t("Translation")}: ${content.translationEdition.englishName}`} · {QURAN_PROVIDER.name}
          </p>
          <ol className="ayah-list" ref={list} aria-busy={surahQuery.isFetching} data-fetching={surahQuery.isPlaceholderData || undefined}>
            {verses.map((verse) => (
              <AyahCard
                key={verse.ayah}
                verse={verse}
                translationLanguage={content.translationEdition?.language ?? "en"}
                translationCredit={translationName}
                bookmarked={bookmarked.has(verse.ayah)}
                highlighted={highlight === verse.ayah}
                audio={audio.currentAyah === verse.ayah ? (audio.status as AyahAudioState) : "idle"}
                onToggleAudio={toggleAudio}
                onToggleBookmark={toggleBookmark}
                onCopy={copy}
              />
            ))}
          </ol>
        </>
      ) : null}

      <nav className="surah-pager" aria-label={t("Surah navigation")}>
        {number > 1 ? (
          <a className="btn secondary" href={link(`/quran/${number - 1}`)}>
            <ArrowLeft size={17} aria-hidden="true" className="flip-rtl" />
            {t("Previous surah")}
          </a>
        ) : (
          <span />
        )}
        <a className="text-button" href={link("/quran")}>
          {t("All surahs")}
        </a>
        {number < 114 ? (
          <a className="btn" href={link(`/quran/${number + 1}`)}>
            {t("Next surah")}
            <ArrowRight size={17} aria-hidden="true" className="flip-rtl" />
          </a>
        ) : (
          <span />
        )}
      </nav>
      <p className="content-credit">
        {t("Quran text, translations and audio")}:{" "}
        <a href={QURAN_PROVIDER.url} target="_blank" rel="noreferrer">
          {QURAN_PROVIDER.name} ↗
        </a>{" "}
        ·{" "}
        <a href={QURAN_PROVIDER.terms} target="_blank" rel="noreferrer">
          {t("Terms of use")} ↗
        </a>
      </p>
    </div>
  );
}
