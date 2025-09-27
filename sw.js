const CACHE = 'retro-v1';
const ESSENCIAL = ['./', './index.html', './app.css', './app.js', './manifest.json'];

// Limpa lixo de SW antigo ao ativar
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

// Só cacheia ESSENCIAL quando usuário ESCOLHER playlist
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ESSENCIAL)));
  self.skipWaiting();
});

// Áudio = streaming, não ocupa espaço
self.addEventListener('fetch', e => {
  if (e.request.url.match(/\.(mp3|m4a|ogg)(\?.*)?$/i)) return;   // deixa passar
  if (e.request.mode === 'navigate') {
    e.respondWith(caches.match('./index.html'));
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
