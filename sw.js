const CACHE = 'retro-v3';
const RAIZ = '/';

self.addEventListener('install', e => {
  // Apaga tudo já na instalação
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() =>
      caches.open(CACHE).then(c => c.addAll([
        RAIZ,
        RAIZ + 'index.html',
        RAIZ + 'app.css',
        RAIZ + 'app.js',
        RAIZ + 'manifest.json'
      ]))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network first: busca online, se falhar usa cache
self.addEventListener('fetch', e => {
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(RAIZ + 'index.html'))
    );
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
