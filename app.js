// retro-player.js // Versão limpa: remove efeitos de cor e evita carregar capas/áudio automaticamente. // Mantém todas as funcionalidades do player.

const PLAYLIST_META = 'https://raw.githubusercontent.com/ckrsktx/RetroPlayer/refs/heads/main/playlists.json'; let PLAYLISTS = {}; const $ = s => document.querySelector(s); const a = $('#a'), capa = $('#capa'), disco = $('#disco'), tit = $('#tit'), art = $('#art'), playBtn = $('#playBtn'), prev = $('#prev'), next = $('#next'), shufBtn = $('#shufBtn'), roleta = $('#roleta'), pickTrigger = $('#pickTrigger'), pickBox = $('#pickBox'), pickContent = $('#pickContent'), bar = $('#bar');

let q = [], idx = 0, shuf = false, currentPl = '', played = [], rendered = 0, CHUNK = 50, keepAlive;

// Remove SW e limpa cache (evita "página inexistente") if ('serviceWorker' in navigator) { navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister())); caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))); }

// Inicial: carrega apenas o meta das playlists mas NÃO escolhe nem carrega nenhuma playlist. (async () => { await loadPlaylistsMeta(); buildPickBox(); // O usuário deve clicar explicitamente numa playlist para carregar. pickTrigger.textContent = 'Escolha uma playlist'; })();

async function loadPlaylistsMeta() { const res = await fetch(PLAYLIST_META + '?t=' + Date.now()); PLAYLISTS = await res.json(); }

function fitText(el, max = 28) { el.style.fontSize = el.textContent.length > max ? '.95rem' : '1.1rem'; }

// Música e capa só carregam quando o usuário escolhe / clica em uma faixa async function loadTrack() { const t = q[idx]; if (!t) return;

// apenas setar fonte do áudio quando for de fato necessário a.src = t.url; // áudio só inicia quando play()

tit.textContent = t.title || '–'; art.textContent = t.artist || '–'; document.title = ${t.title || '–'} – ${t.artist || '–'} | Retro Player; fitText(tit);

// buscar capa nas APIs, mas em resolução leve (pequena) let img = ''; try { const dz = await fetch(https://api.deezer.com/search/track?q=${encodeURIComponent(t.artist + ' ' + t.title)}&limit=1).then(r => r.json()); img = dz.data?.[0]?.album?.cover_small?.replace('56x56', '100x100') || ''; } catch (e) { /* silent */ }

