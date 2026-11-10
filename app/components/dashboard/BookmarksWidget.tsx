"use client";
import { useTranslation } from "react-i18next";
import { useBookmarks, useRecentContent } from "../../hooks/useGuestData";
import { useDuas, useSurahs } from "../../hooks/useQuran";
import { link } from "../../lib/router";

const SHOWN = 4;

/** The most recent saved verses and duas, straight from the bookmark store. */
export function BookmarksWidget() {
  const { t, i18n } = useTranslation();
  const bookmarks = useBookmarks();
  const surahs = useSurahs();
  const duas = useDuas();
  const total = bookmarks.quran.length + bookmarks.duas.length;
  const surahName = (n: number) => {
    const s = surahs.data?.find((item) => item.number === n);
    return s ? (i18n.language === "en" ? s.englishName : s.arabicName) : `${t("Surah")} ${n}`;
  };
  return (
    <section className="widget" aria-label={t("Bookmarks")}>
      <div className="widget-head">
        <div>
          <span className="eyebrow">{t("BOOKMARKS")}</span>
          <h2>{total ? t("{{verses}} verses · {{duas}} duas", { verses: bookmarks.quran.length, duas: bookmarks.duas.length }) : t("Nothing saved yet")}</h2>
        </div>
        {total > 0 && (
          <a className="text-button" href={link("/bookmarks")}>
            {t("View all")}
          </a>
        )}
      </div>
      {total ? (
        <ul className="widget-list">
          {bookmarks.quran.slice(0, SHOWN).map((b) => (
            <li key={`${b.surah}:${b.ayah}`}>
              <a href={link(`/quran/${b.surah}?ayah=${b.ayah}`)}>
                <span>{surahName(b.surah)}</span>
                <small dir="ltr">
                  {b.surah}:{b.ayah}
                </small>
              </a>
            </li>
          ))}
          {bookmarks.duas.slice(0, Math.max(0, SHOWN - bookmarks.quran.length)).map((b) => {
            const dua = duas.data?.find((d) => d.id === b.id);
            return (
              <li key={b.id}>
                <a href={link(`/duas/${b.id}`)}>
                  <span>{dua ? t(dua.title) : t("Dua")}</span>
                  <small>{t("Dua")}</small>
                </a>
              </li>
            );
          })}
        </ul>
      ) : (
        <p>{t("Bookmark a verse or a dua and it will appear here.")}</p>
      )}
    </section>
  );
}

/** Surahs and duas opened recently in this browser. */
export function RecentWidget() {
  const { t, i18n } = useTranslation();
  const recent = useRecentContent();
  const surahs = useSurahs();
  const duas = useDuas();
  return (
    <section className="widget" aria-label={t("Recently explored")}>
      <span className="eyebrow">{t("RECENTLY EXPLORED")}</span>
      {recent.length ? (
        <ul className="widget-list">
          {recent.slice(0, 5).map((item) => {
            if (item.type === "surah") {
              const s = surahs.data?.find((surah) => String(surah.number) === item.id);
              return (
                <li key={`surah-${item.id}`}>
                  <a href={link(`/quran/${item.id}`)}>
                    <span>{s ? (i18n.language === "en" ? s.englishName : s.arabicName) : `${t("Surah")} ${item.id}`}</span>
                    <small>
                      {t("Surah")} {item.id}
                    </small>
                  </a>
                </li>
              );
            }
            const dua = duas.data?.find((d) => d.id === item.id);
            return (
              <li key={`dua-${item.id}`}>
                <a href={link(`/duas/${item.id}`)}>
                  <span>{dua ? t(dua.title) : t("Dua")}</span>
                  <small>{t("Dua")}</small>
                </a>
              </li>
            );
          })}
        </ul>
      ) : (
        <p>{t("Surahs and duas you open will be listed here.")}</p>
      )}
    </section>
  );
}
