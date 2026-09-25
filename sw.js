const CACHE_NAME = "solargrafie-cache-v1";
const MAX_CACHE_ITEMS = 50;
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/style.css",
  "/config.js",
  "/translations.js",
  "/logo.jpg",
  "/manifest.json",
];

async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    await trimCache(cacheName, maxItems);
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache");
      return cache.addAll(ASSETS_TO_CACHE);
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  if (
    event.request.url.includes("arcgisonline.com") ||
    event.request.url.includes("openstreetmap.org")
  ) {
    return;
  }

  // Create a clean URL without the cache-busting 't' parameter for the cache key
  const urlObj = new URL(event.request.url);
  urlObj.searchParams.delete("t");
  const cacheKey = urlObj.toString();

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            // Store with the clean URL as the key
            cache.put(cacheKey, responseToCache).then(() => {
              trimCache(CACHE_NAME, MAX_CACHE_ITEMS);
            });
          });
        }
        return response;
      })
      .catch(() => {
        // Retrieve using the clean URL as the key
        return caches.match(cacheKey);
      }),
  );
});
