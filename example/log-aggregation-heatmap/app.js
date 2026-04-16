const svc = ['api-gateway','auth-service','billing-api','cache-layer','db-proxy','notifier','payment','search-idx','user-svc','worker-pool'];
const hours = 24;
const cellW = 32, cellH = 30;
const offsetX = 120, offsetY = 40;

const data = svc.map(s => Array.from({length: hours}, (_, h) => {
  const base = s === 'payment' ? 80 : 30;
  const spike = (h >= 9 && h <= 18) ? Math.random() * 120 : Math.random() * 40;
  const noise = Math.random() * 20;
  return {
    count: Math.floor(base + spike + noise),
    errors: Math.floor(Math.random() * 15),
    warns: Math.floor(Math.random() * 30),
    p95: (40 + Math.random() * 460).toFixed(1)
  };
}));

const max = Math.max(...data.flat().map(d => d.count));

function color(v) {
  const t = v / max;
  if (t < 0.25) { const k = t/0.25; return mix([26,29,39],[110,231,183],k); }
  if (t < 0.6)  { const k = (t-0.25)/0.35; return mix([110,231,183],[255,216,102],k); }
  const k = (t-0.6)/0.4; return mix([255,216,102],[255,107,107],k);
}
function mix(a,b,t){ return `rgb(${a.map((v,i)=>Math.round(v+(b[i]-v)*t)).join(',')})`; }

const svg = document.getElementById('chart');
let html = '';

for (let h = 0; h < hours; h += 2) {
  html += `<text x="${offsetX + h*cellW + cellW/2}" y="${offsetY - 10}" text-anchor="middle">${String(h).padStart(2,'0')}:00</text>`;
}
svc.forEach((s, i) => {
  html += `<text x="${offsetX - 10}" y="${offsetY + i*cellH + cellH/2 + 4}" text-anchor="end">${s}</text>`;
  data[i].forEach((d, h) => {
    const c = color(d.count);
    html += `<rect class="cell" x="${offsetX + h*cellW}" y="${offsetY + i*cellH}" width="${cellW-2}" height="${cellH-2}" rx="3" fill="${c}" data-svc="${s}" data-hour="${h}" data-count="${d.count}" data-err="${d.errors}" data-warn="${d.warns}" data-p95="${d.p95}"/>`;
  });
});

svg.innerHTML = html;

const meta = document.getElementById('meta');
const detailTitle = document.querySelector('#detail h2');

svg.addEventListener('mouseover', e => {
  if (e.target.classList.contains('cell')) {
    const d = e.target.dataset;
    detailTitle.textContent = `${d.svc} @ ${d.hour}:00`;
    const pct = (d.count / max * 100).toFixed(0);
    meta.innerHTML = `
      <dt>Total logs</dt><dd>${d.count}</dd>
      <dt>Intensity</dt><dd><div class="bar"><div style="width:${pct}%"></div></div></dd>
      <dt>Errors</dt><dd style="color:#ff6b6b">${d.err}</dd>
      <dt>Warnings</dt><dd style="color:#ffd866">${d.warn}</dd>
      <dt>P95 latency</dt><dd>${d.p95} ms</dd>
    `;
  }
});