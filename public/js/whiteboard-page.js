window.pageInitWhiteboard = function () {
  const canvas = document.getElementById('wbCanvas');
  const ctx = canvas ? canvas.getContext('2d') : null;
  const wrap = document.getElementById('wbWrap');
  if (!canvas || !ctx) return;

  let drawing = false;
  let tool = 'pen';
  let wbHistory = [];

  function resize() {
    const rect = wrap.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    redraw();
  }

  function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    wbHistory.forEach(step => {
      ctx.beginPath();
      ctx.strokeStyle = step.color;
      ctx.lineWidth = step.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (step.tool === 'eraser') ctx.globalCompositeOperation = 'destination-out';
      else ctx.globalCompositeOperation = 'source-over';
      step.points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    });
    ctx.globalCompositeOperation = 'source-over';
  }

  function startStroke(e) {
    drawing = true;
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    wbHistory.push({ tool, color: document.getElementById('wbColor').value, size: document.getElementById('wbSize').value, points: [{ x, y }] });
  }

  function drawStroke(e) {
    if (!drawing) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    const last = wbHistory[wbHistory.length - 1];
    last.points.push({ x, y });
    redraw();
  }

  function endStroke() { drawing = false; }

  canvas.addEventListener('mousedown', startStroke);
  canvas.addEventListener('mousemove', drawStroke);
  canvas.addEventListener('mouseup', endStroke);
  canvas.addEventListener('mouseleave', endStroke);
  canvas.addEventListener('touchstart', startStroke, { passive: false });
  canvas.addEventListener('touchmove', drawStroke, { passive: false });
  canvas.addEventListener('touchend', endStroke);

  var wbPen = document.getElementById('wbPen');
  var wbEraser = document.getElementById('wbEraser');
  if (wbPen) wbPen.addEventListener('click', () => { tool = 'pen'; wbPen.classList.add('active'); if(wbEraser) wbEraser.classList.remove('active'); });
  if (wbEraser) wbEraser.addEventListener('click', () => { tool = 'eraser'; wbEraser.classList.add('active'); if(wbPen) wbPen.classList.remove('active'); });
  var wbSize = document.getElementById('wbSize');
  if (wbSize) wbSize.addEventListener('input', (e) => { var lbl = document.getElementById('wbSizeLabel'); if(lbl) lbl.textContent = e.target.value + 'px'; });
  var wbUndo = document.getElementById('wbUndo');
  if (wbUndo) wbUndo.addEventListener('click', () => { wbHistory.pop(); redraw(); });
  var wbClear = document.getElementById('wbClear');
  if (wbClear) wbClear.addEventListener('click', () => { wbHistory = []; redraw(); });
  var wbDownload = document.getElementById('wbDownload');
  if (wbDownload) wbDownload.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'seslihan-tahta-' + Date.now() + '.png';
    link.href = canvas.toDataURL();
    link.click();
  });

  window.addEventListener('resize', resize);
  resize();
};
