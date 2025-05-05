// API Key do Last.fm
const API_KEY = 'fc3ce169c6dcff3689cafa1de9d5306e';

// Elementos do DOM
const audio = new Audio();
const coverImg = document.getElementById('cover-img');
const defaultCover = document.querySelector('.default-cover');
const defaultPlaylistCover = document.querySelector('.default-playlist-cover');
const songTitle = document.getElementById('song-title');
const songArtist = document.getElementById('song-artist');
const progress = document.getElementById('progress');
const currentTimeEl = document.getElementById('current-time');
const durationEl = document.getElementById('duration');
const playBtn = document.getElementById('play-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const muteBtn = document.getElementById('mute-btn');
const shuffleBtn = document.getElementById('shuffle-btn');
const favoriteBtn = document.getElementById('favorite-btn');
const progressContainer = document.getElementById('progress-container');
const timeDisplay = document.getElementById('time-display');
const initMessage = document.getElementById('init-message');
const menuBtn = document.getElementById('menu-btn');
const panelOverlay = document.getElementById('panel-overlay');
const favoritesPanel = document.getElementById('favorites-panel');
const favoritesList = document.getElementById('favorites-list');
const searchContainer = document.getElementById('search-container');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const genreSelector = document.getElementById('genre-selector');

// Variáveis de estado
let playlist = [];
let originalPlaylistOrder = [];
let isShuffleOn = false;
let isPlaying = false;
let isMuted = false;
let currentSongIndex = 0;
let favorites = JSON.parse(localStorage.getItem('playerX_favorites')) || [];
let currentSongId = '';
let isInFavoritesView = false;
let searchTimeout = null;

// Inicialização
function init() {
    updateFavoritesList();
    updateFavoriteButton();
    
    // Configura título inicial
    document.title = "PlayerX - Modern Music Player";
    
    // Event Listeners
    playBtn.addEventListener('click', togglePlay);
    nextBtn.addEventListener('click', nextSong);
    prevBtn.addEventListener('click', prevSong);
    muteBtn.addEventListener('click', toggleMute);
    shuffleBtn.addEventListener('click', toggleShuffle);
    favoriteBtn.addEventListener('click', toggleFavorite);
    menuBtn.addEventListener('click', toggleFavoritesPanel);
    panelOverlay.addEventListener('click', closePanels);
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleSongEnd);
    audio.addEventListener('loadedmetadata', updateDuration);
    progressContainer.addEventListener('click', setProgress);
    genreSelector.addEventListener('change', loadSelectedGenre);
    
    // Eventos de busca
    searchInput.addEventListener('input', handleSearch);
    searchInput.addEventListener('focus', showSearchResults);
    document.addEventListener('click', (e) => {
        if (!searchContainer.contains(e.target)) {
            hideSearchResults();
        }
    });
    
    // Configurações iniciais
    audio.volume = 0.7;
    searchContainer.style.display = 'block';
    
    // Mostra capa padrão da playlist
    showDefaultPlaylistCover();
}

// Carrega a playlist baseada no gênero selecionado
function loadSelectedGenre() {
    const genre = genreSelector.value;
    if (!genre) return;
    
    const playlistUrl = `https://raw.githubusercontent.com/ckrsktx/PlayerX/main/${genre}.pls`;
    fetchPlaylist(playlistUrl);
}

function fetchPlaylist(url) {
    fetch(url)
        .then(res => res.text())
        .then(data => {
            playlist = parsePLS(data);
            originalPlaylistOrder = [...playlist];
            console.log("Playlist carregada:", playlist);
            
            // Habilita controles
            playBtn.disabled = false;
            prevBtn.disabled = false;
            nextBtn.disabled = false;
            shuffleBtn.disabled = false;
            favoriteBtn.disabled = false;
            searchInput.disabled = false;
            
            // Carrega a primeira música
            if (playlist.length > 0) {
                loadSong(0);
            }
        })
        .catch(err => {
            console.error("Erro ao carregar playlist:", err);
            initMessage.textContent = "Erro ao carregar a playlist. Tente novamente.";
        });
}

