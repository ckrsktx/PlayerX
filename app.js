const PLAYLIST_META = 'https://raw.githubusercontent.com/ckrsktx/RetroPlayer/refs/heads/main/playlists.json';

// Atalhos
const $ = s => document.querySelector(s);
const $a = $('#a'), $capa = $('#capa'),
      $tit = document.createElement('div'), $art = document.createElement('div'),
      $playBtn = $('#playBtn'), $prev = $('#prev'), $next = $('#next'), $shufBtn = $('#shufBtn'),
      $roleta = $('#roleta'), $pickContent = $('#pickContent'), $atualizar = $('#atualizar');

let PLAYLISTS = {}, q = [], idx = 0, shuf = false, currentPl = '', played = [], rendered = 0;

// Helpers
function debounce(fn, wait=100){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),wait)};}
function fitText(el,max=28){el.style.fontSize=el.textContent.length>max?'.95rem':'1.1rem';}
function setAccent(color){document.documentElement.style.setProperty('--accent',color);}
function getPalette(img){const cv=document.createElement('canvas'),ctx=cv.getContext('2d');cv.width=img.naturalWidth;cv.height=img.naturalHeight;ctx.drawImage(img,0,0);const d=ctx.getImageData(0,0,cv.width,cv.height).data,rgb=[0,0,0],n=d.length/4;for(let i=0;i<d.length;i+=4){rgb[0]+=d[i];rgb[1]+=d[i+1];rgb[2]+=d[i+2];}rgb.forEach((v,i)=>rgb[i]=Math.round(v/n));return`rgb(${rgb.join(',')})`;}

// Load playlists meta
async function loadPlaylistsMeta(){
  try{const r=await fetch(PLAYLIST_META+'?t='+Date.now());PLAYLISTS=await r.json();buildPickBox();}
  catch{alert('Erro ao carregar playlists');}
}
function buildPickBox(){
  $pickContent.innerHTML='';
  Object.keys(PLAYLISTS).forEach(pl=>{
    const b=document.createElement('span');
    b.className='bubble'; b.textContent=pl;
    b.onclick=()=>{document.querySelectorAll('.bubble').forEach(x=>x.classList.remove('on'));
      b.classList.add('on');currentPl=pl;loadPl();};
    $pickContent.append(b);
  });
}

// Shuffle
function shufflePool(){const pool=q.map((_,i)=>i).filter(i=>!played.includes(i));if(!pool.length)played=[];const pick=pool[(Math.random()*pool.length)|0];played.push(pick);return pick;}

// Load playlist (apenas ao clicar)
async function loadPl(){
  q=[];rendered=0;played=[];idx=0;$roleta.innerHTML='';$a.src='';
  try{const r=await fetch(PLAYLISTS[currentPl]+'?t='+Date.now());q=await r.json();}
  catch{alert('Erro ao carregar playlist.');return;}
  idx=shuf?shufflePool():0;
  renderPartial();await loadTrack();$a.pause();updateIcon();
}

// Load track
async function loadTrack(){
  const t=q[idx]; if(!t) return;
  $a.src=t.url;
  document.title=`${t.title} – ${t.artist} | Retro Player`;
  let img='';
  try{const dz=await fetch(`https://api.deezer.com/search/track?q=${encodeURIComponent(t.artist+' '+t.title)}&limit=1`).then(r=>r.json());img=dz.data?.[0]?.album?.cover_small?.replace('56x56','150x150')||'';}catch{}
  if(!img)try{const it=await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(t.artist+' '+t.title)}&limit=1&entity=song`).then(r=>r.json());img=it.results?.[0]?.artworkUrl100?.replace('100x100','600x600')||'';}catch{}
  $capa.src=img||'https://i.ibb.co/n8LFzxmb/reprodutor-de-musica-2.png';
  $capa.onload=()=>requestIdleCallback(()=>setAccent(img?getPalette($capa):'#00ffff'));
  markOnly();updateSession();
}
function play(){$a.play();}function pause(){$a.pause();}function togglePlay(){$a.paused?play():pause();}
$playBtn.onclick=togglePlay;
$a.onplay=$a.onpause=updateIcon;
function updateIcon(){$playBtn.textContent=$a.paused?'▶':'⏸';}
$prev.onclick=()=>skip(-1);$next.onclick=()=>skip(1);
$shufBtn.onclick=()=>{shuf=!shuf;$shufBtn.classList.toggle('on',shuf);loadPl();};
function skip(d){idx=(idx+d+q.length)%q.length;loadTrack();play();}
function markOnly(){Array.from($roleta.children).forEach((li,i)=>li.classList.toggle('on',i===idx));}

// Render incremental
function renderPartial(qtd=50){
  if(rendered>=q.length)return;
  requestAnimationFrame(()=>{
    const frag=document.createDocumentFragment();const end=Math.min(rendered+qtd,q.length);
    for(let i=rendered;i<end;i++){const t=q[i];const li=document.createElement('li');li.textContent=`${t.title} – ${t.artist}`;li.onclick=()=>{idx=i;loadTrack();play();};frag.append(li);}
    rendered=end;$roleta.append(frag);markOnly();
  });
}
$roleta.onscroll=debounce(()=>{if(rendered>=q.length)return;if($roleta.scrollTop+$roleta.clientHeight>=$roleta.scrollHeight-40)renderPartial(50);},80);

// Media session
function updateSession(){const t=q[idx];if(!t)return;if('mediaSession'in navigator&&window.MediaMetadata){navigator.mediaSession.metadata=new MediaMetadata({title:t.title,artist:t.artist,artwork:[{src:$capa.src,sizes:'512x512',type:'image/png'}]});navigator.mediaSession.setActionHandler('play',play);navigator.mediaSession.setActionHandler('pause',pause);navigator.mediaSession.setActionHandler('previoustrack',()=>skip(-1));navigator.mediaSession.setActionHandler('nexttrack',()=>skip(1));}}

// Atualizar playlist
$atualizar.onclick=async()=>{if(!currentPl)return;await loadPl();};

// Init
loadPlaylistsMeta();