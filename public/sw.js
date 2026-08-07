/*
 * Shell-only service worker.
 *
 * Deliberately does NOT cache HTML or any API response. OshiCart shows live
 * prices and stock; serving those from cache risks orders a merchant cannot
 * honour. Static assets are cached so repeat visits cost less mobile data.
 */
const SHELL_CACHE = "oshicart-shell-v1";
const CACHEABLE = /\.(css|js|woff2?|png|jpe?g|svg|webp|ico)$/i;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== SHELL_CACHE).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!CACHEABLE.test(url.pathname)) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request))
  );
});
