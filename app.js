
const PLAYLIST_META = 'https://raw.githubusercontent.com/ckrsktx/RetroPlayer/refs/heads/main/playlists.json';

// --------- HELPERS ----------
let PLAYLISTS = {};
const $ = s => document.querySelector(s);
const $a = $('#a'), $capa = $('#capa'), $disco = $('#disco'),
      $tit = $('#tit'), $art = $('#art'), $playBtn = $('#playBtn'),
      $prev = $('#prev'), $next = $('#next'), $shufBtn = $('#shufBtn'),
      $roleta = $('#roleta'), $pickTrigger = $('#pickTrigger'),
      $pickBox = $('#pickBox'), $pickContent = $('#pickContent'),
      $bar = $('#bar'), $atualizar = $('#atualizar');

// Estado
let q = [], idx = 0, shuf = false, currentPl = '', played = [],
    rendered = 0, keepAlive = null, loadingPl = false, updating = false;

// Limpa caches antigos
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(r => r.forEach(sw => sw.unregister()));
  caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
}

function debounce(fn, wait = 100) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}
function fitText(el, max = 28) {
  el.style.fontSize = el.textContent.length > max ? '.95rem' : '1.1rem';
}
function setAccent(color) {
  document.documentElement.style.setProperty('--accent', color);
}
function getPalette(img) {
  const cv = document.createElement('canvas'), ctx = cv.getContext('2d');
  cv.width = img.naturalWidth; cv.height = img.naturalHeight;
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, cv.width, cv.height).data, rgb = [0,0,0], n = d.length/4;
  for (let i=0;i<d.length;i+=4){ rgb[0]+=d[i]; rgb[1]+=d[i+1]; rgb[2]+=d[i+2]; }
  rgb.forEach((v,i)=>rgb[i]=Math.round(v/n));
  return `rgb(${rgb.join(',')})`;
}

// -------- PLAYLIST META --------
async function loadPlaylistsMeta() {
  try {
    const res = await fetch(PLAYLIST_META + '?t=' + Date.now());
    PLAYLISTS = await res.json();
  } catch {
    alert('Erro ao carregar metadados das playlists.');
  }
}
function buildPickBox() {
  $pickContent.innerHTML = '';
  Object.keys(PLAYLISTS).forEach(pl => {
    const b = document.createElement('span');
    b.className = 'bubble'; b.textContent = pl;
    b.onclick = () => {
      document.querySelectorAll('.bubble').forEach(x=>x.classList.remove('on'));
      b.classList.add('on');
      currentPl = pl; loadPl(); $pickBox.classList.remove('on');
    };
    if (pl === currentPl) b.classList.add('on');
    $pickContent.append(b);
  });
}
$pickTrigger.onclick = () => { buildPickBox(); $pickBox.classList.add('on'); };
$pickBox.onclick = e => { if (e.target === $pickBox) $pickBox.classList.remove('on'); };

// -------- SHUFFLE --------
function shufflePool() {
  const pool = q.map((_,i)=>i).filter(i=>!played.includes(i));
  if (!pool.length) played = [];
  const pick = pool[(Math.random()*pool.length)|0];
  played.push(pick); return pick;
}

// -------- LOAD PLAYLIST --------
async function loadPl() {
  if (loadingPl) return;
  loadingPl = true;
  q = []; rendered = 0; played = []; idx = 0;
  $roleta.innerHTML = ''; $tit.textContent = $art.textContent = '–';
  $a.src = ''; $bar.classList.add('disabled');

  try {
    const res = await fetch(PLAYLISTS[currentPl] + '?t=' + Date.now());
    q = await res.json();
  } catch {
    alert('Erro ao carregar playlist.');
    loadingPl = false; $bar.classList.remove('disabled'); return;
  }

  idx = shuf ? shufflePool() : 0;
  renderPartial(); await loadTrack();
  $a.pause(); updateIcon();
  $pickTrigger.textContent = `Playlist - ${currentPl}`;
  $bar.classList.remove('disabled');
  loadingPl = false;
}

