# Version 1.3 verification

- Compiled with JDK 17, official Android API 36 and Build Tools 36.0.0.
- APK alignment and Android v2/v3 release signatures verified.
- Package com.kubus.shuttle; versionCode 4; Android 8+ (minimum API 26), target API 36; not debuggable.
- Existing release certificate retained for installation over versions 1.0–1.2.
- 38 native URL-policy checks passed.
- 430 timetable rows, 11 residence restrictions, 126 daily timetables, 860 effective-date row checks and 7,978 departure/countdown boundaries passed.
- 209 status cases, seven status transitions and 14 midnight day/status badge checks passed.
- 11 service-worker and seven registration checks passed.
- 54 bundled website files matched source bytes, including the unchanged original sixth-update PDF. No private signing files or nested APKs in the package.
- Website release: 20260914-sixth-1. Both changed services switch to Monday–Thursday from 15 September 2026, UAE time. Prior operating days apply before that date.
- Announcement visually checked on desktop and at 390×844; the current-day timetable retains its pre-effective day tags on 14 September.
- No physical Android device/emulator installation test was run. Installation over an earlier version, offline/retry, Back and rotation still need device verification.
- This describes the built release. Its public availability depends on pushing the website and APK to GitHub Pages.

Release certificate SHA-256: 22b5548725cdd32b299e4e8ac87c3bef5f3be3d623dd1253e5481d0cf5c695fb
APK SHA-256: 91339876a1a37915ecf262422520c6ae871f63ba51da059e08d65df88d41aa5c
