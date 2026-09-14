# KU Bus Android

Version 1.3 · package `com.kubus.shuttle` · Android 8.0 (API 26) or later.

This small native Android app opens https://ameenabdulla7bm-sketch.github.io/ku-bus/ in a WebView. Version 1.1 requests a fresh page on launch and after at least one minute in the background. Each request uses a unique URL and revalidation headers to avoid an old cached page; the current navigation tab is preserved. The Home, Schedule, Announcements, and Download views come from the website.

If the site cannot load, the app opens its bundled copy and displays an Offline copy banner identifying the sixth Fall 2026 schedule and a Retry online action. The bundled timetable does not update itself; publish a new APK when refreshing that fallback. The online and bundled pages have separate route-selection storage.

Install version 1.3 over versions 1.0–1.2 to receive the sixth-update timetable and corrected schedule-status badges and the native refresh behavior. It uses the same package and release signing key, with versionCode 4. Future website changes load from the live site; a new APK is needed only for native changes or a new bundled offline copy.

The APK supports all CPU architectures: it contains Java/Dex and public website assets, with no native libraries. The only Android permission is Internet. It does not request location, contacts, storage, notification, or package-install permissions. PDF and APK links open in the user's browser. External links stay outside the app. File access, content-provider access, mixed HTTP content, and JavaScript-to-native bridges are disabled. Android's normal TLS validation and Safe Browsing remain enabled.

The 1.3 offline bundle includes the sixth Fall 2026 schedule and its original PDF. It replaces the fourth-update fallback from 1.0.

## Build

Requirements: Python 3.9+, JDK 17, Android SDK Platform 36 and Android SDK Build Tools 36.0.0. This uses the official `aapt2`, `d8`, `zipalign`, and `apksigner` tools directly, so Gradle and Android Studio are not required.

```sh
python3 build.py \
  --java-home /absolute/path/to/jdk/Contents/Home \
  --build-tools /absolute/path/to/android-sdk/build-tools/36.0.0 \
  --android-jar /absolute/path/to/android-sdk/platforms/android-36/android.jar \
  --site /absolute/path/to/ku-bus \
  --signing-dir /private/path/outside/the/repository \
  --output /absolute/path/to/ku-bus/downloads/ku-bus.apk
```

The first build creates a release signing key and random password in the private directory. **Back up both files securely. Never upload that directory to GitHub or the website.** Future APK updates must use the same key. Increase `android:versionCode` and `android:versionName` in `AndroidManifest.xml` for each release, and update the user agent/offline label in `MainActivity.java` and build parameter in `UrlPolicy.java`.

The original signing files for this release are stored on the project owner's Mac at:
`/Users/ameenabdulla/Documents/Codex/2026-09-12/hey/.private/ku-bus-android/`

The public site includes only the signed APK and its SHA-256 checksum. The APK download is deliberately excluded from the site's service-worker cache. After publishing the changed site and the `downloads` folder to GitHub Pages, the Download tab becomes available publicly.

## Verification

`build.py` compiles against API 36, aligns the APK, and verifies its release signature. `test_url_policy.py` has 38 checks covering trusted-host boundaries, path traversal, document routing, insecure URLs, and fresh launch URLs with tab preservation. Test installation over 1.0, background/resume refresh, Home/route selection, Schedule, Announcements, Download, offline startup, Retry online, system Back, and rotation on a physical Android device before announcing broad availability. A successful build/signature check is not a device installation test.

References: [Android WebView](https://developer.android.com/develop/ui/views/layout/webapps/webview), [local web content](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content), [APK signing](https://developer.android.com/tools/apksigner), [system bar insets](https://developer.android.com/develop/ui/views/layout/edge-to-edge).

Version 1.3 also fixes the offline timetable status badges: Scheduled (green) and Departed (red) apply only to today in UAE time; other service days show Not today (neutral). The sixth update changes Main → SAN at 11:35 AM and SAN → Main at 12:50 PM to Monday–Thursday from 15 September 2026; earlier dates retain the previous restrictions. Friday and weekend service is unchanged.