// -------- TRACK CONTROL --------
async function loadTrack() {
  const t = q[idx]; if (!t) return;
  $a.src = t.url; $tit.textContent = t.title; $art.textContent = t.artist;
  document.title = `${t.title} – ${t.artist} | Retro Player`; fitText($tit);

  let img = '';
  try {
    const dz = await fetch(`https://api.deezer.com/search/track?q=${encodeURIComponent(t.artist+' '+t.title)}&limit=1`).then(r=>r.json());
    img = dz.data?.[0]?.album?.cover_small?.replace('56x56','150x150') || '';
  } catch {}
  if (!img) try {
    const it = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(t.artist+' '+t.title)}&limit=1&entity=song`).then(r=>r.json());
    img = it.results?.[0]?.artworkUrl100?.replace('100x100','600x600') || '';
  } catch {}

  $capa.src = img || 'https://i.ibb.co/n8LFzxmb/reprodutor-de-musica-2.png';
  $disco.style.opacity = 0;
  $capa.onload = () => requestIdleCallback(()=> setAccent(img ? getPalette($capa) : '#00ffff'));
  centerTrack(); markOnly(); updateSession();
}
function play(){ $a.play(); } function pause(){ $a.pause(); }
function togglePlay(){ $a.paused ? play() : pause(); }
$playBtn.onclick = togglePlay;
$a.onplay = $a.onpause = updateIcon;
function updateIcon(){
  $playBtn.innerHTML = $a.paused
    ? '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>'
    : '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
}

// Skip
$prev.onclick = ()=>skip(-1); $next.onclick = ()=>skip(1);
$shufBtn.onclick = ()=>{
  shuf=!shuf; $shufBtn.classList.toggle('on',shuf);
  if(shuf){$shufBtn.style.background='#fff';$shufBtn.style.color='#000';$shufBtn.querySelector('svg').style.stroke='#000';}
  else{$shufBtn.style.background='';$shufBtn.style.color='';$shufBtn.querySelector('svg').style.stroke='var(--fg)';}
  loadPl();
};
function skip(d){ idx=(idx+d+q.length)%q.length; loadTrack(); play(); }
function centerTrack(){ const li=$roleta.children[idx]; if(li) li.scrollIntoView({block:'center',behavior:'smooth'}); }
function markOnly(){ Array.from($roleta.children).forEach((li,i)=>li.classList.toggle('on',i===idx)); }

// -------- MEDIA SESSION --------
function updateSession(){
  const t=q[idx]; if(!t) return;
  if('mediaSession' in navigator && window.MediaMetadata){
    navigator.mediaSession.metadata=new MediaMetadata({
      title:t.title,artist:t.artist,
      artwork:[{src:$capa.src||'https://i.ibb.co/n8LFzxmb/reprodutor-de-musica-2.png',sizes:'512x512',type:'image/png'}]
    });
    navigator.mediaSession.setActionHandler('play',play);
    navigator.mediaSession.setActionHandler('pause',pause);
    navigator.mediaSession.setActionHandler('previoustrack',()=>skip(-1));
    navigator.mediaSession.setActionHandler('nexttrack',()=>skip(1));
  }
}

// -------- RENDER INCREMENTAL --------
function renderPartial(qtd=50){
  if(rendered>=q.length) return;
  requestAnimationFrame(()=>{
    const frag=document.createDocumentFragment();
    const end=Math.min(rendered+qtd,q.length);
    for(let i=rendered;i<end;i++){
      const t=q[i]; const li=document.createElement('li');
      li.innerHTML=`<span class="mus">${t.title}</span><span class="art">${t.artist}</span>`;
      li.onclick=()=>{idx=i;loadTrack();play();}; frag.append(li);
    }
    rendered=end; $roleta.append(frag); markOnly();
  });
}
$roleta.onscroll=debounce(()=>{
  if(rendered>=q.length) return;
  if($roleta.scrollTop+$roleta.clientHeight>=$roleta.scrollHeight-40) renderPartial(50);
},80);

// -------- ANTI-SUSPENSÃO --------
$a.addEventListener('play',()=>{clearInterval(keepAlive); keepAlive=setInterval(()=>{if(!$a.paused)$a.currentTime=$a.currentTime;},30000);});
$a.addEventListener('pause',()=>clearInterval(keepAlive));
$a.addEventListener('timeupdate',()=>{
  if($a.currentTime>$a.duration-1 && $a.duration>1){
    idx=shuf?shufflePool():(idx+1)%q.length; loadTrack(); $a.play();
  }
});
$a.onended=()=>{ idx=shuf?shufflePool():(idx+1)%q.length; loadTrack(); play(); };

// -------- ATUALIZAR PLAYLIST --------
$atualizar.onclick=async()=>{
  if(updating) return; updating=true;
  await loadPlaylistsMeta();
  if(navigator.serviceWorker.controller){
    await caches.keys().then(keys=>Promise.all(keys.map(k=>caches.delete(k))));
    navigator.serviceWorker.controller.postMessage({cmd:'SKIP_WAITING'});
  }
  try{
    const res=await fetch(PLAYLISTS[currentPl]+'?t='+Date.now());
    q=await res.json(); played=[]; idx=0; shuf=false;
    $shufBtn.classList.remove('on');$shufBtn.style.background='';$shufBtn.style.color='';
    if($shufBtn.querySelector('svg')) $shufBtn.querySelector('svg').style.stroke='var(--fg)';
    rendered=0;$roleta.innerHTML='';renderPartial();loadTrack();updateIcon();
  }catch{ alert('Erro ao buscar nova versão.'); }
  updating=false;
};

// -------- INIT --------
(async()=>{
  await loadPlaylistsMeta(); buildPickBox();
  const todas=Object.keys(PLAYLISTS);
  if(todas.length){const sorteada=todas[Math.floor(Math.random()*todas.length)];
    currentPl=sorteada; $pickTrigger.textContent=`Playlist - ${sorteada}`; await loadPl();}
})();
