// script.js
class RetroPlayer {
  constructor() {
    this.elements = {
      audio: document.getElementById('audio-player'),
      coverArt: document.getElementById('cover-art'),
      vinylOverlay: document.getElementById('vinyl-overlay'),
      trackTitle: document.getElementById('track-title'),
      trackArtist: document.getElementById('track-artist'),
      playPauseBtn: document.getElementById('play-pause-btn'),
      prevBtn: document.getElementById('prev-btn'),
      nextBtn: document.getElementById('next-btn'),
      shuffleBtn: document.getElementById('shuffle-btn'),
      playlistList: document.getElementById('playlist-list'),
      playlistTrigger: document.getElementById('playlist-trigger'),
      pickerModal: document.getElementById('picker-modal'),
      pickerContent: document.getElementById('picker-content'),
      updateBtn: document.getElementById('update-playlist-btn'),
      coverArtWrapper: document.getElementById('cover-art-wrapper'),
    };

    this.PLAYLIST_META_URL = 'https://raw.githubusercontent.com/ckrsktx/RetroPlayer/refs/heads/main/playlists.json';
    this.FALLBACK_COVER = 'https://i.ibb.co/VW1Hn4MF/Screenshot-2025-09-23-10-00-03-283-com-miui-gallery-edit.jpg';

    this.playlists = {};
    this.currentQueue = [];
    this.currentIndex = 0;
    this.isShuffling = false;
    this.currentPlaylistName = 'Alternative';
    this.playedTracksHistory = [];

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadInitialData();
    this.registerServiceWorker();
  }

  setupEventListeners() {
    this.elements.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
    this.elements.prevBtn.addEventListener('click', () => this.skipTrack(-1));
    this.elements.nextBtn.addEventListener('click', () => this.skipTrack(1));
    this.elements.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
    this.elements.playlistTrigger.addEventListener('click', () => this.openPlaylistPicker());
    this.elements.pickerModal.addEventListener('click', (e) => this.closePlaylistPicker(e));
    this.elements.updateBtn.addEventListener('click', () => this.updatePlaylistsAndCache());
    this.elements.audio.addEventListener('play', () => this.updatePlayPauseIcon());
    this.elements.audio.addEventListener('pause', () => this.updatePlayPauseIcon());
    this.elements.audio.addEventListener('ended', () => this.handleTrackEnd());
    this.elements.coverArt.addEventListener('load', () => this.updateAccentColor());
  }

  async loadInitialData() {
    await this.loadPlaylistsMetadata();
    this.loadPlaylist(this.currentPlaylistName);
  }

  async loadPlaylistsMetadata() {
    try {
      const response = await fetch(`${this.PLAYLIST_META_URL}?t=${Date.now()}`);
      this.playlists = await response.json();
    } catch (error) {
      console.error('Failed to load playlist metadata:', error);
      alert('Não foi possível carregar as informações das playlists.');
    }
  }

  async loadPlaylist(name) {
    if (!this.playlists[name]) {
      console.error(`Playlist "${name}" not found.`);
      return;
    }

    this.currentPlaylistName = name;
    this.playedTracksHistory = [];
    this.elements.playlistTrigger.textContent = `Playlist - ${name}`;
    this.elements.shuffleBtn.classList.toggle('active', this.isShuffling); // Ensure shuffle button state is correct

    try {
      const playlistUrl = `${this.playlists[name]}?t=${Date.now()}`;
      const response = await fetch(playlistUrl);
      this.currentQueue = await response.json();

      this.currentIndex = this.isShuffling ? this.getShuffledIndex() : 0;
      this.renderPlaylistList();
      this.loadTrack();
      this.elements.audio.pause();
      this.updatePlayPauseIcon();
    } catch (error) {
      console.error(`Failed to load playlist "${name}":`, error);
      alert(`Erro ao carregar a playlist "${name}".`);
    }
  }

