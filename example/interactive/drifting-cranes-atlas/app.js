(() => {
  const $ = id => document.getElementById(id);
  const sky = $('sky'), overlay = $('overlay'), ctx = sky.getContext('2d');
  const spark = $('spark'), sctx = spark.getContext('2d');
  const seedEl = $('seed'), tideEl = $('tide'), densityEl = $('density');
  const queueEl = $('queue'), logEl = $('log'), ring = $('ring');
  const dlg = $('lullaby'), lbTitle = $('lb-title'), lbBody = $('lb-body');

  // fnv1a + xorshift32: text-to-procedural-seed
  function fnv1a(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function xors(seed) { let s = seed | 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) / 4294967296); }; }

  // Sizing with devicepixel rescale awareness
  function fit() {
    for (const c of [sky, spark]) {
      const r = c.getBoundingClientRect(), dpr = devicePixelRatio || 1;
      c.width = r.width * dpr; c.height = r.height * dpr;
      c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }
  window.addEventListener('resize', () => { fit(); paintHorizon(); });

  const WORDS = ['silver','crane','lullaby','fox','mountain','bell','river','paper','dream','ember','moon','mist','willow','koi','pine','whisper','drift','hush'];
  let state = null;

  function build() {
    const seed = fnv1a(seedEl.value);
    const rand = xors(seed);
    const N = +densityEl.value;
    const cranes = Array.from({length: N}, (_, i) => ({
      id: i, hue: Math.floor(rand() * 360), x: rand(), y: 0.25 + rand() * 0.5,
      phase: rand() * Math.PI * 2, speed: 0.06 + rand() * 0.1, size: 14 + rand() * 10,
      lullaby: makeLullaby(rand, i),
      state: 'DRIFT', // FSM: DRIFT -> RING -> FADE
      attempts: 0,
    }));
    const bells = Array.from({length: 8}, (_, i) => ({
      id: i, angle: (i / 8) * Math.PI * 2, active: false, hash: Math.floor(rand() * 1e4),
    }));
    state = { rand, cranes, bells, t: 0, tide: [], pressureHist: [], lag: 0, circuit: 'CLOSED', fail: 0 };
    renderRing(); renderQueue(); log('seed', seedEl.value, '·', N, 'cranes');
  }

  function makeLullaby(rand, i) {
    // byte-aware-truncation aware: keep lines short
    const L = 4 + Math.floor(rand() * 3);
    const lines = [];
    for (let k = 0; k < L; k++) {
      const a = WORDS[Math.floor(rand() * WORDS.length)];
      const b = WORDS[Math.floor(rand() * WORDS.length)];
      const c = WORDS[Math.floor(rand() * WORDS.length)];
      lines.push(`  ${a} ${b}, ${c}…`);
    }
    return lines.join('\n');
  }

  // Horizon: parallax sine silhouette layers + river
  function paintHorizon() {
    const w = sky.clientWidth, h = sky.clientHeight;
    ctx.clearRect(0, 0, w, h);
    // moon
    ctx.fillStyle = 'rgba(230,236,255,0.18)';
    ctx.beginPath(); ctx.arc(w * 0.78, h * 0.18, 50, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(230,236,255,0.9)';
    ctx.beginPath(); ctx.arc(w * 0.78, h * 0.18, 28, 0, 6.283); ctx.fill();
    // mountain layers (3) — incommensurate sines, decreasing opacity
    const layers = 3;
    for (let L = 0; L < layers; L++) {
      const base = h * (0.55 + L * 0.05);
      ctx.fillStyle = `rgba(${40 + L * 14},${48 + L * 12},${70 + L * 10},${0.85 - L * 0.22})`;
      ctx.beginPath(); ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 6) {
        const y = base
          - Math.sin(x * 0.008 + L * 1.7) * (30 + L * 10)
          - Math.sin(x * 0.021 + L * 0.6) * (12 + L * 4)
          - Math.sin(x * 0.003 + L * 2.9) * (20);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
    }
    // river band
    const rg = ctx.createLinearGradient(0, h * 0.7, 0, h);
    rg.addColorStop(0, 'rgba(59,77,104,0.85)');
    rg.addColorStop(1, 'rgba(12,15,23,1)');
    ctx.fillStyle = rg; ctx.fillRect(0, h * 0.7, w, h * 0.3);
  }

  function drawCrane(c, w, h) {
    const x = ((c.x + state.t * c.speed) % 1) * w;
    const flicker = Math.sin(state.t * 2 + c.phase) * 0.5 + Math.sin(state.t * 1.17 + c.phase * 1.3) * 0.5;
    const y = c.y * h * 0.7 + flicker * 6;
    const s = c.size;
    ctx.save(); ctx.translate(x, y);
    // glow
    const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 1.8);
    halo.addColorStop(0, `hsla(${c.hue},60%,75%,0.55)`);
    halo.addColorStop(1, 'hsla(0,0%,0%,0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, 0, s * 1.8, 0, 6.283); ctx.fill();
    // origami: two triangles
    const wing = (Math.sin(state.t * 3 + c.phase) * 0.35 + 0.65);
    ctx.fillStyle = `hsla(${c.hue},40%,80%,0.95)`;
    ctx.strokeStyle = `hsla(${c.hue},40%,50%,1)`; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-s, 0); ctx.lineTo(0, -s * wing); ctx.lineTo(s, 0); ctx.lineTo(0, s * 0.3); ctx.closePath();
    ctx.fill(); ctx.stroke();
    // reflection on river
    if (y < h * 0.7) {
      const ry = h * 0.7 + (h * 0.7 - y) * 0.4;
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = `hsl(${c.hue},40%,80%)`;
      ctx.beginPath(); ctx.ellipse(x - (x - x), ry, s * 0.8, 2, 0, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    return { x, y };
  }

  // Sleeping fox silhouette — bottom-left
  function drawFox(w, h) {
    ctx.save();
    const x = w * 0.08, y = h * 0.82;
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(246,193,119,0.75)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 48, 14, 0, 0, 6.283); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-48, 0); ctx.quadraticCurveTo(-80, -10, -70, 8); ctx.quadraticCurveTo(-56, 6, -48, 0); ctx.fill();
    // ear
    ctx.beginPath(); ctx.moveTo(-40, -10); ctx.lineTo(-32, -22); ctx.lineTo(-26, -8); ctx.fill();
    // Zzz (dream bubbles) — CDC-style change event markers
    ctx.fillStyle = 'rgba(110,231,183,0.7)';
    ctx.font = '11px ui-monospace, monospace';
    const z = (Math.sin(state.t * 1.3) * 0.5 + 0.5);
    ctx.fillText('z', -10 - z * 6, -22 - z * 8);
    ctx.fillText('Z', 6 + z * 4, -36 - z * 14);
    ctx.restore();
  }

  function renderRing() {
    ring.innerHTML = '';
    // consistent-hashing ring: bells as nodes, path connects adjacent
    const R = 90;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    path.setAttribute('cx', 0); path.setAttribute('cy', 0); path.setAttribute('r', R);
    path.setAttribute('fill', 'none'); path.setAttribute('stroke', '#2a3144'); path.setAttribute('stroke-dasharray', '3 3');
    ring.appendChild(path);
    state.bells.forEach(b => {
      const cx = Math.cos(b.angle) * R, cy = Math.sin(b.angle) * R;
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', 8);
      c.setAttribute('class', 'node' + (b.active ? ' active' : ''));
      c.dataset.id = b.id; ring.appendChild(c);
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', cx * 1.22); t.setAttribute('y', cy * 1.22 + 3);
      t.textContent = '#' + b.hash.toString(16);
      ring.appendChild(t);
    });
  }
  function pulseBell() {
    const i = Math.floor(state.rand() * state.bells.length);
    state.bells.forEach(b => b.active = false);
    state.bells[i].active = true;
    renderRing();
    setTimeout(() => { state.bells[i].active = false; renderRing(); }, 700);
  }

  function renderQueue() {
    queueEl.innerHTML = '';
    state.cranes.slice(0, 10).forEach(c => {
      const li = document.createElement('li');
      li.textContent = `#${String(c.id).padStart(2,'0')}  ${c.state}  h${c.hue}`;
      li.onclick = () => openLullaby(c);
      queueEl.appendChild(li);
    });
  }

  function openLullaby(c) {
    lbTitle.textContent = `Crane #${c.id} · hue ${c.hue}°`;
    lbBody.textContent = c.lullaby;
    dlg.showModal();
    pulseBell();
    log('open', 'lullaby', c.id);
  }

  function log(...parts) {
    const li = document.createElement('li');
    const t = new Date().toLocaleTimeString();
    li.innerHTML = `<b>${t}</b>  ${parts.join(' ')}`;
    logEl.prepend(li);
    while (logEl.children.length > 40) logEl.lastChild.remove();
  }

  // pointer hit-test with devicepixel rescale
  sky.addEventListener('click', ev => {
    const r = sky.getBoundingClientRect();
    const px = (ev.clientX - r.left) * (sky.width / r.width);
    const py = (ev.clientY - r.top) * (sky.height / r.height);
    const dpr = devicePixelRatio || 1;
    const w = sky.clientWidth, h = sky.clientHeight;
    let best = null, bd = Infinity;
    for (const c of state.cranes) {
      const x = ((c.x + state.t * c.speed) % 1) * w;
      const y = c.y * h * 0.7;
      const d = Math.hypot(px / dpr - x, py / dpr - y);
      if (d < bd) { bd = d; best = c; }
    }
    if (best && bd < 40) openLullaby(best);
  });

  // Spark: time-series tide chart with rate limiter + circuit breaker overlay
  function drawSpark() {
    const w = spark.clientWidth, h = spark.clientHeight;
    sctx.clearRect(0, 0, w, h);
    const arr = state.tide;
    const max = Math.max(1, ...arr);
    sctx.strokeStyle = 'rgba(110,231,183,0.8)'; sctx.lineWidth = 1.2;
    sctx.beginPath();
    arr.forEach((v, i) => {
      const x = (i / 60) * w, y = h - (v / max) * (h - 4) - 2;
      i === 0 ? sctx.moveTo(x, y) : sctx.lineTo(x, y);
    });
    sctx.stroke();
    // backpressure band
    sctx.fillStyle = 'rgba(246,193,119,0.15)';
    sctx.fillRect(0, 0, w, 4);
    // circuit indicator
    sctx.fillStyle = state.circuit === 'OPEN' ? '#f87171' : state.circuit === 'HALF' ? '#f6c177' : '#6ee7b7';
    sctx.fillRect(w - 6, 2, 4, h - 4);
  }

  // FSM tick: DRIFT -> RING (near bell) -> FADE
  function tickFsm() {
    state.cranes.forEach(c => {
      const w = sky.clientWidth;
      const x = ((c.x + state.t * c.speed) % 1) * w;
      if (c.state === 'DRIFT' && x > w * 0.45 && x < w * 0.55 && state.rand() < 0.04) {
        c.state = 'RING'; pulseBell(); log('ring', 'crane', c.id);
      } else if (c.state === 'RING' && state.rand() < 0.1) {
        c.state = 'DRIFT';
      }
    });
  }

  // circuit breaker: opens under pressure spikes, half-opens after cooldown
  let cbCooldown = 0;
  function tickCb() {
    const p = state.pressureHist.at(-1) || 0;
    if (state.circuit === 'CLOSED' && p > 0.85) {
      state.fail++;
      if (state.fail >= 3) { state.circuit = 'OPEN'; cbCooldown = 120; log('circuit', 'OPEN'); }
    } else if (state.circuit === 'OPEN') {
      if (--cbCooldown <= 0) { state.circuit = 'HALF'; log('circuit', 'HALF'); }
    } else if (state.circuit === 'HALF' && p < 0.5) {
      state.circuit = 'CLOSED'; state.fail = 0; log('circuit', 'CLOSED');
    }
  }

  function loop() {
    const dt = (+tideEl.value) / 1000;
    state.t += dt;
    const w = sky.clientWidth, h = sky.clientHeight;
    paintHorizon(); drawFox(w, h);
    state.cranes.forEach(c => drawCrane(c, w, h));
    tickFsm();
    // tide timeline + pressure (rate-limiter-style token bucket proxy)
    const tideNow = (Math.sin(state.t * 0.6) * 0.5 + 0.5) * 80 + 10;
    const pressure = Math.min(1, state.cranes.filter(c => c.state === 'RING').length / Math.max(1, state.cranes.length / 2));
    state.tide.push(tideNow); if (state.tide.length > 60) state.tide.shift();
    state.pressureHist.push(pressure); if (state.pressureHist.length > 60) state.pressureHist.shift();
    state.lag = Math.round(pressure * 1200 + (state.rand() * 80));
    tickCb();
    drawSpark();
    $('g-tide').textContent = tideNow.toFixed(1);
    $('g-lag').textContent = state.lag + 'ms';
    $('g-circuit').textContent = state.circuit;
    $('g-pressure').textContent = (pressure * 100).toFixed(0) + '%';
    renderQueue();
    requestAnimationFrame(loop);
  }

  $('reseed').onclick = build;
  seedEl.onchange = build;
  densityEl.onchange = build;

  fit(); build(); loop();
})();