// sw.js - offline-first service worker with dynamic caching and message-driven pre-cache
const CACHE_NAME = 'retro-player-cache-v1';
const CORE = [
  '/', '/index.html', '/manifest.json'
];

// install: cache core assets
self.addEventListener('install', evt => {
  evt.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE)).then(()=>self.skipWaiting()));
});

// activate: cleanup old caches if needed
self.addEventListener('activate', evt => {
  evt.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// fetch strategy:
// - audio/images -> cache-first (so it plays offline)
// - json / api (lyrics / iTunes) -> network-first with cache fallback
// - navigation/html -> network-first with cache fallback
self.addEventListener('fetch', event => {
  const req = event.request;
  if (!req.url.startsWith('http')) return;

  const url = new URL(req.url);

  // audio files -> cache-first
  if (req.destination === 'audio' || /\.(mp3|m4a|wav)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(resp => { caches.open(CACHE_NAME).then(c=>c.put(req, resp.clone())); return resp; }).catch(()=>cached))
    );
    return;
  }

  // images/artwork -> cache-first
  if (req.destination === 'image' || /artworkUrl100|\.png|\.jpg|\.jpeg|\.svg/i.test(req.url)) {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(resp => { caches.open(CACHE_NAME).then(c=>c.put(req, resp.clone())); return resp; }).catch(()=>cached))
    );
    return;
  }

  // json / APIs -> network-first, fallback to cache
  if (req.headers.get('accept') && req.headers.get('accept').includes('application/json') || req.url.includes('lyrics.ovh') || req.url.includes('itunes.apple.com')) {
    event.respondWith(
      fetch(req).then(resp => { const copy = resp.clone(); caches.open(CACHE_NAME).then(c=>c.put(req, copy)); return resp; }).catch(()=>caches.match(req))
    );
    return;
  }

  // navigation / html -> network-first then cache
  if (req.mode === 'navigate' || (req.headers.get('accept') && req.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(req).then(resp => { caches.open(CACHE_NAME).then(c=>c.put(req, resp.clone())); return resp; }).catch(()=>caches.match('/index.html'))
    );
    return;
  }

  // default -> cache-first
  event.respondWith(caches.match(req).then(cached => cached || fetch(req)));
});

// Listen for messages (to pre-cache a list of URLs)
self.addEventListener('message', event => {
  const msg = event.data;
  if(!msg) return;
  if(msg.type === 'cacheUrls' && Array.isArray(msg.urls)){
    caches.open(CACHE_NAME).then(cache => {
      msg.urls.forEach(url => {
        // try to add each URL; ignore failures
        fetch(url).then(resp => { if(resp.ok) cache.put(url, resp.clone()); }).catch(()=>{ });
      });
    });
  }
});
