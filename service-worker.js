const CACHE_NAME = "ku-shuttle-pwa-v2-20260914-status-1";
const APP_SHELL = new URL("./index.html", self.registration.scope).href;
const NETWORK_TIMEOUT_MS = 4000;

const PRECACHE_ASSETS = [
  "./",
  "./index.html",
  "./fonts.css?v=20260914-status-1",
  "./assets/fonts/etihad-altis-book.woff",
  "./assets/fonts/etihad-altis-bold.woff",
  "./mobile.css?v=20260914-status-1",
  "./airline.css?v=20260914-status-1",
  "./script.js?v=20260914-status-1",
  "./navigation.js?v=20260914-status-1",
  "./manifest.webmanifest?v=20260914-status-1",
  "./assets/ku-bus-logo.png",
  "./assets/ku-bus-wordmark.png",
  "./assets/app-icon-180.png",
  "./assets/app-icon-192.png",
  "./assets/app-icon-512.png",
  "./assets/app-icon-maskable-512.png",
  "./assets/khalifa-university-symbol.png",
  "./documents/fall-2026-shuttle-schedule-fifth-update.pdf",
  "./assets/announcements/fall-2026-shuttle-update.png",
  "./assets/campus-main-background.png",
  "./assets/campus-san-background.png",
  "./assets/campus-masdar-background.png",
  "./assets/campus-rawda-background.png",
  "./assets/campus-kurh-background.png",
  "./assets/campus-lulu-background.png",
  "./assets/khalifa-university-logo.png",
  "./assets/ku-symbol-main.png",
  "./assets/ku-symbol-san.png",
  "./assets/ku-symbol-masdar.png",
  "./assets/ku-symbol-rawda.png",
  "./assets/ku-symbol-ummlulu.png",
  "./assets/ku-symbol-main-dark.png",
  "./assets/ku-symbol-san-dark.png",
  "./assets/ku-symbol-masdar-dark.png",
  "./assets/ku-symbol-rawda-dark.png",
  "./assets/ku-symbol-ummlulu-dark.png",
  "./assets/shuttle-hero.png",
  "./assets/ku-bus-cutout.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS.map((path) => new Request(
        new URL(path, self.registration.scope), { cache: "reload" }
      ))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    const migratingLegacyCache = names.some((name) => name.startsWith("ku-shuttle-pwa-") && !name.startsWith("ku-shuttle-pwa-v2-"));
    await Promise.all(names.filter((name) => name.startsWith("ku-shuttle-pwa-") && name !== CACHE_NAME).map((name) => caches.delete(name)));
    await self.clients.claim();

    // Old pages predate the controllerchange listener. Refresh them once so
    // they can receive this fix; future releases use the page-side listener.
    if (migratingLegacyCache) {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const scope = new URL(self.registration.scope);
      for (const client of windows) {
        const url = new URL(client.url);
        if (url.origin === scope.origin && (url.pathname === scope.pathname || url.pathname === scope.pathname + "index.html")) {
          // Do not await navigation: its fetch may need activation to finish.
          client.navigate(client.url).catch(() => {});
        }
      }
    }
  })());
});

async function navigationResponse(request) {
  const cache = await caches.open(CACHE_NAME);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);
  try {
    // Revalidate HTML instead of allowing either cache layer to pin an old UI.
    const response = await fetch(request, { cache: "no-cache", signal: controller.signal });
    if (response.ok) {
      try { await cache.put(APP_SHELL, response.clone()); } catch { /* Storage may be full. */ }
      return response;
    }
    return (await cache.match(APP_SHELL)) || response;
  } catch {
    return (await cache.match(APP_SHELL)) || new Response("KU Bus is offline. Reconnect and refresh to load the timetable.", {
      status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  } finally {
    clearTimeout(timer);
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(request.url);
  const sameOrigin = requestUrl.origin === self.location.origin;

  // APKs are explicit downloads, never large background/offline cache entries.
  if (requestUrl.pathname.endsWith(".apk") || requestUrl.pathname.endsWith(".apk.sha256")) {
    return;
  }

  if (!sameOrigin) return;

  if (request.mode === "navigate") {
    const scope = new URL(self.registration.scope);
    // Documents such as PDFs keep their real responses, even while offline.
    if (requestUrl.pathname === scope.pathname || requestUrl.pathname === scope.pathname + "index.html") {
      event.respondWith(navigationResponse(request));
    }
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => cache.match(request))
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              const responseClone = networkResponse.clone();
              event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone)).catch(() => {}));
            }

            return networkResponse;
          })
          .catch(() => {
            return new Response("Resource unavailable offline", { status: 503 });
          });
      })
  );
});
