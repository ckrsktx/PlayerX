const audio = document.getElementById('audio');
const playBtn = document.getElementById('play');
const nextBtn = document.getElementById('next');
const prevBtn = document.getElementById('prev');
const muteBtn = document.getElementById('mute');
const volumeSlider = document.getElementById('volume');
const favBtn = document.getElementById('fav');
const playlistSelector = document.getElementById('playlistSelector');
const trackList = document.getElementById('trackList');
const cover = document.getElementById('cover');
const title = document.getElementById('title');
const artist = document.getElementById('artist');

const API_KEY = 'fc3ce169c6dcff3689cafa1de9d5306e';

let playlist = [];
let currentTrack = 0;
let currentPLS = '';
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

function fetchPLS(plsName) {
  currentPLS = plsName;
  trackList.innerHTML = '';
  playlist = [];

  if (plsName === 'favorites') {
    playlist = favorites;
    renderTrackList();
    loadTrack(0);
    return;
  }

  fetch(`https://raw.githubusercontent.com/ckrsktx/PlayerX/main/${plsName}`)
    .then(res => res.text())
    .then(text => {
      const lines = text.split('\n').filter(line => line.startsWith('File'));
      playlist = lines.map((line, i) => ({
        url: line.split('=')[1],
        title: 'Faixa ' + (i + 1)
      }));
      renderTrackList();
      loadTrack(0);
    });
}

function renderTrackList() {
  trackList.innerHTML = '';
  playlist.forEach((track, index) => {
    const li = document.createElement('li');
    li.textContent = track.title;
    li.addEventListener('click', () => loadTrack(index));
    trackList.appendChild(li);
  });
}

function loadTrack(index) {
  if (!playlist[index]) return;
  currentTrack = index;
  const track = playlist[index];
  audio.src = track.url;
  title.textContent = track.title;
  artist.textContent = '';
  fetchCover(track.title);
  updateActiveTrack();
}

function updateActiveTrack() {
  [...trackList.children].forEach((li, i) => {
    li.classList.toggle('active', i === currentTrack);
  });
}

function fetchCover(query) {
  fetch(`https://ws.audioscrobbler.com/2.0/?method=track.search&track=${encodeURIComponent(query)}&api_key=${API_KEY}&format=json`)
    .then(res => res.json())
    .then(data => {
      const track = data.results.trackmatches.track[0];
      if (track && track.image) {
        const img = track.image.pop()['#text'];
        cover.src = img || 'https://via.placeholder.com/300x300?text=Sem+Capa';
        artist.textContent = track.artist;
      }
    });
}

playBtn.onclick = () => {
  if (audio.paused) {
    audio.play();
    playBtn.textContent = '⏸️';
  } else {
    audio.pause();
    playBtn.textContent = '▶️';
  }
};

nextBtn.onclick = () => {
  currentTrack = (currentTrack + 1) % playlist.length;
  loadTrack(currentTrack);
  audio.play();
};

prevBtn.onclick = () => {
  currentTrack = (currentTrack - 1 + playlist.length) % playlist.length;
  loadTrack(currentTrack);
  audio.play();
};

muteBtn.onclick = () => {
  audio.muted = !audio.muted;
  muteBtn.textContent = audio.muted ? '🔈' : '🔇';
};

volumeSlider.oninput = () => {
  audio.volume = volumeSlider.value;
};

favBtn.onclick = () => {
  const track = playlist[currentTrack];
  if (!favorites.find(f => f.url === track.url)) {
    favorites.push(track);
    localStorage.setItem('favorites', JSON.stringify(favorites));
    alert('Adicionado aos favoritos!');
  }
};

playlistSelector.onchange = () => {
  fetchPLS(playlistSelector.value);
};

fetchPLS('Christian.pls');
