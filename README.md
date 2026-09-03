# The Study Shelf

NCERT chapters for Class 9 and 10, rebuilt as interactive missions. Offline-first,
progress saved on the device. One HTML file per chapter, one shell that lists them.

```
study-shelf/
├── package.json              Capacitor 8 + plugins
├── capacitor.config.json     app id, splash, status bar
├── RELEASE.md                APK + Play Store release guide
├── store/                    privacy policy, listing copy
├── scripts/
│   ├── build.js              src/ → www/ ; no dependencies
│   └── fetch-fonts.sh        run once, makes the app truly offline
├── src/                      what you edit
│   ├── index.html            the shelf: class → subject → chapter
│   ├── shared/               one copy of everything every page needs
│   │   ├── base.css          the design system
│   │   ├── chrome.css        back bar + safe-area insets
│   │   ├── shell.css         safe-area insets alone (the shelf's share)
│   │   ├── storage.js        the storage adapter
│   │   ├── engine.js         XP, quests, missions, the reusable games
│   │   ├── plane.js          the coordinate plane, for the maths chapters
│   │   ├── circle.js         circles, arcs and angle marks, for the same
│   │   └── boot.js           chapter start-up and the streak
│   └── chapters/             one file per chapter: config, markup, interactives
└── www/                      what ships — generated, plain static files
    ├── index.html
    ├── exploration-chapter.html    ⎫
    ├── cell-chapter.html           ⎬ one per playable chapter
    ├── …                           ⎭
    ├── sequences-chapter.html
    ├── manifest.webmanifest
    ├── service-worker.js
    ├── icons/                192, 512, maskable, 1024
    └── fonts/                empty until you run fetch-fonts.sh
```

**Edit `src/`, never `www/`.** `www/` is generated and committed, so serving it
still needs no toolchain — but a hand edit there is lost on the next build.

```bash
npm run build          # src/ → www/
npm run build:check    # fail if www/ is behind src/ ; good for CI
```

The build is one dependency-free Node script whose whole job is to paste shared
files into the pages that include them. A page pulls one in with a marker on a
line of its own — `/*@include shared/engine.js*/` inside a `<script>` or
`<style>`, `<!--@include ...-->` inside markup. Nothing else is transformed:
what you read in `src/` is what runs.

---

## 1 · Run it now, with no toolchain

```bash
cd study-shelf
npx --yes http-server www -p 5173 -c-1
```

Open `http://localhost:5173` — or, on your phone on the same Wi-Fi,
`http://<your-laptop-ip>:5173`. Chrome will offer **Add to Home Screen**;
accept it and you have an installed, offline, full-screen app with an icon.
No Android Studio needed.

> Opening `www/index.html` straight off the filesystem (`file://`) also works,
> but service workers are disabled on `file://`, so it will not be offline-
> installable. Use the server above for anything real.

## 2 · Run the tests

```bash
npm install          # once, for Playwright
npm run build
npm test
```

The suite starts its own static server, so nothing needs to be running first.
`npm test -- verify` runs a single stage; `npm run test:list` shows them all.

Each check exists because something got through: a chapter whose script died
on load from a wrong argument count, chapters paying out a daily quest the
moment they opened, a debounced save re-armed 30 times a second so progress
stopped persisting at all, and seven missions across three chapters that could
never be completed. `test/README.md` has the details, and the rule that keeps
the science honest — expected values come from the textbook, never read off
the running page.

**Adding a chapter?** Edit `test/chapters.js` and nothing else.

## 3 · Build the Android APK

**See `RELEASE.md` for the full path to a Play-uploadable AAB**, including the
target-API-36 deadline, keystore setup and the 12-tester rule. Quick version:

Needs Node 18+, a JDK 17, and Android Studio (or just the SDK + Gradle).

```bash
cd study-shelf
bash scripts/fetch-fonts.sh     # once — see §5
npm install
npm run build                   # src/ → www/
npx cap add android             # generates android/ ; run once
npm run sync                    # builds, then copies www/ in ; after every change
npx cap open android            # → Android Studio, press Run
```

Straight to an installable file, without opening the IDE:

```bash
cd android && ./gradlew assembleDebug
# android/app/build/outputs/apk/debug/app-debug.apk
```

For the Play Store, sign a release bundle:

```bash
keytool -genkey -v -keystore shelf.jks -keyalg RSA -keysize 2048 \
        -validity 10000 -alias shelf
cd android && ./gradlew bundleRelease
# android/app/build/outputs/bundle/release/app-release.aab
```

### Android icons

`npx cap add android` writes placeholder launcher icons. Replace them from
`www/icons/icon-1024.png`: in Android Studio, right-click `app/res` →
*New → Image Asset*, choose that PNG, set the background to `#0A0E1B`.
That generates every mipmap density and the adaptive-icon layers.

