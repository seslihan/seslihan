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

  setTimeout(() => {
    if (window.twttr && window.twttr.widgets) window.twttr.widgets.load();
  }, 2000);
};
