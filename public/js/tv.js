window.pageCleanupTV = function () {};
window.pageInitTV = function () {
  const channels = {
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
    ],
    movies: [
      { id: 'tubi',      name: 'Tubi Movies',     cid: 'UC3gHkrgDuj-GVHFtUO9jNTg', color: '#fa382f' },
      { id: 'crackle',   name: 'Crackle',         cid: 'UCkLTA9y7KdLVkSE7JgR0c1A', color: '#f5c518' },
      { id: 'popcorn',   name: 'Popcorn Flix',    cid: 'UC1aG8g2VwqZp3LFqTvG7Csg', color: '#ff6600' },
      { id: 'filmrise',  name: 'FilmRise',        cid: 'UC3yA80-LEYTz75K0wrtUuYg', color: '#0099ff' },
      { id: 'plex',      name: 'Plex Free Movies', cid: 'UCsfpYDGCP1h773V0qz2v0eg', color: '#e5a00d' },
      { id: 'freevee',   name: 'Freevee',         cid: 'UC1KqayDAid0zZu1738YtYUg', color: '#00a8e1' },
      { id: 'mometu',    name: 'Momenteu',        cid: 'UCGdFLrB31A8zswV1pMKaI1g', color: '#ff0066' },
      { id: 'movies1',   name: 'Classic Movies',  cid: 'UCgB4HdMiVbS_0Ez0Ej9fTig', color: '#9966cc' }
    ],
    series: [
      { id: 'rivet',     name: 'Rivet',           cid: 'UCk8k4c3S7vC6w8k9v0aG4xA', color: '#00cc88' },
      { id: 'darkmatters', name: 'Dark Matters',  cid: 'UC4SvJrKR37aOG2d9u3aYQDw', color: '#333333' },
      { id: 'watchmojo', name: 'WatchMojo',       cid: 'UC_qaHt3X5kVv-5lKv2RdBdA', color: '#ff3366' },
      { id: 'fandom',    name: 'Fandom',          cid: 'UCkMeMfd1mBQ1FGCds8FJfQg', color: '#ff9900' },
      { id: 'looper',    name: 'Looper',          cid: 'UCaiH1en79Fy8mz3F2z8BcQg', color: '#0066ff' },
      { id: 'insider',   name: 'Insider Series',  cid: 'UC3K2d3H3b5R1g4Z3X7vJ5Ww', color: '#000000' }
    ]
  };

  let currentTab = 'live';
  let iptvItems = [];
  let hlsInstance = null;

  const grid = document.getElementById('tvGrid');
  const player = document.getElementById('tvPlayer');
  const container = document.getElementById('tvPlayerContainer');
  const channelName = document.getElementById('tvChannelName');
  const loading = document.getElementById('tvLoading');
  const tabs = document.getElementById('tvTabs');
  const searchInput = document.getElementById('tvSearchInput');
  if (!grid) return;

  function renderGrid(items) {
    grid.innerHTML = '';
    if (items.length === 0) {
      grid.innerHTML = '<div class="tv-empty">Kanal bulunamadı</div>';
      return;
    }
    items.forEach(ch => {
      const card = document.createElement('div');
      card.className = 'tv-card';
      const colorBar = ch.color ? '<div class="tv-card-color" style="background:' + ch.color + '"></div>' : '';
      const logo = ch.logo ? '<img class="tv-card-logo" src="' + ch.logo + '" loading="lazy" onerror="this.style.display=\'none\'" />' : '';
      const name = '<div class="tv-card-name">' + escapeHtml(ch.name) + '</div>';
      const group = ch.group ? '<div class="tv-card-group">' + escapeHtml(ch.group) + '</div>' : '';
      card.innerHTML = colorBar + logo + name + group;
      card.addEventListener('click', () => playChannel(ch));
      grid.appendChild(card);
    });
  }

  function showTab(tab) {
    currentTab = tab;
    tabs.querySelectorAll('.tv-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    player.hidden = true;
    container.innerHTML = '';
    if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }

    if (tab === 'iptv') {
      loadIPTV();
    } else {
      const list = channels[tab] || [];
      const q = (searchInput.value || '').toLowerCase();
      const filtered = q ? list.filter(c => c.name.toLowerCase().includes(q)) : list;
      renderGrid(filtered);
    }
  }

  function loadIPTV() {
    loading.hidden = false;
    grid.innerHTML = '';
    Promise.all([
      fetch('/api/iptv?list=0').then(r => r.json()).catch(() => ({ items: [] })),
      fetch('/api/iptv?list=1').then(r => r.json()).catch(() => ({ items: [] }))
    ]).then(([live, movies]) => {
      loading.hidden = true;
      iptvItems = [
        ...(live.items || []).map(i => ({ ...i, color: '#003399' })),
        ...(movies.items || []).map(i => ({ ...i, color: '#ff6600' }))
      ];
      const q = (searchInput.value || '').toLowerCase();
      const filtered = q ? iptvItems.filter(c => c.name.toLowerCase().includes(q) || (c.group || '').toLowerCase().includes(q)) : iptvItems;
      renderGrid(filtered);
    }).catch(() => {
      loading.hidden = true;
      grid.innerHTML = '<div class="tv-empty">IPTV listesi yüklenemedi</div>';
    });
  }

  function playChannel(ch) {
    channelName.textContent = ch.name;
    player.hidden = false;
    container.innerHTML = '<div class="tv-loading">Yükleniyor...</div>';

    if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }

    if (ch.url && (ch.url.includes('.m3u') || ch.url.includes('m3u8') || ch.url.includes('stream'))) {
      playHLS(ch.url);
    } else if (ch.cid && currentTab === 'live') {
      container.innerHTML = '<iframe src="https://www.youtube.com/embed/live_stream?channel=' + ch.cid + '&autoplay=1&mute=1" allow="autoplay;encrypted-media" allowfullscreen></iframe>';
    } else if (ch.cid) {
      fetch('/api/tv-rss/' + ch.cid)
        .then(r => r.json())
        .then(data => {
          if (data.videoId) {
            container.innerHTML = '<iframe src="https://www.youtube.com/embed/' + data.videoId + '?autoplay=1&mute=1" allow="autoplay;encrypted-media" allowfullscreen></iframe>';
          } else {
            container.innerHTML = '<div class="tv-loading">Yayın bulunamadı</div>';
          }
        })
        .catch(() => container.innerHTML = '<div class="tv-loading">Bağlantı hatası</div>');
    } else {
      container.innerHTML = '<div class="tv-loading">Kaynak bulunamadı</div>';
    }
  }

  function playHLS(url) {
    const video = document.createElement('video');
    video.autoplay = true;
    video.controls = true;
    video.playsInline = true;
    video.style.width = '100%';
    video.style.maxHeight = '70vh';
    video.style.background = '#000';
    container.innerHTML = '';
    container.appendChild(video);

    if (url.includes('.m3u8') || url.includes('m3u')) {
      const proxyUrl = '/api/iptv/proxy?url=' + encodeURIComponent(url);
      if (window.Hls && Hls.isSupported()) {
        hlsInstance = new Hls({ maxBufferLength: 10 });
        hlsInstance.loadSource(proxyUrl);
        hlsInstance.attachMedia(video);
        hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
        hlsInstance.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            hlsInstance.loadSource(url);
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = proxyUrl;
        video.addEventListener('loadedmetadata', () => video.play().catch(() => {}));
      } else {
        video.src = url;
        video.addEventListener('loadedmetadata', () => video.play().catch(() => {}));
      }
    } else {
      video.src = url;
      video.play().catch(() => {});
    }
  }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  tabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.tv-tab');
    if (tab) showTab(tab.dataset.tab);
  });

  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => showTab(currentTab), 300);
  });

  document.getElementById('tvClose').addEventListener('click', () => {
    player.hidden = true;
    container.innerHTML = '';
    if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
  });

  showTab('live');
};
