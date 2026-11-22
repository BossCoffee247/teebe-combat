// Offline support. Network first (so updates show up straight away when online),
// falling back to the cached copy at the table with no signal.
const CACHE = 'teebe-v19.1';
const FILES = [
  './', './index.html', './styles.css', './app.js', './rules.js', './character.js', './manifest.webmanifest',
  './sheet-data.js', './sheet-view.js',
  './icons/app-icon.svg', './icons/icon-192.png', './icons/icon-512.png',
  './icons/attack.svg', './icons/change_target.svg', './icons/critical_hit.svg', './icons/dread_ambusher.svg',
  './icons/favoured_foe.svg', './icons/hunters_mark.svg', './icons/miss.svg', './icons/next_turn.svg', './icons/undo.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
