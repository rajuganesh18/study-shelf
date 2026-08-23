/* Offline cache. Bump VERSION whenever www/ changes. */
const VERSION = 'shelf-v20260823j';
const ASSETS = [
  "index.html",
  "exploration-chapter.html",
  "cell-chapter.html",
  "tissues-chapter.html",
  "motion-chapter.html",
  "mixtures-chapter.html",
  "forces-chapter.html",
  "energy-chapter.html",
  "atom-chapter.html",
  "bonding-chapter.html",
  "sound-chapter.html",
  "reproduction-chapter.html",
  "diversity-chapter.html",
  "earth-system-chapter.html",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "fonts/Anton-Regular.woff2",
  "fonts/IBMPlexSans-Regular.woff2",
  "fonts/IBMPlexSans-Medium.woff2",
  "fonts/IBMPlexSans-SemiBold.woff2",
  "fonts/IBMPlexMono-Regular.woff2",
  "fonts/IBMPlexMono-Medium.woff2"
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    // addAll fails the whole install if a single file 404s (fonts may not be
    // fetched yet), so add one at a time and tolerate misses.
    await Promise.all(ASSETS.map(a => c.add(a).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(n => n !== VERSION).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;
  e.respondWith((async () => {
    const hit = await caches.match(e.request, { ignoreSearch:true });
    if(hit) return hit;
    try {
      const res = await fetch(e.request);
      if(res && res.ok && new URL(e.request.url).origin === self.location.origin){
        const c = await caches.open(VERSION);
        c.put(e.request, res.clone());
      }
      return res;
    } catch(err){
      const fallback = await caches.match('index.html');
      return fallback || new Response('Offline', { status:503, headers:{'Content-Type':'text/plain'} });
    }
  })());
});