// Parse do arquivo PLS
function parsePLS(data) {
    const lines = data.split('\n');
    const playlist = [];
    let currentEntry = {};

    lines.forEach(line => {
        if (line.startsWith('File')) {
            currentEntry.file = line.split('=')[1].trim();
        } else if (line.startsWith('Title')) {
            currentEntry.title = line.split('=')[1].trim();
            
            // Separa artista e título se estiver no formato "Artista - Título"
            const artistTitleSplit = currentEntry.title.split(' - ');
            if (artistTitleSplit.length === 2) {
                currentEntry.artist = artistTitleSplit[0];
                currentEntry.title = artistTitleSplit[1];
            } else {
                currentEntry.artist = 'Artista Desconhecido';
            }
            
            // Adiciona à playlist se tiver os dados necessários
            if (currentEntry.file && currentEntry.title) {
                playlist.push({
                    file: currentEntry.file,
                    title: currentEntry.title,
                    artist: currentEntry.artist,
                    length: currentEntry.length || 0,
                    cover: ''
                });
                currentEntry = {};
            }
        } else if (line.startsWith('Length')) {
            currentEntry.length = line.split('=')[1].trim();
        }
    });

    return playlist;
}

// Mostra capa padrão da playlist
function showDefaultPlaylistCover() {
    defaultPlaylistCover.style.display = 'block';
    defaultCover.style.display = 'none';
    coverImg.style.display = 'none';
}

// Carrega a música atual
function loadSong(index, fromFavorites = false) {
    if (playlist.length === 0 || index < 0 || index >= playlist.length) return;
    
    const song = playlist[index];
    currentSongIndex = index;
    currentSongId = `${song.artist}-${song.title}`;
    
    // Atualiza UI
    songTitle.textContent = song.title;
    songArtist.textContent = song.artist;
    
    // Atualiza título da página
    document.title = `${song.title} - ${song.artist} | PlayerX`;
    
    // Mostra controles de progresso
    progressContainer.style.display = 'block';
    timeDisplay.style.display = 'flex';
    initMessage.style.display = 'none';
    
    // Esconde capa padrão da playlist
    defaultPlaylistCover.style.display = 'none';
    
    // Configura áudio
    audio.src = song.file;
    
    // Se já tiver cover no cache, usa
    if (song.cover) {
        showCover(song.cover);
    } else {
        fetchSongInfo(song);
    }
    
    // Atualiza botão de favorito
    updateFavoriteButton();
    
    // Se veio dos favoritos, marca como não estando mais na visualização
    if (fromFavorites) {
        isInFavoritesView = false;
    }
    
    // Se estiver tocando, continua a reprodução
    if (isPlaying) {
        audio.play().catch(e => console.log("Erro ao reproduzir:", e));
    }
}

// Busca informações da música
function fetchSongInfo(song) {
    fetch(`https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${API_KEY}&artist=${encodeURIComponent(song.artist)}&track=${encodeURIComponent(song.title)}&format=json`)
        .then(res => res.json())
        .then(data => {
            if (data.track) {
                // Atualiza capa
                const image = data.track.album?.image?.find(img => img.size === 'extralarge');
                if (image && image['#text']) {
                    song.cover = image['#text'];
                    showCover(song.cover);
                } else {
                    showDefaultCover();
                }
            } else {
                showDefaultCover();
            }
        })
        .catch(err => {
            console.log("Erro na API:", err);
            showDefaultCover();
        });
}

// Mostra capa da música
function showCover(coverUrl) {
    coverImg.onload = function() {
        coverImg.style.display = 'block';
        defaultCover.style.display = 'none';
        defaultPlaylistCover.style.display = 'none';
    };
    coverImg.onerror = function() {
        showDefaultCover();
    };
    coverImg.src = coverUrl;
}

// Mostra capa padrão
function showDefaultCover() {
    coverImg.style.display = 'none';
    defaultCover.style.display = 'flex';
    defaultPlaylistCover.style.display = 'none';
}

// Controle de play/pause
function togglePlay() {
    if (!isPlaying) {
        if (!audio.src || audio.src.includes('blob:')) {
            loadSong(currentSongIndex);
        }
        playSong();
    } else {
        pauseSong();
    }
}

function playSong() {
    isPlaying = true;
    playBtn.innerHTML = '<i class="fas fa-pause"></i>';
    audio.play().catch(e => console.log("Erro ao reproduzir:", e));
}

