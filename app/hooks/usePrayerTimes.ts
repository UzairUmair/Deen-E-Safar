"use client";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTimings, timingsKey, timingsRequest } from "../services/prayer/prayerService";
import { addDays, buildSchedule, dateInZone, findNextPrayer, needsTomorrow } from "../services/prayer/prayerTimeUtils";
import { useGuestPreferences } from "./useGuestData";

/** Current time in ms, refreshed on an interval. 0 until mounted, so prerendered HTML carries no clock. */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

const SIX_HOURS = 6 * 60 * 60 * 1000;

/**
 * The single source of prayer times for the page and every widget: shared settings in,
 * provider schedule and live countdown out. Pass `date` to look at another day
 * (no countdown is produced for days other than today at the location).
 */
export function usePrayerTimes(options: { date?: string } = {}) {
  const { prayer } = useGuestPreferences();
  const now = useNow(1000);
  const zone = prayer.location.timezone;
  const today = now ? dateInZone(new Date(now), zone) : null;
  const date = options.date ?? today;
  const isToday = date !== null && date === today;

  const request = date ? timingsRequest(prayer, date) : null;
  const timings = useQuery({
    queryKey: request ? timingsKey(request) : ["prayer-timings", "idle"],
    queryFn: ({ signal }) => getTimings(request!, { signal }),
    enabled: request !== null,
    staleTime: SIX_HOURS,
  });
  const schedule = useMemo(() => (timings.data ? buildSchedule(timings.data) : null), [timings.data]);

  // After Isha the next prayer is tomorrow's Fajr, which needs tomorrow's schedule.
  const wantTomorrow = isToday && !!schedule && needsTomorrow(schedule, now);
  const tomorrowRequest = wantTomorrow && date ? timingsRequest(prayer, addDays(date, 1)) : null;
  const tomorrow = useQuery({
    queryKey: tomorrowRequest ? timingsKey(tomorrowRequest) : ["prayer-timings", "idle-tomorrow"],
    queryFn: ({ signal }) => getTimings(tomorrowRequest!, { signal }),
    enabled: tomorrowRequest !== null,
    staleTime: SIX_HOURS,
  });
  const tomorrowSchedule = useMemo(() => (tomorrow.data ? buildSchedule(tomorrow.data) : null), [tomorrow.data]);

  const next = isToday && schedule ? findNextPrayer(schedule, tomorrowSchedule, now) : null;

  return {
    settings: prayer,
    date,
    isToday,
    now,
    schedule,
    data: timings.data ?? null,
    next,
    remainingMs: next ? Math.max(0, next.time.getTime() - now) : null,
    isLoading: !request || timings.isPending,
    isFetching: timings.isFetching,
    error: timings.isError ? timings.error : wantTomorrow && tomorrow.isError ? tomorrow.error : null,
    /** True when the times on screen are a cached copy that failed to refresh. */
    isStale: timings.isError && !!timings.data,
    retry: () => {
      timings.refetch();
      if (wantTomorrow) tomorrow.refetch();
    },
  };
}
