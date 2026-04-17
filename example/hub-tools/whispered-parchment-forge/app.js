(() => {
  const secret = document.getElementById('secret');
  const nInput = document.getElementById('n');
  const jInput = document.getElementById('j');
  const forgeBtn = document.getElementById('forge');
  const exportBtn = document.getElementById('export');
  const cname = document.getElementById('cname');
  const svg = document.getElementById('parchment');
  const recipeEl = document.getElementById('recipe');
  const histEl = document.getElementById('hist');
  const history = [];

  function hashSeed(s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h;
  }
  function rngFrom(seed) {
    let s = seed | 0 || 1;
    return () => {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
      return ((s >>> 0) % 100000) / 100000;
    };
  }

  const ROOTS = ['Ash','Yarn','Vesper','Orin','Marrow','Bram','Kestrel','Loom','Ember','Myrrh','Thistle','Quill','Vellum','Slate'];
  const EPITHETS = ['of the Wandering Eye','of Seven Whispers','the Unnamed','of Broken Compass','of Silver Ink','of Hollow Parchment','the Incomplete','of Tethered Stars'];

  function deriveName(seed) {
    const rng = rngFrom(seed);
    const a = ROOTS[Math.floor(rng() * ROOTS.length)];
    const e = EPITHETS[Math.floor(rng() * EPITHETS.length)];
    return `${a} ${e}`;
  }

  function forge() {
    const txt = (secret.value || 'anonymous whisper').trim();
    if (!txt) return;
    const seed = hashSeed(txt);
    const n = Math.max(3, Math.min(24, +nInput.value || 9));
    const jitter = +jInput.value / 100;
    const rng = rngFrom(seed);
    const stars = [];
    const cx = 200, cy = 200, rMax = 160;
    const arms = 2 + (seed % 3);
    for (let i = 0; i < n; i++) {
      const arm = i % arms;
      const t = i / n;
      const angle = (arm / arms) * Math.PI * 2 + t * Math.PI * 0.8 + (rng() - 0.5) * jitter;
      const r = 40 + t * (rMax - 40) + (rng() - 0.5) * 30 * jitter;
      stars.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r, mag: 1 + rng() * 2.2 });
    }
    const autoName = deriveName(seed);
    if (cname.value === 'Untitled' || cname.dataset.auto === '1') {
      cname.value = autoName;
      cname.dataset.auto = '1';
    }
    render(stars);
    emitRecipe(stars, txt, seed);
    const entry = { name: cname.value, at: new Date(), seed, n, stars };
    history.unshift(entry);
    renderHistory();
  }

  function render(stars) {
    svg.innerHTML = '';
    const border = el('rect', { x: 6, y: 6, width: 388, height: 388, rx: 8, fill: 'none', stroke: '#3a3020', 'stroke-width': 1, 'stroke-dasharray': '3 4' });
    svg.appendChild(border);
    for (let i = 0; i < stars.length - 1; i++) {
      svg.appendChild(el('line', {
        x1: stars[i].x, y1: stars[i].y,
        x2: stars[i+1].x, y2: stars[i+1].y,
        stroke: '#6ee7b7', 'stroke-opacity': 0.55, 'stroke-width': 0.8, 'stroke-dasharray': '4 3'
      }));
    }
    stars.forEach((s, i) => {
      svg.appendChild(el('circle', { cx: s.x, cy: s.y, r: s.mag, fill: '#d9c8a0' }));
      svg.appendChild(el('circle', { cx: s.x, cy: s.y, r: s.mag + 4, fill: '#d9c8a0', 'fill-opacity': 0.08 }));
      svg.appendChild(el('text', {
        x: s.x + 7, y: s.y - 6, 'font-size': 8, fill: '#6ee7b7', 'font-family': 'Georgia'
      }, String(i+1)));
    });
    const t = el('text', { x: 200, y: 30, 'text-anchor': 'middle', 'font-size': 14, fill: '#6ee7b7', 'font-family': 'Georgia', 'font-style': 'italic' }, cname.value);
    svg.appendChild(t);
  }

  function emitRecipe(stars, src, seed) {
    const preview = src.length > 80 ? src.slice(0, 77) + '...' : src;
    const lines = [];
    lines.push(`# ${cname.value}`);
    lines.push(`seed: 0x${seed.toString(16).padStart(8,'0')}`);
    lines.push(`whisper: ${preview}`);
    lines.push(`stars: ${stars.length}`);
    stars.forEach((s, i) => {
      lines.push(`  ${String(i+1).padStart(2,'0')}. (${s.x.toFixed(1)}, ${s.y.toFixed(1)}) mag=${s.mag.toFixed(2)}`);
    });
    recipeEl.textContent = lines.join('\n');
  }

  function renderHistory() {
    histEl.innerHTML = '';
    history.slice(0, 40).forEach((h, idx) => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="nm">${h.name}</span><span class="t">${h.at.toLocaleTimeString()} · seed 0x${h.seed.toString(16).slice(-6)}</span>`;
      li.addEventListener('click', () => {
        cname.value = h.name;
        cname.dataset.auto = '0';
        render(h.stars);
        emitRecipe(h.stars, '(recalled)', h.seed);
      });
      histEl.appendChild(li);
    });
  }

  function el(tag, attrs = {}, text) {
    const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }

  function exportSvg() {
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (cname.value || 'constellation').replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.svg';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  forgeBtn.addEventListener('click', forge);
  exportBtn.addEventListener('click', exportSvg);
  cname.addEventListener('input', () => { cname.dataset.auto = '0'; });
  secret.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); forge(); }
  });

  secret.value = 'Wandering cartographers stitched forgotten constellations into parchment maps while silver comets traced whispered secrets overhead.';
  forge();
})();