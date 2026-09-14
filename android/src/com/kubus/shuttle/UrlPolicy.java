package com.kubus.shuttle;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;

/** Exact hosts and path prefixes, never substring-based trust decisions. */
final class UrlPolicy {
    static final String LIVE = "https://ameenabdulla7bm-sketch.github.io/ku-bus/";
    static final String LOCAL = "https://appassets.androidplatform.net/site/";

    static String freshPageUrl(String currentUrl, long requestId) {
        String section = "home";
        URI current = parse(currentUrl);
        if (current != null && (isLive(currentUrl) || assetPath(currentUrl) != null)) {
            String fragment = current.getFragment();
            if ("home".equals(fragment) || "schedule".equals(fragment)
                    || "announcements".equals(fragment) || "download".equals(fragment)) {
                section = fragment;
            }
        }
        // A new URL also bypasses exact entries in legacy service-worker caches.
        return LIVE + "index.html?app=android&build=4&refresh=" + requestId + "#" + section;
    }

    private static URI parse(String url) {
        try { return new URI(url); }
        catch (URISyntaxException | NullPointerException e) { return null; }
    }

    private static boolean secure(URI uri) {
        return uri != null && "https".equalsIgnoreCase(uri.getScheme())
            && uri.getHost() != null && !uri.getHost().isEmpty()
            && uri.getUserInfo() == null && (uri.getPort() == -1 || uri.getPort() == 443);
    }

    private static boolean safePath(String path) {
        if (path == null || path.indexOf('\\') >= 0 || path.indexOf('\0') >= 0) return false;
        for (String segment : path.split("/")) {
            if (segment.equals(".") || segment.equals("..")) return false;
        }
        return true;
    }

    static boolean isLive(String url) {
        URI uri = parse(url);
        return secure(uri) && "ameenabdulla7bm-sketch.github.io".equalsIgnoreCase(uri.getHost())
            && safePath(uri.getPath()) && uri.getPath().startsWith("/ku-bus/");
    }

    static String assetPath(String url) {
        URI uri = parse(url);
        if (!secure(uri) || !"appassets.androidplatform.net".equalsIgnoreCase(uri.getHost())) return null;
        String path = uri.getPath();
        if (!safePath(path) || !path.startsWith("/site/")) return null;
        String relative = path.substring("/site/".length());
        return relative.isEmpty() ? "index.html" : relative;
    }

    static boolean isDocument(String url) {
        URI uri = parse(url);
        if (uri == null || uri.getPath() == null) return false;
        String path = uri.getPath().toLowerCase(Locale.ROOT);
        return path.endsWith(".pdf") || path.endsWith(".apk");
    }

    static String externalUrl(String url) {
        String path = assetPath(url);
        if (path != null) return LIVE + path;
        URI uri = parse(url);
        return secure(uri) ? url : null;
    }
}
