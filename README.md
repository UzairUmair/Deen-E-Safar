# Deen e Safar

A responsive, browser-local Islamic learning prototype built with Next.js App Router, React, TypeScript, Tailwind CSS, Motion, and Lucide.

## Run

```sh
npm install
npm run dev
```

Open http://127.0.0.1:3000. `npm run build` creates a static export in `out/`. `npm run typecheck` checks TypeScript.

## Prototype scope

The homepage connects to Quran browsing and reader previews, five course outlines and reflective demo lessons, a dua/Hadith library, illustrative prayer tools, sample AI chat, dashboard, reminder preferences, a quiz, and demo authentication screens. Hash navigation keeps this export portable and supports browser back/forward.

Bookmarks, lesson progress, reflections, reminder preferences, theme, language selection, and a demo profile name use local storage. No real credentials are saved. No Firebase, Groq, push notifications, analytics, or production APIs are connected.

The English/Urdu/Arabic selector localizes the main navigation and hero with RTL typography. Other screens currently use English; complete localization remains future work. Quran content is a verified excerpt from 20:114, not a full Quran dataset. The ten-surah catalogue links out to full text and recitation. Hadith and full lessons await editorial review. Prayer times are illustrative and must not be used as actual schedules. AI responses are scripted demonstrations with an uncertainty fallback.

## Structure

- `app/page.tsx`: interactive screens and reusable UI components.
- `app/data.ts`: course outlines, catalogue, sample timetable, localized hero/navigation copy.
- `app/globals.css`: design tokens, responsive layouts, light/dark styling, reduced-motion overrides.
- `public/brand.png`: supplied crescent-and-path mark.
- `public/journey.webp`: optimized generated hero illustration; original retained in `design/originals/`.
- `.openai/hosting.json`: private Sites identity and static export configuration.

## Design system

Updated Islamic identity: warm ivory `#FCF9F2`, deep jade ink `#263F38`, jade actions `#446F60`, sage surfaces, sandstone, peach, and mint. The original lavender art direction remains in the source history. Supporting surfaces use lilac, pink, butter yellow, and sky blue. Plus Jakarta Sans headings, DM Sans interface text, Noto Naskh Arabic, and Noto Nastaliq Urdu load from Google Fonts with system fallbacks. Rounded 12–24px surfaces, subtle elevation, tactile button feedback, and reduced-motion support form the component vocabulary.

## Sources and imagery

The Quran 20:114 excerpt was checked against https://quran.com/20/114. English translation: Dr. Mustafa Khattab, The Clear Quran. The supplied mark belongs to the user's project. Lucide icons use the ISC license.

Hero generated using the built-in image generation tool. Prompt: “Premium soft clay 3D diorama for Deen e Safar: a winding peach pathway through a tall lavender pointed arch, floating peach crescent, mint and butter-yellow stars, closed pastel books without text, a warm lantern and soft clouds, on warm cream. Peaceful matte studio render; no people, sacred figures, lettering, or mosque silhouettes.”

## Next phase

Separate screens into route-specific modules as the prototype grows; add reviewed religious datasets and licensed audio, complete translations, production authentication and synchronization, calculated prayer schedules, and a source-grounded AI backend. Browser notification permissions alone are not sufficient: real scheduling and delivery infrastructure is required.

## Islamic identity revision

- `public/logo-mark.svg`: scalable crescent, star, and winding mint path based on the supplied moon.
- `public/logo-light.svg` / `logo-dark.svg`: clean horizontal wordmarks; transparent PNG exports in `design/`.
- `public/app-icon.svg`: compact app icon and favicon; 512px PNG in `design/`.
- `public/haramain.webp`: optimized Makkah and Madinah montage. Gentle CSS drift and desktop pointer parallax provide motion, disabled for reduced-motion preferences. This is animated rendered artwork, not a navigable WebGL model or a geographical reconstruction.
- `public/geometry.svg`: original repeating eight-point geometric ornament.

The revised hero was made with the built-in image generation tool. Prompt: A sophisticated 3D architectural montage with the Kaaba and Madinah green dome on distinct cream stone plinths, ivory arches, peach crescent, geometric stars, soft clouds, jade and sage accents, sunrise studio lighting; no people or readable lettering. The full-resolution original is in `design/originals/haramain-original.png`.

Validation: production static build and TypeScript, browser checks of Quran search/bookmarks, course completion, reminders and AI sample response. Homepage overflow checks at 360, 390, 768, 1024, 1440, and 1920px showed no horizontal overflow.
