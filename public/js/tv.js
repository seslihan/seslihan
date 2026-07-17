window.pageInitTV = function () {
  const channels = [
    { id: 'cnnturk', name: 'CNN Türk', handle: '@CNNTurk', cid: 'UCV6zcRug6Hqp1UX_FdyUeBg', color: '#e30a17' },
    { id: 'trthaber', name: 'TRT Haber', handle: '@trthaber', cid: 'UCBgTP2LOFVPmq15W-RH-WXA', color: '#003399' },
    { id: 'haberturk', name: 'Habertürk TV', handle: '@haberturktv', cid: 'UCn6dNfiRE_Xunu7iMyvD7AA', color: '#e4002b' },
    { id: 'ntv', name: 'NTV', handle: '@ntv', cid: 'UCGMghpDmBAqhz2p7eLHX-eg', color: '#c8102e' },
    { id: 'showtv', name: 'Show TV', handle: '@showtv', cid: 'UC9JMe_We017gYrRc7kZHgmg', color: '#0066cc' },
    { id: 'ahaber', name: 'A Haber', handle: '@ahaber', cid: 'UCKQhfw-lzz0uKnE1fY1PsAA', color: '#c8102e' },
    { id: 'tv8', name: 'TV8', handle: '@tv8', cid: 'UCp4N3g1zcvp8WE2qJ_JKqBg', color: '#6c2dc7' },
    { id: '24tv', name: '24 TV', handle: '@24TV', cid: 'UCN7VYCsI4Lx1-J4_BtjoWUA', color: '#003366' }
  ];

  const grid = document.getElementById('tvGrid');
  const player = document.getElementById('tvPlayer');
  const container = document.getElementById('tvPlayerContainer');
  const channelName = document.getElementById('tvChannelName');
  if (!grid) return;

  grid.innerHTML = '';
  channels.forEach(ch => {
    const card = document.createElement('div');
    card.className = 'tv-card';
    card.innerHTML = '<div class="tv-card-color" style="background:' + ch.color + '"></div><div class="tv-card-name">' + ch.name + '</div>';
    card.addEventListener('click', () => loadChannel(ch));
    grid.appendChild(card);
  });

  function loadChannel(ch) {
    channelName.textContent = ch.name;
    player.hidden = false;
    container.innerHTML = '<div class="tv-loading">Yükleniyor...</div>';
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
  }

  document.getElementById('tvClose').addEventListener('click', () => {
    player.hidden = true;
    container.innerHTML = '';
  });
};
