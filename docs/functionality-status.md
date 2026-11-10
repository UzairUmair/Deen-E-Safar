# Functionality status — Deen e Safar 2.0 (Guest Mode milestone)

Last updated 10 November 2026. Status values:

- **Verified** — working, and exercised by a check that was actually run (named in the row).
- **Unverified** — implemented, not exercised by any check.
- **Partial** — works with a stated gap.
- **Deferred** — intentionally not built in this milestone.
- **Blocked** — cannot be completed for a stated reason.

Checks: `T` = `npm test` (Vitest, 77 tests), `E` = `npm run verify:app` (Playwright, 22
checks), `H` = `npm run verify:ui` (Playwright, 12 checks), `L` = `npm run verify:live`
(12 checks against the real APIs), `S` = a one-off live smoke run in a real browser against
the real providers. `T`, `E` and `H` use recorded provider responses and a fixed clock;
`E` and `H` were run against both the dev server and the production export.

All of the browser evidence is from **headless Chrome on Linux**. Nothing was run on a
physical phone, Safari or Firefox.

## Quran Explorer

| Feature | Status | Evidence |
| --- | --- | --- |
| 114 surahs from Al Quran Cloud, each card opens its reader | Verified | T, E, L |
| Card shows number, Arabic name, transliteration, meaning (English UI), ayah count, Meccan/Medinan | Verified | T |
| Search by English name, Arabic name, number; clear; Meccan/Medinan filter | Verified | T, E |
| Jump to a reference typed as `2:255` (checked against the surah's length) | Verified | T |
| Loading skeleton, error state with retry | Verified | T, E |
| Reader: surah number validated; Arabic and translation joined by ayah number; in order | Verified | T, L (286 ayahs) |
| Arabic shown exactly as provided, `translate="no"`, Amiri Quran font | Verified | T, E |
| English / Urdu translation switch, hide translation; edition checked against provider metadata | Verified | T, E, S |
| Translation attribution beside each verse, in the header and in copied text | Verified | T |
| Reader settings: Arabic size, translation size, width, spacing, reciter, auto-advance, reset; persisted | Verified | T |
| Previous / next surah, surah select, verse jump, back to directory | Verified (select and jump: Unverified) | E |
| Audio: play, pause, resume, stop; state mirrors the audio element; one element so no overlap | Verified | T, E, S (real recitation played and paused) |
| Audio: auto-advance to next verse; failure reported; stops when leaving the reader | Verified | T, E |
| Second reciter (Al-Husary) | Partial | Files confirmed on the CDN (L); playback with it not exercised |
| Bookmarks: add, remove, persist across reload, list, filter, open, on-demand verse preview | Verified | T, E |
| Bookmarks store references only | Verified | T |
| Continue Reading: debounced save while reading, card on return, verse brought into view | Verified | T, E |
| Keyword search in English, Urdu or Arabic; debounced; cancellable; empty state; opens match | Verified (Urdu and Arabic scopes: live API only) | T, E, L |
| Juz entry points | Unverified | Endpoint checked (L); panel not exercised |
| Copy verse with reference | Unverified | Clipboard is not available to the checks |
| Semantic (meaning-based) search | Deferred | Not implemented; the UI says the search is keyword matching |

## Prayer Times

| Feature | Status | Evidence |
| --- | --- | --- |
| AlAdhan `/timings/{date}` by coordinates, method, school, zone; ISO instants | Verified | T, E, L |
| Six times shown in the location's zone; next prayer highlighted | Verified | T, E |
| Countdown in seconds, never negative, recomputed from absolute instants | Verified | T, E |
| Moves to tomorrow's Fajr when Isha arrives (fetches the next day) | Verified | T, E |
| Midnight roll-over at the location, not the viewer's zone | Verified | T |
| 29 listed cities; each zone cross-checked against AlAdhan | Verified | L |
| City search and selection changes the request | Verified | T, E |
| "Use My Location": only on press; refusal explained; coordinates rounded | Verified | T, E |
| Manual coordinates with validation | Partial | Rejection verified (T); a successful manual entry not exercised |
| Ten calculation methods (ids checked against `/methods`), Asr school | Verified | T, E, L |
| 12 / 24-hour clock | Verified | T |
| Settings persist; dashboard and homepage widgets use the same hook, settings and cache | Verified | T, E |
| Hijri date with a moon-sighting caveat | Verified (display) | T |
| Error state with retry; stale-data notice | Verified (stale notice: Unverified) | T |
| Another date via the date picker | Unverified | |
| Daylight-saving transitions | Partial | Date arithmetic tested on a DST day (T); a full schedule across a transition not exercised. Instants come from the provider with their offset, so no local conversion is done |
| Very high latitudes | Partial | The provider returns adjusted times (seen live); they are displayed as given, with no extra explanation |
| Qibla bearing, dhikr counter | Verified (bearing maths) / Unverified (counter) | T |

## Duas, daily verse, dashboard

| Feature | Status | Evidence |
| --- | --- | --- |
| 19 duas, each a complete Quran verse checked against the QuranEnc source text | Verified | `npm run verify`, T |
| Category filter, search, saved filter, details route, source and review metadata | Verified | T, E |
| Dua bookmarks persist and appear in Bookmarks and the dashboard | Verified | T, E |
| English / Urdu translation follows the interface language | Verified | T |
| Categories "Morning" / "Evening" from the brief | Deferred | No reviewed Hadith-based adhkar dataset was available; nothing was invented to fill them |
| Daily verse: deterministic per local calendar date, from the provider, attributed, bookmarkable | Verified | T, E, S |
| Daily verse fallback: last successful verse with its date, or an error state | Verified | T |
| Dashboard: Guest Mode label, greeting, date, prayer widget, continue reading, daily verse, bookmarks, recent, quick actions | Verified | T, E |
| Honest empty states for a new visitor; no streaks or scores | Verified | T, E |
| Lesson progress card (first-version data) | Verified | E |

## Storage, preferences, language

| Feature | Status | Evidence |
| --- | --- | --- |
| Versioned keys, validation on read, corruption recovery, failed-write reporting | Verified | T |
| Cross-tab sync via the `storage` event | Verified (simulated event) | T |
| One-time migration of first-version data | Verified | T |
| Backup export / import with validation; clear device data | Verified (validation, clear) / Unverified (file download and file picker) | T, E |
| Language switch: `lang`, `dir`, interface, reader translation; persisted | Verified | E, H |
| Urdu and Arabic strings for every new interface string | Verified (coverage) | `npm run verify` |
| Quality of the new Urdu and Arabic strings | Unverified | Written for this milestone; not reviewed by a native speaker |
| Theme persists | Verified | E |

## Assistant

| Feature | Status | Evidence |
| --- | --- | --- |
| Chat layout, composer, topic chips, message and citation components, loading and error UI | Verified | E |
| "Live answers coming soon" notice; replies labelled "not an AI answer" | Verified | E |
| Service interface for a future backend (`app/services/ai/aiService.ts`) | Verified (current provider) | E |
| Generated answers (Groq, retrieval) | Deferred | Needs credentials and the Express backend |

## Layout, performance, quality

| Feature | Status | Evidence |
| --- | --- | --- |
| No horizontal overflow or clipped Arabic on 10 screens at 320 / 360 / 390 / 430 / 768 / 1024 / 1440px; Urdu at the four phone widths | Verified | E |
| Touch targets ≥ 38px on reader and navigation controls (360px) | Verified | E |
| Every control on app screens has an accessible name; images have alt; one `h1` | Verified | E |
| Full accessibility audit (contrast, screen-reader pass) | Unverified | |
| No WebGL canvas on app screens; three.js chunk not in the initial load | Verified | E, H, build output |
| Homepage 3D story, diagonal buttons, mobile drawer | Verified | H |
| Lint, type check, production build | Verified | `npm run lint`, `typecheck`, `build` |
| No console errors in the exercised flows | Verified | E, H, S |

## Known limitations

- **Network required for the reader and prayer times.** They no longer work offline; a provider outage shows an error with Retry. (The first version read bundled files.)
- **Translator footnotes and "focus reading" are gone** from the reader: the API editions have no footnotes.
- **Different translations in different places:** the reader uses Saheeh International and Jalandhry (API); the dua pages use the bundled Noor International and Junagarhi texts. Each is credited where shown.
- **Routes are in the hash** (`#/quran/2`), not real paths; see the audit.
- **Surah names are not translated into Urdu** (the provider has none); Urdu and Arabic interfaces show the Arabic name.
- **Bismillah** appears as part of ayah 1 where the provider's Uthmani edition includes it; the text is not edited.
- **Initial JavaScript grew** from 874 KB to 1,009 KB (raw) with TanStack Query, i18next and the new shell.
- **Rate limits:** both APIs allow roughly 12 requests per second per IP. A 429 is shown as "Too many requests"; there is no client-side queue.
- **Licensing:** the recitations are licensed for non-commercial redistribution. Review the provider terms before any commercial use.
- The date shown on the dashboard greeting and the daily verse follow the visitor's device calendar; prayer dates follow the selected location.

## Deferred until Firebase / MongoDB / Groq

| Item | What exists now |
| --- | --- |
| Sign-in, accounts | Nothing; "Account and sync" is marked "Coming soon" |
| Cloud sync of bookmarks, progress, preferences | Local only. Stores sit behind a `Store` interface; `exportGuestData()` is the migration hand-off |
| Guest-to-account migration with consent | Not built |
| Live AI answers with retrieval | `AssistantProvider` interface; source-search provider only |
| Express backend | Not present in this repository |
| Background push notifications | Not built (reminders work while the page is open) |
