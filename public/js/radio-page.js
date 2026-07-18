window.pageCleanupRadio = function () {};
window.pageInitRadio = function () {
  const stations = [
    { key: 'powerturk', name: 'PowerTürk FM', genre: 'Pop', url: '/api/radio-proxy?url=' + encodeURIComponent('http://live.powerapp.com.tr/powerturk/mpeg/icecast.audio') },
    { key: 'powerfm', name: 'Power FM', genre: 'Pop', url: '/api/radio-proxy?url=' + encodeURIComponent('http://live.powerapp.com.tr/powerfm/mpeg/icecast.audio') },
    { key: 'superfm', name: 'Süper FM', genre: 'Pop', url: '/api/radio-proxy?url=' + encodeURIComponent('https://playerservices.streamtheworld.com/api/livestream-redirect/SUPER_FM_SC') },
    { key: 'virgin', name: 'Virgin Radio', genre: 'Pop', url: '/api/radio-proxy?url=' + encodeURIComponent('https://playerservices.streamtheworld.com/api/livestream-redirect/VIRGIN_RADIO_SC') },
    { key: 'joyturk', name: 'Joy Türk', genre: 'Slow', url: '/api/radio-proxy?url=' + encodeURIComponent('https://playerservices.streamtheworld.com/api/livestream-redirect/JOY_TURK_SC') },
    { key: 'metro', name: 'Metro FM', genre: 'Yabancı', url: '/api/radio-proxy?url=' + encodeURIComponent('https://playerservices.streamtheworld.com/api/livestream-redirect/METRO_FM_SC') },
    { key: 'fenomen', name: 'Fenomen FM', genre: 'Pop', url: '/api/radio-proxy?url=' + encodeURIComponent('http://live.radyofenomen.com/fenomen/128/icecast.audio') },
    { key: 'kral', name: 'Kral Türk FM', genre: 'Türkçe', url: '/api/radio-proxy?url=' + encodeURIComponent('https://live.radyositesihazir.com/8032/stream') },
    { key: 'radyo7', name: 'Radyo 7', genre: 'Türkçe', url: '/api/radio-proxy?url=' + encodeURIComponent('http://46.20.3.250/;stream') },
    { key: 'ntv', name: 'NTV Radyo', genre: 'Haber', url: '/api/radio-proxy?url=' + encodeURIComponent('http://ntvrdwmp.radyotvonline.com/') },
    { key: '90lar', name: '90\'lar Radyo', genre: 'Nostalji', url: '/api/radio-proxy?url=' + encodeURIComponent('http://37.247.98.8/stream/166/') },
    { key: 'altin', name: 'Altın Şarkılar', genre: 'Nostalji', url: '/api/radio-proxy?url=' + encodeURIComponent('http://37.247.98.8/stream/25/;') },
    { key: 'dinamocaffe', name: 'Dinamo Caffe', genre: 'Lounge', url: '/api/radio-proxy?url=' + encodeURIComponent('http://channels.dinamo.fm/caffe-mp3') },
    { key: 'dinamosleep', name: 'Dinamo Sleep', genre: 'Ambient', url: '/api/radio-proxy?url=' + encodeURIComponent('http://channels.dinamo.fm/sleep-mp3') },
    { key: 'sputnik', name: 'Radyo Sputnik', genre: 'Haber', url: '/api/radio-proxy?url=' + encodeURIComponent('https://icecast-rian.cdnvideo.ru/voicestm') },
    { key: 'viva', name: 'Radyo Viva', genre: 'İstanbul', url: '/api/radio-proxy?url=' + encodeURIComponent('http://46.20.3.231/') },
    { key: 'moda', name: 'Radyo Moda', genre: 'İstanbul', url: '/api/radio-proxy?url=' + encodeURIComponent('http://m.radyomoda.com.tr:8000/stream') },
    { key: 'eksen', name: 'Radyo Eksen', genre: 'İstanbul', url: '/api/radio-proxy?url=' + encodeURIComponent('http://46.20.3.230/') },
    { key: 'alem', name: 'Alem FM', genre: 'İstanbul', url: '/api/radio-proxy?url=' + encodeURIComponent('https://turkmedya.radyotvonline.net/alemfmaac') },
    { key: 'light', name: 'Radyo Light', genre: 'İstanbul', url: '/api/radio-proxy?url=' + encodeURIComponent('https://yayin.radiolight.net:8005/live') },
    { key: 'seyrfm', name: 'Seyr FM', genre: 'İstanbul', url: '/api/radio-proxy?url=' + encodeURIComponent('https://seyrdijital.com/stream') }
  ];

  const grid = document.getElementById('radioGrid');
  if (!grid) return;

  const genreColors = { Pop: '#ff6b6b', Slow: '#48dbfb', Haber: '#feca57', Nostalji: '#ff9ff3', Yabancı: '#54a0ff', Türkçe: '#00d2d3', Lounge: '#5f27cd', Ambient: '#01a3a4', 'İstanbul': '#e17055' };

  function highlightPlaying() {
    grid.querySelectorAll('.radio-card').forEach(c => c.classList.remove('playing'));
    const st = localStorage.getItem('bs-radio');
    if (st) {
      try {
        const rs = JSON.parse(st);
        if (rs.playing) {
          const card = grid.querySelector('[data-key="' + rs.key + '"]');
          if (card) card.classList.add('playing');
        }
      } catch(_){}
    }
  }

  grid.innerHTML = '';
  stations.forEach(st => {
    const card = document.createElement('div');
    card.className = 'radio-card';
    card.dataset.key = st.key;
    const gc = genreColors[st.genre] || '#888';
    card.innerHTML = '<div class="radio-card-genre" style="color:' + gc + '">' + st.genre + '</div><div class="radio-card-name">' + st.name + '</div>';
    card.addEventListener('click', () => {
      const current = localStorage.getItem('bs-radio');
      let isPlaying = false;
      try { const rs = JSON.parse(current); isPlaying = rs && rs.playing && rs.key === st.key; } catch(_){}
      if (isPlaying) {
        radioStop();
      } else {
        radioPlay(st.url, st.name, 0.5);
        try {
          const rs = JSON.parse(localStorage.getItem('bs-radio') || '{}');
          rs.key = st.key;
          localStorage.setItem('bs-radio', JSON.stringify(rs));
        } catch(_){}
      }
      highlightPlaying();
    });
    grid.appendChild(card);
  });

  highlightPlaying();
};
