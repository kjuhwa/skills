const canvas = document.getElementById('sky');
const ctx = canvas.getContext('2d');
const detail = document.getElementById('detail');
const regionsEl = document.getElementById('regions');

const REGIONS = [
  { id: 'pingxi', label: 'Pingxi', color: '#fcd34d' },
  { id: 'hoian', label: 'Hoi An', color: '#fb7185' },
  { id: 'chiangmai', label: 'Chiang Mai', color: '#a78bfa' },
  { id: 'kyoto', label: 'Kyoto', color: '#60a5fa' },
];
const WISHES = [
  'safe passage home', 'a bountiful harvest', 'my grandmother heals',
  'courage tomorrow', 'a gentle winter', 'my sister finds love',
  'forgiveness given', 'the fever breaks', 'a child laughs again',
  'the river returns', 'quiet minds', 'stories passed on',
  'honest work', 'a letter arrives', 'morning without war',
];

let lanterns = [];
let activeRegions = new Set(REGIONS.map(r => r.id));
let selected = null;
let offsetX = 0, offsetY = 0, scale = 1;
let dragging = false, dragStart = null;

function resize() {
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
}
new ResizeObserver(resize).observe(canvas);

function seed() {
  lanterns = [];
  REGIONS.forEach((r, idx) => {
    const cx = (idx % 2 === 0 ? -300 : 300) + (idx < 2 ? -150 : 200);
    const cy = (idx < 2 ? -180 : 180);
    for (let i = 0; i < 28; i++) {
      const a = Math.random() * Math.PI * 2;
      const rad = 60 + Math.random() * 180;
      lanterns.push({
        region: r.id,
        color: r.color,
        x: cx + Math.cos(a) * rad + (Math.random() - 0.5) * 40,
        y: cy + Math.sin(a) * rad + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -0.05 - Math.random() * 0.08,
        size: 2 + Math.random() * 3,
        phase: Math.random() * Math.PI * 2,
        wish: WISHES[Math.floor(Math.random() * WISHES.length)],
        id: Math.random().toString(36).slice(2, 7),
      });
    }
  });
}

function draw() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(w / 2 + offsetX, h / 2 + offsetY);
  ctx.scale(scale, scale);

  // Background stars
  for (let i = 0; i < 80; i++) {
    const sx = ((i * 137) % w) - w / 2;
    const sy = ((i * 241) % h) - h / 2;
    ctx.fillStyle = `rgba(200,210,230,${0.2 + 0.3 * Math.sin(Date.now() / 800 + i)})`;
    ctx.fillRect(sx, sy, 1, 1);
  }

  // Constellation lines between nearby active lanterns
  const visible = lanterns.filter(l => activeRegions.has(l.region));
  ctx.lineWidth = 0.5;
  for (let i = 0; i < visible.length; i++) {
    for (let j = i + 1; j < visible.length; j++) {
      const a = visible[i], b = visible[j];
      if (a.region !== b.region) continue;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < 70) {
        ctx.strokeStyle = `${a.color}22`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  // Lanterns
  visible.forEach(l => {
    l.x += l.vx; l.y += l.vy; l.phase += 0.04;
    if (l.y < -400) l.y = 400;
    const glow = 0.6 + 0.4 * Math.sin(l.phase);
    const r = l.size * (1 + glow * 0.3);
    const grad = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, r * 6);
    grad.addColorStop(0, l.color);
    grad.addColorStop(0.3, `${l.color}88`);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(l.x, l.y, r * 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(l.x, l.y, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
    if (selected && selected.id === l.id) {
      ctx.strokeStyle = 'var(--accent)';
      ctx.strokeStyle = '#6ee7b7';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(l.x, l.y, r * 3, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
  ctx.restore();
  requestAnimationFrame(draw);
}

function renderRegions() {
  regionsEl.innerHTML = '';
  REGIONS.forEach(r => {
    const el = document.createElement('div');
    el.className = 'chip' + (activeRegions.has(r.id) ? ' active' : '');
    el.textContent = r.label;
    el.onclick = () => {
      if (activeRegions.has(r.id)) activeRegions.delete(r.id);
      else activeRegions.add(r.id);
      renderRegions();
    };
    regionsEl.appendChild(el);
  });
}

canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left - rect.width / 2 - offsetX;
  const my = e.clientY - rect.top - rect.height / 2 - offsetY;
  let best = null, bestD = 20;
  lanterns.filter(l => activeRegions.has(l.region)).forEach(l => {
    const d = Math.hypot(l.x * scale - mx, l.y * scale - my);
    if (d < bestD) { bestD = d; best = l; }
  });
  selected = best;
  if (best) {
    const region = REGIONS.find(r => r.id === best.region);
    detail.innerHTML = `<strong>${region.label} · #${best.id}</strong>
      <p>"May there be ${best.wish}."</p>
      <p class="muted">drifting at ${best.x.toFixed(0)}, ${best.y.toFixed(0)}</p>`;
  }
});
canvas.addEventListener('mousedown', e => { dragging = true; dragStart = { x: e.clientX - offsetX, y: e.clientY - offsetY }; });
canvas.addEventListener('mousemove', e => { if (dragging) { offsetX = e.clientX - dragStart.x; offsetY = e.clientY - dragStart.y; } });
canvas.addEventListener('mouseup', () => dragging = false);
canvas.addEventListener('wheel', e => { e.preventDefault(); scale *= e.deltaY < 0 ? 1.1 : 0.9; scale = Math.max(0.4, Math.min(3, scale)); }, { passive: false });
window.addEventListener('keydown', e => { if (e.key === 'r' || e.key === 'R') { seed(); selected = null; detail.innerHTML = '<p class="muted">Click a lantern to read its wish.</p>'; } });

resize(); seed(); renderRegions(); draw();