let _homeInit = false;
let _homeInterval = null;

window.pageCleanupHome = function () {
  if (_homeInterval) { clearInterval(_homeInterval); _homeInterval = null; }
};

window.pageInitHome = function () {
  pageCleanupHome();
  _homeInit = false;
  const socket = io();
  const newMeetingBtn = document.getElementById('newMeetingBtn');
  const scheduleBtn = document.getElementById('scheduleBtn');
  const joinForm = document.getElementById('joinForm');
  const roomCodeInput = document.getElementById('roomCode');
  const meetingList = document.getElementById('meetingList');
  const nameOverlay = document.getElementById('nameGateOverlay');
  const nameInput = document.getElementById('nameGateInput');
  const nameConfirm = document.getElementById('nameGateConfirm');
  const nameCancel = document.getElementById('nameGateCancel');
  let nameGateResolve = null;

  function showNameGate() {
    return new Promise((resolve) => {
      nameGateResolve = resolve;
      nameInput.value = getUserName();
      nameOverlay.hidden = false;
      renderAvatarPicker('avatarGrid');
      setTimeout(() => nameInput.focus(), 50);
    });
  }

  nameConfirm.addEventListener('click', () => {
    const v = nameInput.value.trim();
    if (!v) { toast('Adınızı girin', 'error'); nameInput.focus(); return; }
    localStorage.setItem('bs-name', v);
    nameOverlay.hidden = true;
    if (nameGateResolve) nameGateResolve(v);
    nameGateResolve = null;
  });

  nameCancel.addEventListener('click', () => {
    nameOverlay.hidden = true;
    if (nameGateResolve) nameGateResolve(null);
    nameGateResolve = null;
  });

  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') nameConfirm.click();
    if (e.key === 'Escape') nameCancel.click();
  });

  function renderMeetings() {
    const list = getMeetings();
    if (list.length === 0) {
      meetingList.innerHTML = '<div class="meeting-list-empty">Henüz toplantı yok</div>';
      return;
    }
      meetingList.innerHTML = '';
    list.forEach(m => {
      const item = document.createElement('div');
      item.className = 'meeting-item';
      const dateStr = (m.scheduledAt || m.createdAt) ? formatDateTime(m.scheduledAt || m.createdAt) : '';
      item.innerHTML =
        '<div class="meeting-item-code">' + escapeHtml(m.code) + '</div>' +
        '<div class="meeting-item-time">' + escapeHtml(m.title || 'Toplantı') + (dateStr ? ' · ' + escapeHtml(dateStr) : '') + '</div>';
      item.addEventListener('click', () => {
        window.location.href = '/prejoin.html?code=' + encodeURIComponent(m.code);
      });
      meetingList.appendChild(item);
    });
  }

  function getUserName() {
    const u = getUser();
    if (u && u.name) return u.name;
    return localStorage.getItem('bs-name') || '';
  }

  async function startMeeting() {
    let name = getUserName();
    if (!name) {
      name = await showNameGate();
      if (!name) return;
    }
    newMeetingBtn.disabled = true;
    socket.emit('create-room', (res) => {
      newMeetingBtn.disabled = false;
      if (res && res.code) {
        addMeeting({ code: res.code, title: 'Hemen başlatılan toplantı' });
        window.location.href = '/prejoin.html?code=' + encodeURIComponent(res.code) + '&name=' + encodeURIComponent(name);
      } else {
        toast('Toplantı oluşturulamadı', 'error');
      }
    });
  }

  newMeetingBtn.addEventListener('click', startMeeting);
  scheduleBtn.addEventListener('click', () => window.location.href = '/schedule.html');

  joinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = extractRoomCode(roomCodeInput.value);
    if (!code) { toast('Toplantı kodu girin', 'error'); return; }
    let name = getUserName();
    if (!name) {
      name = await showNameGate();
      if (!name) return;
    }
    window.location.href = '/prejoin.html?code=' + encodeURIComponent(code) + '&name=' + encodeURIComponent(name);
  });

  const params = new URLSearchParams(window.location.search);
  const codeParam = params.get('code');
  if (codeParam) roomCodeInput.value = codeParam;

  renderMeetings();

  // News
  let currentCategory = 'turkey';
  const newsGrid = document.getElementById('newsGrid');
  const newsTime = document.getElementById('newsTime');
  const newsRefreshBtn = document.getElementById('newsRefreshBtn');
  const newsTabs = document.querySelectorAll('.news-tab');

  function stripHtml(s) {
    const el = document.createElement('div');
    el.innerHTML = s;
    return el.textContent || el.innerText || '';
  }

  function fetchNews(category) {
    currentCategory = category;
    newsGrid.innerHTML = '<div class="news-loading">Yükleniyor...</div>';
    fetch('/api/news/' + category)
      .then(r => r.json())
      .then(data => {
        if (!data.items || data.items.length === 0) {
          newsGrid.innerHTML = '<div class="news-loading">Bulunamadı</div>';
          return;
        }
        newsGrid.innerHTML = '';
        data.items.forEach(item => {
          const card = document.createElement('a');
          card.className = 'news-card';
          card.href = item.link;
          card.target = '_blank';
          card.rel = 'noopener';
          let timeStr = '';
          if (item.pubDate) {
            try {
              const d = new Date(item.pubDate);
              if (!isNaN(d.getTime())) {
                const now = new Date();
                const diffMin = Math.floor((now - d) / 60000);
                if (diffMin < 60) timeStr = diffMin + ' dk';
                else if (diffMin < 1440) timeStr = Math.floor(diffMin / 60) + ' saat';
                else if (diffMin < 0) timeStr = d.toLocaleDateString('tr-TR');
                else timeStr = d.toLocaleDateString('tr-TR');
              }
            } catch (e) {}
          }
          const title = stripHtml(item.title);
          const desc = stripHtml(item.desc || '');
          let html = '';
          if (item.source) html += '<div class="news-card-source">' + escapeHtml(stripHtml(item.source)) + '</div>';
          html += '<div class="news-card-title">' + escapeHtml(title) + '</div>';
          if (desc) html += '<div class="news-card-desc">' + escapeHtml(desc.substring(0, 120)) + '</div>';
          if (timeStr) html += '<div class="news-card-time">' + timeStr + '</div>';
          card.innerHTML = html;
          newsGrid.appendChild(card);
        });
        if (data.time) {
          const t = new Date(data.time);
          if (!isNaN(t.getTime())) newsTime.textContent = t.toLocaleTimeString('tr-TR');
        }
      })
      .catch(() => {
        newsGrid.innerHTML = '<div class="news-loading">Hata</div>';
      });
  }

  newsTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      newsTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      fetchNews(tab.dataset.category);
    });
  });

  if (newsRefreshBtn) newsRefreshBtn.addEventListener('click', () => fetchNews(currentCategory));

  fetchNews('turkey');

  // Stock strip
  const dashStockItems = document.getElementById('dashStockItems');
  const dashStockTime = document.getElementById('dashStockTime');

  function fetchStock() {
    fetch('/api/stock').then(r => r.json()).then(data => {
      if (!data.items || data.items.length === 0) return;
      let html = '';
      data.items.forEach(item => {
        const cls = item.chg > 0 ? 'stock-up' : item.chg < 0 ? 'stock-down' : '';
        const arrow = item.chg > 0 ? '▲' : item.chg < 0 ? '▼' : '—';
        const val = typeof item.val === 'number' ? item.val.toLocaleString('tr-TR', { maximumFractionDigits: 2 }) : item.val;
        html += '<span class="stock-item ' + cls + '"><span class="stock-sym">' + item.sym + '</span><span class="stock-val">' + val + '</span><span class="stock-chg">' + arrow + ' ' + Math.abs(item.chg).toFixed(2) + '%</span></span>';
      });
      dashStockItems.innerHTML = html + html;
      if (data.time) {
        const t = new Date(data.time);
        if (!isNaN(t.getTime())) dashStockTime.textContent = t.toLocaleTimeString('tr-TR');
      }
    }).catch(() => {});
  }

  fetchStock();
  _homeInterval = setInterval(fetchStock, 15000);

  // Namaz Vakitleri
  const dashNamazTimes = document.getElementById('dashNamazTimes');
  const dashNamazNext = document.getElementById('dashNamazNext');
  const dashNamazLocation = document.getElementById('dashNamazLocation');
  const prayerLabels = { imsak: 'İmsak', gunes: 'Güneş', ogle: 'Öğle', ikindi: 'İkindi', aksam: 'Akşam', yatsi: 'Yatsı' };
  const prayerOrder = ['imsak', 'gunes', 'ogle', 'ikindi', 'aksam', 'yatsi'];

  function populateCities() {
    if (!dashNamazLocation) return;
    const saved = localStorage.getItem('bs-namaz-city') || '9541';
    fetch('/api/iller').then(r => r.json()).then(cities => {
      dashNamazLocation.innerHTML = '';
      cities.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name.charAt(0) + c.name.slice(1).toLowerCase();
        if (String(c.id) === saved) opt.selected = true;
        dashNamazLocation.appendChild(opt);
      });
    }).catch(() => {});
  }
  populateCities();

  function fetchNamaz() {
    const locId = dashNamazLocation ? dashNamazLocation.value : '9541';
    if (dashNamazLocation) localStorage.setItem('bs-namaz-city', locId);
    fetch('/api/namaz?location_id=' + locId).then(r => r.json()).then(data => {
      if (!dashNamazTimes) return;
      if (!data || !data.data) { dashNamazTimes.innerHTML = '<span class="stock-loading-sm">Namaz vakitleri alınamadı</span>'; return; }
      const today = data.data.find(d => {
        const dt = new Date(d.date);
        return dt.toDateString() === new Date().toDateString();
      }) || data.data[0];
      if (!today || !today.timings) { dashNamazTimes.innerHTML = '<span class="stock-loading-sm">Veri bulunamadı</span>'; return; }
      const now = new Date();
      let nextFound = false;
      let html = '';
      prayerOrder.forEach(key => {
        const time = today.timings[key];
        if (!time) return;
        const [h, m] = time.split(':').map(Number);
        const prayerDate = new Date(now);
        prayerDate.setHours(h, m, 0, 0);
        const isPassed = now > prayerDate;
        const isNext = !nextFound && !isPassed;
        if (isNext) nextFound = true;
        const cls = isNext ? 'active' : (isPassed ? 'passed' : '');
        html += '<div class="namaz-item ' + cls + '"><span class="namaz-label">' + prayerLabels[key] + '</span><span class="namaz-value">' + time.substring(0, 5) + '</span></div>';
      });
      dashNamazTimes.innerHTML = html;
      if (dashNamazNext) {
        if (nextFound) {
          const activeEl = dashNamazTimes.querySelector('.namaz-item.active .namaz-label');
          dashNamazNext.textContent = 'Sonraki: ' + (activeEl ? activeEl.textContent : '');
        } else {
          dashNamazNext.textContent = 'Tüm vakitler geçti';
        }
      }
    }).catch(() => {
      if (dashNamazTimes) dashNamazTimes.innerHTML = '<span class="stock-loading-sm">Bağlantı hatası</span>';
    });
  }

  if (dashNamazLocation) dashNamazLocation.addEventListener('change', fetchNamaz);
  fetchNamaz();

  // Ayet / Hadis / Kıssadan Hisse
  function fetchWisdom() {
    fetch('/api/wisdom').then(r => r.json()).then(data => {
      const txt = document.getElementById('dashWisdomText');
      const src = document.getElementById('dashWisdomSource');
      if (txt && data.text) txt.textContent = data.text;
      if (src && data.source) src.textContent = data.source;
    }).catch(() => {});
  }
  fetchWisdom();

  // X/Twitter RSS Feed
  let currentXHandle = 'anadoluajansi';
  const xFeed = document.getElementById('xFeed');
  const xTabs = document.querySelectorAll('.x-tab');

  function fetchXFeed(handle) {
    currentXHandle = handle;
    if (xFeed) xFeed.innerHTML = '<div class="x-loading">Yükleniyor...</div>';
    fetch('/api/twitter/' + handle)
      .then(r => r.json())
      .then(data => {
        if (!data.items || data.items.length === 0) {
          if (xFeed) xFeed.innerHTML = '<div class="x-tweet-empty">Gönderi bulunamadı</div>';
          return;
        }
        if (!xFeed) return;
        xFeed.innerHTML = '';
        data.items.forEach(item => {
          const card = document.createElement('a');
          card.className = 'x-tweet';
          card.href = item.link;
          card.target = '_blank';
          card.rel = 'noopener';
          let timeStr = '';
          if (item.pubDate) {
            try {
              const d = new Date(item.pubDate);
              if (!isNaN(d.getTime())) {
                const now = new Date();
                const diffMin = Math.floor((now - d) / 60000);
                if (diffMin < 60) timeStr = diffMin + ' dk';
                else if (diffMin < 1440) timeStr = Math.floor(diffMin / 60) + ' saat';
                else timeStr = d.toLocaleDateString('tr-TR');
              }
            } catch (e) {}
          }
          const text = item.desc || item.title || '';
          let html = '';
          if (text) html += '<div class="x-tweet-text">' + escapeHtml(text.substring(0, 280)) + '</div>';
          if (timeStr) html += '<div class="x-tweet-time">@' + escapeHtml(handle) + ' · ' + timeStr + '</div>';
          card.innerHTML = html;
          xFeed.appendChild(card);
        });
      })
      .catch(() => {
        if (xFeed) xFeed.innerHTML = '<div class="x-tweet-empty">Bağlantı hatası</div>';
      });
  }

  if (xTabs) {
    xTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        xTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        fetchXFeed(tab.dataset.handle);
      });
    });
  }
  fetchXFeed('anadoluajansi');
};
