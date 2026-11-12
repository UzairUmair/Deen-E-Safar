"use client";
import { useEffect, useState } from "react";
import { Download, Trash2, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LocationPicker, PrayerSettings } from "../components/prayer/PrayerSettings";
import { QuranSettings } from "../components/quran/QuranSettings";
import { PageHeading, useToast } from "../components/ui/states";
import { validateBackup } from "../features/backup";
import i18n from "../features/i18n";
import { useGuestPreferences } from "../hooks/useGuestData";
import { clearGuestData, exportGuestData, replaceGuestData } from "../services/guest/guestStorage";
import { setInterfaceLanguage, updatePreferences, type Language } from "../services/guest/preferencesStorage";

const STORAGE_FAILED = "Could not save. Browser storage is unavailable or full.";
const LANGUAGE_NAMES: Record<Language, string> = { en: "English", ur: "اردو", ar: "العربية" };

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Preferences() {
  const { t } = useTranslation();
  const notify = useToast();
  const preferences = useGuestPreferences();
  const [name, setName] = useState(preferences.displayName);
  const [confirming, setConfirming] = useState(false);
  useEffect(() => setName(preferences.displayName), [preferences.displayName]);

  async function importBackup(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error("too large");
      const entries = validateBackup(JSON.parse(await file.text()));
      if (!window.confirm(t("Replace saved progress on this device with this backup?"))) return;
      replaceGuestData(entries);
      window.location.reload();
    } catch {
      notify(t("This backup is invalid or too large. No data was changed."));
    }
  }

  return (
    <div className="app-screen preferences">
      <PageHeading eyebrow={t("GUEST MODE")} title={t("Preferences")}>
        {t("Everything here is saved in this browser only.")}
      </PageHeading>

      <section className="panel" aria-labelledby="pref-general">
        <h2 id="pref-general">{t("Language and appearance")}</h2>
        <div className="settings-grid">
          <label>
            <span>{t("Interface language")}</span>
            <select
              value={preferences.language}
              onChange={(e) => {
                const language = e.target.value as Language;
                i18n.changeLanguage(language);
                if (!setInterfaceLanguage(language)) notify(t(STORAGE_FAILED));
              }}
            >
              {(Object.keys(LANGUAGE_NAMES) as Language[]).map((language) => (
                <option key={language} value={language}>
                  {LANGUAGE_NAMES[language]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t("Theme")}</span>
            <select value={preferences.theme} onChange={(e) => !updatePreferences({ theme: e.target.value as "light" | "dark" }) && notify(t(STORAGE_FAILED))}>
              <option value="light">{t("Light")}</option>
              <option value="dark">{t("Dark")}</option>
            </select>
          </label>
          <form
            className="name-form"
            onSubmit={(e) => {
              e.preventDefault();
              notify(t(updatePreferences({ displayName: name.trim().slice(0, 60) }) ? "Name saved on this device" : STORAGE_FAILED));
            }}
          >
            <label>
              <span>{t("Name shown on your dashboard (optional)")}</span>
              <input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder={t("What should we call you?")} />
            </label>
            <button type="submit" className="btn secondary btn-sm">
              {t("Save name")}
            </button>
          </form>
        </div>
      </section>

      <section className="panel" aria-labelledby="pref-reader">
        <h2 id="pref-reader">{t("Quran reader")}</h2>
        <QuranSettings />
      </section>

      <section className="panel" aria-labelledby="pref-prayer">
        <h2 id="pref-prayer">{t("Prayer times")}</h2>
        <PrayerSettings />
        <h3>{t("Location")}</h3>
        <LocationPicker />
      </section>

      <section className="panel" aria-labelledby="pref-data">
        <h2 id="pref-data">{t("Your data")}</h2>
        <p>{t("Export your progress before clearing browser data. Import replaces this device’s saved Deen e Safar data.")}</p>
        <div className="chip-row">
          <button
            type="button"
            className="btn secondary btn-sm"
            onClick={() => {
              download("deen-e-safar-backup.json", JSON.stringify({ version: 1, data: exportGuestData() }, null, 2));
              notify(t("Backup downloaded"));
            }}
          >
            <Download size={15} aria-hidden="true" />
            {t("Export progress")}
          </button>
          <label className="btn secondary btn-sm file-button">
            <Upload size={15} aria-hidden="true" />
            {t("Import backup")}
            <input type="file" accept="application/json" className="sr-only" onChange={(e) => importBackup(e.target.files?.[0])} />
          </label>
          <button type="button" className="btn outline btn-sm danger" aria-expanded={confirming} onClick={() => setConfirming((value) => !value)}>
            <Trash2 size={15} aria-hidden="true" />
            {t("Clear device data")}
          </button>
        </div>
        {confirming && (
          <div className="notice" role="alertdialog" aria-label={t("Clear device data")}>
            <p>{t("This removes your saved progress, notes, and settings from this browser.")}</p>
            <div className="chip-row">
              <button
                type="button"
                className="chip danger"
                onClick={() => {
                  clearGuestData();
                  window.location.hash = "/";
                  window.location.reload();
                }}
              >
                {t("Yes, clear my data")}
              </button>
              <button type="button" className="chip" onClick={() => setConfirming(false)}>
                {t("Cancel")}
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="panel pending" aria-labelledby="pref-account">
        <h2 id="pref-account">
          {t("Account and sync")} <span className="soon-badge">{t("Coming soon")}</span>
        </h2>
        <p>{t("Sign-in and syncing between devices are not connected yet. Nothing is sent to a server; your data stays in this browser until you choose to move it.")}</p>
      </section>
    </div>
  );
}
