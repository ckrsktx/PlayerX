// script.js
class Player {
  constructor() {
    this.audio = document.getElementById('audioPlayer');
    this.playBtn = document.getElementById('playBtn');
    this.prevBtn = document.getElementById('prevBtn');
    this.nextBtn = document.getElementById('nextBtn');
    this.shuffleBtn = document.getElementById('shuffleBtn');
    this.progressBar = document.getElementById('progressBar');
    this.progress = document.getElementById('progress');
    this.currentTimeEl = document.getElementById('currentTime');
    this.durationEl = document.getElementById('duration');
    this.trackTitle = document.getElementById('trackTitle');
    this.trackArtist = document.getElementById('trackArtist');
    this.playlistEl = document.getElementById('playlist');
    this.searchInput = document.getElementById('searchInput');

    this.tracks = [];
    this.current = 0;
    this.isPlaying = false;
    this.isShuffle = false;

    this.loadPlaylist();
  }

  async loadPlaylist() {
    const res = await fetch('playlist.json');
    this.tracks = await res.json();
    this.renderPlaylist();
    this.loadTrack(0);
    this.attachEvents();
  }

  attachEvents() {
    this.playBtn.onclick = () => this.togglePlay();
    this.prevBtn.onclick = () => this.prevTrack();
    this.nextBtn.onclick = () => this.nextTrack();
    this.shuffleBtn.onclick = () => this.toggleShuffle();
    this.progressBar.onclick = (e) => {
      const pct = e.offsetX / this.progressBar.offsetWidth;
      this.audio.currentTime = pct * this.audio.duration;
    };
    this.searchInput.oninput = (e) => this.filter(e.target.value);
    this.audio.addEventListener('timeupdate', () => this.updateTime());
    this.audio.addEventListener('ended', () => this.nextTrack());
  }

  renderPlaylist(list = this.tracks) {
    this.playlistEl.innerHTML = '';
    list.forEach((t, i) => {
      const div = document.createElement('div');
      div.className = 'song' + (i === this.current ? ' active' : '');
      div.innerHTML = `
        <div class="song-title">${t.title}</div>
        <div class="song-artist">${t.artist}</div>
        <div class="song-duration">${t.duration}</div>
      `;
      div.onclick = () => this.loadTrack(i);
      this.playlistEl.appendChild(div);
    });
  }

  filter(q) {
    const term = q.toLowerCase();
    const filtered = this.tracks.filter(t =>
      t.title.toLowerCase().includes(term) ||
      t.artist.toLowerCase().includes(term)
    );
    this.renderPlaylist(filtered);
  }

  loadTrack(index) {
    if (index < 0 || index >= this.tracks.length) return;
    this.current = index;
    const t = this.tracks[index];
    this.audio.src = t.url;
    this.trackTitle.textContent = t.title;
    this.trackArtist.textContent = t.artist;
    this.durationEl.textContent = t.duration;
    this.renderPlaylist();
    if (this.isPlaying) this.audio.play();
  }

  togglePlay() {
    if (this.isPlaying) {
      this.audio.pause();
      this.playBtn.textContent = '▶';
    } else {
      this.audio.play();
      this.playBtn.textContent = '❚❚';
    }
    this.isPlaying = !this.isPlaying;
  }

  prevTrack() {
    const i = this.current > 0 ? this.current - 1 : this.tracks.length - 1;
    this.loadTrack(i);
  }

  nextTrack() {
    let i;
    if (this.isShuffle) {
      do { i = Math.floor(Math.random() * this.tracks.length); } while (i === this.current && this.tracks.length > 1);
    } else {
      i = this.current < this.tracks.length - 1 ? this.current + 1 : 0;
    }
    this.loadTrack(i);
  }

  toggleShuffle() {
    this.isShuffle = !this.isShuffle;
    this.shuffleBtn.style.background = this.isShuffle ? 'rgba(0,201,255,.3)' : '';
  }

  updateTime() {
    const curr = this.audio.currentTime;
    const dur = this.audio.duration || 0;
    this.currentTimeEl.textContent = this.fmt(curr);
    this.progress.style.width = (curr / dur * 100) + '%';
  }

  fmt(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }
}

document.addEventListener('DOMContentLoaded', () => new Player());
