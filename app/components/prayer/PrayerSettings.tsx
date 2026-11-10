"use client";
import { useMemo, useState } from "react";
import { Loader2, LocateFixed, MapPin, RotateCcw, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supportedLocations } from "../../data/supportedLocations";
import { useGuestPreferences } from "../../hooks/useGuestData";
import { ASR_SCHOOLS, PRAYER_METHODS } from "../../lib/prayerApi";
import { isTimeZone } from "../../lib/validation";
import { resetPrayerPreferences, updatePrayerPreferences, type PrayerLocation, type PrayerPreferences } from "../../services/guest/preferencesStorage";
import { requestDeviceLocation, type DeviceLocationError } from "../../services/prayer/prayerService";
import { useToast } from "../ui/states";

const STORAGE_FAILED = "Could not save. Browser storage is unavailable or full.";

const LOCATION_ERRORS: Record<DeviceLocationError, string> = {
  denied: "Location permission was denied. Choose a city or enter coordinates instead.",
  unsupported: "This browser cannot share a location. Choose a city or enter coordinates instead.",
  unavailable: "Your location could not be determined. Choose a city or enter coordinates instead.",
  timeout: "Finding your location took too long. Try again, or choose a city.",
};

/** Name to show for a saved location; device positions have no place name. */
export function locationLabel(location: PrayerLocation, t: (key: string) => string) {
  if (location.source === "device") return t("My location");
  return location.country ? `${t(location.name)}, ${t(location.country)}` : t(location.name);
}

/** Choose where prayer times are calculated for: a listed city, the device position, or typed coordinates. */
export function LocationPicker() {
  const { t } = useTranslation();
  const notify = useToast();
  const { prayer } = useGuestPreferences();
  const [search, setSearch] = useState("");
  const [locating, setLocating] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [manual, setManual] = useState({ name: "", latitude: "", longitude: "", timezone: "" });

  const save = (location: PrayerLocation) => {
    setProblem(null);
    if (!updatePrayerPreferences({ location })) notify(t(STORAGE_FAILED));
  };

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    return supportedLocations.filter((l) => !term || `${l.city} ${l.country} ${t(l.city)} ${t(l.country)}`.toLowerCase().includes(term));
  }, [search, t]);

  async function locateDevice() {
    setLocating(true);
    setProblem(null);
    try {
      const position = await requestDeviceLocation();
      save({ name: "My location", country: "", ...position, source: "device" });
    } catch (error) {
      setProblem(LOCATION_ERRORS[error as DeviceLocationError] ?? LOCATION_ERRORS.unavailable);
    } finally {
      setLocating(false);
    }
  }

  function submitManual(event: React.FormEvent) {
    event.preventDefault();
    const latitude = Number(manual.latitude);
    const longitude = Number(manual.longitude);
    const timezone = manual.timezone.trim() || Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (manual.latitude.trim() === "" || manual.longitude.trim() === "" || !Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180) return setProblem("Enter a latitude between -90 and 90 and a longitude between -180 and 180.");
    if (!isTimeZone(timezone)) return setProblem("Enter a valid time zone such as Asia/Karachi.");
    save({ name: manual.name.trim() || `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`, country: "", latitude, longitude, timezone, source: "manual" });
  }

  return (
    <div className="location-picker">
      <p className="location-current">
        <MapPin size={17} aria-hidden="true" />
        <span>
          <strong data-testid="location-name">{locationLabel(prayer.location, t)}</strong>
          <small dir="ltr">
            {prayer.location.latitude.toFixed(2)}, {prayer.location.longitude.toFixed(2)} · {prayer.location.timezone}
          </small>
        </span>
      </p>

      <button type="button" className="btn secondary btn-sm" onClick={locateDevice} disabled={locating}>
        {locating ? <Loader2 size={15} className="spin" aria-hidden="true" /> : <LocateFixed size={15} aria-hidden="true" />}
        {locating ? t("Finding your location…") : t("Use My Location")}
      </button>
      <p className="fine-print">{t("Your browser will ask for permission. Only rounded coordinates are kept, in this browser.")}</p>
      {problem && (
        <p className="notice" role="alert">
          {t(problem)}
        </p>
      )}

      <label className="search-field">
        <Search size={17} aria-hidden="true" />
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("Search a city")} aria-label={t("Search a city")} autoComplete="off" />
      </label>
      <ul className="city-list" aria-label={t("Cities")}>
        {matches.map((l) => {
          const selected = prayer.location.source !== "device" && prayer.location.latitude === l.latitude && prayer.location.longitude === l.longitude;
          return (
            <li key={l.id}>
              <button type="button" className={`chip ${selected ? "selected" : ""}`} aria-pressed={selected} onClick={() => save({ name: l.city, country: l.country, latitude: l.latitude, longitude: l.longitude, timezone: l.timezone, source: "city" })}>
                {t(l.city)}
                <small>{t(l.country)}</small>
              </button>
            </li>
          );
        })}
        {!matches.length && <li className="fine-print">{t("No listed city matches. Enter coordinates below instead.")}</li>}
      </ul>

      <details className="manual-location">
        <summary>{t("Enter coordinates manually")}</summary>
        <form onSubmit={submitManual} className="settings-grid">
          <label>
            <span>{t("Place name (optional)")}</span>
            <input value={manual.name} maxLength={60} onChange={(e) => setManual({ ...manual, name: e.target.value })} />
          </label>
          <label>
            <span>{t("Latitude")}</span>
            <input inputMode="decimal" dir="ltr" value={manual.latitude} onChange={(e) => setManual({ ...manual, latitude: e.target.value })} placeholder="24.86" />
          </label>
          <label>
            <span>{t("Longitude")}</span>
            <input inputMode="decimal" dir="ltr" value={manual.longitude} onChange={(e) => setManual({ ...manual, longitude: e.target.value })} placeholder="67.00" />
          </label>
          <label>
            <span>{t("Time zone (leave empty to use this device's)")}</span>
            <input dir="ltr" value={manual.timezone} onChange={(e) => setManual({ ...manual, timezone: e.target.value })} placeholder="Asia/Karachi" />
          </label>
          <button type="submit" className="btn btn-sm">
            {t("Use these coordinates")}
          </button>
        </form>
      </details>
    </div>
  );
}

