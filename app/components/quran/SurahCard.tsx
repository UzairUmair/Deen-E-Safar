"use client";
import { useTranslation } from "react-i18next";
import { link } from "../../lib/router";
import type { SurahSummary } from "../../services/quran/types";

/** One surah in the directory. The whole card is a link to its reader. */
export function SurahCard({ surah }: { surah: SurahSummary }) {
  const { t, i18n } = useTranslation();
  return (
    <a className="surah-tile" href={link(`/quran/${surah.number}`)} data-surah={surah.number}>
      <span className="surah-number">{surah.number}</span>
      <span className="surah-tile-main">
        <strong>{surah.englishName}</strong>
        <small>
          {/* The provider publishes name meanings in English only. */}
          {i18n.language === "en" && `${surah.englishMeaning} · `}
          {t("{{n}} verses", { n: surah.ayahCount })} · {t(surah.revelation)}
        </small>
      </span>
      <span className="surah-tile-arabic notranslate" lang="ar" dir="rtl" translate="no">
        {surah.arabicName}
      </span>
    </a>
  );
}

export function SurahCardSkeleton() {
  return (
    <div className="surah-tile skeleton-tile" aria-hidden="true">
      <span className="surah-number" />
      <span className="surah-tile-main">
        <i />
        <i />
      </span>
    </div>
  );
}
