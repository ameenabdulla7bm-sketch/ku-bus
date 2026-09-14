# Version 1.2 verification

- Compiled with JDK 17 and official Android API 36 / Build Tools 36.0.0.
- APK alignment verified; Android v2 and v3 release signatures verified.
- Package: com.kubus.shuttle. Minimum API 26, target API 36. Not debuggable.
- Version code 3; same package and signing certificate as 1.0 and 1.1 for an in-place update.
- 38 URL-policy checks passed, including origin boundaries, traversal rejection, unique launch URLs, and tab preservation.
- All 430 timetable rows, 11 restriction notes and 4,024 departure/countdown boundary regression checks passed against the independent fifth-PDF fixture.
- 125 status cases and seven repeated badge transitions passed, including off-day services, UAE midnight and exact departure boundaries.
- All 18 website cache and service-worker registration regression checks passed.
- Native launch and resume changes reviewed; fresh requests run on launch and after at least one minute in the background.
- Bundled site assets match the source. No signing keys, passwords, or nested APKs in package.
- Bundled website release: 20260914-status-1, including four navigation tabs and iPhone Home Screen setup.
- No physical Android device or emulator installation test was run. Updating from 1.0 or 1.1, background/resume, offline/retry, system Back, and system-bar rendering still need device verification.
- This verification describes the local release; publishing requires committing and pushing the website and APK.

Release certificate SHA-256: 22b5548725cdd32b299e4e8ac87c3bef5f3be3d623dd1253e5481d0cf5c695fb
APK SHA-256: ad31b3019c84f6f69d4dbdaedf3aa53d1cff10847886af03ba0919d1bb085e76
