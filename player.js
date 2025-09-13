// player.js
class FinetuneBarPlayer {
    constructor() {
        this.audioPlayer = document.getElementById('audioPlayerSmall');
        this.playBtn = document.getElementById('playBtnSmall');
        this.prevBtn = document.getElementById('prevBtnSmall');
        this.nextBtn = document.getElementById('nextBtnSmall');
        this.shuffleBtn = document.getElementById('shuffleBtnSmall');
        this.progressBar = document.getElementById('progressBarSmall');
        this.progress = document.getElementById('progressSmall');
        this.currentTimeEl = document.getElementById('currentTimeSmall');
        this.durationEl = document.getElementById('durationSmall');
        this.trackTitle = document.getElementById('trackTitleSmall');
        this.trackArtist = document.getElementById('trackArtistSmall');
        this.playlistContainer = document.getElementById('playlistContainer');
        this.searchInput = document.getElementById('searchInput');

        this.tracks = [];
        this.currentTrackIndex = 0;
        this.isPlaying = false;
        this.isShuffle = false;
        this.shuffleHistory = [];
        this.originalTracks = [];
        this.filteredTracks = [];
        this.isSearchMode = false;
        this.wakeLock = null;

        // URL da playlist (mesmo repo, pasta raiz)
        this.playlistURL = 'https://raw.githubusercontent.com/ckrsktx/PlayerX/refs/heads/main/AlternativeNow.json';

        this.init();
    }

    async init() {
        try {
            await this.loadExternalPlaylist();
            this.setupEventListeners();
            this.loadTrack(0);
            this.setupAudioEvents();
            this.setupBackgroundRecovery();
            this.preventSuspension();

            document.addEventListener('click', async () => {
                await this.requestWakeLock();
            }, { once: true });

        } catch (error) {
            console.error('Erro ao carregar playlist:', error);
            this.showError('Erro ao carregar playlist externa');
        }
    }

    async loadExternalPlaylist() {
        const response = await fetch(this.playlistURL);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) throw new Error('Playlist vazia ou inválida');