  async loadTrack() {
    if (this.currentQueue.length === 0) {
      this.elements.trackTitle.textContent = 'Nenhuma faixa';
      this.elements.trackArtist.textContent = 'Playlist vazia';
      this.elements.coverArt.src = this.FALLBACK_COVER;
      this.elements.vinylOverlay.style.opacity = 0;
      this.setAccentColor('#00ffff');
      document.title = 'Retro Player';
      return;
    }

    const track = this.currentQueue[this.currentIndex];
    this.elements.audio.src = track.url;
    this.elements.trackTitle.textContent = track.title;
    this.elements.trackArtist.textContent = track.artist;
    document.title = `${track.title} – ${track.artist} | Retro Player`;

    // Reset cover art and overlay before fetching new one
    this.elements.coverArt.src = this.FALLBACK_COVER;
    this.elements.vinylOverlay.style.opacity = 1; // Show vinyl while loading
    this.elements.coverArtWrapper.classList.add('vinyl-active');

    let imageUrl = '';
    // Try Deezer API for cover art
    try {
      const dzRes = await fetch(`https://api.deezer.com/search/track?q=${encodeURIComponent(track.artist + ' ' + track.title)}&limit=1`);
      const dzData = await dzRes.json();
      imageUrl = dzData.data?.[0]?.album?.cover_xl || '';
    } catch (e) {
      console.warn('Deezer API error:', e);
    }

    // Fallback to iTunes API if Deezer fails
    if (!imageUrl) {
      try {
        const itRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(track.artist + ' ' + track.title)}&limit=1&entity=song`);
        const itData = await itRes.json();
        imageUrl = itData.results?.[0]?.artworkUrl100?.replace('100x100', '600x600') || '';
      } catch (e) {
        console.warn('iTunes API error:', e);
      }
    }

    if (imageUrl) {
      this.elements.coverArt.src = imageUrl;
      // The `load` event listener on coverArt will handle `updateAccentColor`
    } else {
      // If no image found, use fallback and default accent
      this.elements.coverArt.src = this.FALLBACK_COVER;
      this.elements.vinylOverlay.style.opacity = 0;
      this.elements.coverArtWrapper.classList.remove('vinyl-active');
      this.setAccentColor('#00ffff');
    }

    this.elements.coverArt.onload = () => {
        this.updateAccentColor();
        this.elements.vinylOverlay.style.opacity = 0;
        this.elements.coverArtWrapper.classList.remove('vinyl-active');
    };
    this.elements.coverArt.onerror = () => {
        // If the fetched image itself fails to load, revert to fallback and default accent
        this.elements.coverArt.src = this.FALLBACK_COVER;
        this.elements.vinylOverlay.style.opacity = 0;
        this.elements.coverArtWrapper.classList.remove('vinyl-active');
        this.setAccentColor('#00ffff');
    };

    this.updateMediaSession(track);
    this.scrollToCurrentTrack();
    this.highlightCurrentTrack();
  }

  togglePlayPause() {
    if (this.elements.audio.paused) {
      this.elements.audio.play();
    } else {
      this.elements.audio.pause();
    }
  }

  updatePlayPauseIcon() {
    const playIcon = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
    const pauseIcon = '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
    this.elements.playPauseBtn.innerHTML = this.elements.audio.paused ? playIcon : pauseIcon;
  }

  skipTrack(direction) {
    if (this.currentQueue.length === 0) return;

    if (this.isShuffling) {
      this.currentIndex = this.getShuffledIndex();
    } else {
      this.currentIndex = (this.currentIndex + direction + this.currentQueue.length) % this.currentQueue.length;
    }
    this.loadTrack();
    this.elements.audio.play();
  }

  toggleShuffle() {
    this.isShuffling = !this.isShuffling;
    this.elements.shuffleBtn.classList.toggle('active', this.isShuffling);
    this.playedTracksHistory = []; // Reset history when shuffle state changes

    if (this.isShuffling) {
      this.currentIndex = this.getShuffledIndex();
      this.loadTrack();
    }
    this.highlightCurrentTrack(); // Update highlight based on new index
  }

  getShuffledIndex() {
    if (this.currentQueue.length === 0) return 0;

    const availableIndices = this.currentQueue
      .map((_, i) => i)
      .filter(i => !this.playedTracksHistory.includes(i));

    if (availableIndices.length === 0) {
      this.playedTracksHistory = []; // All tracks played, reset history
      return Math.floor(Math.random() * this.currentQueue.length);
    }

    const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
    this.playedTracksHistory.push(randomIndex);
    return randomIndex;
  }

  handleTrackEnd() {
    if (this.currentQueue.length === 0) return;

    if (this.isShuffling) {
      this.currentIndex = this.getShuffledIndex();
    } else {
      this.currentIndex = (this.currentIndex + 1) % this.currentQueue.length;
    }
    this.loadTrack();
    this.elements.audio.play();
  }

  renderPlaylistList() {
    this.elements.playlistList.innerHTML = '';
    this.currentQueue.forEach((track, index) => {
      const listItem = document.createElement('li');
      listItem.innerHTML = `<span class="track-title">${track.title}</span><span class="track-artist">${track.artist}</span>`;
      listItem.addEventListener('click', () => {
        this.currentIndex = index;
        this.loadTrack();
        this.elements.audio.play();
      });
      this.elements.playlistList.appendChild(listItem);
    });
    this.highlightCurrentTrack();
    this.scrollToCurrentTrack();
  }

  highlightCurrentTrack() {
    Array.from(this.elements.playlistList.children).forEach((li, i) => {
      li.classList.toggle('active', i === this.currentIndex);
    });
  }

  scrollToCurrentTrack() {
    const activeItem = this.elements.playlistList.querySelector('li.active');
    if (activeItem) {
      activeItem.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  openPlaylistPicker() {
    this.elements.pickerContent.innerHTML = '';
    Object.keys(this.playlists).forEach(plName => {
      const bubble = document.createElement('span');
      bubble.className = 'bubble';
      bubble.textContent = plName;
      bubble.classList.toggle('active', plName === this.currentPlaylistName);
      bubble.addEventListener('click', () => {
        this.loadPlaylist(plName);
        this.elements.pickerModal.style.display = 'none';
      });
      this.elements.pickerContent.appendChild(bubble);
    });
    this.elements.pickerModal.style.display = 'flex';
  }

  closePlaylistPicker(event) {
    if (event.target === this.elements.pickerModal) {
      this.elements.pickerModal.style.display = 'none';
    }
  }

  updateMediaSession(track) {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        artwork: [{
          src: this.elements.coverArt.src || this.FALLBACK_COVER,
          sizes: '512x512',
          type: 'image/jpeg'
        }]
      });

      navigator.mediaSession.setActionHandler('play', () => this.elements.audio.play());
      navigator.mediaSession.setActionHandler('pause', () => this.elements.audio.pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => this.skipTrack(-1));
      navigator.mediaSession.setActionHandler('nexttrack', () => this.skipTrack(1));
    }
  }

  // Color Palette Extraction (improved)
  getPaletteFromImage(img) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.naturalWidth || img.offsetWidth;
    canvas.height = img.naturalHeight || img.offsetHeight;

    if (!canvas.width || !canvas.height) {
        console.warn("Canvas dimensions are zero, cannot extract palette.");
        return '#00ffff'; // Fallback
    }

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let r = 0, g = 0, b = 0, count = 0;

        // Sample pixels to get a dominant color
        const step = 4 * 10; // Sample every 10th pixel for performance
        for (let i = 0; i < imageData.length; i += step) {
            r += imageData[i];
            g += imageData[i + 1];
            b += imageData[i + 2];
            count++;
        }

        if (count > 0) {
            r = Math.floor(r / count);
            g = Math.floor(g / count);
            b = Math.floor(b / count);
            return `rgb(${r},${g},${b})`;
        }
    } catch (e) {
        console.error("Error extracting palette from image:", e);
    }
    return '#00ffff'; // Fallback color
  }

  setAccentColor(color) {
    document.documentElement.style.setProperty('--accent-color', color);
    // Convert RGB to an array for shadow effect
    const rgbMatch = color.match(/\d+/g);
    if (rgbMatch && rgbMatch.length === 3) {
      document.documentElement.style.setProperty('--accent-color-rgb', rgbMatch.join(','));
    } else {
      document.documentElement.style.setProperty('--accent-color-rgb', '0,255,255'); // Default cyan for shadow
    }
  }

  updateAccentColor() {
    const paletteColor = this.getPaletteFromImage(this.elements.coverArt);
    this.setAccentColor(paletteColor);
  }

  async updatePlaylistsAndCache() {
    this.elements.updateBtn.textContent = 'Atualizando...';
    this.elements.updateBtn.disabled = true;

    try {
      await this.loadPlaylistsMetadata(); // Reload metadata first

      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        // Clear all caches
        await caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key))));
        // Ask service worker to skip waiting and activate new version
        navigator.serviceWorker.controller.postMessage({ cmd: 'SKIP_WAITING' });
        // Give service worker a moment to update
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Reload current playlist, which will fetch fresh data due to cache busting
      await this.loadPlaylist(this.currentPlaylistName);
      alert('Playlist atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar playlist:', error);
      alert('Erro ao atualizar a playlist. Verifique sua conexão.');
    } finally {
      this.elements.updateBtn.textContent = 'Atual
