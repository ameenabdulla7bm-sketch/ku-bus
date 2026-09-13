const CACHE_NAME = "ku-shuttle-pwa-20260913-wordmark-1";

const PRECACHE_ASSETS = [
  "./",
  "./index.html",
  "./fonts.css?v=20260913-wordmark-1",
  "./assets/fonts/etihad-altis-book.woff",
  "./assets/fonts/etihad-altis-bold.woff",
  "./mobile.css?v=20260913-wordmark-1",
  "./airline.css?v=20260913-wordmark-1",
  "./script.js?v=20260913-wordmark-1",
  "./navigation.js?v=20260913-wordmark-1",
  "./manifest.webmanifest?v=20260913-wordmark-1",
  "./assets/ku-bus-logo.png",
  "./assets/ku-bus-wordmark.png",
  "./assets/app-icon-180.png",
  "./assets/app-icon-192.png",
  "./assets/app-icon-512.png",
  "./assets/app-icon-maskable-512.png",
  "./assets/khalifa-university-symbol.png",
  "./documents/fall-2026-shuttle-schedule-fourth-update.pdf",
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
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith("ku-shuttle-pwa-") && cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(request.url);
  const sameOrigin = requestUrl.origin === self.location.origin;

  if (!sameOrigin) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
            }

            return networkResponse;
          })
          .catch(() => {
            if (request.mode === "navigate") {
              return caches.match("./index.html");
            }

            return caches.match(request);
          });
      })
  );
});
