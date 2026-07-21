window.pageCleanupRadio = function () {};
window.pageInitRadio = function () {
  var stations = [
    { key: 'powerturk', name: 'PowerTürk FM', genre: 'Pop', url: '/api/radio-proxy?url=' + encodeURIComponent('http://live.powerapp.com.tr/powerturk/mpeg/icecast.audio') },
    { key: 'powerfm', name: 'Power FM', genre: 'Pop', url: '/api/radio-proxy?url=' + encodeURIComponent('http://live.powerapp.com.tr/powerfm/mpeg/icecast.audio') },
    { key: 'superfm', name: 'Süper FM', genre: 'Pop', url: '/api/radio-proxy?url=' + encodeURIComponent('https://playerservices.streamtheworld.com/api/livestream-redirect/SUPER_FM_SC') },
    { key: 'virgin', name: 'Virgin Radio', genre: 'Pop', url: '/api/radio-proxy?url=' + encodeURIComponent('https://playerservices.streamtheworld.com/api/livestream-redirect/VIRGIN_RADIO_SC') },
    { key: 'joyturk', name: 'Joy Türk', genre: 'Pop', url: '/api/radio-proxy?url=' + encodeURIComponent('https://playerservices.streamtheworld.com/api/livestream-redirect/JOY_TURK_SC') },
    { key: 'powerpop', name: 'PowerPop', genre: 'Pop', url: '/api/radio-proxy?url=' + encodeURIComponent('http://powerpop.listenpowerapp.com/powerpop/mpeg/icecast.audio') },
    { key: 'rockfm', name: 'Rock FM', genre: 'Rock', url: '/api/radio-proxy?url=' + encodeURIComponent('http://live.radyofenomen.com/rock/256/icecast.audio') },
    { key: 'metro', name: 'Metro FM', genre: 'Yabancı', url: '/api/radio-proxy?url=' + encodeURIComponent('https://playerservices.streamtheworld.com/api/livestream-redirect/METRO_FM_SC') },
    { key: 'joyfm', name: 'JOY FM', genre: 'Yabancı', url: '/api/radio-proxy?url=' + encodeURIComponent('https://playerservices.streamtheworld.com/api/livestream-redirect/JOY_FM_SC') },
    { key: 'slow', name: 'Slow Türk', genre: 'Yabancı', url: '/api/radio-proxy?url=' + encodeURIComponent('https://playerservices.streamtheworld.com/api/livestream-redirect/SLOW_TURK_SC') },
    { key: 'fenomen', name: 'Fenomen FM', genre: 'Pop', url: '/api/radio-proxy?url=' + encodeURIComponent('http://live.radyofenomen.com/fenomen/128/icecast.audio') },
    { key: 'kral', name: 'Kral Türk FM', genre: 'Türkçe', url: '/api/radio-proxy?url=' + encodeURIComponent('https://live.radyositesihazir.com/8032/stream') },
    { key: 'radyo7', name: 'Radyo 7', genre: 'Türkçe', url: '/api/radio-proxy?url=' + encodeURIComponent('http://46.20.3.250/;stream') },
    { key: 'alem', name: 'Alem FM', genre: 'Türkçe', url: '/api/radio-proxy?url=' + encodeURIComponent('https://turkmedya.radyotvonline.net/alemfmaac') },
    { key: 'viva', name: 'Radyo Viva', genre: 'Türkçe', url: '/api/radio-proxy?url=' + encodeURIComponent('http://46.20.3.231/') },
    { key: 'eksen', name: 'Radyo Eksen', genre: 'İstanbul', url: '/api/radio-proxy?url=' + encodeURIComponent('http://46.20.3.230/') },
    { key: 'moda', name: 'Radyo Moda', genre: 'İstanbul', url: '/api/radio-proxy?url=' + encodeURIComponent('http://m.radyomoda.com.tr:8000/stream') },
    { key: 'light', name: 'Radyo Light', genre: 'İstanbul', url: '/api/radio-proxy?url=' + encodeURIComponent('https://yayin.radiolight.net:8005/live') },
    { key: 'seyrfm', name: 'Seyr FM', genre: 'İstanbul', url: '/api/radio-proxy?url=' + encodeURIComponent('https://seyrdijital.com/stream') },
    { key: 'ntv', name: 'NTV Radyo', genre: 'Haber', url: '/api/radio-proxy?url=' + encodeURIComponent('http://ntvrdwmp.radyotvonline.com/') },
    { key: 'sputnik', name: 'Radyo Sputnik', genre: 'Haber', url: '/api/radio-proxy?url=' + encodeURIComponent('https://icecast-rian.cdnvideo.ru/voicestm') },
    { key: '90lar', name: '90\'lar Radyo', genre: 'Nostalji', url: '/api/radio-proxy?url=' + encodeURIComponent('http://37.247.98.8/stream/166/') },
    { key: 'altin', name: 'Altın Şarkılar', genre: 'Nostalji', url: '/api/radio-proxy?url=' + encodeURIComponent('http://37.247.98.8/stream/25/;') },
    { key: 'dinamocaffe', name: 'Dinamo Caffe', genre: 'Lounge', url: '/api/radio-proxy?url=' + encodeURIComponent('http://channels.dinamo.fm/caffe-mp3') },
    { key: 'dinamosleep', name: 'Dinamo Sleep', genre: 'Ambient', url: '/api/radio-proxy?url=' + encodeURIComponent('http://channels.dinamo.fm/sleep-mp3') }
  ];

  var grid = document.getElementById('radioGrid');
  var filterBar = document.getElementById('radioFilter');
  var miniPlayer = document.getElementById('radioMiniPlayer');
  var miniPlayBtn = document.getElementById('miniPlayBtn');
  var miniPlayIcon = document.getElementById('miniPlayIcon');
  var miniPauseIcon = document.getElementById('miniPauseIcon');
  var miniGenre = document.getElementById('miniGenre');
  var miniName = document.getElementById('miniName');
  var miniVolume = document.getElementById('miniVolume');
  var miniClose = document.getElementById('miniClose');
  var stationCountEl = document.getElementById('radioStationCount');
  if (!grid) return;

  var genreColors = {
    Pop: '#F05252',
    Rock: '#B14AC7',
    Türkçe: '#18AEB5',
    İstanbul: '#E66A3C',
    Yabancı: '#3B82F6',
    Haber: '#6B7280',
    Nostalji: '#D49A21',
    Lounge: '#5f27cd',
    Ambient: '#01a3a4'
  };

  var genreOrder = ['Pop', 'Rock', 'Türkçe', 'İstanbul', 'Yabancı', 'Haber', 'Nostalji', 'Lounge', 'Ambient'];
  var genreLabels = {
    Pop: 'Pop & Rock',
    Rock: 'Rock',
    Türkçe: 'Türkçe',
    İstanbul: 'İstanbul',
    Yabancı: 'Yabancı',
    Haber: 'Haber',
    Nostalji: 'Nostalji',
    Lounge: 'Lounge',
    Ambient: 'Ambient'
  };

  var currentFilter = null;

  function getGenreCount(genre) {
    return stations.filter(function(s) { return s.genre === genre; }).length;
  }

  function renderSkeletons() {
    grid.innerHTML = '';
    for (var i = 0; i < 9; i++) {
      var sk = document.createElement('div');
      sk.className = 'radio-skeleton';
      sk.innerHTML = '<div class="radio-skeleton-line dot" style="background:' + (genreColors[genreOrder[i % genreOrder.length]] || '#888') + '"></div><div class="radio-skeleton-line medium"></div><div class="radio-skeleton-line short"></div>';
      grid.appendChild(sk);
    }
  }

  function renderFilters() {
    if (!filterBar) return;
    filterBar.innerHTML = '';
    var allBtn = document.createElement('button');
    allBtn.className = 'radio-filter-btn active';
    allBtn.dataset.genre = '';
    allBtn.setAttribute('role', 'tab');
    allBtn.setAttribute('aria-selected', 'true');
    allBtn.innerHTML = 'Tümü<span class="radio-filter-count">' + stations.length + '</span>';
    filterBar.appendChild(allBtn);

    genreOrder.forEach(function(g) {
      var btn = document.createElement('button');
      btn.className = 'radio-filter-btn';
      btn.dataset.genre = g;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', 'false');
      var gc = genreColors[g] || '#888';
      btn.innerHTML = '<span class="filter-dot" style="background:' + gc + '"></span>' + (genreLabels[g] || g) + '<span class="radio-filter-count">' + getGenreCount(g) + '</span>';
      filterBar.appendChild(btn);
    });

    filterBar.querySelectorAll('.radio-filter-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        filterBar.querySelectorAll('.radio-filter-btn').forEach(function(b) {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        currentFilter = btn.dataset.genre || null;
        renderGrid(currentFilter);
      });
    });
  }

  function renderGrid(filter) {
    grid.innerHTML = '';
    var filtered = filter ? stations.filter(function(s) { return s.genre === filter; }) : stations;

    if (filtered.length === 0) {
      grid.innerHTML = '<div class="radio-empty"><div class="radio-empty-icon">📻</div><div class="radio-empty-text">İstasyon bulunamadı</div><div class="radio-empty-sub">Bu kategoride radyo istasyonu yok</div></div>';
      return;
    }

    if (stationCountEl) {
      stationCountEl.textContent = (filter ? filtered.length : stations.length) + ' İstasyon';
    }

    filtered.forEach(function(st) {
      var card = document.createElement('div');
      card.className = 'radio-card';
      card.dataset.key = st.key;
      card.dataset.genre = st.genre;
      card.setAttribute('role', 'listitem');
      card.setAttribute('tabindex', '0');
      card.style.setProperty('--card-accent', genreColors[st.genre] || '#888');

      var gc = genreColors[st.genre] || '#888';
      var isPlaying = getCurrentKey() === st.key && isCurrentlyPlaying();

      if (isPlaying) card.classList.add('playing');

      card.innerHTML =
        '<div class="radio-card-top">' +
          '<div class="radio-card-genre" style="color:' + gc + '">' +
            '<span class="radio-card-genre-dot" style="background:' + gc + '"></span>' +
            st.genre +
          '</div>' +
          '<div class="radio-card-live"><span class="radio-card-live-dot"></span>Canlı</div>' +
        '</div>' +
        '<div class="radio-card-name">' + escHtml(st.name) + '</div>' +
        '<div class="radio-card-bottom">' +
          '<div class="radio-card-meta">' + (genreLabels[st.genre] || st.genre) + '</div>' +
          '<div class="radio-card-play" role="button" aria-label="' + st.name + ' oynat">' +
            '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="6,3 20,12 6,21"/></svg>' +
          '</div>' +
        '</div>';

      card.addEventListener('click', function() { toggleStation(st); });
      card.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleStation(st); }
      });
      grid.appendChild(card);
    });
  }

  function toggleStation(st) {
    var playing = isCurrentlyPlaying();
    var sameKey = getCurrentKey() === st.key;

    if (sameKey && playing) {
      radioStop();
      showMiniPlayer(st, false);
    } else {
      radioPlay(st.url, st.name, (miniVolume ? miniVolume.value / 100 : 0.5));
      try {
        var rs = JSON.parse(localStorage.getItem('bs-radio') || '{}');
        rs.key = st.key;
        rs.genre = st.genre;
        localStorage.setItem('bs-radio', JSON.stringify(rs));
      } catch (_) {}
      showMiniPlayer(st, true);
    }
    highlightPlaying();
  }

  function showMiniPlayer(st, playing) {
    if (!miniPlayer || !st) return;
    miniPlayer.classList.add('visible');
    miniGenre.textContent = st.genre || '';
    miniGenre.style.color = genreColors[st.genre] || 'var(--muted)';
    miniName.textContent = st.name || '';
    if (playing) {
      miniPlayIcon.hidden = true;
      miniPauseIcon.hidden = false;
    } else {
      miniPlayIcon.hidden = false;
      miniPauseIcon.hidden = true;
    }
  }

  function hideMiniPlayer() {
    if (miniPlayer) miniPlayer.classList.remove('visible');
  }

  function getCurrentKey() {
    try {
      var rs = JSON.parse(localStorage.getItem('bs-radio') || '{}');
      return rs.key || null;
    } catch (_) { return null; }
  }

  function isCurrentlyPlaying() {
    try {
      var rs = JSON.parse(localStorage.getItem('bs-radio') || '{}');
      return !!(rs && rs.playing);
    } catch (_) { return false; }
  }

  function getCurrentStation() {
    var key = getCurrentKey();
    if (!key) return null;
    for (var i = 0; i < stations.length; i++) {
      if (stations[i].key === key) return stations[i];
    }
    return null;
  }

  function highlightPlaying() {
    grid.querySelectorAll('.radio-card').forEach(function(c) {
      var playing = isCurrentlyPlaying() && c.dataset.key === getCurrentKey();
      c.classList.toggle('playing', playing);
    });
  }

  function escHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  if (miniPlayBtn) {
    miniPlayBtn.addEventListener('click', function() {
      if (isCurrentlyPlaying()) {
        radioStop();
        var st = getCurrentStation();
        if (st) showMiniPlayer(st, false);
      } else {
        var st2 = getCurrentStation();
        if (st2) {
          radioPlay(st2.url, st2.name, (miniVolume ? miniVolume.value / 100 : 0.5));
          showMiniPlayer(st2, true);
        }
      }
      highlightPlaying();
    });
  }

  if (miniVolume) {
    miniVolume.addEventListener('input', function() {
      radioVolume(miniVolume.value / 100);
    });
  }

  if (miniClose) {
    miniClose.addEventListener('click', function() {
      radioStop();
      hideMiniPlayer();
      highlightPlaying();
    });
  }

  document.addEventListener('keydown', function(e) {
    if (e.target.closest('.radio-mini-player')) return;
    if (e.key === ' ' && e.target === document.body) {
      e.preventDefault();
      if (miniPlayBtn) miniPlayBtn.click();
    }
  });

  renderSkeletons();

  setTimeout(function() {
    renderFilters();
    renderGrid(null);

    var st = getCurrentStation();
    if (st && isCurrentlyPlaying()) {
      showMiniPlayer(st, true);
      highlightPlaying();
    }

    setInterval(highlightPlaying, 3000);
  }, 300);
};
