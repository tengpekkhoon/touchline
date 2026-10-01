// Service worker: makes Touchline installable and playable offline.
// Strategy: network-first for the app's own files (so you always get the latest code when online,
// with no version juggling), falling back to the cache when offline or slow. Everything the game
// needs is precached on install. Bump CACHE when the file list changes.
const CACHE = 'touchline-v6';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './css/fonts.css',
  './js/core.js',
  './js/data.js',
  './js/clubs.js',
  './js/world.js',
  './js/engine.js',
  './js/season.js',
  './js/careers.js',
  './js/cups.js',
  './js/intl.js',
  './js/tiers.js',
  './js/contracts.js',
  './js/people.js',
  './js/scouting.js',
  './js/transfers.js',
  './js/registration.js',
  './js/market.js',
  './js/finance.js',
  './js/stories.js',
  './js/advice.js',
  './js/matchday.js',
  './js/records.js',
  './js/injuries.js',
  './js/save.js',
  './js/simrun.js',
  './js/native.js',
  './js/sim-worker.js',
  './js/ui-core.js',
  './js/ui-screens.js',
  './js/matchview.js',
  './js/matchmotion.js',
  './js/ui-extra.js',
  './js/ui-alpha.js',
  './js/ui-market.js',
  './fonts/inter-var-latin.woff2',
  './fonts/inter-var-latin-ext.woff2',
  './fonts/barlow-condensed-600-latin.woff2',
  './fonts/barlow-condensed-600-latin-ext.woff2',
  './fonts/barlow-condensed-700-latin.woff2',
  './fonts/barlow-condensed-700-latin-ext.woff2',
  './fonts/barlow-condensed-800-latin.woff2',
  './fonts/barlow-condensed-800-latin-ext.woff2',
  './fonts/barlow-condensed-900-latin.woff2',
  './fonts/barlow-condensed-900-latin-ext.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
];
// Optional online-only extra: the emoji font Windows needs for flags (phones use their own emoji)
const EXTRA_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(FILES))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('touchline-') && k !== CACHE && k !== CACHE + '-extra')
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

const timeout = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (EXTRA_HOSTS.includes(url.hostname)) {
    // cache-first: fonts never change
    e.respondWith(
      caches.open(CACHE + '-extra').then(
        async (c) =>
          (await c.match(req)) ||
          fetch(req).then((r) => {
            c.put(req, r.clone());
            return r;
          }),
      ),
    );
    return;
  }
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await Promise.race([fetch(req), timeout(4000)]);
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      } catch (err) {
        const hit = await cache.match(req, { ignoreSearch: true });
        if (hit) return hit;
        if (req.mode === 'navigate') return cache.match('./index.html');
        throw err;
      }
    })(),
  );
});
