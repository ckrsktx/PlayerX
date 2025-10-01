const PLAYLIST_META = 'https://raw.githubusercontent.com/ckrsaktx/RetroPlayer/refs/heads/main/playlists.json';
let PLAYLISTS = {};
const $ = s => document.querySelector(s);
const a = $('#a'), capa = $('#capa'), disco = $('#disco'), tit = $('#tit'), art = $('#art'), playBtn = $('#playBtn'), prev = $('#prev'), next = $('#next'), shufBtn = $('#shufBtn'), roleta = $('#roleta'), pickTrigger = $('#pickTrigger'), pickBox = $('#pickBox'), pickContent = $('#pickContent'), bar = $('#bar');
let q = [], idx = 0, shuf = false, currentPl = '', played = [], rendered = 0, CHUNK = 50;

// Remove SW e limpa cache
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
  caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
}

(async () => {
  await loadPlaylistsMeta();
  buildPickBox();
  const todas = Object.keys(PLAYLISTS);
  if (todas.length) {
    const sorteada = todas[Math.floor(Math.random() * todas.length)];
    currentPl = sorteada;
    pickTrigger.textContent = `Playlist - ${sorteada}`;
    loadPl();
  }
})();

async function loadPlaylistsMeta() {
  const res = await fetch(PLAYLIST_META + '?t=' + Date.now());
  PLAYLISTS = await res.json();
}

function setAccent(color) {
  document.documentElement.style.setProperty('--accent', color);
}

function fitText(el, max = 28) {
  el.style.fontSize = el.textContent.length > max ? '.95rem' : '1.1rem';
}

// Carrega apenas dados básicos da música
async function loadTrack() {
  const t = q[idx];
  a.src = t.url;
  tit.textContent = t.title;
  art.textContent = t.artist;
  document.title = `${t.title} – ${t.artist} | Retro Player`;
  fitText(tit);

  // Carrega capa apenas quando necessário (placeholder inicial)
  capa.src = 'https://i.ibb.co/n8LFzxmb/reprodutor-de-musica-2.png';
  disco.style.opacity = 0;
  setAccent('#00ffff');

  centerTrack(); 
  markOnly(); 
  updateSession();

  // Carrega capa em background sem bloquear a interface
  loadCoverAsync(t);
}

