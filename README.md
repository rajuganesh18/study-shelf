# The Study Shelf

NCERT chapters for Class 9 and 10, rebuilt as interactive missions. Offline-first,
progress saved on the device. One HTML file per chapter, one shell that lists them.

```
study-shelf/
├── package.json              Capacitor 8 + plugins
├── capacitor.config.json     app id, splash, status bar
├── RELEASE.md                APK + Play Store release guide
├── store/                    privacy policy, listing copy
├── scripts/fetch-fonts.sh    run once, makes the app truly offline
└── www/                      the whole app — plain static files
    ├── index.html            the shelf: class → subject → chapter
    ├── exploration-chapter.html
    ├── tissues-chapter.html
    ├── motion-chapter.html
    ├── manifest.webmanifest
    ├── service-worker.js
    ├── icons/                192, 512, maskable, 1024
    └── fonts/                empty until you run fetch-fonts.sh
```

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

## 2 · Build the Android APK

**See `RELEASE.md` for the full path to a Play-uploadable AAB**, including the
target-API-36 deadline, keystore setup and the 12-tester rule. Quick version:

Needs Node 18+, a JDK 17, and Android Studio (or just the SDK + Gradle).

```bash
cd study-shelf
bash scripts/fetch-fonts.sh     # once — see §4
npm install
npx cap add android             # generates android/ ; run once
npx cap sync android            # copies www/ in ; run after every change
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

## 3 · Where progress lives

`www` shares one storage adapter (top of every HTML file). It picks the best
backend available and everything above it is unchanged:

| order | backend | when |
|---|---|---|
| 1 | Capacitor **Preferences** | in the native app — Android `SharedPreferences`, survives WebView data clears |
| 2 | **localStorage** | browser and installed PWA |
| 3 | `window.storage` | preview hosts |
| 4 | in-memory | last resort, so nothing ever throws |

Keys written:

- `nb.streak` — `{day, streak}`, one daily streak shared by the whole app
- `nb.sum.<chapter-id>` — `{xp, coins, done, total}`, what the shelf rolls up
- `nb.last` — the chapter the Continue card points at
- `ch01Exploration`, `ch03Tissues`, `ch04Motion` — full per-chapter state

The shelf's **Progress & data** panel shows the live backend and can export
all of it to JSON, import it back, or reset. Export before switching phones —
there is no account and no server, by design.

## 4 · Fonts

The design system uses Anton, IBM Plex Sans and IBM Plex Mono. Nothing is
fetched from a CDN at runtime, because an app that needs the network is not
offline. `scripts/fetch-fonts.sh` downloads the six `.woff2` files into
`www/fonts/` once; both faces are SIL Open Font License, so shipping them
inside the APK is fine.

Skip it and the app still works — the CSS falls back to system faces and the
service worker tolerates the missing files. The display type just will not
look the way it was designed.

## 5 · Adding a chapter

Everything is driven by `CATALOG`, near the top of the `<script>` in
`www/index.html`. Give a chapter a `file` and an `id` and it becomes playable;
without a `file` it renders as *Coming soon*.

```js
{ n:2, t:'Cell: The Building Block of Life',
  id:'9-science-2', file:'cell-chapter.html' }
```

Then drop `cell-chapter.html` into `www/`, add it to `ASSETS` in
`service-worker.js`, and bump `VERSION` there so old caches are dropped.
The chapter's own `CH.id` must match the catalog `id` — that is the join
the shelf uses to find its progress.

## 6 · What is and is not built

3 of 86 catalogued chapters are playable: Class 9 Science chapters 1, 3 and 4.
Everything else is catalogued and listed but marked *Coming soon*.

Chapter lists were sourced in August 2026. Class 9 uses the new NCF-SE 2023
books (*Exploration*, *Ganita Manjari*); NCERT's advisory of 17 March 2026
deferred new Class 10 and 11 books to 2027–28, so Class 10 is on the current
books. **Class 9 Social Science chapter titles are provisional** and flagged
in-app — Part 2 was unreleased and sources disagreed on the book's title.
Check a real copy and edit `CATALOG`.
