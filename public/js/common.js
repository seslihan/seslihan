(() => {
  // ---------- THEME ----------
  const themeKey = 'bs-theme';
  function getTheme() {
    return localStorage.getItem(themeKey) || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem(themeKey, t);
    document.querySelectorAll('.theme-light, .theme-dark').forEach(el => {
      el.hidden = el.classList.contains('theme-' + (t === 'dark' ? 'light' : 'dark'));
    });
  }
  applyTheme(getTheme());
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('themeBtn');
    if (btn) btn.addEventListener('click', () => {
      applyTheme(getTheme() === 'dark' ? 'light' : 'dark');
    });
  });

  // ---------- TOAST ----------
  window.toast = function (text, type) {
    const host = document.getElementById('toastHost') || (() => {
      const h = document.createElement('div');
      h.id = 'toastHost';
      h.className = 'toast-host';
      document.body.appendChild(h);
      return h;
    })();
    const el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    el.textContent = text;
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, 3000);
  };

  // ---------- USER (localStorage-based) ----------
  const userKey = 'bs-user';
  window.getUser = function () {
    try { return JSON.parse(localStorage.getItem(userKey) || 'null'); }
    catch (_) { return null; }
  };
  window.setUser = function (u) { localStorage.setItem(userKey, JSON.stringify(u)); };
  window.signOut = function () { localStorage.removeItem(userKey); };

  // ---------- MEETINGS (localStorage) ----------
  const meetingsKey = 'bs-meetings';
  window.getMeetings = function () {
    try { return JSON.parse(localStorage.getItem(meetingsKey) || '[]'); }
    catch (_) { return []; }
  };
  window.addMeeting = function (m) {
    const list = getMeetings();
    list.unshift({ ...m, id: m.id || Date.now().toString(36), createdAt: Date.now() });
    localStorage.setItem(meetingsKey, JSON.stringify(list.slice(0, 20)));
  };
  window.removeMeeting = function (id) {
    const list = getMeetings().filter(m => m.id !== id);
    localStorage.setItem(meetingsKey, JSON.stringify(list));
  };

  // ---------- SETTINGS (localStorage) ----------
  const settingsKey = 'bs-settings';
  const defaultSettings = {
    theme: getTheme(),
    defaultMic: '',
    defaultCam: '',
    defaultSpeaker: '',
    noiseReduction: true,
    mirrorVideo: true,
    backgroundBlur: false,
    joinWithMicOff: false,
    joinWithCamOff: false,
    videoQuality: '720p',
    notifications: true,
    sounds: true,
    captionsLang: 'tr-TR',
    reactAnimations: true
  };
  window.getSettings = function () {
    try { return { ...defaultSettings, ...JSON.parse(localStorage.getItem(settingsKey) || '{}') }; }
    catch (_) { return { ...defaultSettings }; }
  };
  window.saveSettings = function (s) { localStorage.setItem(settingsKey, JSON.stringify(s)); };

  // ---------- PROFILE MENU ----------
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('profileBtn');
    const dd = document.getElementById('profileDropdown');
    if (btn && dd) {
      const user = getUser();
      const nameEl = document.getElementById('profileName');
      const emailEl = document.getElementById('profileEmail');
      const signOutBtn = document.getElementById('signOutBtn');
      const authBtn = document.getElementById('authBtn');
      if (user) {
        if (nameEl) nameEl.textContent = user.name;
        if (emailEl) emailEl.textContent = user.email;
        if (authBtn) authBtn.textContent = 'Profil';
        if (signOutBtn) signOutBtn.hidden = false;
        if (btn) btn.textContent = (user.name || '?').charAt(0).toUpperCase();
      }
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        dd.hidden = !dd.hidden;
      });
      document.addEventListener('click', (e) => {
        if (!dd.hidden && !dd.contains(e.target) && e.target !== btn) dd.hidden = true;
      });
      if (authBtn) authBtn.addEventListener('click', () => {
        if (user) window.location.href = '/settings.html';
        else window.location.href = '/auth.html';
      });
      if (signOutBtn) signOutBtn.addEventListener('click', () => {
        if (confirm('Çıkış yapmak istediğinize emin misiniz?')) {
          signOut();
          location.reload();
        }
      });
    }
  });

  // ---------- SPA ROUTER ----------
  (function initRouter() {
    const mainEl = () => document.querySelector('main');
    const PAGES = {
      '/': '/index.html',
      '/tv': '/tv.html',
      '/radio': '/radio.html',
      '/stock': '/stock.html',
      '/whiteboard': '/whiteboard.html'
    };
    let loading = false;

    function extractBody(html) {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return { main: doc.querySelector('main'), title: doc.querySelector('title') };
    }

    function loadPage(url, push) {
      if (loading || url === location.pathname) return;
      loading = true;
      fetch(url, { headers: { 'X-Request': 'spa' } })
        .then(r => r.ok ? r.text() : Promise.reject())
        .then(html => {
          const { main, title } = extractBody(html);
          if (!main) { loading = false; return; }
          const m = mainEl();
          if (m) m.innerHTML = main.innerHTML;
          if (title) document.title = title.textContent;
          if (push) history.pushState({}, '', url);
          window.scrollTo(0, 0);
          runScripts();
          loading = false;
        })
        .catch(() => { loading = false; window.location.href = url; });
    }

    function runScripts() {
      document.querySelectorAll('main script[data-spa]').forEach(old => old.remove());
      document.querySelectorAll('main [data-spa-src]').forEach(el => {
        if (document.querySelector('script[data-spa][src="' + el.dataset.spaSrc + '"]')) return;
        const s = document.createElement('script');
        s.src = el.dataset.spaSrc;
        s.setAttribute('data-spa', '1');
        document.body.appendChild(s);
      });
    }

    document.addEventListener('click', e => {
      const a = e.target.closest('a[data-spa]');
      if (!a) return;
      const url = a.getAttribute('href');
      if (!url || url.startsWith('http') || url.startsWith('#')) return;
      e.preventDefault();
      loadPage(url, true);
    });

    window.addEventListener('popstate', () => {
      loadPage(location.pathname, false);
    });
  })();
  window.escapeHtml = function (s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  };

  window.formatSize = function (b) {
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    if (b < 1024 * 1024 * 1024) return (b / 1024 / 1024).toFixed(1) + ' MB';
    return (b / 1024 / 1024 / 1024).toFixed(2) + ' GB';
  };

  window.formatTime = function (t) {
    const d = new Date(t);
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  };

  window.formatDateTime = function (t) {
    const d = new Date(t);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  window.formatDuration = function (sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return h + ':' + m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0');
    return m + ':' + s.toString().padStart(2, '0');
  };

  // ---------- URL HELPERS ----------
  window.extractRoomCode = function (input) {
    if (!input) return '';
    input = input.trim();
    try {
      const u = new URL(input);
      const fromQuery = u.searchParams.get('code') || u.searchParams.get('room');
      if (fromQuery) return fromQuery.toUpperCase();
      const parts = u.pathname.split('/').filter(Boolean);
      const last = parts[parts.length - 1];
      if (last) return last.toUpperCase();
    } catch (_) {}
    return input.toUpperCase();
  };

  // ---------- MEDIA UTILS ----------
  window.getAudioDevices = async function () {
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      return {
        mics: devs.filter(d => d.kind === 'audioinput'),
        cams: devs.filter(d => d.kind === 'videoinput'),
        speakers: devs.filter(d => d.kind === 'audiooutput')
      };
    } catch (_) { return { mics: [], cams: [], speakers: [] }; }
  };

  window.setSinkId = async function (videoEl, deviceId) {
    if (videoEl && typeof videoEl.setSinkId === 'function' && deviceId) {
      try { await videoEl.setSinkId(deviceId); } catch (_) {}
    }
  };

  // ---------- WATERMARK ----------
  window.spawnWatermarks = function (count) {
    count = count || 12;
    var layer = document.createElement('div');
    layer.className = 'watermark-layer';
    document.body.prepend(layer);
    var items = [];
    for (var i = 0; i < count; i++) {
      var img = document.createElement('img');
      img.src = '/seslihanlogo2.png';
      img.alt = '';
      var size = 120 + Math.random() * 200;
      img.width = size;
      var vw = window.innerWidth;
      var vh = window.innerHeight;
      var x = Math.random() * (vw - size);
      var y = Math.random() * (vh - size);
      var angle = Math.random() * Math.PI * 2;
      var speed = 0.1 + Math.random() * 0.35;
      var vx = Math.cos(angle) * speed;
      var vy = Math.sin(angle) * speed;
      var rot = Math.random() * 360;
      var rotV = (Math.random() - 0.5) * 0.5;
      img.style.left = x + 'px';
      img.style.top = y + 'px';
      img.style.transform = 'rotate(' + rot + 'deg)';
      layer.appendChild(img);
      items.push({ el: img, x: x, y: y, vx: vx, vy: vy, rot: rot, rotV: rotV, w: size, h: size });
    }
    function tick() {
      var vw = window.innerWidth;
      var vh = window.innerHeight;
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        it.x += it.vx;
        it.y += it.vy;
        it.rot += it.rotV;
        if (it.x <= 0) { it.x = 0; it.vx = Math.abs(it.vx); it.rotV = -it.rotV; }
        if (it.x + it.w >= vw) { it.x = vw - it.w; it.vx = -Math.abs(it.vx); it.rotV = -it.rotV; }
        if (it.y <= 0) { it.y = 0; it.vy = Math.abs(it.vy); it.rotV = -it.rotV; }
        if (it.y + it.h >= vh) { it.y = vh - it.h; it.vy = -Math.abs(it.vy); it.rotV = -it.rotV; }
        it.el.style.left = it.x + 'px';
        it.el.style.top = it.y + 'px';
        it.el.style.transform = 'rotate(' + it.rot + 'deg)';
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  };

  window.spawnChatWatermarks = function (container, count) {
    count = count || 6;
    var layer = document.createElement('div');
    layer.className = 'chat-watermark';
    layer.style.position = 'relative';
    container.prepend(layer);
    var items = [];
    for (var i = 0; i < count; i++) {
      var img = document.createElement('img');
      img.src = '/seslihanlogo2.png';
      img.alt = '';
      var size = 60 + Math.random() * 100;
      img.width = size;
      var x = Math.random() * (container.clientWidth - size);
      var y = Math.random() * (container.clientHeight - size);
      var angle = Math.random() * Math.PI * 2;
      var speed = 0.08 + Math.random() * 0.2;
      var vx = Math.cos(angle) * speed;
      var vy = Math.sin(angle) * speed;
      var rot = Math.random() * 360;
      var rotV = (Math.random() - 0.5) * 0.3;
      img.style.left = x + 'px';
      img.style.top = y + 'px';
      img.style.transform = 'rotate(' + rot + 'deg)';
      layer.appendChild(img);
      items.push({ el: img, x: x, y: y, vx: vx, vy: vy, rot: rot, rotV: rotV, w: size, h: size });
    }
    function tick() {
      var bw = container.clientWidth;
      var bh = container.clientHeight;
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        it.x += it.vx;
        it.y += it.vy;
        it.rot += it.rotV;
        if (it.x <= 0) { it.x = 0; it.vx = Math.abs(it.vx); it.rotV = -it.rotV; }
        if (it.x + it.w >= bw) { it.x = bw - it.w; it.vx = -Math.abs(it.vx); it.rotV = -it.rotV; }
        if (it.y <= 0) { it.y = 0; it.vy = Math.abs(it.vy); it.rotV = -it.rotV; }
        if (it.y + it.h >= bh) { it.y = bh - it.h; it.vy = -Math.abs(it.vy); it.rotV = -it.rotV; }
        it.el.style.left = it.x + 'px';
        it.el.style.top = it.y + 'px';
        it.el.style.transform = 'rotate(' + it.rot + 'deg)';
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  };
  document.addEventListener('DOMContentLoaded', function () { spawnWatermarks(12); });

  // ---------- PERSISTENT RADIO ----------
  (function initRadio() {
    const radioKey = 'bs-radio';
    let iframe = null;
    let ready = false;
    let pendingUrl = null;

    function getState() {
      try { return JSON.parse(localStorage.getItem(radioKey) || 'null'); } catch (_) { return null; }
    }
    function saveState(s) { localStorage.setItem(radioKey, JSON.stringify(s)); }

    function ensureIframe() {
      if (iframe) return;
      iframe = document.createElement('iframe');
      iframe.src = '/radio-frame.html';
      iframe.style.cssText = 'position:fixed;bottom:0;right:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none;z-index:-1';
      iframe.allow = 'autoplay';
      document.body.appendChild(iframe);
    }

    window.addEventListener('message', e => {
      if (e.data && e.data.ready) {
        ready = true;
        const st = getState();
        if (st && st.playing && st.url) {
          iframe.contentWindow.postMessage({ action: 'play', url: st.url, volume: st.volume || 0.5 }, '*');
        }
      }
      if (e.data && e.data.playing === false) {
        const st = getState();
        if (st) { st.playing = false; saveState(st); }
        updateRadioUI();
      }
    });

    function updateRadioUI() {
      const st = getState();
      const bar = document.getElementById('globalRadioBar');
      if (!bar) {
        const b = document.createElement('div');
        b.id = 'globalRadioBar';
        b.className = 'global-radio-bar';
        b.innerHTML = '<span class="global-radio-dot"></span><span class="global-radio-label" id="globalRadioName">Radyo</span><input id="globalRadioVol" type="range" min="0" max="100" value="50" class="global-radio-vol" /><button id="globalRadioStop" class="global-radio-stop">Durdur</button>';
        b.hidden = true;
        document.body.appendChild(b);
      }
      const bar2 = document.getElementById('globalRadioBar');
      const name = document.getElementById('globalRadioName');
      const btn = document.getElementById('globalRadioStop');
      const dot = bar2 ? bar2.querySelector('.global-radio-dot') : null;
      if (bar2) {
        if (st && st.url) {
          bar2.hidden = false;
          if (name) name.textContent = st.name || 'Radyo';
          if (st.playing) {
            if (btn) btn.textContent = 'Durdur';
            if (dot) { dot.style.background = '#ff6b6b'; dot.style.animationPlayState = 'running'; }
          } else {
            if (btn) btn.textContent = 'Dinle';
            if (dot) { dot.style.background = '#555'; dot.style.animationPlayState = 'paused'; }
          }
        } else {
          bar2.hidden = true;
        }
      }
    }

    window.radioPlay = function (url, name, volume) {
      ensureIframe();
      const st = { playing: true, url: url, name: name, volume: volume || 0.5 };
      saveState(st);
      if (ready && iframe) {
        iframe.contentWindow.postMessage({ action: 'play', url: url, volume: st.volume }, '*');
      }
      updateRadioUI();
      toast('Radyo caliniyor: ' + name);
    };

    window.radioStop = function () {
      const st = getState();
      if (st) { st.playing = false; saveState(st); }
      if (ready && iframe) {
        iframe.contentWindow.postMessage({ action: 'stop' }, '*');
      }
      updateRadioUI();
    };

    window.radioVolume = function (v) {
      const st = getState();
      if (st) { st.volume = v; saveState(st); }
      if (ready && iframe) {
        iframe.contentWindow.postMessage({ action: 'volume', volume: v }, '*');
      }
    };

    window.radioIsPlaying = function () {
      const st = getState();
      return !!(st && st.playing);
    };

    ensureIframe();
    document.addEventListener('DOMContentLoaded', () => {
      updateRadioUI();
      const btn = document.getElementById('globalRadioStop');
      if (btn) btn.addEventListener('click', () => {
        const st = getState();
        if (st && st.playing && st.url) {
          radioStop();
        } else if (st && st.url) {
          radioPlay(st.url, st.name, st.volume || 0.5);
        }
      });
      const vol = document.getElementById('globalRadioVol');
      if (vol) vol.addEventListener('input', () => { radioVolume(vol.value / 100); });
    });
  })();

  // ---------- SPA ROUTER ----------
  const PAGE_SCRIPTS = {
    '/': { init: 'pageInitHome' },
    '/tv.html': { init: 'pageInitTV' },
    '/radio.html': { init: 'pageInitRadio' },
    '/stock.html': { init: 'pageInitStock' },
    '/whiteboard.html': { init: 'pageInitWhiteboard' }
  };
  let spaBusy = false;

  function initPage(path) {
    var cfg = PAGE_SCRIPTS[path];
    if (cfg && cfg.init && typeof window[cfg.init] === 'function') {
      window[cfg.init]();
    }
    if (path === '/' && window.twttr && window.twttr.widgets) {
      window.twttr.widgets.load();
    }
  }

  window.spaNavigate = function (path, push) {
    if (spaBusy || path === location.pathname) return;
    spaBusy = true;
    fetch(path)
      .then(r => r.ok ? r.text() : Promise.reject())
      .then(html => {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var newMain = doc.querySelector('main');
        var oldMain = document.querySelector('main');
        if (newMain && oldMain) oldMain.innerHTML = newMain.innerHTML;
        var t = doc.querySelector('title');
        if (t) document.title = t.textContent;
        if (push) history.pushState({ p: path }, '', path);
        window.scrollTo(0, 0);
        setTimeout(() => initPage(path), 50);
        spaBusy = false;
      })
      .catch(() => { spaBusy = false; location.href = path; });
  };

  document.addEventListener('click', e => {
    var a = e.target.closest('a[data-spa]');
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) return;
    e.preventDefault();
    window.spaNavigate(href, true);
  });

  window.addEventListener('popstate', () => {
    window.spaNavigate(location.pathname, false);
  });

  document.addEventListener('DOMContentLoaded', () => {
    initPage(location.pathname);
  });
})();
