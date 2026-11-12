# Functionality audit — Deen e Safar 2.0

Audit of the codebase as it stood before the Guest Mode milestone (commit `05b254f`),
and what each finding led to. Current status of every feature is tracked separately in
[`functionality-status.md`](./functionality-status.md).

## 0. The stack is not what the brief describes

| Brief | Repository |
| --- | --- |
| React + Vite | **Next.js 16, static export** (`output: "export"`), React 19 |
| JavaScript / JSX | **TypeScript / TSX** (`strict`) |
| React Router, `/quran/:n` | **Hash routing** in one client page (`app/page.tsx`) |
| Node + Express backend | **None.** The site is static files only |
| `client/src/...` | `app/...` |

Decisions taken, so that working code was adapted rather than rewritten:

- **Kept Next.js and TypeScript.** New code is `.ts`/`.tsx`. A migration to Vite/JSX would
  have replaced the build, the deployment and every existing file for no functional gain.
- **Routes are path-shaped but live in the hash:** `#/quran/2?ayah=255`, `#/duas/20-114`,
  `#/dashboard`. Real paths (`/quran/2`) need either a server or 114 pre-generated pages
  plus a restructure of the single-page shell; that is deferred. Old links
  (`#reader?surah=2&ayah=255`) are redirected.
- **No Express proxy was needed.** Both providers send `Access-Control-Allow-Origin: *`,
  so the browser calls them directly.
- The suggested folder layout was followed under `app/` (`lib/` holds the API client and
  provider adapters, because `app/api/` means route handlers in Next.js).

## 1. What existed

| Area | State before | Finding |
| --- | --- | --- |
| Quran explorer + reader | **Functional**, but from files bundled in the repo (QuranEnc snapshot), not an API | Worked offline; no provider abstraction; one fixed English and Urdu edition; settings limited to Arabic size and a focus mode |
| Verse audio | **Functional** (native `<audio controls>`, Alafasy, auto-advance) | No custom controls, no pause/resume state in the UI, one reciter |
| Quran bookmarks, resume | **Functional** in `localStorage` (`deen-verses`, `deen-reading`) | Flat unversioned keys, labels duplicated into storage, raw `localStorage` use spread across components |
| Quran search | **Functional** over a bundled 4 MB index | Not an API search |
| Prayer times | **Functional**, calculated in the browser with the `adhan` library | No API; 10 cities; no Hijri date; countdown in hours and minutes only |
| Duas | **Functional**: 19 Quran verses, mixed into one "Duas & Hadith" screen | No detail route, no stable ids in URLs |
| Hadith library | **Functional**: 121 sourced records | Kept as is |
| Learning paths, lessons, quiz | **Functional** | Kept as is |
| Reminders | **Functional** while the page is open | Kept as is |
| Dashboard ("My space") | **Partial**: counters, saved verses, backup/restore, a local "profile" name | Called itself a profile/auth screen although no account exists |
| Daily verse | **Missing**: a hard-coded "reflection" card | Replaced |
| AI page | **Partial**: an honest text "source finder", no chat layout | Rebuilt as a chat shell around the same real search |
| i18n | **Functional** custom `tr()` over `translations.json` (English, Urdu, Arabic) | Not react-i18next |
| Data fetching | `fetch` in a `useContent` hook | No caching, de-duplication, cancellation, or error taxonomy |
| Tests | A Node content-integrity script and a Playwright homepage script | No unit or component tests, no lint |

## 2. What was missing for this milestone

Provider integrations (Al Quran Cloud, AlAdhan), a central API client with validation and
error classes, TanStack Query, versioned guest storage with migration, `/quran/:n` and
`/duas/:id` routes, reader settings, a real audio player, Quran text search through the API,
location selection with geolocation, calculation settings, a seconds countdown with
next-day roll-over, Hijri date, a daily verse, a guest dashboard built from shared services,
bookmarks and preferences pages, react-i18next, Vitest/RTL tests, lint.

All of these were implemented; see the status document for what was verified and how.

## 3. Interaction audit

Every control was classified. "Checked" names the automated check that exercises it
(`T` = Vitest, `E` = `verify:app`, `H` = `verify:ui`).

### Site chrome

| Control | Behaviour | Class | Checked |
| --- | --- | --- | --- |
| Brand, nav links, footer links | Navigate | Functional | E, H |
| Language select | Changes interface language, `lang`/`dir`, reader translation; persists | Functional | E |
| Theme toggle | Light/dark; persists | Functional | E |
| Bell | Opens reminders | Functional | — |
| "Dashboard" button | Opens guest dashboard (was "My profile") | Functional | E |
| Mobile menu / drawer | Opens, traps focus, Escape, closes on navigation | Functional | H |
| Bottom navigation (mobile) | Home, Quran, Duas, Prayer, Dashboard | Functional | E (size) |
| Footer "Our purpose", "Content & attribution", "Privacy", "Terms" | Open dialogs with current text | Functional | — |
| Footer "Get in touch" | Dialog stating no contact channel is configured | Deferred, labelled | — |

