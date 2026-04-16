const state = {
  metric: 'cpu', range: 300, agg: 'raw', live: true,
  data: { cpu: [], mem: [], net: [], disk: [] }
};
const profiles = {
  cpu: { base: 35, amp: 20, noise: 8, unit: '%' },
  mem: { base: 1800, amp: 300, noise: 80, unit: 'MB' },
  net: { base: 500, amp: 400, noise: 150, unit: 'KB/s' },
  disk: { base: 120, amp: 80, noise: 40, unit: 'iops' }
};
function seed() {
  const now = Date.now();
  for (const k of Object.keys(profiles)) {
    const p = profiles[k];
    for (let i = 3600; i >= 0; i--) {
      const t = now - i * 1000;
      const v = p.base + Math.sin(i / 30) * p.amp + (Math.random() - 0.5) * p.noise;
      state.data[k].push({ t, v: Math.max(0, v) });
    }
  }
}
function tick() {
  const now = Date.now();
  for (const k of Object.keys(profiles)) {
    const p = profiles[k];
    const i = (now / 1000) | 0;
    const v = p.base + Math.sin(i / 30) * p.amp + (Math.random() - 0.5) * p.noise;
    state.data[k].push({ t: now, v: Math.max(0, v) });
    if (state.data[k].length > 3700) state.data[k].shift();
  }
}
function aggregate(points, mode) {
  if (mode === 'raw') return points;
  const bucket = 10000; const buckets = new Map();
  for (const p of points) {
    const k = Math.floor(p.t / bucket) * bucket;
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(p.v);
  }
  const out = [];
  for (const [t, vs] of buckets) {
    vs.sort((a,b)=>a-b);
    let v;
    if (mode === 'avg') v = vs.reduce((a,b)=>a+b,0)/vs.length;
    else if (mode === 'max') v = vs[vs.length-1];
    else if (mode === 'p95') v = vs[Math.floor(vs.length*0.95)];
    out.push({ t, v });
  }
  return out.sort((a,b)=>a.t-b.t);
}
const canvas = document.getElementById('chart');
const ctx = canvas.getContext('2d');
let hover = null;
function render() {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = w * dpr; canvas.height = h * dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,w,h);
  const now = Date.now();
  const cutoff = now - state.range * 1000;
  const pts = aggregate(state.data[state.metric].filter(p => p.t >= cutoff), state.agg);
  if (!pts.length) return;
  const vs = pts.map(p=>p.v);
  const vmin = Math.min(...vs), vmax = Math.max(...vs);
  const pad = 30;
  const xs = t => pad + (t - cutoff) / (state.range * 1000) * (w - pad*2);
  const ys = v => h - pad - (v - vmin) / (vmax - vmin || 1) * (h - pad*2);
  ctx.strokeStyle = '#272b38'; ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad + (h - pad*2) * i / 4;
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke();
    const val = vmax - (vmax-vmin) * i/4;
    ctx.fillStyle = '#6b7280'; ctx.font = '10px monospace';
    ctx.fillText(val.toFixed(1), 2, y + 3);
  }
  ctx.strokeStyle = '#6ee7b7'; ctx.lineWidth = 2; ctx.beginPath();
  pts.forEach((p,i) => { const x = xs(p.t), y = ys(p.v); i ? ctx.lineTo(x,y) : ctx.moveTo(x,y); });
  ctx.stroke();
  ctx.lineTo(xs(pts[pts.length-1].t), h - pad); ctx.lineTo(xs(pts[0].t), h - pad);
  ctx.fillStyle = 'rgba(110,231,183,0.12)'; ctx.fill();
  if (hover) {
    const idx = Math.round((hover.x - pad) / (w - pad*2) * (pts.length-1));
    const p = pts[Math.max(0,Math.min(pts.length-1,idx))];
    if (p) {
      const x = xs(p.t), y = ys(p.v);
      ctx.fillStyle = '#6ee7b7'; ctx.beginPath(); ctx.arc(x,y,4,0,Math.PI*2); ctx.fill();
      const tt = document.getElementById('tooltip');
      tt.classList.remove('hidden');
      tt.style.left = (x+10) + 'px'; tt.style.top = (y-10) + 'px';
      tt.innerHTML = `<b>${p.v.toFixed(2)} ${profiles[state.metric].unit}</b><br>${new Date(p.t).toLocaleTimeString()}`;
    }
  } else document.getElementById('tooltip').classList.add('hidden');
  renderSide(pts);
}
function renderSide(pts) {
  const u = profiles[state.metric].unit;
  document.getElementById('query').textContent =
    `SELECT ${state.agg}(value)\nFROM metrics\nWHERE name='${state.metric}'\n  AND time > now()-${state.range}s`;
  const vs = pts.map(p=>p.v);
  const stats = document.getElementById('stats');
  stats.innerHTML = '';
  const rows = [['count', pts.length],['min',Math.min(...vs).toFixed(2)+' '+u],
    ['max',Math.max(...vs).toFixed(2)+' '+u],['avg',(vs.reduce((a,b)=>a+b,0)/vs.length).toFixed(2)+' '+u]];
  rows.forEach(([k,v])=>stats.innerHTML += `<li><span>${k}</span><span>${v}</span></li>`);
  const ul = document.getElementById('points');
  ul.innerHTML = '';
  pts.slice(-8).reverse().forEach(p=>{
    ul.innerHTML += `<li><span>${new Date(p.t).toLocaleTimeString()}</span><span>${p.v.toFixed(2)}</span></li>`;
  });
}
canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  hover = { x: e.clientX - r.left, y: e.clientY - r.top };
});
canvas.addEventListener('mouseleave', () => hover = null);
['metric','range','agg'].forEach(id => document.getElementById(id).addEventListener('change', e => {
  state[id] = id === 'range' ? +e.target.value : e.target.value;
}));
document.getElementById('live').addEventListener('click', e => {
  state.live = !state.live;
  e.target.classList.toggle('off', !state.live);
  e.target.textContent = state.live ? '● LIVE' : '○ PAUSED';
});
seed();
setInterval(() => { if (state.live) tick(); }, 1000);
setInterval(render, 80);