if (!img) { try { const it = await fetch(https://itunes.apple.com/search?term=${encodeURIComponent(t.artist + ' ' + t.title)}&limit=1&entity=song).then(r => r.json()); img = it.results?.[0]?.artworkUrl100?.replace('100x100', '100x100') || ''; } catch (e) { /* silent */ } }

if (img) { // mantemos imagens leves: 100x100 capa.src = img; // manter opacidade sem efeitos visuais extras disco.style.opacity = 0; // transições visuais podem estar no CSS; aqui apenas garantimos estado capa.onload = () => { // sem extração de palette, sem alterar variáveis de CSS disco.style.opacity = 1; }; } else { // fallback leve capa.src = 'https://i.ibb.co/n8LFzxmb/reprodutor-de-musica-2.png'; disco.style.opacity = 1; }

centerTrack(); markOnly(); updateSession(); }

function play() { a.play(); } function pause() { a.pause(); } function togglePlay() { a.paused ? play() : pause(); } playBtn.onclick = togglePlay; a.onplay = a.onpause = updateIcon; function updateIcon() { playBtn.innerHTML = a.paused ? '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'; }

prev.onclick = () => skip(-1); next.onclick = () => skip(1); shufBtn.onclick = () => { shuf = !shuf; shufBtn.classList.toggle('on', shuf); // removido qualquer estilo inline de cor — estilos devem ser controlados por CSS apenas loadPl(); }; function skip(d) { if (!q.length) return; idx = (idx + d + q.length) % q.length; loadTrack(); play(); }

function centerTrack() { const li = roleta.children[idx]; if (li) li.scrollIntoView({ block: 'center', behavior: 'smooth' }); } function markOnly() { document.querySelectorAll('li').forEach((li, i) => li.classList.toggle('on', i === idx)); }

function updateSession() { const t = q[idx]; if (!t) return; try { navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist, artwork: [{ src: capa.src || 'https://i.ibb.co/n8LFzxmb/reprodutor-de-musica-2.png', sizes: '512x512', type: 'image/png' }] }); navigator.mediaSession.setActionHandler('play', play); navigator.mediaSession.setActionHandler('pause', pause); navigator.mediaSession.setActionHandler('previoustrack', () => skip(-1)); navigator.mediaSession.setActionHandler('nexttrack', () => skip(1)); } catch (e) { /* alguns navegadores não suportam MediaSession */ } }

function buildPickBox() { pickContent.innerHTML = ''; Object.keys(PLAYLISTS).forEach(pl => { const b = document.createElement('span'); b.className = 'bubble'; b.textContent = pl; b.onclick = () => { document.querySelectorAll('.bubble').forEach(x => x.classList.remove('on')); b.classList.add('on'); currentPl = pl; // carregar playlist apenas quando o usuário clicar na bubble loadPl(); pickBox.classList.remove('on'); }; if (pl === currentPl) b.classList.add('on'); pickContent.append(b); }); } pickTrigger.onclick = () => { buildPickBox(); pickBox.classList.add('on'); }; pickBox.onclick = (e) => { if (e.target === pickBox) pickBox.classList.remove('on'); };

function shufflePool() { const pool = q.map((_, i) => i).filter(i => !played.includes(i)); if (!pool.length) played = []; const pick = pool[Math.floor(Math.random() * pool.length)]; played.push(pick); return pick; }

// ===== TROCA DE PLAYLIST (SEM MISTURA) ===== async function loadPl() { // limpa estado q = []; rendered = 0; played = []; idx = 0; roleta.innerHTML = ''; tit.textContent = '–'; art.textContent = '–'; a.src = '';

if (!currentPl || !PLAYLISTS[currentPl]) { alert('Playlist inválida.'); return; }

const busted = PLAYLISTS[currentPl] + '?t=' + Date.now(); try { const res = await fetch(busted); q = await res.json(); } catch (e) { alert('Erro ao carregar playlist.'); return; }

// LIMPA shuffle antes de aplicar played = []; idx = shuf ? shufflePool() : 0; rendered = 0; renderPartial(); // carregar a primeira faixa da lista (mas não tocar automaticamente) loadTrack(); a.pause(); updateIcon(); pickTrigger.textContent = Playlist - ${currentPl}; bar.classList.remove('disabled'); }

function renderPartial(qtd = 50) { const frag = document.createDocumentFragment(); const end = Math.min(rendered + qtd, q.length); for (let i = rendered; i < end; i++) { const t = q[i]; const li = document.createElement('li'); li.innerHTML = <span class="mus">${escapeHtml(t.title || '–')}</span><span class="art">${escapeHtml(t.artist || '–')}</span>; li.onclick = () => { idx = i; loadTrack(); play(); }; frag.append(li); } rendered = end; roleta.append(frag); markOnly(); roleta.onscroll = () => { if (rendered >= q.length) return; if (roleta.scrollTop + roleta.clientHeight >= roleta.scrollHeight - 40) renderPartial(50); }; }

// ===== ANTI-SUSPENSÃO (tela apagada) ===== a.addEventListener('play', () => { keepAlive = setInterval(() => { if (!a.paused) a.currentTime = a.currentTime; }, 30000); }); a.addEventListener('pause', () => clearInterval(keepAlive));

// Próxima faixa ANTES de acabar (evita pausa) a.addEventListener('timeupdate', () => { if (!a.duration || a.duration === Infinity) return; if (a.currentTime > a.duration - 1) { if (shuf) idx = shufflePool(); else idx = (idx + 1) % q.length; loadTrack(); a.play(); } });

a.onended = () => { if (shuf) idx = shufflePool(); else idx = (idx + 1) % q.length; loadTrack(); play(); };

$('#atualizar').onclick = async () => { await loadPlaylistsMeta(); if (navigator.serviceWorker && navigator.serviceWorker.controller) { await caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))); navigator.serviceWorker.controller.postMessage({ cmd: 'SKIP_WAITING' }); } if (!currentPl || !PLAYLISTS[currentPl]) { // apenas recarregamos meta buildPickBox(); alert('Playlists meta atualizada. Selecione uma playlist para carregar.'); return; }

const busted = PLAYLISTS[currentPl] + '?t=' + Date.now(); try { const res = await fetch(busted); q = await res.json(); played = []; idx = 0; shuf = false; shufBtn.classList.remove('on'); renderPartial(); loadTrack(); updateIcon(); } catch (e) { alert('Erro ao buscar nova versão.'); } };

// pequenas utilidades function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&','<':'<','>':'>','"':'"',"'":"'"})[c]); }

// expor algumas funções para debug se necessário window.RetroPlayer = { loadPlaylistsMeta, loadPl, loadTrack };
