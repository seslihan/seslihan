(() => {
  const params = new URLSearchParams(window.location.search);
  const code = (params.get('code') || '').toUpperCase();
  let name = params.get('name') || 'Misafir';
  const joinMic = params.get('mic') !== '0';
  const joinCam = params.get('cam') === '1';

  if (!code) { window.location.href = '/'; return; }

  const socket = io({ reconnection: true, reconnectionDelay: 1000, reconnectionAttempts: 20, transports: ['websocket', 'polling'] });
  let ICE_CONFIG = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
      { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' }
    ]
  };
  fetch('/api/config').then(r => r.json()).then(c => { ICE_CONFIG = { iceServers: c.iceServers }; }).catch(() => {});

  const EMOJI_DATA = [
    '😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 😚 😙 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🤫 🤔 🤐 🤨 😐 😑 😶 😏 😒 🙄 😬 🤥 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🤧 🥵 🥶 🥴 😵 🤯 🤠 🥳 😎 🤓 🧐',
    '👍 👎 👌 🤞 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 👋 🤚 🖐️ ✋ 🖖 👏 🙌 🤝 🙏 ✍️ 💅 🤳 💪 🦾 🦵 🦿 🦶 👂 🦻 👃 🧠 🦷 🦴 👀 👁️ 👅 👄 💋',
    '❤️ 🧡 💛 💚 💙 💜 🤎 🖤 🤍 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ✨ 💫 🌟 ⭐ 🌈 ☀️ 🌤 ⛅ 🌥 ☁️ 🌧 ⛈ 🌩 🌨 ❄️ ☃️ ⛄ 🌬 💨 💧 💦 ☔ 🌊 🌫',
    '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐽 🐸 🐵 🙈 🙉 🙊 🐒 🐔 🐧 🐦 🐤 🐣 🐥 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🐛 🦋 🐌 🐞 🐜 🦟 🦗 🕷 🕸 🦂 🐢 🐍 🦎 🦖 🦕',
    '🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🥬 🥒 🌶 🫑 🌽 🥕 🫒 🧄 🧅 🥔 🍠 🥐 🥯 🍞 🥖 🥨 🧀 🥚 🍳 🧈 🥞 🧇 🥓',
    '⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🥏 🎱 🪀 🏓 🏸 🏒 🏑 🥍 🏏 🪃 🥅 ⛳ 🪁 🏹 🎣 🤿 🥊 🥋 🎽 🛹 🛼 🛷 ⛸ 🥌 🎿 ⛷ 🏂 🪂 🏋️ 🤼 🤸 🤺 🏆 🥇 🥈 🥉 🎖 🎗 🎟 🎫',
    '🚗 🚕 🚙 🚌 🚎 🏎 🚓 🚑 🚒 🚐 🛻 🚚 🚛 🚜 🛴 🚲 🛵 🏍 🛺 🚨 🚔 🚍 🚘 🚖 🚡 🚠 🚟 🚃 🚋 🚞 🚝 🚄 🚅 🚈 🚂 🚆 🚇 🚊 🚉 ✈️ 🛫 🛬 🛩 💺 🛰 🚀 🛸 🚁',
    '🎉 🎊 🎈 🎂 🎁 🎄 🎃 🎀 🎋 🎍 🎎 🎏 🎐 🎑 🧧 🎗 🎟 🎫 🎖 🏆 🏅 🥇 🥈 🥉 🎮 🎰 🧩 🪀 🪁 🎯 🎲 ♟ 🎴 🎭 🎨 🎬 🎤 🎧 🎼 🎵 🎶'
  ];

  const settings = getSettings();
  const $ = (id) => document.getElementById(id);
  const videoGrid = $('videoGrid');
  const messagesEl = $('messages');
  const chatInput = $('chatInput');
  const chatForm = $('chatForm');
  const fileInput = $('fileInput');
  const typingEl = $('typing');
  const chatEmptyState = $('chatEmptyState');

  function updateChatEmptyState() {
    if (!chatEmptyState) return;
    const hasMessages = messagesEl.querySelectorAll('.msg-row, .system-msg, .file-progress').length > 0;
    chatEmptyState.style.display = hasMessages ? 'none' : 'flex';
  }

  const state = {
    you: null,
    roomCode: code,
    isHost: false,
    peers: new Map(),
    localStream: null,
    screenStream: null,
    micOn: joinMic,
    camOn: joinCam,
    screenSharing: false,
    handRaised: false,
    captionsOn: false,
    fileMaxSize: 2 * 1024 * 1024 * 1024,
    audioCtx: null,
    maxTileId: null,
    layout: 'auto',
    spotlightId: null,
    pinnedId: null,
    speakingSince: {},
    meetStart: Date.now(),
    hostSettings: { locked: false, waitingRoom: false, chatLocked: false },
    recognition: null
  };

  // ---------- AUDIO / MIC ----------
  function ensureAudioContext() {
    try {
      if (!state.audioCtx) state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (state.audioCtx.state === 'suspended') state.audioCtx.resume();
    } catch (_) {}
  }

  function setupLocalAudioMeter() {
    if (!state.localStream || state.localStream.getAudioTracks().length === 0) return;
    try {
      const ctx = state.audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      state.audioCtx = ctx;
      const source = ctx.createMediaStreamSource(state.localStream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      const freqData = new Uint8Array(analyser.frequencyBinCount);
      const waveData = new Uint8Array(analyser.frequencyBinCount);
      const canvas = document.querySelector('#sound-wave-' + state.you.id + ' canvas');
      if (!canvas) return;
      const cCtx = canvas.getContext('2d');
      const tile = document.getElementById('tile-' + state.you.id);
      const BAR_COUNT = 24;
      const BAR_GAP = 2;
      const barW = (canvas.width / BAR_COUNT) - BAR_GAP;

      function tick() {
        if (!document.getElementById('sound-wave-' + state.you.id)) return;
        analyser.getByteFrequencyData(freqData);
        analyser.getByteTimeDomainData(waveData);
        cCtx.clearRect(0, 0, canvas.width, canvas.height);
        const step = Math.floor(freqData.length / BAR_COUNT);
        let anyActive = false;
        for (let i = 0; i < BAR_COUNT; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) sum += freqData[i * step + j];
          const avg = sum / step;
          const norm = avg / 255;
          const rawH = Math.max(2, norm * canvas.height * 0.92);
          const h = Math.round(rawH / 4) * 4;
          const x = i * (barW + BAR_GAP);
          const y = (canvas.height - h) / 2;
          if (norm > 0.04) anyActive = true;
          const alpha = 0.4 + norm * 0.6;
          const r = Math.round(196 * norm);
          const g = Math.round(94 + 60 * norm);
          const b = Math.round(44 + 20 * (1 - norm));
          cCtx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
          cCtx.fillRect(x, y, barW, h);
          cCtx.fillStyle = 'rgba(255,255,255,0.15)';
          cCtx.fillRect(x, y, barW, 2);
        }
        if (tile) tile.classList.toggle('speaking', anyActive && state.micOn);
        requestAnimationFrame(tick);
      }
      tick();
    } catch (e) { console.warn(e); }
  }

  function setupRemoteAudioMeter(uid, stream) {
    if (!stream || stream.getAudioTracks().length === 0) return;
    try {
      const ctx = state.audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      state.audioCtx = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      const freqData = new Uint8Array(analyser.frequencyBinCount);
      const waveData = new Uint8Array(analyser.frequencyBinCount);
      const canvas = document.querySelector('#sound-wave-' + uid + ' canvas');
      if (!canvas) return;
      const cCtx = canvas.getContext('2d');
      const tile = document.getElementById('tile-' + uid);
      const BAR_COUNT = 24;
      const BAR_GAP = 2;
      const barW = (canvas.width / BAR_COUNT) - BAR_GAP;

      function tick() {
        if (!document.getElementById('sound-wave-' + uid)) return;
        analyser.getByteFrequencyData(freqData);
        analyser.getByteTimeDomainData(waveData);
        cCtx.clearRect(0, 0, canvas.width, canvas.height);
        const step = Math.floor(freqData.length / BAR_COUNT);
        let anyActive = false;
        for (let i = 0; i < BAR_COUNT; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) sum += freqData[i * step + j];
          const avg = sum / step;
          const norm = avg / 255;
          const rawH = Math.max(2, norm * canvas.height * 0.92);
          const h = Math.round(rawH / 4) * 4;
          const x = i * (barW + BAR_GAP);
          const y = (canvas.height - h) / 2;
          if (norm > 0.04) anyActive = true;
          const alpha = 0.4 + norm * 0.6;
          const r = Math.round(196 * norm);
          const g = Math.round(94 + 60 * norm);
          const b = Math.round(44 + 20 * (1 - norm));
          cCtx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
          cCtx.fillRect(x, y, barW, h);
          cCtx.fillStyle = 'rgba(255,255,255,0.15)';
          cCtx.fillRect(x, y, barW, 2);
        }
        if (tile) tile.classList.toggle('speaking', anyActive);
        const peer = state.peers.get(uid);
        if (anyActive) {
          if (!state.speakingSince[uid]) state.speakingSince[uid] = Date.now();
        } else {
          delete state.speakingSince[uid];
        }
        requestAnimationFrame(tick);
      }
      tick();
    } catch (e) { console.warn(e); }
  }

  // ---------- TILES ----------
  function addVideoTile(uid, uname, isLocal) {
    if (document.getElementById('tile-' + uid)) return;
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.id = 'tile-' + uid;
    if (isLocal) tile.classList.add('local');
    tile.dataset.userName = uname;
    tile.dataset.userId = uid;

    const video = document.createElement('video');
    video.id = 'video-' + uid;
    video.autoplay = true;
    video.playsInline = true;
    if (isLocal) video.muted = true;

    const placeholder = document.createElement('div');
    placeholder.className = 'placeholder';
    placeholder.innerHTML = '<div class="avatar">' + escapeHtml((uname || '?').charAt(0).toUpperCase()) + '</div>';

    const overlay = document.createElement('div');
    overlay.className = 'tile-overlay';
    overlay.innerHTML =
      '<div class="tile-name-block">' +
        '<span class="name">' + escapeHtml(uname) + (isLocal ? ' (sen)' : '') + '</span>' +
        '<span class="host-badge" data-role="host" style="display:none;">YÖNETİCİ</span>' +
      '</div>' +
      '<span class="indicators">' +
        '<span class="ind mic-on" title="Mikrofon açık">🎙</span>' +
        '<span class="ind mic-off" hidden title="Mikrofon kapalı">🔇</span>' +
        '<span class="ind hand" hidden title="El kaldırdı">✋</span>' +
      '</span>';

    const soundWave = document.createElement('div');
    soundWave.className = 'sound-wave';
    soundWave.id = 'sound-wave-' + uid;
    const waveCanvas = document.createElement('canvas');
    waveCanvas.width = 240;
    waveCanvas.height = 64;
    soundWave.appendChild(waveCanvas);

    const actions = document.createElement('div');
    actions.className = 'tile-actions';
    actions.innerHTML =
      '<button class="tile-action-btn max-btn" title="Büyüt">' +
        '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>' +
      '</button>' +
      '<button class="tile-action-btn exit-max" title="Küçült">' +
        '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>' +
      '</button>';

    tile.appendChild(video);
    tile.appendChild(placeholder);
    tile.appendChild(overlay);
    tile.appendChild(soundWave);
    tile.appendChild(actions);
    videoGrid.appendChild(tile);
    layoutGrid();

    actions.querySelector('.max-btn').addEventListener('click', (e) => { e.stopPropagation(); maximizeTile(uid); });
    actions.querySelector('.exit-max').addEventListener('click', (e) => { e.stopPropagation(); restoreTile(); });
    tile.addEventListener('dblclick', () => tile.classList.contains('maximized') ? restoreTile() : maximizeTile(uid));
  }

  function maximizeTile(uid) {
    if (state.maxTileId) restoreTile();
    state.maxTileId = uid;
    const tile = document.getElementById('tile-' + uid);
    if (tile) tile.classList.add('maximized');
  }

  function restoreTile() {
    if (!state.maxTileId) return;
    const tile = document.getElementById('tile-' + state.maxTileId);
    if (tile) tile.classList.remove('maximized');
    state.maxTileId = null;
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.maxTileId) restoreTile();
  });

  function attachStreamToTile(uid, stream) {
    const video = document.getElementById('video-' + uid);
    const tile = document.getElementById('tile-' + uid);
    if (!video || !tile) return;
    if (video.srcObject !== stream) video.srcObject = stream;
    if (tile.classList.contains('local')) video.muted = true;
    const hasVideo = stream.getVideoTracks().some(t => t.enabled);
    tile.classList.toggle('no-video', !hasVideo);
  }

  function setIndicator(uid, micOn) {
    const tile = document.getElementById('tile-' + uid);
    if (!tile) return;
    tile.querySelector('.ind.mic-on').hidden = micOn === false;
    tile.querySelector('.ind.mic-off').hidden = micOn !== false;
    tile.classList.toggle('mic-muted', micOn === false);
  }

  function setHandState(uid, raised) {
    const tile = document.getElementById('tile-' + uid);
    if (!tile) return;
    const ind = tile.querySelector('.ind.hand');
    if (ind) ind.hidden = !raised;
    tile.classList.toggle('hand', !!raised);
  }

  function setRole(uid, isHost) {
    const tile = document.getElementById('tile-' + uid);
    if (!tile) return;
    const badge = tile.querySelector('[data-role="host"]');
    if (badge) badge.style.display = isHost ? '' : 'none';
  }

  function removeVideoTile(uid) {
    const tile = document.getElementById('tile-' + uid);
    if (tile && tile.classList.contains('maximized')) restoreTile();
    if (tile) tile.remove();
    layoutGrid();
  }

  function layoutGrid() {
    const n = videoGrid.children.length;
    videoGrid.dataset.count = Math.min(n, 8);
    applyLayout();
  }

  function applyLayout() {
    const tiles = Array.from(videoGrid.children);
    videoGrid.classList.remove('layout-speaker');
    tiles.forEach(t => { t.style.gridArea = ''; t.classList.remove('speaker-main'); });
    if (state.layout === 'speaker' && tiles.length > 1) {
      videoGrid.classList.add('layout-speaker');
      let active = null;
      if (state.pinnedId) active = document.getElementById('tile-' + state.pinnedId);
      else {
        const speakers = Object.keys(state.speakingSince).sort((a, b) => state.speakingSince[a] - state.speakingSince[b]);
        if (speakers.length > 0) active = document.getElementById('tile-' + speakers[0]);
      }
      if (!active) active = tiles.find(t => !t.classList.contains('local')) || tiles[0];
      if (active) {
        active.classList.add('speaker-main');
        active.style.gridArea = '1 / 1 / -1 / -1';
      }
    }
  }

  // ---------- SOCKET STATUS ----------
  socket.on('connect', () => {
    if (!joinGate.hidden) {
      joinGateText.textContent = 'Sunucuya bağlandı, odaya giriliyor...';
    }
  });
  socket.on('disconnect', () => {
    toast('Sunucu bağlantısı kesildi, yeniden bağlanılıyor...', 'error');
  });
  socket.on('connect_error', () => {
    if (!joinGate.hidden && joinGateSpinner && !joinGateSpinner.hidden) {
      joinGateText.textContent = 'Sunucuya bağlanılıyor... (ilk katılım 30-60 sn sürebilir)';
    }
  });

  // ---------- JOIN / PEER CONNECTION ----------
  function init() {
    const initTimeout = setTimeout(() => {
      joinGate.hidden = false;
      joinGateSpinner.hidden = true;
      joinGateText.textContent = 'Bağlantı zaman aşımı — tekrar deneyin';
      joinGateBtn.hidden = false;
      joinGateBtn.disabled = false;
      joinGateBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3l14 9-14 9V3z"/></svg> Tekrar dene';
      joinGateBtn.onclick = () => { joinGateBtn.hidden = true; joinGateSkipBtn.hidden = true; joinGateSpinner.hidden = false; joinGateText.textContent = 'Bağlanılıyor...'; init(); };
      joinGateSkipBtn.hidden = false;
      joinGateSkipBtn.onclick = joinWithoutMic;
    }, 25000);

    socket.emit('join-room', { roomCode: code, name, mic: state.micOn, cam: state.camOn, asGuest: !getUser() }, (res) => {
      clearTimeout(initTimeout);
      if (!res || !res.ok) {
        if (res && res.wait) {
          showWaitingScreen();
          return;
        }
        toast(res && res.error ? res.error : 'Odaya girilemedi', 'error');
        if (res && res.locked) {
          setTimeout(() => window.location.href = '/', 2000);
        }
        return;
      }
      state.you = res.you;
      state.roomCode = res.roomCode;
      state.isHost = !!res.isHost;
      state.hostSettings = res.settings || state.hostSettings;
      $('roomCodeLabel').textContent = res.roomCode;
      $('userCount').textContent = res.peers.length + 1;
      addVideoTile(state.you.id, state.you.name, true);
      setRole(state.you.id, state.isHost);
      attachStreamToTile(state.you.id, state.localStream);
      updateMicButton();
      updateCameraButton();
      setupLocalAudioMeter();
      renderParticipants();
      updateHostUI();
      res.peers.forEach((p) => addPeer(p));
      startTimer();
      if (isMobile) document.querySelector('.chat').classList.add('collapsed');
    });
  }

  function addPeer(peer) {
    if (state.peers.has(peer.id)) return;
    const pc = new RTCPeerConnection(ICE_CONFIG);
    const polite = state.you.id > peer.id;
    const peerState = { id: peer.id, name: peer.name, pc, polite, makingOffer: false, ignoreOffer: false, isHost: false, mic: peer.mic, cam: peer.cam, hand: false };

    if (state.localStream) {
      state.localStream.getTracks().forEach(t => {
        console.log('[WEBRTC] Adding local ' + t.kind + ' track to connection with ' + peer.name);
        try { pc.addTrack(t, state.localStream); } catch (_) {}
      });
    }

    pc.ontrack = (ev) => {
      console.log('[WEBRTC] Received ' + ev.track.kind + ' track from ' + peer.name);
      let stream = peerState.remoteStream;
      if (!stream) { stream = new MediaStream(); peerState.remoteStream = stream; }
      stream.addTrack(ev.track);
      attachStreamToTile(peer.id, stream);
      if (ev.track.kind === 'audio') setupRemoteAudioMeter(peer.id, stream);
      const video = document.getElementById('video-' + peer.id);
      if (video) {
        video.muted = false;
        video.volume = 1;
        const p = video.play();
        if (p && p.catch) p.catch(() => {
          if (ev.track.kind === 'audio') {
            if (!audioUnlocked) showAudioLockPrompt();
          }
        });
      }
    };

    pc.onicecandidate = (ev) => {
      if (ev.candidate) socket.emit('signal', { to: peer.id, from: state.you.id, data: { type: 'ice', candidate: ev.candidate } });
    };

    pc.onnegotiationneeded = async () => {
      try {
        peerState.makingOffer = true;
        await pc.setLocalDescription(await pc.createOffer());
        socket.emit('signal', { to: peer.id, from: state.you.id, data: { type: 'offer', sdp: pc.localDescription } });
      } catch (e) { console.error(e); } finally { peerState.makingOffer = false; }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[WEBRTC] ' + peer.name + ' ICE state: ' + pc.iceConnectionState);
    };
    pc.onconnectionstatechange = () => {
      console.log('[WEBRTC] ' + peer.name + ' connection: ' + pc.connectionState);
      const tile = document.getElementById('tile-' + peer.id);
      if (!tile) return;
      tile.classList.toggle('bad', pc.connectionState === 'failed' || pc.connectionState === 'disconnected');
      updateConnQuality();
      if (pc.connectionState === 'failed') {
        toast(peer.name + ' ile bağlantı kesildi', 'error');
      }
    };
    pc.onicecandidateerror = (e) => {
      console.warn('[WEBRTC] ICE candidate error for ' + peer.name + ':', e.errorCode, e.errorText);
    };

    state.peers.set(peer.id, peerState);
    addVideoTile(peer.id, peer.name, false);
    setIndicator(peer.id, peer.mic !== false);
    const camOn = peer.cam === true;
    const tile = document.getElementById('tile-' + peer.id);
    if (tile) tile.classList.toggle('no-video', !camOn);
    renderParticipants();
    updateHostUI();
    updateConnQuality();
  }

  function removePeer(uid) {
    const p = state.peers.get(uid);
    if (p) { try { p.pc.close(); } catch (_) {} state.peers.delete(uid); }
    removeVideoTile(uid);
    renderParticipants();
  }

  socket.on('user-joined', (peer) => {
    addPeer(peer);
    $('userCount').textContent = state.peers.size + 1;
    addSystemMessage(peer.name + ' odaya katıldı');
    toast(peer.name + ' katıldı', 'info');
  });

  socket.on('user-left', (uid) => {
    const p = state.peers.get(uid);
    if (p) addSystemMessage((p.name || 'Birisi') + ' ayrıldı');
    removePeer(uid);
    $('userCount').textContent = state.peers.size + 1;
  });

  socket.on('room-users', (users) => {
    $('userCount').textContent = users.length;
    $('partBadge').hidden = users.length <= 1;
    $('partBadge').textContent = users.length;
  });

  socket.on('host-changed', ({ isHost }) => {
    state.isHost = isHost;
    setRole(state.you.id, isHost);
    updateHostUI();
    if (isHost) toast('Yönetici oldunuz', 'info');
  });

  socket.on('room-settings', (settings) => {
    state.hostSettings = settings;
    updateHostUI();
  });

  socket.on('admitted', () => {
    toast('Yönetici tarafından kabul edildiniz', 'success');
    joinGate.hidden = true;
    init();
  });

  socket.on('denied', ({ reason }) => {
    toast('Reddedildiniz: ' + reason, 'error');
    setTimeout(() => window.location.href = '/', 2500);
  });

  socket.on('kicked', () => {
    toast('Yönetici tarafından çıkarıldınız', 'error');
    setTimeout(() => window.location.href = '/', 2000);
  });

  socket.on('meeting-ended', () => {
    alert('Toplantı sona erdi');
    window.location.href = '/post.html?code=' + state.roomCode;
  });

  socket.on('force-mute', () => {
    if (!state.localStream) return;
    state.micOn = false;
    state.localStream.getAudioTracks().forEach(t => t.enabled = false);
    updateMicButton();
    setIndicator(state.you.id, false);
    socket.emit('media-state', { mic: false, cam: state.camOn, screen: state.screenSharing });
    toast('Yönetici sizi susturdu', 'info');
  });

  socket.on('lower-hand', () => {
    state.handRaised = false;
    $('handPill').hidden = true;
    setHandState(state.you.id, false);
    socket.emit('hand-raise', false);
  });

  socket.on('spotlight', ({ target }) => {
    state.spotlightId = target;
    document.querySelectorAll('.tile').forEach(t => t.classList.remove('spotlight'));
    const tile = document.getElementById('tile-' + target);
    if (tile) tile.classList.add('spotlight');
  });

  socket.on('signal', async ({ from, data }) => {
    const peer = state.peers.get(from);
    if (!peer) return;
    try {
      if (data.type === 'offer') {
        const offerCollision = peer.makingOffer || peer.pc.signalingState !== 'stable';
        peer.ignoreOffer = !peer.polite && offerCollision;
        if (peer.ignoreOffer) return;
        await peer.pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        await peer.pc.setLocalDescription(await peer.pc.createAnswer());
        socket.emit('signal', { to: from, from: state.you.id, data: { type: 'answer', sdp: peer.pc.localDescription } });
      } else if (data.type === 'answer') {
        if (peer.pc.signalingState === 'have-local-offer') {
          await peer.pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        }
      } else if (data.type === 'ice') {
        try { await peer.pc.addIceCandidate(new RTCIceCandidate(data.candidate)); }
        catch (e) { if (!peer.ignoreOffer) console.warn(e); }
      }
    } catch (err) { console.error(err); }
  });

  socket.on('chat-message', (msg) => renderMessage(msg));
  socket.on('delete-message', (id) => {
    const el = messagesEl.querySelector('[data-msg-id="' + id + '"]');
    if (el) el.remove();
    updateChatEmptyState();
  });

  socket.on('media-state', ({ id, mic, cam, screen }) => {
    setIndicator(id, mic);
    const tile = document.getElementById('tile-' + id);
    if (tile) tile.classList.toggle('no-video', cam === false);
    const peer = state.peers.get(id);
    if (peer) {
      if (typeof mic === 'boolean') peer.mic = mic;
      if (typeof cam === 'boolean') peer.cam = cam;
    }
    if (id !== state.you.id && tile) {
      const screenInd = tile.querySelector('.ind.screen');
      if (screen && !screenInd) {
        const ind = document.createElement('span');
        ind.className = 'ind screen';
        ind.title = 'Ekran paylaşıyor';
        ind.textContent = '🖥';
        tile.querySelector('.indicators').appendChild(ind);
      } else if (!screen && screenInd) {
        screenInd.remove();
      }
    }
    renderParticipants();
  });

  socket.on('reaction', (data) => {
    showReaction(data);
  });

  socket.on('hand-raise', ({ id, name, raised }) => {
    setHandState(id, raised);
    if (id !== state.you.id) {
      const peer = state.peers.get(id);
      if (peer) peer.hand = raised;
      renderParticipants();
      if (raised) toast(name + ' el kaldırdı', 'info');
    }
  });

  socket.on('whiteboard', (data) => {
    if (data.type === 'open') {
      if (!wbState.overlay) {
        $('whiteboardOverlay').hidden = false;
        wbState.overlay = true;
        setTimeout(() => { resizeWb(); populateWbCameraStrip(); }, 100);
        toast('Karşı taraf beyaz tahta açtı', 'info');
      }
    } else if (data.type === 'close') {
      if (wbState.overlay) {
        $('whiteboardOverlay').hidden = true;
        wbState.overlay = false;
      }
    } else {
      if (wbState.overlay) applyWbData(data);
    }
  });

  socket.on('caption', (data) => {
    if (state.captionsOn) {
      showCaption(data.name + ': ' + data.text);
    }
  });

  // ---------- MESSAGES / CHAT ----------
  function renderMessage(msg) {
    if (msg.type === 'system') { addSystemMessage(msg.text); return; }
    const isMe = state.you && msg.from && msg.from.id === state.you.id;
    const row = document.createElement('div');
    row.className = 'msg-row ' + (isMe ? 'me' : 'other');
    row.dataset.msgId = msg.id;

    const meta = document.createElement('div');
    meta.className = 'msg-meta';
    meta.innerHTML = '<span class="msg-name">' + escapeHtml(msg.from.name) + '</span><span class="msg-time">' + formatTime(msg.time) + '</span>';

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';

    if (msg.replyTo) {
      const reply = document.createElement('div');
      reply.className = 'msg-reply';
      reply.textContent = msg.replyTo.name + ': ' + msg.replyTo.text;
      bubble.appendChild(reply);
    }

    if (msg.type === 'file' && msg.file) {
      const f = msg.file;
      if ((f.mimetype || '').startsWith('image/')) {
        const img = document.createElement('img');
        img.src = f.url; img.alt = f.name; img.className = 'msg-image';
        img.addEventListener('click', () => openPreview(f));
        bubble.appendChild(img);
      } else {
        const link = document.createElement('a');
        link.href = f.url; link.target = '_blank'; link.download = f.name;
        link.className = 'msg-file';
        link.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span class="file-info"><span class="file-name">' + escapeHtml(f.name) + '</span><span class="file-size">' + formatSize(f.size) + '</span></span>';
        bubble.appendChild(link);
      }
    } else {
      const text = document.createElement('div');
      text.textContent = msg.text || '';
      bubble.appendChild(text);
    }

    if (isMe) {
      const del = document.createElement('button');
      del.className = 'msg-delete';
      del.title = 'Sil';
      del.textContent = '×';
      del.addEventListener('click', () => {
        socket.emit('delete-message', msg.id);
        row.remove();
        updateChatEmptyState();
      });
      bubble.appendChild(del);
    }

    row.appendChild(meta);
    row.appendChild(bubble);
    messagesEl.appendChild(row);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    updateChatEmptyState();
    if (!isMe && state.activeTab !== 'chat') {
      state.unreadChat = (state.unreadChat || 0) + 1;
      const badge = $('chatBadge');
      badge.hidden = false;
      badge.textContent = state.unreadChat;
    }
  }

  function addSystemMessage(text) {
    const div = document.createElement('div');
    div.className = 'system-msg';
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    updateChatEmptyState();
  }

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    socket.emit('chat-message', { type: 'text', text });
    chatInput.value = '';
  });

  let typingTimer = null;
  chatInput.addEventListener('input', () => {
    socket.emit('typing');
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => socket.emit('stop-typing'), 1000);
  });
  socket.on('typing', (user) => { if (user && user.id !== state.you.id) typingEl.textContent = user.name + ' yazıyor...'; });
  socket.on('stop-typing', () => typingEl.textContent = '');

  // ---------- PARTICIPANTS ----------
  function renderParticipants() {
    const list = $('participantsList');
    if (!list) return;
    const allUsers = [];
    if (state.you) allUsers.push({ ...state.you, isHost: state.isHost, isMe: true });
    state.peers.forEach((p, id) => {
      allUsers.push({ id, name: p.name, isHost: p.isHost, mic: p.mic !== false, cam: p.cam === true, hand: p.hand, isMe: false });
    });
    allUsers.sort((a, b) => (b.hand ? 1 : 0) - (a.hand ? 1 : 0));
    list.innerHTML = '';
    allUsers.forEach(u => {
      const item = document.createElement('div');
      item.className = 'participant-item' + (u.hand ? ' hand' : '');
      const initial = (u.name || '?').charAt(0).toUpperCase();
      item.innerHTML =
        '<div class="participant-avatar">' + escapeHtml(initial) + '</div>' +
        '<div class="participant-info">' +
          '<div class="participant-name">' + escapeHtml(u.name) + (u.isHost ? ' <span class="host-badge">YÖNETİCİ</span>' : '') + (u.isMe ? ' (sen)' : '') + (u.hand ? ' ✋' : '') + '</div>' +
          '<div class="participant-meta">' + (u.mic ? 'Mikrofon açık' : 'Susturulmuş') + '</div>' +
        '</div>' +
        '<div class="participant-icons">' +
          (!u.mic ? '<span class="ind mic-off" title="Susturulmuş">🔇</span>' : '') +
          (!u.cam ? '<span class="ind" style="background:var(--text-2);" title="Kamera kapalı">📷</span>' : '') +
        '</div>';
      if (state.isHost && !u.isMe) {
        item.addEventListener('click', () => {
          const action = prompt('Eylem seç: mute, kick, lowerHand, spotlight', 'mute');
          if (action === 'mute') socket.emit('host-action', { action: 'mute-user', target: u.id });
          else if (action === 'kick') if (confirm(u.name + ' çıkarılsın mı?')) socket.emit('host-action', { action: 'kick', target: u.id });
          else if (action === 'lowerHand') socket.emit('host-action', { action: 'lower-hand', target: u.id });
          else if (action === 'spotlight') socket.emit('host-action', { action: 'spotlight', target: u.id });
        });
      }
      list.appendChild(item);
    });
    $('partBadge').hidden = allUsers.length <= 1;
    $('partBadge').textContent = allUsers.length;
  }

  // ---------- EMOJI PANEL ----------
  const emojiBtn = $('emojiBtn');
  const emojiPanel = $('emojiPanel');
  const emojiGrid = $('emojiGrid');

  function renderEmoji(catIdx) {
    const list = (EMOJI_DATA[catIdx] || EMOJI_DATA[0]).split(' ');
    emojiGrid.innerHTML = '';
    list.forEach(em => {
      if (!em) return;
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = em;
      b.addEventListener('click', () => {
        const s = chatInput.selectionStart || chatInput.value.length;
        const e = chatInput.selectionEnd || chatInput.value.length;
        chatInput.value = chatInput.value.slice(0, s) + em + chatInput.value.slice(e);
        chatInput.focus();
        chatInput.selectionStart = chatInput.selectionEnd = s + em.length;
      });
      emojiGrid.appendChild(b);
    });
  }

  emojiBtn.addEventListener('click', (e) => { e.stopPropagation(); const hidden = emojiPanel.hidden; emojiPanel.hidden = !hidden; if (!hidden) return; if (emojiGrid.children.length === 0) renderEmoji(0); });
  emojiPanel.querySelectorAll('.emoji-cat').forEach(btn => { btn.addEventListener('click', (e) => { e.stopPropagation(); emojiPanel.querySelectorAll('.emoji-cat').forEach(b => b.classList.remove('active')); btn.classList.add('active'); renderEmoji(parseInt(btn.dataset.cat, 10)); }); });
  document.addEventListener('click', (e) => { if (!emojiPanel.hidden && !emojiPanel.contains(e.target) && e.target !== emojiBtn) emojiPanel.hidden = true; });

  // ---------- FILE UPLOAD (CHUNKED) ----------
  fileInput.parentElement.querySelector('#fileBtn').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    fileInput.value = '';
    if (!file) return;
    if (file.size > state.fileMaxSize) { toast('Dosya çok büyük (max 2 GB)', 'error'); return; }
    await uploadFileChunked(file);
  });

  async function uploadFileChunked(file) {
    const CHUNK = 8 * 1024 * 1024;
    const total = Math.ceil(file.size / CHUNK);
    const uploadId = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    state.uploadCancel = false;

    $('uploadFileName').textContent = file.name + ' (' + formatSize(file.size) + ')';
    $('uploadPercent').textContent = '0%';
    $('uploadProgressFill').style.width = '0%';
    $('uploadProgress').hidden = false;

    try {
      for (let i = 0; i < total; i++) {
        if (state.uploadCancel) throw new Error('İptal');
        const chunk = file.slice(i * CHUNK, Math.min((i + 1) * CHUNK, file.size));
        let attempt = 0, ok = false;
        while (attempt < 3 && !ok) {
          attempt++;
          try {
            const fd = new FormData();
            fd.append('file', chunk, 'c' + i);
            const r = await fetch('/api/upload/chunk?uploadId=' + uploadId + '&index=' + i + '&total=' + total, { method: 'POST', body: fd });
            if (!r.ok) throw new Error('HTTP ' + r.status);
            ok = true;
          } catch (e) { if (attempt >= 3) throw e; await new Promise(r => setTimeout(r, 800 * attempt)); }
        }
        $('uploadPercent').textContent = Math.round(((i + 1) / total) * 100) + '%';
        $('uploadProgressFill').style.width = ((i + 1) / total) * 100 + '%';
      }
      const r = await fetch('/api/upload/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uploadId, filename: file.name, mimetype: file.type, size: file.size }) });
      if (!r.ok) throw new Error('Complete error');
      const data = await r.json();
      socket.emit('chat-message', { type: 'file', file: { url: data.url, name: data.name, size: data.size, mimetype: data.mimetype } });
      $('uploadPercent').textContent = '✓';
      setTimeout(() => $('uploadProgress').hidden = true, 1500);
    } catch (err) {
      if (err.message === 'İptal') {
        try { await fetch('/api/upload/abort', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uploadId }) }); } catch (_) {}
        toast('İptal edildi', 'info');
      } else toast('Yükleme hatası: ' + err.message, 'error');
      $('uploadProgress').hidden = true;
    }
  }

  $('uploadCancel').addEventListener('click', () => { state.uploadCancel = true; });

  function openPreview(file) {
    const preview = $('preview');
    const content = $('previewContent');
    content.innerHTML = '';
    const img = document.createElement('img');
    img.src = file.url; img.alt = file.name;
    content.appendChild(img);
    preview.hidden = false;
  }
  $('previewClose').addEventListener('click', () => $('preview').hidden = true);
  $('preview').addEventListener('click', (e) => { if (e.target.id === 'preview') $('preview').hidden = true; });

  // ---------- CONTROLS ----------
  $('toggleMic').addEventListener('click', () => {
    if (!state.localStream) return;
    const at = state.localStream.getAudioTracks();
    if (at.length === 0) { toast('Mikrofon yok', 'error'); return; }
    state.micOn = !state.micOn;
    at.forEach(t => t.enabled = state.micOn);
    updateMicButton();
    setIndicator(state.you.id, state.micOn);
    socket.emit('media-state', { mic: state.micOn, cam: state.camOn, screen: state.screenSharing });
  });

  $('toggleCam').addEventListener('click', async () => {
    if (!state.localStream) return;
    const hasVideo = state.localStream.getVideoTracks().length > 0;
    if (!hasVideo) {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true });
        const track = s.getVideoTracks()[0];
        state.localStream.addTrack(track);
        state.camOn = true;
        state.peers.forEach(p => { try { p.pc.addTrack(track, state.localStream); } catch (_) {} });
        attachStreamToTile(state.you.id, state.localStream);
        updateCameraButton();
        track.onended = () => {
          if (state.localStream) { state.localStream.removeTrack(track); state.camOn = false; attachStreamToTile(state.you.id, state.localStream); updateCameraButton(); socket.emit('media-state', { mic: state.micOn, cam: false, screen: state.screenSharing }); }
        };
        socket.emit('media-state', { mic: state.micOn, cam: true, screen: state.screenSharing });
      } catch (err) {
        if (err.name === 'NotAllowedError') toast('Kamera izni reddedildi', 'error');
        else if (err.name === 'NotFoundError') toast('Kamera bulunamadı', 'error');
      }
      return;
    }
    state.camOn = !state.camOn;
    state.localStream.getVideoTracks().forEach(t => t.enabled = state.camOn);
    attachStreamToTile(state.you.id, state.localStream);
    updateCameraButton();
    socket.emit('media-state', { mic: state.micOn, cam: state.camOn, screen: state.screenSharing });
  });

  $('toggleScreen').addEventListener('click', async () => {
    if (state.screenSharing) { stopScreenShare(); return; }
    try {
      const ss = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: true
      });
      const track = ss.getVideoTracks()[0];
      const screenAudioTracks = ss.getAudioTracks();
      state.screenStream = ss;
      state.screenSharing = true;
      state.peers.forEach(p => {
        const vSender = p.pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (vSender) vSender.replaceTrack(track);
        else { try { p.pc.addTrack(track, state.localStream); } catch (_) {} }
        screenAudioTracks.forEach(sa => {
          const aExists = p.pc.getSenders().some(s => s.track && s.track.kind === 'audio' && s.track !== state.localStream.getAudioTracks()[0]);
          if (!aExists) { try { p.pc.addTrack(sa, state.localStream); } catch (_) {} }
        });
      });
      $('presentVideo').srcObject = ss;
      $('presentStage').hidden = false;
      videoGrid.style.display = 'none';
      if (state.localStream && state.localStream.getVideoTracks().length > 0) {
        $('presentPipVideo').srcObject = state.localStream;
        attachStreamToTile(state.you.id, state.localStream);
        $('presentPip').hidden = false;
      } else $('presentPip').hidden = true;
      $('toggleScreen').classList.add('active');
      $('presentLabel').textContent = 'Sen ekran paylaşıyorsun' + (screenAudioTracks.length > 0 ? ' (ses dahil)' : '');
      track.onended = () => stopScreenShare();
      if (screenAudioTracks.length > 0) screenAudioTracks.forEach(t => { t.onended = () => stopScreenShare(); });
      socket.emit('media-state', { mic: state.micOn, cam: state.camOn, screen: true });
      toast(screenAudioTracks.length > 0 ? 'Ekran paylaşımı + ses başladı' : 'Ekran paylaşımı başladı (sessiz)', 'success');
    } catch (e) { if (e.name !== 'NotAllowedError') toast('Ekran paylaşımı başlatılamadı', 'error'); }
  });

  $('stopScreenBtn').addEventListener('click', () => stopScreenShare());

  $('stopScreenBtn').addEventListener('click', () => stopScreenShare());

  function stopScreenShare() {
    if (!state.screenStream) return;
    const screenAudioTracks = state.screenStream.getAudioTracks();
    state.screenStream.getTracks().forEach(t => t.stop());
    state.screenStream = null;
    state.screenSharing = false;
    const camTrack = state.localStream && state.localStream.getVideoTracks()[0];
    if (camTrack) {
      state.peers.forEach(p => { const s = p.pc.getSenders().find(s => s.track && s.track.kind === 'video'); if (s) s.replaceTrack(camTrack); });
      attachStreamToTile(state.you.id, state.localStream);
    } else {
      state.peers.forEach(p => { const ss = p.pc.getSenders().filter(s => s.track && s.track.kind === 'video'); ss.forEach(s => { try { p.pc.removeTrack(s); } catch (_) {} }); });
    }
    screenAudioTracks.forEach(() => {
      state.peers.forEach(p => {
        const screenAudio = p.pc.getSenders().filter(s => s.track && s.track.kind === 'audio' && s.track !== (state.localStream && state.localStream.getAudioTracks()[0]));
        screenAudio.forEach(s => { try { p.pc.removeTrack(s); } catch (_) {} });
      });
    });
    $('presentVideo').srcObject = null;
    $('presentStage').hidden = true;
    videoGrid.style.display = '';
    $('presentPip').hidden = true;
    $('toggleScreen').classList.remove('active');
    screenZoom = 1;
    updateScreenZoom();
    socket.emit('media-state', { mic: state.micOn, cam: state.camOn, screen: false });
  }

  $('raiseHand').addEventListener('click', () => {
    state.handRaised = !state.handRaised;
    $('handPill').hidden = !state.handRaised;
    setHandState(state.you.id, state.handRaised);
    socket.emit('hand-raise', state.handRaised);
  });
  $('lowerHandBtn').addEventListener('click', () => $('raiseHand').click());

  $('toggleCaptions').addEventListener('click', () => {
    state.captionsOn = !state.captionsOn;
    $('toggleCaptions').classList.toggle('active', state.captionsOn);
    if (!state.captionsOn) {
      $('captionsHost').classList.remove('show');
      if (state.recognition) { try { state.recognition.stop(); } catch (_) {} state.recognition = null; }
    }
    if (state.captionsOn) {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        toast('Tarayıcınız altyazı desteklemiyor (Chrome/Edge gerekli)', 'error');
        state.captionsOn = false;
        $('toggleCaptions').classList.remove('active');
        return;
      }
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'tr-TR';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event) => {
        let finalText = '';
        let interimText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalText += transcript;
          } else {
            interimText += transcript;
          }
        }
        const display = finalText || interimText;
        if (display) {
          showCaption((state.you ? state.you.name : 'Sen') + ': ' + display);
          socket.emit('caption', { name: state.you ? state.you.name : 'Sen', text: display });
        }
      };
      recognition.onerror = (event) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn('[CAPTION] Speech recognition error:', event.error);
        }
      };
      recognition.onend = () => {
        if (state.captionsOn && state.recognition) {
          try { recognition.start(); } catch (_) {}
        }
      };
      try {
        recognition.start();
        state.recognition = recognition;
        toast('Altyazılar açık — konuşmaya başlayın', 'success');
      } catch (e) {
        toast('Altyazı başlatılamadı', 'error');
        state.captionsOn = false;
        $('toggleCaptions').classList.remove('active');
      }
    }
  });

  function showCaption(text) {
    const host = $('captionsHost');
    host.textContent = text;
    host.classList.add('show');
    clearTimeout(showCaption._t);
    showCaption._t = setTimeout(() => host.classList.remove('show'), 4000);
  }

  // ---------- REACTIONS ----------
  $('reactionsBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    const h = $('reactionsPopover').hidden;
    $('reactionsPopover').hidden = !h;
    $('morePopover').hidden = true;
  });
  $('reactionsPopover').querySelectorAll('[data-emoji]').forEach(b => {
    b.addEventListener('click', () => {
      const emoji = b.dataset.emoji;
      socket.emit('reaction', { emoji });
      showReaction({ name: state.you.name, emoji });
      $('reactionsPopover').hidden = true;
    });
  });

  function showReaction(data) {
    const host = $('reactionsHost');
    const el = document.createElement('div');
    el.className = 'reaction';
    el.style.position = 'relative';
    el.innerHTML = '<div class="reaction">' + data.emoji + '</div>' + (settings.reactAnimations !== false ? '<div class="reaction-label">' + escapeHtml(data.name) + '</div>' : '');
    host.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }

  document.addEventListener('click', (e) => {
    if (!$('reactionsPopover').hidden && !$('reactionsPopover').contains(e.target) && e.target !== $('reactionsBtn')) $('reactionsPopover').hidden = true;
    if (!$('morePopover').hidden && !$('morePopover').contains(e.target) && e.target !== $('moreBtn')) $('morePopover').hidden = true;
    if (!$('ambientPopover').hidden && !$('ambientPopover').contains(e.target) && e.target !== $('ambientBtn')) $('ambientPopover').hidden = true;
  });

  // ---------- MORE / LAYOUT ----------
  $('moreBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    const h = $('morePopover').hidden;
    $('morePopover').hidden = !h;
    $('reactionsPopover').hidden = true;
  });
  $('morePopover').querySelectorAll('[data-layout]').forEach(b => {
    b.addEventListener('click', () => {
      state.layout = b.dataset.layout;
      applyLayout();
      $('morePopover').hidden = true;
    });
  });
  $('testAudioPop').addEventListener('click', () => {
    $('morePopover').hidden = true;
    $('micTestModal').hidden = false;
    micTestInit();
  });
  $('fullscreenBtn').addEventListener('click', () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
    $('morePopover').hidden = true;
  });

  /* ---------- SCREEN SHARE ZOOM ---------- */
  let screenZoom = 1;
  const screenZoomMin = 0.5;
  const screenZoomMax = 4;
  const screenZoomStep = 0.25;

  function updateScreenZoom() {
    const v = $('presentVideo');
    if (v) v.style.transform = 'scale(' + screenZoom + ')';
    const lbl = $('zoomLevel');
    if (lbl) lbl.textContent = Math.round(screenZoom * 100) + '%';
  }

  $('zoomInBtn').addEventListener('click', () => {
    screenZoom = Math.min(screenZoomMax, screenZoom + screenZoomStep);
    updateScreenZoom();
  });

  $('zoomOutBtn').addEventListener('click', () => {
    screenZoom = Math.max(screenZoomMin, screenZoom - screenZoomStep);
    updateScreenZoom();
  });

  $('presentContent').addEventListener('wheel', (e) => {
    e.preventDefault();
    if (e.deltaY < 0) screenZoom = Math.min(screenZoomMax, screenZoom + screenZoomStep);
    else screenZoom = Math.max(screenZoomMin, screenZoom - screenZoomStep);
    updateScreenZoom();
  }, { passive: false });

  $('presentContent').addEventListener('dblclick', () => {
    screenZoom = screenZoom === 1 ? 2 : 1;
    updateScreenZoom();
  });

  $('presentFullscreenBtn').addEventListener('click', () => {
    const el = $('presentContent');
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  });

  /* ---------- MIC TEST ---------- */
  const mt = { ctx: null, analyser: null, data: null, loopback: false, loopbackGain: null, recording: false, recordedChunks: [], mediaRecorder: null, audioBlob: null, animFrame: null, stream: null };

  function micTestInit() {
    if (!state.localStream) { toast('Mikrofon akışı yok', 'error'); return; }
    if (mt.ctx) { drawMicWaveform(); return; }
    mt.stream = state.localStream;
    mt.ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = mt.ctx.createMediaStreamSource(mt.stream);
    mt.analyser = mt.ctx.createAnalyser();
    mt.analyser.fftSize = 256;
    src.connect(mt.analyser);
    mt.data = new Uint8Array(mt.analyser.frequencyBinCount);
    mt.loopbackGain = mt.ctx.createGain();
    mt.loopbackGain.gain.value = 0;
    mt.analyser.connect(mt.loopbackGain).connect(mt.ctx.destination);
    loadMicTestDevices();
    updateMicTestInfo();
    drawMicWaveform();
  }

  function loadMicTestDevices() {
    const sel = $('micTestSelect');
    navigator.mediaDevices.enumerateDevices().then(devs => {
      const mics = devs.filter(d => d.kind === 'audioinput');
      sel.innerHTML = mics.map(d => '<option value="' + d.deviceId + '">' + escapeHtml(d.label || 'Mikrofon ' + d.deviceId.slice(0,6)) + '</option>').join('');
      if (mt.stream) {
        const track = mt.stream.getAudioTracks()[0];
        if (track) {
          const s = track.getSettings();
          if (s.deviceId) sel.value = s.deviceId;
        }
      }
    });
  }

  function updateMicTestInfo() {
    const info = $('micTestInfo');
    if (!mt.stream) { info.textContent = 'Mikrofon bulunamadı'; return; }
    const track = mt.stream.getAudioTracks()[0];
    if (!track) { info.textContent = 'Mikrofon bulunamadı'; return; }
    const s = track.getSettings();
    const parts = [track.label || 'Bilinmeyen'];
    if (s.sampleRate) parts.push(s.sampleRate + ' Hz');
    if (s.channelCount) parts.push(s.channelCount + ' kanal');
    info.textContent = parts.join(' | ');
  }

  function drawMicWaveform() {
    const canvas = $('micWaveform');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    const W = rect.width, H = rect.height;

    function frame() {
      mt.animFrame = requestAnimationFrame(frame);
      if (!mt.analyser) return;
      mt.analyser.getByteTimeDomainData(mt.data);
      ctx.fillStyle = '#1a1208';
      ctx.fillRect(0, 0, W, H);
      const grad = ctx.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0, '#e8760a');
      grad.addColorStop(0.5, '#f5a623');
      grad.addColorStop(1, '#e8760a');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      const sw = W / mt.data.length;
      let x = 0;
      for (let i = 0; i < mt.data.length; i++) {
        const v = mt.data[i] / 128.0;
        const y = (v * H) / 2;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        x += sw;
      }
      ctx.lineTo(W, H / 2);
      ctx.stroke();
      const sum = mt.data.reduce((a, v) => { const d = (v - 128) / 128; return a + d * d; }, 0);
      const rms = Math.sqrt(sum / mt.data.length);
      const level = Math.min(100, Math.round(rms * 280));
      $('micVolumeFill').style.width = level + '%';
      $('micVolumePct').textContent = level + '%';
    }
    frame();
  }

  $('micTestClose').addEventListener('click', () => {
    $('micTestModal').hidden = true;
    if (mt.animFrame) cancelAnimationFrame(mt.animFrame);
    mt.animFrame = null;
    if (mt.loopback) { mt.loopback = false; mt.loopbackGain.gain.value = 0; }
    $('micLoopbackBtn').dataset.active = 'false';
  });

  $('micLoopbackBtn').addEventListener('click', () => {
    if (!mt.ctx) return;
    mt.loopback = !mt.loopback;
    $('micLoopbackBtn').dataset.active = mt.loopback;
    mt.loopbackGain.gain.linearRampToValueAtTime(mt.loopback ? 0.7 : 0, mt.ctx.currentTime + 0.1);
    if (mt.loopback && mt.ctx.state === 'suspended') mt.ctx.resume();
  });

  $('micRecordBtn').addEventListener('click', () => {
    if (mt.recording || !mt.stream) return;
    mt.recordedChunks = [];
    try { mt.mediaRecorder = new MediaRecorder(mt.stream, { mimeType: 'audio/webm;codecs=opus' }); }
    catch (e) { try { mt.mediaRecorder = new MediaRecorder(mt.stream); } catch (e2) { toast('Kayıt desteklenmiyor', 'error'); return; } }
    mt.recording = true;
    const btn = $('micRecordBtn');
    btn.classList.add('recording');
    let elapsed = 0;
    const timer = setInterval(() => {
      elapsed += 100;
      btn.textContent = 'Kaydediliyor... ' + Math.round(elapsed / 1000) + 'sn';
      btn.classList.add('recording');
      if (elapsed >= 5000) { clearInterval(timer); if (mt.mediaRecorder.state !== 'inactive') mt.mediaRecorder.stop(); }
    }, 100);
    mt.mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) mt.recordedChunks.push(e.data); };
    mt.mediaRecorder.onstop = () => {
      mt.recording = false;
      btn.classList.remove('recording');
      btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg> 5sn Kaydet';
      if (mt.recordedChunks.length > 0) {
        mt.audioBlob = new Blob(mt.recordedChunks, { type: 'audio/webm' });
        $('micPlayBtn').disabled = false;
        toast('Kayıt tamamlandı', 'success');
      }
    };
    mt.mediaRecorder.start(100);
    toast('Kayıt başladı (5 saniye)', 'info');
  });

  $('micPlayBtn').addEventListener('click', () => {
    if (!mt.audioBlob) return;
    const url = URL.createObjectURL(mt.audioBlob);
    const audio = new Audio(url);
    audio.onended = () => { URL.revokeObjectURL(url); };
    audio.play().catch(() => toast('Oynatma hatası', 'error'));
    toast('Kayıt çalıyor...', 'info');
  });

  $('micTestSelect').addEventListener('change', async (e) => {
    const deviceId = e.target.value;
    try {
      if (mt.animFrame) cancelAnimationFrame(mt.animFrame);
      if (mt.loopback) { mt.loopback = false; mt.loopbackGain.gain.value = 0; $('micLoopbackBtn').dataset.active = 'false'; }
      const oldTracks = state.localStream ? state.localStream.getAudioTracks() : [];
      oldTracks.forEach(t => t.stop());
      const s = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: deviceId }, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      const newTrack = s.getAudioTracks()[0];
      if (state.localStream) {
        state.localStream.getAudioTracks().forEach(t => state.localStream.removeTrack(t));
        state.localStream.addTrack(newTrack);
      }
      mt.stream = state.localStream;
      if (mt.ctx) {
        const src = mt.ctx.createMediaStreamSource(mt.stream);
        mt.analyser = mt.ctx.createAnalyser();
        mt.analyser.fftSize = 256;
        src.connect(mt.analyser);
        mt.data = new Uint8Array(mt.analyser.frequencyBinCount);
        mt.loopbackGain = mt.ctx.createGain();
        mt.loopbackGain.gain.value = 0;
        mt.analyser.connect(mt.loopbackGain).connect(mt.ctx.destination);
      }
      updateMicTestInfo();
      drawMicWaveform();
      state.peers.forEach(p => {
        const sender = p.pc.getSenders().find(s => s.track && s.track.kind === 'audio');
        if (sender) sender.replaceTrack(newTrack);
      });
      toast('Mikrofon değiştirildi', 'info');
    } catch (err) {
      toast('Mikrofon değiştirilemedi: ' + err.message, 'error');
    }
  });

  function playTestSound() {
    try {
      ensureAudioContext();
      const ctx = state.audioCtx;
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.value = 0;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
      setTimeout(() => { try { osc.stop(); } catch (_) {} }, 700);
      toast('Test sesi çalıyor', 'info');
    } catch (e) { toast('Ses testi başarısız', 'error'); }
  }

  // ---------- HOST CONTROLS ----------
  function updateHostUI() {
    const isHost = state.isHost;
    $('hostSection').style.display = isHost ? '' : 'none';
    $('muteAllBtn').style.display = isHost ? '' : 'none';
    $('lockMeetingBtn').style.display = isHost ? '' : 'none';
    $('waitingRoomBtn').style.display = isHost ? '' : 'none';
    $('endMeetingBtn').style.display = isHost ? '' : 'none';
    if (isHost) {
      $('lockMeetingBtn').textContent = (state.hostSettings.locked ? '🔓 Kilidi aç' : '🔒 Kilitle');
      $('waitingRoomBtn').textContent = (state.hostSettings.waitingRoom ? '⏳ Bekleme odasını kapat' : '⏳ Bekleme odası aç');
    }
  }

  $('muteAllBtn').addEventListener('click', () => {
    if (confirm('Tüm katılımcılar susturulsun mu?')) socket.emit('host-action', { action: 'mute-all' });
    $('morePopover').hidden = true;
  });
  $('lockMeetingBtn').addEventListener('click', () => {
    socket.emit('update-room', { locked: !state.hostSettings.locked });
    $('morePopover').hidden = true;
  });
  $('waitingRoomBtn').addEventListener('click', () => {
    socket.emit('update-room', { waitingRoom: !state.hostSettings.waitingRoom });
    $('morePopover').hidden = true;
  });
  $('endMeetingBtn').addEventListener('click', () => {
    if (confirm('Toplantı herkes için sonlandırılsın mı?')) socket.emit('host-action', { action: 'end-meeting' });
    $('morePopover').hidden = true;
  });

  // ---------- WHITEBOARD ----------
  const wbState = { canvas: null, ctx: null, tool: 'pen', color: '#2d1810', drawing: false, last: null, overlay: false, undoStack: [] };
  const wbCanvas = $('wbCanvas');
  const wbCtx = wbCanvas.getContext('2d');
  wbState.canvas = wbCanvas;
  wbState.ctx = wbCtx;

  function resizeWb() {
    const r = wbCanvas.getBoundingClientRect();
    const data = wbState.undoStack.length ? wbCanvas.toDataURL() : null;
    wbCanvas.width = r.width * devicePixelRatio;
    wbCanvas.height = r.height * devicePixelRatio;
    wbCtx.scale(devicePixelRatio, devicePixelRatio);
    if (data) {
      const img = new Image();
      img.onload = () => wbCtx.drawImage(img, 0, 0, r.width, r.height);
      img.src = data;
    }
  }

  function populateWbCameraStrip() {
    const strip = $('wbCameraStrip');
    if (!strip) return;
    strip.innerHTML = '';
    const allTiles = document.querySelectorAll('.tile');
    allTiles.forEach(origTile => {
      const clone = origTile.cloneNode(true);
      clone.style.width = '100%';
      clone.style.height = '120px';
      clone.style.minWidth = 'unset';
      clone.style.maxWidth = 'unset';
      strip.appendChild(clone);
    });
  }

  $('whiteboardBtn').addEventListener('click', () => {
    $('whiteboardOverlay').hidden = false;
    wbState.overlay = true;
    setTimeout(() => { resizeWb(); populateWbCameraStrip(); }, 100);
    socket.emit('whiteboard', { type: 'open' });
  });
  $('wbClose').addEventListener('click', () => { $('whiteboardOverlay').hidden = true; wbState.overlay = false; socket.emit('whiteboard', { type: 'close' }); });

  document.querySelectorAll('.wb-tool[data-tool]').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.wb-tool[data-tool]').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      wbState.tool = b.dataset.tool;
    });
  });
  document.querySelectorAll('.wb-color').forEach(c => {
    c.addEventListener('click', () => {
      document.querySelectorAll('.wb-color').forEach(x => x.classList.remove('active'));
      c.classList.add('active');
      wbState.color = c.dataset.color;
    });
  });

  $('wbClear').addEventListener('click', () => {
    wbState.undoStack = [];
    wbCtx.clearRect(0, 0, wbCanvas.width, wbCanvas.height);
    socket.emit('whiteboard', { type: 'clear' });
  });
  $('wbUndo').addEventListener('click', () => {
    if (wbState.undoStack.length === 0) return;
    wbState.undoStack.pop();
    const r = wbCanvas.getBoundingClientRect();
    wbCtx.clearRect(0, 0, wbCanvas.width, wbCanvas.height);
    wbState.undoStack.forEach(d => {
      if (d.type === 'stroke') drawStroke(d);
      else if (d.type === 'rect') drawRect(d);
    });
    socket.emit('whiteboard', { type: 'undo' });
  });
  $('wbExport').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = wbCanvas.toDataURL('image/png');
    a.download = 'whiteboard-' + Date.now() + '.png';
    a.click();
  });

  function drawStroke(d) {
    if (!d.points || d.points.length < 2) return;
    wbCtx.strokeStyle = d.color;
    wbCtx.lineWidth = d.width || 3;
    wbCtx.lineCap = 'round';
    wbCtx.beginPath();
    wbCtx.moveTo(d.points[0].x, d.points[0].y);
    for (let i = 1; i < d.points.length; i++) wbCtx.lineTo(d.points[i].x, d.points[i].y);
    wbCtx.stroke();
  }
  function drawRect(d) {
    wbCtx.strokeStyle = d.color;
    wbCtx.lineWidth = d.width || 3;
    wbCtx.strokeRect(d.x, d.y, d.w, d.h);
  }

  function getPos(e) {
    const r = wbCanvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  }

  let currentStroke = null;
  function startDraw(e) {
    e.preventDefault();
    wbState.drawing = true;
    const p = getPos(e);
    if (wbState.tool === 'pen') {
      currentStroke = { type: 'stroke', color: wbState.color, width: 3, points: [p] };
    } else if (wbState.tool === 'eraser') {
      currentStroke = { type: 'stroke', color: '#ffffff', width: 18, points: [p] };
    } else if (wbState.tool === 'rect') {
      currentStroke = { type: 'rect', color: wbState.color, width: 3, x: p.x, y: p.y, w: 0, h: 0, start: p };
    }
  }
  function moveDraw(e) {
    if (!wbState.drawing || !currentStroke) return;
    e.preventDefault();
    const p = getPos(e);
    if (currentStroke.type === 'stroke') {
      currentStroke.points.push(p);
      const last = currentStroke.points[currentStroke.points.length - 2];
      wbCtx.strokeStyle = currentStroke.color;
      wbCtx.lineWidth = currentStroke.width;
      wbCtx.lineCap = 'round';
      wbCtx.beginPath();
      wbCtx.moveTo(last.x, last.y);
      wbCtx.lineTo(p.x, p.y);
      wbCtx.stroke();
    } else if (currentStroke.type === 'rect') {
      currentStroke.w = p.x - currentStroke.x;
      currentStroke.h = p.y - currentStroke.y;
      // Redraw all
      const r = wbCanvas.getBoundingClientRect();
      wbCtx.clearRect(0, 0, wbCanvas.width, wbCanvas.height);
      wbState.undoStack.forEach(d => d.type === 'stroke' ? drawStroke(d) : drawRect(d));
      drawRect(currentStroke);
    }
  }
  function endDraw() {
    if (!wbState.drawing) return;
    wbState.drawing = false;
    if (currentStroke) {
      wbState.undoStack.push(currentStroke);
      socket.emit('whiteboard', { type: 'draw', data: currentStroke });
      currentStroke = null;
    }
  }
  wbCanvas.addEventListener('mousedown', startDraw);
  wbCanvas.addEventListener('mousemove', moveDraw);
  wbCanvas.addEventListener('mouseup', endDraw);
  wbCanvas.addEventListener('mouseleave', endDraw);
  wbCanvas.addEventListener('touchstart', startDraw, { passive: false });
  wbCanvas.addEventListener('touchmove', moveDraw, { passive: false });
  wbCanvas.addEventListener('touchend', endDraw);

  function applyWbData(d) {
    if (d.type === 'draw') {
      wbState.undoStack.push(d.data);
      if (d.data.type === 'stroke') drawStroke(d.data);
      else if (d.data.type === 'rect') drawRect(d.data);
    } else if (d.type === 'clear') {
      wbState.undoStack = [];
      const r = wbCanvas.getBoundingClientRect();
      wbCtx.clearRect(0, 0, wbCanvas.width, wbCanvas.height);
    } else if (d.type === 'undo') {
      if (wbState.undoStack.length > 0) wbState.undoStack.pop();
      const r = wbCanvas.getBoundingClientRect();
      wbCtx.clearRect(0, 0, wbCanvas.width, wbCanvas.height);
      wbState.undoStack.forEach(d => d.type === 'stroke' ? drawStroke(d) : drawRect(d));
    }
  }

  // ---------- TABS ----------
  state.activeTab = 'chat';
  document.querySelectorAll('.chat-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const t = tab.dataset.tab;
      state.activeTab = t;
      document.querySelectorAll('.chat-tab').forEach(x => x.classList.toggle('active', x === tab));
      $('chatPanel').style.display = t === 'chat' ? 'flex' : 'none';
      $('participantsPanel').style.display = t === 'participants' ? 'flex' : 'none';
      if (t === 'chat') { state.unreadChat = 0; $('chatBadge').hidden = true; }
    });
  });

  // ---------- MISC ----------
  function toggleChatPanel() {
    const chat = document.querySelector('.chat');
    const isCollapsed = chat.classList.toggle('collapsed');
    const btn = $('toggleChat');
    if (btn) btn.setAttribute('data-tooltip', isCollapsed ? 'Sohbeti aç' : 'Sohbeti gizle');
    if (!isCollapsed && isMobile) {
      setTimeout(() => {
        const input = document.getElementById('chatInput');
        if (input) input.focus();
      }, 400);
    }
  }
  $('toggleChat').addEventListener('click', toggleChatPanel);
  $('toggleChatBtn').addEventListener('click', toggleChatPanel);
  $('leaveBtn').addEventListener('click', () => {
    window.location.href = '/post.html?code=' + state.roomCode + '&duration=' + Math.floor((Date.now() - state.meetStart) / 1000);
  });
  $('copyCode').addEventListener('click', () => {
    const link = window.location.origin + '/room.html?code=' + state.roomCode;
    navigator.clipboard.writeText(link).then(() => toast('Bağlantı kopyalandı', 'info'));
  });
  $('roomCodeLabel').addEventListener('click', () => {
    navigator.clipboard.writeText(state.roomCode).then(() => toast('Kod kopyalandı: ' + state.roomCode, 'info'));
  });
  $('roomCodeLabel').style.cursor = 'pointer';

  function updateMicButton() {
    const btn = $('toggleMic');
    const hasMic = state.localStream && state.localStream.getAudioTracks().length > 0;
    btn.dataset.on = hasMic ? state.micOn : 'false';
    btn.classList.toggle('no-track', !hasMic);
    btn.title = hasMic ? (state.micOn ? 'Mikrofon açık (M)' : 'Sustur (M)') : 'Mikrofon yok';
  }
  function updateCameraButton() {
    const btn = $('toggleCam');
    const hasVideo = state.localStream && state.localStream.getVideoTracks().length > 0;
    if (!hasVideo) {
      btn.dataset.on = 'false';
      btn.classList.add('no-track');
      btn.title = 'Kamerayı aç (C)';
    } else {
      btn.classList.remove('no-track');
      btn.dataset.on = state.camOn;
      btn.classList.toggle('off', !state.camOn);
      btn.title = state.camOn ? 'Kamera açık (C)' : 'Kamera kapalı (C)';
    }
  }

  function showAudioLockPrompt() {
    $('audioLock').hidden = false;
  }
  $('audioLockBtn').addEventListener('click', () => {
    ensureAudioContext();
    document.querySelectorAll('video').forEach(v => {
      if (v.id && v.id.startsWith('video-') && v.closest && v.closest('.local')) return;
      v.muted = false;
      const p = v.play();
      if (p && p.catch) p.catch(() => {});
    });
    $('audioLock').hidden = true;
  });

  let audioUnlocked = false;
  function tryUnlockAudio() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    ensureAudioContext();
    document.querySelectorAll('video').forEach(v => {
      if (v.closest && v.closest('.local')) return;
      if (v.srcObject) {
        v.muted = false;
        v.volume = 1;
        const p = v.play();
        if (p && p.catch) p.catch(() => {});
      }
    });
    $('audioLock').hidden = true;
  }
  function onFirstGesture() {
    tryUnlockAudio();
    document.removeEventListener('click', onFirstGesture);
    document.removeEventListener('touchstart', onFirstGesture);
    document.removeEventListener('keydown', onFirstGesture);
  }
  document.addEventListener('click', onFirstGesture, { passive: true });
  document.addEventListener('touchstart', onFirstGesture, { passive: true });
  document.addEventListener('keydown', onFirstGesture);

  function showWaitingScreen() {
    joinGate.hidden = true;
    const wait = document.createElement('div');
    wait.className = 'waiting-card';
    wait.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:5000;';
    wait.innerHTML = '<div style="background:var(--panel);padding:32px;border-radius:16px;text-align:center;width:min(380px,90vw);box-shadow:var(--shadow-lg);"><div class="spinner"></div><h2>Bekleme odası</h2><p>Yöneticinin sizi kabul etmesi bekleniyor...</p></div>';
    document.body.appendChild(wait);
  }

  // ---------- TIMER + CONN QUALITY ----------
  function startTimer() {
    setInterval(() => {
      const sec = Math.floor((Date.now() - state.meetStart) / 1000);
      $('meetTimer').textContent = formatDuration(sec);
    }, 1000);
  }
  function updateConnQuality() {
    const states = Array.from(state.peers.values()).map(p => p.pc.connectionState);
    let quality = 'good';
    if (states.some(s => s === 'failed' || s === 'disconnected')) quality = 'poor';
    else if (states.some(s => s === 'connecting' || s === 'new')) quality = 'medium';
    const el = $('connQuality');
    el.classList.remove('poor', 'medium');
    if (quality === 'poor') { el.classList.add('poor'); $('connText').textContent = 'Zayıf'; }
    else if (quality === 'medium') { el.classList.add('medium'); $('connText').textContent = 'Orta'; }
    else { $('connText').textContent = 'İyi'; }
  }
  setInterval(updateConnQuality, 4000);

  // ---------- KEYBOARD ----------
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'm' || e.key === 'M') $('toggleMic').click();
    else if (e.key === 'c' || e.key === 'C') $('toggleCam').click();
    else if (e.key === 'h' || e.key === 'H') $('raiseHand').click();
  });

  // ---------- JOIN GATE (auto-enter or name prompt) ----------
  const joinGate = $('joinGate');
  const joinGateBtn = $('joinGateBtn');
  const joinGateSkipBtn = $('joinGateSkipBtn');
  const joinGateText = $('joinGateText');
  const joinGateSpinner = $('joinGateSpinner');
  const nameGate = $('nameGate');
  const nameGateInput = $('nameGateInput');
  const nameGateBtn = $('nameGateBtn');

  const hasNameParam = params.has('name') && params.get('name').trim().length > 0;

  function joinWithoutMic() {
    joinGateBtn.hidden = true;
    joinGateSkipBtn.hidden = true;
    state.micOn = false;
    state.localStream = new MediaStream();
    if (state.camOn) {
      navigator.mediaDevices.getUserMedia({ video: true }).then(vs => {
        vs.getVideoTracks().forEach(t => state.localStream.addTrack(t));
        joinGate.hidden = true;
        init();
        spawnChatWatermarks(document.getElementById('chatPanel'), 6);
      }).catch(() => {
        state.camOn = false;
        joinGate.hidden = true;
        init();
        spawnChatWatermarks(document.getElementById('chatPanel'), 6);
      });
    } else {
      joinGate.hidden = true;
      init();
      spawnChatWatermarks(document.getElementById('chatPanel'), 6);
    }
  }

  async function doJoin(overrideName) {
    if (overrideName) {
      name = overrideName;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      joinGateText.textContent = 'Tarayıcı desteklemiyor. Chrome, Edge veya Firefox kullanın.';
      joinGateBtn.disabled = true;
      joinGateSkipBtn.hidden = false;
      joinGateSkipBtn.onclick = joinWithoutMic;
      joinGate.hidden = false;
      return;
    }
    joinGate.hidden = false;
    joinGateText.textContent = 'Bağlanılıyor...';
    joinGateSkipBtn.hidden = false;
    joinGateSkipBtn.onclick = joinWithoutMic;

    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      joinGateText.textContent = 'Mikrofon izni bekleniyor — isterseniz doğrudan katılabilirsiniz';
      joinGateBtn.hidden = false;
      joinGateBtn.disabled = false;
      joinGateBtn.innerHTML = '🎤 Mikrofon izni ver ve katıl';
      joinGateBtn.onclick = () => { settled = false; joinGateBtn.hidden = true; joinGateSkipBtn.hidden = true; joinGateSpinner.hidden = false; joinGateText.textContent = 'Mikrofon izni isteniyor...'; doJoin(); };
    }, 7000);

    try {
      const as = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: settings.noiseReduction !== false, autoGainControl: true } });
      if (settled) { as.getTracks().forEach(t => t.stop()); return; }
      clearTimeout(timeout);
      settled = true;
      state.localStream = new MediaStream(as.getAudioTracks());
      if (state.camOn) {
        try {
          const vs = await navigator.mediaDevices.getUserMedia({ video: true });
          vs.getVideoTracks().forEach(t => state.localStream.addTrack(t));
        } catch (e) { state.camOn = false; }
      }
      state.micOn = true;
      ensureAudioContext();
      joinGate.hidden = true;
      joinGateSkipBtn.hidden = true;
      init();
      spawnChatWatermarks(document.getElementById('chatPanel'), 6);
    } catch (err) {
      if (settled) return;
      clearTimeout(timeout);
      settled = true;
      let msg = 'Hata: ' + (err.message || err.name);
      if (err.name === 'NotAllowedError') msg = 'Mikrofon izni reddedildi.';
      else if (err.name === 'NotFoundError') msg = 'Mikrofon bulunamadı.';
      joinGateText.textContent = msg;
      joinGateBtn.hidden = false;
      joinGateBtn.disabled = false;
      joinGateBtn.onclick = () => { joinGateBtn.hidden = true; joinGateSkipBtn.hidden = true; doJoin(); };
      joinGateSkipBtn.hidden = false;
      joinGateSkipBtn.onclick = joinWithoutMic;
    }
  }

  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (window.matchMedia && window.matchMedia('(max-width:900px)').matches);

  if (!hasNameParam) {
    joinGate.hidden = false;
    joinGateSpinner.hidden = true;
    joinGateText.textContent = 'Toplantıya katılmak için adınızı girin';
    nameGate.hidden = false;
    nameGateInput.value = localStorage.getItem('bs-name') || '';
    setTimeout(() => nameGateInput.focus(), 100);
    nameGateBtn.addEventListener('click', () => {
      const n = nameGateInput.value.trim();
      if (!n) { nameGateInput.focus(); return; }
      localStorage.setItem('bs-name', n);
      nameGate.hidden = true;
      joinGateSpinner.hidden = false;
      joinGateText.textContent = 'Bağlanılıyor...';
      doJoin(n);
    });
    nameGateInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') nameGateBtn.click(); });
  } else if (isMobile) {
    joinGate.hidden = false;
    joinGateSpinner.hidden = true;
    joinGateText.innerHTML = '<span style="font-size:32px;display:block;margin-bottom:8px;">🎙️</span>Toplantıya katılmaya hazır mısın?';
    nameGate.hidden = true;
    joinGateBtn.hidden = false;
    joinGateBtn.disabled = false;
    joinGateBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3l14 9-14 9V3z"/></svg> Katıl';
    joinGateBtn.onclick = () => {
      joinGateBtn.hidden = true;
      joinGateSpinner.hidden = false;
      joinGateText.textContent = 'Mikrofon izni isteniyor...';
      doJoin();
    };
    joinGateSkipBtn.hidden = false;
    joinGateSkipBtn.onclick = joinWithoutMic;
    document.querySelector('.join-gate-hint').textContent = 'Mikrofon ve kamera izni istenecektir — sonra açabilirsiniz';
  } else {
    doJoin();
  }

  // ---------- ROOM SETTINGS MODAL ----------
  function initToggle(btn, key) {
    const s = getSettings();
    const on = s[key] !== false;
    btn.classList.toggle('on', on);
    btn.classList.toggle('off', !on);
    btn.innerHTML = '<span class="toggle-knob"></span>';
    btn.onclick = () => {
      const cur = getSettings();
      cur[key] = cur[key] === false ? true : false;
      saveSettings(cur);
      initToggle(btn, key);
    };
  }

  $('settingsPopBtn').addEventListener('click', () => {
    $('morePopover').hidden = true;
    $('roomSettingsModal').hidden = false;
    initToggle($('roomNoiseToggle'), 'noiseReduction');
    initToggle($('roomEchoToggle'), 'echoCancellation');
    initToggle($('roomAgcToggle'), 'autoGainControl');
    initToggle($('roomReactToggle'), 'reactAnimations');
    navigator.mediaDevices.enumerateDevices().then(devs => {
      const sel = $('roomMicSelect');
      sel.innerHTML = '';
      devs.filter(d => d.kind === 'audioinput').forEach(d => {
        const o = document.createElement('option');
        o.value = d.deviceId;
        o.textContent = d.label || 'Mikrofon ' + (sel.children.length + 1);
        sel.appendChild(o);
      });
      const cur = getSettings();
      if (cur.defaultMic) sel.value = cur.defaultMic;
    }).catch(() => {});
    $('roomMicSelect').onchange = () => {
      const cur = getSettings();
      cur.defaultMic = $('roomMicSelect').value;
      saveSettings(cur);
    };
  });
  $('roomSettingsClose').addEventListener('click', () => { $('roomSettingsModal').hidden = true; });

  // ---------- WHITEBOARD DOC UPLOAD ----------
  $('wbDocUpload').addEventListener('click', () => { $('wbDocInput').click(); });
  $('wbDocInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    $('wbDocTitle').textContent = file.name;
    const content = $('wbDocContent');
    content.innerHTML = '';

    if (file.type === 'application/pdf') {
      const url = URL.createObjectURL(file);
      const iframe = document.createElement('iframe');
      iframe.src = url;
      iframe.style.cssText = 'width:100%;height:100%;border:none;';
      content.appendChild(iframe);
      $('wbDocViewer').hidden = false;
    } else if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      const img = document.createElement('img');
      img.src = url;
      img.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;border-radius:8px;';
      content.appendChild(img);
      $('wbDocViewer').hidden = false;
    } else {
      const ext = file.name.split('.').pop().toLowerCase();
      const url = URL.createObjectURL(file);
      const info = document.createElement('div');
      info.style.cssText = 'text-align:center;padding:40px;';
      const iconMap = { ppt: '📊', pptx: '📊', xls: '📈', xlsx: '📈', csv: '📈', doc: '📝', docx: '📝', txt: '📄', odp: '📊', ods: '📈' };
      info.innerHTML =
        '<div style="font-size:64px;margin-bottom:16px;">' + (iconMap[ext] || '📄') + '</div>' +
        '<div style="font-size:18px;font-weight:700;margin-bottom:8px;">' + escapeHtml(file.name) + '</div>' +
        '<div style="font-size:13px;color:var(--muted);margin-bottom:20px;">' + (file.type || ext.toUpperCase()) + ' · ' + (file.size > 1024 * 1024 ? (file.size / 1024 / 1024).toFixed(1) + ' MB' : (file.size / 1024).toFixed(0) + ' KB') + '</div>' +
        '<a href="' + url + '" download="' + escapeHtml(file.name) + '" class="btn primary" style="text-decoration:none;display:inline-flex;align-items:center;gap:6px;padding:10px 20px;border-radius:10px;font-weight:600;">' +
          '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' +
          'Dosyayı indir' +
        '</a>';
      content.appendChild(info);
      $('wbDocViewer').hidden = false;
    }
  });
  $('wbDocClose').addEventListener('click', () => {
    $('wbDocViewer').hidden = true;
    $('wbDocContent').innerHTML = '';
  });

  // ---------- AMBIENT MUSIC + RADIO ----------
  let ambientState = { playing: false, nodes: [], gainNode: null, volume: 0.25, type: 'supermarket', timers: [], radioEl: null };

  const RADIO_STREAMS = {
    'radio-powerturk':  { name: 'PowerTürk FM',   url: '/api/radio-proxy?url=' + encodeURIComponent('https://playerservices.streamtheworld.com/api/livestream-redirect/POWERTURK_SC') },
    'radio-powerfm':    { name: 'Power FM',        url: '/api/radio-proxy?url=' + encodeURIComponent('https://playerservices.streamtheworld.com/api/livestream-redirect/POWER_FM_SC') },
    'radio-ntv':        { name: 'NTV Radyo',       url: '/api/radio-proxy?url=' + encodeURIComponent('http://ntvrdwmp.radyotvonline.com/') },
    'radio-superfm':    { name: 'Süper FM',        url: '/api/radio-proxy?url=' + encodeURIComponent('https://playerservices.streamtheworld.com/api/livestream-redirect/SUPER_FM_SC') },
    'radio-virgin':     { name: 'Virgin Radio',    url: '/api/radio-proxy?url=' + encodeURIComponent('https://playerservices.streamtheworld.com/api/livestream-redirect/VIRGIN_RADIO_SC') },
    'radio-joyturk':    { name: 'Joy Türk',        url: '/api/radio-proxy?url=' + encodeURIComponent('https://playerservices.streamtheworld.com/api/livestream-redirect/JOY_TURK_SC') },
    'radio-kral':       { name: 'Kral Türk FM',    url: '/api/radio-proxy?url=' + encodeURIComponent('https://live.radyositesihazir.com/8032/stream') },
    'radio-radyo7':     { name: 'Radyo 7',         url: '/api/radio-proxy?url=' + encodeURIComponent('http://46.20.3.250/;stream') },
    'radio-fenomen':    { name: 'Fenomen FM',      url: '/api/radio-proxy?url=' + encodeURIComponent('https://fenomen.listenfenomen.com/fenomen/256/icecast.audio') },
    'radio-90lar':      { name: '90\'lar Radyo',   url: '/api/radio-proxy?url=' + encodeURIComponent('http://37.247.98.8/stream/166/') },
    'radio-altin':      { name: 'Altın Şarkılar',  url: '/api/radio-proxy?url=' + encodeURIComponent('http://37.247.98.8/stream/25/;') },
    'radio-metro':      { name: 'Metro FM',        url: '/api/radio-proxy?url=' + encodeURIComponent('https://playerservices.streamtheworld.com/api/livestream-redirect/METRO_FM_SC') },
    'radio-dinamocaffe':{ name: 'Dinamo Caffe',    url: '/api/radio-proxy?url=' + encodeURIComponent('http://channels.dinamo.fm/caffe-mp3') },
    'radio-dinamosleep':{ name: 'Dinamo Sleep',    url: '/api/radio-proxy?url=' + encodeURIComponent('http://channels.dinamo.fm/sleep-mp3') },
    'radio-sputnik':    { name: 'Radyo Sputnik',   url: '/api/radio-proxy?url=' + encodeURIComponent('https://icecast-rian.cdnvideo.ru/voicestm') }
  };

  function clearAmbient() {
    ambientState.timers.forEach(t => clearTimeout(t));
    ambientState.timers = [];
    ambientState.nodes.forEach(n => { try { n.stop(); } catch (_) {} });
    ambientState.nodes = [];
    if (ambientState.gainNode) { try { ambientState.gainNode.disconnect(); } catch (_) {} }
    if (ambientState.radioEl) {
      ambientState.radioEl.pause();
      ambientState.radioEl.src = '';
      ambientState.radioEl = null;
    }
  }

  function startRadio(type) {
    const stream = RADIO_STREAMS[type];
    if (!stream) return;
    clearAmbient();
    const audio = new Audio();
    audio.src = stream.url;
    audio.volume = ambientState.volume;
    audio.preload = 'auto';
    audio.play().catch(() => {
      toast(stream.name + ' çalınamadı — tarayıcı Engellemiş olabilir', 'error');
    });
    audio.addEventListener('error', () => {
      toast(stream.name + ' yayınına bağlanılamadı', 'error');
    }, { once: true });
    ambientState.radioEl = audio;
    ambientState.playing = true;
    ambientState.type = type;
    $('ambientBtn').style.color = 'var(--accent)';
    document.querySelectorAll('.ambient-type').forEach(b => b.classList.toggle('active', b.dataset.ambient === type));
    toast('📻 ' + stream.name + ' canlı', 'success');
  }

  function createAmbientGain() {
    const ctx = state.audioCtx;
    const g = ctx.createGain();
    g.gain.value = ambientState.volume;
    g.connect(ctx.destination);
    ambientState.gainNode = g;
    return g;
  }

  const AMBIENT = {
    supermarket(ctx, master) {
      const chords = [
        [261.63, 329.63, 392.00], [293.66, 369.99, 440.00],
        [220.00, 277.18, 329.63], [246.94, 311.13, 369.99],
        [261.63, 311.13, 392.00], [196.00, 246.94, 293.66]
      ];
      const notes = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00];
      function pad() {
        if (!ambientState.playing) return;
        const ch = chords[Math.floor(Math.random() * chords.length)];
        const dur = 3 + Math.random() * 3;
        ch.forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine'; o.frequency.value = freq;
          g.gain.setValueAtTime(0, ctx.currentTime);
          g.gain.linearRampToValueAtTime(0.06 / (i + 1), ctx.currentTime + dur * 0.3);
          g.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
          o.connect(g).connect(master); o.start(); o.stop(ctx.currentTime + dur + 0.1);
          ambientState.nodes.push(o);
        });
        ambientState.timers.push(setTimeout(pad, dur * 800));
      }
      function melody() {
        if (!ambientState.playing) return;
        const n = notes[Math.floor(Math.random() * notes.length)];
        const dur = 0.6 + Math.random() * 1.2;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'triangle'; o.frequency.value = n;
        g.gain.setValueAtTime(0, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.035, ctx.currentTime + dur * 0.15);
        g.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
        o.connect(g).connect(master); o.start(); o.stop(ctx.currentTime + dur + 0.1);
        ambientState.nodes.push(o);
        ambientState.timers.push(setTimeout(melody, (dur + 1 + Math.random() * 2.5) * 1000));
      }
      pad(); ambientState.timers.push(setTimeout(melody, 500));
    },

    cafe(ctx, master) {
      function pad() {
        if (!ambientState.playing) return;
        const freqs = [174.61, 220.00, 261.63, 329.63, 392.00, 440.00];
        const dur = 5 + Math.random() * 5;
        for (let i = 0; i < 3; i++) {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine'; o.frequency.value = freqs[Math.floor(Math.random() * freqs.length)];
          g.gain.setValueAtTime(0, ctx.currentTime);
          g.gain.linearRampToValueAtTime(0.04, ctx.currentTime + dur * 0.4);
          g.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
          o.connect(g).connect(master); o.start(); o.stop(ctx.currentTime + dur + 0.1);
          ambientState.nodes.push(o);
        }
        ambientState.timers.push(setTimeout(pad, dur * 700));
      }
      function crackle() {
        if (!ambientState.playing) return;
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.02;
        const src = ctx.createBufferSource();
        src.buffer = buf; src.connect(master); src.start();
        ambientState.nodes.push(src);
        ambientState.timers.push(setTimeout(crackle, 200 + Math.random() * 600));
      }
      pad(); crackle();
    },

    rain(ctx, master) {
      function rainLoop() {
        if (!ambientState.playing) return;
        const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.15;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filt = ctx.createBiquadFilter();
        filt.type = 'lowpass'; filt.frequency.value = 800 + Math.random() * 400;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.5);
        g.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 1.5);
        g.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);
        src.connect(filt).connect(g).connect(master);
        src.start(); src.stop(ctx.currentTime + 2.1);
        ambientState.nodes.push(src);
        ambientState.timers.push(setTimeout(rainLoop, 1800));
      }
      function thunder() {
        if (!ambientState.playing) return;
        const buf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) {
          const env = Math.max(0, 1 - i / (ctx.sampleRate * 1.5));
          d[i] = (Math.random() * 2 - 1) * env * env * 0.3;
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filt = ctx.createBiquadFilter();
        filt.type = 'lowpass'; filt.frequency.value = 200;
        src.connect(filt).connect(master); src.start();
        ambientState.nodes.push(src);
        ambientState.timers.push(setTimeout(thunder, 8000 + Math.random() * 15000));
      }
      rainLoop(); thunder();
    },

    nature(ctx, master) {
      const birdNotes = [1500, 2000, 2500, 3000, 1800, 2200, 2800];
      function wind() {
        if (!ambientState.playing) return;
        const buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
        const d = buf.getChannelData(0);
        let v = 0;
        for (let i = 0; i < d.length; i++) {
          v += (Math.random() * 2 - 1) * 0.01;
          v *= 0.998;
          d[i] = v * 3;
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filt = ctx.createBiquadFilter();
        filt.type = 'bandpass'; filt.frequency.value = 300; filt.Q.value = 0.5;
        src.connect(filt).connect(master); src.start();
        ambientState.nodes.push(src);
        ambientState.timers.push(setTimeout(wind, 3500));
      }
      function birds() {
        if (!ambientState.playing) return;
        const f = birdNotes[Math.floor(Math.random() * birdNotes.length)];
        const dur = 0.1 + Math.random() * 0.2;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        o.frequency.linearRampToValueAtTime(f * (0.8 + Math.random() * 0.4), ctx.currentTime + dur);
        g.gain.setValueAtTime(0, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.03, ctx.currentTime + dur * 0.2);
        g.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
        o.connect(g).connect(master); o.start(); o.stop(ctx.currentTime + dur + 0.1);
        ambientState.nodes.push(o);
        const next = 200 + Math.random() * 3000;
        ambientState.timers.push(setTimeout(birds, next));
      }
      wind(); ambientState.timers.push(setTimeout(birds, 1000));
    },

    lofi(ctx, master) {
      const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33];
      function chords() {
        if (!ambientState.playing) return;
        const start = Math.floor(Math.random() * (scale.length - 2));
        const dur = 3 + Math.random() * 2;
        for (let i = 0; i < 3; i++) {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine'; o.frequency.value = scale[start + i] * 0.5;
          g.gain.setValueAtTime(0, ctx.currentTime);
          g.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 0.3);
          g.gain.setValueAtTime(0.07, ctx.currentTime + dur - 0.5);
          g.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
          o.connect(g).connect(master); o.start(); o.stop(ctx.currentTime + dur + 0.1);
          ambientState.nodes.push(o);
        }
        ambientState.timers.push(setTimeout(chords, dur * 900));
      }
      function melody() {
        if (!ambientState.playing) return;
        const n = scale[Math.floor(Math.random() * scale.length)];
        const dur = 0.3 + Math.random() * 0.8;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'triangle'; o.frequency.value = n;
        g.gain.setValueAtTime(0, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.04, ctx.currentTime + dur * 0.1);
        g.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
        o.connect(g).connect(master); o.start(); o.stop(ctx.currentTime + dur + 0.1);
        ambientState.nodes.push(o);
        ambientState.timers.push(setTimeout(melody, (dur + 0.5 + Math.random() * 2) * 1000));
      }
      chords(); ambientState.timers.push(setTimeout(melody, 800));
    },

    classical(ctx, master) {
      const scale = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
      function arpeggio() {
        if (!ambientState.playing) return;
        const root = scale[Math.floor(Math.random() * 5)];
        const pattern = [1, 1.25, 1.5, 1.25, 1, 0.75];
        pattern.forEach((mult, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine'; o.frequency.value = root * mult;
          const t = ctx.currentTime + i * 0.4;
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(0.05, t + 0.05);
          g.gain.linearRampToValueAtTime(0, t + 0.5);
          o.connect(g).connect(master); o.start(t); o.stop(t + 0.6);
          ambientState.nodes.push(o);
        });
        ambientState.timers.push(setTimeout(arpeggio, 3000 + Math.random() * 2000));
      }
      function sustain() {
        if (!ambientState.playing) return;
        const freq = scale[Math.floor(Math.random() * scale.length)] * 0.5;
        const dur = 4 + Math.random() * 4;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = freq;
        g.gain.setValueAtTime(0, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.04, ctx.currentTime + dur * 0.3);
        g.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
        o.connect(g).connect(master); o.start(); o.stop(ctx.currentTime + dur + 0.1);
        ambientState.nodes.push(o);
        ambientState.timers.push(setTimeout(sustain, dur * 800));
      }
      arpeggio(); sustain();
    }
  };

  function startAmbient(type) {
    if (RADIO_STREAMS[type]) { startRadio(type); return; }
    if (ambientState.playing) clearAmbient();
    ensureAudioContext();
    const ctx = state.audioCtx;
    if (!ctx) return;
    ambientState.playing = true;
    ambientState.type = type || ambientState.type;
    const master = createAmbientGain();
    if (AMBIENT[ambientState.type]) AMBIENT[ambientState.type](ctx, master);
    $('ambientBtn').style.color = 'var(--accent)';
    document.querySelectorAll('.ambient-type').forEach(b => b.classList.toggle('active', b.dataset.ambient === ambientState.type));
  }

  function stopAmbient() {
    ambientState.playing = false;
    clearAmbient();
    $('ambientBtn').style.color = '';
    toast('Arka plan müziği kapatıldı', 'info');
  }

  $('ambientBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    const pop = $('ambientPopover');
    const wasHidden = pop.hidden;
    pop.hidden = !wasHidden;
    $('reactionsPopover').hidden = true;
    $('morePopover').hidden = true;
    if (wasHidden && ambientState.playing) {
      document.querySelectorAll('.ambient-type').forEach(b => b.classList.toggle('active', b.dataset.ambient === ambientState.type));
      $('ambientVolume').value = ambientState.volume * 100;
      $('ambientVolLabel').textContent = Math.round(ambientState.volume * 100) + '%';
    }
  });

  document.querySelectorAll('.ambient-type').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.ambient-type').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      startAmbient(b.dataset.ambient);
      toast('🎵 ' + b.textContent.trim(), 'info');
    });
  });

  $('stopAmbientBtn').addEventListener('click', () => {
    stopAmbient();
    document.querySelectorAll('.ambient-type').forEach(x => x.classList.remove('active'));
  });

  $('ambientVolume').addEventListener('input', (e) => {
    ambientState.volume = e.target.value / 100;
    $('ambientVolLabel').textContent = e.target.value + '%';
    if (ambientState.gainNode) ambientState.gainNode.gain.value = ambientState.volume;
    if (ambientState.radioEl) ambientState.radioEl.volume = ambientState.volume;
  });

  // ---------- CANLI TV ----------
  $('liveTvBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    const pop = $('tvPopover');
    pop.hidden = !pop.hidden;
    $('ambientPopover').hidden = true;
    $('reactionsPopover').hidden = true;
    $('morePopover').hidden = true;
  });

  document.querySelectorAll('.tv-channel').forEach(b => {
    b.addEventListener('click', () => {
      const tvYt = b.dataset.tvYt;
      if (!tvYt) return;
      $('tvOverlay').hidden = false;
      $('tvPopover').hidden = true;
      $('tvFrame').src = '';
      toast('📺 ' + b.textContent.trim() + ' yükleniyor...', 'info');
      fetch('/api/tv-live/' + encodeURIComponent(tvYt)).then(r => r.json()).then(d => {
        if (d.videoId) {
          $('tvFrame').src = 'https://www.youtube.com/embed/' + d.videoId + '?autoplay=1&mute=1';
        } else {
          toast('📺 Canlı yayın şu an mevcut değil', 'error');
          $('tvOverlay').hidden = true;
        }
      }).catch(() => {
        toast('📺 Bağlantı hatası', 'error');
        $('tvOverlay').hidden = true;
      });
    });
  });

  $('tvOverlayClose').addEventListener('click', () => {
    $('tvOverlay').hidden = true;
    $('tvFrame').src = '';
  });

  $('tvCloseBtn').addEventListener('click', () => {
    $('tvOverlay').hidden = true;
    $('tvFrame').src = '';
    $('tvPopover').hidden = true;
  });

  // ---------- BORSA TICKER ----------
  let stockItems = [];

  function renderTicker() {
    const track = $('tickerTrack');
    if (!track || stockItems.length === 0) return;
    let html = '';
    const items = stockItems.concat(stockItems);
    items.forEach(s => {
      const cls = s.chg > 0 ? 'ticker-up' : s.chg < 0 ? 'ticker-down' : 'ticker-flat';
      const arrow = s.chg > 0 ? '▲' : s.chg < 0 ? '▼' : '—';
      const val = typeof s.val === 'number' ? s.val.toLocaleString('tr-TR', { maximumFractionDigits: 2 }) : s.val;
      html += '<span class="ticker-item ' + cls + '">' + s.sym + ' ' + val + ' ' + arrow + ' ' + Math.abs(s.chg).toFixed(2) + '%</span>';
    });
    track.innerHTML = html;
  }

  function fetchStockData() {
    fetch('/api/stock').then(r => r.json()).then(d => {
      if (d.items && d.items.length > 0) {
        stockItems = d.items;
        renderTicker();
      }
    }).catch(() => {});
  }

  $('stockTickerBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    const t = $('stockTicker');
    t.hidden = !t.hidden;
    if (!t.hidden) {
      fetchStockData();
      toast('📈 Borsa ticker açıldı', 'info');
    }
  });

  $('closeTicker').addEventListener('click', () => {
    $('stockTicker').hidden = true;
  });

  setInterval(() => {
    if (!$('stockTicker').hidden) fetchStockData();
  }, 15000);

  window.addEventListener('beforeunload', () => {
    stopAmbient();
    if (state.recognition) { try { state.recognition.stop(); } catch (_) {} }
    state.peers.forEach(p => { try { p.pc.close(); } catch (_) {} });
    if (state.localStream) state.localStream.getTracks().forEach(t => t.stop());
    if (state.screenStream) state.screenStream.getTracks().forEach(t => t.stop());
    if (state.audioCtx) { try { state.audioCtx.close(); } catch (_) {} }
    socket.disconnect();
  });
})();
