"use client";
import { useTranslation } from "react-i18next";
import type { PrayerKey } from "../../lib/prayerApi";
import { formatClock, formatCountdown, type NextPrayer, type ScheduleEntry } from "../../services/prayer/prayerTimeUtils";

/** One prayer (or sunrise) with its time at the selected location. */
export function PrayerCard({ entry, zone, hour12, next }: { entry: ScheduleEntry; zone: string; hour12: boolean; next: boolean }) {
  const { t } = useTranslation();
  return (
    <li className="prayer-card" data-next={next || undefined} data-prayer={entry.key}>
      <span className="prayer-name">{t(entry.key)}</span>
      <time className="prayer-time" dateTime={entry.time.toISOString()} dir="ltr">
        {formatClock(entry.time, zone, hour12)}
      </time>
      {next && <small>{t("Next")}</small>}
    </li>
  );
}

/** Live countdown to the next prayer. `remainingMs` is recomputed from absolute instants every second. */
export function PrayerCountdown({ next, remainingMs, zone, hour12, compact = false }: { next: NextPrayer | null; remainingMs: number | null; zone: string; hour12: boolean; compact?: boolean }) {
  const { t } = useTranslation();
  if (!next || remainingMs === null) {
    return (
      <div className={`countdown ${compact ? "compact" : ""}`} role="status">
        <span className="countdown-label">{t("Next prayer")}</span>
        <strong className="countdown-name">…</strong>
      </div>
    );
  }
  return (
    <div className={`countdown ${compact ? "compact" : ""}`}>
      <span className="countdown-label">{t("Next prayer")}</span>
      <strong className="countdown-name" data-testid="next-prayer">
        {t(next.key as PrayerKey)}
        <small dir="ltr">
          {formatClock(next.time, zone, hour12)}
          {next.tomorrow && ` · ${t("tomorrow")}`}
        </small>
      </strong>
      <span className="countdown-label">{t("Time remaining")}</span>
      {/* role="timer": announced on request, not every second. */}
      <span className="countdown-clock" role="timer" dir="ltr" data-testid="countdown">
        {formatCountdown(remainingMs)}
      </span>
    </div>
  );
}