function pauseSong() {
    isPlaying = false;
    playBtn.innerHTML = '<i class="fas fa-play"></i>';
    audio.pause();
}

// Manipulador de fim de música
function handleSongEnd() {
    if (isInFavoritesView) {
        // Lógica específica para quando estiver na visualização de favoritos
        const nextIndex = favorites.findIndex(fav => fav.id === currentSongId) + 1;
        if (nextIndex < favorites.length) {
            const nextSongId = favorites[nextIndex].id;
            const nextSongIndex = playlist.findIndex(song => `${song.artist}-${song.title}` === nextSongId);
            if (nextSongIndex !== -1) {
                loadSong(nextSongIndex, true);
                playSong();
                return;
            }
        }
        // Se não houver próxima música nos favoritos, volta para a playlist normal
        isInFavoritesView = false;
    }
    nextSong();
}

// Navegação entre músicas
function nextSong() {
    if (playlist.length === 0) return;
    
    const nextIndex = (currentSongIndex + 1) % playlist.length;
    loadSong(nextIndex);
    if (isPlaying) playSong();
}

function prevSong() {
    if (playlist.length === 0) return;
    
    const prevIndex = (currentSongIndex - 1 + playlist.length) % playlist.length;
    loadSong(prevIndex);
    if (isPlaying) playSong();
}

// Shuffle
function toggleShuffle() {
    if (playlist.length === 0) return;
    
    isShuffleOn = !isShuffleOn;
    shuffleBtn.classList.toggle('active', isShuffleOn);
    
    if (isShuffleOn) {
        originalPlaylistOrder = [...playlist];
        const currentSong = playlist[currentSongIndex];
        let shuffled = [...playlist];
        shuffled.splice(currentSongIndex, 1);
        
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        shuffled.splice(currentSongIndex, 0, currentSong);
        playlist = shuffled;
    } else {
        playlist = [...originalPlaylistOrder];
        currentSongIndex = playlist.findIndex(song => 
            `${song.artist}-${song.title}` === currentSongId);
    }
}

// Favoritos
function toggleFavorite() {
    if (playlist.length === 0 || currentSongIndex === undefined) return;
    
    const currentSong = playlist[currentSongIndex];
    const songId = `${currentSong.artist}-${currentSong.title}`;
    
    const index = favorites.findIndex(fav => fav.id === songId);
    if (index === -1) {
        favorites.push({
            id: songId,
            artist: currentSong.artist,
            title: currentSong.title,
            cover: currentSong.cover || ''
        });
    } else {
        favorites.splice(index, 1);
    }
    
    localStorage.setItem('playerX_favorites', JSON.stringify(favorites));
    updateFavoriteButton();
    updateFavoritesList();
}

function updateFavoriteButton() {
    if (playlist.length === 0 || currentSongIndex === undefined) {
        favoriteBtn.classList.remove('active');
        favoriteBtn.innerHTML = '<i class="far fa-heart"></i>';
        return;
    }
    
    const isFavorite = favorites.some(fav => fav.id === currentSongId);
    favoriteBtn.classList.toggle('active', isFavorite);
    favoriteBtn.innerHTML = isFavorite ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>';
}

