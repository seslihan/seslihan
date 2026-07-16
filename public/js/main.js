(() => {
  const socket = io();
  const nameInput = document.getElementById('name');
  const codeInput = document.getElementById('roomCode');
  const createBtn = document.getElementById('createBtn');
  const joinBtn = document.getElementById('joinBtn');
  const msg = document.getElementById('msg');

  const saved = localStorage.getItem('bs-name');
  if (saved) nameInput.value = saved;
  nameInput.focus();

  function setMsg(text, type) {
    msg.textContent = text;
    msg.className = 'msg ' + (type || '');
  }

  function goToRoom(code) {
    const name = (nameInput.value || '').trim();
    if (!name) {
      setMsg('Lütfen adınızı girin', 'error');
      nameInput.focus();
      return;
    }
    localStorage.setItem('bs-name', name);
    window.location.href = '/room.html?code=' + encodeURIComponent(code) + '&name=' + encodeURIComponent(name);
  }

  createBtn.addEventListener('click', () => {
    createBtn.disabled = true;
    setMsg('Oda oluşturuluyor...', '');
    socket.emit('create-room', (res) => {
      if (res && res.code) goToRoom(res.code);
      else {
        createBtn.disabled = false;
        setMsg('Oda oluşturulamadı', 'error');
      }
    });
  });

  function joinWithCode() {
    const code = (codeInput.value || '').toUpperCase().trim();
    if (!code) {
      setMsg('Oda kodunu girin', 'error');
      codeInput.focus();
      return;
    }
    goToRoom(code);
  }

  joinBtn.addEventListener('click', joinWithCode);
  codeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') joinWithCode();
  });

  const params = new URLSearchParams(window.location.search);
  if (params.get('code')) {
    codeInput.value = params.get('code');
  }
})();
