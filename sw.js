// Wolvesville PWA — Service Worker
// Strategy: network-first for app shell (HTML/CSS/JS) so updates ship instantly when online.
//           cache-first for images/fonts so game art works offline.
// All paths resolved relative to the SW's location so this works at both / and /repo-name/.
const CACHE = 'wolves-v14';

const ROLE_IDS = [
  'werewolf','alpha_wolf','villager','cursed_villager','lycan',
  'seer','aura_seer','witch','hunter','bodyguard','mayor',
  'medium','trapper','gunner','priest','jester','amor',
];

// Resolve path relative to where this SW is hosted (handles GitHub Pages subpath)
const BASE = new URL('./', self.location).pathname;
const at = p => BASE + p;

const PRECACHE = [
  at(''),                       // root (index.html)
  at('index.html'),
  at('manifest.json'),
  at('src/styles.css'),
  at('src/roles.js'),
  at('src/state.js'),
  at('src/network.js'),
  at('src/ui.js'),
  at('src/host.js'),
  at('src/player.js'),
  at('src/timer.js'),
  at('src/qr.js'),
  at('src/qrscanner.js'),
  at('src/sdpcodec.js'),
  at('src/i18n.js'),
  at('src/vendor/qrcode.js'),
  at('src/vendor/jsQR.min.js'),
  at('src/vendor/simplepeer.min.js'),
  at('icons/icon-192.png'),
  at('icons/icon-512.png'),
  at('assets/fonts/cinzel-400.ttf'),
  at('assets/fonts/cinzel-600.ttf'),
  at('assets/fonts/cinzel-700.ttf'),
  at('assets/fonts/cinzel-900.ttf'),
  at('assets/fonts/cormorant-400.ttf'),
  at('assets/fonts/cormorant-400i.ttf'),
  at('assets/fonts/cormorant-600.ttf'),
  at('assets/lobby.jpg'),
  ...ROLE_IDS.map(id => at(`assets/roles/${id}.jpg`)),
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(async c => {
      // Individual add()s so a single missing asset doesn't abort the entire precache
      await Promise.all(PRECACHE.map(url => c.add(url).catch(() => {})));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isAppShell(url) {
  return /\.(html|js|mjs|css|json)$/i.test(url.pathname)
    || url.pathname === BASE
    || url.pathname.endsWith('/');
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.pathname.endsWith('/ip')) return; // always live (local server mode)

  if (isAppShell(url)) {
    // Network-first: ship code updates instantly when online, fall back to cache offline
    e.respondWith(
      fetch(e.request).then(resp => {
        if (resp && resp.status === 200 && resp.type !== 'opaque') {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => caches.match(e.request).then(c =>
        c || (e.request.mode === 'navigate' ? caches.match(at('index.html')) : undefined)
      ))
    );
    return;
  }

  // Cache-first for images, fonts, vendor binaries
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp && resp.status === 200 && resp.type !== 'opaque') {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      });
    })
  );
});
