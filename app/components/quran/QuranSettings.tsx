"use client";
import { RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useGuestPreferences } from "../../hooks/useGuestData";
import { ARABIC_SIZE, TRANSLATION_SIZE, resetQuranPreferences, updateQuranPreferences, type QuranPreferences } from "../../services/guest/preferencesStorage";
import { RECITERS } from "../../services/quran/audioService";
import { TRANSLATION_LABELS } from "../../services/quran/translationService";
import { useToast } from "../ui/states";

/** Reader settings. Each control writes straight to the saved guest preferences. */
export function QuranSettings() {
  const { t } = useTranslation();
  const notify = useToast();
  const { quran } = useGuestPreferences();
  const change = (patch: Partial<QuranPreferences>) => {
    if (!updateQuranPreferences(patch)) notify(t("Could not save. Browser storage is unavailable or full."));
  };
  return (
    <div className="settings-grid">
      <label>
        <span>{t("Translation")}</span>
        <select value={quran.translation} onChange={(e) => change({ translation: e.target.value as QuranPreferences["translation"], showTranslation: true })}>
          {(Object.keys(TRANSLATION_LABELS) as (keyof typeof TRANSLATION_LABELS)[]).map((language) => (
            <option key={language} value={language}>
              {TRANSLATION_LABELS[language]}
            </option>
          ))}
        </select>
      </label>
      <label className="check">
        <input type="checkbox" checked={quran.showTranslation} onChange={(e) => change({ showTranslation: e.target.checked })} />
        <span>{t("Show translation")}</span>
      </label>
      <label>
        <span>
          {t("Arabic text size")} <b>{quran.arabicSize}</b>
        </span>
        <input type="range" min={ARABIC_SIZE.min} max={ARABIC_SIZE.max} step={2} value={quran.arabicSize} onChange={(e) => change({ arabicSize: Number(e.target.value) })} />
      </label>
      <label>
        <span>
          {t("Translation text size")} <b>{quran.translationSize}</b>
        </span>
        <input type="range" min={TRANSLATION_SIZE.min} max={TRANSLATION_SIZE.max} step={1} value={quran.translationSize} onChange={(e) => change({ translationSize: Number(e.target.value) })} />
      </label>
      <label>
        <span>{t("Reading width")}</span>
        <select value={quran.width} onChange={(e) => change({ width: e.target.value as QuranPreferences["width"] })}>
          <option value="comfortable">{t("Comfortable")}</option>
          <option value="wide">{t("Wide")}</option>
        </select>
      </label>
      <label>
        <span>{t("Verse spacing")}</span>
        <select value={quran.spacing} onChange={(e) => change({ spacing: e.target.value as QuranPreferences["spacing"] })}>
          <option value="compact">{t("Compact")}</option>
          <option value="normal">{t("Normal")}</option>
          <option value="relaxed">{t("Relaxed")}</option>
        </select>
      </label>
      <label>
        <span>{t("Reciter")}</span>
        <select value={quran.reciter} onChange={(e) => change({ reciter: e.target.value as QuranPreferences["reciter"] })}>
          {RECITERS.map((reciter) => (
            <option key={reciter.id} value={reciter.id}>
              {t(reciter.name)}
            </option>
          ))}
        </select>
      </label>
      <label className="check">
        <input type="checkbox" checked={quran.autoAdvance} onChange={(e) => change({ autoAdvance: e.target.checked })} />
        <span>{t("Continue to the next verse automatically")}</span>
      </label>
      <button
        type="button"
        className="btn secondary btn-sm settings-reset"
        onClick={() => {
          notify(t(resetQuranPreferences() ? "Reader settings reset" : "Could not save. Browser storage is unavailable or full."));
        }}
      >
        <RotateCcw size={15} aria-hidden="true" />
        {t("Reset reader settings")}
      </button>
    </div>
  );
}
