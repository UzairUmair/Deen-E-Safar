# Visual reference analysis — Deen e Safar 2.0

This records what was taken from the two screenshots and four videos supplied for the
redesign, how each maps to the implementation, and what was and was not verified.
The references were read as direction, not copied pixel for pixel.

> **Stack note.** The brief describes a React + Vite + JSX + React Router project. The
> repository is a **Next.js 16 static export written in TypeScript** with hash-based
> routing in `app/page.tsx`. Nothing was migrated: the redesign stays on the existing
> stack, so new files are `.tsx`/`.ts` under `app/` rather than `.jsx` under `src/`.

## 1. What each reference contributed

### Image 1 — "Interactive Learning Hub" (primary design language)

| Observed | Used as |
| --- | --- |
| Cream page, dark navy type, gold-edged pill buttons | Site-wide tokens in `app/styles/design-tokens.css`; `.btn` in `animations.css` |
| Crescent-and-stars logo | Existing `public/logo-mark.svg`, kept |
| Copy left, floating ornate shelf right, three study books turned to show spine and cover | `HomeHero` + `BookshelfScene` / `BookModel` |
| Thin gilt trim, turquoise studs, soft shadow beneath the shelf | Gold strips, studs and a blob shadow on the shelf model |
| Rounded white feature cards with round tinted icons | `LearningFeatures` |
| Small four-point stars, faint orbit rings | Three small stars and an arch outline in the hero backdrop |

Not carried over: the progress numbers, "Daily Quiz / Live Study Groups" cards and
"Courses / Journey Tracker / About Us" navigation in the mock-up are placeholders for
features that do not exist. The real navigation and real sections are used instead.

### Image 2 — "Quran Explorer" (functional reader, no 3D)

| Observed | Used as |
| --- | --- |
| White surfaces, navy text, turquoise round controls | Token recolour; turquoise surah-number discs and hover states |
| Peach highlight on the active surah | Peach hover/selection tint on surah cards |
| Large Uthmani Arabic above a smaller translation | Reader typography switched to *Amiri Quran*, navy |
| Persistent audio bar | The existing listen bar is docked (sticky) under the header |

Not carried over: shuffle/repeat/speed/volume controls and the left surah sidebar shown
in the mock-up. The reader's existing controls (surah select, translation select, text
size, focus mode, verse jump, per-verse play/bookmark/copy, sequential audio) are
unchanged; adding a sidebar would be a functional rewrite outside this visual pass.

### Video 1 — Website scroll transition (Quran Explorer)

Smooth movement between verses, a clear active surah, and an audio bar that stays put
while content moves. Reproduced conceptually by the docked listen bar and the existing
scroll-to-verse behaviour; no scroll choreography was added to the reader.

### Video 2 — Chat UI cascading down

A phone on a calm surface; question bubble, answer bubble, then source cards and
actions arriving one after another from the top down. Reproduced in `AIShowcase`: the
phone rises in, then six items cascade with a 0.42 s stagger and 0.3 s transitions,
clipped inside the phone screen.

Improved on: the reference shows a generated answer. No generative model is connected
to this site, so the showcase is labelled **Illustrative preview**, the verse text is
read from the bundled Quran files (13:28, and 2:152 on a source card), and the copy
states that the assistant is currently a source finder.

### Video 3 — 3D scrolling Quran (main storytelling reference)

Closed Quran on a rehal in a bright scene → cover opens with pages fanning → background
falls to deep navy → "Surah Explorer" heading and surah cards arrive beside the open
book. This is the structure of `QuranScrollSection`.

Improved on: the reference's pages carry blurred, unreadable pseudo-script and its
surah cards show approximate calligraphy. Here the model's pages are blank with a ruled
border, and card titles come from the bundled surah index. The reference also showers
the book with particles; this uses eight slow motes.

### Video 4 — Holy Quran opens

Cover and page blocks hinge at the spine while resting on a carved rehal, warm light,
camera rising to look down onto the open pages. Used for the physical model: cover and
spine hinge separately, the book rests on the two wings of the stand, the camera lifts
from 25° to 40° elevation as it opens.

Improved on: in the reference the cover and pages pass through each other mid-turn and
the architectural background cuts to a flat page abruptly. Here every part is solved
from one cross-section (below), and the background is a continuous cross-fade.

## 2. Components

```
app/components/home/   Home, HomeHero, InteractiveBookshelf, QuranScrollSection,
                       QuranExplorerReveal, LearningFeatures, AIShowcase, FinalCTA, content.ts
app/components/three/  HomeScene (canvas), CameraRig, SceneLighting, BookshelfScene, BookModel,
                       QuranBook, QuranCover, QuranPages, QuranStand, quranRig, textures, story
app/components/motion/ AnimatedButton, RevealSection
app/hooks/             useReducedMotion, useResponsiveScene
app/styles/            design-tokens.css, animations.css, homepage.css
```

The header, mobile drawer and footer stay in `app/page.tsx` (not duplicated). The
drawer gained dialog semantics, focus trap, Escape, and focus return.

## 3. How the 3D is built

- **No downloaded models or textures.** All geometry is procedural and all surfaces are
  painted on canvases at start-up (`textures.ts`): leather with gilt geometric ornament
  (with a matching roughness/metalness map so the gilding reads as metal), paper,
  page edges, carved wood.
