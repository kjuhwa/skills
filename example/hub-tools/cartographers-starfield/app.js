(() => {
  const sky = document.getElementById('sky');
  const ctx = sky.getContext('2d');
  const lines = document.getElementById('lines');
  const coord = document.getElementById('coord');
  const namingBox = document.getElementById('naming');
  const nameInput = document.getElementById('const-name');
  const constList = document.getElementById('const-list');
  const search = document.getElementById('search');
  const bloomEl = document.getElementById('bloom');
  const starCountEl = document.getElementById('star-count');
  const constCountEl = document.getElementById('const-count');
  const bloomSetEl = document.getElementById('bloom-set');

  const BLOOM_SIZE = 128;
  const bloom = new Uint8Array(BLOOM_SIZE);
  for (let i = 0; i < BLOOM_SIZE; i++) {
    const c = document.createElement('div');
    c.className = 'cell';
    bloomEl.appendChild(c);
  }
  const bloomCells = [...bloomEl.children];

  const SEED_NAMES = [
    'The Paper Lantern', 'Sleeping Fisher', 'Misty Helmsman', 'Forgotten Oar',
    'Weathered Compass', 'Harbor Moth', 'Driftwood Scribe', 'Lantern Ghost',
    'The Unmoored Boat', 'Cartographer\'s Eye'
  ];

  let stars = [];
  let constellations = [];
  let current = { star_ids: [], hoverMatch: null };

  function hash(s, salt) {
    let h = 2166136261 ^ salt;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0) % BLOOM_SIZE;
  }
  const hashes = (s) => [hash(s, 7), hash(s, 131), hash(s, 2557)];
  function bloomAdd(name) {
    hashes(name.toLowerCase()).forEach(i => bloom[i] = 1);
  }
  function bloomMatch(q) {
    if (!q) return { has: false, bits: [] };
    const bits = hashes(q.toLowerCase());
    return { has: bits.every(b => bloom[b] === 1), bits };
  }
  function renderBloom(matchBits = []) {
    let on = 0;
    for (let i = 0; i < BLOOM_SIZE; i++) {
      const cell = bloomCells[i];
      cell.classList.remove('match');
      if (bloom[i]) { cell.classList.add('on'); on++; }
      else cell.classList.remove('on');
    }
    matchBits.forEach(b => bloomCells[b].classList.add('match'));
    bloomSetEl.textContent = on;
  }

  function resize() {
    const r = sky.getBoundingClientRect();
    sky.width = r.width; sky.height = r.height;
    lines.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
  }
  window.addEventListener('resize', resize);

  function genStars() {
    const { width: w, height: h } = sky;
    const n = Math.floor(w * h / 2600);
    stars = Array.from({ length: n }, (_, i) => ({
      id: i,
      x: Math.random() * w,
      y: Math.random() * h,
      mag: Math.pow(Math.random(), 3) * 2.8 + 0.3,
      hue: 195 + Math.random() * 60,
      twinkle: Math.random() * Math.PI * 2
    }));
    starCountEl.textContent = n;
  }

  function drawSky(t) {
    ctx.fillStyle = '#0a0c12';
    ctx.fillRect(0, 0, sky.width, sky.height);
    const g = ctx.createRadialGradient(sky.width*.3, sky.height*.8, 0, sky.width*.3, sky.height*.8, sky.width*.6);
    g.addColorStop(0, 'rgba(110,231,183,.05)');
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, sky.width, sky.height);

    for (const s of stars) {
      const shimmer = 0.75 + Math.sin(t / 900 + s.twinkle) * 0.25;
      const r = s.mag * shimmer;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${s.hue},70%,80%,${0.35 + shimmer*0.5})`;
      ctx.fill();
      if (s.mag > 1.6) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${s.hue},80%,70%,0.08)`;
        ctx.fill();
      }
    }
    for (const id of current.star_ids) {
      const s = stars[id]; if (!s) continue;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 6, 0, Math.PI * 2);
      ctx.strokeStyle = '#6ee7b7';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  function drawLines() {
    lines.innerHTML = '';
    const ns = 'http://www.w3.org/2000/svg';
    for (const c of constellations) {
      for (let i = 1; i < c.star_ids.length; i++) {
        const a = stars[c.star_ids[i-1]], b = stars[c.star_ids[i]];
        if (!a || !b) continue;
        const line = document.createElementNS(ns, 'line');
        line.setAttribute('x1', a.x); line.setAttribute('y1', a.y);
        line.setAttribute('x2', b.x); line.setAttribute('y2', b.y);
        line.setAttribute('stroke', c.id === current.hoverMatch ? '#6ee7b7' : '#3b7a63');
        line.setAttribute('stroke-width', c.id === current.hoverMatch ? 1.6 : 0.8);
        line.setAttribute('opacity', c.id === current.hoverMatch ? 0.9 : 0.55);
        lines.appendChild(line);
      }
    }
    for (let i = 1; i < current.star_ids.length; i++) {
      const a = stars[current.star_ids[i-1]], b = stars[current.star_ids[i]];
      const line = document.createElementNS(ns, 'line');
      line.setAttribute('x1', a.x); line.setAttribute('y1', a.y);
      line.setAttribute('x2', b.x); line.setAttribute('y2', b.y);
      line.setAttribute('stroke', '#6ee7b7'); line.setAttribute('stroke-width', '1.4');
      line.setAttribute('stroke-dasharray', '3 3');
      lines.appendChild(line);
    }
  }

  function nearestStar(x, y) {
    let best = null, bestD = 26 * 26;
    for (const s of stars) {
      const d = (s.x - x) ** 2 + (s.y - y) ** 2;
      if (d < bestD) { bestD = d; best = s; }
    }
    return best;
  }

  sky.addEventListener('click', e => {
    const r = sky.getBoundingClientRect();
    const s = nearestStar(e.clientX - r.left, e.clientY - r.top);
    if (!s) return;
    if (current.star_ids.at(-1) === s.id) return;
    current.star_ids.push(s.id);
  });
  sky.addEventListener('mousemove', e => {
    const r = sky.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const lat = (1 - y / sky.height) * 90 - 45;
    const lon = (x / sky.width) * 360 - 180;
    coord.textContent = `lat ${lat.toFixed(1)}°, lon ${lon.toFixed(1)}°`;
  });

  function openNaming() {
    if (current.star_ids.length < 2) return;
    namingBox.hidden = false;
    nameInput.value = '';
    nameInput.focus();
  }
  function closeNaming() { namingBox.hidden = true; }
  function saveConst() {
    const name = nameInput.value.trim() || `Untitled ${constellations.length + 1}`;
    const id = Date.now();
    constellations.push({ id, name, star_ids: current.star_ids.slice() });
    bloomAdd(name);
    current.star_ids = [];
    closeNaming();
    renderList();
  }

  function renderList() {
    const q = search.value.trim();
    const { bits } = bloomMatch(q);
    renderBloom(bits);
    constList.innerHTML = '';
    const ql = q.toLowerCase();
    const filtered = constellations.filter(c => !ql || c.name.toLowerCase().includes(ql));
    constCountEl.textContent = constellations.length;
    for (const c of filtered) {
      const li = document.createElement('li');
      li.classList.toggle('hit', ql && c.name.toLowerCase().includes(ql));
      li.innerHTML = `<span>${c.name}</span><span class="ct">${c.star_ids.length}★</span>`;
      li.addEventListener('mouseenter', () => { current.hoverMatch = c.id; });
      li.addEventListener('mouseleave', () => { current.hoverMatch = null; });
      constList.appendChild(li);
    }
  }

  document.getElementById('btn-new').addEventListener('click', () => { current.star_ids = []; });
  document.getElementById('btn-save').addEventListener('click', openNaming);
  document.getElementById('btn-clear').addEventListener('click', () => { current.star_ids = []; });
  document.getElementById('btn-regen').addEventListener('click', () => { genStars(); });
  document.getElementById('confirm-name').addEventListener('click', saveConst);
  document.getElementById('cancel-name').addEventListener('click', closeNaming);
  search.addEventListener('input', renderList);
  nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') saveConst(); if (e.key === 'Escape') closeNaming(); });
  window.addEventListener('keydown', e => {
    if (document.activeElement.tagName === 'INPUT') return;
    if (e.key === 'n' || e.key === 'N') current.star_ids = [];
    if (e.key === 'c' || e.key === 'C') current.star_ids = [];
    if (e.key === 'r' || e.key === 'R') genStars();
    if (e.key === 'Enter') openNaming();
  });

  resize();
  genStars();
  SEED_NAMES.forEach((n, i) => {
    bloomAdd(n);
    const picks = [];
    for (let k = 0; k < 3 + (i % 3); k++) picks.push(Math.floor(Math.random() * stars.length));
    constellations.push({ id: Date.now() + i, name: n, star_ids: picks });
  });
  renderList();

  function tick(t) { drawSky(t); drawLines(); requestAnimationFrame(tick); }
  requestAnimationFrame(tick);
})();