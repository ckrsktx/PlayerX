/********************************************************************
 *  Retro Player  –  versão “zero efeitos / carrega só ao clicar”   *
 ********************************************************************/

const PLAYLIST_META = 'https://raw.githubusercontent.com/ckrsktx/RetroPlayer/refs/heads/main/playlists.json';
let PLAYLISTS = {};          // mapa nome → url
let q      = [];             // fila atual
let idx    = 0;              // índice da faixa
let shuf   = false;          // aleatório ligado?
let currentPl = '';          // nome da playlist ativa
let rendered = 0;            // quantas <li> já renderizadas
const CHUNK = 50;            // renderização sob-demanda

// atalhos DOM
const $ = s => document.querySelector(s);
const a   = $('#a');
const tit = $('#tit'), art = $('#art'), capa = $('#capa');
const playBtn = $('#playBtn'), prev = $('#prev'), next = $('#next'), shufBtn = $('#shufBtn');
const roleta = $('#roleta'), pickTrigger = $('#pickTrigger'), pickBox = $('#pickBox'), pickContent = $('#pickContent');

/* ---------- inicialização ---------- */
(async () => {
  await fetchPlaylistMeta();          // só baixa o índice
  buildPickBox();                     // monta lista de gêneros
})();

async function fetchPlaylistMeta() {
  const res = await fetch(PLAYLIST_META + '?t=' + Date.now());
  PLAYLISTS = await res.json();
}

/* ---------- controles básicos ---------- */
function togglePlay() { a.paused ? a.play() : a.pause(); }
playBtn.onclick = togglePlay;
a.onplay = a.onpause = () => {
  playBtn.innerHTML = a.paused
    ? '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>'
    : '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
};
prev.onclick = () => { idx = (idx - 1 + q.length) % q.length; loadAndPlay(); };
next.onclick = () => { idx = (idx + 1) % q.length; loadAndPlay(); };

shufBtn.onclick = () => {
  shuf = !shuf;
  shufBtn.classList.toggle('on', shuf);
  loadPl(currentPl);        // recarrega fila respeitando novo modo
};

/* ---------- carregamento da faixa ---------- */
async function loadTrack() {
  const t = q[idx];
  if (!t) return;
  a.src = t.url;
  tit.textContent = t.title;
  art.textContent = t.artist;
  document.title = `${t.title} – ${t.artist} | Retro Player`;
  capa.src = 'https://i.ibb.co/n8LFzxmb/reprodutor-de-musica-2.png'; // capa única
  centerTrack(); markOnly();
}

function loadAndPlay() { loadTrack(); a.play(); }

/* ---------- escolha de playlist ---------- */
function buildPickBox() {
  pickContent.innerHTML = '';
  Object.keys(PLAYLISTS).forEach(pl => {
    const b = document.createElement('span');
    b.className = 'bubble';
    b.textContent = pl;
    b.onclick = () => { pickBox.classList.remove('on'); loadPl(pl); };
    pickContent.appendChild(b);
  });
}
pickTrigger.onclick = () => pickBox.classList.add('on');
pickBox.onclick = e => { if (e.target === pickBox) pickBox.classList.remove('on'); };

/* ---------- carrega playlist clicada ---------- */
async function loadPl(plName) {
  currentPl = plName;
  pickTrigger.textContent = `Playlist – ${plName}`;
  q = []; idx = 0; rendered = 0;
  roleta.innerHTML = '';
  tit.textContent = '–'; art.textContent = '–'; a.src = '';

  const url = PLAYLISTS[plName] + '?t=' + Date.now();
  try {
    const res = await fetch(url);
    q = await res.json();
  } catch {
    alert('Erro ao carregar playlist.');
    return;
  }

  idx = 0;
  renderPartial();
  loadTrack();
  a.pause();
}

/* ---------- renderização sob-demanda ---------- */
function renderPartial(qtd = CHUNK) {
  const frag = document.createDocumentFragment();
  const end = Math.min(rendered + qtd, q.length);
  for (let i = rendered; i < end; i++) {
    const t = q[i];
    const li = document.createElement('li');
    li.innerHTML = `<span class="mus">${t.title}</span><span class="art">${t.artist}</span>`;
    li.onclick = () => { idx = i; loadAndPlay(); };
    frag.appendChild(li);
  }
  rendered = end;
  roleta.appendChild(frag);
  markOnly();
}

roleta.onscroll = () => {
  if (rendered >= q.length) return;
  if (roleta.scrollTop + roleta.clientHeight >= roleta.scrollHeight - 40) renderPartial(CHUNK);
};

/* ---------- helpers ---------- */
function centerTrack() {
  const li = roleta.children[idx];
  if (li) li.scrollIntoView({ block: 'center', behavior: 'smooth' });
}
function markOnly() {
  roleta.querySelectorAll('li').forEach((li, i) => li.classList.toggle('on', i === idx));
}

/* ---------- salto automático ao fim ---------- */
a.addEventListener('timeupdate', () => {
  if (a.currentTime > a.duration - 1) { skip(1); }
});
a.onended = () => skip(1);

function skip(dir) {
  idx = (idx + dir + q.length) % q.length;
  loadAndPlay();
}
