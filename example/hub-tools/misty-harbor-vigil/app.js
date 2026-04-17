(() => {
  const canvas = document.getElementById('scene');
  const ctx = canvas.getContext('2d');
  const windEl = document.getElementById('wind');
  const heatEl = document.getElementById('heat');
  const mistEl = document.getElementById('mist');
  const windV = document.getElementById('wind-v');
  const heatV = document.getElementById('heat-v');
  const mistV = document.getElementById('mist-v');
  const ascEl = document.getElementById('ascended');
  const snuffEl = document.getElementById('snuffed');
  const adriftEl = document.getElementById('adrift');
  const omenEl = document.getElementById('omen');

  let W = 0, H = 0, dpr = devicePixelRatio || 1;
  function resize() {
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener('resize', resize); resize();

  const stars = Array.from({ length: 140 }, () => ({
    x: Math.random() * W, y: Math.random() * H * 0.55,
    r: Math.random() * 1.4 + 0.3, phase: Math.random() * 7
  }));
  const boats = Array.from({ length: 6 }, (_, i) => ({
    x: (W / 7) * (i + 1) + (Math.random() - 0.5) * 40,
    bob: Math.random() * 6, hue: 210 + i * 5, size: 40 + Math.random() * 20
  }));
  const lanterns = [];
  const mist = Array.from({ length: 9 }, (_, i) => ({ x: Math.random() * W, y: H * (0.6 + i * 0.04), vx: 0.1 + Math.random() * 0.3 }));

  let ascended = 0, snuffed = 0;

  function wind() { return (+windEl.value) / 40 * 0.7; }
  function heat() { return (+heatEl.value) / 100; }
  function mistA() { return (+mistEl.value) / 100; }

  function updateReadouts() {
    windV.textContent = wind().toFixed(2);
    heatV.textContent = heat().toFixed(2);
    mistV.textContent = (mistA() * 100).toFixed(0) + '%';
    adriftEl.textContent = lanterns.length;
    ascEl.textContent = ascended;
    snuffEl.textContent = snuffed;
    const m = mistA();
    const w = Math.abs(wind());
    omenEl.textContent = w > 0.55 ? 'gale' : m > 0.65 ? 'thick mist' : heat() < 0.6 ? 'cold' : 'serene';
  }

  function releaseLantern(x, y) {
    lanterns.push({
      x, y, vx: (Math.random() - 0.5) * 0.2, vy: -0.6 - Math.random() * 0.4,
      hue: 28 + Math.random() * 20, r: 9 + Math.random() * 4,
      life: 1, snuff: 0
    });
  }

  canvas.addEventListener('click', e => {
    releaseLantern(e.clientX, Math.min(e.clientY, H - 60));
  });
  addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') windEl.value = Math.max(-40, +windEl.value - 2);
    if (e.key === 'ArrowRight') windEl.value = Math.min(40, +windEl.value + 2);
    if (e.key === 'ArrowUp') heatEl.value = Math.min(180, +heatEl.value + 3);
    if (e.key === 'ArrowDown') heatEl.value = Math.max(40, +heatEl.value - 3);
    if (e.key === 'g' || e.key === 'G') gust();
    if (e.key === 'r' || e.key === 'R') reset();
  });
  document.getElementById('gust').addEventListener('click', gust);
  document.getElementById('reset').addEventListener('click', reset);
  function gust() {
    const k = (Math.random() - 0.2) * 3;
    for (const l of lanterns) { l.vx += k * 0.3; l.vy += (Math.random() - 0.7) * 0.4; }
  }
  function reset() { lanterns.length = 0; ascended = 0; snuffed = 0; }

  function drawSky(t) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#06070d');
    g.addColorStop(0.5, '#10141d');
    g.addColorStop(1, '#181e2a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (const s of stars) {
      const a = 0.4 + 0.5 * Math.sin(t / 700 + s.phase);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(210,230,255,${a})`;
      ctx.fill();
    }
  }

  function drawWater(t) {
    const waterY = H * 0.72;
    ctx.fillStyle = '#0b1018';
    ctx.fillRect(0, waterY, W, H - waterY);
    ctx.strokeStyle = 'rgba(110,231,183,.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      const y = waterY + 10 + i * 22;
      for (let x = 0; x <= W; x += 8) {
        const dy = Math.sin((x + t / 8 + i * 50) / 50) * (2 + i * 0.4);
        if (x === 0) ctx.moveTo(x, y + dy);
        else ctx.lineTo(x, y + dy);
      }
      ctx.stroke();
    }
  }

  function drawBoats(t) {
    const waterY = H * 0.72;
    for (const b of boats) {
      const yy = waterY + 6 + Math.sin(t / 900 + b.bob) * 3;
      ctx.save();
      ctx.translate(b.x, yy);
      ctx.fillStyle = '#0a0d14';
      ctx.beginPath();
      ctx.moveTo(-b.size / 2, 0);
      ctx.lineTo(b.size / 2, 0);
      ctx.lineTo(b.size / 3, 12);
      ctx.lineTo(-b.size / 3, 12);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#222634';
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -20);
      ctx.strokeStyle = '#2a2f3c';
      ctx.stroke();
      ctx.fillStyle = 'rgba(110,231,183,.3)';
      ctx.beginPath();
      ctx.arc(0, -22, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function updateLanterns(dt) {
    const w = wind(), h = heat();
    for (let i = lanterns.length - 1; i >= 0; i--) {
      const l = lanterns[i];
      l.vx += w * 0.02 + (Math.random() - 0.5) * 0.02;
      l.vy += -0.015 * h + 0.006;
      l.vx *= 0.995; l.vy *= 0.998;
      l.x += l.vx * dt; l.y += l.vy * dt;
      l.snuff += mistA() * 0.0012;
      if (l.snuff > 0.9 + Math.random() * 0.1) {
        lanterns.splice(i, 1); snuffed++; continue;
      }
      if (l.y < 40) { lanterns.splice(i, 1); ascended++; continue; }
      if (l.x < -20 || l.x > W + 20) { lanterns.splice(i, 1); snuffed++; continue; }
    }
  }

  function drawLanterns() {
    for (const l of lanterns) {
      const flick = 0.75 + Math.random() * 0.25;
      const glow = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 5);
      glow.addColorStop(0, `hsla(${l.hue},80%,65%,${0.55 * flick})`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(l.x - l.r * 5, l.y - l.r * 5, l.r * 10, l.r * 10);
      ctx.beginPath();
      ctx.ellipse(l.x, l.y, l.r * 0.8, l.r, 0, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${l.hue},80%,65%,${flick})`;
      ctx.fill();
      ctx.strokeStyle = 'rgba(40,30,20,.6)'; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(l.x, l.y + l.r);
      ctx.lineTo(l.x, l.y + l.r + 4);
      ctx.strokeStyle = '#1a1208'; ctx.stroke();
    }
  }

  function drawMist(t) {
    const a = mistA();
    if (a <= 0) return;
    for (const m of mist) {
      m.x += m.vx + wind() * 0.2;
      if (m.x > W + 200) m.x = -200;
      if (m.x < -200) m.x = W + 200;
      const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 260);
      g.addColorStop(0, `rgba(180,200,215,${0.09 * a})`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(m.x - 260, m.y - 260, 520, 520);
    }
  }

  let last = performance.now();
  function loop(t) {
    const dt = Math.min(40, t - last); last = t;
    drawSky(t);
    drawWater(t);
    drawBoats(t);
    updateLanterns(dt / 16);
    drawLanterns();
    drawMist(t);
    updateReadouts();
    requestAnimationFrame(loop);
  }
  // seed a few boats with tiny initial lanterns
  for (let i = 0; i < 3; i++) releaseLantern(boats[i].x, H * 0.7);
  requestAnimationFrame(loop);
})();