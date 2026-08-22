# Release guide

Two outputs, two different purposes:

| | file | signed with | use |
|---|---|---|---|
| **APK** | `app-debug.apk` / `app-release.apk` | debug key / your key | sideload to a phone, share by WhatsApp, test |
| **AAB** | `app-release.aab` | your upload key | the only format Play accepts for a new app |

You cannot upload an APK to Play. You cannot install an AAB on a phone directly.

---

## Before anything: two deadlines that apply to you right now

**1 · Target API 36 by 31 August 2026.** From that date Play rejects any new app or
update that targets below Android 16 (API 36). Capacitor's default is lower, so
**you must bump it manually** — step 2 below. An extension to 1 November is
available in Play Console, but only after you are flagged, so just target 36.

**2 · The 12-tester rule.** If your Play developer account is a *personal* account
created after 13 November 2023, you cannot publish to production until you have
run a **closed test with at least 12 testers opted in continuously for 14 days**.
Organisation accounts (which need a D-U-N-S number, 2–4 weeks) are exempt.

So the realistic timeline to a public listing is **about three weeks**, not three
days. Start the closed test on day one and prepare the store listing while the
fortnight runs. Sideloadable APKs are available immediately and are unaffected.

---

## 1 · One-time setup

Needs Node 18+, JDK 17, and the Android SDK (Android Studio is the easy way).

```bash
cd study-shelf
bash scripts/fetch-fonts.sh    # do this first — it changes files that get bundled
npm install
npm run build                  # src/ → www/
npx cap add android            # generates android/ ; run once, ever
npm run sync                   # builds, then copies www/ into the native project
```

Re-run `npm run sync` after **every** change to `src/`. Forgetting this is the
single most common "why didn't my change show up" moment. `npm run sync` builds
first, so it cannot ship a `www/` that is behind `src/`; `npm run build:check`
fails if the two have drifted, which is what you want in CI.

## 2 · Set the target API and version — required

Open `android/variables.gradle` and set:

```gradle
ext {
    minSdkVersion = 23
    compileSdkVersion = 36
    targetSdkVersion = 36        // required by Play from 31 Aug 2026
    androidxActivityVersion = '1.9.2'
    // leave the rest as Capacitor generated it
}
```

Then in `android/app/build.gradle`, inside `android { defaultConfig { … } }`:

```gradle
versionCode 1                    // integer, MUST increase on every single upload
versionName "1.0.0"              // the string users see
```

`versionCode` is the one people get wrong. Play rejects a bundle whose
`versionCode` is not strictly greater than anything you have uploaded before —
including to a test track, including builds you later deleted.

### Android 16 behaviour worth checking on a tablet

API 36 makes edge-to-edge mandatory and **ignores orientation locks on screens
600dp and wider**, so `"orientation": "portrait"` in `capacitor.config.json` will
not hold on a tablet. The app's CSS already handles the safe-area insets, but do
look at a large screen in landscape before you ship.

## 3 · Debug APK — for sideloading today

```bash
cd android && ./gradlew assembleDebug
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`

Copy it to a phone and open it (allow "install unknown apps" for your file
manager). This is the build to hand to your 12 testers' devices for a smoke test
before you set up the Play track — but note that testers must install from
**Play** for the closed-test clock to count.

## 4 · Create an upload key — do this once, then never lose it

```bash
keytool -genkey -v -keystore shelf-upload.jks -keyalg RSA -keysize 2048 \
        -validity 10000 -alias shelf
```

> **Back this file up somewhere you will still have in five years,** along with
> both passwords. With Play App Signing (on by default) a lost upload key can be
> reset by Google, but losing it is still days of support back-and-forth. Keep it
> out of git — `.gitignore` already excludes `*.jks`.

Put the credentials in `android/keystore.properties` (**not** committed):

```properties
storeFile=../../shelf-upload.jks
storePassword=…
keyAlias=shelf
keyPassword=…
```

And wire it up in `android/app/build.gradle`, above the `android { }` block:

```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
```