        this.tracks = data;
        this.originalTracks = [...this.tracks];
        this.filteredTracks = [...this.tracks];
        this.renderPlaylist();
        this.updateTrackInfo(this.tracks[0]);
    }

    showError(msg) {
        this.playlistContainer.innerHTML = `<div style="color:#ff6b6b;padding:30px;text-align:center;">${msg}</div>`;
    }

    setupEventListeners() {
        this.playBtn.addEventListener('click', () => this.togglePlay());
        this.prevBtn.addEventListener('click', () => this.previousTrack());
        this.nextBtn.addEventListener('click', () => this.nextTrack());
        this.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
        this.progressBar.addEventListener('click', (e) => this.seekTo(e));
        this.searchInput.addEventListener('input', (e) => this.searchTracks(e.target.value));

        document.addEventListener('keydown', (e) => {
            switch (e.code) {
                case 'Space': e.preventDefault(); this.togglePlay(); break;
                case 'ArrowLeft': this.previousTrack(); break;
                case 'ArrowRight': this.nextTrack(); break;
                case 'KeyS': this.toggleShuffle(); break;
            }
        });
    }

    setupAudioEvents() {
        this.audioPlayer.addEventListener('loadedmetadata', () => {
            this.durationEl.textContent = this.formatTime(this.audioPlayer.duration);
        });
        this.audioPlayer.addEventListener('timeupdate', () => {
            this.updateProgress();
            this.currentTimeEl.textContent = this.formatTime(this.audioPlayer.currentTime);
        });
        this.audioPlayer.addEventListener('ended', () => this.nextTrack());
        this.audioPlayer.addEventListener('play', () => {
            this.playBtn.innerHTML = `<svg class="icon icon-pause" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
        });
        this.audioPlayer.addEventListener('pause', () => {
            this.playBtn.innerHTML = `<svg class="icon icon-play" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
        });
    }

    setupBackgroundRecovery() {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                setTimeout(() => {
                    if (this.isPlaying && this.audioPlayer.paused) {
                        this.audioPlayer.play().catch(() => this.nextTrack());
                    }
                }, 500);
            }
        });
    }

    preventSuspension() {
        setInterval(() => {
            if (this.isPlaying && !this.audioPlayer.paused && this.audioPlayer.readyState >= 2) {
                const t = this.audioPlayer.currentTime;
                this.audioPlayer.currentTime = t + 0.001;
                setTimeout(() => { this.audioPlayer.currentTime = t; }, 10);
            }
        }, 15000);
    }

    async requestWakeLock() {
        try {
            if ('wakeLock' in navigator) {
                this.wakeLock = await navigator.wakeLock.request('screen');
                document.addEventListener('visibilitychange', async () => {
                    if (document.visibilityState === 'visible' && this.isPlaying) {
                        this.wakeLock = await navigator.wakeLock.request('screen');
                    }
                });
            }
        } catch (err) {
            console.log('Wake Lock não disponível:', err);
        }
    }

    toggleShuffle() {
        this.isShuffle = !this.isShuffle;
        this.shuffleBtn.classList.toggle('active', this.isShuffle);
        if (this.isShuffle) {
            this.shuffleHistory = [this.currentTrackIndex];
            this.shuffleTracks();
        } else {
            this.tracks = [...this.originalTracks];
            const curr = this.originalTracks[this.shuffleHistory[0]];
            this.currentTrackIndex = this.tracks.findIndex(t => t.url === curr.url);
            this.searchTracks(this.searchInput.value);
        }
    }

    shuffleTracks() {
        for (let i = this.tracks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.tracks[i], this.tracks[j]] = [this.tracks[j], this.tracks[i]];
        }
        const curr = this.originalTracks[this.currentTrackIndex];
        const idx = this.tracks.findIndex(t => t.url === curr.url);
        if (idx > 0) [this.tracks[0], this.tracks[idx]] = [this.tracks[idx], this.tracks[0]];
        this.currentTrackIndex = 0;
        this.searchTracks(this.searchInput.value);
    }

    searchTracks(q) {
        const term = q.toLowerCase().trim();
        this.isSearchMode = term !== '';
        this.filteredTracks = this.isSearchMode
            ? this.tracks.filter(t =>
                t.title.toLowerCase().includes(term) ||
                t.artist.toLowerCase().includes(term) ||
                t.album.toLowerCase().includes(term)
            )
            : [...this.tracks];
        this.renderPlaylist();
        if (this.filteredTracks.length) {
            this.currentTrackIndex = 0;
            this.loadTrack(0);
        }
    }

    loadTrack(index) {
        if (index < 0 || index >= this.filteredTracks.length) return;
        this.currentTrackIndex = index;
        const track = this.filteredTracks[index];
        this.audioPlayer.src = track.url;
        this.updateTrackInfo(track);
        this.renderPlaylist();
        if (this.isPlaying) this.audioPlayer.play().catch(() => this.nextTrack());
    }

    updateTrackInfo(track) {
        this.trackTitle.textContent = track.title;
        this.trackArtist.textContent = track.artist;
        this.durationEl.textContent = track.duration;
        document.title = `diversas - ${track.title} • ${track.artist}`;
    }

    togglePlay() {
        if (this.isPlaying) {
            this.audioPlayer.pause();
            this.isPlaying = false;
        } else {
            this.audioPlayer.play().then(() => { this.isPlaying = true; });
        }
    }

    previousTrack() {
        if (this.isShuffle && this.shuffleHistory.length > 1) {
            this.shuffleHistory.pop();
            this.loadTrack(this.shuffleHistory[this.shuffleHistory.length - 1]);
        } else {
            const idx = this.currentTrackIndex > 0 ? this.currentTrackIndex - 1 : this.filteredTracks.length - 1;
            this.loadTrack(idx);
        }
    }

    nextTrack() {
        let idx;
        if (this.isShuffle) {
            do { idx = Math.floor(Math.random() * this.filteredTracks.length); } while (idx === this.currentTrackIndex && this.filteredTracks.length > 1);
            this.shuffleHistory.push(idx);
        } else {
            idx = this.currentTrackIndex < this.filteredTracks.length - 1 ? this.currentTrackIndex + 1 : 0;
        }
        this.loadTrack(idx);
    }

    seekTo(e) {
        const rect = this.progressBar.getBoundingClientRect();
        const pct = (e.clientX - rect.left) / rect.width;
        this.audioPlayer.currentTime = pct * this.audioPlayer.duration;
    }

    updateProgress() {
        if (this.audioPlayer.duration) {
            const pct = (this.audioPlayer.currentTime / this.audioPlayer.duration) * 100;
            this.progress.style.width = pct + '%';
        }
    }

    formatTime(sec) {
        if (isNaN(sec)) return '0:00';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    renderPlaylist() {
        this.playlistContainer.innerHTML = '';
        if (!this.filteredTracks.length) {
            this.playlistContainer.innerHTML = `<div style="text-align:center;color:rgba(255,255,255,.6);padding:30px;">Nenhuma música encontrada</div>`;
            return;
        }
        this.filteredTracks.forEach((track, i) => {
            const div = document.createElement('div');
            div.className = 'playlist-item-small' + (i === this.currentTrackIndex ? ' active' : '');
            div.innerHTML = `
                <div class="playlist-item-info">
                    <div class="playlist-item-title">${track.title}</div>
                    <div class="playlist-item-artist">${track.artist}</div>
                </div>
                <div class="playlist-item-duration">${track.duration}</div>
            `;
            div.addEventListener('click', () => {
                this.loadTrack(i);
                if (this.isShuffle) this.shuffleHistory = [this.originalTracks.findIndex(t => t.url === track.url)];
            });
            this.playlistContainer.appendChild(div);
        });
        this.centerActiveItem();
    }

    centerActiveItem() {
        setTimeout(() => {
            const active = document.querySelector('.playlist-item-small.active');
            if (active) {
                const container = this.playlistContainer;
                const target = active.offsetTop - container.clientHeight / 2 + active.clientHeight / 2 - 15;
                container.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
            }
        }, 100);
    }
}

document.addEventListener('DOMContentLoaded', () => new FinetuneBarPlayer());
