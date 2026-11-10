"use client";
import { useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PrayerCard, PrayerCountdown } from "../components/prayer/PrayerCard";
import { LocationPicker, PrayerSettings, locationLabel } from "../components/prayer/PrayerSettings";
import { ErrorState, PageHeading, Skeleton } from "../components/ui/states";
import { useStored } from "../features/shared";
import { usePrayerTimes } from "../hooks/usePrayerTimes";
import { PRAYER_PROVIDER } from "../services/prayer/prayerService";
import { formatLongDate, isDateString, qiblaBearing } from "../services/prayer/prayerTimeUtils";

export default function PrayerTimes() {
  const { t, i18n } = useTranslation();
  // null = follow "today" at the selected location.
  const [picked, setPicked] = useState<string | null>(null);
  const prayer = usePrayerTimes(picked ? { date: picked } : {});
  const { location, hour12 } = prayer.settings;
  const bearing = qiblaBearing(location.latitude, location.longitude);
  const hijri = prayer.data?.hijri;

  return (
    <div className="app-screen">
      <PageHeading eyebrow={t("PRAYER TIMES")} title={locationLabel(location, t)}>
        {prayer.date ? formatLongDate(prayer.date, i18n.language) : "…"}
        {hijri && (
          <>
            {" · "}
            <span lang={i18n.language === "en" ? undefined : "ar"}>
              {hijri.day} {i18n.language === "en" ? hijri.monthEn : hijri.monthAr} {hijri.year}
            </span>{" "}
            {t("AH")}
          </>
        )}
      </PageHeading>

      {location.source === "default" && (
        <p className="notice" role="status">
          {t("Showing the default city. Choose your location for accurate times.")}
        </p>
      )}

      <div className="prayer-layout">
        <section className="prayer-main" aria-label={t("Prayer times")}>
          <div className="date-row">
            <label>
              <span>{t("Date")}</span>
              <input type="date" value={prayer.date ?? ""} onChange={(e) => setPicked(isDateString(e.target.value) ? e.target.value : null)} />
            </label>
            {!prayer.isToday && prayer.date && (
              <button type="button" className="chip" onClick={() => setPicked(null)}>
                {t("Back to today")}
              </button>
            )}
          </div>

          {prayer.error && !prayer.schedule ? (
            <ErrorState error={prayer.error} onRetry={prayer.retry} title={t("Prayer times could not be loaded")} />
          ) : !prayer.schedule || !prayer.data ? (
            <div role="status">
              <span className="sr-only">{t("Loading prayer times…")}</span>
              <Skeleton lines={5} />
            </div>
          ) : (
            <>
              {prayer.isToday ? (
                <PrayerCountdown next={prayer.next} remainingMs={prayer.remainingMs} zone={location.timezone} hour12={hour12} />
              ) : (
                <p className="fine-print">{t("The countdown is shown for today only.")}</p>
              )}
              {prayer.error && (
                <p className="notice" role="alert">
                  {t("Tomorrow's times could not be loaded, so the next prayer is not shown yet.")}{" "}
                  <button type="button" className="inline-link" onClick={prayer.retry}>
                    {t("Try again")}
                  </button>
                </p>
              )}
              {prayer.isStale && (
                <p className="notice" role="status">
                  {t("These times could not be refreshed and may be out of date.")}
                </p>
              )}
              <ul className="prayer-cards" aria-busy={prayer.isFetching}>
                {prayer.schedule.map((entry) => (
                  <PrayerCard key={entry.key} entry={entry} zone={location.timezone} hour12={hour12} next={prayer.next?.key === entry.key && !prayer.next.tomorrow} />
                ))}
              </ul>
              <dl className="prayer-meta">
                <div>
                  <dt>{t("Time zone")}</dt>
                  <dd dir="ltr">{prayer.data.timezone}</dd>
                </div>
                <div>
                  <dt>{t("Calculation method")}</dt>
                  <dd data-testid="method-name">{t(prayer.data.method.name)}</dd>
                </div>
              </dl>
            </>
          )}

          <p className="fine-print">
            {t("Times are calculated by AlAdhan from the coordinates and method you select. They can differ from your local mosque or official timetable, so confirm congregation times locally.")}{" "}
            <a href={PRAYER_PROVIDER.url} target="_blank" rel="noreferrer">
              {PRAYER_PROVIDER.name} ↗
            </a>
          </p>
          {hijri && <p className="fine-print">{t("The Hijri date is calculated by the provider. The actual date depends on local moon sighting and can differ by a day.")}</p>}
        </section>

        <aside className="prayer-side">
          <section className="panel" aria-labelledby="location-title">
            <h2 id="location-title">{t("Location")}</h2>
            <LocationPicker />
          </section>
          <section className="panel" aria-labelledby="prayer-settings-title">
            <h2 id="prayer-settings-title">{t("Prayer settings")}</h2>
            <PrayerSettings />
          </section>
          <section className="panel" aria-labelledby="qibla-title">
            <h2 id="qibla-title">{t("Qibla direction")}</h2>
            <div className="qibla">
              <div className="qibla-dial" aria-hidden="true">
                <span style={{ transform: `rotate(${bearing}deg)` }}>↑</span>
              </div>
              <p>
                <strong dir="ltr">{bearing.toFixed(1)}°</strong> {t("clockwise from true north")}
                <small>{t("A geometric bearing from the selected coordinates. A phone compass needs calibration and points to magnetic north.")}</small>
              </p>
            </div>
          </section>
          <Tasbih />
        </aside>
      </div>
    </div>
  );
}

function Tasbih() {
  const { t } = useTranslation();
  const [count, setCount] = useStored("deen-tasbih", 0);
  return (
    <section className="panel tasbih" aria-labelledby="tasbih-title">
      <h2 id="tasbih-title">{t("Dhikr counter")}</h2>
      <output className="tasbih-count" aria-live="polite" dir="ltr">
        {count}
      </output>
      <div className="tasbih-buttons">
        <button type="button" className="icon-button" aria-label={t("Undo one")} disabled={count === 0} onClick={() => setCount(Math.max(0, count - 1))}>
          <Minus size={18} aria-hidden="true" />
        </button>
        <button type="button" className="btn" onClick={() => setCount(count + 1)}>
          <Plus size={18} aria-hidden="true" />
          {t("Count")}
        </button>
        <button type="button" className="icon-button" aria-label={t("Reset counter")} disabled={count === 0} onClick={() => setCount(0)}>
          <RotateCcw size={17} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
