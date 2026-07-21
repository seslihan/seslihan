window.pageCleanupTV = function () {
  document.removeEventListener('keydown', tvKeyHandler);
};

var tvKeyHandler;
window.pageInitTV = function () {
  var channels = {
    live: [
      { id: 'cnnturk',   name: 'CNN Türk',     cid: 'UCV6zcRug6Hqp1UX_FdyUeBg', color: '#e30a17' },
      { id: 'trthaber',  name: 'TRT Haber',    cid: 'UCBgTP2LOFVPmq15W-RH-WXA', color: '#003399' },
      { id: 'haberturk', name: 'Habertürk TV', cid: 'UCn6dNfiRE_Xunu7iMyvD7AA', color: '#e4002b' },
      { id: 'ntv',       name: 'NTV',          cid: 'UCyR7iLc73OW1kuW3qnvGVBQ', color: '#c8102e' },
      { id: 'showtv',    name: 'Show TV',      cid: 'UC9JMe_We017gYrRc7kZHgmg', color: '#0066cc' },
      { id: 'ahaber',    name: 'A Haber',      cid: 'UCKQhfw-lzz0uKnE1fY1PsAA', color: '#c8102e' },
      { id: 'tv8',       name: 'TV8',          cid: 'UCp4N3g1zcvp8WE2qJ_JKqBg', color: '#6c2dc7' },
      { id: '24tv',      name: '24 TV',        cid: 'UCN7VYCsI4Lx1-J4_BtjoWUA', color: '#003366' },
      { id: 'trt1',      name: 'TRT 1',        cid: 'UCvFudBDDILdDljN4VIZ4Msw', color: '#c8102e' },
      { id: 'kanald',    name: 'Kanal D',      cid: 'UCFoe1tg8MuHjRzmqXtV816A', color: '#e30a17' },
      { id: 'atv',       name: 'ATV',          cid: 'UCUVZ7T_kwkxDOGFcDlFI-hg', color: '#003399' },
      { id: 'star',      name: 'Star TV',      cid: 'UCnowC2m_NjWexnSRvMMYxSg', color: '#0066cc' }
    ]
  };

  var currentTab = 'live';
  var tabVersion = 0;
  var iptvItems = [];
  var dpCache = {};
  var hlsInstance = null;

  var grid = document.getElementById('tvGrid');
  var player = document.getElementById('tvPlayer');
  var container = document.getElementById('tvPlayerContainer');
  var channelName = document.getElementById('tvChannelName');
  var loading = document.getElementById('tvLoading');
  var tabs = document.getElementById('tvTabs');
  var searchInput = document.getElementById('tvSearchInput');
  var detailBox = document.getElementById('tvDetail');
  if (!grid || !player || !tabs || !searchInput) return;

  function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function showPlayer() {
    player.hidden = false;
    player.classList.add('tv-player--active');
  }

  function renderGrid(items) {
    grid.innerHTML = '';
    if (items.length === 0) {
      grid.innerHTML = '<div class="tv-empty">Kanal bulunamadı</div>';
      return;
    }
    items.forEach(function(ch) {
      var card = document.createElement('div');
      card.className = 'tv-card';
      var colorBar = ch.color ? '<div class="tv-card-color" style="background:' + esc(ch.color) + '"></div>' : '';
      var name = '<div class="tv-card-name">' + esc(ch.name) + '</div>';
      var group = ch.group ? '<div class="tv-card-group">' + esc(ch.group) + '</div>' : '';
      card.innerHTML = colorBar + name + group;
      card.addEventListener('click', function() { playChannel(ch); });
      grid.appendChild(card);
    });
  }

  function renderDP(items) {
    grid.innerHTML = '';
    var q = (searchInput.value || '').toLowerCase();
    var filtered = q ? items.filter(function(i) { return (i.title || '').toLowerCase().indexOf(q) !== -1; }) : items;
    if (filtered.length === 0) {
      grid.innerHTML = '<div class="tv-empty">Sonuç bulunamadı</div>';
      return;
    }
    filtered.forEach(function(item) {
      var card = document.createElement('div');
      card.className = 'dp-card';
      var poster = item.poster
        ? '<img class="dp-poster" src="' + esc(item.poster) + '" loading="lazy" onerror="this.outerHTML=\'<div class=dp-poster-placeholder>🎬</div>\'" />'
        : '<div class="dp-poster-placeholder">🎬</div>';
      var rankBadge = item.rank ? '<div class="dp-rank-badge">' + esc(String(item.rank)) + '</div>' : '';
      var typeBadge = '<div class="dp-type-badge">' + esc(item.type || 'Film') + '</div>';
      var rating = item.rating ? '<span class="dp-rating">⭐ ' + esc(item.rating) + '</span>' : '';
      var year = item.year ? '<span class="dp-year">' + esc(item.year) + '</span>' : '';
      var meta = (rating || year) ? '<div class="dp-meta">' + rating + year + '</div>' : '';
      card.innerHTML = rankBadge + typeBadge + poster + '<div class="dp-info"><div class="dp-title">' + esc(item.title) + '</div>' + meta + '</div>';
      card.addEventListener('click', function() { showDPDetail(item); });
      grid.appendChild(card);
    });
  }

  function showTab(tab) {
    currentTab = tab;
    var ver = ++tabVersion;
    tabs.querySelectorAll('.tv-tab').forEach(function(t) { t.classList.toggle('active', t.dataset.tab === tab); });
    loading.hidden = true;
    player.hidden = true;
    player.classList.remove('tv-player--active');
    container.innerHTML = '';
    detailBox.hidden = true;
    detailBox.innerHTML = '';
    if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
    searchInput.value = '';
    var isPoster = tab === 'trend-movies' || tab === 'trend-series' || tab === 'movies' || tab === 'series';
    grid.classList.toggle('poster-grid', isPoster);

    if (tab === 'iptv') {
      loadIPTV(ver);
    } else if (isPoster) {
      loadDizipal(tab, ver);
    } else {
      var list = channels[tab] || [];
      renderGrid(list);
    }
  }

  function loadIPTV(ver) {
    loading.hidden = false;
    grid.innerHTML = '';
    Promise.all([
      fetch('/api/iptv?list=0').then(function(r) { return r.json(); }).catch(function() { return { items: [] }; }),
      fetch('/api/iptv?list=1').then(function(r) { return r.json(); }).catch(function() { return { items: [] }; })
    ]).then(function(result) {
      if (ver !== tabVersion) return;
      loading.hidden = true;
      var live = result[0], movies = result[1];
      iptvItems = [
        (live.items || []).map(function(i) { return Object.assign({}, i, { color: '#003399' }); }),
        (movies.items || []).map(function(i) { return Object.assign({}, i, { color: '#ff6600' }); })
      ].reduce(function(a, b) { return a.concat(b); }, []);
      if (iptvItems.length === 0) {
        grid.innerHTML = '<div class="tv-empty">IPTV listesi alınamadı</div>';
        return;
      }
      renderGrid(iptvItems);
    }).catch(function() {
      if (ver !== tabVersion) return;
      loading.hidden = true;
      grid.innerHTML = '<div class="tv-empty">IPTV listesi yüklenemedi</div>';
    });
  }

  function loadDizipal(type, ver) {
    if (dpCache[type] && dpCache[type].length > 0) {
      renderDP(dpCache[type]);
      return;
    }
    loading.hidden = false;
    grid.innerHTML = '';
    fetch('/api/dizipal?type=' + type)
      .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function(data) {
        if (ver !== tabVersion) return;
        loading.hidden = true;
        var items = data.items || [];
        dpCache[type] = items;
        if (items.length === 0) {
          grid.innerHTML = '<div class="tv-empty">İçerik bulunamadı</div>';
          return;
        }
        renderDP(items);
      })
      .catch(function(err) {
        if (ver !== tabVersion) return;
        loading.hidden = true;
        grid.innerHTML = '<div class="tv-empty">İçerik yüklenemedi — lütfen tekrar deneyin</div>';
      });
  }

  function showDPDetail(item) {
    detailBox.hidden = false;
    var poster = item.poster ? '<img src="' + esc(item.poster) + '" class="dp-detail-poster" onerror="this.style.display=\'none\'" />' : '';
    var rating = item.rating ? '<div class="dp-detail-row"><b>Puan:</b> ⭐ ' + esc(item.rating) + '/10</div>' : '';
    var year = item.year ? '<div class="dp-detail-row"><b>Yıl:</b> ' + esc(item.year) + '</div>' : '';
    var typeTag = item.type ? '<span class="dp-detail-type">' + esc(item.type) + '</span>' : '';
    var desc = item.desc ? '<div class="dp-detail-row">' + esc(item.desc) + '</div>' : '';
    var watchLink = item.url ? '<a href="' + esc(item.url) + '" target="_blank" class="dp-detail-link">Dizipal\'de İzle →</a>' : '';
    detailBox.innerHTML = '<div class="dp-detail">' + poster + '<div class="dp-detail-text">' + typeTag + rating + year + desc + watchLink + '</div><div style="clear:both"></div></div>';
    detailBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function playChannel(ch) {
    channelName.textContent = ch.name;
    container.innerHTML = '<div class="player-loading">Yükleniyor...</div>';
    if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
    detailBox.hidden = true;
    detailBox.innerHTML = '';
    showPlayer();

    if (ch.url && (ch.url.indexOf('.m3u') !== -1 || ch.url.indexOf('.m3u8') !== -1 || ch.url.indexOf('stream') !== -1)) {
      playHLS(ch.url);
    } else if (ch.cid) {
      fetch('/api/tv-rss/' + ch.cid)
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.videoId) {
            container.innerHTML = '<iframe src="https://www.youtube.com/embed/' + data.videoId + '?autoplay=1&mute=1" allow="autoplay;encrypted-media" allowfullscreen></iframe>';
          } else {
            container.innerHTML = '<div class="player-loading">Yayın şu an aktif değil</div>';
          }
        })
        .catch(function() { container.innerHTML = '<div class="player-loading">Bağlantı hatası</div>'; });
    } else {
      container.innerHTML = '<div class="player-loading">Kaynak bulunamadı</div>';
    }
    player.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function playHLS(url) {
    var video = document.createElement('video');
    video.autoplay = true;
    video.controls = true;
    video.playsInline = true;
    video.style.width = '100%';
    video.style.maxHeight = '70vh';
    video.style.background = '#000';
    container.innerHTML = '';
    container.appendChild(video);

    var proxyUrl = '/api/iptv/proxy?url=' + encodeURIComponent(url);
    if (url.indexOf('.m3u8') !== -1 || url.indexOf('.m3u') !== -1) {
      if (window.Hls && Hls.isSupported()) {
        hlsInstance = new Hls({ maxBufferLength: 10 });
        hlsInstance.loadSource(proxyUrl);
        hlsInstance.attachMedia(video);
        hlsInstance.on(Hls.Events.MANIFEST_PARSED, function() { video.play().catch(function() {}); });
        hlsInstance.on(Hls.Events.ERROR, function(_, data) {
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              hlsInstance.startLoad();
            } else {
              hlsInstance.loadSource(url);
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = proxyUrl;
        video.addEventListener('loadedmetadata', function() { video.play().catch(function() {}); });
      } else {
        video.src = url;
        video.addEventListener('loadedmetadata', function() { video.play().catch(function() {}); });
      }
    } else {
      video.src = url;
      video.play().catch(function() {});
    }
  }

  function closePlayer() {
    player.hidden = true;
    player.classList.remove('tv-player--active');
    container.innerHTML = '';
    if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
  }

  tvKeyHandler = function(e) {
    if (e.key === 'Escape') {
      if (!player.hidden) {
        closePlayer();
        e.preventDefault();
      } else if (!detailBox.hidden) {
        detailBox.hidden = true;
        detailBox.innerHTML = '';
        e.preventDefault();
      }
    }
  };
  document.addEventListener('keydown', tvKeyHandler);

  tabs.addEventListener('click', function(e) {
    var tab = e.target.closest('.tv-tab');
    if (tab) showTab(tab.dataset.tab);
  });

  var searchTimeout;
  searchInput.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(function() {
      if (currentTab === 'iptv') {
        var q = (searchInput.value || '').toLowerCase();
        var filtered = q ? iptvItems.filter(function(c) {
          return (c.name || '').toLowerCase().indexOf(q) !== -1 || (c.group || '').toLowerCase().indexOf(q) !== -1;
        }) : iptvItems;
        renderGrid(filtered);
      } else if (dpCache[currentTab]) {
        renderDP(dpCache[currentTab]);
      } else {
        showTab(currentTab);
      }
    }, 300);
  });

  document.getElementById('tvClose').addEventListener('click', closePlayer);

  showTab('live');
};
