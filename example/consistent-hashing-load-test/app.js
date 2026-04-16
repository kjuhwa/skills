const canvas = document.getElementById('chart');
const ctx = canvas.getContext('2d');
const colors = ['#6ee7b7','#60a5fa','#fbbf24','#a78bfa','#fb923c','#f472b6','#34d399','#818cf8','#fb7185','#38bdf8'];

function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; return h >>> 0; }

function simulate(nNodes, nVnodes, nKeys) {
  const ring = [];
  for (let i = 0; i < nNodes; i++)
    for (let v = 0; v < nVnodes; v++)
      ring.push({ node: i, h: hash(`node${i}-vn${v}`) });
  ring.sort((a, b) => a.h - b.h);
  const counts = new Array(nNodes).fill(0);
  for (let k = 0; k < nKeys; k++) {
    const kh = hash(`key${k}`);
    let owner = ring[0].node;
    for (const r of ring) { if (r.h >= kh) { owner = r.node; break; } }
    counts[owner]++;
  }
  return counts;
}

function draw(counts, nKeys) {
  ctx.clearRect(0, 0, 660, 280);
  const n = counts.length, barW = Math.min(50, (620 / n) - 4), ideal = nKeys / n;
  const maxV = Math.max(...counts, ideal * 1.5);
  // ideal line
  const idealY = 260 - (ideal / maxV) * 230;
  ctx.setLineDash([5, 5]); ctx.strokeStyle = '#6ee7b744'; ctx.beginPath(); ctx.moveTo(20, idealY); ctx.lineTo(640, idealY); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#6ee7b766'; ctx.font = '10px sans-serif'; ctx.fillText('ideal: ' + Math.round(ideal), 642 > 620 ? 560 : 545, idealY - 4);
  counts.forEach((c, i) => {
    const x = 20 + i * (620 / n) + (620 / n - barW) / 2;
    const h = (c / maxV) * 230;
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath(); ctx.roundRect(x, 260 - h, barW, h, 4); ctx.fill();
    ctx.fillStyle = '#e2e8f0'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(c, x + barW / 2, 260 - h - 6);
    ctx.fillText('N' + i, x + barW / 2, 275);
    ctx.textAlign = 'start';
  });
}

function run() {
  const nN = +document.getElementById('nodeCount').value;
  const nV = +document.getElementById('vnodeCount').value;
  const nK = +document.getElementById('keyCount').value;
  const counts = simulate(nN, nV, nK);
  draw(counts, nK);
  const avg = nK / nN, std = Math.sqrt(counts.reduce((s, c) => s + (c - avg) ** 2, 0) / nN);
  document.getElementById('metric').textContent =
    `Std Dev: ${std.toFixed(1)} | CoV: ${(std / avg * 100).toFixed(1)}% | Min: ${Math.min(...counts)} | Max: ${Math.max(...counts)} | Ideal: ${Math.round(avg)}/node — Try increasing virtual nodes to improve balance!`;
}

document.getElementById('run').onclick = run;
document.querySelectorAll('input[type=range]').forEach(el => el.oninput = run);
run();