# KU Bus Android

Version 1.0 · package `com.kubus.shuttle` · Android 8.0 (API 26) or later.

This small native Android app opens https://ameenabdulla7bm-sketch.github.io/ku-bus/ in a WebView. Website updates appear when the live site loads. If the site cannot load, the app opens its bundled copy and displays an Offline copy banner with the bundle date and a Retry online action. The bundled timetable does not update itself; publish a new APK when refreshing that fallback. The Home, Schedule, Announcements, and Download views come from the website.

The APK supports all CPU architectures: it contains Java/Dex and public website assets, with no native libraries. The only Android permission is Internet. It does not request location, contacts, storage, notification, or package-install permissions. PDF and APK links open in the user's browser. External links stay outside the app. File access, content-provider access, mixed HTTP content, and JavaScript-to-native bridges are disabled. Android's normal TLS validation and Safe Browsing remain enabled.

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

The first build creates a release signing key and random password in the private directory. **Back up both files securely. Never upload that directory to GitHub or the website.** Future APK updates must use the same key. Increase `android:versionCode` and `android:versionName` in `AndroidManifest.xml` for each release and update the offline bundle date in `MainActivity.java`.

The original signing files for this release are stored on the project owner's Mac at:
`/Users/ameenabdulla/Documents/Codex/2026-09-12/hey/.private/ku-bus-android/`

The public site includes only the signed APK and its SHA-256 checksum. The APK download is deliberately excluded from the site's service-worker cache. After publishing the changed site and the `downloads` folder to GitHub Pages, the Download tab becomes available publicly.

## Verification

`build.py` compiles against API 36, aligns the APK, and verifies its release signature. `test_url_policy.py` covers trusted-host boundaries, path traversal, document routing, and insecure URLs. Test installation, Home/route selection, Schedule, Announcements, Download, offline startup, Retry online, system Back, and rotation on a physical Android device before announcing broad availability. A successful build/signature check is not a device installation test.

References: [Android WebView](https://developer.android.com/develop/ui/views/layout/webapps/webview), [local web content](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content), [APK signing](https://developer.android.com/tools/apksigner), [system bar insets](https://developer.android.com/develop/ui/views/layout/edge-to-edge).