- **Bookshelf.** Lacquered boards with gilt strips; four hardbacks, each with boards,
  spine and page block. A hovered, focused or selected book eases 0.2 units forward
  with a faint gilt glow and a label.
- **Quran.** `quranRig.ts` solves the book in its 2D cross-section for an openness
  value 0–1. The back board never moves (it lies on the right wing of the rehal). The
  spine strip hinges on the back board; the front board hinges on the far edge of the
  spine. Both page stacks and the loose leaves are rooted at the middle of the spine,
  and each leaf profile is an exponentially relaxing curve whose landing height is
  solved with the sine integral so it settles exactly on its stack. Because every part
  comes from the same state, covers, stacks and leaves cannot drift apart.
- **Rehal.** Two planks crossing in an X; below the crossing one continues as a centre
  tongue and the other as two outer legs, as on a real folding stand.
- **Camera.** Poses are described by composition (subject, angle, share of the viewport,
  screen position) and converted to a camera each frame from the live canvas size, so
  resizing re-frames correctly. Separate pose lists for wide and portrait layouts;
  horizontal placement mirrors in RTL.

## 4. Scroll story

One `ScrollTrigger` (unsmoothed scrub, native scrolling, no wheel hijacking) spans a
sticky stage: 520vh on wide screens, 400svh on portrait. Its progress drives both the
DOM timeline and the 3D scene.

| Progress | What happens |
| --- | --- |
| 0 – 0.05 | Hero: copy, shelf, book list |
| 0.02 – 0.12 | Copy and book list rise and fade |
| 0.05 – 0.30 | Camera travels from the shelf down to the closed Quran |
| 0.30 – 0.58 | Quran opens; camera lifts; backdrop cross-fades to navy (0.38 – 0.58) |
| 0.55 – 0.62 | "Explore the Words of Guidance" and the explorer button |
| 0.65 – 0.78 | Three surah cards, staggered |
| 0.90 – 1.00 | Overlay and scene fade, backdrop returns to cream, stage releases |

## 5. Desktop and mobile

- **Wide** (≥ 900px and wider than 21:20): copy left, scene right; Quran left, copy and
  cards right in the dark phase.
- **Tall** (everything else): the hero copy is ordinary page content above the stage;
  the shelf, then the Quran, sit in the upper part of the stage with the heading,
  button and compact surah rows below, clear of the bottom navigation. Shorter track,
  fewer leaves and segments, no shadow map, device pixel ratio capped at 1.5.
- Phones under 620px tall drop secondary lines so the surah rows stay on screen.

## 6. Performance decisions and risks

| Risk | Mitigation |
| --- | --- |
| three.js is about 1 MB | Loaded only through `React.lazy` in `QuranScrollSection`; GSAP is imported dynamically. Initial JS grew from 856 KB to 874 KB raw; the three.js chunk is not referenced by `index.html`. |
| Rendering while idle | `frameloop="demand"`: frames are drawn only while scroll, pointer, hover or the intro is changing something. |
| First-use shader/texture stalls mid-scroll | Programs compiled and textures uploaded once at start-up (`Warmup`). |
| Weak or absent GPU | `useResponsiveScene` falls back to static mode (pre-rendered stills of the same models, normal page flow) for reduced motion, no WebGL, software-only WebGL, data saver, or ≤ 2 GB device memory. |
| Shadow maps on phones | Disabled on the low-power tier; soft blob shadows are used everywhere. |
| Off-screen objects | Shelf and Quran groups are hidden once out of frame. |

Remaining risk: the frame rate on real low-end phones was not measured (see below).

## 7. Final direction

Cream and ivory surfaces, navy type, gold reserved for hairlines, button edges and
ornament; turquoise, peach and lavender only as small tints. One continuous scene
carries the visitor from study books to the Quran and on to real surah links, then the
page returns to calm, flat sections. Signed-in and reading pages share the palette and
buttons but carry no 3D.

## 8. Verification record

Run in headless Chrome (software WebGL) against both the dev server and the production
export:

- `npm run build`, `npm run typecheck`, `npm run verify` — pass.
- `npm run verify:ui` — 12 browser checks pass: live story renders; scroll forward
  reveals and scroll back restores; surah cards and CTAs reach real routes; 3D hover,
  click, panel and navigation; diagonal sweep geometry, no size change, disabled state;
  no canvas on dashboard/reader/explorer/prayer/duas; mobile drawer focus handling; no
  horizontal overflow and on-screen CTAs at 320/360/390/430/768/1024/1440; Urdu RTL;
  reduced-motion fallback; WebGL-disabled fallback; AI showcase order and verse source.
- Screenshots were inspected at those breakpoints, through the opening sequence, in
  dark theme, in Urdu, and in static mode.

Not verified:

- Real GPUs, real phones, Safari and Firefox. Frame rate and battery cost are unknown.
- Touch gestures on a physical device (emulation only).
- Motion was judged from stills at scroll stops, not from recorded video.
- Urdu and Arabic interface strings for the new sections were written for this change
  and have not been reviewed by a native speaker.
- Audio playback was not re-tested (its code was not changed).
