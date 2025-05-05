// Configuração básica do player
const audio = new Audio();
let currentPlaylist = [];
let currentSongIndex = 0;
let isPlaying = false;

// Elementos da interface
const playBtn = document.getElementById('play-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const songTitle = document.getElementById('song-title');
const songArtist = document.getElementById('song-artist');
const genreSelector = document.getElementById('genre-selector');

// Playlists reais do seu repositório
const PLAYLISTS = {
  Rock: 'https://raw.githubusercontent.com/ckrsktx/PlayerX/main/Rock.pls',
  Christian: 'https://raw.githubusercontent.com/ckrsktx/PlayerX/main/Christian.pls'
};

// Carrega uma playlist
async function loadPlaylist(genre) {
  try {
    const response = await fetch(PLAYLISTS[genre]);
    const data = await response.text();
    currentPlaylist = parsePLS(data);
    
    if (currentPlaylist.length > 0) {
      loadSong(0);
      enableControls();
    }
  } catch (error) {
    console.error('Erro ao carregar playlist:', error);
    alert('Erro ao carregar a playlist. Verifique o console para detalhes.');
  }
}

// Função para analisar o arquivo PLS (atualizada)
function parsePLS(data) {
  const lines = data.split('\n');
  const songs = [];
  let currentSong = {};

  lines.forEach(line => {
    if (line.startsWith('File')) {
      currentSong.file = line.split('=')[1]?.trim();
    } else if (line.startsWith('Title')) {
      const title = line.split('=')[1]?.trim();
      const [artist, songTitle] = title.includes(' - ') ? 
        title.split(' - ') : ['Artista Desconhecido', title];
      
      currentSong.title = songTitle || 'Música Desconhecida';
      currentSong.artist = artist;
      
      if (currentSong.file) {
        songs.push({...currentSong});
        currentSong = {};
      }
    }
  });

  return songs;
}

// Carrega uma música específica
function loadSong(index) {
  if (!currentPlaylist.length || index < 0 || index >= currentPlaylist.length) return;

  const song = currentPlaylist[index];
  currentSongIndex = index;
  
  audio.src = song.file;
  songTitle.textContent = song.title;
  songArtist.textContent = song.artist;
  
  if (isPlaying) {
    audio.play().catch(e => {
      console.error('Erro ao reproduzir:', e);
      alert('Erro ao reproduzir a música. Verifique o console.');
    });
  }
}

// Habilita os controles
function enableControls() {
  playBtn.disabled = false;
  prevBtn.disabled = false;
  nextBtn.disabled = false;
}

// Event Listeners
genreSelector.addEventListener('change', (e) => {
  if (e.target.value) {
    loadPlaylist(e.target.value);
  }
});

playBtn.addEventListener('click', () => {
  if (!currentPlaylist.length) return;
  
  isPlaying = !isPlaying;
  playBtn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
  
  if (isPlaying) {
    audio.play().catch(e => {
      console.error('Erro ao reproduzir:', e);
      alert('Erro ao reproduzir. Verifique se as URLs das músicas são acessíveis.');
    });
  } else {
    audio.pause();
  }
});

prevBtn.addEventListener('click', () => {
  const newIndex = (currentSongIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
  loadSong(newIndex);
});

nextBtn.addEventListener('click', () => {
  const newIndex = (currentSongIndex + 1) % currentPlaylist.length;
  loadSong(newIndex);
});

// Verificação inicial
console.log('PlayerX inicializado');
