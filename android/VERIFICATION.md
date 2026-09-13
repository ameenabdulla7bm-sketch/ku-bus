# Version 1.0 verification

- Compiled with JDK 17 and official Android API 36 / Build Tools 36.0.0.
- APK alignment verified; Android v2 and v3 release signatures verified.
- Package: com.kubus.shuttle. Minimum API 26, target API 36. Not debuggable.
- 32 URL-policy checks passed, including origin boundaries and traversal rejection.
- Public download served successfully; downloaded bytes match the release SHA-256.
- Bundled site assets match the source. No signing keys, passwords, or nested APKs in package.
- Website Download view and all four navigation targets verified. Home fits 320×568 and 981×600 without overflow.
- No physical Android device or emulator installation test was run. Installation, offline/retry, system Back, and system-bar rendering still need device verification.

Release certificate SHA-256: 22b5548725cdd32b299e4e8ac87c3bef5f3be3d623dd1253e5481d0cf5c695fb
APK SHA-256: 126b67480e9cc13c9da9e13deb1ad61176f0c4e1ee27d471476111d150f8f3bc
