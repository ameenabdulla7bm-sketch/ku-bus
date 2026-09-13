#!/usr/bin/env python3
"""Run native URL-boundary tests without an emulator (uses JAVA_HOME or PATH)."""
import os
from pathlib import Path
import subprocess
import tempfile

project = Path(__file__).resolve().parent
jdk = Path(os.environ['JAVA_HOME']) / 'bin' if os.environ.get('JAVA_HOME') else None
source = r'''
package com.kubus.shuttle;
public class UrlPolicyTest {
    private static int cases;
    private static void check(boolean condition, String name) {
        cases++;
        if (!condition) throw new AssertionError(name);
    }
    public static void main(String[] args) {
        check(UrlPolicy.isLive(UrlPolicy.LIVE + "index.html#schedule"), "schedule stays in app");
        check(UrlPolicy.isLive(UrlPolicy.LIVE), "root stays in app");
        for (String url : new String[]{
            "http://ameenabdulla7bm-sketch.github.io/ku-bus/",
            "https://ameenabdulla7bm-sketch.github.io.attacker.test/ku-bus/",
            "https://ameenabdulla7bm-sketch.github.io@attacker.test/ku-bus/",
            "https://ameenabdulla7bm-sketch.github.io/another-project/",
            "https://ameenabdulla7bm-sketch.github.io/ku-bus-other/",
            UrlPolicy.LIVE + "../other/", UrlPolicy.LIVE + "%2e%2e/other/",
            UrlPolicy.LIVE + "%5cother", UrlPolicy.LIVE + "%00",
            "https://ameenabdulla7bm-sketch.github.io:444/ku-bus/",
            "file:///android_asset/site/index.html", "javascript:alert(1)", "https:foo"
        }) check(!UrlPolicy.isLive(url), "blocked live URL: " + url);
        check("index.html".equals(UrlPolicy.assetPath(UrlPolicy.LOCAL)), "local root");
        check("airline.css".equals(UrlPolicy.assetPath(UrlPolicy.LOCAL + "airline.css?v=42")), "queries ignored");
        check("assets/fonts/etihad-altis-book.woff".equals(UrlPolicy.assetPath(UrlPolicy.LOCAL + "assets/fonts/etihad-altis-book.woff")), "nested asset");
        for (String tail : new String[]{"../secret", "%2e%2e/secret", "a/../secret", "a/%2E/secret", "%5csecret", "%00"})
            check(UrlPolicy.assetPath(UrlPolicy.LOCAL + tail) == null, "blocked asset traversal: " + tail);
        check(UrlPolicy.assetPath("https://appassets.androidplatform.net.evil.test/site/index.html") == null, "lookalike asset host");
        check(UrlPolicy.externalUrl("https:foo") == null, "opaque HTTPS blocked");
        check(UrlPolicy.externalUrl("intent://install") == null, "intent URI blocked");
        check(UrlPolicy.externalUrl("file:///private") == null, "file URI blocked");
        check((UrlPolicy.LIVE + "downloads/ku-bus.apk").equals(UrlPolicy.externalUrl(UrlPolicy.LOCAL + "downloads/ku-bus.apk")), "offline APK uses public host");
        check(UrlPolicy.isDocument(UrlPolicy.LIVE + "documents/schedule.pdf?v=1"), "PDF handed off");
        check(UrlPolicy.isDocument(UrlPolicy.LIVE + "downloads/ku-bus.apk"), "APK handed off");
        check(!UrlPolicy.isDocument(UrlPolicy.LIVE + "index.html#download"), "Download tab stays in app");
        System.out.println("Passed " + cases + " URL policy checks.");
    }
}
'''
with tempfile.TemporaryDirectory() as temp:
    folder = Path(temp)
    test = folder / 'UrlPolicyTest.java'
    test.write_text(source)
    subprocess.run([str(jdk / 'javac') if jdk else 'javac', '-d', str(folder),
                    str(project / 'src/com/kubus/shuttle/UrlPolicy.java'), str(test)], check=True)
    subprocess.run([str(jdk / 'java') if jdk else 'java', '-cp', str(folder),
                    'com.kubus.shuttle.UrlPolicyTest'], check=True)