/** Calculation method, Asr school and clock format. Changing any of them refetches the times. */
export function PrayerSettings() {
  const { t } = useTranslation();
  const notify = useToast();
  const { prayer } = useGuestPreferences();
  const change = (patch: Partial<PrayerPreferences>) => {
    if (!updatePrayerPreferences(patch)) notify(t(STORAGE_FAILED));
  };
  return (
    <div className="settings-grid">
      <label>
        <span>{t("Calculation method")}</span>
        <select value={prayer.method} onChange={(e) => change({ method: Number(e.target.value) })} data-testid="method-select">
          {PRAYER_METHODS.map((method) => (
            <option key={method.id} value={method.id}>
              {t(method.name)}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>{t("Asr calculation")}</span>
        <select value={prayer.school} onChange={(e) => change({ school: Number(e.target.value) as 0 | 1 })} data-testid="school-select">
          {ASR_SCHOOLS.map((school) => (
            <option key={school.id} value={school.id}>
              {t(school.name)}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>{t("Clock format")}</span>
        <select value={prayer.hour12 ? "12" : "24"} onChange={(e) => change({ hour12: e.target.value === "12" })}>
          <option value="12">{t("12-hour")}</option>
          <option value="24">{t("24-hour")}</option>
        </select>
      </label>
      <button type="button" className="btn secondary btn-sm settings-reset" onClick={() => notify(t(resetPrayerPreferences() ? "Prayer settings reset" : STORAGE_FAILED))}>
        <RotateCcw size={15} aria-hidden="true" />
        {t("Reset prayer settings")}
      </button>
    </div>
  );
}