## 4 · Where progress lives

`www` shares one storage adapter (top of every HTML file). It picks the best
backend available and everything above it is unchanged:

| order | backend | when |
|---|---|---|
| 1 | Capacitor **Preferences** | in the native app — Android `SharedPreferences`, survives WebView data clears |
| 2 | **localStorage** | browser and installed PWA |
| 3 | `window.storage` | preview hosts |
| 4 | in-memory | last resort, so nothing ever throws |

Keys written:

- `nb.streak` — `{day, streak}`, one daily streak shared by the whole app.
  The day is the device's **local** calendar date, so the streak turns over at
  midnight where the reader is, not at 05:30 as a UTC date would in India
- `nb.sum.<chapter-id>` — `{xp, coins, done, total}`, what the shelf rolls up
- `nb.last` — the chapter the Continue card points at
- `ch01Exploration`, `ch02Cell`, `ch03Tissues`, `ch04Motion`, `ch05Mixtures` —
  full per-chapter state

`Store.owns(key)` decides what belongs to the app: anything starting `nb.` or
`ch` + a digit. Export, import and reset all go through it, so a chapter
numbered 10 or higher is covered like any other.

The shelf's **Progress & data** panel shows the live backend and can export
all of it to JSON, import it back, or reset. Export before switching phones —
there is no account and no server, by design.

## 5 · Fonts

The design system uses Anton, IBM Plex Sans and IBM Plex Mono. Nothing is
fetched from a CDN at runtime, because an app that needs the network is not
offline. `scripts/fetch-fonts.sh` downloads the six `.woff2` files into
`www/fonts/` once; both faces are SIL Open Font License, so shipping them
inside the APK is fine.

Skip it and the app still works — the CSS falls back to system faces and the
service worker tolerates the missing files. The display type just will not
look the way it was designed.

## 6 · Adding a chapter

Everything is driven by `CATALOG`, near the top of the `<script>` in
`src/index.html`. Give a chapter a `file` and an `id` and it becomes playable;
without a `file` it renders as *Coming soon*.

```js
{ n:6, t:'How Forces Affect Motion',
  id:'9-science-6', file:'forces-chapter.html' }
```

Then write `src/chapters/forces-chapter.html`. Copy the shape of an existing
one: the head and stylesheet are two include markers around a `:root` line of
chapter accent colours, and the `<script>` is

```
/*@include shared/storage.js*/     the storage adapter
const CH = { id, key, total, stages, paint }
/*@include shared/engine.js*/      XP, quests, missions, the reusable games
/*@include shared/plane.js*/       optional: a coordinate plane to draw on
/*@include shared/circle.js*/      optional: circles, arcs and angle marks
   … the chapter's own interactives, then reg()/auto() for its canvases …
/*@include shared/boot.js*/        start-up and the streak
```

`plane.js` is only for chapters that draw on axes, which most Maths ones do,
and `circle.js` for the two that draw on circles. Both use `fit()`, `arrow()`
and `mono()` from the engine, so they come after that include — and `circle.js`
uses `PLANE_BG`, so it comes after `plane.js` too. Neither owns any accents:
pass your own colours in.

`CH.id` must match the catalog `id` — that is the join the shelf uses to find
the chapter's progress. `CH.key` is where its own state lives and must start
`ch` + the chapter number, so `Store.owns` picks it up.

Note the order: `CH` is declared **between** the storage and engine includes.
The engine reads `CH.total` as it loads, so putting the include first fails with
`Cannot access 'CH' before initialization`.

Finally add the file to `ASSETS` in `www/service-worker.js`, bump `VERSION`
there so old caches are dropped, add a row to `test/chapters.js`, and run
`npm run build && npm test`.

## 7 · What is and is not built

23 of 86 catalogued chapters are playable: the whole of Class 9 Science
(*Exploration*, chapters 1–13), the whole of Class 9 Maths
(*Ganita Manjari Part 1*, chapters 1–8 — coordinates, linear polynomials, the
world of numbers, algebraic identities, circles, perimeter and area,
probability, and sequences and progressions), and Class 9 Social Science
chapters 1–2 (*Understanding Society: India and Beyond Part 1* —
Understanding Social Science, and Shaping of the Earth's Surface).
Everything else is catalogued and listed but marked *Coming soon*.

Chapter lists were sourced in August 2026. Class 9 uses the new NCF-SE 2023
books (*Exploration*, *Ganita Manjari*); NCERT's advisory of 17 March 2026
deferred new Class 10 and 11 books to 2027–28, so Class 10 is on the current
books. Social Science chapters 1 and 2, and the book's title, are now confirmed
against the printed chapters, but **chapters 3–16 remain provisional** and are
flagged in-app — Part 2 was still unreleased. Check a real copy and edit
`CATALOG`.
