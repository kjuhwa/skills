const COLORS = ['#6ee7b7','#60a5fa','#f472b6','#fbbf24','#a78bfa','#34d399'];
let tiers = [
  { name: 'raw',     res: 1,    ret: 1,  color: COLORS[0] },
  { name: '1m',      res: 60,   ret: 7,  color: COLORS[1] },
  { name: '5m',      res: 300,  ret: 30, color: COLORS[2] },
  { name: '1h',      res: 3600, ret: 90, color: COLORS[3] }
];
const SERIES = 500; const BYTES_PER_POINT = 16;
function render() {
  const tc = document.getElementById('tiers');
  tc.innerHTML = '';
  tiers.forEach((t, i) => {
    const el = document.createElement('div');
    el.className = 'tier';
    el.innerHTML = `
      <div><span class="dot" style="background:${t.color}"></span><b>${t.name}</b></div>
      <div>${formatRes(t.res)}</div>
      <div>${t.ret}d</div>
      <button data-i="${i}">×</button>`;
    tc.appendChild(el);
  });
  tc.querySelectorAll('button').forEach(b => b.onclick = () => {
    tiers.splice(+b.dataset.i, 1); render();
  });
  const rawPerDay = 86400 / tiers[0].res;
  let total = 0;
  tiers.forEach(t => total += (86400 / t.res) * t.ret * SERIES);
  document.getElementById('ingest').textContent = (SERIES * (1 / tiers[0].res)).toFixed(0) + ' pts/s';
  document.getElementById('ppd').textContent = (rawPerDay * SERIES).toLocaleString();
  document.getElementById('total').textContent = total.toLocaleString();
  document.getElementById('disk').textContent = humanBytes(total * BYTES_PER_POINT);
  renderBars();
  renderTimeline();
  renderLegend();
}
function formatRes(s) { if (s<60) return s+'s'; if (s<3600) return (s/60)+'m'; return (s/3600)+'h'; }
function humanBytes(b) {
  const u = ['B','KB','MB','GB','TB']; let i = 0;
  while (b >= 1024 && i < u.length-1) { b /= 1024; i++; }
  return b.toFixed(2) + ' ' + u[i];
}
function renderBars() {
  const svg = document.getElementById('bars');
  svg.innerHTML = '';
  const w = svg.clientWidth, h = 160;
  const counts = tiers.map(t => (86400 / t.res) * t.ret * SERIES);
  const max = Math.max(...counts);
  const bw = w / (tiers.length * 1.5);
  tiers.forEach((t, i) => {
    const bh = (counts[i] / max) * (h - 40);
    const x = i * bw * 1.5 + bw * 0.25;
    const y = h - bh - 20;
    svg.innerHTML += `
      <rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="${t.color}" rx="3"/>
      <text x="${x + bw/2}" y="${y - 4}" fill="#d8dee9" font-size="10" text-anchor="middle">${humanBytes(counts[i] * BYTES_PER_POINT)}</text>
      <text x="${x + bw/2}" y="${h - 4}" fill="#6b7280" font-size="10" text-anchor="middle">${t.name}</text>`;
  });
}
function renderTimeline() {
  const svg = document.getElementById('timeline');
  svg.innerHTML = '';
  const w = svg.clientWidth, h = 220; const days = 90;
  const dayW = w / days;
  const rowH = (h - 30) / tiers.length;
  tiers.forEach((t, i) => {
    const y = 10 + i * rowH;
    svg.innerHTML += `<rect x="0" y="${y}" width="${w}" height="${rowH - 8}" fill="#0f1117" rx="2"/>`;
    const coverage = Math.min(t.ret, days);
    svg.innerHTML += `<rect x="${w - coverage * dayW}" y="${y}" width="${coverage * dayW}" height="${rowH - 8}" fill="${t.color}" opacity="0.8" rx="2"/>`;
    svg.innerHTML += `<text x="6" y="${y + rowH/2 - 2}" fill="#0f1117" font-size="11" font-weight="bold">${t.name} — ${t.ret}d @ ${formatRes(t.res)}</text>`;
  });
  for (let d = 0; d <= days; d += 10) {
    const x = w - d * dayW;
    svg.innerHTML += `<line x1="${x}" y1="0" x2="${x}" y2="${h-14}" stroke="#272b38" stroke-dasharray="2,3"/>`;
    svg.innerHTML += `<text x="${x}" y="${h-2}" fill="#6b7280" font-size="9" text-anchor="middle">-${d}d</text>`;
  }
}
function renderLegend() {
  document.getElementById('legend').innerHTML = tiers.map(t =>
    `<span><span class="sw" style="background:${t.color}"></span>${t.name}: ${formatRes(t.res)} × ${t.ret}d</span>`).join('');
}
document.getElementById('addtier').onclick = () => {
  const n = document.getElementById('tname').value.trim();
  const r = +document.getElementById('tres').value;
  const d = +document.getElementById('tret').value;
  if (!n || !r || !d) return;
  tiers.push({ name: n, res: r, ret: d, color: COLORS[tiers.length % COLORS.length] });
  render();
};
window.addEventListener('resize', render);
render();