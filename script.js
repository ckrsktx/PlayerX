document.addEventListener('DOMContentLoaded', function() {
    const audio = new Audio();
    let currentTrackIndex = 0;
    let playlist = [];
    let isPlaying = false;
    
    // Elementos do DOM
    const playBtn = document.getElementById('play-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const progressBar = document.getElementById('progress-bar');
    const currentTimeEl = document.getElementById('current-time');
    const durationEl = document.getElementById('duration');
    const volumeControl = document.getElementById('volume');
    const coverEl = document.getElementById('cover');
    const musicTitleEl = document.getElementById('music-title');
    const artistEl = document.getElementById('artist');
    const playlistEl = document.getElementById('playlist');
    const playlistSelect = document.getElementById('playlist-select');
    
    // Carregar playlist selecionada
    playlistSelect.addEventListener('change', function() {
        const playlistUrl = this.value;
        if (playlistUrl) {
            loadPlaylist(playlistUrl);
        }
    });
    
    // Função para carregar playlist
    async function loadPlaylist(url) {
        try {
            // Usando proxy CORS para evitar problemas de mesma origem
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);
            const data = await response.json();
            
            // Parse do conteúdo da playlist .pls
            const playlistContent = data.contents;
            const entries = playlistContent.split('\n').filter(line => line.startsWith('File'));
            
            playlist = entries.map(entry => {
                const parts = entry.split('=');
                const file = parts[1]?.trim();
                // Extrair título e artista do nome do arquivo (simplificado)
                const filename = file.split('/').pop().replace(/\.[^/.]+$/, "");
                const [artist, title] = filename.split(' - ') || ['Artista Desconhecido', filename];
                
                return {
                    file,
                    title: title || filename,
                    artist: artist || 'Artista Desconhecido'
                };
            });
            
            renderPlaylist();
            if (playlist.length > 0) {
                loadTrack(0);
            }
        } catch (error) {
            console.error('Erro ao carregar playlist:', error);
            alert('Erro ao carregar a playlist. Verifique o console para mais detalhes.');
        }
    }
    
    // Renderizar playlist na UI
    function renderPlaylist() {
        playlistEl.innerHTML = '';
        playlist.forEach((track, index) => {
            const li = document.createElement('li');
            li.textContent = `${track.artist} - ${track.title}`;
            li.addEventListener('click', () => {
                loadTrack(index);
                playTrack();
            });
            playlistEl.appendChild(li);
        });
    }
    
    // Carregar faixa específica
    function loadTrack(index) {
        if (index < 0 || index >= playlist.length) return;
        
        currentTrackIndex = index;
        const track = playlist[index];
        
        audio.src = track.file;
        musicTitleEl.textContent = track.title;
        artistEl.textContent = track.artist;
        
        // Atualizar capa do álbum (simplificado)
        coverEl.src = `https://via.placeholder.com/300?text=${encodeURIComponent(track.title)}`;
        
        // Atualizar item ativo na playlist
        const playlistItems = playlistEl.querySelectorAll('li');
        playlistItems.forEach((item, i) => {
            item.classList.toggle('playing', i === index);
        });
        
        // Quando os metadados da música são carregados
        audio.addEventListener('loadedmetadata', () => {
            durationEl.textContent = formatTime(audio.duration);
        });
        
        // Se já estava tocando, continua tocando
        if (isPlaying) {
            playTrack();
        }
    }
    
    // Tocar música
    function playTrack() {
        audio.play()
            .then(() => {
                isPlaying = true;
                playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            })
            .catch(error => {
                console.error('Erro ao reproduzir:', error);
                // Tentar tratar erro de autoplay
                if (error.name === 'NotAllowedError') {
                    alert('Por favor, clique no botão play para iniciar a reprodução.');
                }
            });
    }
    
    // Pausar música
    function pauseTrack() {
        audio.pause();
        isPlaying = false;
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
    
    // Próxima faixa
    function nextTrack() {
        const nextIndex = (currentTrackIndex + 1) % playlist.length;
        loadTrack(nextIndex);
        playTrack();
    }
    
    // Faixa anterior
    function prevTrack() {
        const prevIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
        loadTrack(prevIndex);
        playTrack();
    }
    
    // Formatador de tempo (mm:ss)
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    
    // Atualizar barra de progresso
    function updateProgress() {
        const { currentTime, duration } = audio;
        const progressPercent = (currentTime / duration) * 100;
        progressBar.style.width = `${progressPercent}%`;
        currentTimeEl.textContent = formatTime(currentTime);
    }
    
    // Definir progresso da música ao clicar na barra
    progressBar.parentElement.addEventListener('click', (e) => {
        const width = e.target.clientWidth;
        const clickX = e.offsetX;
        const duration = audio.duration;
        audio.currentTime = (clickX / width) * duration;
    });
    
    // Event Listeners
    playBtn.addEventListener('click', () => {
        if (isPlaying) {
            pauseTrack();
        } else {
            playTrack();
        }
    });
    
    nextBtn.addEventListener('click', nextTrack);
    prevBtn.addEventListener('click', prevTrack);
    
    volumeControl.addEventListener('input', () => {
        audio.volume = volumeControl.value;
    });
    
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', nextTrack);
    
    // Inicializar volume
    audio.volume = volumeControl.value;
    
    // Carregar a primeira playlist por padrão (opcional)
    // playlistSelect.value = playlistSelect.options[1].value;
    // loadPlaylist(playlistSelect.value);
});
