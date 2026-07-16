(() => {
  const params = new URLSearchParams(window.location.search);
  const code = (params.get('code') || '').toUpperCase();
  const name = params.get('name') || '';

  if (!code) { window.location.href = '/'; return; }

  const settings = getSettings();
  const previewVideo = document.getElementById('previewVideo');
  const micToggle = document.getElementById('micToggle');
  const camToggle = document.getElementById('camToggle');
  const blurToggle = document.getElementById('blurToggle');
  const blurRowToggle = document.getElementById('blurRowToggle');
  const noiseToggle = document.getElementById('noiseToggle');
  const micSelect = document.getElementById('micSelect');
  const camSelect = document.getElementById('camSelect');
  const speakerSelect = document.getElementById('speakerSelect');
  const nameInput = document.getElementById('nameInput');
  const startMicOff = document.getElementById('startMicOff');
  const startCamOff = document.getElementById('startCamOff');
  const joinBtn = document.getElementById('joinBtn');
  const micMeterBars = document.querySelectorAll('#micMeter .bar');

  const state = {
    stream: null,
    micOn: true,
    camOn: false,
    blur: false,
    audioCtx: null,
    audioAnalyser: null,
    audioData: null
  };

  if (settings.joinWithMicOff) { startMicOff.classList.add('on'); state.micOn = false; }
  if (settings.joinWithCamOff) { startCamOff.classList.add('on'); state.camOn = false; }
  if (settings.backgroundBlur) { blurRowToggle.classList.add('on'); state.blur = true; blurToggle.classList.add('active'); }
  if (settings.noiseReduction === false) noiseToggle.classList.remove('on');

  nameInput.value = name || localStorage.getItem('bs-name') || getUser()?.name || '';

  async function applyBlur(track) {
    if (!window.BrowserSupporter || !track) return;
  }

  async function startMedia() {
    try {
      const constraints = {
        audio: state.micOn ? {
          deviceId: settings.defaultMic ? { exact: settings.defaultMic } : undefined,
          echoCancellation: true,
          noiseSuppression: noiseToggle.classList.contains('on'),
          autoGainControl: true
        } : false,
        video: state.camOn ? {
          deviceId: settings.defaultCam ? { exact: settings.defaultCam } : undefined,
          width: { ideal: settings.videoQuality === '1080p' ? 1920 : settings.videoQuality === '720p' ? 1280 : 640 },
          height: { ideal: settings.videoQuality === '1080p' ? 1080 : settings.videoQuality === '720p' ? 720 : 360 }
        } : false
      };
      if (state.stream) {
        state.stream.getTracks().forEach(t => t.stop());
      }
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      state.stream = s;
      previewVideo.srcObject = s;
      updateControls();
      setupAudioMeter();
    } catch (err) {
      if (err.name === 'NotAllowedError') toast('Mikrofon/kamera izni reddedildi', 'error');
      else if (err.name === 'NotFoundError') toast('Cihaz bulunamadı', 'error');
      else toast('Medya hatası: ' + err.message, 'error');
    }
    await loadDevices();
  }

  async function loadDevices() {
    const { mics, cams, speakers } = await getAudioDevices();
    micSelect.innerHTML = mics.map(d => '<option value="' + d.deviceId + '">' + escapeHtml(d.label || 'Mikrofon ' + d.deviceId.slice(0,6)) + '</option>').join('');
    camSelect.innerHTML = cams.map(d => '<option value="' + d.deviceId + '">' + escapeHtml(d.label || 'Kamera ' + d.deviceId.slice(0,6)) + '</option>').join('');
    speakerSelect.innerHTML = '<option value="">Sistem varsayılanı</option>' + speakers.map(d => '<option value="' + d.deviceId + '">' + escapeHtml(d.label || 'Hoparlör ' + d.deviceId.slice(0,6)) + '</option>').join('');
    if (settings.defaultMic) micSelect.value = settings.defaultMic;
    if (settings.defaultCam) camSelect.value = settings.defaultCam;
    if (settings.defaultSpeaker) speakerSelect.value = settings.defaultSpeaker;
  }

  function updateControls() {
    const hasAudio = state.stream && state.stream.getAudioTracks().length > 0;
    const hasVideo = state.stream && state.stream.getVideoTracks().length > 0;
    micToggle.dataset.on = hasAudio ? state.micOn : 'false';
    micToggle.classList.toggle('no-track', !hasAudio);
    micToggle.title = hasAudio ? (state.micOn ? 'Mikrofon açık' : 'Mikrofon kapalı') : 'Mikrofon yok';
    if (hasAudio) state.stream.getAudioTracks().forEach(t => t.enabled = state.micOn);

    if (hasVideo && state.stream.getVideoTracks()[0].enabled) {
      camToggle.classList.remove('no-track');
      camToggle.dataset.on = 'true';
      camToggle.title = 'Kamera açık';
    } else {
      camToggle.classList.add('no-track');
      camToggle.dataset.on = 'false';
      camToggle.title = 'Kamerayı aç';
    }
    const ph = document.getElementById('previewWrap');
    let placeholder = ph.querySelector('.preview-placeholder');
    if (!hasVideo || !state.stream.getVideoTracks()[0].enabled) {
      if (!placeholder) {
        placeholder = document.createElement('div');
        placeholder.className = 'preview-placeholder';
        placeholder.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--bg-3),var(--bg-2));pointer-events:none;';
        placeholder.innerHTML = '<div class="avatar">' + escapeHtml((nameInput.value || '?').charAt(0).toUpperCase()) + '</div>';
        ph.appendChild(placeholder);
      }
    } else if (placeholder) {
      placeholder.remove();
    }
  }

  function setupAudioMeter() {
    if (!state.stream || state.stream.getAudioTracks().length === 0) return;
    try {
      if (!state.audioCtx) state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = state.audioCtx.createMediaStreamSource(state.stream);
      const analyser = state.audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      state.audioAnalyser = analyser;
      state.audioData = new Uint8Array(analyser.frequencyBinCount);
      tick();
    } catch (e) { console.warn(e); }
  }

  function tick() {
    if (!state.audioAnalyser) return;
    state.audioAnalyser.getByteTimeDomainData(state.audioData);
    let sum = 0;
    for (let i = 0; i < state.audioData.length; i++) {
      const v = (state.audioData[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / state.audioData.length);
    const level = Math.min(1, rms * 3.5);
    micMeterBars.forEach((bar, idx) => {
      const threshold = (idx + 1) / 5;
      bar.style.height = (level > threshold) ? (6 + (idx + 1) * 3) + 'px' : '4px';
    });
    requestAnimationFrame(tick);
  }

  micToggle.addEventListener('click', () => {
    if (!state.stream) { startMedia(); return; }
    state.micOn = !state.micOn;
    state.stream.getAudioTracks().forEach(t => t.enabled = state.micOn);
    updateControls();
  });

  camToggle.addEventListener('click', async () => {
    if (state.camOn) {
      state.camOn = false;
      if (state.stream) state.stream.getVideoTracks().forEach(t => { t.enabled = false; });
      updateControls();
      return;
    }
    state.camOn = true;
    if (!state.stream || state.stream.getVideoTracks().length === 0) {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { deviceId: settings.defaultCam ? { exact: settings.defaultCam } : undefined } });
        s.getVideoTracks().forEach(t => {
          if (state.stream) state.stream.addTrack(t);
          else state.stream = new MediaStream([t]);
          previewVideo.srcObject = state.stream;
        });
        await loadDevices();
        setupAudioMeter();
      } catch (e) {
        toast('Kamera açılamadı', 'error');
        state.camOn = false;
        return;
      }
    } else {
      state.stream.getVideoTracks().forEach(t => t.enabled = true);
    }
    updateControls();
  });

  blurToggle.addEventListener('click', () => {
    state.blur = !state.blur;
    blurToggle.classList.toggle('active', state.blur);
    blurRowToggle.classList.toggle('on', state.blur);
    if (state.stream) {
      state.stream.getVideoTracks().forEach(t => {
        const caps = t.getCapabilities ? t.getCapabilities() : {};
        if (caps.backgroundBlur) t.applyConstraints({ advanced: [{ backgroundBlur: state.blur }] }).catch(() => {});
      });
    }
  });
  blurRowToggle.addEventListener('click', () => blurToggle.click());

  noiseToggle.addEventListener('click', () => {
    noiseToggle.classList.toggle('on');
    startMedia();
  });

  document.getElementById('expandableHeader').addEventListener('click', () => {
    document.getElementById('expandableSettings').classList.toggle('open');
  });

  startMicOff.addEventListener('click', () => {
    startMicOff.classList.toggle('on');
    state.micOn = !startMicOff.classList.contains('on');
    if (state.stream) state.stream.getAudioTracks().forEach(t => t.enabled = state.micOn);
    updateControls();
  });
  startCamOff.addEventListener('click', () => {
    startCamOff.classList.toggle('on');
    state.camOn = !startCamOff.classList.contains('on');
    if (state.stream) state.stream.getVideoTracks().forEach(t => t.enabled = state.camOn);
    updateControls();
  });

  document.getElementById('testAudio').addEventListener('click', () => {
    document.getElementById('micTestModal').hidden = false;
    micTestInit();
  });

  /* ---------- MIC TEST ---------- */
  const mt = { stream: null, ctx: null, analyser: null, data: null, loopback: false, loopbackGain: null, recording: false, recordedChunks: [], mediaRecorder: null, audioBlob: null, animFrame: null };

  function micTestInit() {
    if (mt.stream) return;
    if (!state.stream) { toast('Önce mikrofon izni gerekli', 'error'); return; }
    mt.stream = state.stream;
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
    drawWaveform();
  }

  function loadMicTestDevices() {
    const sel = document.getElementById('micTestSelect');
    navigator.mediaDevices.enumerateDevices().then(devs => {
      const mics = devs.filter(d => d.kind === 'audioinput');
      sel.innerHTML = mics.map(d => '<option value="' + d.deviceId + '">' + escapeHtml(d.label || 'Mikrofon ' + d.deviceId.slice(0,6)) + '</option>').join('');
      if (mt.stream) {
        const track = mt.stream.getAudioTracks()[0];
        if (track) {
          const settings = track.getSettings();
          if (settings.deviceId) sel.value = settings.deviceId;
        }
      }
    });
  }

  function updateMicTestInfo() {
    const info = document.getElementById('micTestInfo');
    if (!mt.stream) { info.textContent = 'Cihaz seçilmedi'; return; }
    const track = mt.stream.getAudioTracks()[0];
    if (!track) { info.textContent = 'Mikrofon bulunamadı'; return; }
    const s = track.getSettings();
    const label = track.label || 'Bilinmeyen';
    const parts = [label];
    if (s.sampleRate) parts.push(s.sampleRate + ' Hz');
    if (s.channelCount) parts.push(s.channelCount + ' kanal');
    if (s.echoCancellation === false) parts.push('Yankı iptal: kapalı');
    if (s.noiseSuppression === false) parts.push('Gürültü engelleme: kapalı');
    info.textContent = parts.join(' | ');
  }

  function drawWaveform() {
    const canvas = document.getElementById('micWaveform');
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

      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-2').trim() || '#f5f0e8';
      ctx.fillRect(0, 0, W, H);

      const gradient = ctx.createLinearGradient(0, 0, W, 0);
      gradient.addColorStop(0, '#e8760a');
      gradient.addColorStop(0.5, '#d45e0a');
      gradient.addColorStop(1, '#e8760a');

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      const sliceWidth = W / mt.data.length;
      let x = 0;
      for (let i = 0; i < mt.data.length; i++) {
        const v = mt.data[i] / 128.0;
        const y = (v * H) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(W, H / 2);
      ctx.stroke();

      const sum = mt.data.reduce((acc, v) => { const d = (v - 128) / 128; return acc + d * d; }, 0);
      const rms = Math.sqrt(sum / mt.data.length);
      const level = Math.min(100, Math.round(rms * 280));
      document.getElementById('micVolumeFill').style.width = level + '%';
      document.getElementById('micVolumePct').textContent = level + '%';
    }
    frame();
  }

  document.getElementById('micTestClose').addEventListener('click', () => {
    document.getElementById('micTestModal').hidden = true;
    if (mt.animFrame) cancelAnimationFrame(mt.animFrame);
    mt.animFrame = null;
    if (mt.loopback) { mt.loopback = false; mt.loopbackGain.gain.value = 0; }
    document.getElementById('micLoopbackBtn').dataset.active = 'false';
  });

  document.getElementById('micLoopbackBtn').addEventListener('click', () => {
    if (!mt.ctx) return;
    mt.loopback = !mt.loopback;
    document.getElementById('micLoopbackBtn').dataset.active = mt.loopback;
    mt.loopbackGain.gain.linearRampToValueAtTime(mt.loopback ? 0.7 : 0, mt.ctx.currentTime + 0.1);
    if (mt.loopback && mt.ctx.state === 'suspended') mt.ctx.resume();
  });

  document.getElementById('micRecordBtn').addEventListener('click', () => {
    if (mt.recording) return;
    if (!mt.stream) return;
    mt.recordedChunks = [];
    try {
      mt.mediaRecorder = new MediaRecorder(mt.stream, { mimeType: 'audio/webm;codecs=opus' });
    } catch (e) {
      try { mt.mediaRecorder = new MediaRecorder(mt.stream); } catch (e2) { toast('Kayıt desteklenmiyor', 'error'); return; }
    }
    mt.recording = true;
    const btn = document.getElementById('micRecordBtn');
    btn.classList.add('recording');
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12" rx="2"/></svg> Kaydediliyor...';
    let elapsed = 0;
    const timer = setInterval(() => {
      elapsed += 100;
      const sec = Math.round(elapsed / 1000);
      btn.textContent = 'Kaydediliyor... ' + sec + 'sn';
      btn.classList.add('recording');
      if (elapsed >= 5000) {
        clearInterval(timer);
        if (mt.mediaRecorder && mt.mediaRecorder.state !== 'inactive') mt.mediaRecorder.stop();
      }
    }, 100);
    mt.mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) mt.recordedChunks.push(e.data); };
    mt.mediaRecorder.onstop = () => {
      mt.recording = false;
      btn.classList.remove('recording');
      btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg> 5sn Kaydet';
      if (mt.recordedChunks.length > 0) {
        mt.audioBlob = new Blob(mt.recordedChunks, { type: 'audio/webm' });
        document.getElementById('micPlayBtn').disabled = false;
        toast('Kayıt tamamlandı — geri dinleyebilirsiniz', 'success');
      }
    };
    mt.mediaRecorder.start(100);
    toast('Kayıt başladı (5 saniye)', 'info');
  });

  document.getElementById('micPlayBtn').addEventListener('click', () => {
    if (!mt.audioBlob) return;
    const url = URL.createObjectURL(mt.audioBlob);
    const audio = new Audio(url);
    audio.onended = () => { URL.revokeObjectURL(url); toast('Kayıt dinlendi', 'info'); };
    audio.play().catch(() => { toast('Oynatma hatası', 'error'); });
    toast('Kayıt çalıyor...', 'info');
  });

  document.getElementById('micTestSelect').addEventListener('change', async (e) => {
    const deviceId = e.target.value;
    settings.defaultMic = deviceId;
    saveSettings(settings);
    try {
      if (mt.animFrame) cancelAnimationFrame(mt.animFrame);
      if (mt.loopback) { mt.loopback = false; mt.loopbackGain.gain.value = 0; document.getElementById('micLoopbackBtn').dataset.active = 'false'; }
      if (mt.stream) mt.stream.getTracks().forEach(t => t.stop());
      const s = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: deviceId }, echoCancellation: true, noiseSuppression: noiseToggle.classList.contains('on'), autoGainControl: true } });
      mt.stream = s;
      state.stream = s;
      previewVideo.srcObject = s;
      if (mt.ctx) {
        const src = mt.ctx.createMediaStreamSource(s);
        mt.analyser = mt.ctx.createAnalyser();
        mt.analyser.fftSize = 256;
        src.connect(mt.analyser);
        mt.data = new Uint8Array(mt.analyser.frequencyBinCount);
        mt.loopbackGain = mt.ctx.createGain();
        mt.loopbackGain.gain.value = 0;
        mt.analyser.connect(mt.loopbackGain).connect(mt.ctx.destination);
      }
      updateMicTestInfo();
      drawWaveform();
      updateControls();
      setupAudioMeter();
      toast('Mikrofon değiştirildi', 'info');
    } catch (err) {
      toast('Mikrofon değiştirilemedi: ' + err.message, 'error');
    }
  });

  micSelect.addEventListener('change', () => {
    settings.defaultMic = micSelect.value;
    saveSettings(settings);
    startMedia();
  });
  camSelect.addEventListener('change', () => {
    settings.defaultCam = camSelect.value;
    saveSettings(settings);
    startMedia();
  });
  speakerSelect.addEventListener('change', () => {
    settings.defaultSpeaker = speakerSelect.value;
    saveSettings(settings);
  });

  joinBtn.addEventListener('click', () => {
    const n = (nameInput.value || '').trim();
    if (!n) { toast('Adınızı girin', 'error'); nameInput.focus(); return; }
    localStorage.setItem('bs-name', n);
    saveSettings({
      ...settings,
      joinWithMicOff: startMicOff.classList.contains('on'),
      joinWithCamOff: startCamOff.classList.contains('on'),
      backgroundBlur: state.blur,
      noiseReduction: noiseToggle.classList.contains('on')
    });
    const micOn = state.micOn;
    const camOn = state.camOn;
    if (state.stream) state.stream.getTracks().forEach(t => t.stop());
    const qs = new URLSearchParams({ code, name: n, mic: micOn ? '1' : '0', cam: camOn ? '1' : '0' });
    window.location.href = '/room.html?' + qs.toString();
  });

  startMedia();
})();