// Carrega capa de forma assíncrona
async function loadCoverAsync(track) {
  try {
    const dz = await fetch(`https://api.deezer.com/search/track?q=${encodeURIComponent(track.artist + ' ' + track.title)}&limit=1`);
    const data = await dz.json();
    const img = data.data?.[0]?.album?.cover_small?.replace('56x56', '150x150');
    
    if (img) {
      capa.src = img;
      // Remove análise de cor para melhorar performance
    }
  } catch (e) {
    // Falha silenciosa - fallback para iTunes
    try {
      const it = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(track.artist + ' ' + track.title)}&limit=1&entity=song`);
      const itData = await it.json();
      const itImg = itData.results?.[0]?.artworkUrl100?.replace('100x100', '600x600');
      if (itImg) capa.src = itImg;
    } catch (e2) {
      // Mantém placeholder padrão
    }
  }
}

function play() { a.play().catch(() => {}); }
function pause() { a.pause(); }
function togglePlay() { a.paused ? play() : pause(); }
playBtn.onclick = togglePlay;
a.onplay = a.onpause = updateIcon;

function updateIcon() {
  playBtn.innerHTML = a.paused
    ? '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>'
    : '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
}

prev.onclick = () => skip(-1);
next.onclick = () => skip(1);

shufBtn.onclick = () => {
  shuf = !shuf;
  shufBtn.classList.toggle('on', shuf);
  shufBtn.style.background = shuf ? '#fff' : '';
  shufBtn.style.color = shuf ? '#000' : '';
  shufBtn.querySelector('svg').style.stroke = shuf ? '#000' : 'var(--fg)';
  loadPl();
};

function skip(d) { 
  idx = (idx + d + q.length) % q.length; 
  loadTrack(); 
  play(); 
}

function centerTrack() { 
  const li = roleta.children[idx]; 
  if (li) li.scrollIntoView({ block: 'center', behavior: 'smooth' }); 
}

function markOnly() {
  document.querySelectorAll('li').forEach((li, i) => li.classList.toggle('on', i === idx));
}

function updateSession() {
  const t = q[idx];
  if (!t) return;
  
  navigator.mediaSession.metadata = new MediaMetadata({
    title: t.title,
    artist: t.artist,
    artwork: [{ src: capa.src, sizes: '512x512', type: 'image/png' }]
  });
  
  navigator.mediaSession.setActionHandler('play', play);
  navigator.mediaSession.setActionHandler('pause', pause);
  navigator.mediaSession.setActionHandler('previoustrack', () => skip(-1));
  navigator.mediaSession.setActionHandler('nexttrack', () => skip(1));
}

function buildPickBox() {
  pickContent.innerHTML = '';
  Object.keys(PLAYLISTS).forEach(pl => {
    const b = document.createElement('span');
    b.className = 'bubble';
    b.textContent = pl;
    b.onclick = () => {
      document.querySelectorAll('.bubble').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      currentPl = pl;
      loadPl();
      pickBox.classList.remove('on');
    };
    if (pl === currentPl) b.classList.add('on');
    pickContent.append(b);
  });
}

pickTrigger.onclick = () => { 
  buildPickBox(); 
  pickBox.classList.add('on'); 
};

pickBox.onclick = (e) => { 
  if (e.target === pickBox) pickBox.classList.remove('on'); 
};

function shufflePool() {
  const pool = q.map((_, i) => i).filter(i => !played.includes(i));
  if (!pool.length) played = [];
  const pick = pool[Math.floor(Math.random() * pool.length)];
  played.push(pick);
  return pick;
}

// Carrega playlist com lazy loading otimizado
async function loadPl() {
  q = []; 
  rendered = 0; 
  played = []; 
  idx = 0;
  roleta.innerHTML = '';
  tit.textContent = '–'; 
  art.textContent = '–';
  a.src = '';

  const busted = PLAYLISTS[currentPl] + '?t=' + Date.now();
  try {
    const res = await fetch(busted);
    q = await res.json();
  } catch (e) {
    alert('Erro ao carregar playlist.');
    return;
  }

  played = [];
  idx = shuf ? shufflePool() : 0;
  rendered = 0;
  renderPartial();
  loadTrack();
  a.pause();
  updateIcon();
  pickTrigger.textContent = `Playlist - ${currentPl}`;
  bar.classList.remove('disabled');
}

// Renderização lazy mais eficiente
function renderPartial(qtd = 30) {
  const frag = document.createDocumentFragment();
  const end = Math.min(rendered + qtd, q.length);
  
  for (let i = rendered; i < end; i++) {
    const t = q[i];
    const li = document.createElement('li');
    li.innerHTML = `<span class="mus">${t.title}</span><span class="art">${t.artist}</span>`;
    li.onclick = () => { 
      idx = i; 
      loadTrack(); 
      play(); 
    };
    frag.append(li);
  }
  
  rendered = end;
  roleta.append(frag);
  markOnly();
}

// Scroll throttling para melhor performance
let scrollTimeout;
roleta.onscroll = () => {
  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    if (rendered >= q.length) return;
    if (roleta.scrollTop + roleta.clientHeight >= roleta.scrollHeight - 100) {
      renderPartial(30);
    }
  }, 50);
};

a.onended = () => {
  if (shuf) idx = shufflePool();
  else idx = (idx + 1) % q.length;
  loadTrack(); 
  play();
};

// Keep-alive simplificado
function startKeepAlive() {
  setInterval(() => {
    if (!a.paused && a.currentTime > a.duration - 5) {
      a.dispatchEvent(new Event('ended'));
    }
  }, 10000);
}

a.addEventListener('play', startKeepAlive);

$('#atualizar').onclick = async () => {
  await loadPlaylistsMeta();
  const busted = PLAYLISTS[currentPl] + '?t=' + Date.now();
  try {
    const res = await fetch(busted);
    q = await res.json();
    played = []; 
    idx = 0;
    shuf = false; 
    shufBtn.classList.remove('on');
    shufBtn.style.background = '';
    shufBtn.style.color = '';
    shufBtn.querySelector('svg').style.stroke = 'var(--fg)';
    renderPartial(); 
    loadTrack(); 
    updateIcon();
  } catch (e) {
    alert('Erro ao buscar nova versão.');
  }
};