# Deen e Safar

A functional Islamic reading and learning website built with Next.js, React, TypeScript, Motion, Lucide, and Adhan. Static export with browser-local progress.

## Run

Run `npm install`, `npm run dev`, `npm run verify`, and `npm run build`. With the site running, `npm run verify:ui` runs the browser checks (set `CHROME_PATH` if Chrome is not installed as a channel, and `BASE` to test another URL). Development URL: http://127.0.0.1:3000. Production output: `out/`. Hosting identity is retained in `.openai/hosting.json`.

## Features

- Complete Quran: 114 surahs / 6,236 ayahs, 30 juz entry points, Arabic, English and Urdu translations and footnotes. Full-text search, bookmarks, saved reading positions, text sizing, focus mode, copying, sequential verse audio.
- Five introductory learning paths with 15 distinct lessons, reflection notes, self-checks, and progress. All lesson prose, activities, questions, and answers have Urdu and Arabic translations.
- 19 Quranic supplications as complete verses; 121 sourced Hadith records with Arabic, translations, explanations, attribution, grading, filters, pagination, bookmarks, and copying. This is a selected Hadith library, not the entire corpus.
- Locally calculated prayer times, cities, optional device location, manual coordinates/timezone, six methods, Asr convention, date selection, countdown, fixed Qibla bearing, and dhikr counter. Some polar dates produce unavailable times. Congregation times must be obtained from the mosque.
- Local profile, saved collections, resume reading, schema-validated backup import, export, and deliberate data clearing. No password, account server, or cross-device sync.
- In-page daily reminders, optional browser notifications while open, recurring ICS calendar export. No background push delivery when the site is closed.
- Source finder searches the bundled Quran and Hadith. It is explicitly text search, not generative AI or a fatwa service.
- English/Urdu/Arabic throughout the interface and lessons, with sourced scripture translations, RTL layouts, responsive navigation, and light/dark themes. Switching language retains the current route and screen state. User-written notes, source URLs, and technical timezone identifiers are not translated. Native browser dialogs use browser/OS language.

## Sources

Snapshots retrieved 23 October 2026 are retained in `content-source/`; bundled content and attribution metadata are in `public/content/`.

- Quran text and translations: https://quranenc.com/en/home/api. English edition `english_saheeh`: English Translation — Noor International Center, v1.1.2. Urdu: Muhammad Ibrahim Junagarhi, v1.1.3. Original text and footnotes are preserved with visible attribution.
- Surah/juz metadata: https://api.alquran.cloud/v1/meta.
- Hadith: https://hadeethenc.com/en/home/about. English and Urdu records include Arabic originals. Each record links to its source and retains its supplied grade.
- Audio: https://alquran.cloud/cdn, Islamic Network, Mishary Rashid Alafasy. Streaming requires internet access.
- Prayer calculation: https://github.com/batoulapps/adhan-js.
- Lessons are authored introductory study notes linked to Quran references, not personalised rulings or a certification curriculum. UI/lesson translations are separate from unchanged source scripture.

`scripts/prepare-content.cjs` reproduces bundled content from the snapshots. `scripts/verify-functional.cjs` checks corpus totals and original-text fidelity, Hadith translations, timezone boundaries and Asr conventions, backup validation, and translation coverage.

## Structure and design

`app/page.tsx` is the shell/homepage. `app/features/` contains functional screens, storage validation, and localization. `translations.json` maps English UI and lesson text to Urdu/Arabic. `globals.css`, `dark.css`, and `features.css` provide layout, responsive rules, and RTL layouts; `app/styles/design-tokens.css` sets the current cream/navy/gold palette (and a navy dark theme) on top of them.

Logo SVGs retain the user-supplied crescent identity. Reduced-motion settings are respected. Fonts load from Google Fonts. No analytics, Firebase, Groq, external AI, or password authentication is connected.

## Homepage 2.0

The public homepage is a scroll-driven 3D story built with three.js, React Three Fiber, Drei and GSAP ScrollTrigger: an interactive bookshelf, a Quran that opens on a rehal as you scroll, and surah previews linking into the reader. All models and textures are procedural; the Quran model carries no text. 3D exists only on the homepage and loads lazily. Reduced motion, missing or software-only WebGL, data saver and low-memory devices get pre-rendered stills in normal page flow (`?3d=force` overrides the software-renderer check). Every `.btn` site-wide uses the diagonal sweep from `app/styles/animations.css`; new code should use `app/components/motion/AnimatedButton.tsx`. Design notes, the reference mapping and the verification record are in `docs/visual-reference-analysis.md`.

## Validation

Production TypeScript/static build and content/logic verification. Browser checks cover Urdu/Arabic switching, lesson completion and notes, Quran bookmarks and resume, sequential audio, Hadith filters/details, city-based prayer updates, and 390px RTL layout without horizontal overflow. Al-Fatihah audio reached ready state 4 and advanced between verses. No console errors were reported during these flows.
