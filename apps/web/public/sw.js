const CACHE = "nurseos-v1";
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE)); });
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method === "GET") {
    e.respondWith(caches.match(req).then(r => r || fetch(req)));
  }
});