### Homepage

| Control | Behaviour | Class | Checked |
| --- | --- | --- | --- |
| Start Exploring / Discover the Quran | Learning paths / Quran Explorer | Functional | H |
| Bookshelf books and chips | Info panel; Seerah, Hadith, Quran Studies open real sections | Functional | H |
| "Islamic History" book | Says "Coming soon", no action | Deferred, labelled | H |
| Surah preview cards, Open Quran Explorer | `#/quran/1..3`, `#/quran` | Functional | H |
| Feature cards | Open their sections | Functional | — |
| Daily verse: bookmark, Open in Quran | Real bookmark; opens the verse | Functional | T |
| Prayer widget: View all | Opens Prayer Times | Functional | T |
| AI showcase source cards, Explore Islamic AI | Open the verses / assistant | Functional | H |

### Quran

| Control | Behaviour | Class | Checked |
| --- | --- | --- | --- |
| Surah card | Opens `#/quran/:n` | Functional | T, E |
| Search box, clear, Meccan/Medinan filter | Filter by name, Arabic name, number; "2:255" offers a jump | Functional | T |
| Tabs: Surahs / Juz / Search verses | Switch panels | Functional | T, E |
| Juz tile | Opens the juz's first verse | Functional | — |
| Verse search + scope | Debounced provider search; opens the match | Functional | T, E |
| Continue Reading | Opens the saved surah at the saved ayah | Functional | T, E |
| Reader: surah select, verse jump, prev/next, All surahs | Navigate / scroll | Functional | E |
| Reader settings (8 controls) + reset | Apply immediately; persist | Functional | T |
| Per-ayah play / bookmark / copy | Real audio; real bookmark; clipboard with reference | Functional | T, E (copy: —) |
| Audio bar: play/pause, prev, next, stop | Mirror the audio element | Functional | T, E |
| Bookmarks page: tabs, filter, show verse, open, remove | As labelled | Functional | T, E |

### Prayer, duas, dashboard, preferences, assistant

| Control | Behaviour | Class | Checked |
| --- | --- | --- | --- |
| Use My Location | Asks permission on press only; handles refusal | Functional | T, E |
| City search and chips, manual coordinates | Set location; validated | Functional | T, E |
| Method, Asr school, clock format, reset | Refetch / reformat; persist | Functional | T, E |
| Date picker, Back to today | Other days without countdown | Functional | — |
| Dhikr counter: count, undo, reset | Persisted counter | Functional | — |
| Dua category chips, search, Saved filter | Filter | Functional | T, E |
| Dua card, details: copy, bookmark, read in context, prev/next | As labelled | Functional | T, E (copy: —) |
| Dashboard quick actions, widget links | Navigate | Functional | T, E |
| Preferences: language, theme, name | Persist | Functional | E |
| Export / Import backup, Clear device data | Download JSON; validated restore; wipe | Functional | T (validation), E (clear) |
| "Account and sync" | Marked "Coming soon", no control | Deferred, labelled | — |
| Assistant composer, topic chips | Source search with citations, labelled "not an AI answer" | Functional (live AI deferred) | E |

### Older screens (unchanged)

Learning paths, lessons (complete, notes, self-check), Hadith library (search, filters,
save, details, pagination), reminders (toggle, time, notifications, calendar export) and
the quiz were not modified beyond routing. A smoke check covers lesson completion,
a lesson's Quran link, saving a Hadith and the quiz (`E`); their remaining controls were
functional before this milestone and were not individually re-tested.

No control with an empty handler was found or added. Toasts are raised only from the
success or failure branch of the action they describe.

## 4. Removed or replaced

| Removed | Replaced by |
| --- | --- |
| `app/features/Quran.tsx` (bundled reader) | `app/screens/Quran.tsx`, `SurahReader.tsx` on Al Quran Cloud |
| `app/features/Prayer.tsx` and the `adhan` dependency | `app/screens/PrayerTimes.tsx` on AlAdhan |
| "My space" profile screen | Guest dashboard + Preferences (backup tools moved there) |
| Source finder screen | Assistant screen using the same search through `aiService` |
| Translator footnotes, "focus reading" and the offline full-text index in the reader | Not carried over: the API editions have no footnotes. The bundled Quran files remain for the homepage, duas and the assistant |
