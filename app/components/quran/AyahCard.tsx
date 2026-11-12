"use client";
import { memo } from "react";
import { Bookmark, Copy, Loader2, Pause, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Verse } from "../../services/quran/types";

export type AyahAudioState = "idle" | "loading" | "playing" | "paused" | "error";

type Props = {
  verse: Verse;
  translationLanguage: string;
  translationCredit: string | null;
  bookmarked: boolean;
  highlighted: boolean;
  audio: AyahAudioState;
  onToggleAudio: (verse: Verse) => void;
  onToggleBookmark: (verse: Verse) => void;
  onCopy: (verse: Verse) => void;
};

/** A single ayah: Arabic, optional translation with its credit, and verse-level actions. */
export const AyahCard = memo(function AyahCard({ verse, translationLanguage, translationCredit, bookmarked, highlighted, audio, onToggleAudio, onToggleBookmark, onCopy }: Props) {
  const { t } = useTranslation();
  const reference = `${verse.surah}:${verse.ayah}`;
  const active = audio !== "idle";
  return (
    <li id={`ayah-${verse.ayah}`} className="ayah" data-ayah={verse.ayah} data-active={active || undefined} data-highlighted={highlighted || undefined}>
      <div className="ayah-bar">
        <span className="ayah-ref">{reference}</span>
        <div className="ayah-actions">
          <button type="button" className="icon-button" aria-label={audio === "playing" || audio === "loading" ? t("Pause verse {{n}}", { n: verse.ayah }) : t("Play verse {{n}}", { n: verse.ayah })} aria-pressed={audio === "playing"} onClick={() => onToggleAudio(verse)}>
            {audio === "loading" ? <Loader2 size={18} className="spin" aria-hidden="true" /> : audio === "playing" ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
          </button>
          <button type="button" className="icon-button" aria-label={bookmarked ? t("Remove bookmark for verse {{n}}", { n: verse.ayah }) : t("Bookmark verse {{n}}", { n: verse.ayah })} aria-pressed={bookmarked} onClick={() => onToggleBookmark(verse)}>
            <Bookmark size={18} fill={bookmarked ? "currentColor" : "none"} aria-hidden="true" />
          </button>
          <button type="button" className="icon-button" aria-label={t("Copy verse {{n}}", { n: verse.ayah })} onClick={() => onCopy(verse)}>
            <Copy size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
      {/* translate="no" asks browser translators to leave the Quran text untouched. */}
      <p className="ayah-arabic notranslate" lang="ar" dir="rtl" translate="no">
        {verse.arabic}
      </p>
      {verse.translation !== null && (
        <>
          <p className="ayah-translation" lang={translationLanguage} dir={translationLanguage === "ur" ? "rtl" : "ltr"}>
            {verse.translation}
          </p>
          {translationCredit && <p className="ayah-credit">{translationCredit}</p>}
        </>
      )}
    </li>
  );
});
