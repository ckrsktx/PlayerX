const PLAYLIST_META = 'https://raw.githubusercontent.com/ckrsaktx/RetroPlayer/refs/heads/main/playlists.json';
let PLAYLISTS = {};
const $ = s => document.querySelector(s);

// Elementos
const a = $('#a');
const capa = $('#capa');
const tit = $('#tit');
const art = $('#art');
const playBtn = $('#playBtn');
const prev = $('#prev');
const next = $('#next');
const shufBtn = $('#shufBtn');
const roleta = $('#roleta');
const pickTrigger = $('#pickTrigger');
const pickBox = $('#pickBox');
const pickContent = $('#pickContent');

// Estado
let q = [];
let idx = 0;
let shuf = false;
let currentPl = '';

// Inicialização
(async function init() {
  await loadPlaylistsMeta();
  buildPickBox();
  
  const playlists = Object.keys(PLAYLISTS);
  if (playlists.length) {
    currentPl = playlists[0];
    pickTrigger.textContent = `Playlist - ${currentPl}`;
    await loadPl();
  }
})();

// Funções básicas
async function loadPlaylistsMeta() {
  try {
    const res = await fetch(PLAYLIST_META);
    PLAYLISTS = await res.json();
  } catch (e) {
    console.error('Erro ao carregar playlists:', e);
  }
}

function buildPickBox() {
  pickContent.innerHTML = '';
  Object.keys(PLAYLISTS).forEach(pl => {
    const bubble = document.createElement('span');
    bubble.className = 'bubble';
    bubble.textContent = pl;
    bubble.onclick = () => {
      currentPl = pl;
      pickTrigger.textContent = `Playlist - ${pl}`;
      pickBox.classList.remove('on');
      loadPl();
    };
    pickContent.appendChild(bubble);
  });
}

// Carregar playlist
async function loadPl() {
  try {
    const res = await fetch(PLAYLISTS[currentPl]);
    q = await res.json();
    
    idx = 0;
    renderPlaylist();
    loadCurrentTrack();
    
  } catch (e) {
    console.error('Erro ao carregar playlist:', e);
    alert('Erro ao carregar playlist');
  }
}

// Renderizar lista de músicas
function renderPlaylist() {
  roleta.innerHTML = '';
  
  q.forEach((track, i) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="mus">${track.title}</span>
      <span class="art">${track.artist}</span>
    `;
    li.onclick = () => {
      idx = i;
      loadCurrentTrack();
      play();
    };
    roleta.appendChild(li);
  });
}

// Carregar track atual
function loadCurrentTrack() {
  if (!q[idx]) return;
  
  const track = q[idx];
  
  // Atualizar interface
  tit.textContent = track.title;
  art.textContent = track.artist;
  a.src = track.url;
  
  // Resetar capa
  capa.src = 'https://i.ibb.co/n8LFzxmb/reprodutor-de-musica-2.png';
  
  // Marcar track atual
  document.querySelectorAll('#roleta li').forEach((li, i) => {
    li.classList.toggle('on', i === idx);
  });
  
  // Carregar capa em background
  loadTrackCover(track);
}

// Carregar capa da música (assíncrono)
async function loadTrackCover(track) {
  try {
    // Tentar Deezer primeiro
    const dzResponse = await fetch(
      `https://api.deezer.com/search/track?q=${encodeURIComponent(track.artist + ' ' + track.title)}&limit=1`
    );
    const dzData = await dzResponse.json();
    
    if (dzData.data?.[0]?.album?.cover_medium) {
      capa.src = dzData.data[0].album.cover_medium;
      return;
    }
  } catch (e) {}
  
  try {
    // Fallback para iTunes
    const itResponse = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(track.artist + ' ' + track.title)}&limit=1&entity=song`
    );
    const itData = await itResponse.json();
    
    if (itData.results?.[0]?.artworkUrl100) {
      capa.src = itData.results[0].artworkUrl100.replace('100x100', '300x300');
    }
  } catch (e) {}
}

// Controles de player
function play() {
  a.play().catch(e => console.log('Erro ao reproduzir:', e));
}

function pause() {
  a.pause();
}

function togglePlay() {
  if (a.paused) {
    play();
  } else {
    pause();
  }
}

function skip(direction) {
  if (shuf) {
    // Shuffle simples
    idx = Math.floor(Math.random() * q.length);
  } else {
    // Próxima/anterior
    idx = (idx + direction + q.length) % q.length;
  }
  loadCurrentTrack();
  play();
}

// Event listeners
playBtn.onclick = togglePlay;

prev.onclick = () => skip(-1);
next.onclick = () => skip(1);

shufBtn.onclick = () => {
  shuf = !shuf;
  shufBtn.classList.toggle('on', shuf);
};

pickTrigger.onclick = () => {
  pickBox.classList.add('on');
};

pickBox.onclick = (e) => {
  if (e.target === pickBox) {
    pickBox.classList.remove('on');
  }
};

// Quando a música terminar
a.onended = () => {
  skip(1);
};

// Atualizar botão play/pause
a.onplay = () => {
  playBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
};

a.onpause = () => {
  playBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
};

// Atualizar session do media
a.onloadedmetadata = () => {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: q[idx]?.title || '',
      artist: q[idx]?.artist || '',
      artwork: [
        { src: capa.src, sizes: '300x300', type: 'image/jpeg' }
      ]
    });
  }
};