"use client";
import { useTranslation } from "react-i18next";
import { usePrayerTimes } from "../../hooks/usePrayerTimes";
import { link } from "../../lib/router";
import { formatClock, formatLongDate } from "../../services/prayer/prayerTimeUtils";
import { PrayerCountdown } from "../prayer/PrayerCard";
import { locationLabel } from "../prayer/PrayerSettings";
import { ErrorState, Skeleton } from "../ui/states";

/** Today's prayer times and countdown for the dashboard and homepage, from the shared prayer hook. */
export function PrayerWidget() {
  const { t, i18n } = useTranslation();
  const prayer = usePrayerTimes();
  const { location, hour12 } = prayer.settings;
  return (
    <section className="widget prayer-widget" aria-label={t("Prayer times")}>
      <div className="widget-head">
        <div>
          <span className="eyebrow">{t("PRAYER TIMES")}</span>
          <h2 data-testid="widget-location">{locationLabel(location, t)}</h2>
          {prayer.date && <p className="fine-print">{formatLongDate(prayer.date, i18n.language)}</p>}
        </div>
        <a className="text-button" href={link("/prayer")}>
          {t("View all prayer times")}
        </a>
      </div>
      {location.source === "default" && <p className="fine-print">{t("Showing the default city. Choose your location for accurate times.")}</p>}
      {prayer.error && !prayer.schedule ? (
        <ErrorState error={prayer.error} onRetry={prayer.retry} title={t("Prayer times could not be loaded")} />
      ) : !prayer.schedule ? (
        <div role="status">
          <span className="sr-only">{t("Loading prayer times…")}</span>
          <Skeleton lines={3} />
        </div>
      ) : (
        <>
          <PrayerCountdown next={prayer.next} remainingMs={prayer.remainingMs} zone={location.timezone} hour12={hour12} compact />
          <ul className="prayer-strip">
            {prayer.schedule.map((entry) => (
              <li key={entry.key} data-next={prayer.next?.key === entry.key && !prayer.next.tomorrow ? true : undefined}>
                <span>{t(entry.key)}</span>
                <time dateTime={entry.time.toISOString()} dir="ltr">
                  {formatClock(entry.time, location.timezone, hour12)}
                </time>
              </li>
            ))}
          </ul>
          {prayer.isStale && (
            <p className="notice" role="status">
              {t("These times could not be refreshed and may be out of date.")}
            </p>
          )}
        </>
      )}
    </section>
  );
}
