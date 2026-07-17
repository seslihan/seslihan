window.pageInitStock = function () {
  const grid = document.getElementById('stockGrid');
  const timeEl = document.getElementById('stockTime');
  if (!grid) return;

  function fetchStock() {
    grid.innerHTML = '<div class="stock-loading">Veriler yükleniyor...</div>';
    fetch('/api/stock').then(r => r.json()).then(data => {
      if (!data.items || data.items.length === 0) {
        grid.innerHTML = '<div class="stock-loading">Veri bulunamadı</div>';
        return;
      }
      grid.innerHTML = '';
      data.items.forEach(item => {
        const card = document.createElement('div');
        const cls = item.chg > 0 ? 'stock-up' : item.chg < 0 ? 'stock-down' : 'stock-flat';
        const arrow = item.chg > 0 ? '▲' : item.chg < 0 ? '▼' : '—';
        const val = typeof item.val === 'number' ? item.val.toLocaleString('tr-TR', { maximumFractionDigits: 2 }) : item.val;
        card.className = 'stock-card ' + cls;
        card.innerHTML = '<div class="stock-sym">' + item.sym + '</div><div class="stock-val">' + val + '</div><div class="stock-chg">' + arrow + ' ' + Math.abs(item.chg).toFixed(2) + '%</div>';
        grid.appendChild(card);
      });
      if (data.time) {
        const t = new Date(data.time);
        timeEl.textContent = 'Son güncelleme: ' + t.toLocaleTimeString('tr-TR');
      }
    }).catch(() => {
      grid.innerHTML = '<div class="stock-loading">Veriler yüklenemedi</div>';
    });
  }

  fetchStock();
  var btn = document.getElementById('refreshBtn');
  if (btn) btn.addEventListener('click', fetchStock);
  window._stockInterval = setInterval(fetchStock, 15000);
};