then inside `android { }`:

```gradle
signingConfigs {
    release {
        storeFile file(keystoreProperties['storeFile'])
        storePassword keystoreProperties['storePassword']
        keyAlias keystoreProperties['keyAlias']
        keyPassword keystoreProperties['keyPassword']
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false          // no JS minifier involved; keep it simple
        shrinkResources false
    }
}
```

## 5 · Signed release builds

```bash
cd android
./gradlew bundleRelease     # → app/build/outputs/bundle/release/app-release.aab   ← upload this
./gradlew assembleRelease   # → app/build/outputs/apk/release/app-release.apk      ← sideload this
```

Verify the AAB before uploading, using Google's `bundletool`:

```bash
bundletool build-apks --bundle=app-release.aab --output=shelf.apks \
  --ks=../shelf-upload.jks --ks-key-alias=shelf --mode=universal
bundletool install-apks --apks=shelf.apks     # installs on a connected device
```

That catches "works in debug, broken in release" before Google's review does.

---

## 6 · Play Console, in order

1. **Register** — $25 once, at play.google.com/console. Identity verification takes
   a day or two. Pick *personal* or *organisation* deliberately; see the 12-tester
   note above.
2. **Create app** — name, default language English (India), *App*, *Free*.
3. **App content** — the declarations. For this app:
   - **Privacy policy**: required for every app. `store/privacy-policy.html` in
     this repo is ready to publish; host it on GitHub Pages and paste the URL.
   - **Data safety**: the app collects nothing and transmits nothing. Answer
     *no data collected*, *no data shared*. Progress is device-local, which is
     exactly what the privacy policy says.
   - **Ads**: no.
   - **Target audience**: this is the one that needs thought. Class 9–10 students
     are roughly 14–16. Selecting any band **under 13 pulls you into the Families
     policy** with substantially more requirements. Selecting **13–15 and 16–17**
     reflects the real audience and keeps the obligations lighter. Do not tick
     under-13 unless you mean it.
   - **Content rating**: fill the IARC questionnaire honestly — no violence, no
     user content, no purchases. It will come back *Everyone / 3+*.
   - **Government apps**: no. **Financial features**: none.
4. **Store listing** — copy from `store/listing.md`. You need a 512×512 icon
   (`www/icons/icon-1024.png`, resized), a 1024×500 feature graphic, and at least
   **two phone screenshots**. Screenshots of the shelf, a canvas bench mid-motion,
   and the boss battle sell it better than any text.
5. **Closed testing** → *Testing → Closed testing → Create track*. Upload the AAB,
   add 12+ testers by email, send them the opt-in link. Each tester must click
   *Become a tester* **and install from Play** while signed into that exact
   account. Recruit 15, not 12 — if the count drops below 12 the 14-day clock
   restarts.
6. **Apply for production access** after 14 continuous days. Google asks how you
   tested and what you changed; answer concretely, citing real tester feedback.
   Review is usually under a week. Rejections are far more often for *thin tester
   engagement* than for a missing tester.
7. **Production** → upload, set rollout to 100% (or staged), submit.

## 7 · Shipping an update

```bash
# edit www/ …
npx cap sync android
# bump versionCode (and versionName) in android/app/build.gradle
cd android && ./gradlew bundleRelease
```

Also bump `VERSION` in `www/service-worker.js` whenever `www/` changes, or
returning users keep the old cached pages.

---

## Common failures

| symptom | cause |
|---|---|
| Play rejects: "target API level" | `targetSdkVersion` below 36 in `variables.gradle` |
| Play rejects: "version code already used" | `versionCode` not incremented |
| "App not installed" on sideload | an older build signed with a different key is installed; uninstall first |
| Changes don't appear in the app | forgot `npx cap sync android` |
| Blank white screen on launch | `webDir` wrong in `capacitor.config.json`, or `www/index.html` missing |
| Fonts look wrong in the APK | `scripts/fetch-fonts.sh` was never run |
| Stale content after update | `VERSION` in `service-worker.js` not bumped |
