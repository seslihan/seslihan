(() => {
  const socket = io();
  const newMeetingBtn = document.getElementById('newMeetingBtn');
  const scheduleBtn = document.getElementById('scheduleBtn');
  const newScheduledBtn = document.getElementById('newScheduledBtn');
  const joinForm = document.getElementById('joinForm');
  const roomCodeInput = document.getElementById('roomCode');
  const meetingList = document.getElementById('meetingList');

  function renderMeetings() {
    const list = getMeetings();
    if (list.length === 0) {
      meetingList.innerHTML = '<div class="meeting-list-empty">Henüz planlanmış toplantı yok</div>';
      return;
    }
    meetingList.innerHTML = '';
    list.forEach(m => {
      const item = document.createElement('div');
      item.className = 'meeting-item';
      item.innerHTML =
        '<div class="meeting-item-icon">' +
          '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>' +
        '</div>' +
        '<div class="meeting-item-info">' +
          '<div class="meeting-item-code">' + escapeHtml(m.code) + '</div>' +
          '<div class="meeting-item-time">' + escapeHtml(m.title || 'Adsız toplantı') + ' · ' + escapeHtml(formatDateTime(m.scheduledAt || m.createdAt)) + '</div>' +
        '</div>';
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

  function startMeeting() {
    let name = getUserName();
    if (!name) {
      name = prompt('Adınız:') || '';
      if (!name) return;
      localStorage.setItem('bs-name', name);
    }
    newMeetingBtn.disabled = true;
    socket.emit('create-room', (res) => {
      if (res && res.code) {
        addMeeting({ code: res.code, title: 'Hemen başlatılan toplantı' });
        window.location.href = '/prejoin.html?code=' + encodeURIComponent(res.code) + '&name=' + encodeURIComponent(name);
      } else {
        newMeetingBtn.disabled = false;
        toast('Toplantı oluşturulamadı', 'error');
      }
    });
  }

  newMeetingBtn.addEventListener('click', startMeeting);
  scheduleBtn.addEventListener('click', () => window.location.href = '/schedule.html');
  if (newScheduledBtn) newScheduledBtn.addEventListener('click', () => window.location.href = '/schedule.html');

  joinForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const code = extractRoomCode(roomCodeInput.value);
    if (!code) { toast('Toplantı kodu girin', 'error'); return; }
    let name = getUserName();
    if (!name) {
      name = prompt('Adınız:') || '';
      if (!name) return;
      localStorage.setItem('bs-name', name);
    }
    window.location.href = '/prejoin.html?code=' + encodeURIComponent(code) + '&name=' + encodeURIComponent(name);
  });

  // Pre-fill from URL
  const params = new URLSearchParams(window.location.search);
  const codeParam = params.get('code');
  if (codeParam) roomCodeInput.value = codeParam;

  renderMeetings();
})();