function updateFavoritesList() {
    favoritesList.innerHTML = '';
    
    if (favorites.length === 0) {
        favoritesList.innerHTML = '<p style="text-align: center; opacity: 0.7; padding: 10px;">Nenhuma música favoritada</p>';
        return;
    }
    
    favorites.forEach((fav, index) => {
        const favItem = document.createElement('div');
        favItem.className = 'favorite-item';
        favItem.innerHTML = `
            ${fav.cover ? `<img src="${fav.cover}" alt="${fav.title}" onerror="this.parentNode.querySelector('.default-fav-cover').style.display='flex'; this.style.display='none';">` : ''}
            <div class="default-fav-cover" style="${fav.cover ? 'display:none' : 'display:flex'}">
                <i class="fas fa-music"></i>
            </div>
            <div class="favorite-item-info">
                <strong>${fav.title}</strong>
                <p>${fav.artist}</p>
            </div>
            <button class="remove-favorite" data-id="${fav.id}">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        favItem.addEventListener('click', (e) => {
            // Não faz nada se o clique foi no botão de remover
            if (e.target.closest('.remove-favorite')) return;
            
            const songIndex = playlist.findIndex(song => 
                `${song.artist}-${song.title}` === fav.id);
            
            if (songIndex !== -1) {
                isInFavoritesView = true;
                loadSong(songIndex, true);
                if (!isPlaying) playSong();
                closePanels();
                hideSearchResults();
            }
        });
        
        favoritesList.appendChild(favItem);
    });

    // Adiciona event listeners para os botões de remover
    document.querySelectorAll('.remove-favorite').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            removeFavorite(id);
        });
    });
}

function removeFavorite(id) {
    favorites = favorites.filter(fav => fav.id !== id);
    localStorage.setItem('playerX_favorites', JSON.stringify(favorites));
    updateFavoritesList();
    
    // Se a música atual foi desfavoritada, atualiza o botão
    if (id === currentSongId) {
        updateFavoriteButton();
    }
}

// Painel de favoritos
function toggleFavoritesPanel() {
    if (favoritesPanel.classList.contains('show')) {
        closePanels();
    } else {
        panelOverlay.classList.add('show');
        favoritesPanel.classList.add('show');
        updateFavoritesList();
    }
}

function closePanels() {
    panelOverlay.classList.remove('show');
    favoritesPanel.classList.remove('show');
}

// Controles de volume
function toggleMute() {
    isMuted = !isMuted;
    audio.muted = isMuted;
    muteBtn.innerHTML = isMuted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
}

// Barra de progresso
function updateProgress(e) {
    const { duration, currentTime } = e.srcElement;
    const progressPercent = (currentTime / duration) * 100;
    progress.style.width = `${progressPercent}%`;
    
    const durationMinutes = Math.floor(duration / 60);
    let durationSeconds = Math.floor(duration % 60);
    if (durationSeconds < 10) durationSeconds = `0${durationSeconds}`;
    
    if (duration) {
        durationEl.textContent = `${durationMinutes}:${durationSeconds}`;
    }
    
    const currentMinutes = Math.floor(currentTime / 60);
    let currentSeconds = Math.floor(currentTime % 60);
    if (currentSeconds < 10) currentSeconds = `0${currentSeconds}`;
    currentTimeEl.textContent = `${currentMinutes}:${currentSeconds}`;
}

function updateDuration() {
    const duration = audio.duration;
    if (isNaN(duration)) return;
    
    const durationMinutes = Math.floor(duration / 60);
    let durationSeconds = Math.floor(duration % 60);
    if (durationSeconds < 10) durationSeconds = `0${durationSeconds}`;
    durationEl.textContent = `${durationMinutes}:${durationSeconds}`;
}

function setProgress(e) {
    const width = this.clientWidth;
    const clickX = e.offsetX;
    const duration = audio.duration;
    audio.currentTime = (clickX / width) * duration;
}

// Funções de busca
function handleSearch() {
    clearTimeout(searchTimeout);
    
    const query = searchInput.value.trim().toLowerCase();
    if (query.length < 3) {
        hideSearchResults();
        return;
    }
    
    searchTimeout = setTimeout(() => {
        const results = playlist.filter(song => 
            song.title.toLowerCase().includes(query) || 
            song.artist.toLowerCase().includes(query)
        );
        
        displaySearchResults(results);
    }, 300);
}

function displaySearchResults(results) {
    searchResults.innerHTML = '';
    
    if (results.length === 0) {
        searchResults.innerHTML = '<div class="search-result-item"><div class="search-result-title">Nenhum resultado encontrado</div></div>';
    } else {
        results.forEach(song => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            resultItem.innerHTML = `
                <div class="search-result-artist">${song.artist}</div>
                <div class="search-result-title">${song.title}</div>
            `;
            
            resultItem.addEventListener('click', () => {
                const index = playlist.findIndex(s => 
                    s.artist === song.artist && s.title === song.title);
                if (index !== -1) {
                    loadSong(index);
                    if (!isPlaying) playSong();
                    hideSearchResults();
                    searchInput.value = '';
                }
            });
            
            searchResults.appendChild(resultItem);
        });
    }
    
    showSearchResults();
}

function showSearchResults() {
    if (searchInput.value.trim().length >= 3) {
        searchResults.style.display = 'block';
    }
}

function hideSearchResults() {
    searchResults.style.display = 'none';
}

// Inicializa o player
init();
