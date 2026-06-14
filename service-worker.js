const IMAGE_CACHE = "classRecord:image-cache:v1";
const IMAGE_MANIFEST_URL = "data/image_cache_manifest.json";
const IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|gif|svg|ico|avif)$/i;

async function loadImageManifest() {
    try {
        const response = await fetch(IMAGE_MANIFEST_URL, { cache: "no-cache" });
        if (!response.ok) return [];
        const list = await response.json();
        return Array.isArray(list) ? list.filter(Boolean) : [];
    } catch {
        return [];
    }
}

self.addEventListener("install", (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(IMAGE_CACHE);
        const manifest = await loadImageManifest();
        await Promise.allSettled(manifest.map((url) => cache.add(url)));
        await self.skipWaiting();
    })());
});

self.addEventListener("activate", (event) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter((key) => key.startsWith("classRecord:image-cache:") && key !== IMAGE_CACHE).map((key) => caches.delete(key)));
        await self.clients.claim();
    })());
});

self.addEventListener("fetch", (event) => {
    const request = event.request;
    if (request.method !== "GET") return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin || !IMAGE_EXTENSIONS.test(url.pathname)) return;

    event.respondWith((async () => {
        const cache = await caches.open(IMAGE_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;

        const response = await fetch(request);
        if (response && response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    })());
});
