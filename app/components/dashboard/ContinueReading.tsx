"use client";
import { BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useReadingProgress } from "../../hooks/useGuestData";
import { useSurahs } from "../../hooks/useQuran";
import { link } from "../../lib/router";

/** Resume card backed by the saved reading position. Renders a prompt when there is none. */
export function ContinueReading({ showEmpty = true }: { showEmpty?: boolean }) {
  const { t, i18n } = useTranslation();
  const progress = useReadingProgress();
  const surahs = useSurahs();
  if (!progress) {
    if (!showEmpty) return null;
    return (
      <section className="widget continue-reading" aria-label={t("Continue reading")}>
        <span className="widget-icon turquoise" aria-hidden="true">
          <BookOpen size={20} />
        </span>
        <div>
          <h2>{t("Continue reading")}</h2>
          <p>{t("Your reading position will appear here once you open a surah.")}</p>
        </div>
        <a className="btn secondary btn-sm" href={link("/quran")}>
          {t("Open Quran Explorer")}
        </a>
      </section>
    );
  }
  const surah = surahs.data?.find((s) => s.number === progress.surah);
  const name = surah ? (i18n.language === "en" ? surah.englishName : surah.arabicName) : `${t("Surah")} ${progress.surah}`;
  const saved = new Date(progress.updatedAt);
  return (
    <section className="widget continue-reading" aria-label={t("Continue reading")}>
      <span className="widget-icon turquoise" aria-hidden="true">
        <BookOpen size={20} />
      </span>
      <div>
        <h2>{t("Continue reading")}</h2>
        <p>
          <strong lang={surah && i18n.language !== "en" ? "ar" : undefined}>{name}</strong> · {t("Verse")} {progress.surah}:{progress.ayah}
          {!Number.isNaN(saved.getTime()) && <small> · {t("Saved {{date}}", { date: saved.toLocaleDateString(i18n.language === "en" ? "en-GB" : `${i18n.language}-u-nu-latn`, { day: "numeric", month: "short" }) })}</small>}
        </p>
      </div>
      <a className="btn btn-sm" href={link(`/quran/${progress.surah}?ayah=${progress.ayah}`)} data-testid="continue-reading">
        {t("Continue")}
      </a>
    </section>
  );
}
