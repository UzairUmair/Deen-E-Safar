# Deen e Safar

An Islamic reading and learning website: Quran Explorer with translations and recitation, prayer times, duas, Hadith, learning paths, and a guest dashboard. Built with Next.js (static export), React, TypeScript, TanStack Query, react-i18next, Motion, and three.js for the homepage.

It runs entirely in **Guest Mode**: no account, no database, no API keys. Firebase Authentication, MongoDB and a live AI model are not connected.

## Run

```
npm install
npm run dev          # http://127.0.0.1:3000
npm run build        # static site in out/
```

Checks:

| Command | What it does | Needs |
| --- | --- | --- |
| `npm run lint` | ESLint | — |
| `npm run typecheck` | TypeScript | — |
| `npm test` | Vitest unit and component tests against recorded provider responses | — |
| `npm run verify` | Integrity of the bundled content (duas, Hadith, lessons, translations) | — |
| `npm run verify:app` | Playwright checks of the application screens, providers mocked, clock fixed | site running |
| `npm run verify:ui` | Playwright checks of the homepage 3D story and global UI | site running |
| `npm run verify:live` | Calls the real providers and compares them with the fixtures | network |

The Playwright scripts use an installed Chrome; set `CHROME_PATH` to point at a binary and `BASE` to test another URL.

## Features

- **Quran Explorer** (`#/quran`, `#/quran/:surah`): all 114 surahs from Al Quran Cloud. Uthmani Arabic text, English (Saheeh International) or Urdu (Fateh Muhammad Jalandhry) translation, verse-by-verse recitation (Alafasy or Al-Husary) with play, pause, resume, stop and auto-advance, reader settings, keyword search in Arabic, English or Urdu, juz entry points, bookmarks, and a saved reading position.
- **Prayer Times** (`#/prayer`): AlAdhan timings for a listed city, the device location (asked only on request) or typed coordinates; ten calculation methods, Asr school, 12/24-hour clock, a per-second countdown that rolls over to tomorrow's Fajr, Hijri date, Qibla bearing, and a dhikr counter.
- **Duas** (`#/duas`, `#/duas/:id`): 19 supplications, each a complete Quran verse with reference and translation source. **Hadith** (`#/hadith`): 121 sourced records with grading.
- **Daily verse**: a fixed rotation of 37 verse references, one per calendar day, text fetched from the provider.
- **Guest dashboard** (`#/dashboard`), **Bookmarks** (`#/bookmarks`), **Preferences** (`#/preferences`) with backup export/import and clear-data.
- **Islamic AI Assistant** (`#/ai`): chat layout and service interface are in place; answers are **not** generated. It runs a labelled literal text search over the bundled Quran and Hadith.
- Learning paths, lessons, reminders and a quiz from the first version.
- English, Urdu and Arabic interface with RTL layouts; light and dark themes.

## Architecture

```
React screens / components
        │
hooks (TanStack Query, useSyncExternalStore)
        │
services (quran, prayer, duas, ai, guest)        ← no component talks past this line
        │
provider adapters (lib/quranApi, lib/prayerApi)      guest stores (versioned localStorage)
        │
lib/apiClient (timeouts, cancellation, error kinds, response validation)
```

- `app/lib/` — `apiClient`, provider adapters, router, validation, query client.
- `app/services/` — application logic. Swapping a provider means replacing one adapter.
- `app/services/guest/` — `guestStorage` (store factory: versioned envelopes, validation, corruption recovery, cross-tab sync), bookmark, reading-progress, preferences stores, and a one-time migration of first-version keys.
- `app/hooks/` — `useSurahs`, `useSurah`, `useQuranAudio`, `usePrayerTimes`, `useBookmarks`, `useReadingProgress`, `useGuestPreferences`, …
- `app/screens/` — one file per route; loaded with `React.lazy`, so the homepage's three.js never loads on them and they never load on the homepage.
- `app/components/{quran,prayer,dashboard,ui}` — presentational pieces. `components/{home,three,motion}` — homepage.
- `app/features/` — first-version screens still in use (learning, Hadith, reminders) and `i18n.ts` / `translations.json`.

Storage keys: `deen-v2:guest:bookmarks`, `:reading-progress`, `:preferences`, `:recent-content`, `:daily-verse`. Bookmarks hold references only (`surah`, `ayah`), never verse text. A future authenticated adapter can implement the same `Store` interface; `exportGuestData()` is the hand-off for a consented migration.

Routing is hash-based with path-shaped routes (`#/quran/2?ayah=255`). Links from the first version (`#reader?surah=2&ayah=255`) are redirected.

Translations: keys are the English strings; `app/features/translations.json` maps each to `[Urdu, Arabic]` and feeds i18next. `npm run verify` fails if a registered interface string lacks either.

## Providers and sources

| Data | Source | Notes |
| --- | --- | --- |
| Quran text, translations, search, metadata | [Al Quran Cloud API](https://alquran.cloud/api) | Free, key-less, soft per-second rate limit. [Terms](https://alquran.cloud/terms-and-conditions): text must keep its diacritics and orthography and not be altered; translators must be credited by name (shown beside every verse and in copied text). |
| Recitation audio | Islamic Network CDN (`cdn.islamic.network`) | Licensed for free, non-commercial redistribution; reciters hold copyright. |
| Prayer times, Hijri date | [AlAdhan API](https://aladhan.com/prayer-times-api) | Coordinates-based `/timings/{date}`. Calculated times; mosque timetables can differ. |
| Duas (Quran verses), Hadith | Snapshots of QuranEnc.com and HadeethEnc.com in `content-source/`, bundled under `public/content/` | English: Noor International Center v1.1.2; Urdu: Muhammad Ibrahim Junagarhi v1.1.3. Retrieved 23 October 2026. |

The app does not modify Quran text. The only transformation is removing a leading byte-order mark the provider prepends to some strings.

**Before any commercial use**, re-read the providers' terms: the recitations in particular are licensed for non-commercial redistribution.

## Privacy

Nothing is sent to a server of ours. The browser requests Quran data and audio from `alquran.cloud` / `islamic.network` and prayer times from `aladhan.com` (which receives the chosen coordinates; device coordinates are rounded to two decimals before use). Fonts load from Google Fonts.

## Documentation

- [`docs/functionality-status.md`](docs/functionality-status.md) — every feature with its verification status, known limitations, and what is deferred.
- [`docs/functionality-audit.md`](docs/functionality-audit.md) — the audit that preceded this milestone, including the interaction audit.
- [`docs/visual-reference-analysis.md`](docs/visual-reference-analysis.md) — homepage design and 3D notes.
- [`tests/fixtures/README.md`](tests/fixtures/README.md) — how the recorded provider responses were made.
